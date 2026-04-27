#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/spifi.h>
#include <mik32_hwlibs/crc.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/mik32_memory_map.h>

#include <runtime.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <endian.h>

void logBufferInHex(const unsigned char *src, int len);


#define SPIFI_FLASH_SIZE	(16*1024*1024)
#define STATUS_REGISTER_QE (1<<1)
// стирание секторами размером 4K
#define FLASH_SECTOR_4K   4096
#define FLASH_PAGE_256    256

#define REPLY_WAITING                 1
#define REPLY_ACK                     2
#define REPLY_ERR_TOO_BIG             3
#define REPLY_ERR_RECEIVE             4
#define REPLY_ERR_WRITE               5
#define REPLY_ERR_CRC32               6
#define REPLY_ERR_WAIT_WRITE_PAGE     7
#define REPLY_ERR_DMA                 8
#define REPLY_ERR_FLASH_06_1          9
#define REPLY_ERR_FLASH_20            10
#define REPLY_ERR_WAIT_ERASE_PAGE     11
#define REPLY_ERR_FLASH_06_2          12
#define REPLY_ERR_FLASH_02            13


// отправить байт через UART_1
void mik32_putc( uint8_t a_byte ) {
  while ( 0 == (UART_1->FLAGS & UART_FLAGS_TXE_M) ) {}
  UART_1->TXDATA = a_byte;
}

// получить байты из UART_1 с указанным таймаутом
bool mik32_gets( uint32_t a_timeout_ms, uint8_t * a_dst, int a_len ) {
  uint32_t v_from = g_milliseconds;
  for (;;) {
    while ( a_len > 0 && 0 != (UART_1->FLAGS & UART_FLAGS_RXNE_M ) ) {
      *a_dst++ = UART_1->RXDATA;
      --a_len;
    }
    if ( 0 == a_len ) {
      break;
    }
    if ( (g_milliseconds - v_from) >= a_timeout_ms ) {
      return false;
    }
  }
  //
  return true;
}


//
__attribute__((noreturn))
void go_to_application();

// инициализация SPIFI
bool init_SPIFI();
// обновление "прошивки" в SPI FLASH
bool firmware_update();


//
void process_init_mcu() {
  // включаем тактирование GPIO_0, GPIO_1, GPIO_2, PAD_CONFIG, UART_1, SPIFI, DMA, CRC32
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M
                    | PM_CLOCK_APB_P_GPIO_1_M
                    | PM_CLOCK_APB_P_GPIO_2_M
                    | PM_CLOCK_APB_P_UART_1_M
                    ;
  PM->CLK_AHB_SET = PM_CLOCK_AHB_SPIFI_M
                  | PM_CLOCK_AHB_DMA_M
                  | PM_CLOCK_AHB_CRC32_M
                  ;
  // PORT2.0-PORT2.5 - SPIFI (sck, cs, D0, D1, D2, D3)
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~0xFFF)
                         | PAD_CONFIG_PIN(0, 1)
                         | PAD_CONFIG_PIN(1, 1)
                         | PAD_CONFIG_PIN(2, 1)
                         | PAD_CONFIG_PIN(3, 1)
                         | PAD_CONFIG_PIN(4, 1)
                         | PAD_CONFIG_PIN(5, 1)
                         ;
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~0xFFF);
  PAD_CONFIG->PORT_2_PUPD = (PAD_CONFIG->PORT_2_PUPD & ~0xFFF)
                          | PAD_CONFIG_PIN(0, 2) // SCK к общему проводу
                          | PAD_CONFIG_PIN(1, 1) // CS и линии данных - к питанию
                          | PAD_CONFIG_PIN(2, 1)
                          | PAD_CONFIG_PIN(3, 1)
                          | PAD_CONFIG_PIN(4, 1)
                          | PAD_CONFIG_PIN(5, 1)
                          ;
  // PORT0.9, PORT0.10 функция GPIO
  // PORT0.9 - светодиод
  // PORT0.10 - кнопка
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(9) | PAD_CONFIG_PIN_M(10)))
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(9) | PAD_CONFIG_PIN_M(10)))
                          ;
  GPIO_0->DIRECTION_IN = GPIO_PIN_M(10);
  GPIO_0->DIRECTION_OUT = GPIO_PIN_M(9);
  GPIO_0->CLEAR = GPIO_PIN_M(9); // светодиод выключен
  // теперь настройка UART_1
  // PORT1.8, PORT1.9 функция последовательного порта
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)))
                         | PAD_CONFIG_PIN(8, 1)
                         | PAD_CONFIG_PIN(9, 1)
                         ;
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)));
  // UART_1
  UART_1->CONTROL1 = 0;
  UART_1->CONTROL2 = 0;
  UART_1->CONTROL3 = 0;
  UART_1->DIVIDER = 69; // 32000000/460800
  UART_1->FLAGS = 0xFFFFFFFF;
  UART_1->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M | UART_CONTROL1_RE_M;
  // ждём готовности
  while ( 0 == (UART_1->FLAGS & UART_FLAGS_TEACK_M) ) {}
  // настройка CRC32
  CRC->POLY = 0x04C11DB7;
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  // разрешаем внешние прерывания
  set_csr(mie, MIE_MEIE);
}


