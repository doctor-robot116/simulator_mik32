#include "zmodem.h"
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/epic.h>
#include <mik32_hwlibs/timer32.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/boot.h>
#include <mik32_hwlibs/spifi.h>
#include <crc16_ccit.h>

#include <runtime.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <endian.h>

void logBufferInHex(const unsigned char *src, int len);
void read_blocks( int a_blocks_count );


#define SPIFI_FLASH_SIZE	(8*1024*1024)
#define STATUS_REGISTER_QE (1<<1)

// буфер для приёма
uint8_t g_xmodem_buffer[1032];


// отправить строку через UART_0
void mik32_puts( const char * a_src ) {
  while ( *a_src ) {
    while ( 0 == (UART_0->FLAGS & UART_FLAGS_TXE_M) ) {}
    UART_0->TXDATA = *a_src++;
  }
}

// отправить байт через UART_0
void mik32_putc( uint8_t a_byte ) {
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TXE_M) ) {}
  UART_0->TXDATA = a_byte;
}

// получить байты из UART_0 с указанным таймаутом
bool mik32_gets( uint32_t a_timeout_ms, uint8_t * a_dst, int a_len ) {
  uint32_t v_from = g_milliseconds;
  for (;;) {
    while ( a_len > 0 && 0 != (UART_0->FLAGS & UART_FLAGS_RXNE_M ) ) {
      *a_dst++ = UART_0->RXDATA;
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
  // включаем тактирование GPIO_0, GPIO_2, PAD_CONFIG, UART_0, SPIFI
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_GPIO_2_M | PM_CLOCK_APB_P_UART_0_M;
  PM->CLK_AHB_SET = PM_CLOCK_AHB_SPIFI_M;
  // PORT2.7, PORT2.6 - GPIO
  // PORT2.0-PORT2.5 - SPIFI (sck, cs, D0, D1, D2, D3)
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~(0xFFFF))
                         | PAD_CONFIG_PIN(0, 1)
                         | PAD_CONFIG_PIN(1, 1)
                         | PAD_CONFIG_PIN(2, 1)
                         | PAD_CONFIG_PIN(3, 1)
                         | PAD_CONFIG_PIN(4, 1)
                         | PAD_CONFIG_PIN(5, 1)
                         ;
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(0xFFFF));
  PAD_CONFIG->PORT_2_PUPD = (PAD_CONFIG->PORT_2_PUPD & ~(0xFFFF))
                          //| PAD_CONFIG_PIN(0, 2) // SCK к общему проводу
                          //| PAD_CONFIG_PIN(1, 1) // CS и линии данных - к питанию
                          | PAD_CONFIG_PIN(2, 1)
                          | PAD_CONFIG_PIN(3, 1)
                          | PAD_CONFIG_PIN(4, 1)
                          | PAD_CONFIG_PIN(5, 1)
                          | PAD_CONFIG_PIN(6, 2) // "кнопка" - к общему проводу
                          ;
  GPIO_2->DIRECTION_OUT = GPIO_PIN_M(7);
  GPIO_2->DIRECTION_IN = GPIO_PIN_M(6);
  // PORT2.7 выход (на плате ACE-UNO к этому выводу подключен светодиод)
  GPIO_2->CLEAR = GPIO_PIN_M(7); // светодиод выключен
  // теперь настройка UART_0
  // PORT0.5, PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(5, 1)
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)));
  // UART_0
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 69; // 32000000/460800
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M | UART_CONTROL1_RE_M;
  // ждём готовности
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}
}


