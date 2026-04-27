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


// номера каналов
uint8_t g_channels[4] = {0, 1, 3, 4};
// индекс для номера канала
int g_channel_idx = 0;
// значения из каналов, по номерам {4, 0, 1, 3}
// т.е. сдвинуты на одну позицию по сравнению с индексом в g_channels[]
volatile int g_adc_value[4];


// инициализация оборудования контроллера, не связанное с настройкой системного тактового
// генератора и системного таймера (их настройка в libbaremetal/src/libc/runtime.c
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
  //
  // ADC
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_ANALOG_REGS_M;
  // sah_time - по максимуму, 63 такта вроде бы с частотой тактирования АЦП, т.е. 32 МГц
  ANALOG_REG->ADC_CONFIG = (0 << ADC_CONFIG_SEL_S) | ADC_CONFIG_SAH_TIME_M;
  // снимаем "сброс"
  ANALOG_REG->ADC_CONFIG = (0 << ADC_CONFIG_SEL_S) | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
  // конфигурируем вход PORT0.7 (ADC4) и PORT0.4 (ADC3)
  PAD_CONFIG->PORT_0_CFG |= (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(4) | PAD_CONFIG_PIN_M(7)))
                         | PAD_CONFIG_PIN_M(4)
                         | PAD_CONFIG_PIN_M(7)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(4) | PAD_CONFIG_PIN_M(7)))
                          ;
  // PORT1.7 (ADC1) и PORT1.5 (ADC0)
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_1_M;
  PAD_CONFIG->PORT_1_CFG |= (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(7)))
                         | PAD_CONFIG_PIN_M(5)
                         | PAD_CONFIG_PIN_M(7)
                         ;
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(7)))
                          ;
  // включаем АЦП
  ANALOG_REG->ADC_CONFIG = (0 << ADC_CONFIG_SEL_S) | ADC_CONFIG_EN_M | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
}


// точка входа
void main() {
  // запуск преобразования
  ANALOG_REG->ADC_SINGLE |= ADC_SINGLE_M;
  // так как номер канала устанавливается после второго такта *преобразования*
  // то первый результат получим для неизвестно какого канала, после получения результата
  // установим канал №1, и этот номер "подхватится" в начале преобразования канала №0
  // и второй результат получим для канала 0
  // обращаю внимание, с регистром ANALOG_REG->ADC_CONFIG нельзя поступать как с другими
  // конфигурационными регистрами, только запись в этот регистр.
  // чтение-модификация-запись использовать нельзя.
  //
  // таймер (TIMER32_0) настроен на прерывания с частотой 50 кГц
  // в обработчике прерывания запускается очередное преобразование АЦП
  // и выбирается результат предыдущего преобразования
  // в UART печатаются значения преобразования из каналов 0, 1, 3, 4 без какой-либо синхронизации
  for (;;) {
    printf( "[0] = %4d [1] = %4d [2] = %4d [3] = %4d\n", g_adc_value[1], g_adc_value[2], g_adc_value[3], g_adc_value[0] );
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
  }
}


// обработка прерываний
__attribute__ ((weak,section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // сохраняем значение завершённого преобразования
    g_adc_value[g_channel_idx++] = ANALOG_REG->ADC_VALUE;
    // индекс следующего канала
    // коррекция индекса при необходимости
    if ( g_channel_idx >= (int)(sizeof(g_channels) / sizeof(g_channels[0])) ) {
      g_channel_idx = 0;
    }
    //заряжаем следующее преобразование
    ANALOG_REG->ADC_SINGLE |= ADC_SINGLE_M;
    // переключаемся на следующий канал
    ANALOG_REG->ADC_CONFIG = (g_channels[g_channel_idx] << ADC_CONFIG_SEL_S) | ADC_CONFIG_EN_M | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return true;
  } else {
    return false;
  }
}
