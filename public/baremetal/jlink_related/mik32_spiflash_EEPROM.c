#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/eeprom.h>
#include <mik32_hwlibs/crc.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/mik32_memory_map.h>

#include <stdint.h>
#include <stdbool.h>


#define EEPROM_SECTOR_SIZE   128
#define EEPROM_PAGE_SIZE     128
#define EEPROM_ADDR_BASE     0x01000000
#define EEPROM_MAIN_SIZE     0x00002000



int Init(uint32_t PreparePara0, uint32_t PreparePara1, uint32_t PreparePara2) {
  // включаем тактирование блока EEPROM (хотя после сброса, например, EEPROM и так включен)
  PM->CLK_AHB_SET = PM_CLOCK_AHB_EEPROM_M;
  return 0;
}

int UnInit(uint32_t RestorePara0, uint32_t RestorePara1, uint32_t RestorePara2) {
  return 0;
}


int SEGGER_OPEN_Program(uint32_t DestAddr, uint32_t NumBytes, uint8_t *pSrcBuff) {
  DestAddr &= (EEPROM_MAIN_SIZE - 1);
  for ( ; 0 != NumBytes; NumBytes -= EEPROM_PAGE_SIZE  ) {
    // пишем
    EEPROM_REGS->EEA = DestAddr;
    EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                       | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                       ;
    for ( uint32_t i = 0; i < (EEPROM_PAGE_SIZE / sizeof(uint32_t)); ++i ) {
      EEPROM_REGS->EEDAT = pSrcBuff[0]
                         | (pSrcBuff[1] << 8)
                         | (pSrcBuff[2] << 16)
                         | (pSrcBuff[3] << 24)
                         ;
      pSrcBuff += 4;
    }
    // старт записи
    EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                       | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                       | EEPROM_EECON_OP(EEPROM_EECON_OP_PROG)
                       | EEPROM_EECON_EX_M
                       ;
    // ждём
    while ( 0 != (EEPROM_REGS->EESTA & EEPROM_EESTA_BSY_M) ) {}
    //
    DestAddr += EEPROM_PAGE_SIZE;
  }
  return 0;
}


int EraseSector(uint32_t SectorAddr) {
  // стирание страницы
  EEPROM_REGS->EEA = SectorAddr & (EEPROM_MAIN_SIZE - 1);
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     ;
  for ( uint32_t i = 0; i < (EEPROM_PAGE_SIZE / sizeof(uint32_t)); ++i ) {
    EEPROM_REGS->EEDAT = 0;
  }
  // запуск стирания
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     | EEPROM_EECON_OP(EEPROM_EECON_OP_ERASE)
                     | EEPROM_EECON_EX_M
                     ;
  // ждём
  while ( 0 != (EEPROM_REGS->EESTA & EEPROM_EESTA_BSY_M) ) {}

  return 0;
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
, "internal EEPROM"
, 1
, EEPROM_ADDR_BASE
, EEPROM_MAIN_SIZE
, EEPROM_PAGE_SIZE
, 0
, 0xFF
, 250
, 32000
, { {EEPROM_SECTOR_SIZE, 0x00000000}
  , {0xFFFFFFFF,        0xFFFFFFFF}
  }
};


__attribute__ ((section("PrgCode"), __used__))
const uint32_t SEGGER_OFL_Api[] = {
  (uint32_t)Init
, (uint32_t)UnInit
, (uint32_t)EraseSector
, (uint32_t)SEGGER_OPEN_Program
, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
};
