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

#include <stdint.h>
#include <stdbool.h>


#define FLASH_SECTOR_SIZE   0x00001000
#define FLASH_PAGE_SIZE     256
#define FLASH_ADDR_BASE     0x80000000
#define FLASH_MAIN_SIZE     0x00800000

#define STATUS_REGISTER_QE (1<<1)


// ожидание завершения отработки команды контроллером SPIFI
void wait_SPIFI_CMD() {
  // проверяем бит INTRQ, который выставляется контроллером по завершении команды
  while ( 0 == (SPIFI_CONFIG->STAT & SPIFI_CONFIG_STAT_INTRQ_M) ) {}
}


// ожидание завершения текущей операции записи/стирания, которую обрабатывает SPI FLASH
void wait_for_flash() {
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
  wait_SPIFI_CMD();
  // прочитаем один байт из FIFO - это собственно содержимое регистра состояния
  SPIFI_CONFIG->DATA8;
}


// ожидать завершения сброса контроллера SPIFI
void wait_SPIFI_RESET() {
  // проверяем бит RESET, который сбрасывается контроллером после завршения сброса
  while ( 0 != (SPIFI_CONFIG->STAT & SPIFI_CONFIG_STAT_RESET_M) ) {}
}


// ожидать завершения записи во FLASH
void wait_DMA_SPIFI() {
  // ожидаем завершения команды контроллером SPIFI
  wait_SPIFI_CMD();
  //
  // ожидаем завершения передачи по DMA
  uint32_t v_status = DMA_CONFIG->CONFIG_STATUS;
  for ( ; 0 == (v_status & (DMA_STATUS_READY(1) | DMA_STATUS_CHANNEL_BUS_ERROR_M)); v_status = DMA_CONFIG->CONFIG_STATUS ) {}
  // отключаем канал
  DMA_CONFIG->CHANNELS[1].CFG &= ~DMA_CH_CFG_ENABLE_M;
  //
  if ( 0 != (v_status & DMA_STATUS_READY(1)) ) {
    // ожидаем завершения записи страницы от SPI FLASH, по доке на W25Q64Jx - это до 4 миллисекунд
    wait_for_flash();
  } else {
    for (;;) {}
  }
}


int Init(uint32_t PreparePara0, uint32_t PreparePara1, uint32_t PreparePara2) {
  // включаем тактирование GPIO_2, PAD_CONFIG, SPIFI, DMA
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_2_M;
  PM->CLK_AHB_SET = PM_CLOCK_AHB_SPIFI_M | PM_CLOCK_AHB_DMA_M;
  // PORT2.0-PORT2.5 - SPIFI (sck, cs, D0, D1, D2, D3)
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~(0xFFF))
                         | PAD_CONFIG_PIN(0, 1)
                         | PAD_CONFIG_PIN(1, 1)
                         | PAD_CONFIG_PIN(2, 1)
                         | PAD_CONFIG_PIN(3, 1)
                         | PAD_CONFIG_PIN(4, 1)
                         | PAD_CONFIG_PIN(5, 1)
                         ;
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(0xFFF));
  PAD_CONFIG->PORT_2_PUPD = (PAD_CONFIG->PORT_2_PUPD & ~(0xFFF))
                          | PAD_CONFIG_PIN(0, 2) // SCK к общему проводу
                          | PAD_CONFIG_PIN(1, 1) // CS и линии данных - к питанию
                          | PAD_CONFIG_PIN(2, 1)
                          | PAD_CONFIG_PIN(3, 1)
                          | PAD_CONFIG_PIN(4, 1)
                          | PAD_CONFIG_PIN(5, 1)
                          ;
  // сброс контроллера
  SPIFI_CONFIG->STAT = SPIFI_CONFIG_STAT_RESET_M;
  //
  wait_SPIFI_RESET();
  // отключение запросов к DMA и максимальный интервал между командами
  SPIFI_CONFIG->CTRL = (SPIFI_CONFIG->CTRL & ~SPIFI_CONFIG_CTRL_DMAEN_M)
                     | SPIFI_CONFIG_CTRL_CSHIGH_M
                     | (2 << SPIFI_CONFIG_CTRL_SCK_DIV_S)
                     ;

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
  wait_SPIFI_CMD();
  // выполняем команду Disable QPI (FFh) (передача команд по одной линии)
  // (если SPI FLASH был в однопроводном режиме, просто ничего не произойдёт)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                    | (0xFF << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  wait_SPIFI_CMD();
  // выполняем команду Read Status Register-2 (35h)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_DATALEN_S) // читаем 1 байт
                    | (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x35 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // выбираем прочитанное
  uint8_t v_sr2 = SPIFI_CONFIG->DATA8;
  // ожидаем завершения команды контроллером SPIFI
  wait_SPIFI_CMD();
  // если бит QUAD ENABLE не установлен
  if ( 0 == (v_sr2 & STATUS_REGISTER_QE) ) {
    // будем его устанавливать
    // сначала выполняем команду Volatile Write Enable (50h) (запись бита только до отключения питания)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x50 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    wait_SPIFI_CMD();
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
    wait_SPIFI_CMD();
    // ожидаем завершения записи со стороны SPI FLASH
    wait_for_flash();
  }
  
  return 0;
}



