#ifndef _BME280_H_
#define _BME280_H_

#include <stdbool.h>


bool init_BMP280();
bool BMP280_readMesure(int * a_dst_t, int * a_dst_p, int * a_dst_h);
bool BMP280_is_BME();
bool BMP280_detected();

#endif // _BME280_H_
