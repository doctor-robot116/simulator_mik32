#ifndef	_STRING_H
#define _STRING_H

#include <stdint.h>
#include <stddef.h>


#ifdef __cplusplus
extern "C" {
#endif

void * memset( void * dest, int c, size_t n );
void *memcpy(void * dest, const void * src, size_t n);
void bzero( void * s, size_t n );
char *strstr(const char *h, const char *n);
void *memmem(const void *h0, size_t k, const void *n0, size_t l);
int memcmp(const void *vl, const void *vr, size_t n);
void *memchr(const void *src, int c, size_t n);
char *strchr(const char *s, int c);
char *strchrnul(const char *s, int c);
size_t strnlen(const char *s, size_t n);
size_t strlen(const char *s);
size_t strcspn(const char *s, const char *c);
char *strsep(char **str, const char *sep);
int strcmp(const char *l, const char *r);
int strncmp(const char *_l, const char *_r, size_t n);

#ifdef __cplusplus
}
#endif


#endif
