#include "ili9341.h"
#include "xpt2046.h"
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/gpio_irq.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/epic.h>
#include <mik32_hwlibs/timer32.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/spi.h>

#include "fonts/font_25_30.h"

#include <runtime.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

#define DISPLAY_WIDTH  ILI9341_WIDTH
#define DISPLAY_HEIGHT ILI9341_HEIGHT


// буфер для вывода чисел
char g_str[32];


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
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}  // включаем тактирование TIMER32_0 и EPIC
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


// точка входа после сброса
void main() {
  // инициализация экрана
  ILI9341_Init();
  xpt2046_init();
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
  // калибровка
  // идея подсмотрена в https://embedded.icu/article/mikrokontrollery/rabota-s-rezistivnym-sensornym-ekranom
  // после калибровки координаты касаний будут соответствовать координатам в системе координат экрана
  // с учётов поворота осей и зеркалирования
  int z;
  int corners[4][2];
  // левый верхний угол
  display_FillRectangleFast_2( 8, 0, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( 0, 8, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[0][0], &corners[0][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( 0, 0, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // правый верхний угол
  display_FillRectangleFast_2( DISPLAY_WIDTH - 9, 0, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, 8, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[1][0], &corners[1][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, 0, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // левый нижний угол
  display_FillRectangleFast_2( 8, DISPLAY_HEIGHT - 17, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( 0, DISPLAY_HEIGHT - 9, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[2][0], &corners[2][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( 0, DISPLAY_HEIGHT - 17, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // правый нижний угол
  display_FillRectangleFast_2( DISPLAY_WIDTH - 9, DISPLAY_HEIGHT - 17, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, DISPLAY_HEIGHT - 9, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[3][0], &corners[3][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, DISPLAY_HEIGHT - 17, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // определяем коэффициенты
  int Ax = 0, Bx = 0, Dx = 0, Ay = 0, By = 0, Dy = 0;
  for ( int i = 0; i < 4; ++i ) {
    printf( "[%d] x = %d, y = %d\n", i, corners[i][0], corners[i][1] );
  }
  // определяем совпадение осей координат
  // смотрим на разницу по Y двух точек с одинаковыми координатами по Y в экранной сиситеме координат
  int dd = corners[1][1] - corners[0][1];
  if ( dd < 0 ) {
    dd = 0 - dd;
  }
  printf( "dd = %d\n" );
  do {
    // число 1024 подходит для 12-битных отсчётов от контроллера сенсорной поверхности
    if ( dd < 1024 ) {
      // коэффициенты Ay = 0 и Bx = 0, т.е. оси экрана (X, Y) совпадают с осями сенсорной поверхности
      // различия замеров по координатам
      int dx1 = corners[1][0] - corners[0][0];
      int dx2 = corners[3][0] - corners[2][0];
      int dy1 = corners[2][1] - corners[0][1];
      int dy2 = corners[3][1] - corners[1][1];
      if ( 0 == dx1 || 0 == dx2 || 0 == dy1 || 0 == dy2 ) {
        printf( "Calibration error\n" );
        break;
      }
      // расчитываем коэффициенты
      Ax = ( ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx1) + ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx2) ) / 2;
      Dx = ((4096 * 8) - (corners[0][0] * Ax))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[1][0] * Ax))
         + ((4096 * 8) - (corners[2][0] * Ax))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[3][0] * Ax))
         ;
      Dx /= 4;
      printf( "Ax = %d, Dx = %d\n", Ax, Dx );
      By = ( ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy1) + ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy2) ) / 2;
      Dy = ((4096 * 8) - (corners[0][1] * By))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[2][1] * By))
         + ((4096 * 8) - (corners[1][1] * By))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[3][1] * By))
         ;
      Dy /= 4;
      printf( "By = %d, Dy = %d\n", By, Dy );
    } else {
      // коэффициенты Ax = 0 и By = 0, т.е. оси экрана (X, Y) не совпадают с осями сенсорной поверхности
      // (X экрана соответствует Y сенсорной поверхности, Y экрана - X сенсорной поверхности)
      // различия замеров по координатам
      int dx1 = corners[1][1] - corners[0][1];
      int dx2 = corners[3][1] - corners[2][1];
      int dy1 = corners[2][0] - corners[0][0];
      int dy2 = corners[3][0] - corners[1][0];
      if ( 0 == dx1 || 0 == dx2 || 0 == dy1 || 0 == dy2 ) {
        printf( "Calibration error\n" );
        break;
      }
      // расчитываем коэффициенты
      Bx = ( ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx1) + ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx2) ) / 2;
      Dx = ((4096 * 8) - (corners[0][0] * Bx))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[1][0] * Bx))
         + ((4096 * 8) - (corners[2][0] * Bx))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[3][0] * Bx))
         ;
      Dx /= 4;
      printf( "Bx = %d, Dx = %d\n", Bx, Dx );
      Ay = ( ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy1) + ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy2) ) / 2;
      Dy = ((4096 * 8) - (corners[0][1] * Ay))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[2][1] * Ay))
         + ((4096 * 8) - (corners[1][1] * Ay))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[3][1] * Ay))
         ;
      Dy /= 4;
      printf( "Ay = %d, Dy = %d\n", Ay, Dy );
    }
  } while (false);
  // устанавливаем коэффициенты
  xpt2046_set_coeff( Ax, Bx, Dx, Ay, By, Dy );
  display_FillScreenFast( DISPLAY_COLOR_BLUE );
  // далее будем рисовать зелёный квадрат 5х5 точке в месте касания
  int X = 2, Y = 2;
  for (;;) {
    if ( xpt2046_touched() ) {
      int x, y, z;
      if ( xpt2046_read( &x, &y, &z ) ) {
        display_FillRectangleFast( X-2, Y-2, 5, 5, DISPLAY_COLOR_BLUE );
        X = xpt2046_get_X( x, y );
        Y = xpt2046_get_Y( x, y );
        printf( "X: %d, Y: %d\n", X, Y );
        if ( X < 2 ) {
          X = 2;
        } else {
          if ( X > (DISPLAY_WIDTH - 3) ) {
            X = DISPLAY_WIDTH - 3;
          }
        }
        if ( Y < 2 ) {
          Y = 2;
        } else {
          if ( Y > (DISPLAY_HEIGHT - 3) ) {
            Y = DISPLAY_HEIGHT - 3;
          }
        }
        display_FillRectangleFast( X-2, Y-2, 5, 5, DISPLAY_COLOR_YELLOW );
      }
    }
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