// точка входа
void main() {
  // настройка SPIFI
  if ( !init_SPIFI() ) {
    mik32_puts( "SPIFI init error.\n" );
    // зависаем
    for (;;) {}
  }
  //
  delay_ms( 2u );
  // проверяем состояние кнопки на PORT2.6 - если нажата (высокий уровень) - то переходим в режим загрузки
  if ( 0 == GPIO_PIN_STATE(GPIO_2, 6) ) {
    // кнопка отпущена - запускаем приложение из SPIFI
    go_to_application();
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
  // восстановление режима выводов GPIO2.6, GPIO2.7
  GPIO_2->DIRECTION_IN = GPIO_PIN_M(7);
  PAD_CONFIG->PORT_2_PUPD = (PAD_CONFIG->PORT_2_PUPD & ~(PAD_CONFIG_PIN_M(6) | PAD_CONFIG_PIN_M(7)));
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(PAD_CONFIG_PIN_M(6) | PAD_CONFIG_PIN_M(7)));
  // отключение UART_0
  UART_0->CONTROL1 = 0;
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->DIVIDER = 0;
  // возвращаем настройки выводов PORT0.5 и PORT0.6
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)));
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)));
  // отключаем тактирование UART_0
  PM->CLK_APB_P_CLEAR = PM_CLOCK_APB_P_UART_0_M;
  // сначала выполняем команду Enable QPI (38h) (передача всего по 4 линиям)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x38 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения отработки команды
  if ( !wait_SPIFI_CMD(2u) ) {
    // зависаем
    for (;;) {}
  }
  //
  // типа настройка Fast Read Quad I/O на работу с передачей исключительно адреса
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x20; // содержимое первого dummy байта команды Fast Read Quad I/O (EBh)
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // прочитаем один байт
                    | (1 << SPIFI_CONFIG_MCMD_INTLEN_S) // один dummy байт 0x0 для режима QPI
                    | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                    | (4 << SPIFI_CONFIG_MCMD_FRAMEFORM_S) // код команды и три байта адреса
                    | (0xEB << SPIFI_CONFIG_MCMD_OPCODE_S)
                    ;
  // читаем один байт
  SPIFI_CONFIG->DATA8;
  // ожидаем завершения отработки команды
  if ( !wait_SPIFI_CMD(2u) ) {
    // зависаем
    for (;;) {}
  }
  //
  // настроим SPIFI на работу "с памятью"
  SPIFI_CONFIG->CTRL = (SPIFI_CONFIG->CTRL & ~(SPIFI_CONFIG_CTRL_CSHIGH_M))
                     | (0 << SPIFI_CONFIG_CTRL_CSHIGH_S) // 1 такт сигнала SCK между командами
                     | SPIFI_CONFIG_CTRL_CACHE_EN_M // включение кэширования
                     ;
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x20; // содержимое первого dummy байта команды Fast Read Quad I/O (EBh) (продолжаем использовать режим чтения без кода команды)
  SPIFI_CONFIG->CLIMIT = SPIFI_BASE_ADDRESS + SPIFI_FLASH_SIZE; // граница кэширования
  SPIFI_CONFIG->MCMD = (1 << SPIFI_CONFIG_MCMD_INTLEN_S) // один dummy байт 0x00 для режима QPI и только адреса
                     | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                     | (6 << SPIFI_CONFIG_MCMD_FRAMEFORM_S) // код команды, три байта адреса
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
  SPIFI_CONFIG->CMD = (0 << SPIFI_CONFIG_CMD_POLL_INDEX_S) // номер отслеживаемого бита 0 (ноль), SR1.BUSY
                    | (0 << SPIFI_CONFIG_CMD_POLL_REQUIRED_VALUE_S) // требуемое состояние отслеживаемого бита - 0 (ноль)
                    | SPIFI_CONFIG_CMD_POLL_M // режим опроса (повторение чтения до получения требуемого состояни указанного бита)
                    | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x05 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ждём завершения отработки команды - в данном случае команда завершится, когда контроллер SPIFI
  // прочитает регистр состояния с указанным состоянием бита
  if ( !wait_SPIFI_CMD( a_timeout_ms ) ) {
    mik32_puts( "wait 0x05 timeout\n" );
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
    mik32_puts( "reset timeout\n" );
    return false;
  }
  SPIFI_CONFIG->CTRL |= SPIFI_CONFIG_CTRL_CSHIGH_M;
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
    mik32_puts( "wait 0xEB timeout\n" );
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
    mik32_puts( "wait 0xFF timeout\n" );
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
    mik32_puts( "wait 0x35 timeout\n" );
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
      mik32_puts( "wait 0x50 timeout\n" );
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
      mik32_puts( "wait 0x31 timeout\n" );
      return false;
    }
    // ожидаем завершения записи со стороны SPI FLASH
    if ( !wait_for_flash(16u) ) {
      mik32_puts( "wait write SREG2 timeout\n" );
      return false;
    }
  }
  //
  return true;
}

