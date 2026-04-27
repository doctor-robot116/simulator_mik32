#include <RotaryEncoder.h>

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

#include <runtime.h>
#include <stdio.h>


// экземпляр объекта RotaryEncoder
rotary_encoder::RotaryEncoder g_renc(
    0     // GPIO_0
  , 10    // A - GPIO_0.10
  , 0     // B - GPIO_0.0
  , 30    // 30 "шагов" вала энкодера на один оборот
  , rotary_encoder::RotaryEncoder::LatchMode::TWO03 // тип энкодера, см. ../devices/RotaryEncoder.h
  );


extern "C"
void process_init_mcu(void) {
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
  // разрешаем "внешние" прерывания
  set_csr(mie, MIE_MEIE);
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
}


// точка входа после сброса и начальной настройки
void main() {
  //
  printf( "Rotary encoder test.\n" );
  //
  g_renc.apply_gpio_settings();
  g_renc.init();
  //
  int32_t v_last_pos = 0;
  //
  for (;;) {
    int32_t v_pos = g_renc.getPosition();
    if ( v_pos != v_last_pos ) {
      printf(
          "POS: %11d, DIR: %s, RPM: %u\n"
        , v_pos
        , g_renc.get_direction_string(g_renc.getDirection())
        , g_renc.getRPM()
        );
      v_last_pos = v_pos;
    }
  }
}


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
extern "C"
__attribute__ ((section(".ram_text")))
bool process_irqs() {
  // GPIO
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_GPIO_IRQ_S)) ) {
    // обработка для энкодера
    g_renc.tick_isr();
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
    // сбрасываем флаг ожидающего прерывания от GPIO
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_GPIO_IRQ_S);
    // прерывание обработано
    return true;
  } else {
    // не было обработки прерываний
    return false;
  }
}
