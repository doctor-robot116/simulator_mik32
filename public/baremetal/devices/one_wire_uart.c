#include "one_wire_uart.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>


#ifdef __cplusplus
extern "C" {
#endif

static const uint8_t onewire_crc8_table[256] = {
      0,  94, 188, 226,  97,  63, 221, 131, 194, 156, 126,  32, 163, 253,  31,  65
  , 157, 195,  33, 127, 252, 162,  64,  30,  95,   1, 227, 189,  62,  96, 130, 220
  ,  35, 125, 159, 193,  66,  28, 254, 160, 225, 191,  93,   3, 128, 222,  60,  98
  , 190, 224,   2,  92, 223, 129,  99,  61, 124,  34, 192, 158,  29,  67, 161, 255
  ,  70,  24, 250, 164,  39, 121, 155, 197, 132, 218,  56, 102, 229, 187,  89,   7
  , 219, 133, 103,  57, 186, 228,   6,  88,  25,  71, 165, 251, 120,  38, 196, 154
  , 101,  59, 217, 135,   4,  90, 184, 230, 167, 249,  27,  69, 198, 152, 122,  36
  , 248, 166,  68,  26, 153, 199,  37, 123,  58, 100, 134, 216,  91,   5, 231, 185
  , 140, 210,  48, 110, 237, 179,  81,  15,  78,  16, 242, 172,  47, 113, 147, 205
  ,  17,  79, 173, 243, 112,  46, 204, 146, 211, 141, 111,  49, 178, 236,  14,  80
  , 175, 241,  19,  77, 206, 144, 114,  44, 109,  51, 209, 143,  12,  82, 176, 238
  ,  50, 108, 142, 208,  83,  13, 239, 177, 240, 174,  76,  18, 145, 207,  45, 115
  , 202, 148, 118,  40, 171, 245,  23,  73,   8,  86, 180, 234, 105,  55, 213, 139
  ,  87,   9, 235, 181,  54, 104, 138, 212, 149, 203,  41, 119, 244, 170,  72,  22
  , 233, 183,  85,  11, 136, 214,  52, 106,  43, 117, 151, 201,  74,  20, 246, 168
  , 116,  42, 200, 150,  21,  75, 169, 247, 182, 232,  10,  84, 215, 137, 107,  53
};


// непрерывный счётчик миллисекунд
extern volatile uint32_t g_milliseconds;
// где-нибудь должна быть определена функция задержки
void delay_ms( uint32_t a_ms );


// подсчёт CRC8, см.
// Application Note 27
// Understanding and Using Cyclic
// Redundancy Checks with Dallas
// Semiconductor iButtonTM Products
uint8_t onewire_crc8( uint8_t * a_src, int a_src_len ) {
  uint8_t v_crc8 = 0;
  for ( int i = 0; i < a_src_len; ++i ) {
    v_crc8 = onewire_crc8_table[v_crc8 ^ *a_src++];
  }
  return v_crc8;
}


// где-то выше должна быть определена переменная uint32_t MIK32_APBP_CLOCK - частота шины APB-P в Гц
static void uart1_set_speed( UART_TypeDef * a_uart, uint32_t a_speed ) {
  // выключаем UART
  a_uart->CONTROL1 &= ~UART_CONTROL1_UE_M;
  // переключаем на скорость
  a_uart->DIVIDER = MIK32_APBP_CLOCK / a_speed;
  // включаем UART
  a_uart->CONTROL1 |= UART_CONTROL1_UE_M;
  // ждём готовности
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_TEACK_M) ) {}
}


// прочитать один бит с шины 1-wire, если прочиталось 0 - вернётся false, иначе true
bool onewire_read_bit( UART_TypeDef * a_uart ) {
  uint32_t v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_TXE_M) ) {
    if ( (g_milliseconds - v_from) >= 2 ) {
      // в случае таймаута тупо вернём 1
      return true;
    }
  }
  a_uart->TXDATA = 0xFF;
  v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_RXNE_M) ) {
    if ( (g_milliseconds - v_from) >= 2 ) {
      // в случае таймаута тупо вернём 1
      return true;
    }
  }
  return 0xFF == a_uart->RXDATA;
}


// передать один бит в шину 1-wire (0 - false, 1 - true)
void onewire_write_bit( UART_TypeDef * a_uart, bool a_bit ) {
  uint32_t v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_TXE_M) ) {
    if ( (g_milliseconds - v_from) >= 2 ) {
      // дольше ждать смысла нет
      return;
    }
  }
  a_uart->TXDATA = a_bit ? 0xFF : 0x00;
  v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_RXNE_M) ) {
    if ( (g_milliseconds - v_from) >= 2 ) {
      // дольше ждать смысла нет
      return;
    }
  }
  a_uart->RXDATA;
}


