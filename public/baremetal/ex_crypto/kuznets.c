// стырено в https://git.rekovalev.site/Crypto/C_Kuznechik_GOST_R_34.12-2015
// там указана MIT лицензия, но без указания года и "copyright holders"
// так что кому надо, может взять "рыбу" и вкорячить сюда

#include "kuznets.h"

#include <string.h>
#include <endian.h>
#include <stdbool.h>
#include <stdio.h>


// Таблица прямого нелинейного преобразования согластно ГОСТ 34.12-2015
static const uint8_t Pi[] = {
    0xFC, 0xEE, 0xDD, 0x11, 0xCF, 0x6E, 0x31, 0x16, 0xFB, 0xC4, 0xFA, 0xDA, 0x23, 0xC5, 0x04, 0x4D,
    0xE9, 0x77, 0xF0, 0xDB, 0x93, 0x2E, 0x99, 0xBA, 0x17, 0x36, 0xF1, 0xBB, 0x14, 0xCD, 0x5F, 0xC1,
    0xF9, 0x18, 0x65, 0x5A, 0xE2, 0x5C, 0xEF, 0x21, 0x81, 0x1C, 0x3C, 0x42, 0x8B, 0x01, 0x8E, 0x4F,
    0x05, 0x84, 0x02, 0xAE, 0xE3, 0x6A, 0x8F, 0xA0, 0x06, 0x0B, 0xED, 0x98, 0x7F, 0xD4, 0xD3, 0x1F,
    0xEB, 0x34, 0x2C, 0x51, 0xEA, 0xC8, 0x48, 0xAB, 0xF2, 0x2A, 0x68, 0xA2, 0xFD, 0x3A, 0xCE, 0xCC,
    0xB5, 0x70, 0x0E, 0x56, 0x08, 0x0C, 0x76, 0x12, 0xBF, 0x72, 0x13, 0x47, 0x9C, 0xB7, 0x5D, 0x87,
    0x15, 0xA1, 0x96, 0x29, 0x10, 0x7B, 0x9A, 0xC7, 0xF3, 0x91, 0x78, 0x6F, 0x9D, 0x9E, 0xB2, 0xB1,
    0x32, 0x75, 0x19, 0x3D, 0xFF, 0x35, 0x8A, 0x7E, 0x6D, 0x54, 0xC6, 0x80, 0xC3, 0xBD, 0x0D, 0x57,
    0xDF, 0xF5, 0x24, 0xA9, 0x3E, 0xA8, 0x43, 0xC9, 0xD7, 0x79, 0xD6, 0xF6, 0x7C, 0x22, 0xB9, 0x03,
    0xE0, 0x0F, 0xEC, 0xDE, 0x7A, 0x94, 0xB0, 0xBC, 0xDC, 0xE8, 0x28, 0x50, 0x4E, 0x33, 0x0A, 0x4A,
    0xA7, 0x97, 0x60, 0x73, 0x1E, 0x00, 0x62, 0x44, 0x1A, 0xB8, 0x38, 0x82, 0x64, 0x9F, 0x26, 0x41,
    0xAD, 0x45, 0x46, 0x92, 0x27, 0x5E, 0x55, 0x2F, 0x8C, 0xA3, 0xA5, 0x7D, 0x69, 0xD5, 0x95, 0x3B,
    0x07, 0x58, 0xB3, 0x40, 0x86, 0xAC, 0x1D, 0xF7, 0x30, 0x37, 0x6B, 0xE4, 0x88, 0xD9, 0xE7, 0x89,
    0xE1, 0x1B, 0x83, 0x49, 0x4C, 0x3F, 0xF8, 0xFE, 0x8D, 0x53, 0xAA, 0x90, 0xCA, 0xD8, 0x85, 0x61,
    0x20, 0x71, 0x67, 0xA4, 0x2D, 0x2B, 0x09, 0x5B, 0xCB, 0x9B, 0x25, 0xD0, 0xBE, 0xE5, 0x6C, 0x52,
    0x59, 0xA6, 0x74, 0xD2, 0xE6, 0xF4, 0xB4, 0xC0, 0xD1, 0x66, 0xAF, 0xC2, 0x39, 0x4B, 0x63, 0xB6
};

