#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/power_manager.h>

#include <stdint.h>
#include <stdbool.h>


// значение для следующей миллисекунды по системному таймеру
uint64_t g_mtimecmp;
// непрерывный счётчик миллисекунд
volatile uint32_t g_milliseconds = 0;


// задержка как минимум на a_ms - 1 миллисекунд
void delay_ms( uint32_t a_ms ) {
  uint32_t a_from = g_milliseconds;
  while ( ((uint32_t)(g_milliseconds - a_from)) < a_ms ) {}
}


//
void DBGU_PutChar( uint8_t a_char ) {
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TXE_M) ) {}
  UART_0->TXDATA = a_char;
}


// инициализация для объектов с конструкторами
extern void (*__preinit_array_start []) (void) __attribute__((weak));
extern void (*__preinit_array_end []) (void) __attribute__((weak));
extern void (*__init_array_start []) (void) __attribute__((weak));
extern void (*__init_array_end []) (void) __attribute__((weak));

void *__dso_handle;

int __cxa_atexit (void (*) (void *),void *, void *) {
  return 0;
}

void __libc_init_array (void)
{
  uint32_t count;
  uint32_t i;

  count = __preinit_array_end - __preinit_array_start;
  for ( i = 0; i < count; ++i )
    __preinit_array_start[i] ();

  count = __init_array_end - __init_array_start;
  for (i = 0; i < count; i++)
    __init_array_start[i] ();
}


__attribute__ ((weak))
void process_init_mcu(void) {
  // включаем прерывания
  set_csr( mstatus, MSTATUS_MIE );
}


void __libc_init_mcu() {
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
  // настраиваем системный таймер
  SCR1_TIMER->TIMER_DIV = 999; // 1000 - 1
  SCR1_TIMER->MTIMECMP = 32; // чтоб через 1 миллисекунду сработало
  SCR1_TIMER->MTIMECMPH = 0; // такими темпами регистра сравнения хватит на несколько миллионов лет
  SCR1_TIMER->MTIME = 0;
  SCR1_TIMER->MTIMEH = 0;
  SCR1_TIMER->TIMER_CTRL = SCR1_TIMER_CTRL_ENABLE_M;
  g_mtimecmp = 32;
  // разрешаем прывание от системного таймера
  set_csr(mie, MIE_MTIE);
  //
  process_init_mcu();
}

// Обработка остальных прерываний (кроме системного таймера)
// Если вернуть true, то обработчик прерываний после этого завершится.
// Если вернуть false, будет проверено наличие ожидающего прерывания от системного таймера, и если оно ожидает - тогда оно будет обработано.
// Можно переопределить в своём коде.
__attribute__ ((weak,section(".ram_text")))
bool process_irqs(void) {
  return false;
}


// Вызывается из обработчика прерываний после обработки прерывания от таймера.
__attribute__ ((weak,section(".ram_text")))
void process_timer(void) {
}


// точка входа для всех прерываний
// атрибуты:
// interrupt - это обработчик прерывания, так что компилатор при входе сохранит использованные
//    регистры в стеке и восстановит при выходе, выход командой mret
// used - так как вызовов этой функции нет, оптимизатор при использовании LTO может "зарезать" этот код,
//    чтобы такого не происходило, используем данные атрибут
// section() - помещает код функции в указанную секцию, которая попадает в совершенно определённое
//    место ОЗУ, что задаётся в скриптах линкера
__attribute__ ((interrupt,used,section(".trap_handler_ram")))
void trap_handler(void) {
  // сначала отрабатываем все прерывания, кроме таймера
  // если process_irqs() вернёт false, значит можно обработать прерывание таймера
  // т.е. если какое-либо прерывание обработано, подразумевается, что верёнтся true
  // и обработка прервания от системного таймера будет произведена только если других
  // ожидающих прерываний нет
  if ( !process_irqs() ) {
    // системный таймер
    if ( 0 != (read_csr(mip) & MIP_MTIP) ) {
      // прерывание от системного таймера, переставляем MTIMECMP
      g_mtimecmp += 32;
      // по рекомендациям лучших собаководов
      // The RISC-V Instruction Set Manual: Volume II
      //   Machine Timer (mtime and mtimecmp) Registers
      SCR1_TIMER->MTIMECMP = 0xFFFFFFFF;
      SCR1_TIMER->MTIMECMPH = (uint32_t)(g_mtimecmp >> 32);
      SCR1_TIMER->MTIMECMP = (uint32_t)g_mtimecmp;
      // можно обнулять MTIME, но двигать MTIMECMP немного правильнее.
      // прошла очередная миллисекунда
      ++g_milliseconds;
      process_timer();
    }
  }
}
