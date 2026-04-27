#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/spi.h>

#include "si4432.h"
#include "SI443X.h"

#include <stdio.h>
#include <string.h>


extern volatile uint32_t g_milliseconds;
void delay_ms( uint32_t a_ms );


#define SETTINGS_REG_PACK(a,b)  ((a<<8)|b)
#define SETTINGS_REG_NUM(a)     ((a>>8)&0xFF)
#define SETTINGS_REG_VAL(a)     (a&0xFF)

// номера битов для выводов
#define SI4432_MISO_PIN     0
#define SI4432_MOSI_PIN     1
#define SI4432_SCK_PIN      2
#define SI4432_NSS_PIN      3
#define SI4432_RST_PIN      8
#define SI4432_INT_PIN      9
#define SI4432_CS_PIN       2


// значения регистров для настройки радиомодема
// модуляция GFSK; Manchester OFF; центральная частота 434.1 МГц; девиация 6.25 кГц;
// скорость передачи 12.5 кБит/сек (индекс модуляции = 1.0);
// пакетная обработка с FIFO; длина "синхропоследовательности" (preamble) - 32 бита;
// размер слова синхронизации - 2 байта; размер заголовка - 0 байтов (не используется)
// поле данных переменного размера; CRC16 считается только по полю данных.
// все настройки можно поменять в "калькуляторе" ../docs/Si443x-Register-Settings_RevB1.ods
// SETTINGS_REG_PACK(номер регистра, значение регистра)
const uint16_t g_registers_setup[] =
{
  SETTINGS_REG_PACK(0x1C,0x2B)
, SETTINGS_REG_PACK(0x1D,0x3C)
, SETTINGS_REG_PACK(0x1E,0x02)
, SETTINGS_REG_PACK(0x1F,0x03)
, SETTINGS_REG_PACK(0x20,0x50)
, SETTINGS_REG_PACK(0x21,0x01)
, SETTINGS_REG_PACK(0x22,0x99)
, SETTINGS_REG_PACK(0x23,0x9A)
, SETTINGS_REG_PACK(0x24,0x06)
, SETTINGS_REG_PACK(0x25,0x68)
, SETTINGS_REG_PACK(0x2A,0xFF)

, SETTINGS_REG_PACK(0x30,0xAC)
, SETTINGS_REG_PACK(0x32,0x0C)
, SETTINGS_REG_PACK(0x33,0x02)
, SETTINGS_REG_PACK(0x34,0x08)
, SETTINGS_REG_PACK(0x35,0x22)
, SETTINGS_REG_PACK(0x36,0x2D)
, SETTINGS_REG_PACK(0x37,0xD4)
, SETTINGS_REG_PACK(0x38,0x00)
, SETTINGS_REG_PACK(0x39,0x00)
, SETTINGS_REG_PACK(0x3A,0x00)
, SETTINGS_REG_PACK(0x3B,0x00)
, SETTINGS_REG_PACK(0x3C,0x00)
, SETTINGS_REG_PACK(0x3D,0x00)
, SETTINGS_REG_PACK(0x3E,0x3C)
, SETTINGS_REG_PACK(0x3F,0x00)
, SETTINGS_REG_PACK(0x40,0x00)
, SETTINGS_REG_PACK(0x41,0x00)
, SETTINGS_REG_PACK(0x42,0x00)
, SETTINGS_REG_PACK(0x43,0xFF)
, SETTINGS_REG_PACK(0x44,0xFF)
, SETTINGS_REG_PACK(0x45,0xFF)
, SETTINGS_REG_PACK(0x46,0xFF)

, SETTINGS_REG_PACK(0x58,0x80)
, SETTINGS_REG_PACK(0x69,0x60)
, SETTINGS_REG_PACK(0x6E,0x66)
, SETTINGS_REG_PACK(0x6F,0x66)

, SETTINGS_REG_PACK(0x70,0x2C)
, SETTINGS_REG_PACK(0x71,0x23)
, SETTINGS_REG_PACK(0x72,0x0A)
, SETTINGS_REG_PACK(0x75,0x53)
, SETTINGS_REG_PACK(0x76,0x66)
, SETTINGS_REG_PACK(0x77,0x80)

, SETTINGS_REG_PACK(0,0) // маркер
};