// Таблица обратного нелинейного преобразования
static const uint8_t Pi_reverse[] = {
    0xA5, 0x2D, 0x32, 0x8F, 0x0E, 0x30, 0x38, 0xC0, 0x54, 0xE6, 0x9E, 0x39, 0x55, 0x7E, 0x52, 0x91,
    0x64, 0x03, 0x57, 0x5A, 0x1C, 0x60, 0x07, 0x18, 0x21, 0x72, 0xA8, 0xD1, 0x29, 0xC6, 0xA4, 0x3F,
    0xE0, 0x27, 0x8D, 0x0C, 0x82, 0xEA, 0xAE, 0xB4, 0x9A, 0x63, 0x49, 0xE5, 0x42, 0xE4, 0x15, 0xB7,
    0xC8, 0x06, 0x70, 0x9D, 0x41, 0x75, 0x19, 0xC9, 0xAA, 0xFC, 0x4D, 0xBF, 0x2A, 0x73, 0x84, 0xD5,
    0xC3, 0xAF, 0x2B, 0x86, 0xA7, 0xB1, 0xB2, 0x5B, 0x46, 0xD3, 0x9F, 0xFD, 0xD4, 0x0F, 0x9C, 0x2F,
    0x9B, 0x43, 0xEF, 0xD9, 0x79, 0xB6, 0x53, 0x7F, 0xC1, 0xF0, 0x23, 0xE7, 0x25, 0x5E, 0xB5, 0x1E,
    0xA2, 0xDF, 0xA6, 0xFE, 0xAC, 0x22, 0xF9, 0xE2, 0x4A, 0xBC, 0x35, 0xCA, 0xEE, 0x78, 0x05, 0x6B,
    0x51, 0xE1, 0x59, 0xA3, 0xF2, 0x71, 0x56, 0x11, 0x6A, 0x89, 0x94, 0x65, 0x8C, 0xBB, 0x77, 0x3C,
    0x7B, 0x28, 0xAB, 0xD2, 0x31, 0xDE, 0xC4, 0x5F, 0xCC, 0xCF, 0x76, 0x2C, 0xB8, 0xD8, 0x2E, 0x36,
    0xDB, 0x69, 0xB3, 0x14, 0x95, 0xBE, 0x62, 0xA1, 0x3B, 0x16, 0x66, 0xE9, 0x5C, 0x6C, 0x6D, 0xAD,
    0x37, 0x61, 0x4B, 0xB9, 0xE3, 0xBA, 0xF1, 0xA0, 0x85, 0x83, 0xDA, 0x47, 0xC5, 0xB0, 0x33, 0xFA,
    0x96, 0x6F, 0x6E, 0xC2, 0xF6, 0x50, 0xFF, 0x5D, 0xA9, 0x8E, 0x17, 0x1B, 0x97, 0x7D, 0xEC, 0x58,
    0xF7, 0x1F, 0xFB, 0x7C, 0x09, 0x0D, 0x7A, 0x67, 0x45, 0x87, 0xDC, 0xE8, 0x4F, 0x1D, 0x4E, 0x04,
    0xEB, 0xF8, 0xF3, 0x3E, 0x3D, 0xBD, 0x8A, 0x88, 0xDD, 0xCD, 0x0B, 0x13, 0x98, 0x02, 0x93, 0x80,
    0x90, 0xD0, 0x24, 0x34, 0xCB, 0xED, 0xF4, 0xCE, 0x99, 0x10, 0x44, 0x40, 0x92, 0x3A, 0x01, 0x26,
    0x12, 0x1A, 0x48, 0x68, 0xF5, 0x81, 0x8B, 0xC7, 0xD6, 0x20, 0x0A, 0x08, 0x00, 0x4C, 0xD7, 0x74
};

// Вектор линейного преобразования
const uint8_t linear_vector[] = {
    0x94, 0x20, 0x85, 0x10, 0xC2, 0xC0, 0x01, 0xFB,
    0x01, 0xC0, 0xC2, 0x10, 0x85, 0x20, 0x94, 0x01
};

// Функция X 
void X(kuznets_chunk_t a, kuznets_chunk_t b, kuznets_chunk_t c) 
{
    c[0] = a[0] ^ b[0];
    c[1] = a[1] ^ b[1];
}

// Функция S
void S(kuznets_chunk_t in_out) 
{
    // Счетчик
    int i;
    // Переход к представлению в байтах
    uint8_t * byte = (uint8_t *)in_out;
    for (i = 0; i < KUZNECHIK_BLOCK_SIZE; i++) 
    {
        byte[i] = Pi[byte[i]];
    }
}

