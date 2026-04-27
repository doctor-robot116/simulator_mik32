#include "ili9341.h"
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


#define DISPLAY_WIDTH  ILI9341_WIDTH
#define DISPLAY_HEIGHT ILI9341_HEIGHT


// буфер для вывода чисел
char g_str[64];


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
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  set_csr(mie, MIE_MEIE);
}


// точка входа после сброса
void main() {
  // инициализация экрана
  ILI9341_Init();
  // меряем скорость трёх способов закраски экрана
  // для вторых двух разница на использованном экране (160*128) несущественна
  // при большем количестве строк разница может появиться
  //
  // заливка всего экрана цветом поточечно
  delay_ms( 1u ); // встаём на начало очередной миллисекунды
  uint32_t v_fill_1 = g_milliseconds;
  display_FillScreen( DISPLAY_COLOR_RED );
  v_fill_1 = g_milliseconds - v_fill_1;
  // заливка всего экрана цветом построчно
  delay_ms( 1u );
  uint32_t v_fill_2 = g_milliseconds;
  display_FillScreenFast( DISPLAY_COLOR_GREEN );
  v_fill_2 = g_milliseconds - v_fill_2;
  // заливка всего экрана цветом за одну передачу DMA
  delay_ms( 1u );
  uint32_t v_fill_3 = g_milliseconds;
  display_FillRectangleFast_2( 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, DISPLAY_BYTE_COLOR_DARK_BLUE );
  v_fill_3 = g_milliseconds - v_fill_3;
  // отобразим результат в трёх строчках, миллисекунды
  snprintf( g_str, sizeof(g_str), "1 - %u", (unsigned int)v_fill_1 );
  display_WriteString(
      0, 0
    , g_str
    , &test32_font
    , DISPLAY_COLOR_YELLOW, DISPLAY_COLOR_DARKBLUE
    );
  snprintf( g_str, sizeof(g_str), "2 - %u", (unsigned int)v_fill_2 );
  display_WriteString(
      0, test32_font.m_row_height
    , g_str
    , &test32_font
    , DISPLAY_COLOR_YELLOW, DISPLAY_COLOR_DARKBLUE
    );
  snprintf( g_str, sizeof(g_str), "3 - %u", (unsigned int)v_fill_3 );
  display_WriteString(
      0, test32_font.m_row_height*2
    , g_str
    , &test32_font
    , DISPLAY_COLOR_YELLOW, DISPLAY_COLOR_DARKBLUE
    );
  // пауза на просмотр результата. можно поэкспериментировать с делителем частоты для SPI
  delay_ms( 3000u );
  display_FillRectangleFast_2( 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, DISPLAY_BYTE_COLOR_BLACK );
  // строчки для вывода
  const char * v_hello1 = "Привет!";
  const char * v_hello2 = "¡Hola!";
  const char * v_hello3 = "嗨!";
  const char * v_hello4 = "Hello!";
  // расчитываем положения строк по горизонтали, чтобы они располагались с выравниванием по середине
  // по вертикали ничего не считаем, т.к. высота строки шрифта = 32 точки, 4 строки = 128 точек по вертикали
  // как раз в размер экрана
  int v_width, v_height;
  int v_x1, v_x2, v_x3, v_x4;
  get_text_extent( &test32_font, v_hello1, &v_width, &v_height );
  v_x1 = (DISPLAY_WIDTH - v_width) / 2;
  get_text_extent( &test32_font, v_hello2, &v_width, &v_height );
  v_x2 = (DISPLAY_WIDTH - v_width) / 2;
  get_text_extent( &test32_font, v_hello3, &v_width, &v_height );
  v_x3 = (DISPLAY_WIDTH - v_width) / 2;
  get_text_extent( &test32_font, v_hello4, &v_width, &v_height );
  v_x4 = (DISPLAY_WIDTH - v_width) / 2;
  // бесконечный цикл
  for (;;) {
    uint32_t v_from = g_milliseconds;
    // выводим первую строку с нарастающей яркостью, остальные три строки чёрным цветом
    // зачем все 4 строки - чтобы корость вывода не зависила от строки
    for ( int i = 0x01; i < 0xF8; i += 3 ) {
      int k = i + 7;
      uint16_t v_color = (uint16_t)(((k & 0xF8) << 8) | ((k & 0xF8) << 3) | ((k & 0xF8) >> 3));
      display_WriteString( v_x1, 0, v_hello1, &test32_font, v_color, 0 );
      display_WriteString( v_x2, 32, v_hello2, &test32_font, 0, 0 );
      display_WriteString( v_x3, 64, v_hello3, &test32_font, 0, 0);
      display_WriteString( v_x4, 96, v_hello4, &test32_font, 0, 0 );
    }
    // выводим первую строку с убывающей яркостью, вторую строку с нарастающей яркостью
    // остальные две строки чёрным цветом
    for ( int i = 0x01; i < 0xF8; i += 3 ) {
      int k = 0xFF - i;
      int k2 = i + 7;
      uint16_t v_color = (uint16_t)(((k & 0xF8) << 8) | ((k & 0xF8) << 3) | ((k & 0xF8) >> 3));
      uint16_t v_color2 = (uint16_t)(((k2 & 0xF8) << 8) | ((k2 & 0xF8) << 3) | ((k2 & 0xF8) >> 3));
      display_WriteString( v_x1, 0, v_hello1, &test32_font, v_color, 0 );
      display_WriteString( v_x2, 32, v_hello2, &test32_font, v_color2, 0 );
      display_WriteString( v_x3, 64, v_hello3, &test32_font, 0, 0 );
      display_WriteString( v_x4, 96, v_hello4, &test32_font, 0, 0 );
    }
    // выводим вторую строку с убывающей яркостью, третью строку с нарастающей яркостью
    // остальные две строки чёрным цветом
    for ( int i = 0x01; i < 0xF8; i += 3 ) {
      int k = 0xFF - i;
      int k2 = i + 7;
      uint16_t v_color = (uint16_t)(((k & 0xF8) << 8) | ((k & 0xF8) << 3) | ((k & 0xF8) >> 3));
      uint16_t v_color2 = (uint16_t)(((k2 & 0xF8) << 8) | ((k2 & 0xF8) << 3) | ((k2 & 0xF8) >> 3));
      display_WriteString( v_x1, 0, v_hello1, &test32_font, 0, 0 );
      display_WriteString( v_x2, 32, v_hello2, &test32_font, v_color, 0 );
      display_WriteString( v_x3, 64, v_hello3, &test32_font, v_color2, 0 );
      display_WriteString( v_x4, 96, v_hello4, &test32_font, 0, 0 );
    }
    // выводим третью строку с убывающей яркостью, четвёртую строку с нарастающей яркостью
    // остальные две строки чёрным цветом
    for ( int i = 0x01; i < 0xF8; i += 3 ) {
      int k = 0xFF - i;
      int k2 = i + 7;
      uint16_t v_color = (uint16_t)(((k & 0xF8) << 8) | ((k & 0xF8) << 3) | ((k & 0xF8) >> 3));
      uint16_t v_color2 = (uint16_t)(((k2 & 0xF8) << 8) | ((k2 & 0xF8) << 3) | ((k2 & 0xF8) >> 3));
      display_WriteString( v_x1, 0, v_hello1, &test32_font, 0, 0 );
      display_WriteString( v_x2, 32, v_hello2, &test32_font, 0, 0 );
      display_WriteString( v_x3, 64, v_hello3, &test32_font, v_color, 0 );
      display_WriteString( v_x4, 96, v_hello4, &test32_font, v_color2, 0 );
    }
    // выводим четвёртую строку с убывающей яркостью
    // остальные три строки чёрным цветом
    for ( int i = 0x01; i < 0xF8; i += 3 ) {
      int k = 0xFF - i;
      uint16_t v_color = (uint16_t)(((k & 0xF8) << 8) | ((k & 0xF8) << 3) | ((k & 0xF8) >> 3));
      display_WriteString( v_x1, 0, v_hello1, &test32_font, 0, 0 );
      display_WriteString( v_x2, 32, v_hello2, &test32_font, 0, 0 );
      display_WriteString( v_x3, 64, v_hello3, &test32_font, 0, 0 );
      display_WriteString( v_x4, 96, v_hello4, &test32_font, v_color, 0 );
    }
    //
    printf( "time: %u ms\n", g_milliseconds - v_from );
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
