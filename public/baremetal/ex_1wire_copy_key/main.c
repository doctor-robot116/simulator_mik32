#include <one_wire_uart.h>
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

#include <runtime.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>


uint32_t MIK32_APBP_CLOCK = 32000000;

#define RW_TYPE_UNDEF     0
#define RW_TYPE_RW1990_1  1
#define RW_TYPE_RW1990_2  2
#define RW_TYPE_TM2004    3
#define RW_TYPE_TM01      4


int get_rw_type();
void write_RW1990( int, uint64_t );
void write_TM2004( uint64_t );


// настройка оборудования
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
  // теперь настройка UART_0 и UART_1
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M
                    | PM_CLOCK_APB_P_UART_0_M
                    | PM_CLOCK_APB_P_GPIO_1_M
                    | PM_CLOCK_APB_P_UART_1_M
                    ;
  // PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(6)))
                          ;
  // UART_0, передача
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 278; // 32000000/115200
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M;
  // ждём готовности
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}
  // PORT1.8, PORT1.9 функция последовательного порта
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)))
                         | PAD_CONFIG_PIN(8, 1)
                         | PAD_CONFIG_PIN(9, 1)
                         ;
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(8) | PAD_CONFIG_PIN_M(9)))
                          ;
  // UART_1, приём и передача
  UART_1->CONTROL1 = 0;
  UART_1->CONTROL2 = 0;
  UART_1->CONTROL3 = 0;
  UART_1->DIVIDER = 3333; // 32000000/9600
  UART_1->FLAGS = 0xFFFFFFFF;
  UART_1->CONTROL2 = UART_CONTROL2_STOP_1_M // два стоп-бита
                   | UART_CONTROL2_TXINV_M // если используется инвертирующий внешний буфер (например, NPN транзистор)
                   ;
  UART_1->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M | UART_CONTROL1_RE_M;
  // ждём готовности
  while ( 0 == (UART_1->FLAGS & UART_FLAGS_TEACK_M) ) {}
}


