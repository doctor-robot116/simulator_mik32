// log_buffer_hex
#ifndef __LOG_BUFFER_HEX_H__
#define __LOG_BUFFER_HEX_H__

#include <stdint.h>


#ifdef __cplusplus
extern "C" {
#endif

// вывод через printf() буфера в шестнадцатиричном виде с форматированием вида
// адрес 16_байтов_в_HEX_виде 16_печатных_символов
void log_buffer_hex( const uint8_t *src, int len );

#ifdef __cplusplus
}
#endif


#endif // __LOG_BUFFER_HEX_H__
