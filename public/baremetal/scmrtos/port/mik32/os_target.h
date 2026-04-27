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


#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>



#ifndef scmRTOS_MIK32AMUR_H
#define scmRTOS_MIC32AMUR_H

//------------------------------------------------------------------------------
//
//    Проверки компилятора
//
//
#ifndef __GNUC__
#error "This file should only be compiled with GNU C++ Compiler"
#endif // __GNUC__


#if (__GNUC__ < 11)
#error "This file must be compiled by GCC C/C++ Compiler v11.1 or higher."
#endif

//------------------------------------------------------------------------------
//
//    Сокращения для использцемых атрибутов
//
//
#ifndef INLINE
#define INLINE      __attribute__((__always_inline__)) inline
#endif

#ifndef NOINLINE
#define NOINLINE    __attribute__((__noinline__))
#endif

#ifndef NORETURN
#define NORETURN    __attribute__((__noreturn__))
#endif

#ifndef NAKED
#define NAKED    __attribute__((__naked__))
#endif

#ifndef USED
#define USED    __attribute__((__used__))
#endif

//------------------------------------------------------------------------------
//
//    Платформозависимые типы
//
//
typedef uint32_t stack_item_t;
typedef uint32_t status_reg_t;

//-----------------------------------------------------------------------------
//
//    Некоторые типы, OS_INTERRUPT не используется для Mik32/Amur
//
//
#define OS_PROCESS __attribute__((__noreturn__))
#define OS_INTERRUPT extern "C"

#define DUMMY_INSTR() __asm__ __volatile__ ("nop")
#define INLINE_PROCESS_CTOR INLINE

//-----------------------------------------------------------------------------
//    Отдельный стек для прерываний не используется
//
#define SEPARATE_RETURN_STACK   0

//-----------------------------------------------------------------------------
//    Читайте доки.
//
#define scmRTOS_ISRW_TYPE       TISRW

//-----------------------------------------------------------------------------
//
//    scmRTOS способ переключения контекста
//
//    Mik32/Amur "порт" поддерживает только прямое переключение в планировщике и прерываниях scmTROS
//
#define  scmRTOS_CONTEXT_SWITCH_SCHEME 0

//-----------------------------------------------------------------------------
//
//    scmRTOS порядок приоритетов
//
//    Mik32/Amur "порт" использует возрастающий порядок, если что rtfm :)
//
#define  scmRTOS_PRIORITY_ORDER             0

//-----------------------------------------------------------------------------
//
//    Конфигурация уровня проекта
//    !!! Порядок включения заголовочных файлов важен !!!
//
#include "scmRTOS_CONFIG.h"
#include "scmRTOS_TARGET_CFG.h"
#include <scmRTOS_defs.h>


//------------------------------------------------------------------------------
//    Значение 0 не используется в порте для Mik32/Amur
//    Значение 1 означает использование отдельного таймера. (В порте для Mik32/Amur используется системный таймер RISCV.)
//    При этом реализуется следующая схема:
//    1. extern "C" void __init_system_timer(); - инициализация таймера, включение прерываний от него
//    2. void LOCK_SYSTEM_TIMER() / void UNLOCK_SYSTEM_TIMER(); - включение/отключение прерываний от таймера
//    3. В обработчике прерывания от таймера дёргается OS::system_timer_isr()
//    
#define SCMRTOS_USE_CUSTOM_TIMER 1


//-----------------------------------------------------------------------------
//
//    Начальный "заполнитель" стека процесса (при включенной "отладке", помогает определить необходимы объем стека процесса)
//
#ifdef scmRTOS_USER_DEFINED_STACK_PATTERN
#define scmRTOS_STACK_PATTERN scmRTOS_USER_DEFINED_STACK_PATTERN
#else
#define scmRTOS_STACK_PATTERN 0xABBADEAD
#endif


//-----------------------------------------------------------------------------
//
//     Включение/выключение прерываний (глобальное)
//
#define enable_interrupts() { set_csr( mstatus, MSTATUS_MIE ); }
#define disable_interrupts() { clear_csr( mstatus, MSTATUS_MIE ); }

// Запись в регистр mstatus состояния включенности прерывания
INLINE void set_interrupt_state( status_reg_t a_status )
{
  if ( 0 != (a_status & MSTATUS_MIE) ) {
    enable_interrupts();
  } else {
    disable_interrupts();
  }
}

// Чтение регистра mstatus
INLINE status_reg_t get_interrupt_state()
{
    return read_csr( mstatus ) ;
}