#define XM1K_STATE_WAIT_FIRST_PACKET  0
#define XM1K_STATE_WAIT_NEXT_PACKET   1

// проверить принятый блок
bool check_received_block( uint8_t );
// записать принятый блок
bool write_received_block( uint32_t * );

// приём пакетов в формате XMODEM1K и запись их в SPI FLASH
bool firmware_update() {
  // простейшая машина состояния - ожидаем приёма первого пакета
  int v_state = XM1K_STATE_WAIT_FIRST_PACKET;
  // первый пакет ожидаем с номером 1
  int v_expected_block_num = 1;
  // адрес в SPI FLASH, с которого начинать запись
  uint32_t v_current_SPIFI_addr = 0;
  // отправляем "приглашение" загрузчику
  mik32_putc( 'C' );
  // крутимся тут
  for (;;) {
    // был ли принят первый байт пакета за 1 секунду?
    if ( !mik32_gets( 1000u, &g_xmodem_buffer[0], 1 ) ) {
      // нет
      if ( XM1K_STATE_WAIT_FIRST_PACKET == v_state ) {
        // ожидали первый пакет, повторим "приглашение"
        mik32_putc( 'C' );
      } else {
        // ожидали следующий блок, а ничего не пришло
        mik32_puts( "Next packet timeout\n" );
        return false;
      }
    } else {
      // ага, ориентируемся по принятому байту
      switch ( g_xmodem_buffer[0] ) {
        case 0x02: // STX
          // старт блока 1K, попробуем получить пакет за 500 миллисекунд
          if ( !mik32_gets( 500u, &g_xmodem_buffer[1], 1028 ) ) {
            // не удалось принять весь блок
            mik32_puts( "Read block timeout\n" );
            return false;
          }
          // проверим принятый блок
          if ( !check_received_block( v_expected_block_num++ ) ) {
            mik32_puts( "Check block error\n" );
            return false;
          }
          // запишем принятый блок
          if ( !write_received_block( &v_current_SPIFI_addr ) ) {
            mik32_puts( "Write block error\n" );
            return false;
          }
          // переключаем состояние
          if ( XM1K_STATE_WAIT_FIRST_PACKET == v_state ) {
            v_state = XM1K_STATE_WAIT_NEXT_PACKET;
          }
          // отправляем подтверждение (ACK), что готовы принять следующий пакет
          mik32_putc( 0x06 );
          break;
        
        case 0x18: // CAN
          // отмена передачи
          mik32_puts( "Upload aborted\n" );
          return false;
          
        case 0x04: // EOT
          // отправляем подтверждение
          mik32_putc( 0x06 );
          mik32_puts( "Transfer completed\n" );
          // т.к. после получения первого пакета состояние переключается на ожидание следующего,
          // то получение EOT вместо старта первого пакета означает ошибку
          return XM1K_STATE_WAIT_FIRST_PACKET != v_state;
      }
    }
  }
}

// проверка принятого блока
bool check_received_block( uint8_t a_expected_block_num ) {
  // проверяем номер блока
  if ( g_xmodem_buffer[1] != a_expected_block_num || (g_xmodem_buffer[1] | g_xmodem_buffer[2]) != 0xFF ) {
    mik32_puts( "BLock num error\n" );
    // ошибочка вышла
    return false;
  }
  // проверим crc
  if ( crc16_xmodem( &g_xmodem_buffer[3], 1024 ) != ((g_xmodem_buffer[1027] << 8) | g_xmodem_buffer[1028]) ) {
    mik32_puts( "CRC error\n" );
    return false;
  }
  //
  return true;
}

// стирание секторами размером 4K
#define FLASH_SECTOR_4K   4096

