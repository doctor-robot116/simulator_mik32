#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>


#ifdef __cplusplus
extern "C" {
#endif

// прототип функции сравнения двух элементов "кучи"
// можно по классике вернуть -1, 0 1 для <, == и >
// а можно только -1 и 0 для < и >=
typedef int (*cmpfun)( const void *, const void * );


// обмен двух элементов в "куче", размер одного элемента HEAP_MAX_ELEMENT_SIZE
// если объекты - структуры, то лучше всего использовать указатели на них :)
static void swap_elements( void * a_1, void * a_2, size_t a_width ) {
	uint8_t v_swap_buf[HEAP_MAX_ELEMENT_SIZE];
	while ( 0 != a_width ) {
		size_t v_swap_len = sizeof(v_swap_buf) < a_width ? sizeof(v_swap_buf) : a_width;
		memcpy( v_swap_buf, a_1, v_swap_len );
		memcpy( a_1, a_2, v_swap_len );
		memcpy( a_2, v_swap_buf, v_swap_len );
		a_1 = a_1 + v_swap_len;
		a_2 = a_2 + v_swap_len;
		a_width -= v_swap_len;
	}
}


// "просеивание" элемента "кучи" "вниз"
static void heap_sift_down( size_t a_element_idx, size_t a_heap_size, void * a_base, size_t a_width, cmpfun a_cmp ) {
	for (;;) {
		size_t v_next_idx = a_element_idx * 2;
		if ( v_next_idx > a_heap_size ) {
			break;
		}
		void * v_next_ptr = a_base + ((v_next_idx - 1) * a_width);
		if ( (v_next_idx + 1) <= a_heap_size ) {
			if ( a_cmp( v_next_ptr, v_next_ptr + a_width ) < 0 ) {
				v_next_ptr += a_width;
				++v_next_idx;
			}
		}
		void * v_element_ptr = a_base + ((a_element_idx - 1) * a_width);
		if ( a_cmp( v_element_ptr, v_next_ptr ) < 0 ) {
			swap_elements( v_element_ptr, v_next_ptr, a_width );
		} else {
			break;
		}
		a_element_idx = v_next_idx;
	}
}


// сделать "кучу" ;) из массива
void make_heap( void * a_base, size_t a_nel, size_t a_width, cmpfun a_cmp  ) {
	for ( size_t i = a_nel / 2; i >= 1u; --i ) {
		heap_sift_down( i, a_nel, a_base, a_width, a_cmp );
	}
}


// отсортировать массив, имеющий свойства "кучи"
void sort_heap( void * a_base, size_t a_nel, size_t a_width, cmpfun a_cmp ) {
	for ( size_t i = a_nel; i >= 2u; --i ) {
		swap_elements( a_base, a_base + ((i - 1) * a_width), a_width );
		heap_sift_down( 1u, i - 1u, a_base, a_width, a_cmp );
	}
}

#ifdef __cplusplus
}
#endif
