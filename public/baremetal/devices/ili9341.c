#include <ili9341.h>
#include <display.h>
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/spi.h>


#define ILI9341_RESET           0x01
#define ILI9341_SLEEP_OUT       0x11
#define ILI9341_INVOFF          0x20
#define ILI9341_GAMMA				    0x26
#define ILI9341_DISPLAY_OFF     0x28
#define ILI9341_DISPLAY_ON      0x29
#define ILI9341_COLUMN_ADDR     0x2A
#define ILI9341_PAGE_ADDR       0x2B
#define ILI9341_GRAM            0x2C
#define ILI9341_PTLAR           0x30
#define ILI9341_MAC             0x36
#define ILI9341_PIXEL_FORMAT    0x3A
#define ILI9341_WDB             0x51
#define ILI9341_WCD             0x53
#define ILI9341_RGB_INTERFACE   0xB0
#define ILI9341_FRC             0xB1
#define ILI9341_BPC             0xB5
#define ILI9341_DFC             0xB6
#define ILI9341_POWER1          0xC0
#define ILI9341_POWER2          0xC1
#define ILI9341_VCOM1           0xC5
#define ILI9341_VCOM2           0xC7
#define ILI9341_POWERA          0xCB
#define ILI9341_POWERB          0xCF
#define ILI9341_PGAMMA          0xE0
#define ILI9341_NGAMMA          0xE1
#define ILI9341_DTCA            0xE8
#define ILI9341_DTCB            0xEA
#define ILI9341_POWER_SEQ       0xED
#define ILI9341_EF              0xEF
#define ILI9341_3GAMMA_EN       0xF2
#define ILI9341_INTERFACE       0xF6
#define ILI9341_PRC             0xF7


// based on Adafruit ST7789 library for Arduino
// т.е. последовательность команд инициализации контроллера подсмотрена в указанной выше библиотеки
static const uint8_t init_cmds1[] = {
  21
, ILI9341_POWERA, 5
  , 0x39, 0x2C, 0x00, 0x34, 0x02
, ILI9341_POWERB, 3
  , 0x00, 0xC1, 0x30
, ILI9341_EF, 3
  , 0x03, 0x80, 0x02 // ???
, ILI9341_DTCA, 3
  , 0x85, 0x00, 0x78
, ILI9341_DTCB, 2
  , 0x00, 0x00
, ILI9341_POWER_SEQ, 4
  , 0x64, 0x03, 0x12, 0x81
, ILI9341_PRC, 1
  , 0x20
, ILI9341_POWER1, 1
  , 0x23
, ILI9341_POWER2, 1
  , 0x10
, ILI9341_VCOM1, 2
  , 0x3E, 0x28
, ILI9341_VCOM2, 1
  , 0x86
, ILI9341_MAC, 1
  , ILI9341_ROTATION
, ILI9341_PIXEL_FORMAT, 1
  , 0x55
, ILI9341_FRC, 2
  , 0x00, 0x1B
, ILI9341_DFC, 4
  , 0x08, 0x82, 0x27, 0x00
, ILI9341_3GAMMA_EN, 1
  , 0x02
, ILI9341_GAMMA, 1
  , 0x01
, 0xE0, 15
  , 0x0F, 0x31, 0x2B, 0x0C, 0x0E, 0x08, 0x4E, 0xF1, 0x37, 0x07, 0x10, 0x03, 0x0E, 0x09, 0x00 // ILI9341_PGAMMA
, 0xE1, 15
  , 0x00, 0x0E, 0x14, 0x03, 0x11, 0x07, 0x31, 0xC1, 0x48, 0x08, 0x0F, 0x0C, 0x31, 0x36, 0x0F // ILI9341_NGAMMA
, display_SLPOUT , ST_CMD_DELAY //  2: Out of sleep mode, no args, w/delay
  , 10                          //      10 ms delay
, display_DISPON , ST_CMD_DELAY //  9: Main screen turn on, no args, delay
  , 10
};

// инициализация
void ILI9341_Init() {
  display_Init( ILI9341_WIDTH, ILI9341_HEIGHT, init_cmds1 );
}