// Обратная функция S
void S_reverse(kuznets_chunk_t in_out) 
{
    // Счетчик
    int i;
    // Переход к представлению в байтах
    uint8_t * byte = (uint8_t *)in_out;
    for (i = 0; i < KUZNECHIK_BLOCK_SIZE; i++) 
    {
        byte[i] = Pi_reverse[byte[i]];
    }
}

// Функция умножения в поле Галуа
uint8_t GF_mult(uint8_t a, uint8_t b) 
{    
    uint8_t c;
    
    c = 0;
    while (b) 
    {        
        if (b & 1)
            c ^= a;
        a = (a << 1) ^ (a & 0x80 ? 0xC3 : 0x00);
        b >>= 1;
    }
        
    return c;
}

// Функция R
void R(uint8_t *in_out) 
{
    // Счетчик
    int i;
    // Аккумулятор
    uint8_t acc = in_out[15];
    // Переход к представлению в байтах
    uint8_t * byte = (uint8_t *)in_out;
    for (i = 14; i >= 0; i--) 
    {
        byte[i + 1] = byte[i];
        acc ^= GF_mult(byte[i], linear_vector[i]);
    }
    byte[0] = acc;
}

// Обратная функция R
void R_reverse(uint8_t *in_out) 
{
    // Аккумулятор
    uint8_t acc = in_out[0];
    // Переход к представлению в байтах
    uint8_t * byte = (uint8_t *)in_out;

    for (int i = 0; i < 15; i++) 
    {
        byte[i] = byte[i + 1];
        acc ^= GF_mult(byte[i], linear_vector[i]);
    }

    byte[15] = acc;
}

// Функция L
void L(uint8_t* in_out) 
{
    // Счетчик
    int i;
    for (i = 0; i < KUZNECHIK_BLOCK_SIZE; i++) 
        R(in_out);
}

// Обратная функция L
void L_reverse(uint8_t *in_out) 
{
    // Счетчик
    for (int i = 0; i < 16; i++)
        R_reverse(in_out);
}

// Генерация итерационных ключей
void kuznets_gen_round_keys(const uint8_t* key, kuznets_chunk_t* round_keys) 
{
    // Константы
    uint8_t cs[32][KUZNECHIK_BLOCK_SIZE] = {};

    // Генерация констант с помощью L-преобразования номера итерации
    for ( int i = 0; i < 32; ++i ) 
    {
        cs[i][15] = i + 1;
        L(cs[i]);
    }

    // Итерационные ключи (четный и нечетный)
    kuznets_chunk_t ks[2] = {};
    // Разместим ключ шифрования
    // результат = итерационный ключ = (преобразование к указателю на чанк)[номер чанка][часть чанка]
    round_keys[0][0] = ks[0][0] = ((kuznets_chunk_t*) key)[0][0];
    round_keys[0][1] = ks[0][1] = ((kuznets_chunk_t*) key)[0][1];
    round_keys[1][0] = ks[1][0] = ((kuznets_chunk_t*) key)[1][0];
    round_keys[1][1] = ks[1][1] = ((kuznets_chunk_t*) key)[1][1];

    // Генерация оставшихся ключей с использованием констант
    for ( int i = 1; i <= 32; ++i ) 
    {
        // Новый ключ
        kuznets_chunk_t new_key = {0};

        // Преобразование X
        // (void*) для избежания предупреждений о неверном типе, передаваемом в функцию
        X(ks[0], (void*)cs[i - 1], new_key);
        // Преобразование S
        S(new_key);
        // Преобразование L
        // (uint8_t*) для избежания предупреждений о неверном типе, передаваемом в функцию
        L((uint8_t*)&new_key);
        // Преобразование X
        X(new_key, ks[1], new_key);

        // Сдвигаем ключи
        ks[1][0] = ks[0][0];
        ks[1][1] = ks[0][1];

        // Записываем новый ключ
        ks[0][0] = new_key[0];
        ks[0][1] = new_key[1];

        // Каждую 8 итерацию сети Фейстеля за исключением нулевой запишем ключи
        if ((i > 0) && (i % 8 == 0)) 
        {
            round_keys[(i >> 2)][0] = ks[0][0];
            round_keys[(i >> 2)][1] = ks[0][1];

            round_keys[(i >> 2) + 1][0] = ks[1][0];
            round_keys[(i >> 2) + 1][1] = ks[1][1];
        }
    }
}