// точка входа
void main() {
  // настройка SPIFI
  if ( !init_SPIFI() ) {
    // зависаем
    for (;;) {}
  }
  //
  for (;;) {
    // если "прошивка" загружена
    if ( firmware_update() ) {
      // запускаем её
      go_to_application();
    }
  }
}


// ожидание завершения отработки команды контроллером SPIFI с указанным таймаутом в миллисекундах
bool wait_SPIFI_CMD( uint32_t a_timeout_ms ) {
  uint32_t v_from = g_milliseconds;
  //
  do {
    // проверяем бит INTRQ, который выставляется контроллером по завершении команды
    if ( 0 != (SPIFI_CONFIG->STAT & SPIFI_CONFIG_STAT_INTRQ_M) ) {
      return true;
    }
  } while ( (g_milliseconds - v_from) < a_timeout_ms );
  //
  return false;
}


// ожидать завершения сброса контроллера SPIFI
bool wait_SPIFI_RESET( uint32_t a_timeout_ms ) {
  uint32_t v_from = g_milliseconds;
  //
  do {
    // проверяем бит RESET, который сбрасывается контроллером после завршения сброса
    if ( 0 == (SPIFI_CONFIG->STAT & SPIFI_CONFIG_STAT_RESET_M) ) {
      return true;
    }
  } while ( (g_milliseconds - v_from) < a_timeout_ms );
  //
  return false;
}


