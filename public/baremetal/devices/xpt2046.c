#include "xpt2046.h"
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/spi.h>

#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>


#define XPT2046_READ_Z1     0xB1
#define XPT2046_READ_Z2     0xC1
#define XPT2046_READ_X      0xD1
#define XPT2046_READ_Y      0x91
#define XPT2046_READ_Y_0    0xD0


#ifdef __cplusplus
extern "C" {
#endif

void delay_ms( uint32_t a_ms );
extern volatile uint32_t g_milliseconds;

volatile bool g_xpt2046_touch_flag = false;
static int Ax = 0, Bx = 0, Dx = 0, Ay = 0, By = 0, Dy = 0;


// проверяем состояние экрана - есть ли нажатие
bool xpt2046_touched() {
  return 0 == (GPIO_0->SET & GPIO_PIN_M(XPT2046_PIN_INT));
}


// ждать "отпускания" экрана
void xpt2046_wait_release( unsigned int a_timeout_ms ) {
  for ( uint32_t v_from = g_milliseconds; (g_milliseconds - v_from) < a_timeout_ms; ) {
    if ( 0 != (GPIO_0->SET & GPIO_PIN_M(XPT2046_PIN_INT)) ) {
      return;
    }
  }
}


// выдача команды (8 битов) и получение результата (16 битов)
static int xpt2046_spi_xfer16( uint8_t a_byte ) {
  // три байта на отправку закидываем в FIFO
  SPI_0->TXDATA = a_byte;
  SPI_0->TXDATA = 0;
  SPI_0->TXDATA = 0;
  // один байт откидываем
  while ( 0 == (SPI_0->INT_STATUS & SPI_INT_STATUS_RX_FIFO_NOT_EMPTY_S) ) {}
  SPI_0->RXDATA;
  // получаем два байта
  // старший байт
  while ( 0 == (SPI_0->INT_STATUS & SPI_INT_STATUS_RX_FIFO_NOT_EMPTY_S) ) {}
  int v_result = SPI_0->RXDATA << 8;
  // младший байт
  while ( 0 == (SPI_0->INT_STATUS & SPI_INT_STATUS_RX_FIFO_NOT_EMPTY_S) ) {}
  v_result |= SPI_0->RXDATA;
  // в результате 12 битов, ставим на место и прикладываем маску (на всякий случай)
  return (v_result >> 3) & 0xFFF;
}


// выбрать контроллер на шине
static void xpt2046_select() {
	GPIO_0->CLEAR = GPIO_PIN_M(XPT2046_PIN_CS);
}


// "отпустить" контроллер
static void xpt2046_release() {
	GPIO_0->SET = GPIO_PIN_M(XPT2046_PIN_CS);
}


// настройка выводов контроллера и SPI_0 для связи с xpt2046
void xpt2046_init() {
  // включение PAD_CONFIG
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  // включение GPIO_0, GPIO_IRQ и SPI_0
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_SPI_0_M | PM_CLOCK_APB_P_GPIO_IRQ_M;
  // настройка выводов
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~( PAD_CONFIG_PIN_M(XPT2046_PIN_CS)
                                                      | PAD_CONFIG_PIN_M(XPT2046_PIN_INT)
                                                      | PAD_CONFIG_PIN_M(XPT2046_PIN_MISO)
                                                      | PAD_CONFIG_PIN_M(XPT2046_PIN_MOSI)
                                                      | PAD_CONFIG_PIN_M(XPT2046_PIN_SCK)
                                                      | PAD_CONFIG_PIN_M(XPT2046_PIN_NSS) ))
                         | PAD_CONFIG_PIN(XPT2046_PIN_MISO, 1)
                         | PAD_CONFIG_PIN(XPT2046_PIN_MOSI, 1)
                         | PAD_CONFIG_PIN(XPT2046_PIN_SCK, 1)
                         | PAD_CONFIG_PIN(XPT2046_PIN_NSS, 1)
                         ;
  PAD_CONFIG->PORT_0_DS = (PAD_CONFIG->PORT_0_DS & ~( PAD_CONFIG_PIN_M(XPT2046_PIN_CS)
                                                    | PAD_CONFIG_PIN_M(XPT2046_PIN_INT) ))
                        | PAD_CONFIG_PIN(XPT2046_PIN_CS, 2)
                        ;
  // а это финт ушами, подсмотренный в исходниках HAL
  // т.к. в модуле SPI нет "программного" управления состоянием бита "NSS", то приходится
  // использовать физический вывод SPI_0.NSS с подтяжкой к напряжению питания
  // заодно "подтянем" к питанию вход "индикатора нажатия" от XPT2046
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~( PAD_CONFIG_PIN_M(XPT2046_PIN_NSS)
                                                        | PAD_CONFIG_PIN_M(XPT2046_PIN_INT) ))
                        | PAD_CONFIG_PIN(XPT2046_PIN_NSS, 1)
                        ;
  // выбор XPT2046 на шине, выход, в лог. 1 (не выбран)
  GPIO_0->DIRECTION_OUT = GPIO_PIN_M(XPT2046_PIN_CS);
  GPIO_0->SET = GPIO_PIN_M(XPT2046_PIN_CS);
  // "индикатор нажатия" сделаем входом
  GPIO_0->DIRECTION_IN = GPIO_PIN_M(XPT2046_PIN_INT);
  // настройка SPI_0
  SPI_0->ENABLE = 0; // выключаем
  SPI_0->INT_DISABLE = 0xFFFFFFFF; // чистим флаги
  SPI_0->ENABLE = SPI_ENABLE_CLEAR_RX_FIFO_M | SPI_ENABLE_CLEAR_TX_FIFO_M; // чистим FIFO
  SPI_0->DELAY = 0; // никаких задержек
  SPI_0->TX_THR = 4; // граница заполнения FIFO на передачу
  SPI_0->CONFIG = SPI_CONFIG_MANUAL_CS_M // ручное управление сигналом CHIP_SELECT
                | SPI_CONFIG_CS_NONE_M // ни одно устройство не выбрано
                | SPI_CONFIG_BAUD_RATE_DIV_16_M // частота интерфейса 2 МГц
                | SPI_CONFIG_MODE_SEL_M // режим ведущего на шине SPI
                ;
  SPI_0->ENABLE = SPI_ENABLE_M; // включаем модуль SPI_0
  // запускаем режим выдачи сигнала "нажатие"
  xpt2046_select();
  delay_ms( 2u );
	xpt2046_spi_xfer16( XPT2046_READ_Y_0 ); // PD1 = 0, PD0 = 0, см. даташит на XPT2046
  delay_ms( 2u );
	xpt2046_release();
  delay_ms( 2u );
  // без задержек не работает
}


