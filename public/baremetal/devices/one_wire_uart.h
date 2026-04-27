#ifndef __MIK32_AMUR_SIMPLE_ONE_WIRE_UART_H__
#define __MIK32_AMUR_SIMPLE_ONE_WIRE_UART_H__

#include <mik32_hwlibs/uart.h>

#include <stdint.h>
#include <stdbool.h>


#ifdef __cplusplus
extern "C" {
#endif

extern uint32_t MIK32_APBP_CLOCK;

typedef struct {
  uint64_t m_ROM;
  int m_last_diff;
  bool m_found;
} onewire_enumerate_s;

typedef struct {
  uint8_t m_family_code;
  const char * m_chips;
  const char * m_comment;
} onewire_family_code_s;

#define ONEWIRE_CMD_MATCH_ROM   0x55
#define ONEWIRE_CMD_READ_ROM    0x33
#define ONEWIRE_CMD_SEARCH_ROM  0xF0
#define ONEWIRE_CMD_SKIP_ROM    0xCC

#define ONEWIRE_1820_CMD_CONVERT_T        0x44
#define ONEWIRE_1820_CMD_READ_SCRATCHPAD  0xBE
#define ONEWIRE_1820_CMD_READ_POWER_SUPLY 0xB4

// выдать импульс сброса и получить признак наличия устройств на шине
bool onewire_device_present( UART_TypeDef * );
// определить ID очередного устройства на шине 1-wire
bool onewire_enumerate_devices( UART_TypeDef *, onewire_enumerate_s *, bool );
// прочитать один бит с шины 1-wire, если прочиталось 0 - вернётся false, иначе true
bool onewire_read_bit( UART_TypeDef * );
//
uint8_t onewire_read_byte( UART_TypeDef * a_uart );
// передать один бит в шину 1-wire (0 - false, 1 - true)
void onewire_write_bit( UART_TypeDef *, bool );
// передать байт на шину 1-wire
void onewire_write_byte( UART_TypeDef *, uint8_t );
// crc8
uint8_t onewire_crc8( uint8_t *, int );
// информация по Family Code
const char * onewire_device_name_by_family( uint8_t, const char ** );
//
void onewire_write_bytes( UART_TypeDef *, const uint8_t *, int );
//
void onewire_read_bytes( UART_TypeDef *, uint8_t *, int );
//
void onewire_wait_release( UART_TypeDef *, uint64_t );


#ifdef __cplusplus
}
#endif



#endif // __MIK32_AMUR_SIMPLE_ONE_WIRE_UART_H__