// запись принятого блока
bool write_received_block( uint32_t * a_addr ) {
  // проверим адрес по границе сектора в 4К
  if ( 0 == (*a_addr % FLASH_SECTOR_4K) ) {
    // адрес на границе сектора, сектор надо стереть
    // сначала выполняем команду Write Enable (06h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      mik32_puts( "wait 0x06 timeout\n" );
      return false;
    }
    // Sector Erase (20h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->ADDR = *a_addr;
    SPIFI_CONFIG->CMD = (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                      | (0x20 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      mik32_puts( "wait 0x06 timeout\n" );
      return false;
    }
    // ожидаем завершения стирания сектора от SPI FLASH, по доке на W25Q64Jx - это до 400 миллисекунд
    if ( !wait_for_flash(401u) ) {
      mik32_puts( "erase 4K timeout\n" );
      return false;
    }
  }
  // стёрли, теперь пишем 4 страницы по 256 байтов
  for ( int i = 0; i < 4; ++i ) {
    // сначала выполняем команду Write Enable (06h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      mik32_puts( "wait 0x06 timeout\n" );
      return false;
    }
    // запись страницы размером 256 байтов Page Program (02h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->ADDR = *a_addr; // адрес в SPI FLASH, куда пишем
    SPIFI_CONFIG->CMD = SPIFI_CONFIG_CMD_DOUT_M
                      | (256 << SPIFI_CONFIG_CMD_DATALEN_S)
                      | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                      | (0x02 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // передаём данные для записи
    for ( int k = 0; k < 256; ++k ) {
      SPIFI_CONFIG->DATA8 = g_xmodem_buffer[3 + (i*256) + k];
    }
    // ожидаем завершения команды контроллером SPIFI
    if ( !wait_SPIFI_CMD(2u) ) {
      mik32_puts( "wait 0x02 timeout\n" );
      return false;
    }
    // ожидаем завершения записи страницы от SPI FLASH, по доке на W25Q64Jx - это до 4 миллисекунд
    if ( !wait_for_flash(4u) ) {
      mik32_puts( "page write timeout\n" );
      return false;
    }
    // прибавляем к адресу размер страницы
    *a_addr += 256u;
  }
  //
  return true;
}


// это код на всякий случай, линкер уберёт, если не используется
void logBufferInHex(const unsigned char *src, int len) {
  int i, c, k;
  char ln[96];
  char *ucPtr;

  while (len) {
    // start line pointer
    ucPtr = ln;
    // first send address
    for (i = 28; i >= 0; i -= 4) {
      c = (((unsigned int)src) >> i) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    // send 16 or less hex bytes
    for (i = 0; i < 16 && len > 0; i++, len--) {
      //
      *ucPtr++ = ' ';
      //
      c = (*src >> 4) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
      c = (*src++) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    for (k = i; k < 16; ++k) {
      //
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
    }
    //
    *ucPtr++ = ' ';
    // send bytes as symbols
    for (; i > 0; i--) {
      //
      c = *(src - i);
      //
      *ucPtr++ = (c >= 0x20 && c <= 0x7F) ? c : '.';
    }
    // make eol
    // *ucPtr++ = 0x0D;
    // *ucPtr++ = 0x0A;
    *ucPtr = 0x00;
    // send to remote
    mik32_puts( ln );
    mik32_puts( "\n" );
  }
}


// это код на всякий случай, линкер уберёт, если не используется
void read_blocks( int a_blocks_count ) {
  uint32_t v_addr = 0;
  for ( int i = 0; i < a_blocks_count; ++i ) {
    for ( int k = 0; k < 4; ++k ) {
      // Read Data (03h)
      SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
      SPIFI_CONFIG->ADDR = v_addr;
      SPIFI_CONFIG->CMD = (256 << SPIFI_CONFIG_CMD_DATALEN_S)
                        | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                        | (0x03 << SPIFI_CONFIG_CMD_OPCODE_S)
                        ;
      for ( int k = 0; k < 256; ++k ) {
        g_xmodem_buffer[k] = SPIFI_CONFIG->DATA8;
      }
      if ( !wait_SPIFI_CMD(2u) ) {
        mik32_puts( "wait 0x03 timeout\n" );
        return;
      }
      //
      logBufferInHex( g_xmodem_buffer, 256 );
      //
      v_addr += 256u;
    }
  }
}
