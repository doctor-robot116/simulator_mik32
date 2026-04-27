#ifndef _STDLIB_H
#define _STDLIB_H

#include <stddef.h>


#define min(a,b) (a<b?a:b)

#define HEAP_MAX_ELEMENT_SIZE   64

#ifdef __cplusplus
extern "C" {
#endif

void make_heap(void *, size_t, size_t, int (*)(const void *, const void *));
void sort_heap(void *, size_t, size_t, int (*)(const void *, const void *));
void * bsearch (const void *, const void *, size_t, size_t, int (*)(const void *, const void *));
void srand(unsigned);
int rand(void);

#ifdef __cplusplus
}
#endif


#endif // _STDLIB_H
