#include <st7789.h>
#include <display.h>
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/spi.h>


// Init commands for 7789 screens
static const uint8_t init_cmds1[] =  {
    7,                              //  5 commands in list:
    display_SWRESET, ST_CMD_DELAY,
      150,
    display_SLPOUT, ST_CMD_DELAY, //  1: Out of sleep mode, no args, w/delay
      150,                           //      10 ms delay
    display_COLMOD, 1,              //  2: Set color mode, 1 arg
      0x05,                         //     16-bit color
    display_MADCTL, 1,              //  3: Mem access ctrl (directions), 1 arg:
      ST7789_ROTATION,              // 
    display_INVON, ST_CMD_DELAY,  //  4
      11,
    display_NORON, 0, //  3: Normal display on, no args, w/delay
    display_DISPON, ST_CMD_DELAY, //  5: Main screen turn on, no args, delay 10 ms
      200
};

// инициализация
void ST7789_Init() {
  display_Init( ST7789_WIDTH, ST7789_HEIGHT, init_cmds1 );
}
