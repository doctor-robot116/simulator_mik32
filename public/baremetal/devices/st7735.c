#include <st7735.h>
#include <display.h>
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/spi.h>



#define ST_DELAY 0x80

#define DISPLAY_CS_PIN      2
#define DISPLAY_RST_PIN     8
#define DISPLAY_DC_PIN      9
#define DISPLAY_SDA_PIN     1
#define DISPLAY_SCK_PIN     2
#define DISPLAY_LED_PIN     0
#define DISPLAY_NSS_PIN     3


// based on Adafruit ST7735 library for Arduino
// т.е. последовательность команд инициализации контроллера подсмотрена в указанной выше библиотеки
static const uint8_t
  init_cmds1[] = {            // Init for 7735R, part 1 (red or green tab)
    19,                       // 19 commands in list:
    display_SWRESET,ST_DELAY,  //  1: Software reset, 0 args, w/delay
      150,                    //     150 ms delay
    display_SLPOUT ,ST_DELAY,  //  2: Out of sleep mode, 0 args, w/delay
      255,                    //     500 ms delay
    ST7735_FRMCTR1, 3      ,  //  3: Frame rate ctrl - normal mode, 3 args:
      0x01, 0x2C, 0x2D,       //     Rate = fosc/(1x2+40) * (LINE+2C+2D)
    ST7735_FRMCTR2, 3      ,  //  4: Frame rate control - idle mode, 3 args:
      0x01, 0x2C, 0x2D,       //     Rate = fosc/(1x2+40) * (LINE+2C+2D)
    ST7735_FRMCTR3, 6      ,  //  5: Frame rate ctrl - partial mode, 6 args:
      0x01, 0x2C, 0x2D,       //     Dot inversion mode
      0x01, 0x2C, 0x2D,       //     Line inversion mode
    ST7735_INVCTR , 1      ,  //  6: Display inversion ctrl, 1 arg, no delay:
      0x07,                   //     No inversion
    ST7735_PWCTR1 , 3      ,  //  7: Power control, 3 args, no delay:
      0xA2,
      0x02,                   //     -4.6V
      0x84,                   //     AUTO mode
    ST7735_PWCTR2 , 1      ,  //  8: Power control, 1 arg, no delay:
      0xC5,                   //     VGH25 = 2.4C VGSEL = -10 VGH = 3 * AVDD
    ST7735_PWCTR3 , 2      ,  //  9: Power control, 2 args, no delay:
      0x0A,                   //     Opamp current small
      0x00,                   //     Boost frequency
    ST7735_PWCTR4 , 2      ,  // 10: Power control, 2 args, no delay:
      0x8A,                   //     BCLK/2, Opamp current small & Medium low
      0x2A,  
    ST7735_PWCTR5 , 2      ,  // 11: Power control, 2 args, no delay:
      0x8A, 0xEE,
    ST7735_VMCTR1 , 1      ,  // 12: Power control, 1 arg, no delay:
      0x0E,
    display_INVOFF , 0      ,  // 13: Don't invert display, no args, no delay
    display_MADCTL , 1      ,  // 14: Memory access control (directions), 1 arg:
      ST7735_ROTATION,        //     row addr/col addr, bottom to top refresh
    display_COLMOD , 1      ,  // 15: set color mode, 1 arg, no delay:
      0x05,                   //     16-bit color
    ST7735_GMCTRP1, 16      , //  1: Gamma Adjustments (pos. polarity), 16 args, no delay:
      0x02, 0x1c, 0x07, 0x12,
      0x37, 0x32, 0x29, 0x2d,
      0x29, 0x25, 0x2B, 0x39,
      0x00, 0x01, 0x03, 0x10,
    ST7735_GMCTRN1, 16      , //  2: Gamma Adjustments (neg. polarity), 16 args, no delay:
      0x03, 0x1d, 0x07, 0x06,
      0x2E, 0x2C, 0x29, 0x2D,
      0x2E, 0x2E, 0x37, 0x3F,
      0x00, 0x00, 0x02, 0x10,
    display_NORON  , ST_DELAY, //  3: Normal display on, no args, w/delay
      10,                     //     10 ms delay
    display_DISPON , ST_DELAY, //  4: Main screen turn on, no args w/delay
      100 };                  //     100 ms delay

// инициализация
void ST7735_Init() {
  display_Init( ST7735_WIDTH, ST7735_HEIGHT, init_cmds1 ); 
}

void ST7735_Init_2( uint16_t a_width, uint16_t a_height ) {
  display_Init( a_width, a_height, init_cmds1 ); 
}