int UnInit(uint32_t RestorePara0, uint32_t RestorePara1, uint32_t RestorePara2) {
  // сброс SPIFI
  SPIFI_CONFIG->STAT = SPIFI_CONFIG_STAT_RESET_M;
  // ждём сброса SPIFI
  wait_SPIFI_RESET();
  // отключение запросов к DMA в SPIFI
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  // сначала выполняем команду Enable QPI (38h) (передача всего по 4 линиям)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x38 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения отработки команды
  wait_SPIFI_CMD();
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
  wait_SPIFI_CMD();
  //
  // настроим SPIFI на работу "с памятью"
  SPIFI_CONFIG->CTRL = (SPIFI_CONFIG->CTRL & ~(SPIFI_CONFIG_CTRL_CSHIGH_M))
                     | (0 << SPIFI_CONFIG_CTRL_CSHIGH_S) // 1 такт сигнала SCK между командами
                     | SPIFI_CONFIG_CTRL_CACHE_EN_M // включение кэширования
                     | SPIFI_CONFIG_CTRL_D_CACHE_DIS_M // отключение кэширования данных
                     ;
  // минимальный делитель
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_SCK_DIV_M;
  //
  SPIFI_CONFIG->ADDR = 0;
  SPIFI_CONFIG->IDATA = 0x20; // содержимое первого dummy байта команды Fast Read Quad I/O (EBh) (продолжаем использовать режим чтения без кода команды)
  SPIFI_CONFIG->CLIMIT = FLASH_ADDR_BASE + FLASH_MAIN_SIZE; // граница кэширования
  SPIFI_CONFIG->MCMD = (1 << SPIFI_CONFIG_MCMD_INTLEN_S) // один dummy байт 0x00 для режима QPI и только адреса
                     | (3 << SPIFI_CONFIG_MCMD_FIELDFORM_S) // всё по четырём
                     | (6 << SPIFI_CONFIG_MCMD_FRAMEFORM_S) // три байта адреса
                     | (0xEB << SPIFI_CONFIG_MCMD_OPCODE_S)
                     ;
  
  return 0;
}


