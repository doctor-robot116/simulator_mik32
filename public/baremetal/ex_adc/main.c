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
#include <mik32_hwlibs/analog_reg.h>

#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>


#define wfi() ({ asm volatile ("wfi"); })

#define display_WIDTH  ST7735_WIDTH
#define display_HEIGHT ST7735_HEIGHT


// буфер
char g_str[256];
// очередное значение от АЦП
volatile int g_adc_value;
// массив значений от АЦП
uint16_t g_adc_buffer[display_WIDTH];


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
  TIMER32_0->TOP = 639; // отсчёт 640 тактов (50 кГц)
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
}


// точка входа
void main() {
  //
  ST7735_Init();
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
  // ADC
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_ANALOG_REGS_M;
  // sah_time - по максимуму, 63 такта вроде бы с частотой тактирования АЦП, т.е. 32 МГц
  ANALOG_REG->ADC_CONFIG = (4 << ADC_CONFIG_SEL_S) | ADC_CONFIG_SAH_TIME_M;
  // снимаем "сброс"
  ANALOG_REG->ADC_CONFIG = (4 << ADC_CONFIG_SEL_S) | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
  // конфигурируем вход PORT0.7, аналоговый, "подтяжки" отключены
  PAD_CONFIG->PORT_0_CFG |= (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(7)))
                         | PAD_CONFIG_PIN_M(7)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(7)));
  // включаем АЦП
  ANALOG_REG->ADC_CONFIG = (4 << ADC_CONFIG_SEL_S) | ADC_CONFIG_EN_M | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
  // обращаю внимание, с регистром ANALOG_REG->ADC_CONFIG нельзя поступать как с другими
  // конфигурационными регистрами, только запись в этот регистр.
  // чтение-модификация-запись использовать нельзя.
  //
  // таймер (TIMER32_0) настроен на прерывания с частотой 50 кГц
  // в обработчике прерывания запускается очередное преобразование АЦП
  // и выбирается результат предыдущего преобразования
  // здесь в цикле простейшая синхронизация, после которой набирается display_WIDTH отсчётов
  // от АЦП (по ширине экрана), а потом по этим набранным отсчётам рисуется "гистограмма"
  // на экране (столбец шириной в 1 пиксель на один отсчёт).
  for (;;) {
    // "синхронизация"
    int v_prev, v_curr;
    for (v_prev = 0;;) {
      // ждём появления значения
      for ( g_adc_value = -1; -1 == g_adc_value; wfi() ) {}
      //
      v_curr = g_adc_value;
      //
      if ( v_curr > v_prev && v_curr >= 150 ) {
        break;
      }
      //
      v_prev = v_curr;
    }
    // набираем количество отсчётов по ширине экрана
    for ( int i = 0; i < display_WIDTH; ++i ) {
      // ждём появления значения
      for ( g_adc_value = -1; -1 == g_adc_value; wfi() ) {}
      //
      g_adc_buffer[i] = (uint16_t)g_adc_value;
    }
    // выводим на экран
    for ( int i = 0; i < display_WIDTH; ++i ) {
      uint16_t v_val = (g_adc_buffer[i] & 0xFFF) >> 5;
      display_FillRectangleFast_2( i,            0, 1, 128u - v_val, DISPLAY_BYTE_COLOR_BLACK );
      display_FillRectangleFast_2( i, 128u - v_val, 1,        v_val, DISPLAY_BYTE_COLOR_GREEN );
    }
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
  }
}


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // сразу заряжаем следующее преобразование
    ANALOG_REG->ADC_SINGLE |= ADC_SINGLE_M;
    // сохраняем значение
    g_adc_value = ANALOG_REG->ADC_VALUE;
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    //
    return true;
  } else {
    return false;
  }
}
