//
#include "zic_utils.h"

#include <string.h>


static bool update_color( uint16_t a_color, uint16_t * a_color_table, uint32_t * a_lru, int * a_color_idx, uint32_t a_next_lru ) {
  int v_min_idx = 0;
  int v_color_idx = *a_color_idx;
  uint32_t v_min_value = 0xFFFFFFFF;
  
  for ( v_color_idx = 0; v_color_idx < 64; ++v_color_idx ) {
    if ( a_color_table[v_color_idx] == a_color ) {
      a_lru[v_color_idx] = a_next_lru;
      *a_color_idx = v_color_idx;
      return true;
    } else {
      if ( a_lru[v_color_idx] < v_min_value ) {
        v_min_idx = v_color_idx;
        v_min_value = a_lru[v_color_idx];
      }
    }
  }
  a_color_table[v_min_idx] = a_color;
  a_lru[v_min_idx] = a_next_lru;
  v_color_idx = v_min_idx;
  
  *a_color_idx = v_color_idx;
  return false;
}

int zic_compress( const uint16_t * a_src, int a_src_len, uint8_t * a_dst, int a_dst_len ) {
  uint16_t v_color_table[64];
  uint32_t v_lru[64];
  uint32_t v_next_lru = 0;
  
  memset( v_color_table, 0, sizeof(v_color_table) );
  memset( v_lru, 0, sizeof(v_lru) );
  
  int v_result = 0;
  int v_src_idx = 0;
  uint16_t v_last_color = 0x8000;
  int v_last_color_idx = -1;
  int v_last_color_count = -1;
  
  while ( a_src_len-- ) {
    // read as BE
    uint16_t v_color = a_src[v_src_idx++];
    v_color = (v_color >> 8) | ((v_color & 0xFF) << 8);
    
    if ( v_color == v_last_color ) {
      if ( ++v_last_color_count >= 63 ) {
        v_last_color_count = -1;
        // write out color counter
        if ( a_dst_len-- ) {
          *a_dst++ = 0xFF;
          ++v_result;
        } else {
          return 0;
        }
      }
    } else {
      if ( v_last_color_count >= 0 ) {
        // write out byte with count for last color
        if ( a_dst_len-- ) {
          *a_dst++ = 0xC0 | (uint8_t)v_last_color_count;
          ++v_result;
        } else {
          return 0;
        }
      }
      // check existing for new color
      if ( update_color( v_color, v_color_table, v_lru, &v_last_color_idx, ++v_next_lru ) ) {
        // color exists, write out ref to color
        if ( a_dst_len-- ) {
          *a_dst++ = 0x80 | (uint8_t)v_last_color_idx;
          ++v_result;
        } else {
          return 0;
        }
      } else {
        // color replace, write out color, BE format
        if ( a_dst_len-- >= 2 ) {
          *a_dst++ = (uint8_t)(v_color >> 8);
          *a_dst++ = (uint8_t)v_color;
          v_result += 2;
        } else {
          return 0;
        }
      }
      v_last_color = v_color;
      v_last_color_count = -1;
    }
  }
  if ( v_last_color_count >= 0 ) {
    // write out byte with count for last color
    if ( a_dst_len-- ) {
      *a_dst++ = 0xC0 | (uint8_t)v_last_color_count;
      ++v_result;
    } else {
      return 0;
    }
  }
  
  return v_result;
}


void zic_decompress_init( const uint8_t * a_src, int a_src_len, uint8_t * a_row, int a_cols_count, int a_rows_count, struct zic_decompress_state_s * a_state ) {
  a_state->m_src = a_src;
  a_state->m_src_len = a_src_len;
  a_state->m_row_ptr = a_row;
  a_state->m_cols_count = a_cols_count;
  a_state->m_rows_count = a_rows_count;
  a_state->m_next_lru = 0;
  a_state->m_last_color = 0x8000;
  a_state->m_current_count = 0;
  memset( a_state->m_color_table, 0, sizeof(a_state->m_color_table) );
  memset( a_state->m_lru, 0, sizeof(a_state->m_lru) );
}


