#ifndef _STDIO_H
#define _STDIO_H

#include <stddef.h>
#include <stdarg.h>


#define EOF   -1

#ifdef __cplusplus
extern "C" {
#endif
  
signed int snprintf(char *pString, size_t length, const char *pFormat, ...);
signed int printf(const char *pFormat, ...);

#ifdef __cplusplus
} // extern "C"
#endif


#endif // _STDIO_H
