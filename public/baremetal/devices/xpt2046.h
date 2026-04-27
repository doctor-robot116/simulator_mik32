#ifndef __XPT2046_H__
#define __XPT2046_H__

#include <stdbool.h>


// номера выводов GPIO_0, используемые для подключения контроллера сенсорной поверхности
#define XPT2046_PIN_SCK     2
#define XPT2046_PIN_MOSI    1
#define XPT2046_PIN_CS      8
#define XPT2046_PIN_MISO    0
#define XPT2046_PIN_INT     10
#define XPT2046_PIN_NSS     3

// некая константа, "сопротивление", зависящее от силы нажатия, чем сильнее - тем ниже "сопротивление"
#define XPT2046_TOUCH_THRESHOLD   1500
// количество выборок для усреднения от АЦП контроллера сенсорной поверхности
#define XPT2046_AVG_COUNT         8

#ifdef __cplusplus
extern "C" {
#endif

// начальная настройка, GPIO_0 и SPI_0
void xpt2046_init();
// вернёт true, если экран фиксирует нажатие (см. даташит на XPT2046)
bool xpt2046_touched();
// прочитать данные из каналов X, Y и расчитать "сопротивление" от силы нажатия
bool xpt2046_read( int * a_x, int * a_y, int * a_z );
// выставить коэффициенты преобразования показаний от АЦП в координаты экрана
void xpt2046_set_coeff( int a_Ax, int a_Bx, int a_Dx, int a_Ay, int a_By, int a_Dy );
// расчитать координату X в экранной сиситеме отсчета по показаниям из каналов АЦП
int xpt2046_get_X( int a_x, int a_y );
// расчитать координату Y в экранной сиситеме отсчета по показаниям из каналов АЦП
int xpt2046_get_Y( int a_x, int a_y );
// ждать "отпускания" экрана
void xpt2046_wait_release( unsigned int a_timeout_ms );


#ifdef __cplusplus
}
#endif


#endif // __XPT2046_H__