// Функция шифрования
// Поддерживает запись результата в исходный массив
void kuznets_encrypt(kuznets_chunk_t *round_keys, kuznets_chunk_t in, kuznets_chunk_t out) {
    // Буфер
    kuznets_chunk_t p;
    // Создадим копию входных данных
    memcpy(p, in, sizeof(kuznets_chunk_t));
    // В течении 10 итераций
    for ( int i = 0; i < 10; ++i ) 
    {
        // Преобразование X
        X(p, round_keys[i], p);
        // Для всех итераций кроме последней
        if (i < 9)
        {
            // Преобразование S
            S(p);
            // Преобразование L
            L((uint8_t*)&p);
        }
    }
    // Копируем полученный результат
    memcpy(out, p, sizeof(kuznets_chunk_t));
}

void kuznets_decrypt(kuznets_chunk_t *round_keys, kuznets_chunk_t in, kuznets_chunk_t out) {
    // Буфер
    kuznets_chunk_t p;
    // Создадим копию входных данных
    memcpy(p, in, sizeof(kuznets_chunk_t));

    // Преобразование X
    X(p, round_keys[9], p);
    for ( int i = 8; i >= 0; --i ) 
    {
        // Преобразование L
        L_reverse((uint8_t*)&p);
        // Преобразование S
        S_reverse(p);
        // Преобразование X
        X(p, round_keys[i], p);
    }
    // Копируем полученный результат
    memcpy(out, p, sizeof(kuznets_chunk_t));
}


typedef union {
  kuznets_chunk_t m_kch[2];
  uint32_t m_u32[8];
} kuznets_double_chunk_t;



// "порядок" полинома
#define GF_POLY_CHAR         128
// полином, BE порядок байтов x^128+x^7+x^2+x^1+x^0
kuznets_chunk_t g_gf_poly = {0, 0x8700000000000000ull};


void dc_shift_left( kuznets_double_chunk_t * a_dc ) {
  // 7
  uint32_t v_be32 = htobe32(a_dc->m_u32[7]);
  a_dc->m_u32[7] = be32toh(v_be32 << 1);
  uint32_t v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 6
  v_be32 = htobe32(a_dc->m_u32[6]);
  a_dc->m_u32[6] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 5
  v_be32 = htobe32(a_dc->m_u32[5]);
  a_dc->m_u32[5] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 4
  v_be32 = htobe32(a_dc->m_u32[4]);
  a_dc->m_u32[4] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 3
  v_be32 = htobe32(a_dc->m_u32[3]);
  a_dc->m_u32[3] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 2
  v_be32 = htobe32(a_dc->m_u32[2]);
  a_dc->m_u32[2] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 1
  v_be32 = htobe32(a_dc->m_u32[1]);
  a_dc->m_u32[1] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
  // 0
  v_be32 = htobe32(a_dc->m_u32[0]);
  a_dc->m_u32[0] = be32toh((v_be32 << 1) | v_carry);
  v_carry = (0 != (v_be32 & 0x80000000)) ? 1u : 0u;
}


void dc_shift_right( kuznets_double_chunk_t * a_dc ) {
  // 0
  uint32_t v_be32 = htobe32(a_dc->m_u32[0]);
  a_dc->m_u32[0] = be32toh(v_be32 >> 1);
  uint32_t v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 1
  v_be32 = htobe32(a_dc->m_u32[1]);
  a_dc->m_u32[1] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 2
  v_be32 = htobe32(a_dc->m_u32[2]);
  a_dc->m_u32[2] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 3
  v_be32 = htobe32(a_dc->m_u32[3]);
  a_dc->m_u32[3] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 4
  v_be32 = htobe32(a_dc->m_u32[4]);
  a_dc->m_u32[4] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 5
  v_be32 = htobe32(a_dc->m_u32[5]);
  a_dc->m_u32[5] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 6
  v_be32 = htobe32(a_dc->m_u32[6]);
  a_dc->m_u32[6] = be32toh((v_be32 >> 1) | v_carry);
  v_carry = (0 != (v_be32 & 1)) ? 0x80000000u : 0u;
  // 7
  v_be32 = htobe32(a_dc->m_u32[7]);
  a_dc->m_u32[7] = be32toh((v_be32 >> 1) | v_carry);
}


bool dc_test_bit( kuznets_double_chunk_t * a_dc, int a_bit ) {
  int v_widx = 7 - (a_bit / 32);
  uint32_t v_word = htobe32( a_dc->m_u32[v_widx] );
  uint32_t v_mask = 1u << (a_bit % 32);
  return 0 != (v_word & v_mask);
}