// точка входа
void main() {
  // мигаем светодиодом в прерывании.
  delay_ms( 2u );
  //
  onewire_enumerate_s v_en;
  for (;;) {
    uint64_t v_ds1990_id[4];
    int v_found_ds1990_count = 0;
    // счётчик количества обнаруженных идентификаторов
    int k = 0;
    printf( "Connect master key\n" );
    while ( 0 == k ) {
      bzero( &v_en, sizeof(v_en) );
      // цикл по всем идентификаторам на шине
      for ( bool v_next = onewire_enumerate_devices( UART_1, &v_en, true ); v_en.m_found; v_next = onewire_enumerate_devices( UART_1, &v_en, false ) ) {
        // считаем crc8 полученного идентифактора (uint64_t в порядке байтов LE, так что считаем по 7 первым байтам, последний байт - CRC8)
        uint8_t v_crc8 = onewire_crc8( (uint8_t *)&v_en.m_ROM, 7 );
        bool v_crc_ok = (v_crc8 == (v_en.m_ROM >> 56));
        if ( v_crc_ok ) {
          printf(
              "Found ID: %08X%08X, crc8 = %02X %s\n"
            , ((uint32_t *)&v_en.m_ROM)[1]
            , ((uint32_t *)&v_en.m_ROM)[0]
            , v_crc8
            , v_crc_ok ? "OK" : "ERROR"
            );
          const char * v_chip;
          const char * v_comment;
          v_chip = onewire_device_name_by_family( (uint8_t)v_en.m_ROM, &v_comment );
          printf( " - Device: '%s', Comment: '%s'\n", v_chip, v_comment );
          // запомним идентификатор, если это DS1990 (и если осталось место)
          if ( 0x01 == (uint8_t)v_en.m_ROM && v_found_ds1990_count < (int)(sizeof(v_ds1990_id)/sizeof(v_ds1990_id[0])) ) {
            v_ds1990_id[v_found_ds1990_count++] = v_en.m_ROM;
          }
          // на один идентификатор больше
          ++k;
        }
        // если больше ничего не осталось, выходим из цикла
        if ( !v_next ) {
          break;
        }
      }
    }
    //
    if ( k > 0 ) {
      // количество обнаруженных устройств
      printf( "%d IDs found\n", k );
      // если был найден DS1990
      if ( 0 != v_found_ds1990_count ) {
        delay_ms( 2u );
        //
        printf( "Remove master key\n" );
        //
        onewire_wait_release( UART_1, v_en.m_ROM );
        //
        printf( "Connect rewritable key\n" );
        //
        while ( !onewire_device_present( UART_1 ) ) {}
        //
        int v_rw_type = get_rw_type();
        switch ( v_rw_type ) {
          case RW_TYPE_RW1990_1:
            printf( "RW-1990.1\n" );
            write_RW1990( v_rw_type, v_en.m_ROM );
            break;
            
          case RW_TYPE_RW1990_2:
            printf( "RW-1990.2\n" );
            write_RW1990( v_rw_type, v_en.m_ROM );
            break;

          case RW_TYPE_TM2004:
            printf( "TM-2004\n" );
            write_TM2004( v_en.m_ROM );
            break;

          case RW_TYPE_TM01:
            printf( "TM-01?\n" );
            write_RW1990( v_rw_type, v_en.m_ROM );
            break;
            
          default:
            printf( "Unknown\n" );
            break;
        }
        //
        if ( onewire_device_present( UART_1 ) ) {
          onewire_write_byte( UART_1, 0x33 );
          uint64_t v_id;
          onewire_read_bytes( UART_1, (uint8_t *)&v_id, sizeof(v_id) );
          if ( v_id == v_en.m_ROM ) {
            printf( "ID written.\n" );
          } else {
            printf( "ID write error.\n" );
          }
        }
        //
        while ( onewire_device_present( UART_1 ) ) {}
        delay_ms( 512u );
      } else {
        delay_ms( 2048u );
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


int get_rw_type() {
  if ( !onewire_device_present( UART_1 ) ) {
    return RW_TYPE_UNDEF;
  }
  // RW1990.1
  onewire_write_byte( UART_1, 0xD1 );
  onewire_write_bit( UART_1, true );
  delay_ms( 11u );
  if ( !onewire_device_present( UART_1 ) ) {
    return RW_TYPE_UNDEF;
  }
  onewire_write_byte( UART_1, 0xB5 );
  if ( !onewire_read_bit( UART_1 ) ) {
    return RW_TYPE_RW1990_1;
  }
  // RW1990.2
  if ( !onewire_device_present( UART_1 ) ) {
    return RW_TYPE_UNDEF;
  }
  onewire_write_byte( UART_1, 0x1D );
  onewire_write_bit( UART_1, true );
  delay_ms( 11u );
  if ( !onewire_device_present( UART_1 ) ) {
    return RW_TYPE_UNDEF;
  }
  onewire_write_byte( UART_1, 0x1E );
  if ( !onewire_read_bit( UART_1 ) ) {
    if ( !onewire_device_present( UART_1 ) ) {
      return RW_TYPE_UNDEF;
    }
    onewire_write_byte( UART_1, 0x1D );
    onewire_write_bit( UART_1, false );
    return RW_TYPE_RW1990_2;
  }
  // TM2004
  if ( !onewire_device_present( UART_1 ) ) {
    return RW_TYPE_UNDEF;
  }
  onewire_write_byte( UART_1, 0x33 );
  uint64_t v_addr;
  onewire_read_bytes( UART_1, (uint8_t *)&v_addr, sizeof(v_addr) );
  uint8_t v_tmp[3];
  v_tmp[0] = 0xAA;
  v_tmp[1] = 0;
  v_tmp[2] = 0;
  uint8_t v_crc = onewire_crc8( v_tmp, sizeof(v_tmp) );
  onewire_write_bytes( UART_1, v_tmp, sizeof(v_tmp) );
  if ( v_crc == onewire_read_byte( UART_1 ) ) {
    onewire_read_byte( UART_1 );
    return RW_TYPE_TM2004;
  } else {
    return RW_TYPE_TM01;
  }
}


void write_RW1990( int a_type, uint64_t a_ID ) {
  uint8_t v_wr_cmd;
  bool v_wr_flag = false;
  uint8_t v_bit_mask = 0;
  switch( a_type ) {
    case RW_TYPE_RW1990_1:
      v_wr_cmd = 0xD1;
      v_bit_mask = 1;
      break;
      
    case RW_TYPE_RW1990_2:
      v_wr_cmd = 0x1D;
      v_wr_flag = true;
      break;
      
    default:
      v_wr_cmd = 0xC1;
      v_wr_flag = true;
      break;
  }
  //
  if ( !onewire_device_present( UART_1 ) ) {
    return;
  }
  onewire_write_byte( UART_1, v_wr_cmd );
  onewire_write_bit( UART_1, v_wr_flag );
  delay_ms( 11u );
  if ( !onewire_device_present( UART_1 ) ) {
    return;
  }
  onewire_write_byte( UART_1, 0xD5 );
  for ( int i = 0; i < 64; ++i ) {
    onewire_write_bit( UART_1, 0 != ( (((uint8_t)a_ID) & 1) ^ v_bit_mask ) );
    delay_ms( 12u );
    a_ID >>= 1;
  }
  onewire_write_byte( UART_1, v_wr_cmd );
  onewire_write_bit( UART_1, !v_wr_flag );
  delay_ms( 11u );
}


void write_TM2004( uint64_t ) {
}