// набор регистров, значние в которые нужно записывать после
// каждой передачи пакета
const uint16_t g_registers_after_send[] =
{
  SETTINGS_REG_PACK(SI443X_REG_INTERRUPT_ENABLE_2,0)
, SETTINGS_REG_PACK(0x71,0x23)
, SETTINGS_REG_PACK(0x75,0x53)
, SETTINGS_REG_PACK(0x76,0x66)
, SETTINGS_REG_PACK(0x77,0x80)
, SETTINGS_REG_PACK(0,0) // маркер
};


uint8_t g_rssi = 0;
uint8_t g_packet_length = 0;


// обмен одним байтом по SPI
int si4432_spi_xfer( uint8_t a_dr, uint8_t * a_dst ) {
  uint32_t v_from = g_milliseconds;
  // чистим приёмный буфер на всякий случай
  while ( 0 != (SPI_1->INT_STATUS & SPI_INT_STATUS_RX_FIFO_NOT_EMPTY_M) ) {
    SPI_1->RXDATA;
    if ( (g_milliseconds - v_from) >= 2u ) {
      return ERR_SPI;
    }
  }
  // отправляем байт
  SPI_1->TXDATA = a_dr;
  // ждём завершения отправки
  while ( (g_milliseconds - v_from) < 2u ) {
    if ( 0 != (SPI_1->INT_STATUS & SPI_INT_STATUS_RX_FIFO_NOT_EMPTY_M) ) {
      // принятое складываем, куда указано
      *a_dst = SPI_1->RXDATA;
      return ERR_NONE;
    }
  }
  return ERR_SPI;
}


// прочитать значение регистра
int si4432_read_register( uint8_t a_reg_num, uint8_t * a_dst ) {
  int v_rc = ERR_NONE;
  // выбрать трансивер на шине SPI
  GPIO_0->CLEAR = GPIO_PIN_M(SI4432_CS_PIN); // CS = 0
  // отправляем номер регистра (флаг записи = 0) и временно складываем, что прочитали - игнорируем
  // отправляем ноль, читаем содержимое регистра
  if ( ERR_NONE != si4432_spi_xfer( a_reg_num, a_dst )
    || ERR_NONE != si4432_spi_xfer( 0, a_dst ) ) {
    v_rc = ERR_SPI;
  }
  // "отпускаем" трансивер
  GPIO_0->SET = GPIO_PIN_M(SI4432_CS_PIN); // CS = 1
  
  return v_rc;
}


// запись регистра
int si4432_write_register( uint8_t a_reg_num, uint8_t a_src ) {
  uint8_t v_dummy;
  
  int v_rc = ERR_NONE;
  // выбрать трансивер на шине SPI
  GPIO_0->CLEAR = GPIO_PIN_M(SI4432_CS_PIN); // CS = 0
  // отправляем номер регистра (флаг записи = 1) и временно складываем, что прочитали - игнорируем
  // отправляем новое содержимое регистра, прочитанное игнорируем
  if ( ERR_NONE != si4432_spi_xfer( a_reg_num | RM_TDR_WRITE_FLAG, &v_dummy )
    || ERR_NONE != si4432_spi_xfer( a_src, &v_dummy ) ) {
    v_rc = ERR_SPI;
  }
  // "отпускаем" трансивер
  GPIO_0->SET = GPIO_PIN_M(SI4432_CS_PIN); // CS = 1
  
  return v_rc;
}


// записать указанное количество байтов в FIFO буфер трансивера
int si4432_write_FIFO( uint8_t * a_src, uint32_t a_len )
{
  // проверим размер пакета
  if ( a_len > RM_MAX_PACKET_SIZE ) {
    return ERR_TOO_LONG_PACKET;
  }
  //
  int v_result = ERR_NONE;
  //
  for ( size_t i = 0; i < a_len; ++i ) {
    if ( ERR_NONE != si4432_write_register( SI443X_REG_FIFO_ACCESS, a_src[i] ) ) {
#ifdef __DEBUG
      printf( "FIFO write error\n" );
#endif
      v_result = ERR_SPI;
      break;
    }
  }
  //
  return v_result;
}


// прочитать укзанное количество байтов из FIFO буфера трансивера
int si4432_read_FIFO( uint8_t * a_dst, uint32_t a_len )
{
  // проверим размер пакета
  if ( a_len > RM_MAX_PACKET_SIZE ) {
    return ERR_TOO_LONG_PACKET;
  }
  //
  int v_result = ERR_NONE;
  //
  for ( size_t i = 0; i < a_len; ++i ) {
    if ( ERR_NONE != si4432_read_register( SI443X_REG_FIFO_ACCESS, &a_dst[i] ) ) {
#ifdef __DEBUG
      printf( "FIFO read error\n" );
#endif
      v_result = ERR_SPI;
      break;
    }
  }
  //
  return v_result;
}


