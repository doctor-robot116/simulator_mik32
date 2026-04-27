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
#include <mik32_hwlibs/crc.h>
#include <crc16_ccit.h>

#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>



static uint32_t mik32_crc( const uint8_t * a_buf, uint32_t a_len, uint32_t a_init, uint32_t a_tot, uint32_t a_totr, uint32_t a_fx ) {
  // настройки с включенным битом записи начального значения
  CRC->CTRL = a_tot
            | a_totr
            | a_fx
            | CRC_CTRL_WAS_M;
            ;
  // начальное значение
  CRC->DATA32 = a_init;
  // обязательное чтение CRC->CTRL формирует необходимую задержку после записи в CRC->DATA32
  CRC->CTRL;
  // настройки с выключенным битом записи начального значения
  CRC->CTRL = a_tot
            | a_totr
            | a_fx
            ;
  //
  while ( 0 != a_len ) {
    if ( a_len >= 4 ) {
      CRC->DATA32 = (a_buf[0] << 24)
                  | (a_buf[1] << 16)
                  | (a_buf[2] << 8)
                  | a_buf[3]
                  ;
      a_buf += 4;
      a_len -= 4;
    } else {
      if ( a_len >= 2 ) {
        CRC->DATA16 = (a_buf[0] << 8)
                    | a_buf[1]
                    ;
        a_buf += 2;
        a_len -= 2;
      } else {
        CRC->DATA8 = *a_buf;
        // один байт всегда последний
        break;
      }
    }
  }
  // на всяк случай задержка после записи в CRC->DATA
  CRC->CTRL;
  // ожидаем завершения обработки
  while ( 0 != (CRC->CTRL & CRC_CTRL_BUSY_M) ) {}
  return CRC->DATA32;
}


#define CRC_32_BYTES 9

static const char * CRC_STR = "123456789";


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
  // выбираем источником тактового сигнала для TIMER32_0 системную частоту
  PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
  // настройка TIMER32_0
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
  TIMER32_0->TOP = 16999999; // отсчёт 16000000 тактов (2 Гц)
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
  // CRC
  PM->CLK_AHB_SET = PM_CLOCK_AHB_CRC32_M;
  CRC->POLY = 0x04C11DB7;
}


// точка входа
void main() {
  // вывод разных тестовых значений CRC32 для разных алгоритмов и стандартной тестовой строки "123456789"
  printf(
      "\n"
      "CRC32/POSIX = 0x%08X\n"
    , mik32_crc( (const uint8_t *)CRC_STR, CRC_32_BYTES, 0, CRC_CTRL_TOT_BYTES_M, CRC_CTRL_TOTR_NONE_M, CRC_CTRL_FXOR_M )
    );
  printf(
      "CRC32/MPEG2 = 0x%08X\n"
    , mik32_crc( (const uint8_t *)CRC_STR, CRC_32_BYTES, 0xFFFFFFFF, CRC_CTRL_TOT_BYTES_M, CRC_CTRL_TOTR_NONE_M, 0 )
    );
  printf(
      "CRC32/BZIP2 = 0x%08X\n"
    , mik32_crc( (const uint8_t *)CRC_STR, CRC_32_BYTES, 0xFFFFFFFF, CRC_CTRL_TOT_BYTES_M, CRC_CTRL_TOTR_NONE_M, CRC_CTRL_FXOR_M )
    );
  printf(
      "CRC32/zlib = 0x%08X\n"
    , mik32_crc( (const uint8_t *)CRC_STR, CRC_32_BYTES, 0xFFFFFFFF, CRC_CTRL_TOT_BITS_BYTES_M, CRC_CTRL_TOTR_BITS_BYTES_M, CRC_CTRL_FXOR_M )
    );
  CRC->POLY = 0xA833982B;
  printf(
      "CRC32D = 0x%08X\n"
    , mik32_crc( (const uint8_t *)CRC_STR, CRC_32_BYTES, 0xFFFFFFFF, CRC_CTRL_TOT_BITS_BYTES_M, CRC_CTRL_TOTR_BITS_BYTES_M, CRC_CTRL_FXOR_M )
    );
  //
  printf(
      "CRC16/XMODEM = 0x%04X\n"
    , crc16_xmodem( (const uint8_t *)CRC_STR, CRC_32_BYTES )
    );
  //
  printf( "That's all, folks!\n" );
  //
  for (;;) {}
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
