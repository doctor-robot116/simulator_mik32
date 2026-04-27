#ifndef __CRC16_CCIT_H__
#define __CRC16_CCIT_H__

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

uint16_t crc16_xmodem( const uint8_t * a_buf, int a_buf_len );

#ifdef __cplusplus
}
#endif


#endif // __CRC16_CCIT_H__
