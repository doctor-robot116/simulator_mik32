// стырено в https://git.rekovalev.site/Crypto/C_Kuznechik_GOST_R_34.12-2015
// там указана MIT лицензия, но без указания года и "copyright holders"
// так что кому надо, может взять "рыбу" и вкорячить сюда

#ifndef __KUZNETS_H__
#define __KUZNETS_H__

#include <stdint.h>


// Длина блока в байтах(16 байт = 128 бит)
#define KUZNECHIK_BLOCK_SIZE 16

// Один блок (чанк) задается как массив двух беззнаковых целых по 64 бита
typedef uint64_t kuznets_chunk_t[2];


void kuznets_gen_round_keys(const uint8_t* key, kuznets_chunk_t* round_keys);
void kuznets_encrypt(kuznets_chunk_t *round_keys, kuznets_chunk_t in, kuznets_chunk_t out);
void kuznets_decrypt(kuznets_chunk_t *round_keys, kuznets_chunk_t in, kuznets_chunk_t out);

#endif // __KUZNETS_H__
