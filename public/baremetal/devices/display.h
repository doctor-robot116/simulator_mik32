#ifndef __DISPLAY_H__
#define __DISPLAY_H__

#include "fonts/font_bmp.h"
#include "utils/zic_utils.h"
#include <picojpeg.h>


// подгоняте под ширину экрана для уменьшения размеров буферов
#define display_MAX_LINE_PIXELS  320

#define ST_CMD_DELAY 0x80 // special signifier for command lists

#define display_NOP 0x00
#define display_SWRESET 0x01
#define display_RDDID 0x04
#define display_RDDST 0x09

#define display_SLPIN 0x10
#define display_SLPOUT 0x11
#define display_PTLON 0x12
#define display_NORON 0x13

#define display_INVOFF 0x20
#define display_INVON 0x21
#define display_DISPOFF 0x28
#define display_DISPON 0x29
#define display_GAMSET 0x26
#define display_CASET 0x2A
#define display_RASET 0x2B
#define display_RAMWR 0x2C
#define display_RAMRD 0x2E

#define display_PTLAR 0x30
#define display_TEOFF 0x34
#define display_TEON 0x35
#define display_MADCTL 0x36
#define display_COLMOD 0x3A

#define display_MADCTL_MY  0x80
#define display_MADCTL_MX  0x40
#define display_MADCTL_MV  0x20
#define display_MADCTL_ML  0x10
#define display_MADCTL_RGB 0x00
#define display_MADCTL_BGR 0x08
#define display_MADCTL_MH  0x04

#define display_RDID1 0xDA
#define display_RDID2 0xDB
#define display_RDID3 0xDC
#define display_RDID4 0xDD


// Определения цветов (R5,G6,B5)
#define RGB565(r,g,b) (((r&0xF8)<<8)|((g&0xFC)<<3)|(b>>3))
#define RGB565FINAL(r,g,b) ((r&0xF8)|((g&0xE0)>>5)|((g&0x1C)<<11)|((b&0xF8)<<5))

// Color definitions                       R    G    B
#define DISPLAY_COLOR_BLACK       RGB565(  0,   0,   0)
#define DISPLAY_COLOR_RED         RGB565(255,   0,   0)
#define DISPLAY_COLOR_GREEN       RGB565(  0, 255,   0)
#define DISPLAY_COLOR_BLUE        RGB565(  0,   0, 255)
#define DISPLAY_COLOR_CYAN        RGB565(  0, 255, 255)
#define DISPLAY_COLOR_MAGENTA     RGB565(255,   0, 255)
#define DISPLAY_COLOR_YELLOW      RGB565(255, 255,   0)
#define DISPLAY_COLOR_WHITE       RGB565(255, 255, 255)
#define DISPLAY_COLOR_GRAY        RGB565(127, 127, 127)
#define DISPLAY_COLOR_LIGHTGREY   RGB565(191, 191, 191)
#define DISPLAY_COLOR_PINK        RGB565(255, 191, 191)
#define DISPLAY_COLOR_MIDRED      RGB565(127,   0,   0)
#define DISPLAY_COLOR_MIDGREEN    RGB565(  0, 127,   0)
#define DISPLAY_COLOR_MIDBLUE     RGB565(  0,   0, 127)
#define DISPLAY_COLOR_DARKRED     RGB565( 63,   0,   0)
#define DISPLAY_COLOR_DARKGREEN   RGB565(  0,  63,   0)
#define DISPLAY_COLOR_DARKBLUE    RGB565(  0,   0,  63)
#define DISPLAY_COLOR_DARKCYAN    RGB565(  0,  63,  63)
#define DISPLAY_COLOR_DARKMAGENTA RGB565( 63,   0,  63)
#define DISPLAY_COLOR_DARKYELLOW  RGB565( 63,  63,   0)
#define DISPLAY_COLOR_DARKGRAY    RGB565( 63,  63,  63)
// "однобайтовые" цвета, 16-битный цвет получается из двух одинаковых байтов
#define DISPLAY_BYTE_COLOR_BLACK          0
#define DISPLAY_BYTE_COLOR_RED            0xE0
#define DISPLAY_BYTE_COLOR_GREEN          0x07
#define DISPLAY_BYTE_COLOR_BLUE           0x18
#define DISPLAY_BYTE_COLOR_WHITE     	  0xFF
#define DISPLAY_BYTE_COLOR_DARK_RED       0x60
#define DISPLAY_BYTE_COLOR_DARK_GREEN     0x03
#define DISPLAY_BYTE_COLOR_DARK_BLUE      0x08


