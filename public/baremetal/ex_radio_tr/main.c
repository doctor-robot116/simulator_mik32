#include <si4432.h>
#include <SI443X.h>
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
#include <stdbool.h>

// получить байты из UART_0 с указанным таймаутом
int mik32_gets( uint8_t * a_dst, int a_len ) {
  int v_result = 0;
  while ( v_result < a_len ) {
    if ( 0 != (UART_0->FLAGS & UART_FLAGS_RXNE_M ) ) {
      uint8_t v_c = UART_0->RXDATA;
      UART_0->TXDATA = v_c; // эхо на терминал
      *a_dst++ = v_c;
      ++v_result;
      if ( '\n' == v_c ) {
        break;
      }
    }
  }
  //
  return v_result;
}


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
  // PORT0.5, PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(5, 1)
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(5) | PAD_CONFIG_PIN_M(6)));
  // UART_0
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 278; // 32000000/115200
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M | UART_CONTROL1_RE_M;
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
  // инициализация радиомодема
  if ( ERR_NONE != si4432_init() ) {
    printf( "Init radiomodem error.\n" );
    for ( ;; ) {}
  } else {
    printf( "Init radiomodem OK.\n" );
  }
  //
  uint8_t v_buf[64];
  for (;;) {
    int v_rc = mik32_gets( v_buf, sizeof(v_buf) - 1 );
    if ( 0 != v_rc ) {
      v_buf[v_rc] = 0;
      printf( "Transmit: %s", (const char *)v_buf );
      v_rc = si4432_transmit( v_buf, v_rc );
      if ( ERR_NONE != v_rc ) {
        printf( "\nTransmit error: %d\n", v_rc );
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
