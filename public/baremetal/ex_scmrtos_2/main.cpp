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

#include <stdio.h>


#include <scmRTOS.h>

// Каждому процессу свой тип
typedef OS::process<OS::pr0, 2048> TPrinter;
typedef OS::process<OS::pr1, 1024> TLedEventGen;
typedef OS::process<OS::pr2, 1024> TLedSwitcher;


// Объекты процессов
TPrinter PPrinter;
TLedEventGen PLedEventGen;
TLedSwitcher PLedSwitcher;


// Cтруктура, передаваемая в сообщении
struct TAdcValue {
  uint8_t m_channel_num;
  uint16_t m_adc_value;
};


// объект коммуникации между обработчиком прерывания и процессом
OS::message<TAdcValue> msgAdcValue;
OS::TEventFlag ledEvent;



#define ADC_CHANNELS_COUNT  4
// номера каналов
uint8_t g_channels[ADC_CHANNELS_COUNT] = {0, 1, 3, 4};
// индекс для номера канала
int g_channel_idx = 0;


// должно быть с extern "C", чтобы "перегрузить" библиотечную функцию
extern "C"
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
  
  // АЦП
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
  // включаем АЦП, выбираем первый канал. мультиплексор переключится на него
  // после запуска очередного преобразования
  ANALOG_REG->ADC_CONFIG = (g_channels[g_channel_idx++] << ADC_CONFIG_SEL_S) | ADC_CONFIG_EN_M | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
  // запуск преобразования
  ANALOG_REG->ADC_SINGLE |= ADC_SINGLE_M;
  //
  if ( g_channel_idx >= ADC_CHANNELS_COUNT ) {
    g_channel_idx = 0;
  }
}



// точка входа после сброса
void main() {
  //
  OS::run();
}


// Обработка прерываний - здесь другие прерывания, кроме таймера.
extern "C"
__attribute((section(".ram_text")))
bool isr_user_hook() {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // сохраняем значение завершённого преобразования
    // g_channel_idx - индекс канала, который сейчас подключен мультиплектором
    // из ANALOG_REG->ADC_VALUE можно забрать значение для "предыдущего" канала
    // так что вычисляем индекс предыдущего канала
    int v_prev_idx = g_channel_idx - 1;
    if ( v_prev_idx < 0 ) {
      v_prev_idx = ADC_CHANNELS_COUNT - 1;
    }
    // формируем "сообщение"
    TAdcValue v_adc_value{ g_channels[v_prev_idx], (uint16_t)ANALOG_REG->ADC_VALUE };
    // заносим в объект синхронизации
    msgAdcValue = v_adc_value;
    // переключаем индекс на следующий канал
    if ( ++g_channel_idx >= ADC_CHANNELS_COUNT ) {
      g_channel_idx = 0;
    }
    //заряжаем следующее преобразование
    ANALOG_REG->ADC_SINGLE |= ADC_SINGLE_M;
    // мультиплексору указываем переключиться на следующий канал
    ANALOG_REG->ADC_CONFIG = (g_channels[g_channel_idx] << ADC_CONFIG_SEL_S) | ADC_CONFIG_EN_M | ADC_CONFIG_RN_M | ADC_CONFIG_SAH_TIME_M;
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    // отправляем сообщение
    msgAdcValue.send_isr();
    //
    return true;
  } else {
    return false;
  }
}


namespace OS
{
  template <>
  OS_PROCESS void TPrinter::exec() {
    printf( "\nStart Proc0\n" );
    // настройка таймера
    // включаем тактирование TIMER32_0 и EPIC
    PM->CLK_APB_M_SET = PM_CLOCK_APB_M_TIMER32_0_M | PM_CLOCK_APB_M_EPIC_M;
    // выбираем истоником тактового сигнала для TIMER32_0 системную частоту
    PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
    // настройка TIMER32_0
    TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
    TIMER32_0->TOP = 39999; // отсчёт 40000 тактов (частота 32000000/40000 = 800 Гц)
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
    //
    TAdcValue v_adc_value;
    // цикл
    for(;;) {
      if ( msgAdcValue.wait() ) {
        msgAdcValue.out( v_adc_value );
        printf( "[%d] = %4u\n", v_adc_value.m_channel_num, (unsigned int)v_adc_value.m_adc_value );
        // Вывод такой строки на скорости 115200 занимает чуть меньше 1 мс
        // данные от АЦП поступают с частотой 800 Гц, т.е. немного времени достаётся остальным двум менее
        // приоритетным процессам. Если подкрутить частоту таймера так, чтобы выборки поставлялись
        // с частотой более 1 кГц, то остальным двум процессам времени не достанется и светодиод
        // мигать не будет.
      }
    }
  }
  
  template <>
  OS_PROCESS void TLedEventGen::exec() {
    for (;;) {
      // дёргаем за событие
      ledEvent.signal();
      // пауза
      sleep( 499 );
    }
  }
  
  template <>
  OS_PROCESS void TLedSwitcher::exec() {
    for (;;) {
      // ждём события
      ledEvent.wait();
      // мигаем светодиодом (меняем состояние выхода на противоположное)
      GPIO_2->OUTPUT ^= (1 << 7);
    }
  }
} // namespace OS


#if scmRTOS_IDLE_HOOK_ENABLE
void OS::idle_process_user_hook() {
  // что бы поделать фоновому процессу?
  // например, повисеть в ожидании прерывания
  asm( "wfi" );
}
#endif