// naked убирает код пролога/эпилога функции, что экономит несколько байтов
__attribute__((naked))
void go_to_application() {
  // сброс SPIFI
  SPIFI_CONFIG->STAT = SPIFI_CONFIG_STAT_RESET_M;
  //
  if ( !wait_SPIFI_RESET( 50u ) ) {
    // зависаем
    for (;;) {}
  }
  // отключение запросов к DMA в SPIFI
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  // отключение тактирования DMA и CRC32
  PM->CLK_AHB_CLEAR = PM_CLOCK_AHB_DMA_M | PM_CLOCK_AHB_CRC32_M;
  // возвращаем настройки выводов PORT1.8 и PORT1.9
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)));
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)));
  // отключение UART_1
  UART_1->CONTROL1 = 0;
  UART_1->FLAGS = 0xFFFFFFFF;
  UART_1->DIVIDER = 0;
  // возвращаем настройки выводов PORT0.9 и PORT0.10
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(9) | PAD_CONFIG_PIN_M(10)));
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(9) | PAD_CONFIG_PIN_M(10)));
  // отключаем тактирование UART_1
  PM->CLK_APB_P_CLEAR = PM_CLOCK_APB_P_UART_1_M;
  // сначала выполняем команду Enable QPI (38h) (передача всего и вся по 4 линиям)
  // режим QPI поддерживается флэшем PY25Q128HA и описан в документации
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x38 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения отработки команды
  if ( !wait_SPIFI_CMD(2u) ) {
    // зависаем
    for (;;) {}
  }
  // Настройка количество Dummy Clocks
  // Вот тут читал доку на PY25Q128HA и нифига не понял, пришлось экпериментировать. По-умолчанию
  // командой 0xEB вместо первых 4 байтов читалась чухня, затем уже шло то, что в памяти по
  // указанному для чтения адресу, т.е. вклинивалось 4 байта. Команда 0xC0 устанавливает
  // количество "пустых" тактов шины в режиме QPI после выдачи адреса и M-байта
  // Поставил 4 такта согласно доке, после чего получил при чтении всего один лишний байт.
  // В принципе, с документацией согласуется, т.к. по-умолчанию там (вроде) 10 тактов,
  // и убрав 6 тактов, мы убираем 3 лишних байта. Чтобы убрать ещё один лишний байт (а меньше
  // 4 тактов сделать нельзя) мы в для команды 0xEB (см. далее по коду) добавляем
  // дополнительный пустой байт, идущий следом за адресом и М-байтом.
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // пишем один байт
                    | SPIFI_CONFIG_CMD_DOUT_M // выдача данных контроллером в SPI FLASH
                    | (3 << SPIFI_CONFIG_CMD_FIELDFORM_S) // всё по четырём
                    | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // только код команды
                    | (0xC0 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // 
  SPIFI_CONFIG->DATA8 = (1 << 4);
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    // зависаем
    for (;;) {}
  }
  // Типа настройка Fast Read Quad I/O на работу с передачей исключительно адреса
  // (режим Continuous Read), для его включения исполняем команду 0xEB на чтение 1 байта
  // и указываем в M-байте значение с битами [5,4] = [1,0] сообщающее флэшу, что следующее чтение будет без выставления кода команды
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x20; // содержимое M-байта команды Fast Read Quad I/O (EBh) (следующее чтение без указания кода команды)
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // прочитаем один байт
                    | (2 << SPIFI_CONFIG_CMD_INTLEN_S) // два dummy байта 0x20, 0x00
                    | (3 << SPIFI_CONFIG_CMD_FIELDFORM_S) // всё передаём по четырём линиям
                    | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // будут переданы код команды и три байта адреса
                    | (0xEB << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // читаем один байт
  SPIFI_CONFIG->DATA8;
  // ожидаем завершения отработки команды
  if ( !wait_SPIFI_CMD(2u) ) {
    // зависаем
    for (;;) {}
  }
  // Теперь при следующем обращении (т.е. когда уронили CS в ноль) "флэшка" ожидает адрес, M-байт и "пустой" байт,
  // т.е. максимально быстрый возможный вариант чтения.
  // Настроим SPIFI на работу "с памятью", т.е. "прямое исполнение команд из флэша", известное также как XPI
  SPIFI_CONFIG->CTRL = (SPIFI_CONFIG->CTRL & ~(SPIFI_CONFIG_CTRL_CSHIGH_M))
                     | (0 << SPIFI_CONFIG_CTRL_CSHIGH_S) // 1 такт сигнала SCK между командами
                     | SPIFI_CONFIG_CTRL_CACHE_EN_M // включение кэширования
                     | SPIFI_CONFIG_CTRL_D_CACHE_DIS_M // отключение кэширования данных
                     ;
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x20; // содержимое M-байта команды Fast Read Quad I/O (EBh) (следующее чтение без указания кода команды)
  SPIFI_CONFIG->CLIMIT = SPIFI_BASE_ADDRESS + SPIFI_FLASH_SIZE; // граница кэширования
  SPIFI_CONFIG->MCMD = (2 << SPIFI_CONFIG_MCMD_INTLEN_S) // два dummy байта 0x20, 0x00
                     | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё передайм по четырём линиям
                     | (6 << SPIFI_CONFIG_MCMD_FRAMEFORM_S) // без кода команды, только три байта адреса
                     | (0xEB << SPIFI_CONFIG_MCMD_OPCODE_S)
                     ;
  // отключение прерываний
  clear_csr(mie, MIE_MEIE | MIE_MTIE);
  clear_csr(mstatus, MSTATUS_MIE);
  // отключение системного таймера
  SCR1_TIMER->TIMER_CTRL &= ~SCR1_TIMER_CTRL_ENABLE_M;
  SCR1_TIMER->TIMER_DIV = 0;
  SCR1_TIMER->MTIMECMP = 0;
  SCR1_TIMER->MTIMECMPH = 0;
  SCR1_TIMER->MTIME = 0;
  SCR1_TIMER->MTIMEH = 0;
  // переключение "вектора" прерывания
  write_csr( mtvec, SPIFI_BASE_ADDRESS );
  //
  asm volatile(	"la ra, 0x80000000\n" \
                "jalr ra"             \
              );
}


