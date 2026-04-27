#ifndef _ZIC_UTILS_H_
#define _ZIC_UTILS_H_

#include <stdint.h>
#include <stdbool.h>

#define TARGET_IS_5_6_5

#ifdef __cplusplus
extern "C" {
#endif

struct zic_decompress_state_s {
  const uint8_t * m_src;
  int m_src_len;
  uint8_t * m_row_ptr;
  int m_rows_count;
  int m_cols_count;
  int m_current_count;
  uint32_t m_next_lru;
  uint16_t m_color_table[64];
  uint32_t m_lru[64];
  uint16_t m_last_color;
};


int zic_compress( const uint16_t * a_src, int a_src_len, uint8_t * a_row, int a_rows_count );
void zic_decompress_init( const uint8_t * a_src, int a_src_len, uint8_t * a_row, int a_cols_count, int a_rows_count, struct zic_decompress_state_s * a_state );
bool zic_decompress_row( struct zic_decompress_state_s * a_state );

#ifdef __cplusplus
}
#endif


#endif