// обновить содержимое битового поля указанного регистра
// параметры msb и lsb указывают номера старшего и младшего граничных битов поля
// т.е. если нужно обновить второй и третий биты из value, указываем  msb=3, lsb=2
// value = xxxx01xx, reg = 10111100, то после "обновления" reg = 10110100
// т.е. при  msb=7, lsb=0 результат будет аналогичен вызову si4432_write_register
int si4432_set_reg_value(uint8_t reg, uint8_t value, uint8_t msb, uint8_t lsb)
{
  uint8_t currentValue = 0;
  
  if ( ERR_NONE != si4432_read_register(reg, &currentValue) )
  {
#ifdef __DEBUG
      printf( "error set reg value\n" );
#endif
      return ERR_SPI;
  }
  uint8_t mask = ~((0xFF << (msb + 1)) | (0xFF >> (8 - lsb)));
  uint8_t newValue = (currentValue & ~mask) | (value & mask);
  return si4432_write_register(reg, newValue);
}


// получить содержимое битового поля указанного регистра
// параметры msb и lsb указывают номера старшего и младшего граничных битов поля
// т.е. если нужно полуить второй и третий биты из reg, указываем  msb=3, lsb=2
// reg = 10110100, то в результате после чтения value = 00010000
// т.е. при  msb=7, lsb=0 результат будет аналогичен вызову si4432_read_register
int si4432_get_reg_value(uint8_t reg, uint8_t * a_dst, uint8_t msb, uint8_t lsb)
{
  uint8_t rawValue = 0;
  if ( ERR_NONE != si4432_read_register(reg, &rawValue) )
  {
#ifdef __DEBUG
      printf( "error get reg value\n" );
#endif
      return ERR_SPI;
  }
  *a_dst = rawValue & ((0xFF << lsb) & (0xFF >> (7 - msb)));
  return ERR_NONE;
}


// "найти" трансивер
int si4432_find() {
  uint8_t v_device_type;
  uint8_t v_device_version;
  
  // десять попыток
  for ( int i = 0; i < 10; i++ ) {
    // аппаратный сброс трансивера
    GPIO_1->SET = GPIO_PIN_M(SI4432_RST_PIN);
    delay_ms(5);
    GPIO_1->CLEAR = GPIO_PIN_M(SI4432_RST_PIN);
    delay_ms(100);
    // сборос командой
    si4432_write_register( SI443X_REG_OP_FUNC_CONTROL_1, SI443X_SOFTWARE_RESET );
    delay_ms(200);
    // читаем тип и версию
    if ( ERR_NONE == si4432_read_register(SI443X_REG_DEVICE_TYPE, &v_device_type)
      && ERR_NONE == si4432_read_register(SI443X_REG_DEVICE_VERSION, &v_device_version)
      && SI443X_DEVICE_TYPE == v_device_type
      && SI443X_DEVICE_VERSION == v_device_version ) {
      return ERR_NONE;
#ifdef __DEBUG
    } else {
      printf("v_device_type: %u, v_device_version: %u\n", v_device_type, v_device_version);
#endif
    }
  }

  return ERR_CHIP_NOT_FOUND;
}


// очистить флаги событий
int si4432_clear_irq_flags()
{
  uint8_t st;
  int v_result = ERR_SPI;
  
  if ( ERR_NONE == si4432_read_register( SI443X_REG_INTERRUPT_STATUS_1, &st )
    && ERR_NONE == si4432_read_register( SI443X_REG_INTERRUPT_STATUS_2, &st ) ) {
    v_result = ERR_NONE;
  }
  return v_result;
}