bool zic_decompress_row( struct zic_decompress_state_s * a_state ) {
  uint8_t v_b;
  uint16_t v_color;
  int v_last_color_idx;
  int v_cols = 0;
  uint8_t * v_dst = a_state->m_row_ptr;

  // check counter, and continue with it as needed
  if ( a_state->m_current_count > 0 ) {
#ifdef TARGET_IS_5_6_5
    v_color = (a_state->m_last_color & 0x1F) | ((a_state->m_last_color & 0x7FE0) << 1);
    v_color = (v_color >> 8) | (((uint8_t)v_color) << 8);
#else
    v_color = (a_state->m_last_color >> 8) | (((uint8_t)a_state->m_last_color) << 8);
#endif
    for (; a_state->m_current_count > 0; --a_state->m_current_count ) {
      *((uint16_t *)v_dst) = v_color;
      v_dst += 2;
      if ( ++v_cols >= a_state->m_cols_count ) {
        --a_state->m_current_count;
        return true;
      }
    }
  }
  
  while ( v_cols < a_state->m_cols_count && a_state->m_src_len-- ) {
    v_b = *a_state->m_src++;
    if ( 0 == (v_b & 0x80) ) {
      // direct color, read as BE 16-bits
      if ( a_state->m_src_len-- ) {
        a_state->m_last_color = ((v_b & 0x7F) << 8) | *a_state->m_src++;
        update_color( a_state->m_last_color, a_state->m_color_table, a_state->m_lru, &v_last_color_idx, ++a_state->m_next_lru );
        // write out last color, BE format
#ifdef TARGET_IS_5_6_5
          v_color = (a_state->m_last_color & 0x1F) | ((a_state->m_last_color & 0x7FE0) << 1);
          *v_dst++ = (uint8_t)(v_color >> 8);
          *v_dst++ = (uint8_t)v_color;
#else
          *v_dst++ = (uint8_t)(a_state->m_last_color >> 8);
          *v_dst++ = (uint8_t)a_state->m_last_color;
#endif
          ++v_cols;
      } else {
        return false;
      }
    } else {
      // counter or ref
      if ( 0 == (v_b & 0x40) ) {
        // ref to idx
        v_color = a_state->m_color_table[v_b & 0x3F];
        if ( v_color != a_state->m_last_color ) {
          update_color( v_color, a_state->m_color_table, a_state->m_lru, &v_last_color_idx, ++a_state->m_next_lru );
          a_state->m_last_color = v_color;
        }
        // write out color, BE format
#ifdef TARGET_IS_5_6_5
          v_color = (a_state->m_last_color & 0x1F) | ((a_state->m_last_color & 0x7FE0) << 1);
          *v_dst++ = (uint8_t)(v_color >> 8);
          *v_dst++ = (uint8_t)v_color;
#else
          *v_dst++ = (uint8_t)(a_state->m_last_color >> 8);
          *v_dst++ = (uint8_t)a_state->m_last_color;
#endif
          ++v_cols;
      } else {
        // counter for last color
        a_state->m_current_count = (v_b & 0x3F) + 1;
#ifdef TARGET_IS_5_6_5
        v_color = (a_state->m_last_color & 0x1F) | ((a_state->m_last_color & 0x7FE0) << 1);
        v_color = (v_color >> 8) | (((uint8_t)v_color) << 8);
#else
        v_color = (a_state->m_last_color >> 8) | (((uint8_t)a_state->m_last_color) << 8);
#endif
        for ( ; a_state->m_current_count > 0; --a_state->m_current_count ) {
          // write out last color, BE format
          *((uint16_t *)v_dst) = v_color;
          v_dst += 2;
          if ( ++v_cols >= a_state->m_cols_count ) {
            --a_state->m_current_count;
            return true;
          }
        }
      }
    }
  }
  
  return true;
}
