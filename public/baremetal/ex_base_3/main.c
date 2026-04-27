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
#include <mik32_hwlibs/boot.h>

#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>


// настройка оборудования, вызывается из libbaremetal/src/lib/runtime.c
void process_init_mcu() {
  // включаем тактирование GPIO_0
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M;
  // PORT0.9 - GPIO
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(9)));
  PAD_CONFIG->PORT_0_DS = (PAD_CONFIG->PORT_0_DS & ~(PAD_CONFIG_PIN_M(9)))
                        | PAD_CONFIG_PIN(9, 2)
                        ;
  // PORT0.9 выход (на плате BluePill-MIK32 к этому выводу подключен светодиод)
  GPIO_0->DIRECTION_OUT = (1 << 9);
  GPIO_0->CLEAR = (1 << 9); // светодиод выключен
  // включаем тактирование TIMER32_0 и EPIC
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_TIMER32_0_M | PM_CLOCK_APB_M_EPIC_M;
  // выбираем истоником тактового сигнала для TIMER32_0 системную частоту
  PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
  // настройка TIMER32_0
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
  TIMER32_0->TOP = 3999999; // отсчёт 4000000 тактов, прерывание 8 раз в секунду
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
  // теперь настройка UART_1
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_1_M | PM_CLOCK_APB_P_UART_1_M;
  // PORT1.9 функция последовательного порта
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(9)))
                         | PAD_CONFIG_PIN(9, 1)
                         ;
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(9)))
                          ;
  // UART_1
  UART_1->CONTROL1 = 0;
  UART_1->CONTROL2 = 0;
  UART_1->CONTROL3 = 0;
  UART_1->DIVIDER = 278; // 32000000/115200
  UART_1->FLAGS = 0xFFFFFFFF;
  UART_1->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M;
  // ждём готовности
  while ( 0 == (UART_1->FLAGS & UART_FLAGS_TEACK_M) ) {}
}


// точка входа
void main() {
  // мигаем светодиодом в прерывании.
  for ( int i = 0; ; ++i ) {
    delay_ms( 300u );
    printf( "Line [%3d]\n", i % 1000 );
  }
}


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // мигаем светодиодом
    GPIO_0->OUTPUT ^= (1 << 9);
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return true;
  } else {
    return false;
  }
}
