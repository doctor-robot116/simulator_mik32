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

#include <scmRTOS.h>

// Каждому процессу свой тип
typedef OS::process<OS::pr0, 512> TProc0;
typedef OS::process<OS::pr1, 512> TProc1;

// Объекты процессов
TProc0 Proc0;
TProc1 Proc1;

// События - объекты межпроцессного взаимодействия
OS::TEventFlag timerEvent;
OS::TEventFlag ledEvent;


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
}


int main() {
  // запуск scmRTOS
  OS::run();
}


namespace OS {
  
template<>
OS_PROCESS void TProc0::exec() {
  for (;;) {
    // отсчитываем 500 событий ("тиков") таймера
    for ( int i = 0; i < 500; ++i ) {
      timerEvent.wait();
    }
    // перекидываем событие процессу, управляющему светодиодом
    ledEvent.signal();
  }
}

template<>
OS_PROCESS void TProc1::exec() {
  for (;;) {
    ledEvent.wait();
    // мигаем светодиодом (меняем состояние выхода на противоположное)
    GPIO_2->OUTPUT ^= (1 << 7);
  }
}

void system_timer_user_hook() {
  // сигналим процессу, считающему "тики" таймера
  timerEvent.signal_isr();
}

} // namespace OS




#if scmRTOS_IDLE_HOOK_ENABLE
void OS::idle_process_user_hook() {
  // что бы поделать фоновому процессу?
  // например, повисеть в ожидании прерывания
  asm( "wfi" );
}
#endif
