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

#include <stdio.h>
#include <string.h>
#include <math.h>


__attribute__((used)) FILE __sf[2];
__attribute__((used)) FILE * const stdin = &__sf[0];
__attribute__((used)) FILE * const stdout = &__sf[1];
__attribute__((used)) FILE * const stderr = &__sf[1];

int mik32_putchar( char a_char, struct __file * ) {
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TXE_M) ) {}
  UART_0->TXDATA = a_char;
  return a_char;
}

int mik32_getchar( struct __file * ) {
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_RXNE_M) ) {}
  return UART_0->RXDATA;
}


// значение для следующей миллисекунды по системному таймеру
uint64_t g_mtimecmp;
// непрерывный счётчик миллисекунд
volatile uint32_t g_milliseconds = 0;


// задержка как минимум на a_ms - 1 миллисекунд
void delay_ms( uint32_t a_ms ) {
  uint32_t a_from = g_milliseconds;
  while ( ((uint32_t)(g_milliseconds - a_from)) < a_ms ) {}
}


void local_init() {
  // инициализация структур
  bzero( __sf, sizeof(__sf) );
  fdev_setup_stream( stdin, NULL, mik32_getchar, NULL, __SRD );
  fdev_setup_stream( stdout, mik32_putchar, NULL, NULL, __SWR );
  // запускаем все генераторы
  WU->CLOCKS_BU = (WU->CLOCKS_BU & ~( WU_CLOCKS_BU_OSC32K_EN_M
                                    | WU_CLOCKS_BU_LSI32K_EN_M
                                    | WU_CLOCKS_BU_RTC_CLK_MUX_M ));
  WU->CLOCKS_SYS = (WU->CLOCKS_SYS & ~( WU_CLOCKS_SYS_OSC32M_EN_M
                                      | WU_CLOCKS_SYS_HSI32M_EN_M
                                      | WU_CLOCKS_SYS_FORCE_32K_CLK_M ));
  // убеждаемся, что OSC32M работает
  while ( 0 == (PM->FREQ_STATUS & PM_FREQ_STATUS_OSC32M_M) ) {}
  // выбираем источником тактирования системы OSC32M
  PM->AHB_CLK_MUX = PM_AHB_CLK_MUX_OSC32M_M;
  // выключаем генератор LSI32K и выбираем автоматический выбор источника тактирования для RTC
  WU->CLOCKS_BU = (WU->CLOCKS_BU & ~( WU_CLOCKS_BU_OSC32K_EN_M
                                    | WU_CLOCKS_BU_LSI32K_EN_M
                                    | WU_CLOCKS_BU_RTC_CLK_MUX_M ))
                | WU_CLOCKS_BU_LSI32K_EN_M
                ;
  // выключаем генератор HSI32M
  WU->CLOCKS_SYS = (WU->CLOCKS_SYS & ~( WU_CLOCKS_SYS_OSC32M_EN_M
                                      | WU_CLOCKS_SYS_HSI32M_EN_M
                                      | WU_CLOCKS_SYS_FORCE_32K_CLK_M ))
                 | WU_CLOCKS_SYS_HSI32M_EN_M
                 ;
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
  // настраиваем системный таймер
  SCR1_TIMER->TIMER_DIV = 999; // 1000 - 1
  SCR1_TIMER->MTIMECMP = 32; // чтоб через 1 миллисекунду сработало
  SCR1_TIMER->MTIMECMPH = 0; // такими темпами регистра сравнения хватит на несколько миллионов лет
  SCR1_TIMER->MTIME = 0;
  SCR1_TIMER->MTIMEH = 0;
  SCR1_TIMER->TIMER_CTRL = SCR1_TIMER_CTRL_ENABLE_M;
  g_mtimecmp = 32;
  // разрешаем прывание от системного таймера
  set_csr(mie, MIE_MEIE | MIE_MTIE);
  // мигаем светодиодом в прерывании.
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
}


// точка входа после сброса
void main() {
  // начальные настройки
  local_init();
  // бесконечный цикл
  for ( int i = 0; ; ++i ) {
    delay_ms( 300u );
    printf( "sin(%3d) = %f\n", i % 1000, sin((3.14159265358*(i % 1000))/180.0) );
  }
}


// точка входа для всех прерываний 
__attribute__ ((interrupt,used,section(".trap_handler_ram")))
void trap_handler(void) {
  // приоритет по порядку проверки, при одновременном возникновении
  // условий для нескольких прерываний сначала отработается первое по коду
  //
  // системный таймер
  if ( 0 != (read_csr(mip) & MIP_MTIP) ) {
    // прерывание от системного таймера, переставляем MTIMECMP
    g_mtimecmp += 32;
    // по рекомендациям лучших собаководов
    // The RISC-V Instruction Set Manual: Volume II
    //   Machine Timer (mtime and mtimecmp) Registers
    SCR1_TIMER->MTIMECMP = 0xFFFFFFFF;
    SCR1_TIMER->MTIMECMPH = ((uint32_t *)&g_mtimecmp)[1];
    SCR1_TIMER->MTIMECMP = ((uint32_t *)&g_mtimecmp)[0];
    // можно обнулять MTIME, но двигать MTIMECMP немного правильнее.
    // прошла очередная миллисекунда
    ++g_milliseconds;
    return;
  } 
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return;
  }
  // при нормальном ходе вещей сюда мы попадать не должны
  // т.е. если мы здесь, то просто забыли добавить сюда
  // "обработчик" ещё одного включенного прерывания
}