// применить настройки регистров из указанного списка
int si4432_apply_register_settings(const uint16_t * a_from)
{
  int v_result = ERR_NONE;
  //
  for ( int i = 0; 0 != a_from[i]; ++i ) {
    uint16_t v = a_from[i];
    
    //
    if ( ERR_NONE != si4432_write_register( SETTINGS_REG_NUM(v), SETTINGS_REG_VAL(v) ) ) {
      //
#ifdef __DEBUG
      printf(
          "%s - error write value 0x%02X into register 0x%02X"
          , __func__
          , SETTINGS_REG_VAL(v)
          , SETTINGS_REG_NUM(v)
          );
#endif
      //
      v_result = ERR_SPI;
      break;
    }
  }
  // настройка уровня мощности
  // txpow[2:0] Si4432 Output Power
  // 000 +1 dBm
  // 001 +2 dBm
  // 010 +5 dBm
  // 011 +8 dBm
  // 100 +11 dBm
  // 101 +14 dBm
  // 110 +17 dBm
  // 111 +20 dBm
  if ( ERR_NONE == v_result ) {
    v_result = si4432_set_reg_value(SI443X_REG_TX_POWER, RM_TX_POWER_1dBm, 2, 0);
  }
  //
  return v_result;
}


// настройка GPIO и SPI
int si4432_init() {
  // INT   PORT1.9 GPIO вход
  // RESET PORT1.8 GPIO выход
  // CS    PORT0.2 GPIO выход
  // MISO  PORT1.0 SPI1 MISO
  // MOSI  PORT1.1 SPI1 MOSI
  // SCK   PORT1.2 SPI1 SCK
  // NSS   PORT1.3 SPI1 NSS_IN
  // включение PAD_CONFIG
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  // включение GPIO_0, GPIO_1 и SPI1
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_GPIO_1_M | PM_CLOCK_APB_P_SPI_1_M;
  // настройка выводов
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(SI4432_CS_PIN)));
  PAD_CONFIG->PORT_0_DS = (PAD_CONFIG->PORT_0_DS & ~(PAD_CONFIG_PIN_M(SI4432_CS_PIN)))
                        | PAD_CONFIG_PIN(SI4432_CS_PIN, 2)
                        ;
  GPIO_0->DIRECTION_OUT = GPIO_PIN_M(SI4432_CS_PIN);
  GPIO_0->SET = (1 << SI4432_CS_PIN); // сигнал не активен
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~( PAD_CONFIG_PIN_M(SI4432_MISO_PIN)
                                                      | PAD_CONFIG_PIN_M(SI4432_MOSI_PIN)
                                                      | PAD_CONFIG_PIN_M(SI4432_SCK_PIN)
                                                      | PAD_CONFIG_PIN_M(SI4432_NSS_PIN)
                                                      | PAD_CONFIG_PIN_M(SI4432_RST_PIN)
                                                      | PAD_CONFIG_PIN_M(SI4432_INT_PIN) ))
                         | PAD_CONFIG_PIN(SI4432_MISO_PIN, 1)
                         | PAD_CONFIG_PIN(SI4432_MOSI_PIN, 1)
                         | PAD_CONFIG_PIN(SI4432_SCK_PIN, 1)
                         | PAD_CONFIG_PIN(SI4432_NSS_PIN, 1)
                         ;
  PAD_CONFIG->PORT_1_DS = (PAD_CONFIG->PORT_1_DS & ~PAD_CONFIG_PIN_M(SI4432_RST_PIN))
                        | PAD_CONFIG_PIN(SI4432_RST_PIN, 2)
                        ;
  GPIO_1->DIRECTION_IN = GPIO_PIN_M(SI4432_INT_PIN);
  GPIO_1->DIRECTION_OUT = GPIO_PIN_M(SI4432_RST_PIN);
  // а это финт ушами, подсмотренный в исходниках HAL
  // т.к. в модуле SPI нет "программного" управления состоянием бита "NSS", то приходится
  // использовать физический вывод SPI_1.NSS с подтяжкой к напряжению питания
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(SI4432_NSS_PIN)))
                        | PAD_CONFIG_PIN(SI4432_NSS_PIN, 1)
                        ;
  // настройка SPI1
  SPI_1->ENABLE = 0; // выключаем
  SPI_1->INT_DISABLE = 0xFFFFFFFF; // чистим флаги
  SPI_1->ENABLE = SPI_ENABLE_CLEAR_RX_FIFO_M | SPI_ENABLE_CLEAR_TX_FIFO_M; // чистим FIFO
  SPI_1->DELAY = 0; // никаких задержек
  SPI_1->TX_THR = 4; // граница заполнения FIFO на передачу
  SPI_1->CONFIG = SPI_CONFIG_MANUAL_CS_M // ручное управление сигналом CHIP_SELECT
                | SPI_CONFIG_CS_NONE_M // ни одно устройство не выбрано
                | SPI_CONFIG_BAUD_RATE_DIV_4_M // частота интерфейса 8 МГц
                | SPI_CONFIG_MODE_SEL_M // режим ведущего на шине SPI
                ;
  SPI_1->ENABLE = SPI_ENABLE_M; // включаем модуль SPI_1
  //
  int v_rc = si4432_find();
  if ( ERR_NONE != v_rc ) {
    return v_rc;
  }
  //
  v_rc = si4432_clear_irq_flags();
  if ( ERR_NONE != v_rc ) {
    return v_rc;
  }
  //
  return si4432_apply_register_settings(g_registers_setup);
}


