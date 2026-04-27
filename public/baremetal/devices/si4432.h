// radiomodem.h
#ifndef __SI4432_H__
#define __SI4432_H__

#include <stdint.h>


// размер синхропоследовательности (последовательность чередующихся единиц и нулей) в байтах, округлённое в большую сторону
#define RM_PREAMBLE_BYTES     4
// количество байтов синхронизации (количество байтов с указанным значением, которые отлавливаются после синхропоследовательности)
#define RM_SYNC_BYTES         2
// количество байтов CRC
#define RM_CRC_BYTES          2
// количество байтов заголовка
#define RM_HEADER_BYTES       0
// включено кодирование "манчестером" или нет (1 или 0)
#define RM_MANCHESTER_ENABLED 0
// битовая скорость обмена (бит/сек)
#define RM_BIT_RATE           12500
// используется ли пакет переменной длины (1 или 0)
#define RM_VARIABLE_LENGTH    1
// максимальный размер пакета
#define RM_MAX_PACKET_SIZE    64

// константы для задания уровня выходной мощности передатчика
#define RM_TX_POWER_1dBm       0  // 000 +1 dBm - 1.259 мВт
#define RM_TX_POWER_2dBm       0  // 001 +2 dBm - 1.563 мВт
#define RM_TX_POWER_5dBm       0  // 010 +5 dBm - 3.125 мВт
#define RM_TX_POWER_8dBm       0  // 011 +8 dBm - 6.25 мВт
#define RM_TX_POWER_11dBm      0  // 100 +11 dBm - 12.5 мВт
#define RM_TX_POWER_14dBm      0  // 101 +14 dBm - 25 мВт
#define RM_TX_POWER_17dBm      0  // 110 +17 dBm - 50 мВт
#define RM_TX_POWER_20dBm      0  // 111 +20 dBm - 100 мВт


#ifdef __cplusplus
extern "C" {
#endif
// инициализация радиомодема, вернёт 0 (ноль) в случае успеха
int si4432_init();
// принять пакет
int si4432_receive( uint8_t * a_dst, uint32_t timeout );
// отправить пакет
int si4432_transmit( uint8_t* data, uint32_t len );

// индикатор уровня сигнала
extern uint8_t g_rssi;
// размер принятого пакета (если включены пакеты переменной длины)
extern uint8_t g_packet_length;
#ifdef __cplusplus
}
#endif


#endif // __SI4432_H__