// ожидание завершения текущей операции записи/стирания, которую обрабатывает SPI FLASH
bool wait_for_flash( uint32_t a_timeout_ms ) {
  // ждём завершения операции (выполняемем Read Status Register-1 (05h), пока нулевой бит не станет равным нулю)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  SPIFI_CONFIG->CMD = (0 << SPIFI_CONFIG_CMD_POLL_INDEX_S) // номер отслеживаемого бита 0 (ноль), SR1.BUSY
                    | (0 << SPIFI_CONFIG_CMD_POLL_REQUIRED_VALUE_S) // требуемое состояние отслеживаемого бита - 0 (ноль)
                    | SPIFI_CONFIG_CMD_POLL_M // режим опроса (повторение чтения до получения требуемого состояни указанного бита)
                    | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x05 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ждём завершения отработки команды - в данном случае команда завершится, когда контроллер SPIFI
  // прочитает регистр состояния с указанным состоянием бита
  if ( !wait_SPIFI_CMD( a_timeout_ms ) ) {
    return false;
  }
  // прочитаем один байт из FIFO - это собственно содержимое регистра состояния
  SPIFI_CONFIG->DATA8;
  //
  return true;
}

// начальная инициализация SPI FLASH
bool init_SPIFI() {
  // сброс контроллера
  SPIFI_CONFIG->STAT = SPIFI_CONFIG_STAT_RESET_M;
  //
  if ( !wait_SPIFI_RESET( 50u ) ) {
    return false;
  }
  // отключение запросов к DMA и максимальный интервал между командами
  SPIFI_CONFIG->CTRL = (SPIFI_CONFIG->CTRL & ~SPIFI_CONFIG_CTRL_DMAEN_M) | SPIFI_CONFIG_CTRL_CSHIGH_M;

  // типа настройка Fast Read Quad I/O на работу с передачей адреса
  // (если SPI FLASH был в однопроводном режиме, просто ничего не произойдёт)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x0; // содержимое первого dummy байта команды Fast Read Quad I/O (EBh)
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // прочитаем один байт
                    | (1 << SPIFI_CONFIG_MCMD_INTLEN_S) // один dummy байт 0x0
                    | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                    | (6 << SPIFI_CONFIG_MCMD_FRAMEFORM_S) // без кода команды, три байта адреса
                    | (0xEB << SPIFI_CONFIG_MCMD_OPCODE_S)
                    ;
  // читаем один байт
  SPIFI_CONFIG->DATA8;
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return false;
  }
  // выполняем команду Disable QPI (FFh) (передача команд по одной линии)
  // (если SPI FLASH был в однопроводном режиме, просто ничего не произойдёт)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                    | (0xFF << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return false;
  }
  // выполняем команду Read Status Register-2 (35h)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // читаем 1 байт
                    | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x35 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // выбираем прочитанное
  uint8_t v_sr2 = SPIFI_CONFIG->DATA8;
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return false;
  }
  // если бит QUAD ENABLE не установлен
  if ( 0 == (v_sr2 & STATUS_REGISTER_QE) ) {
    // будем его устанавливать
    // сначала выполняем команду Volatile Write Enable (50h) (запись бита только до отключения питания)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x50 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      return false;
    }
    // потом команду Write Status Register-2 (31h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // отправляем 1 байт
                      | SPIFI_CONFIG_CMD_DOUT_M // выдача данных контроллером в SPI FLASH
                      | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды, без адреса
                      | (0x31 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // SR2 с взведённым битом Quad Enable
    SPIFI_CONFIG->DATA8 = v_sr2 | STATUS_REGISTER_QE;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      return false;
    }
    // ожидаем завершения записи со стороны SPI FLASH
    if ( !wait_for_flash(16u) ) {
      return false;
    }
  }
  //
  return true;
}