// включить режим приёма пакета
int si4432_start_receive()
{
  if (
      // clear Rx FIFO
      ERR_NONE == si4432_set_reg_value(SI443X_REG_OP_FUNC_CONTROL_2, SI443X_RX_FIFO_RESET, 1, 1)
   && ERR_NONE == si4432_set_reg_value(SI443X_REG_OP_FUNC_CONTROL_2, SI443X_RX_FIFO_CLEAR, 1, 1)

      // set interrupt mapping
   && ERR_NONE == si4432_write_register(SI443X_REG_INTERRUPT_ENABLE_1, SI443X_VALID_PACKET_RECEIVED_ENABLED | SI443X_CRC_ERROR_ENABLED)
   && ERR_NONE == si4432_write_register(SI443X_REG_INTERRUPT_ENABLE_2, SI443X_SYNC_WORD_DETECTED_ENABLED)

      // set mode to receive
   && ERR_NONE == si4432_write_register(SI443X_REG_OP_FUNC_CONTROL_1, SI443X_RX_ON | SI443X_XTAL_ON)

      // clear interrupt flags
   && ERR_NONE == si4432_clear_irq_flags()
   ) {
     return ERR_NONE;
   } else {
     return ERR_SPI;
   }
}


// получить размер принятого пакета
int si4432_get_packet_length(uint8_t * a_dst)
{
  return si4432_read_register(SI443X_REG_RECEIVED_PACKET_LENGTH, a_dst);
}


// прочитать данные принятого пакета
int si4432_read_data(uint8_t * a_dst)
{
  g_packet_length = 0;
  
  // clear interrupt flags
  if ( ERR_NONE != si4432_clear_irq_flags() ) {
    return ERR_SPI;
  }

  // get packet length
  if ( ERR_NONE != si4432_get_packet_length(&g_packet_length) )
  {
    return ERR_SPI;
  }

  // read packet data
  return si4432_read_FIFO(a_dst, g_packet_length);
}


// принять пакет, ожидат приёма не дольше a_timeout миллисекунд
int si4432_receive(uint8_t * a_dst, uint32_t a_timeout)
{
  uint32_t v_timeout = (
        (RM_PREAMBLE_BYTES + RM_HEADER_BYTES + RM_SYNC_BYTES + RM_VARIABLE_LENGTH + RM_MAX_PACKET_SIZE + RM_CRC_BYTES)
      * ((1 << RM_MANCHESTER_ENABLED) * 8 * 1000 * 2)
      + (RM_BIT_RATE / 2)
      ) / RM_BIT_RATE
      ;
  if ( a_timeout < v_timeout ) {
    a_timeout = v_timeout;
  }

  // запускаем режим приёма пакета данных
  if ( ERR_NONE != si4432_start_receive() ) {
    return ERR_SPI;
  }

  // ожидаем активного (лог. 0) сигнала nIRQ от трансивера или истечения отведённого времени
  uint32_t v_from = g_milliseconds;
  for (;;) {
    while( 0 != (GPIO_1->SET & GPIO_PIN_M(SI4432_INT_PIN)) ) {
      if( (g_milliseconds - v_from) > a_timeout ) {
        si4432_clear_irq_flags();
        return ERR_RX_TIMEOUT;
      } else {
        delay_ms( 1 );
      }
    }
    // далее проверяем условия успешного принятия пакета данных
    uint8_t v_flags2 = 0;
    if ( ERR_NONE != si4432_read_register(SI443X_REG_INTERRUPT_STATUS_2, &v_flags2) ) {
      return ERR_SPI;
    }
    if ( 0 != (SI443X_SYNC_WORD_DETECTED_INTERRUPT & v_flags2) ) {
      if ( ERR_NONE != si4432_read_register(SI443X_REG_RSSI, &g_rssi) ) {
        return ERR_SPI;
      }
    }
    uint8_t v_flags1 = 0;
    if ( ERR_NONE != si4432_read_register(SI443X_REG_INTERRUPT_STATUS_1, &v_flags1) ) {
      return ERR_SPI;
    }
    if ( 0 != (SI443X_CRC_ERROR_INTERRUPT & v_flags1) ) {
      return ERR_RX_CRC;
    }
    if ( 0 != (SI443X_VALID_PACKET_RECEIVED_INTERRUPT & v_flags1) ) {
      break;
    }
  }
  
  // читаем данные пакета
  if ( ERR_NONE != si4432_read_data( a_dst ) ) {
    return ERR_SPI;
  }

  // очистка флагов событий
  si4432_clear_irq_flags();

  return ERR_NONE;
}


