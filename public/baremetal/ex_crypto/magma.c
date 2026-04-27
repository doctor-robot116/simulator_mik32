// ------------------------------------------------------------------------------
// Код написан по https://ru.wikipedia.org/wiki/%D0%93%D0%9E%D0%A1%D0%A2_28147-89
// Так как информация по агоритму общедоступна, то данную реализацию (написанную
// с "нуля") можно использовать абсолютно в любых целях. Естественно, никаких
// гарантий, ответственности и прочей чепухи не прилагается, а для проверки
// корректности работы существуют тесты.
// ------------------------------------------------------------------------------


#include "magma.h"

#include <string.h>
#include <endian.h>
#include <stdbool.h>


// узлы замены id-tc26-gost-28147-param-Z
// ГОСТ Р 34.12-2015, ГОСТ 34.12-2018, RFC 7836
// подставив другой набор для узлов замены можно получить другой вариант шифра
static const uint8_t S_blocks[8][16] = {
  {12, 4, 6, 2, 10, 5, 11, 9, 14, 8, 13, 7, 0, 3, 15, 1}
, {6, 8, 2, 3, 9, 10, 5, 12, 1, 14, 4, 7, 11, 13, 0, 15}
, {11, 3, 5, 8, 2, 15, 10, 13, 14, 1, 7, 4, 12, 9, 6, 0}
, {12, 8, 2, 1, 13, 4, 15, 6, 7, 0, 10, 5, 3, 14, 9, 11}
, {7, 15, 5, 10, 8, 1, 6, 13, 0, 9, 3, 14, 11, 4, 2, 12}
, {5, 13, 15, 6, 9, 2, 12, 10, 11, 7, 8, 1, 4, 3, 14, 0}
, {8, 14, 2, 5, 6, 9, 1, 12, 15, 4, 11, 0, 13, 10, 3, 7}
, {1, 7, 14, 13, 0, 5, 8, 3, 4, 15, 10, 6, 9, 12, 11, 2}
};


// пропустить каждую группу из 4 битов a_src через соответствующий узел подстановки
// можно ускорить, разместив в таблице подстановки не группы из 4 битов на фиксированном
// месте, а группы из 4 битов на своём месте, тогда 7 сдвигов влево для строк с 1 по 7
// нужны не будут
static uint32_t magma_f( uint32_t a_src ) {
  return S_blocks[0][a_src & 0xF]
      | (S_blocks[1][(a_src >>  4) & 0xF] <<  4)
      | (S_blocks[2][(a_src >>  8) & 0xF] <<  8)
      | (S_blocks[3][(a_src >> 12) & 0xF] << 12)
      | (S_blocks[4][(a_src >> 16) & 0xF] << 16)
      | (S_blocks[5][(a_src >> 20) & 0xF] << 20)
      | (S_blocks[6][(a_src >> 24) & 0xF] << 24)
      | (S_blocks[7][(a_src >> 28) & 0xF] << 28)
      ;
};


// реализация функции обработки одной половины блока
static uint32_t magma_g( uint32_t a_in, uint32_t a_rkey ) {
  uint32_t r = magma_f(a_in + a_rkey);
  return ((r & 0xFFE00000) >> 21) | (r << 11);
}


#ifdef __cplusplus
extern "C" {
#endif

// "развернуть" ключ
void magma_make_round_keys( magma_key_t * a_src, magma_round_key_t * a_dst ) {
  for ( int i = 0; i < MAGMA_KEY_WORDS; ++i ) {
    a_dst->m_u32[i] =
    a_dst->m_u32[i + MAGMA_KEY_WORDS] =
    a_dst->m_u32[i + MAGMA_KEY_WORDS * 2] =
    a_dst->m_u32[(MAGMA_RKEY_WORDS - 1) - i] = a_src->m_u32[i];
  }
}


// реализация "раундов" обработки блока
// a_encrypt: true - шифрование, false - дешифрование
void magma_block_rounds( magma_round_key_t * a_rkey, magma_block_t * a_in, magma_block_t * a_out, bool a_encrypt ) {
  *a_out = *a_in;
  for ( int i = 0; i < MAGMA_RKEY_WORDS; ++i ) {
    // запоминаем вторую половину блока
    uint32_t Bnext = a_out->m_u32[1];
    // слово ключа, соответствующее данному "раунду"
    uint32_t Kword = htobe32(a_encrypt ? a_rkey->m_u32[i] : a_rkey->m_u32[MAGMA_RKEY_WORDS - 1 - i]);
    // обработка второй половины блока
    uint32_t g = magma_g(htobe32(a_out->m_u32[1]), Kword);
    // результат для второй половины блока
    a_out->m_u32[1] = be32toh(htobe32(a_out->m_u32[0]) ^ g);
    // результат для первой половины блока
    a_out->m_u32[0] = Bnext;
  }
  // перестановка половин блока
  uint32_t t = a_out->m_u32[1];
  a_out->m_u32[1] = a_out->m_u32[0];
  a_out->m_u32[0] = t;
}

#ifdef __cplusplus
}
#endif


