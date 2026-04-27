//******************************************************************************
//*
//*     FULLNAME:  Single-Core Microcontroller Real-Time Operating System
//*
//*     NICKNAME:  scmRTOS
//*
//*     PROCESSOR: Mik32/Amur (Micron)
//*
//*     TOOLKIT:   riscv64-unknown-elf-gcc (GNU)
//*
//*     PURPOSE:   Target Dependent Stuff Source
//*
//*     Version: v5.2.0
//*
//*
//*     Copyright (c) 2003-2021, scmRTOS Team
//*
//*     Permission is hereby granted, free of charge, to any person
//*     obtaining  a copy of this software and associated documentation
//*     files (the "Software"), to deal in the Software without restriction,
//*     including without limitation the rights to use, copy, modify, merge,
//*     publish, distribute, sublicense, and/or sell copies of the Software,
//*     and to permit persons to whom the Software is furnished to do so,
//*     subject to the following conditions:
//*
//*     The above copyright notice and this permission notice shall be included
//*     in all copies or substantial portions of the Software.
//*
//*     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//*     EXPRESS  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//*     MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//*     IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//*     CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//*     TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH
//*     THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//*
//*     =================================================================
//*     Project sources: https://github.com/scmrtos/scmrtos
//*     Documentation:   https://github.com/scmrtos/scmrtos/wiki/Documentation
//*     Wiki:            https://github.com/scmrtos/scmrtos/wiki
//*     Sample projects: https://github.com/scmrtos/scmrtos-sample-projects
//*     =================================================================
//*
//******************************************************************************
//*     Mik32/Amur port from scratch

#include <runtime.h>
#include <scmRTOS.h>

#include <stdint.h>


using namespace OS;


//------------------------------------------------------------------------------
//
//  Обработчик прерываний, единственный.
//  Если прерывание от системного таймера, дёргаем за Kernel.system_timer();
//  Если от чего-то другого - зовём isr_user_hook()
//
/*
__attribute__ ((interrupt,used,section(".trap_handler_ram")))
void trap_handler(void) {
  scmRTOS_ISRW_TYPE ISR;
  // системный таймер
  if ( 0 != (read_csr(mip) & MIP_MTIP) ) {
    // прерывание от системного таймера, переставляем MTIMECMP
    g_mtimecmp += (SYSTICKFREQ / SYSTICKINTRATE);
    // по рекомендациям лучших собаководов
    // The RISC-V Instruction Set Manual: Volume II
    //   Machine Timer (mtime and mtimecmp) Registers
    SCR1_TIMER->MTIMECMP = 0xFFFFFFFF;
    // можно обнулять MTIME, но двигать MTIMECMP немного правильнее.
    SCR1_TIMER->MTIMECMPH = ((uint32_t *)&g_mtimecmp)[1];
    SCR1_TIMER->MTIMECMP = ((uint32_t *)&g_mtimecmp)[0];
    // дёргаем за метод обработки события системного таймера scmRTOS
    OS::system_timer_isr();
  } else {
    // дадим возможность обработать другие прерывания
    isr_user_hook();
  }
}
*/

extern "C" {

__attribute__ ((weak,section(".ram_text")))
bool isr_user_hook(void) {
  return false;
}


__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  scmRTOS_ISRW_TYPE ISR;
  return isr_user_hook();
}

__attribute__ ((section(".ram_text")))
void process_timer(void) {
  scmRTOS_ISRW_TYPE ISR;
  // дёргаем за метод обработки события системного таймера scmRTOS
  OS::system_timer_isr();
}

}


void LOCK_SYSTEM_TIMER() {
  // запрещаем прерывание от таймера
  clear_csr( mie, MIE_MTIE );
}


void UNLOCK_SYSTEM_TIMER() {
  // разрешаем прывание от системного таймера
  set_csr(mie, MIE_MTIE);
}