// начать отправку пакета len байтов
int si4432_start_transmit( uint8_t* data, uint32_t len ) {
  if (
    // очистить очередь на отправку
       ERR_NONE == si4432_set_reg_value(SI443X_REG_OP_FUNC_CONTROL_2, SI443X_TX_FIFO_RESET, 0, 0)
    && ERR_NONE == si4432_set_reg_value(SI443X_REG_OP_FUNC_CONTROL_2, SI443X_TX_FIFO_CLEAR, 0, 0)

    // установить размер пакета
    && ERR_NONE == si4432_write_register(SI443X_REG_TRANSMIT_PACKET_LENGTH, len)

    // записать пакет в очередь на отправку
    && ERR_NONE == si4432_write_FIFO(data, len)

    // включить событие по завершению отправки пакета
    && ERR_NONE == si4432_write_register(SI443X_REG_INTERRUPT_ENABLE_1, SI443X_PACKET_SENT_ENABLED)
    && ERR_NONE == si4432_write_register(SI443X_REG_INTERRUPT_ENABLE_2, 0)

    // очистить флаги событий
    && ERR_NONE == si4432_clear_irq_flags()

    // включить режим передачи
    && ERR_NONE == si4432_write_register(SI443X_REG_OP_FUNC_CONTROL_1, SI443X_TX_ON | SI443X_XTAL_ON)
    ) {
    return ERR_NONE;
  } else {
    return ERR_SPI;
  }
}


// отправить пакет размером a_len байтов
int si4432_transmit( uint8_t* a_src, uint32_t a_len ) {
  if ( a_len > RM_MAX_PACKET_SIZE ) {
    return ERR_TOO_LONG_PACKET;
  }
  // вычисляем 200% от длительности отправки пакет в миллисекундах
  // количество байтов пакета умножаем на 8 - это количество битов
  // затем количество битов умножаем на 1000 (так как нас интересуют миллисекунды)
  // затем умножаем на 2 (чтобы получить 200%)
  // прибавляем половину от RM_BIT_RATE для округления в большую сторону
  // и наконец делим на скорость передачи, выраженную в битах в секунду
  unsigned int v_timeout = (
        (a_len + (RM_PREAMBLE_BYTES + RM_HEADER_BYTES + RM_SYNC_BYTES + RM_VARIABLE_LENGTH + RM_CRC_BYTES))
      * ((1 << RM_MANCHESTER_ENABLED) * 8 * 1000 * 2)
      + (RM_BIT_RATE / 2)
      ) / RM_BIT_RATE
      ;
  // минимальный таймаут
  if ( v_timeout < 5 ) {
    v_timeout = 5;
  }

  // запускаем передачу пакета
  if ( ERR_NONE != si4432_start_transmit( a_src, a_len ) ) {
    return ERR_SPI;
  }

  // ждём завершения передачи либо пока не закончится отведённое время
  // по завершении предачи трансивер выставит лог. 0 для сигнала nIRQ
  uint32_t v_from = g_milliseconds;
  while( 0 != (GPIO_1->SET & GPIO_PIN_M(SI4432_INT_PIN)) ) {
    if( (g_milliseconds - v_from) >= v_timeout ) {
      si4432_clear_irq_flags();
      return ERR_TX_TIMEOUT;
    } else {
      delay_ms( 1 );
    }
  }

  // зачистить флаги событий
  si4432_clear_irq_flags();

  // перезаписать некоторые регистры (согласно руководству по эксплуатации трансивера)
  si4432_apply_register_settings( g_registers_after_send );

  return ERR_NONE;
}