// передать байт на шину 1-wire
void onewire_write_byte( UART_TypeDef * a_uart, uint8_t a_byte ) {
  for ( int i = 0; i < 8; ++i ) {
    onewire_write_bit( a_uart, 0 != ( a_byte & 1 ) );
    a_byte >>= 1;
  }
}


// передать указанное количество байтов в шину 1-wire
void onewire_write_bytes( UART_TypeDef * a_uart, const uint8_t * a_bytes, int a_bytes_count ) {
  while ( a_bytes_count-- > 0 ) {
    onewire_write_byte( a_uart, *a_bytes++ );
  }
}


// прочитать байт с шины 1-wire
uint8_t onewire_read_byte( UART_TypeDef * a_uart ) {
  uint8_t v_byte = 0;
  for ( int i = 0; i < 8; ++ i ) {
    v_byte >>= 1;
    if ( onewire_read_bit( a_uart ) ) {
      v_byte |= 0x80;
    }
  }
  return v_byte;
}


// прочитать указанное количество байтов с шины 1-wire
void onewire_read_bytes( UART_TypeDef * a_uart, uint8_t * a_bytes, int a_bytes_count ) {
  while ( a_bytes_count-- > 0 ) {
    *a_bytes++ = onewire_read_byte( a_uart );
  }
}


// выдать импульс сброса и получить признак наличия устройств на шине
bool onewire_device_present( UART_TypeDef * a_uart ) {
  // устанавливаем временнЫе параметры для "сброса"
  uart1_set_speed( a_uart, 9600 );
  // ждём готовности передатчика принять данные
  uint32_t v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_TXE_M) ) {
    if ( (g_milliseconds - v_from) >= 5 ) {
      // что-то не так
      return false;
    }
  }
  // выдём сигнал сброса (стартовый бит и младшие 4 бита обеспечивают притяжку к "земле" на 520 мкс
  // старшие 4 бита "отпускают" шину, за это время ожидается сигнал "присутствия" от устройств на шине
  a_uart->TXDATA = 0xF0;
  // ждём готовности прочитанных данных
  v_from = g_milliseconds;
  while ( 0 == (a_uart->FLAGS & UART_FLAGS_RXNE_M) ) {
    if ( (g_milliseconds - v_from) >= 5 ) {
      // что-то пошло не так
      return false;
    }
  }
  // читаем, в 4 младших битах будут нули, а вот старшие при наличии устройств на шине
  // будут отличаться от F
  uint8_t v_rx = a_uart->RXDATA;
  // устанавливаем "времянки" для побитового обмена
  uart1_set_speed( a_uart, 115200 );
  // небольшая задержка
  delay_ms( 2u );
  // вернём флаг наличия устройств на шине
  return 0xF0 != v_rx;
}


// ожидать, пока подключено устройство с адресом a_ID
void onewire_wait_release( UART_TypeDef * a_uart, uint64_t a_ID ) {
  for (;;) {
    if ( !onewire_device_present( a_uart ) ) {
      delay_ms( 100u );
      if ( !onewire_device_present( a_uart ) ) {
        return;
      }
    }
    onewire_write_byte( a_uart, 0x33 );
    uint64_t v_addr = 0;
    onewire_read_bytes( a_uart, (uint8_t *)&v_addr, sizeof(v_addr) );
    if ( onewire_crc8( (uint8_t *)&v_addr, 7 ) != (uint8_t)(v_addr >> 56) ) {
      return;
    }
    if ( 0 != memcmp( (uint8_t *)&a_ID, (uint8_t *)&v_addr, sizeof(a_ID) ) ) {
      return;
    }
  }
}



#include "one_wire_uart_enumerate.h"


