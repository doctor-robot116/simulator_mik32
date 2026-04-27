#ifndef __ST7735_H__
#define __ST7735_H__

#include "display.h"

#define ST7735_WIDTH  160
#define ST7735_HEIGHT 128

// Настройки поворота и порядка записи цвета точек, регистр MADCTL, см. описание контроллера ST7735
// _MV - меняет местами ширину и высоту. т.е. если у вас горизонтальная ось изображения
// повёрнута на 90 градусов - поменяйте значение этого бита.
// _MX и MY - зеркалируют изображение относительно осей. т.е. если у вас изображение перевёрнуто сверху вниз,
// тогда поменяйте значение бита _MX, если перевёрнуто справа налево - то меняйте _MY
// если вместо красного синий и наоборот - меняйте _BGR на RGB
#define ST7735_ROTATION (display_MADCTL_MV | display_MADCTL_MX | display_MADCTL_RGB) // X-Y exchange (160 width, 128 height) and Y-mirror


/****************************/

#define ST7735_FRMCTR1 0xB1
#define ST7735_FRMCTR2 0xB2
#define ST7735_FRMCTR3 0xB3
#define ST7735_INVCTR 0xB4
#define ST7735_DISSET5 0xB6

#define ST7735_PWCTR1 0xC0
#define ST7735_PWCTR2 0xC1
#define ST7735_PWCTR3 0xC2
#define ST7735_PWCTR4 0xC3
#define ST7735_PWCTR5 0xC4
#define ST7735_VMCTR1 0xC5

#define ST7735_PWCTR6 0xFC

#define ST7735_GMCTRP1 0xE0
#define ST7735_GMCTRN1 0xE1


#ifdef __cplusplus
extern "C" {
#endif

// настройка
void ST7735_Init(void);
void ST7735_Init_2( uint16_t a_width, uint16_t a_height );

#ifdef __cplusplus
}
#endif


#endif // __ST7735_H__
