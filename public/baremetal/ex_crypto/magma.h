#ifndef __MAGMA_H__
#define __MAGMA_H__

#include <stdint.h>
#include <stdbool.h>

#define MAGMA_BLOCK_WORDS     2
#define MAGMA_KEY_WORDS       8
#define MAGMA_RKEY_WORDS      32


#ifdef __cplusplus
extern "C" {
#endif

typedef union {
  uint32_t m_u32[MAGMA_BLOCK_WORDS];
  uint8_t m_u8[MAGMA_BLOCK_WORDS*sizeof(uint32_t)];
} magma_block_t;

#define MAGMA_BLOCK_SIZE  ((int)sizeof(magma_block_t))

typedef union {
  uint32_t m_u32[MAGMA_KEY_WORDS];
  uint8_t m_u8[MAGMA_KEY_WORDS*sizeof(uint32_t)];
} magma_key_t;


typedef union {
  uint32_t m_u32[MAGMA_RKEY_WORDS];
  uint8_t m_u8[MAGMA_RKEY_WORDS*sizeof(uint32_t)];
} magma_round_key_t;


// "развернуть" ключ
void magma_make_round_keys( magma_key_t * a_src, magma_round_key_t * a_dst );
// обработка блока
void magma_block_rounds( magma_round_key_t * a_rkey, magma_block_t * a_in, magma_block_t * a_out, bool a_encrypt );

#ifdef __cplusplus
}
#endif


#endif // __MAGMA_H__
