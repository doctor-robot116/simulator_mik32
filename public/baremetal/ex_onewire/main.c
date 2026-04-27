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


#ifdef __cplusplus
extern "C" {
#endif
uint32_t MIK32_APBP_CLOCK = 32000000;
#ifdef __cplusplus
}
#endif


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
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  set_csr(mie, MIE_MEIE);
}


// точка входа
void main() {
  // мигаем светодиодом в прерывании.
  delay_ms( 2u );
  //
  printf( "Enumerate 1-wire devices\n" );
  // структура для поиска устройств на шине
  onewire_enumerate_s v_en;
  for (;;) {
    // место хранения идентификаторов термометров
    uint64_t v_ds1820_id[4];
    // количество найденных термометров
    int v_found_ds1820_count = 0;
    // зачищаем структуру
    bzero( &v_en, sizeof(v_en) );
    // счётчик количества обнаруженных идентификаторов
    int k = 0;
    while ( 0 == k ) {
      // цикл по всем идентификаторам на шине
      for ( bool v_next = onewire_enumerate_devices( UART_1, &v_en, true ); v_en.m_found; v_next = onewire_enumerate_devices( UART_1, &v_en, false ) ) {
        // считаем crc8 полученного идентифактора (uint64_t в порядке байтов LE, так что считаем по 7 первым байтам, последний байт - CRC8)
        uint8_t v_crc8 = onewire_crc8( (uint8_t *)&v_en.m_ROM, 7 );
        bool v_crc_ok = (v_crc8 == (v_en.m_ROM >> 56));
        printf(
            "Found ID: %08X%08X, crc8 = %02X %s\n"
          , ((uint32_t *)&v_en.m_ROM)[1]
          , ((uint32_t *)&v_en.m_ROM)[0]
          , v_crc8
          , v_crc_ok ? "OK" : "ERROR"
          );
        if ( v_crc_ok ) {
          const char * v_chip;
          const char * v_comment;
          v_chip = onewire_device_name_by_family( (uint8_t)v_en.m_ROM, &v_comment );
          printf( " - Device: '%s', Comment: '%s'\n", v_chip, v_comment );
          // запомним идентификатор, если это DS18S20 или DS18B20 (и если осталось место)
          if ( (0x10 == (uint8_t)v_en.m_ROM || 0x28 == (uint8_t)v_en.m_ROM) && v_found_ds1820_count < (int)(sizeof(v_ds1820_id)/sizeof(v_ds1820_id[0])) ) {
            v_ds1820_id[v_found_ds1820_count++] = v_en.m_ROM;
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
      // если был найден DS18S20
      if ( 0 != v_found_ds1820_count ) {
        delay_ms( 2u );
        // получим температуру
        // сброс
        onewire_device_present( UART_1 );
        // выбор всех устройств
        onewire_write_byte( UART_1, ONEWIRE_CMD_SKIP_ROM );
        // команда запроса типа питания
        onewire_write_byte( UART_1, ONEWIRE_1820_CMD_READ_POWER_SUPLY );
        // читаем тип питания (1 - внешнее, 0 - паразитное)
        bool v_ext_power = onewire_read_bit( UART_1 );
        // статус питания устройства
        printf(
            "Use '%s' power scheme.\n"
          , v_ext_power ? "external" : "parasite"
          );
        // по всем датчикам
        for ( int i = 0; i < v_found_ds1820_count; ++i ) {
          // сброс
          onewire_device_present( UART_1 );
          // выбор устройства
          onewire_write_byte( UART_1, ONEWIRE_CMD_MATCH_ROM );
          onewire_write_bytes( UART_1, (const uint8_t *)&v_ds1820_id[i], sizeof(v_ds1820_id[0]) );
          // команда начать измерение температуры
          onewire_write_byte( UART_1, ONEWIRE_1820_CMD_CONVERT_T );
          uint32_t v_from = g_milliseconds;
          // если питание внешнее
          if ( v_ext_power ) {
            // то ждём от устройства бит "1" в ответ на чтение бита
            while ( (g_milliseconds - v_from) < 800u ) {
              if ( onewire_read_bit( UART_1 ) ) {
                break;
              }
              delay_ms( 1u );
            }
          } else {
            // паразитное питание, надо выдать питание на DQ
            // PORT1.8 функция GPIO
            PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~PAD_CONFIG_PIN_M(8));
            PAD_CONFIG->PORT_1_DS = (PAD_CONFIG->PORT_1_CFG & ~PAD_CONFIG_PIN_M(8))
                                  | PAD_CONFIG_PIN(8, 2)
                                  ;
            GPIO_1->DIRECTION_OUT = GPIO_PIN_M( 8 );
            GPIO_1->SET = GPIO_PIN_M( 8 );
            // ждём немного больше максимального времени (см. документацию на датчик) на замер температуры
            delay_ms( 800u );
            // возвращаем функцию последовательного порта для PORT1.8
            PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~PAD_CONFIG_PIN_M(8))
                                   | PAD_CONFIG_PIN(8, 1)
                                   ;
          }
          // время чтения, для паразитного питания всегда стабильно :)
          v_from = g_milliseconds - v_from;
          // сброс
          onewire_device_present( UART_1 );
          // выбор устройства
          onewire_write_byte( UART_1, ONEWIRE_CMD_MATCH_ROM );
          onewire_write_bytes( UART_1, (const uint8_t *)&v_ds1820_id[i], sizeof(v_ds1820_id[0]) );
          // команда чтения памяти датчика
          onewire_write_byte( UART_1, ONEWIRE_1820_CMD_READ_SCRATCHPAD );
          // читаем 9 байтов - 8 память и 9-й - CRC8
          uint8_t v_scratchpad[9];
          onewire_read_bytes( UART_1, v_scratchpad, sizeof(v_scratchpad) );
          // сброс
          onewire_device_present( UART_1 );
          // вычисляем температуру
          if ( v_scratchpad[8] == onewire_crc8( v_scratchpad, 8 ) ) {  
            int v_t = *((int16_t *)v_scratchpad);
            int v_t1 = 0;
            int v_t2 = 0;
            // если это DS1820
            if ( 0x10 == (uint8_t)v_ds1820_id[i] ) {
              // то на дробную часть приходится 1 двоичный разряд
              v_t1 = v_t / 2;
              // т.к. дробная часть выводится в тысячных долях, преобразуем в количество тысячных долей (0 или 500 по сути)
              v_t2 = 500 * (v_t % 2); // 1000 * (.t / 2)
            } else {
              // в случае DS18B20 на дробную часть идёт 4 двоичных разряда
              v_t1 = v_t / 16;
              // т.к. дробная часть выводится в тысячных долях, преобразуем в количество тысячных долей
              v_t2 = (125 * (v_t % 16)) / 2; // 1000 * (.t / 16)
            }
            // коррекция знака дробной части
            if ( v_t2 < 0 ) {
              v_t2 = 0 - v_t2;
            }
            // дробная часть отображается в виде тысячных долей (3 десятичных разряда)
            printf( "%04X%08X: %d.%03d (%u ms)\n", (uint32_t)((v_ds1820_id[i] >> 40) & 0xFFFF), (uint32_t)(v_ds1820_id[i] >> 8), v_t1, v_t2, v_from );
          } else {
            printf( "Read scratchpad crc error.\n" );
          }
        }
        delay_ms( 1024u );
      } else {
        delay_ms( 2048u );
      }
    }
  }
}


// Обработка остальных прерываний (кроме системного таймера)
__attribute__ ((weak,section(".ram_text")))
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
