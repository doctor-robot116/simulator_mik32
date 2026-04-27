#include "st7735.h"
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
#include <mik32_hwlibs/spi.h>

#include "fonts/test32.h"


#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#include "db.h"


typedef struct {
  const uint8_t * a_ptr;
  int a_size;
} image_desc_t;

const image_desc_t g_images[38] = {
  {__db01_jpg, __db01_jpg_len}
, {__db02_jpg, __db02_jpg_len}
, {__db03_jpg, __db03_jpg_len}
, {__db04_jpg, __db04_jpg_len}
, {__db05_jpg, __db05_jpg_len}
, {__db06_jpg, __db06_jpg_len}
, {__db07_jpg, __db07_jpg_len}
, {__db08_jpg, __db08_jpg_len}
, {__db09_jpg, __db09_jpg_len}
, {__db10_jpg, __db10_jpg_len}
, {__db11_jpg, __db11_jpg_len}
, {__db12_jpg, __db12_jpg_len}
, {__db13_jpg, __db13_jpg_len}
, {__db14_jpg, __db14_jpg_len}
, {__db15_jpg, __db15_jpg_len}
, {__db16_jpg, __db16_jpg_len}
, {__db17_jpg, __db17_jpg_len}
, {__db18_jpg, __db18_jpg_len}
, {__db19_jpg, __db19_jpg_len}
, {__db20_jpg, __db20_jpg_len}
, {__db21_jpg, __db21_jpg_len}
, {__db22_jpg, __db22_jpg_len}
, {__db23_jpg, __db23_jpg_len}
, {__db24_jpg, __db24_jpg_len}
, {__db25_jpg, __db25_jpg_len}
, {__db26_jpg, __db26_jpg_len}
, {__db27_jpg, __db27_jpg_len}
, {__db28_jpg, __db28_jpg_len}
, {__db29_jpg, __db29_jpg_len}
, {__db30_jpg, __db30_jpg_len}
, {__db31_jpg, __db31_jpg_len}
, {__db32_jpg, __db32_jpg_len}
, {__db33_jpg, __db33_jpg_len}
, {__db34_jpg, __db34_jpg_len}
, {__db35_jpg, __db35_jpg_len}
, {__db36_jpg, __db36_jpg_len}
, {__db37_jpg, __db37_jpg_len}
, {__db38_jpg, __db38_jpg_len}
};


#define DISPLAY_WIDTH  128
#define DISPLAY_HEIGHT 160


// буфер для вывода чисел
char g_str[256];

//
void process_init_mcu() {
  // включаем тактирование GPIO
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_2_M;
  // PORT2.7 - GPIO
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~(PAD_CONFIG_PIN_M(7)));
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(PAD_CONFIG_PIN_M(7)))
                        | PAD_CONFIG_PIN(7, 2)
                        ;
  // PORT2.7 выход (на плате ACE-UNO к этому выводу подключен светодиод)
  GPIO_2->DIRECTION_OUT = (1 << 7);
  GPIO_2->CLEAR = (1 << 7); // светодиод выключен
  // теперь настройка UART_0
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_UART_0_M;
  // PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(6)));
  // UART_0
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 278; // 32000000/115200
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M;
  // ждём готовности
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}
  // включаем тактирование TIMER32_0 и EPIC
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_TIMER32_0_M | PM_CLOCK_APB_M_EPIC_M;
  // выбираем истоником тактового сигнала для TIMER32_0 системную частоту
  PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
  // настройка TIMER32_0
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
  TIMER32_0->TOP = 15999999; // отсчёт 16000000 тактов
  TIMER32_0->PRESCALER = 0; // /1
  TIMER32_0->CONTROL = 0;
  TIMER32_0->INT_MASK = 0;
  TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_EN_M;
  // разрешаем прерывания по переполнению
  TIMER32_0->INT_MASK = TIMER32_INT_OVERFLOW_M;
  // разрешаем прерывание от TIMER32_0
  EPIC->MASK_LEVEL_SET = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
  // разрешаем "внешние" прерывания
  set_csr(mie, MIE_MEIE);
  // разрешаем прерывания вообще в M-режиме
  set_csr(mstatus, MSTATUS_MIE);
}

// точка входа после сброса
void main() {
  // инициализация экрана
  ST7735_Init_2( DISPLAY_WIDTH, DISPLAY_HEIGHT );
  // поворот координат
  display_set_config( display_MADCTL_RGB );
  // заполнение экрана чёрным цветом
  display_FillRectangleFast_2( 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, DISPLAY_BYTE_COLOR_BLACK );
  //
  for (;;) {
    //
    uint32_t v_from = g_milliseconds;
    //
    for ( int i = 0; i < (int)(sizeof(g_images)/sizeof(g_images[0])); ++i ) {
      display_draw_jpeg_image( 0, 0, g_images[i].a_ptr, g_images[i].a_size );
    }
    //
    printf( "time: %u ms\n", g_milliseconds - v_from );
  }
}


__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return true;
  } else {
    return false;
  }
}