// проверить принятый блок
bool check_received_block( uint8_t );
// записать принятый блок
bool write_received_block( uint32_t * );


typedef struct header_s {
  uint32_t m_size;
  uint32_t m_crc32;
} firmware_header_t;

// буферы для приёма, размером с сектор
uint8_t g_recv_buf_1[FLASH_SECTOR_4K], g_recv_buf_2[FLASH_SECTOR_4K];

// запустить чтение не более FLASH_SECTOR_4K байтов из UART через DMA[0]
uint32_t start_read_DMA_UART( uint8_t * a_dst, uint32_t * a_size_remains ) {
  DMA_CONFIG->CONFIG_STATUS = (1<<0) + DMA_CONFIG_CURRENT_VALUE_M;
  DMA_CONFIG->CHANNELS[0].SRC = (uint32_t)&UART_1->RXDATA; // читаем из регистра принятых данных
  DMA_CONFIG->CHANNELS[0].DST = (uint32_t)a_dst; // записываем принятое в память
  DMA_CONFIG->CHANNELS[0].CFG = DMA_CH_CFG_READ_MODE_PERIPHERY_M // читаем из периферийного устройства
                              | DMA_CH_CFG_WRITE_MODE_MEMORY_M // пишем в память
                              | DMA_CH_CFG_WRITE_INCREMENT_M // увеличиваем адрес записи (т.е. адрес памяти)
                              | (DMA_UART_1_INDEX << DMA_CH_CFG_READ_REQUEST_S) // номер для UART_1
                              ;
  // сколько байтов читать
  uint32_t v_bytes_to_read = (*a_size_remains >= FLASH_SECTOR_4K ? FLASH_SECTOR_4K : *a_size_remains);
  // заряжаем счётчик DMA
  DMA_CONFIG->CHANNELS[0].LEN = v_bytes_to_read - 1;
  // enable DMA1 channel 0
  DMA_CONFIG->CHANNELS[0].CFG |= DMA_CH_CFG_ENABLE_M;
  // корректируем оставшееся количество байтов для чтения
  *a_size_remains -= v_bytes_to_read;
  // возвращаем, сколько байтов будет прочитано
  return v_bytes_to_read;
}


// отправить данные в CRC32
void send_to_CRC32( const uint8_t * a_buf, uint32_t a_len ) {
  while ( 0 != a_len ) {
    if ( a_len >= 4 ) {
      CRC->DATA32 = (a_buf[0] << 24)
                  | (a_buf[1] << 16)
                  | (a_buf[2] << 8)
                  | a_buf[3]
                  ;
      a_buf += 4;
      a_len -= 4;
    } else {
      if ( a_len >= 2 ) {
        CRC->DATA16 = (a_buf[0] << 8)
                    | a_buf[1]
                    ;
        a_buf += 2;
        a_len -= 2;
      } else {
        CRC->DATA8 = *a_buf;
        // один байт всегда последний
        break;
      }
    }
  }
  // на всяк случай задержка после записи в CRC->DATA
  CRC->CTRL;
}


