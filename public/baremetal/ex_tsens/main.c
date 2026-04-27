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
#include <mik32_hwlibs/analog_reg.h>

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
  ST7735_Init();
  display_FillScreenFast_2(DISPLAY_BYTE_COLOR_BLUE);
  // датчик температуры
  // включить тактирование
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_ANALOG_REGS_M;
  // "снятие" сброса, ещё одно включение тактирования датчика, включение датчика
  // а одним битом конечно обойтись было нельзя
  // установка источника тактирования sys_clk (а зачем тогда вот это выше тактирование от APB?)
  // установка делителя (10-битного) на 500 (32000000/2/(499+1) = 32000)
  ANALOG_REG->TSENS_CFG = TSENS_CFG_NRST_M
                        | TSENS_CFG_NPD_CLK_M
                        | TSENS_CFG_NPD_M
                        | TSENS_CFG_CLK_MUX_SYSTEM
                        | (499 << TSENS_CFG_DIV_S)
                        ;
  // границы диапазона "контроля" не трогаем
  // прерывания отключаем (причём в документации биты разрешения прерывания почему-то обозваны
  // "масками" - у писателя доки явные проблемы с пониманием "железа"
  ANALOG_REG->TSENS_IRQ = 0;
  ANALOG_REG->TSENS_CLEAR_IRQ = 0xFFFFFFFF;
  // сначала померяем длительность одного переобразования
  delay_ms( 1u );
  uint32_t v_from = g_milliseconds;
  // сделаем 100 преобразований
  for ( uint32_t i = 0; i < 25u; ++i ) {
    // запускаем одиночное преобразование
    ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
    // ждём результата
    while ( 0 == (TSENS_VALUE_EOC_M & ANALOG_REG->TSENS_VALUE) ) {}
    // запускаем одиночное преобразование
    ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
    // ждём результата
    while ( 0 == (TSENS_VALUE_EOC_M & ANALOG_REG->TSENS_VALUE) ) {}
    // запускаем одиночное преобразование
    ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
    // ждём результата
    while ( 0 == (TSENS_VALUE_EOC_M & ANALOG_REG->TSENS_VALUE) ) {}
    // запускаем одиночное преобразование
    ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
    // ждём результата
    while ( 0 == (TSENS_VALUE_EOC_M & ANALOG_REG->TSENS_VALUE) ) {}
  }
  // сколько времени прошло
  v_from = g_milliseconds - v_from;
  snprintf( g_str, sizeof(g_str), "%u", v_from );
  display_WriteStringWithBackground(
      0, 0
    , display_WIDTH, test32_font.m_row_height
    , g_str
    , &test32_font
    , DISPLAY_COLOR_YELLOW
    , DISPLAY_COLOR_BLUE
    );
  // время на чтение результата
  delay_ms( 3000u );
  display_FillRectangleFast_2( 0, 0, display_WIDTH, display_HEIGHT, DISPLAY_BYTE_COLOR_BLACK );
  // запускаем одиночное преобразование
  ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
  //
  for ( uint32_t i = 0;; ++i ) {
    // вычитываем значение регистра ANALOG_REG->TSENS_VALUE,
    // пока не получим значение с взведённым битом TSENS_VALUE_EOC_M
    int v_value;
    for ( v_value = ANALOG_REG->TSENS_VALUE
        ; 0 == (TSENS_VALUE_EOC_M & v_value)
        ; v_value = ANALOG_REG->TSENS_VALUE ) {}
    // запускаем одиночное преобразование, чтобы пока оно идёт, заняться выводом на экран
    ANALOG_REG->TSENS_SINGLE = TSENS_SINGLE_M;
    // убираем из значение взведённый бит TSENS_SINGLE_M
    v_value -= TSENS_VALUE_EOC_M;
    // вывод на экран необработанного значения
    snprintf( g_str, sizeof(g_str), "%d", v_value );
    display_WriteStringWithBackground(
        16, 32
      , 128, test32_font.m_row_height
      , g_str
      , &test32_font
      , DISPLAY_COLOR_WHITE
      , 0 == (i & 0x80) ? DISPLAY_COLOR_DARKGREEN : DISPLAY_COLOR_DARKYELLOW
      );
    // пересчитываем в градусы цельсия
    v_value  = (1702838*v_value - 492763933) / (16*v_value + 7046);
    // определяем знак
    char v_sign = '+';
    if ( v_value < 0 ) {
      v_sign = '-';
      v_value = 0 - v_value;
    }
    // вывод значения в градусах цельсия со знаком
    // смысла показывать десятые доли градуса на самом деле особого нет,
    // у датчика слишком низкая разрешающая способность, согласно документации
    // примерно (125+40)/(603-225) = 0.437 градуса
    // а то, что HAL функция HAL_TSENS_GetTemperature() возвращает
    // "температура в градусах Цельсия, увеличенная в 100 раз" - вообще непонятно для чего
    snprintf( g_str, sizeof(g_str), "%c%u.%u", v_sign, v_value / 256, ((v_value % 256) * 321) / 8192 );
    display_WriteStringWithBackground(
        0, 64
      , display_WIDTH, test32_font.m_row_height
      , g_str
      , &test32_font
      , DISPLAY_COLOR_WHITE
      , '-' == v_sign ? DISPLAY_COLOR_DARKBLUE : DISPLAY_COLOR_DARKRED
      );
  }
}


// обработка прерываний
__attribute__ ((weak,section(".ram_text")))
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