/* код для тестирования

#include <stdio.h>

static const char MAGMA_CRYPTO_TEXT[] = {
  0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
};

static const char MAGMA_CRYPTO_KEY[] = {
		0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, 0x00,
		0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff,
};

static const char MAGMA_CRYPTED_TEXT[] = {
  0x4e, 0xe9, 0x01, 0xe5, 0xc2, 0xd8, 0xca, 0x3d
};


void logBufferInHex(const uint8_t *src, int len);

int main(int, char **) {
  magma_key_t v_key;
  magma_round_key_t v_rkey;
  magma_block_t v_in, v_out;
  
  memcpy( v_key.m_u8, MAGMA_CRYPTO_KEY, sizeof(MAGMA_CRYPTO_KEY) );
  memcpy( v_in.m_u8, MAGMA_CRYPTO_TEXT, sizeof(MAGMA_CRYPTO_TEXT) );
  bzero( v_out.m_u8, sizeof(v_out.m_u8) );
  
  printf( "from:\n" );
  logBufferInHex( v_in.m_u8, sizeof(v_in.m_u8) );
  magma_make_round_keys( &v_key, &v_rkey );
  magma_block_rounds( &v_rkey, &v_in, &v_out, true );
  printf( "result:\n" );
  logBufferInHex( v_out.m_u8, sizeof(v_out.m_u8) );
  printf( "cmp = %s\n", 0 == memcmp(v_out.m_u8, MAGMA_CRYPTED_TEXT, sizeof(MAGMA_CRYPTED_TEXT)) ? "OK" : "ERROR" );
  
  memcpy( v_in.m_u8, v_out.m_u8, sizeof(v_in.m_u8) );
  bzero( v_out.m_u8, sizeof(v_out.m_u8) );
  
  printf( "from:\n" );
  logBufferInHex( v_in.m_u8, sizeof(v_in.m_u8) );
  magma_block_rounds( &v_rkey, &v_in, &v_out, false );
  printf( "result:\n" );
  logBufferInHex( v_out.m_u8, sizeof(v_out.m_u8) );
  printf( "cmp = %s\n", 0 == memcmp(v_out.m_u8, MAGMA_CRYPTO_TEXT, sizeof(MAGMA_CRYPTO_TEXT)) ? "OK" : "ERROR" );
  
  
  
  return 0;
}


void logBufferInHex(const uint8_t *src, int len) {
  int i, c, k;
  char ln[96];
  char *ucPtr;

  while (len) {
    // start line pointer
    ucPtr = ln;
    // first send address
    for (i = 28; i >= 0; i -= 4) {
      c = (((unsigned int)src) >> i) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    // send 16 or less hex bytes
    for (i = 0; i < 16 && len > 0; i++, len--) {
      //
      *ucPtr++ = ' ';
      //
      c = (*src >> 4) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
      c = (*src++) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    for (k = i; k < 16; ++k) {
      //
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
    }
    //
    *ucPtr++ = ' ';
    // send bytes as symbols
    for (; i > 0; i--) {
      //
      c = *(src - i);
      //
      *ucPtr++ = (c >= 0x20 && c <= 0x7F) ? c : '.';
    }
    // make eol
    // *ucPtr++ = 0x0D;
    // *ucPtr++ = 0x0A;
    *ucPtr = 0x00;
    // send to remote
    printf( "%s\n", ln );
  }
}
*/