int SEGGER_OPEN_Program(uint32_t DestAddr, uint32_t NumBytes, uint8_t *pSrcBuff) {
  DestAddr &= (FLASH_MAIN_SIZE - 1);
  for ( ; 0 != NumBytes; NumBytes -= FLASH_PAGE_SIZE  ) {
    // сначала выполняем команду Write Enable (06h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                      | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    // ожидаем завершения команды контроллером SPIFI
    wait_SPIFI_CMD();
    // настроим DMA[1]
    DMA_CONFIG->CONFIG_STATUS = (1<<1) + DMA_CONFIG_CURRENT_VALUE_M;
    DMA_CONFIG->CHANNELS[1].SRC = (uint32_t)pSrcBuff; // читаем из памяти
    DMA_CONFIG->CHANNELS[1].DST = (uint32_t)&SPIFI_CONFIG->DATA; // записываем в SPIFI.DATA
    DMA_CONFIG->CHANNELS[1].CFG = DMA_CH_CFG_READ_MODE_MEMORY_M // читаем памяти
                                | DMA_CH_CFG_WRITE_MODE_PERIPHERY_M // пишем в SPIFI
                                | DMA_CH_CFG_READ_INCREMENT_M // увеличиваем адрес чтения (т.е. адрес памяти)
                                | (2 << DMA_CH_CFG_WRITE_SIZE_S) // записываем по 4 байта (слово)
                                | (2 << DMA_CH_CFG_WRITE_BURST_SIZE_S)
                                | (DMA_SPIFI_INDEX << DMA_CH_CFG_WRITE_REQUEST_S) // номер для SPIFI
                                ;
    // сколько байтов передать
    DMA_CONFIG->CHANNELS[1].LEN = FLASH_PAGE_SIZE - 1;
    // enable DMA1 channel 1
    DMA_CONFIG->CHANNELS[1].CFG |= DMA_CH_CFG_ENABLE_M;
    //
    // запись страницы размером 256 байтов Page Program (02h)
    SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
    SPIFI_CONFIG->CTRL |= SPIFI_CONFIG_CTRL_DMAEN_M;
    SPIFI_CONFIG->ADDR = DestAddr; // адрес в SPI FLASH, куда пишем
    SPIFI_CONFIG->CMD = SPIFI_CONFIG_CMD_DOUT_M
                      | (FLASH_PAGE_SIZE << SPIFI_CONFIG_CMD_DATALEN_S)
                      | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                      | (0x02 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    //
    DestAddr += FLASH_PAGE_SIZE;
    pSrcBuff += FLASH_PAGE_SIZE;
    //
    wait_DMA_SPIFI();
  }
  return 0;
}


int EraseSector(uint32_t SectorAddr) {
  //
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  // сектор надо стереть
  // сначала выполняем команду Write Enable (06h)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CMD = (1 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем только код команды
                    | (0x06 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  wait_SPIFI_CMD();
  // Sector Erase (20h)
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->ADDR = SectorAddr & (FLASH_MAIN_SIZE - 1);
  SPIFI_CONFIG->CMD = (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                    | (0x20 << SPIFI_CONFIG_CMD_OPCODE_S)
                    ;
  // ожидаем завершения команды контроллером SPIFI
  wait_SPIFI_CMD();
  // ожидаем завершения стирания сектора от SPI FLASH, по доке на W25Q64Jx - это до 400 миллисекунд
  wait_for_flash();

  return 0;
}


int SEGGER_OPEN_Read(uint32_t Addr, uint32_t NumBytes, uint8_t *pDestBuff) {
  Addr &= (FLASH_MAIN_SIZE - 1);
  //
  SPIFI_CONFIG->STAT |= SPIFI_CONFIG_STAT_INTRQ_M;
  SPIFI_CONFIG->CTRL &= ~SPIFI_CONFIG_CTRL_DMAEN_M;
  //
  for ( uint32_t p = 0; p < NumBytes; p += FLASH_PAGE_SIZE ) {
    //
    SPIFI_CONFIG->ADDR = Addr; // адрес в SPI FLASH
    SPIFI_CONFIG->CMD = (FLASH_PAGE_SIZE << SPIFI_CONFIG_CMD_DATALEN_S)
                      | (4 << SPIFI_CONFIG_CMD_FRAMEFORM_S) // отправляем код команды и три байта адреса
                      | (0x03 << SPIFI_CONFIG_CMD_OPCODE_S)
                      ;
    for ( uint32_t i = 0; i < FLASH_PAGE_SIZE; ++i ) {
      *pDestBuff++ = SPIFI_CONFIG->DATA8;
    }
    
    Addr += FLASH_PAGE_SIZE;
  }
  
  wait_SPIFI_CMD();
  
  return NumBytes;
}
  


typedef struct {
  uint32_t m_sector_size;
  uint32_t m_base_adress;
} SECTOR_INFO;


typedef struct {
  uint16_t AlgoVer;
  uint8_t  Name[128];
  uint16_t Type;
  uint32_t BaseAddr;
  uint32_t TotalSize;
  uint32_t PageSize;
  uint32_t Reserved;
  uint8_t  ErasedVal;
  uint32_t TimeoutProg;
  uint32_t TimeoutErase;
  SECTOR_INFO SectorInfo[4];
} flash_device_t;


volatile int PRGDATA_StartMarker __attribute__ ((section ("PrgData"), __used__));

__attribute__ ((section("DevDscr"), __used__))
const flash_device_t FlashDevice = {
  0x0101
, "SPIFI W25Q64JV"
, 1
, FLASH_ADDR_BASE
, FLASH_MAIN_SIZE
, FLASH_PAGE_SIZE
, 0
, 0xFF
, 12
, 1400
, { {FLASH_SECTOR_SIZE, 0x00000000}
  , {0xFFFFFFFF,        0xFFFFFFFF}
  }
};


__attribute__ ((section("PrgCode"), __used__))
const uint32_t SEGGER_OFL_Api[] = {
  (uint32_t)Init
, (uint32_t)UnInit
, (uint32_t)EraseSector
, (uint32_t)SEGGER_OPEN_Program
, 0, 0, 0, 0
, (uint32_t)SEGGER_OPEN_Read
, 0, 0, 0, 0, 0
};