#if scmRTOS_PRIORITY_ORDER == 0
namespace OS
{
  extern TPriority const PriorityTable[] =
  {
    #if scmRTOS_PROCESS_COUNT == 1
      static_cast<TPriority>(0xFF),
      pr0,
      prIDLE, pr0
    #elif scmRTOS_PROCESS_COUNT == 2
      static_cast<TPriority>(0xFF),
      pr0,
      pr1, pr0,
      prIDLE, pr0, pr1, pr0
    #elif scmRTOS_PROCESS_COUNT == 3
      static_cast<TPriority>(0xFF),
      pr0,
      pr1, pr0,
      pr2, pr0, pr1, pr0,
      prIDLE, pr0, pr1, pr0, pr2, pr0, pr1, pr0
    #elif scmRTOS_PROCESS_COUNT == 4
      static_cast<TPriority>(0xFF),
      pr0,
      pr1, pr0,
      pr2, pr0, pr1, pr0,
      pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0,
      prIDLE, pr0, pr1, pr0, pr2, pr0, pr1, pr0, pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0
    #elif scmRTOS_PROCESS_COUNT == 5
      static_cast<TPriority>(0xFF),
      pr0,
      pr1, pr0,
      pr2, pr0, pr1, pr0,
      pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0,
      pr4, pr0, pr1, pr0, pr2, pr0, pr1, pr0, pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0,
      prIDLE, pr0, pr1, pr0, pr2, pr0, pr1, pr0, pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0, pr4, pr0, pr1, pr0, pr2, pr0, pr1, pr0, pr3, pr0, pr1, pr0, pr2, pr0, pr1, pr0
    #else // scmRTOS_PROCESS_COUNT > 5
      static_cast<TPriority>(32),      static_cast<TPriority>(0),       static_cast<TPriority>(1),       static_cast<TPriority>(12),
      static_cast<TPriority>(2),       static_cast<TPriority>(6),       static_cast<TPriority>(0xFF),    static_cast<TPriority>(13),
      static_cast<TPriority>(3),       static_cast<TPriority>(0xFF),    static_cast<TPriority>(7),       static_cast<TPriority>(0xFF),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(14),
      static_cast<TPriority>(10),      static_cast<TPriority>(4),       static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),
      static_cast<TPriority>(8),       static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(25),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(21),      static_cast<TPriority>(27),      static_cast<TPriority>(15),
      static_cast<TPriority>(31),      static_cast<TPriority>(11),      static_cast<TPriority>(5),       static_cast<TPriority>(0xFF),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),
      static_cast<TPriority>(9),       static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(24),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(20),      static_cast<TPriority>(26),
      static_cast<TPriority>(30),      static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),    static_cast<TPriority>(0xFF),
      static_cast<TPriority>(0xFF),    static_cast<TPriority>(23),      static_cast<TPriority>(0xFF),    static_cast<TPriority>(19),
      static_cast<TPriority>(29),      static_cast<TPriority>(0xFF),    static_cast<TPriority>(22),      static_cast<TPriority>(18),
      static_cast<TPriority>(28),      static_cast<TPriority>(17),      static_cast<TPriority>(16),      static_cast<TPriority>(0xFF)
    #endif  // scmRTOS_PROCESS_COUNT
  };
}   //namespace
#endif

// начальная настройка стека процесса, откуда будет загружен "контекст" процесса для его запуска
void OS::TBaseProcess::init_stack_frame(
                stack_item_t * Stack
              , void (*exec)()
              // если включена отладка, то передаётся также адрес начала места, выделенного под стек процесса
#if scmRTOS_DEBUG_ENABLE == 1
              , stack_item_t * StackBegin
#endif
) {
    // RISCV ABI [ilp32] requires 16-byte stack alignment:
    StackPointer = (stack_item_t*)((uintptr_t)Stack & 0xFFFFFFF0UL);

    // ra при начальном запуске процесса
    *(--StackPointer)  = 0;
    // точка передачи управления, заносится в mepc
    *(--StackPointer)  = reinterpret_cast<stack_item_t>(exec);
    // mstatus с выключенными прерываниями, но с установленным флагом MPIE, чтобы после выполнения
    // команды mret прерывания включались
    *(--StackPointer)  = 0x1880;
    // имитация сохранения регистров "контекста" x31..x4
    StackPointer -= 28;
#if scmRTOS_DEBUG_ENABLE == 1
    //*(StackPointer)  = reinterpret_cast<stack_item_t>(&DebugInfo); // dummy load to keep 'DebugInfo' in output binary

    // при ключенной "отладке" заполняем неиспользованную часть стека значением STACK_DEFAULT_PATTERN
    // что позволяет под отладчиком определить необходимый размер стека для процесса
    // чтобы минимизировать использование ОЗУ
    for (stack_item_t *pDst = StackBegin; pDst < StackPointer; pDst++) {
        *pDst = STACK_DEFAULT_PATTERN;
    }
#endif
}




extern "C" {

// настройка системного таймера
// здесь "системная" частота 32 МГц делится на 1000
// т.е. mtime инкрементируется с частотой 32 кГц
// а прерывание от таймера случается каждые 32 "инкремента", т.е. частота перываний
// от таймера 1 кГц
USED void __init_system_timer() {
    // настраиваем системный таймер
    SCR1_TIMER->TIMER_DIV = 999; // 1000 - 1
    SCR1_TIMER->MTIMECMP = (SYSTICKFREQ / SYSTICKINTRATE);
    SCR1_TIMER->MTIMECMPH = 0;
    SCR1_TIMER->MTIME = 0;
    SCR1_TIMER->MTIMEH = 0;
    SCR1_TIMER->TIMER_CTRL = SCR1_TIMER_CTRL_ENABLE_M;
    g_mtimecmp = (SYSTICKFREQ / SYSTICKINTRATE);
    // разрешаем прывание от системного таймера
    UNLOCK_SYSTEM_TIMER();
}


} // extern "C"