// чтение данных о нажатии
bool xpt2046_read( int * a_x, int * a_y, int * a_z )
{
	bool v_result = false;
  // накопительные значения
  int vx = 0, vy = 0, vz1 = 0, vz2 = 0;
	// выбор контроллера на шине SPI_0
  xpt2046_select();
  // задержка
  delay_ms( 2u );
  // по восемь измерений каждого параметра
  for ( int i = 0; i < XPT2046_AVG_COUNT; ++i ) {
		// первый замер каждого параметра откидываем
		xpt2046_spi_xfer16( XPT2046_READ_X );
		vx += xpt2046_spi_xfer16( XPT2046_READ_X );
		xpt2046_spi_xfer16( XPT2046_READ_Y );
		vy += xpt2046_spi_xfer16( XPT2046_READ_Y );
		xpt2046_spi_xfer16( XPT2046_READ_Z1 );
		vz1 += xpt2046_spi_xfer16( XPT2046_READ_Z1 );
		xpt2046_spi_xfer16( XPT2046_READ_Z2 );
		vz2 += xpt2046_spi_xfer16( XPT2046_READ_Z2 );
	}
	// измерение с переходом в режим ожидания
	xpt2046_spi_xfer16( XPT2046_READ_Y_0 );
	// ждём
  delay_ms( 2u );
  // отпускаем контроллер
	xpt2046_release();
	// ещё ждём
  delay_ms( 2u );
  
  // усреднение
  vx /= XPT2046_AVG_COUNT;
  vy /= XPT2046_AVG_COUNT;
	vz1 /= XPT2046_AVG_COUNT;
	vz2 /= XPT2046_AVG_COUNT;
	
	// если Z1 == 0, то нажатия точно нет
	if ( 0 != vz1 ) {
		// расчитываем сопротивление от нажатия (см. даташит на XPT2046)
		*a_z = (int)((((524288LL * vx * vz2) / vz1) - (524288LL * vx)) / (1024 * 4096));
		// если сопротивление меньше порога, считаем, что есть нажатие
		if ( *a_z < XPT2046_TOUCH_THRESHOLD ) {
			// результат
			*a_x = vx;
			*a_y = vy;
			v_result = true;
		}
	}
	//
	return v_result;
}


// установить коэффициенты расчёта координат касаний экрана
// идея подсмотрена в https://embedded.icu/article/mikrokontrollery/rabota-s-rezistivnym-sensornym-ekranom
// коеффициенты вычисляются при калибровке экрана по четырём касаниям и затем
// используются для получения координат касания в экранной системе координат
// X = Xadc * Ax + Yadc * Bx + Dx;
// Y = Xadc * Ay + Yadc * By + Dy;
void xpt2046_set_coeff( int a_Ax, int a_Bx, int a_Dx, int a_Ay, int a_By, int a_Dy ) {
	Ax = a_Ax;
	Bx = a_Bx;
	Dx = a_Dx;
	Ay = a_Ay;
	By = a_By;
	Dy = a_Dy;
}


// получить X координату на экране по данным от контроллера сенсорной поверхности
int xpt2046_get_X( int a_x, int a_y ) {
	return (a_x * Ax + a_y * Bx + Dx) / 4096;
}


// получить Y координату на экране по данным от контроллера сенсорной поверхности
int xpt2046_get_Y( int a_x, int a_y ) {
	return (a_x * Ay + a_y * By + Dy) / 4096;
}


#ifdef __cplusplus
}
#endif
