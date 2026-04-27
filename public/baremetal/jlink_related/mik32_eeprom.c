#include <stdint.h>
#include <k1921vg015.h>

#define FLASH_SECTOR_SIZE   0x1000
#define FLASH_PAGE_SIZE     16
#define FLASH_ADDR_BASE     0x0
#define FLASH_MAIN_SIZE     0x2000



int Init(uint32_t PreparePara0, uint32_t PreparePara1, uint32_t PreparePara2) {
  // отключение и сброс всего оборудования
  RCU->CGCFGAHB = 0;
  RCU->CGCFGAPB = 0;
  RCU->RSTDISAHB = 0;
  RCU->RSTDISAPB = 0;
  // сброс всего для DMA
  DMA->CFG = 0;
  DMA->STATUS;
  DMA->ERRCLR = 1;
  DMA->ENCLR = 0x00FFFFFFul;
  DMA->CIRCULARCLR = 0x00FFFFFFul;
  DMA->REQMASKCLR = 0x00FFFFFFul;
  DMA->IRQSTATCLR = 0x00FFFFFFul;
  DMA->PRIALTCLR = 0x00FFFFFFul;
  // ставим максимальную частоту HSI
  PMURTC->HSI_TRIM = (15 << PMURTC_HSI_TRIM_TRIM_Pos);
  // переключаемся на HSI
  RCU->SYSCLKCFG = (RCU_SYSCLKCFG_SRC_HSICLK << RCU_SYSCLKCFG_SRC_Pos);
  // ну тут вариантов пока не придумал, ждём до потери пульса
  while ( RCU->CLKSTAT_bit.SRC != RCU->SYSCLKCFG_bit.SRC ) {}

  return 0;
}

int UnInit(uint32_t RestorePara0, uint32_t RestorePara1, uint32_t RestorePara2) {
  // ставим обратно частоту HSI
  PMURTC->HSI_TRIM = (7 << PMURTC_HSI_TRIM_TRIM_Pos);
  // переключаемся на HSI
  RCU->SYSCLKCFG = (RCU_SYSCLKCFG_SRC_HSICLK << RCU_SYSCLKCFG_SRC_Pos);
  return 0;
}


int SEGGER_OPEN_Read(uint32_t Addr, uint32_t NumBytes, uint8_t *pDestBuff) {
  uint32_t v_flash_page[4];
  for ( uint32_t BytesLeft = NumBytes; 0 != BytesLeft; ) {
    FLASH->ADDR = Addr;
    FLASH->CMD = (FLASH_CMD_KEY_Access << FLASH_CMD_KEY_Pos)
               | FLASH_CMD_NVRON_Msk
               | FLASH_CMD_RD_Msk
               ;
    asm("nop");
    asm("nop");
    asm("nop");
    asm("nop");
    asm("nop");
    while ( 0 != (FLASH->STAT & FLASH_STAT_BUSY_Msk) ) {}
    for ( int i = 0; i < 4; ++i ) {
      v_flash_page[i] = FLASH->DATA[i].DATA;
    }
    uint8_t * v_u8_ptr = (uint8_t *)v_flash_page;
    do {
      *pDestBuff++ = v_u8_ptr[(Addr++) % 16];
      --BytesLeft;
    } while ( 0 != (Addr % 16) && 0 != BytesLeft );
  }
  return NumBytes;
}


int SEGGER_OPEN_Program(uint32_t DestAddr, uint32_t NumBytes, uint8_t *pSrcBuff) {
  for ( ; 0 != NumBytes; NumBytes -= FLASH_PAGE_SIZE  ) {
    FLASH->ADDR = DestAddr;
    for ( int i = 0; i < 4; ++i ) {
      uint32_t v_u32 = pSrcBuff[0]
                     | (pSrcBuff[1] << 8)
                     | (pSrcBuff[2] << 16)
                     | (pSrcBuff[3] << 24)
                     ;
      pSrcBuff += 4;
      FLASH->DATA[i].DATA = v_u32;
    }
    FLASH->CMD = (FLASH_CMD_KEY_Access << FLASH_CMD_KEY_Pos)
               | FLASH_CMD_NVRON_Msk
               | FLASH_CMD_WR_Msk
               ;
    asm("nop");
    asm("nop");
    asm("nop");
    asm("nop");
    asm("nop");
    while ( 0 != (FLASH->STAT & FLASH_STAT_BUSY_Msk) ) {}
    DestAddr += FLASH_PAGE_SIZE;
  }
  return 0;
}


int EraseSector(uint32_t SectorAddr) {
  FLASH->ADDR = SectorAddr;
  FLASH->CMD = (FLASH_CMD_KEY_Access << FLASH_CMD_KEY_Pos)
             | FLASH_CMD_NVRON_Msk
             | FLASH_CMD_ERSEC_Msk
             ;
  asm("nop");
  asm("nop");
  asm("nop");
  asm("nop");
  asm("nop");
  while ( 0 != (FLASH->STAT & FLASH_STAT_BUSY_Msk) ) {}
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
, "K1921VG015 NVR FLASH"
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