//-----------------------------------------------------------------------------
//
//    Реализация критической секции
//
//    В конструкторе запоминается состояние включенности прерываний и прерывания отключаются.
//    В деструкторе возвращается предыдущее состояние флага разрешения прерываний.
//    Если прерывания были выключены - ничего не поменяется.
//    Если прерывания были включены - они будут выключены в области действия критической секции.
//

#if scmRTOS_USER_DEFINED_CRITSECT_ENABLE == 0
class TCritSect
{
public:
    INLINE TCritSect () : StatusReg(get_interrupt_state()) { disable_interrupts(); }
    INLINE ~TCritSect() { set_interrupt_state(StatusReg); }

private:
    status_reg_t StatusReg;
};
#endif // scmRTOS_USER_DEFINED_CRITSECT_ENABLE

// Следующие макросы объявлены пустыми, так как обработка системного таймера
// и переключение контекста проходят только в обработчике прерываний
// с отключенными прерываниями, т.о. нет необходимости огораживать это всё критической секцией.
//
#define SYS_TIMER_CRIT_SECT()
#define CONTEXT_SWITCH_HOOK_CRIT_SECT()


//-----------------------------------------------------------------------------
//
//    Включение/выключение прерываний от системного таймера
//
//
void LOCK_SYSTEM_TIMER();
void UNLOCK_SYSTEM_TIMER();

// За эту функцию дёргает обработчик прерывания, если это прерывание не от системного таймера.
// В этой функции нужно производить обработку всех прерываний, кроме прерываний от системного таймера (если таковые есть).
// Если какое-либо прерывание было обработано, нкжно вернуть true, иначе false.
extern "C" bool isr_user_hook();


//-----------------------------------------------------------------------------
//
//    Приоритеты
//
//
namespace OS
{
INLINE OS::TProcessMap get_prio_tag(const uint_fast8_t pr) { return static_cast<OS::TProcessMap> (1 << pr); }

#if scmRTOS_PRIORITY_ORDER == 0
    INLINE uint_fast8_t highest_priority(TProcessMap pm)
    {
        extern TPriority const PriorityTable[];

        #if scmRTOS_PROCESS_COUNT < 6
            return PriorityTable[pm];
        #else
            uint32_t x = pm;
            x = x & -x;                             // Isolate rightmost 1-bit.

                                                // x = x * 0x450FBAF
            x = (x << 4) | x;                       // x = x*17.
            x = (x << 6) | x;                       // x = x*65.
            x = (x << 16) - x;                      // x = x*65535.

            return PriorityTable[x >> 26];
        #endif  // scmRTOS_PROCESS_COUNT < 6
    }
#else
    #error "Mik32/Amur port supports scmRTOS_PRIORITY_ORDER == 0 only!"
#endif // scmRTOS_PRIORITY_ORDER
}

namespace OS
{
    INLINE void enable_context_switch()  { enable_interrupts(); }
    INLINE void disable_context_switch() { disable_interrupts(); }
}

//------------------------------------------------------------------------------
//
//    Проверка схемы переключения процессов
//
//
namespace OS
{
#if scmRTOS_CONTEXT_SWITCH_SCHEME == 1

#error "Mik32/Amur port supports software interrupt switch method only!"

#endif // scmRTOS_CONTEXT_SWITCH_SCHEME

}

#include <os_kernel.h>

namespace OS
{

//--------------------------------------------------------------------------
//
//      NAME       :   поддержка обработчиков прерываний в scmRTOS
//
//      PURPOSE    :   обеспечение работы вложенных обработчиков прерываний
//
//      DESCRIPTION:   в "порте" для Mik32/Amur используется ровно в одном месте
//                     так как обработчик прерываний собственно один.
//

class TISRW
{
public:
    INLINE  TISRW() { ISR_Enter(); }
    INLINE  ~TISRW() { ISR_Exit();  }

private:
    //-----------------------------------------------------
    INLINE void ISR_Enter()
    {
        Kernel.ISR_NestCount++;
    }
    //-----------------------------------------------------
    INLINE void ISR_Exit()
    {
        if(--Kernel.ISR_NestCount) {
          return;
        }
        Kernel.sched_isr();
    }
    //-----------------------------------------------------
};

// TISRW_SS == TISRW для совместимости
#define TISRW_SS    TISRW


INLINE void system_timer_isr()
{
//  Закомментировано, так как эта функция и так вызывается из обработчика прерывания (trap_handler)
//  где и так уже создаётся экземпляр этого объекта
//	OS::TISRW ISR;

#if scmRTOS_SYSTIMER_HOOK_ENABLE == 1
    system_timer_user_hook();
#endif

    Kernel.system_timer();
}


} // namespace OS
//-----------------------------------------------------------------------------

#endif // scmRTOS_MIK32AMUR_H
//-----------------------------------------------------------------------------