static const onewire_family_code_s g_family_codes[] = {
  { 0x01, "DS1990A, DS1990R, DS2401, DS2411", "Serial number" }
, { 0x02, "DS1991", "1152b Secure memory" }
, { 0x04, "DS2404", "EconoRAM time chip" }
, { 0x05, "DS2405", "Addressable switch" }
, { 0x06, "DS1993", "4kb Memory button" }
, { 0x08, "DS1992", "1kb memory button" }
, { 0x0A, "DS1995", "16kb memory button" }
, { 0x0B, "DS1985, DS2505", "16kb add-only memory" }
, { 0x0C, "DS1996", "64kb memory button" }
, { 0x0F, "DS1986, DS2506", "64kb add-only memory" }
, { 0x10, "DS18S20", "Temperature sensor" }
, { 0x12, "DS2406, DS2407", "Dual addressable switch" }
, { 0x14, "DS1971, DS2430A", "256b EEPROM" }
, { 0x16, "DS1954, DS1957", "Coprocessor ibutton" }
, { 0x18, "DS1962, DS1963S", "4kb monetary device with SHA" }
, { 0x1A, "DS1963L", "4kb monetary device" }
, { 0x1B, "DS2436", "Battery ID/monitor" }
, { 0x1C, "DS28E04-100", "4kb EEPROM with PIO" }
, { 0x1D, "DS2423", "4kb 1Wire RAM with counter" }
, { 0x1E, "DS2437", "Smart battery monitor IC" }
, { 0x1F, "DS2409", "Microlan coupler" }
, { 0x20, "DS2450", "Quad ADC" }
, { 0x21, "DS1921G, DS1921H, DS1921Z", "Thermochron loggers" }
, { 0x22, "DS1822", "Econo digital thermometer" }
, { 0x23, "DS1973, DS2433", "4kb EEPROM" }
, { 0x24, "DS2415", "Time chip" }
, { 0x26, "DS2438", "Smart battery monitor" }
, { 0x27, "DS2417", "Time chip" }
, { 0x28, "DS18B20", "Temperature sensor" }
, { 0x29, "DS2408", "8-channel switch" }
, { 0x2C, "DS2890", "Digital potentiometer" }
, { 0x2D, "DS1972, DS2431", "1024b memory" }
, { 0x2E, "DS2770", "Battery monitor/charge controller" }
, { 0x30, "DS2760", "Precision li+ battery monitor" }
, { 0x31, "DS2720", "Single cell li+ protection IC" }
, { 0x32, "DS2780", "Fuel gauge IC" }
, { 0x33, "DS1961S, DS2432", "1kb memory with SHA" }
, { 0x34, "DS2703", "SHA battery authentication" }
, { 0x35, "DS2755", "Fuel gauge" }
, { 0x36, "DS2740", "Coulomb counter" }
, { 0x37, "DS1977", "32kb memory" }
, { 0x3D, "DS2781", "Fuel gauge IC" }
, { 0x3A, "DS2413", "Two-channel switch" }
, { 0x3B, "DS1825, MAX31826, MAX31850", "Temperature sensor, TC reader" }
, { 0x41, "DS1923, DS1922E, DS1922L, DS1922T", "Hygrochrons" }
, { 0x42, "DS28EA00", "Digital thermometer with sequence detect" }
, { 0x43, "DS28EC20", "20kb memory" }
, { 0x44, "DS28E10", "SHA1 authenticator" }
, { 0x51, "DS2751", "Battery fuel gauge" }
, { 0x7E, "EDS00xx", "EDS sensor adapter" }
, { 0x81, "USBID, DS1420", "ID" }
, { 0x82, "DS1425", "ID and pw protected RAM" }
, { 0xA0, "mRS001", "-" }
, { 0xA1, "mVM0011", "-" }
, { 0xA2, "mCM001", "-" }
, { 0xA6, "mTS017", "-" }
, { 0xB1, "mTC001", "-" }
, { 0xB2, "mAM001", "-" }
, { 0xB3, "mTC002", "-" }
, { 0xEE, "mTC002", "-" }
, { 0xEF, "Moisture Hub", "-" }
, { 0xF0, "MOAT", "Custom microcontroller slave" }
, { 0xFC, "BAE0910, BAE0911", "-" }
, { 0xFF, "Swart LCD", "-" }
};


// функция сравнения двух записей onewire_family_code_s по коду семейства
static int onewire_cmp_two_records( const void * a1, const void * a2 ) {
  return ((int)((onewire_family_code_s *)a1)->m_family_code) - ((int)((onewire_family_code_s *)a2)->m_family_code);
}


// получить информацию по коду семейства
const char * onewire_device_name_by_family( uint8_t a_family, const char ** a_comment ) {
  // ключ для поиска
  onewire_family_code_s v_key;
  v_key.m_family_code = a_family;
  // ищем
  const onewire_family_code_s * v_ptr = bsearch(
              &v_key
            , g_family_codes
            , sizeof(g_family_codes)/sizeof(g_family_codes[0])
            , sizeof(g_family_codes[0])
            , onewire_cmp_two_records
            );
  // проверим результат поиска
  if ( v_ptr ) {
    // нашли
    if ( a_comment ) {
      *a_comment = v_ptr->m_comment;
    }
    return v_ptr->m_chips;
  } else {
    // не нашли - ответ всегда один - "не знаю"
    if ( a_comment ) {
      *a_comment = "-";
    }
    return "Unknown";
  }
}


#ifdef __cplusplus
}
#endif