void kuznets_gcm_gf_mult( kuznets_chunk_t a_1, kuznets_chunk_t a_2, kuznets_chunk_t a_dst ) {
  kuznets_double_chunk_t v_result;
  bzero( &v_result, sizeof(v_result) );
  //
  kuznets_double_chunk_t v_from;
  memcpy( v_from.m_kch[0], a_1, sizeof(kuznets_chunk_t) );
  memcpy( v_from.m_kch[1], a_2, sizeof(kuznets_chunk_t) );
  // v_from.m_u32 - массив из 8 слов, [0..3] - a_1, [4..7] = a_2
  // умножаем слова a_1 на младшее слово [7] a_2
  // младшее [3] (порядок от старшего к младшему) слово a_1 "умножаем" на младшее слово a_2
  uint32_t v_a1 = htobe32(v_from.m_u32[3]);
  uint64_t v_a2 = htobe32(v_from.m_u32[7]);
  uint64_t v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 6 и 7)
  *((uint64_t *)&v_result.m_u32[6]) = be64toh( v_a3 );
  // [2] (порядок от старшего к младшему) слово a_1 "умножаем" на младшее слово a_2
  v_a1 = htobe32(v_from.m_u32[2]);
  v_a2 = htobe32(v_from.m_u32[7]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 5 и 6)
  *((uint64_t *)&v_result.m_u32[5]) ^= be64toh( v_a3 );
  // [1] (порядок от старшего к младшему) слово a_1 "умножаем" на младшее слово a_2
  v_a1 = htobe32(v_from.m_u32[1]);
  v_a2 = htobe32(v_from.m_u32[7]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 4 и 5)
  *((uint64_t *)&v_result.m_u32[4]) ^= be64toh( v_a3 );
  // старшее [0] (порядок от старшего к младшему) слово a_1 "умножаем" на младшее слово a_2
  v_a1 = htobe32(v_from.m_u32[0]);
  v_a2 = htobe32(v_from.m_u32[7]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 3 и 4)
  *((uint64_t *)&v_result.m_u32[3]) ^= be64toh( v_a3 );

  // умножаем слова a_1 на [6] слово a_2
  // младшее [3] (порядок от старшего к младшему) слово a_1 "умножаем" на [6] слово a_2
  v_a1 = htobe32(v_from.m_u32[3]);
  v_a2 = htobe32(v_from.m_u32[6]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 5 и 6)
  *((uint64_t *)&v_result.m_u32[5]) ^= be64toh( v_a3 );
  // [2] (порядок от старшего к младшему) слово a_1 "умножаем" на [6] слово a_2
  v_a1 = htobe32(v_from.m_u32[2]);
  v_a2 = htobe32(v_from.m_u32[6]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 4 и 5)
  *((uint64_t *)&v_result.m_u32[4]) ^= be64toh( v_a3 );
  // [1] (порядок от старшего к младшему) слово a_1 "умножаем" на [6] слово a_2
  v_a1 = htobe32(v_from.m_u32[1]);
  v_a2 = htobe32(v_from.m_u32[6]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 3 и 4)
  *((uint64_t *)&v_result.m_u32[3]) ^= be64toh( v_a3 );
  // старшее [0] (порядок от старшего к младшему) слово a_1 "умножаем" на [6] слово a_2
  v_a1 = htobe32(v_from.m_u32[0]);
  v_a2 = htobe32(v_from.m_u32[6]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 2 и 3)
  *((uint64_t *)&v_result.m_u32[2]) ^= be64toh( v_a3 );

  // умножаем слова a_1 на [5] слово a_1
  // младшее [3] (порядок от старшего к младшему) слово a_1 "умножаем" на [5] слово a_2
  v_a1 = htobe32(v_from.m_u32[3]);
  v_a2 = htobe32(v_from.m_u32[5]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 4 и 5)
  *((uint64_t *)&v_result.m_u32[4]) ^= be64toh( v_a3 );
  // [2] (порядок от старшего к младшему) слово a_1 "умножаем" на [5] слово a_2
  v_a1 = htobe32(v_from.m_u32[2]);
  v_a2 = htobe32(v_from.m_u32[5]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 3 и 4)
  *((uint64_t *)&v_result.m_u32[3]) ^= be64toh( v_a3 );
  // [1] (порядок от старшего к младшему) слово a_1 "умножаем" на [5] слово a_2
  v_a1 = htobe32(v_from.m_u32[1]);
  v_a2 = htobe32(v_from.m_u32[5]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 2 и 3)
  *((uint64_t *)&v_result.m_u32[2]) ^= be64toh( v_a3 );
  // старшее [0] (порядок от старшего к младшему) слово a_1 "умножаем" на [5] слово a_2
  v_a1 = htobe32(v_from.m_u32[0]);
  v_a2 = htobe32(v_from.m_u32[5]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 1 и 2)
  *((uint64_t *)&v_result.m_u32[1]) ^= be64toh( v_a3 );
  
  // умножаем слова a_1 на [4] слово a_1
  // младшее [3] (порядок от старшего к младшему) слово a_1 "умножаем" на старшее слово a_2
  v_a1 = htobe32(v_from.m_u32[3]);
  v_a2 = htobe32(v_from.m_u32[4]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 3 и 4)
  *((uint64_t *)&v_result.m_u32[3]) ^= be64toh( v_a3 );
  // [2] (порядок от старшего к младшему) слово a_1 "умножаем" на старшее слово a_2
  v_a1 = htobe32(v_from.m_u32[2]);
  v_a2 = htobe32(v_from.m_u32[4]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 2 и 3)
  *((uint64_t *)&v_result.m_u32[2]) ^= be64toh( v_a3 );
  // [1] (порядок от старшего к младшему) слово a_1 "умножаем" на старшее слово a_2
  v_a1 = htobe32(v_from.m_u32[1]);
  v_a2 = htobe32(v_from.m_u32[4]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 1 и 2)
  *((uint64_t *)&v_result.m_u32[1]) ^= be64toh( v_a3 );
  // старшее [0] (порядок от старшего к младшему) слово a_1 "умножаем" на старшее слово a_2
  v_a1 = htobe32(v_from.m_u32[0]);
  v_a2 = htobe32(v_from.m_u32[4]);
  v_a3 = 0;
  for ( int i = 0; i < 32; ++i ) {
    if ( 0 != (v_a1 & (1u << i) ) ) {
      v_a3 ^= v_a2;
    }
    v_a2 <<= 1;
  }
  // ставим результат на место (слова 0 и 1)
  *((uint64_t *)&v_result.m_u32[0]) ^= be64toh( v_a3 );
  
  kuznets_double_chunk_t v_poly;
  bzero( &v_poly, sizeof(v_poly) );
  memcpy( &v_poly.m_kch[1], g_gf_poly, sizeof(v_poly.m_kch[1]) );
  // тут хардкод. так как полином 128 порядка, то ставим 128-й бит в полиноме
  v_poly.m_u32[3] = be32toh( 0x00000001u );
  // сдвигаем полином на нужную позицию
  for ( int i = GF_POLY_CHAR; i < 255; ++i ) {
    dc_shift_left( &v_poly );
  }
  //
  for ( int i = 255; i >= GF_POLY_CHAR; --i ) {
    if ( dc_test_bit( &v_result, i ) ) {
      v_result.m_kch[0][0] ^= v_poly.m_kch[0][0];
      v_result.m_kch[0][1] ^= v_poly.m_kch[0][1];
      v_result.m_kch[1][0] ^= v_poly.m_kch[1][0];
      v_result.m_kch[1][1] ^= v_poly.m_kch[1][1];
    }
    dc_shift_right( &v_poly );
  }
  
  // записываем результат
  memcpy( a_dst, &v_result.m_kch[1], sizeof(kuznets_chunk_t) );
}

/*
int main( int, char ** ) {
  kuznets_chunk_t v1, v2, v3;
  v1[0] = 0;
  v1[1] = htobe64(0x53);
  v2[0] = 0;
  v2[1] = htobe64(0xCA);
  kuznets_gcm_gf_mult( v1, v2, v3 );
  printf( "result: %016lX %016lX\n", be64toh(v3[0]), be64toh(v3[1]) );
  //
  v1[0] = be64toh(0xD000000000000001ull);
  v1[1] = be64toh(0x8000000000000811ull);
  v2[0] = be64toh(0x1000000000000002ull);
  v2[1] = be64toh(0x0000000000000401ull);
  kuznets_gcm_gf_mult( v1, v2, v3 );
  printf( "result: %016lX %016lX\n", be64toh(v3[0]), be64toh(v3[1]) );
  return 0;
}
*/