// ожидать завершения записи во FLASH
int wait_DMA_SPIFI() {
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return REPLY_ERR_FLASH_02;
  }
  //
  // ожидаем завершения передачи по DMA
  uint32_t v_from = g_milliseconds;
  uint32_t v_status = 0;
  while ( ((uint32_t)(g_milliseconds - v_from)) < 10 ) {
    v_status = DMA_CONFIG->CONFIG_STATUS;
    if ( 0 != (v_status & (DMA_STATUS_READY(1) | DMA_STATUS_CHANNEL_BUS_ERROR_M)) ) {
      break;
    }
  }
  // отключаем канал
  DMA_CONFIG->CHANNELS[1].CFG &= ~DMA_CH_CFG_ENABLE_M;
  //
  if ( 0 != (v_status & DMA_STATUS_READY(1)) ) {
    // ожидаем завершения записи страницы от SPI FLASH, по доке на PY25Q128HA - это до 2.4 миллисекунд
    if ( !wait_for_flash(4u) ) {
      return REPLY_ERR_WAIT_WRITE_PAGE;
    } else {
      return 0;
    }
  } else {
    return REPLY_ERR_DMA;
  }
}


// запустить запись страницы. a_size может быть меньше FLASH_SECTOR_4K, значит остальное нужно заполнить байтами 0xFF
// подразумевается, что a_src указывает на буфер размером как минимум FLASH_SECTOR_4K байтов
int write_DMA_SPIFI( uint8_t * a_src, uint32_t a_flash_addr, uint32_t a_size ) {
  // добиваем буфер байтами 0xFF до размера FLASH_SECTOR_4K байтов
  for ( uint32_t i = a_size; i < FLASH_SECTOR_4K; ++i ) {
    a_src[i] = 0xFF;
  }
  //
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  // сектор надо стереть
  // сначала выполняем команду Write Enable (06h)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return REPLY_ERR_FLASH_06_1;
  }
  // Sector Erase (20h) стирание сектора 4К
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->ADDR = a_flash_addr;
  SPIFI_CONFIG->CMD = (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                    | (0x20 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  if ( !wait_SPIFI_CMD(2u) ) {
    return REPLY_ERR_FLASH_20;
  }
  // ожидаем завершения стирания сектора от SPI FLASH, по доке на PY25Q128HA - это до 240 миллисекунд
  if ( !wait_for_flash(250u) ) {
    return REPLY_ERR_WAIT_ERASE_PAGE;
  }
  // далее записываем (a_size + FLASH_PAGE_256 - 1)/FLASH_PAGE_256 страниц размером FLASH_PAGE_256 байтов
  for ( uint32_t v_pages_count = (a_size + (FLASH_PAGE_256 - 1))/FLASH_PAGE_256; v_pages_count != 0; --v_pages_count ) {
    // сначала выполняем команду Write Enable (06h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      return REPLY_ERR_FLASH_06_2;
    }
    //
    // настроим DMA[1]
    DMA_CONFIG->CONFIG_STATUS = (1<<1) + DMA_CONFIG_CURRENT_VALUE_M;
    DMA_CONFIG->CHANNELS[1].SRC = (uint32_t)a_src; // читаем из памяти
    DMA_CONFIG->CHANNELS[1].DST = (uint32_t)&SPIFI_CONFIG->DATA; // записываем в SPIFI.DATA
    DMA_CONFIG->CHANNELS[1].CFG = DMA_CH_CFG_READ_MODE_MEMORY_M // читаем памяти
                                | DMA_CH_CFG_WRITE_MODE_PERIPHERY_M // пишем в SPIFI
                                | DMA_CH_CFG_READ_INCREMENT_M // увеличиваем адрес чтения (т.е. адрес памяти)
                                | (2 << DMA_CH_CFG_WRITE_SIZE_S) // записываем по 4 байта (слово)
                                | (2 << DMA_CH_CFG_WRITE_BURST_SIZE_S)
                                | (DMA_SPIFI_INDEX << DMA_CH_CFG_WRITE_REQUEST_S) // номер для SPIFI
                                ;
    // сколько байтов передать
    DMA_CONFIG->CHANNELS[1].LEN = FLASH_PAGE_256 - 1;
    // enable DMA1 channel 1
    DMA_CONFIG->CHANNELS[1].CFG |= DMA_CH_CFG_ENABLE_M;
    //
    // запись страницы размером 256 байтов Page Program (02h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CTRL |= SPIFI_CONFIG_CTRL_DMAEN_M;
    SPIFI_CONFIG->ADDR = a_flash_addr; // адрес в SPI FLASH, куда пишем
    SPIFI_CONFIG->CMD = SPIFI_CONFIG_CMD_DOUT_M
                      | (FLASH_PAGE_256 << SPIFI_CONFIG_CMD_DATALEN_S)
                      | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                      | (0x02 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // закидываем данные со страницы в CRC32
    send_to_CRC32( a_src, a_size > FLASH_PAGE_256 ? FLASH_PAGE_256 : a_size );
    // уменьшаем размер a_size для корректного подсчёта
    if ( a_size > FLASH_PAGE_256 ) {
      a_size -= FLASH_PAGE_256;
    } else {
      a_size = 0;
    }
    // двигаем на следующую страницу в буфере
    a_src += FLASH_PAGE_256;
    // адрес следующей страницы
    a_flash_addr += FLASH_PAGE_256;
    // ждём завершения записи страницы
    int v_rc = wait_DMA_SPIFI();
    if ( 0 != v_rc ) {
      return v_rc;
    }
  }
  //
  return 0;
}


bool wait_DMA_UART() {
  uint32_t v_from = g_milliseconds;
  uint32_t v_status = 0;
  while ( ((uint32_t)(g_milliseconds - v_from)) < 100 ) {
    v_status = DMA_CONFIG->CONFIG_STATUS;
    if ( 0 != (v_status & (DMA_STATUS_READY(0) | DMA_STATUS_CHANNEL_BUS_ERROR_M)) ) {
      break;
    }
  }
  // отключаем канал
  DMA_CONFIG->CHANNELS[0].CFG &= ~DMA_CH_CFG_ENABLE_M;
  //
  return 0 != (v_status & DMA_STATUS_READY(0));
}


// ожидаем прошивку в формате <размер:uint32_t><crc32:uint32_t><данные прошивки>
bool firmware_update() {
  firmware_header_t v_header;
  // адрес в SPI FLASH, с которого начинать запись
  uint32_t v_current_SPIFI_addr = 0;
  // настроим CRC32
  // настройки с включенным битом записи начального значения
  // CRC_CTRL_TOT_BYTES_M, CRC_CTRL_TOTR_NONE_M, CRC_CTRL_FXOR_M
  CRC->CTRL = CRC_CTRL_TOT_BYTES_M
            | CRC_CTRL_TOTR_NONE_M
            | CRC_CTRL_FXOR_M
            | CRC_CTRL_WAS_M;
            ;
  // начальное значение
  CRC->DATA32 = 0;
  // обязательное чтение CRC->CTRL формирует необходимую задержку после записи в CRC->DATA32
  CRC->CTRL;
  // настройки с выключенным битом записи начального значения
  CRC->CTRL = CRC_CTRL_TOT_BYTES_M
            | CRC_CTRL_TOTR_NONE_M
            | CRC_CTRL_FXOR_M
            ;
  // отправим "приглашение" загрузчику
  mik32_putc( REPLY_WAITING );
  // крутимся тут
  int v_rc;
  for (;;) {
    // был ли принят заголовок за 500 миллисекунд?
    if ( !mik32_gets( 501u, (uint8_t *)&v_header, sizeof(v_header) ) ) {
      // нет, тогда проверяем состояние кнопки на PORT0.10 - если нажата (низкий уровень) - то продолжаем ожидать данные
      if ( 0 == GPIO_PIN_STATE(GPIO_0, 10) ) {
        mik32_putc( REPLY_WAITING );
      } else {
        // иначе считаем, что с той стороны никто не ожидается, и можно передавать управление "прошивке" в SPI FLASH
        return true;
      }
    } else {
      // ага, проверим размер флэша
      if ( v_header.m_size > SPIFI_FLASH_SIZE ) {
        // слишком много
        mik32_putc( REPLY_ERR_TOO_BIG );
        return false;
      } else {
        mik32_putc( REPLY_ACK );
        // включаем запрос к контроллеру DMA
        UART_1->CONTROL3 |= UART_CONTROL3_DMAR_M;
      }
      // два канала DMA
      // 0. на чтение из UART_1
      // 1. на запись в SPIFI
      uint32_t v_page_size_1 = start_read_DMA_UART( g_recv_buf_1, &v_header.m_size );
      uint32_t v_page_size_2 = 0;
      //
      for (;;) {
        // теперь ждём. при скорости 115200 передача 2560 битов займёт не более 23 миллисекунд
        if ( !wait_DMA_UART() ) {
          mik32_putc( REPLY_ERR_RECEIVE );
          return false;
        } else {
          mik32_putc( REPLY_ACK );
        }
        // теперь g_recv_buf_1 содержит прочитанные данные
        // запускаем чтение g_recv_buf_2
        if ( 0 != v_header.m_size ) {
          // ещё есть, что читать
          v_page_size_2 = start_read_DMA_UART( g_recv_buf_2, &v_header.m_size );
        } else {
          v_page_size_2 = 0;
        }
        // запускаем запись сектора флэша из g_recv_buf_1
        v_rc = write_DMA_SPIFI( g_recv_buf_1, v_current_SPIFI_addr, v_page_size_1 );
        if ( 0 != v_rc ) {
          mik32_putc( v_rc );
          return false;
        }
        // если больше ничего не чтитали, то на выход
        if ( 0 == v_page_size_2 ) {
          break;
        }
        // сектор записан, прибавим FLASH_SECTOR_4K к адресу записи
        v_current_SPIFI_addr += FLASH_SECTOR_4K;
        // ожидаем завершения приёма из UART
        if ( !wait_DMA_UART() ) {
          mik32_putc( REPLY_ERR_RECEIVE );
          return false;
        } else {
          mik32_putc( REPLY_ACK );
        }
        // теперь g_recv_buf_2 содержит прочитанные данные
        // запускаем чтение g_recv_buf_1
        if ( 0 != v_header.m_size ) {
          v_page_size_1 = start_read_DMA_UART( g_recv_buf_1, &v_header.m_size );
        } else {
          v_page_size_1 = 0;
        }
        // запускаем запись сектора флэша из g_recv_buf_2
        v_rc = write_DMA_SPIFI( g_recv_buf_2, v_current_SPIFI_addr, v_page_size_2 ); 
        if ( 0 != v_rc ) {
          mik32_putc( v_rc );
          return false;
        }
        // если больше ничего не читали, то на выход
        if ( 0 == v_page_size_1 ) {
          break;
        }
        // сектор записан, прибавим FLASH_SECTOR_4K к адресу записи
        v_current_SPIFI_addr += FLASH_SECTOR_4K;
      }
      // здесь всё записалось.
      // сверим CRC32
      while ( 0 != (CRC->CTRL & CRC_CTRL_BUSY_M) ) {}
      if ( v_header.m_crc32 != CRC->DATA32 ) {
        mik32_putc( REPLY_ERR_CRC32 );
        return false;
      } else {
        mik32_putc( REPLY_ACK );
        // это чтобы ACK успел долететь
        delay_ms( 2u );
      }
      //
      return true;
    }
  }
}
