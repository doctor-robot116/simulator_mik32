#include "st7735.h"
#include "bme280.h"
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
#include <mik32_hwlibs/i2c.h>
#include "images/temp_plus.h"
#include "images/temp_minus.h"
#include "images/pressure_meter.h"
#include "images/humidity.h"
#include "fonts/test32.h"

#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>


#define display_WIDTH  ST7735_WIDTH
#define display_HEIGHT ST7735_HEIGHT


// буфер для вывода чисел
char g_str[16];


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
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(6)))
                          ;
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
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  set_csr(mie, MIE_MEIE);
}


// точка входа
void main() {
  // инициализация экрана
  ST7735_Init();
  // заливка чёрным цветом
  display_FillScreenFast_2(DISPLAY_BYTE_COLOR_BLACK );
  // инициализация датчика
  bool v_bmp280_ok = init_BMP280();
  // значения температуры, давления и влажности; плюс "предыдущие" значения
  int v_t, v_p, v_h, v_t_last = -999999, v_p_last = -999999, v_h_last = -999999;
  // main loop
  for (;;) {
    // если датчик есть
    if ( v_bmp280_ok ) {
      // читаем показания
      if ( BMP280_readMesure( &v_t, &v_p, &v_h ) ) {
        // подготовим показания
        // давление переведём в мм ртутного столба
        v_p = (v_p * 10000) / 133322;
        v_p = (v_p + 5) / 10;
        // для температуры выделим знак и окрглим до десятых градуса
        char v_char_sign = '+';
        if ( v_t < 0 ) {
          v_t = 0 - v_t;
          v_char_sign = '-';
        }
        v_t = (v_t + 5) / 10;
        // вывод значений от датчика в последовательный порт
        if ( BMP280_is_BME() ) {
          // для BME280 три показателя
          printf( "t = %c%d.%d C, p = %d mmHg, h = %d%%\n", v_char_sign, v_t / 10, v_t % 10, v_p, v_h );
        } else {
          // для BMP280 - только температуру и давление
          printf( "t = %c%d.%d C, p = %d mmHg\n", v_char_sign, v_t / 10, v_t % 10, v_p );
        }
        // отображаем на экране
        // температура
        if ( v_t_last != v_t ) {
          // новые показания отличаются от предыдущих
          v_t_last = v_t;
          // если температура ниже нуля, отобразим "замёзший" термометр
          if ( '-' == v_char_sign ) {
            display_DrawImage(
                6, 0
              , Itemp_minus_tga_width, Itemp_minus_tga_height
              , Itemp_minus_tga_zic
              , (int)sizeof(Itemp_minus_tga_zic)
              );
          } else {
            // при плюсовой температуре градусник с солнцем :)
            display_DrawImage(
                6, 0
              , Itemp_plus_tga_width, Itemp_plus_tga_height
              , Itemp_plus_tga_zic
              , (int)sizeof(Itemp_plus_tga_zic)
              );
          }
          // строка для отображения
          snprintf( g_str, sizeof(g_str), "%c%d.%d", v_char_sign, v_t / 10, v_t % 10 );
          // выводим текст, цвет в зависимости от знака температуры
          display_WriteStringWithBackground(
                    45
                  , 6
                  , 115
                  , 32
                  , g_str
                  , &test32_font
                  , '+' == v_char_sign ? RGB565(255, 49, 0) : RGB565(0, 57, 255)
                  , DISPLAY_COLOR_BLACK
                  );
        }
        // давление
        if ( v_p_last != v_p ) {
          v_p_last = v_p;
          // пиктограмма датчика давления
          display_DrawImage(
              0, 44
            , Ipressure_meter_tga_width, Ipressure_meter_tga_height
            , Ipressure_meter_tga_zic
            , (int)sizeof(Ipressure_meter_tga_zic)
            );
          snprintf( g_str, sizeof(g_str), "%d", v_p );
          //
          display_WriteStringWithBackground(
                    45
                  , 48
                  , 115
                  , 32
                  , g_str
                  , &test32_font
                  , DISPLAY_COLOR_LIGHTGREY
                  , DISPLAY_COLOR_BLACK
                  );
        }
        // относительная влажность
        if ( BMP280_is_BME() ) {
          if ( v_h_last != v_h ) {
            v_h_last = v_h;
            // пиктограмма датчика влажности
            display_DrawImage(
                3, 84
              , Ihumidity_tga_width, Ihumidity_tga_height
              , Ihumidity_tga_zic
              , (int)sizeof(Ihumidity_tga_zic)
              );
            snprintf( g_str, sizeof(g_str), "%d%%", v_h );
            //
            display_WriteStringWithBackground(
                      45
                    , 90
                    , 115
                    , 32
                    , g_str
                    , &test32_font
                    , RGB565(0, 137, 188)
                    , DISPLAY_COLOR_BLACK
                    );
          }
        }
      } else {
        // не удалось прочитать показания датчика, снимаем флаг готовности датчика
        v_bmp280_ok = false;
      }
    } else {
      // датчик не был проинициализирован/ошибка в процессе работы
      // три минуса на красном фоне
      display_WriteStringWithBackground(
          0, 0
        , display_WIDTH, test32_font.m_row_height
        , "---"
        , &test32_font
        , DISPLAY_COLOR_WHITE
        , DISPLAY_COLOR_DARKRED
        );
      // попробуем переинициализировать датчик
      v_bmp280_ok = init_BMP280();
      if ( v_bmp280_ok ) {
        // заливка чёрным цветом
        display_FillRectangleFast_2( 0, 0, display_WIDTH, display_HEIGHT, DISPLAY_BYTE_COLOR_BLACK );
        v_t_last = -999999, v_p_last = -999999, v_h_last = -999999;
      }
    }
    // спим одну секунду
    delay_ms( 1000u );
  }
}


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
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
