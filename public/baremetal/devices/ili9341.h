#ifndef __ILI9341_H__
#define __ILI9341_H__

#include "display.h"

#define ILI9341_WIDTH  320
#define ILI9341_HEIGHT 240

// Настройки поворота и порядка записи цвета точек, регистр MADCTL, см. описание контроллера ILI9341
// _MV - меняет местами ширину и высоту. т.е. если у вас горизонтальная ось изображения
// повёрнута на 90 градусов - поменяйте значение этого бита.
// _MX и MY - зеркалируют изображение относительно осей. т.е. если у вас изображение перевёрнуто сверху вниз,
// тогда поменяйте значение бита _MX, если перевёрнуто справа налево - то меняйте _MY
// если вместо красного синий и наоборот - меняйте _BGR на RGB
#define ILI9341_ROTATION (display_MADCTL_MV | display_MADCTL_MY | display_MADCTL_MX | display_MADCTL_BGR)


#ifdef __cplusplus
extern "C" {
#endif

// настройка
void ILI9341_Init(void);

#ifdef __cplusplus
}
#endif


#endif // __ILI9341_H__