#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
	GAMMA_10 = 0x01,
	GAMMA_25 = 0x02,
	GAMMA_22 = 0x04,
	GAMMA_18 = 0x08
} GammaDef;

// снять сигнал выбора контроллера ST77xx
void display_Unselect();
// настройка SPI_1 и каналов 0 и 1 DMA
void display_Init( uint16_t a_width, uint16_t a_height, const uint8_t * a_init_sequence );
//
void display_SetRotation( uint8_t a_madctl );
// отобразить точку по указанным координатам
void display_DrawPixel(uint16_t x, uint16_t y, uint16_t color);
// вывести строку текста по указанным координатам с использованием указанного шрифта
void display_WriteString(uint16_t x, uint16_t y, const char* str, const packed_font_desc_s * fnt, uint16_t color, uint16_t bgcolor);
// нарисовать закрашенный прямоугольник, по одной точке
void display_FillRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
// нарисовать закрашенный прямоугольник, по одной линии шириной w
void display_FillRectangleFast(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
// залить весь экран одним цветом, по одной точке
void display_FillScreen(uint16_t color);
// залить весь экран одним цветом, по одной линии шириной display_WIDTH
void display_FillScreenFast(uint16_t color);
// залить весь экран однобайтовым цветом, одной транзакцией DMA
void display_FillScreenFast_2(uint8_t color);
// вывести изображение, представленное массивом пикселов w * h
void display_RawImage(int x, int y, int w, int h, const uint8_t * a_data);
// распаковать и вывести изображение, распаковка построчная
void display_DrawImage(int x, int y, int w, int h, const uint8_t* a_data, int a_data_len);
// установить инверсию цветов на экране
void display_InvertColors(int invert); // 0 - false, != 0 - true
// настроить кривую яркости
void display_SetGamma(GammaDef gamma);
// вывести строку текста по указанным координатам в прямоугольнике заданного размера
// строка центрируется по горизонтали и не должна быть шире экрана
// размер по вертикали обрабатывается неправильно, так что имеет смысл задавать его
// равным высоте строки выбранного шрифта
// строка текста выводится по строкам, собираемым из всех символов строки с использованием
// двойного буфера, что обеспечивает плавный вывод изображения всей строки
void display_WriteStringWithBackground(
              int a_x
            , int a_y
            , int a_width
            , int a_height
            , const char * a_str
            , const packed_font_desc_s * a_fnt
            , uint16_t a_color
            , uint16_t a_bgcolor
            );
// вывести строку текста по указанным координатам в прямоугольнике заданного размера
// строка центрируется по горизонтали и не должна быть шире экрана
// первые a_columns_1 вертикальных линий фона выводятся цветом a_bg_color_1,
// остальные - цветом a_bgcolor_2
// размер по вертикали обрабатывается неправильно, так что имеет смысл задавать его
// равным высоте строки выбранного шрифта
// строка текста выводится по строкам, собираемым из всех символов строки с использованием
// двойного буфера, что обеспечивает плавный вывод изображения всей строки
void display_WriteStringWithBackground_2(
              int a_x
            , int a_y
            , int a_width
            , int a_height
            , const char * a_str
            , const packed_font_desc_s * a_fnt
            , uint16_t a_color
            , uint16_t a_bgcolor_1
            , uint16_t a_bgcolor_2
	    , int a_columns_1
            );
// рисуем прямоугольник, заполненный цветом, составленным из двух одинаковых байтов
// здесь буфер не требуется, через DMA сразу передаются все пиксели прямоугольника
// соответственно, адрес источника в памяти не меняется, т.е. передаётся один байт color
void display_FillRectangleFast_2( uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint8_t color );
// вывести на экран изображение, упакованное в формате JPEG
void display_draw_jpeg_image( int x, int y, const uint8_t * a_data, int a_data_len );
// установить значение в регистре контроллера, отвечающего за поворот и зеркалирование осей, а также за порядок битов цвета
void display_set_config( uint8_t a_madctl_value );
// установить ширину и длину экрана
void display_set_bounds( uint16_t a_width, uint16_t a_height );


#ifdef __cplusplus
}
#endif



#endif // __DISPLAY_H__
