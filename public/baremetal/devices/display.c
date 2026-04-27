#include <display.h>
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/dma_config.h>
#include <mik32_hwlibs/spi.h>

#include <runtime.h>
#include <endian.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>


#define ST_DELAY 0x80

// номера битов для выводов
#define DISPLAY_CS_PIN      5
#define DISPLAY_RST_PIN     8
#define DISPLAY_DC_PIN      9
#define DISPLAY_SDA_PIN     1
#define DISPLAY_SCK_PIN     2
#define DISPLAY_LED_PIN     0
#define DISPLAY_NSS_PIN     3


static uint8_t g_spi_dummy_read;

static uint16_t g_display_width;
static uint16_t g_display_height;


#define wfi() ({ asm volatile ("wfi"); })


static void display_Select() {
  GPIO_1->CLEAR = GPIO_PIN_M(DISPLAY_CS_PIN);
}

void display_Unselect() {
  GPIO_1->SET = GPIO_PIN_M(DISPLAY_CS_PIN);
}

static void display_Reset() {
  GPIO_1->CLEAR = GPIO_PIN_M(DISPLAY_RST_PIN);
  delay_ms( 20 );
  GPIO_1->SET = GPIO_PIN_M(DISPLAY_RST_PIN);
  delay_ms( 150 );
}


// таймаут на передачу по SPI в миллисекундах
uint32_t g_spi_timeout;
uint32_t g_last_spi_size = 0;

static void display_calc_timeout( uint32_t a_size ) {
  if ( g_last_spi_size != a_size ) {
    g_last_spi_size = a_size;
    // вычисляем таймаут для передачи указанного объёма данных
    g_spi_timeout = a_size * 8000;
    switch ( (SPI_1->CONFIG & SPI_CONFIG_BAUD_RATE_DIV_M) ) {
      case SPI_CONFIG_BAUD_RATE_DIV_2_M:
        g_spi_timeout /= (32000000/2);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_4_M:
        g_spi_timeout /= (32000000/4);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_8_M:
        g_spi_timeout /= (32000000/8);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_16_M:
        g_spi_timeout /= (32000000/16);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_32_M:
        g_spi_timeout /= (32000000/32);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_64_M:
        g_spi_timeout /= (32000000/64);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_128_M:
        g_spi_timeout /= (32000000/128);
        break;
      case SPI_CONFIG_BAUD_RATE_DIV_256_M:
        g_spi_timeout /= (32000000/256);
        break;
      default:
        break;
    }
    g_spi_timeout += 16u;
  }
}

// начать передачу указанного массива байтов через SPI с участием DMA
static void display_spi_write_start( const uint8_t * a_src, uint32_t a_size ) {
  //
  DMA_CONFIG->CONFIG_STATUS = 0x3F + DMA_CONFIG_CURRENT_VALUE_M;
  // DMA[0] - передача SPI1
  DMA_CONFIG->CHANNELS[0].SRC = (uint32_t)a_src;
  DMA_CONFIG->CHANNELS[0].LEN = a_size - 1u;
  // DMA[1] - приём SPI1
  DMA_CONFIG->CHANNELS[1].LEN = a_size - 1u;
  // enable DMA channel 1 for receive
  DMA_CONFIG->CHANNELS[1].CFG |= DMA_CH_CFG_ENABLE_M;
  // enable DMA1 channel 0 for transmit
  DMA_CONFIG->CHANNELS[0].CFG |= DMA_CH_CFG_ENABLE_M;
  //
  display_calc_timeout( a_size );
}


// ждать заверщения передачи, запущенной в ST7735_spi_write_start()
static void display_spi_write_end() {
  uint32_t v_from = g_milliseconds;
  // ожидаем завершения работы канала на чтение или ошибки, не более g_spi_timeout миллисекунд
  // почему ждём завершение работы именно канала на чтение?
  // потому, что часто после вызова этой функции следует снятие сигнала CHIP_SELECT
  // в интерфейсе связи с контроллером экрана, а завершение чтения гарантированно
  // происходит в тот момент, когда все до последнего бита передаваемых данных
  // были отправлены. а вот если ждать завершения работы канала записи, то можно
  // снять сигнал CS, когда данные для передачи ещё остались в FIFO и/или в сдвиговом регистре модуля SPI
  while ( ((uint32_t)(g_milliseconds - v_from)) < g_spi_timeout ) {
    if ( 0 != (DMA_CONFIG->CONFIG_STATUS & (DMA_STATUS_READY(1) | DMA_STATUS_CHANNEL_BUS_ERROR_M)) ) {
      break;
    }
  }
  // отключаем использованные каналы
  DMA_CONFIG->CHANNELS[0].CFG &= ~DMA_CH_CFG_ENABLE_M;
  DMA_CONFIG->CHANNELS[1].CFG &= ~DMA_CH_CFG_ENABLE_M;
}


// синхронная отправка данных, вернёт управления после завершения передачи
static void display_spi_write( const uint8_t * a_src, uint32_t a_size ) {
  display_spi_write_start( a_src, a_size );
  display_spi_write_end();
}


// передать команду контроллеру экрана ST7735
static void display_WriteCommand(uint8_t cmd) {
  // признак передачи команды
  GPIO_1->CLEAR = GPIO_PIN_M(DISPLAY_DC_PIN);
  // отправить байт команды
  display_spi_write( &cmd, sizeof(cmd) );
}


// отправить данные контроллеру экрана ST77xx
static void display_WriteData(uint8_t* buff, uint32_t buff_size) {
  // признак передачи данных
  GPIO_1->SET = GPIO_PIN_M(DISPLAY_DC_PIN);
  // отправить данные
  display_spi_write( buff, buff_size );
}


// отправить контроллеру экрана команды из списка
static void display_ExecuteCommandList(const uint8_t *addr) {
    uint8_t numCommands, numArgs;
    uint16_t ms;
    
    if ( !addr ) {
      return;
    }

    numCommands = *addr++;
    while(numCommands--) {
        uint8_t cmd = *addr++;
        display_WriteCommand(cmd);

        numArgs = *addr++;
        // If high bit set, delay follows args
        ms = numArgs & ST_DELAY;
        numArgs &= ~ST_DELAY;
        if(numArgs) {
            display_WriteData((uint8_t*)addr, numArgs);
            addr += numArgs;
        }

        if(ms) {
            ms = *addr++;
            if(ms == 255) {
              ms = 500;
            }
            delay_ms( ms );
        }
    }
}


// установить область для записи в память экрана, на входе координаты двух углов прямоугольника
static void display_SetAddressWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    uint32_t v_cmd_data;
    // номера колонок
    display_WriteCommand(display_CASET);
    v_cmd_data = htobe32( (x0 << 16) | x1 );
    display_WriteData( (uint8_t *)&v_cmd_data, sizeof(v_cmd_data));

    // номера строк
    display_WriteCommand(display_RASET);
    v_cmd_data = htobe32( (y0 << 16) | y1 );
    display_WriteData( (uint8_t *)&v_cmd_data, sizeof(v_cmd_data));

    // команда, означающая, что следом полетят данные о цвете точек
    display_WriteCommand(display_RAMWR);
    // укажем, что будут передаваться данные
    GPIO_1->SET = GPIO_PIN_M(DISPLAY_DC_PIN);
}


static void display_set_addr_window_dma( uint16_t x, uint16_t y, uint16_t w, uint16_t h ) {
  uint8_t v_cmd_data[4];
  // data for X
  v_cmd_data[0] = x >> 8;
  v_cmd_data[1] = x;
  x += w - 1;
  v_cmd_data[2] = x >> 8;
  v_cmd_data[3] = x;
  // write
  display_WriteCommand( display_CASET );
  display_WriteData( v_cmd_data, sizeof(v_cmd_data) );
  // data for Y
  v_cmd_data[0] = y >> 8;
  v_cmd_data[1] = y;
  y += h - 1;
  v_cmd_data[2] = y >> 8;
  v_cmd_data[3] = y;
  // write
  display_WriteCommand( display_RASET );
  display_WriteData( v_cmd_data, sizeof(v_cmd_data) );
  //
  display_WriteCommand( display_RAMWR );
  // укажем, что будут передаваться данные
  GPIO_1->SET = GPIO_PIN_M(DISPLAY_DC_PIN);
}

// настройка подключения, SPI1
// здесь специфичные для подключения настройки.
// при использовании других выводов для подключения нужно соответственно подправить код
void display_Init( uint16_t a_width, uint16_t a_height, const uint8_t * a_init_sequence ) {
  // установка размеров
  g_display_width = a_width;
  g_display_height = a_height;
  // включение DMA
  PM->CLK_AHB_SET = PM_CLOCK_AHB_DMA_M;
  // включение PAD_CONFIG
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  // включение GPIO_1 и SPI1
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_1_M | PM_CLOCK_APB_P_SPI_1_M;
  // CS    PORT1.5 GPIO выход
  // LED   PORT1.0 GPIO выход
  // SDA   PORT1.1 SPI MOSI1
  // SCK   PORT1.2 SPI SCK1
  // NSS   PORT1.3 SPI NSS_IN
  // DC    PORT1.9 GPIO выход
  // RESET PORT1.8 GPIO выход
  // настройка выводов
  PAD_CONFIG->PORT_1_CFG = (PAD_CONFIG->PORT_1_CFG & ~( PAD_CONFIG_PIN_M(DISPLAY_DC_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_LED_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_RST_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_SCK_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_NSS_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_SDA_PIN)
                                                      | PAD_CONFIG_PIN_M(DISPLAY_CS_PIN) ))
                         | PAD_CONFIG_PIN(DISPLAY_SCK_PIN, 1)
                         | PAD_CONFIG_PIN(DISPLAY_SDA_PIN, 1)
                         | PAD_CONFIG_PIN(DISPLAY_NSS_PIN, 1)
                         ;
  PAD_CONFIG->PORT_1_DS = (PAD_CONFIG->PORT_1_DS & ~( PAD_CONFIG_PIN_M(DISPLAY_DC_PIN)
                                                    | PAD_CONFIG_PIN_M(DISPLAY_RST_PIN)
                                                    | PAD_CONFIG_PIN_M(DISPLAY_CS_PIN) ))
                        | PAD_CONFIG_PIN(DISPLAY_DC_PIN, 2)
                        | PAD_CONFIG_PIN(DISPLAY_CS_PIN, 2)
                        ;
  // а это финт ушами, подсмотренный в исходниках HAL
  // т.к. в модуле SPI нет "программного" управления состоянием бита "NSS", то приходится
  // использовать физический вывод SPI_1.NSS с подтяжкой к напряжению питания
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(DISPLAY_NSS_PIN)))
                        | PAD_CONFIG_PIN(DISPLAY_NSS_PIN, 1)
                        ;
  GPIO_1->DIRECTION_OUT = GPIO_PIN_M(DISPLAY_DC_PIN)
                        | GPIO_PIN_M(DISPLAY_RST_PIN)
                        | GPIO_PIN_M(DISPLAY_LED_PIN)
                        | GPIO_PIN_M(DISPLAY_CS_PIN)
                        ;
  GPIO_1->SET = GPIO_PIN_M(DISPLAY_DC_PIN)
              | GPIO_PIN_M(DISPLAY_RST_PIN)
              | GPIO_PIN_M(DISPLAY_LED_PIN)
              | GPIO_PIN_M(DISPLAY_CS_PIN)
              ;
  // настройка SPI1
  SPI_1->ENABLE = 0; // выключаем
  SPI_1->INT_DISABLE = 0xFFFFFFFF; // чистим флаги
  SPI_1->ENABLE = SPI_ENABLE_CLEAR_RX_FIFO_M | SPI_ENABLE_CLEAR_TX_FIFO_M; // чистим FIFO
  SPI_1->DELAY = 0; // никаких задержек
  SPI_1->TX_THR = 4; // граница заполнения FIFO на передачу
  SPI_1->CONFIG = SPI_CONFIG_MANUAL_CS_M // ручное управление сигналом CHIP_SELECT
                | SPI_CONFIG_CS_NONE_M // ни одно устройство не выбрано
                | SPI_CONFIG_BAUD_RATE_DIV_2_M // частота интерфейса 16 МГц
                | SPI_CONFIG_MODE_SEL_M // режим ведущего на шине SPI
                | SPI_CONFIG_CLK_PH_M
                | SPI_CONFIG_CLK_POL_M
                ;
  SPI_1->ENABLE = SPI_ENABLE_M; // включаем модуль SPI_1
  //
  DMA_CONFIG->CONFIG_STATUS = 0x3F + DMA_CONFIG_CURRENT_VALUE_M;
  // DMA[0] - канал для передачи по SPI1, адрес записи не увеличивается
  DMA_CONFIG->CHANNELS[0].DST = (uint32_t)&SPI_1->TXDATA; // пишем в регистр передаваемых данных (по факту в TX-FIFO)
  DMA_CONFIG->CHANNELS[0].CFG = DMA_CH_CFG_READ_MODE_MEMORY_M // читаем из памяти
                       | DMA_CH_CFG_WRITE_MODE_PERIPHERY_M // пишем в периферийное устройство (SPI_1)
                       | DMA_CH_CFG_READ_INCREMENT_M // увеличиваем адрес чтения (т.е. адрес памяти)
                       | (4 << DMA_CH_CFG_WRITE_REQUEST_S) // номер для SPI_1
                       ;
  // DMA[1] - канал для приёма по SPI1, адреса не увеличиваются
  DMA_CONFIG->CHANNELS[1].SRC = (uint32_t)&SPI_1->RXDATA; // читаем из регистра принятых данных (по факту из RX-FIFO)
  DMA_CONFIG->CHANNELS[1].DST = (uint32_t)&g_spi_dummy_read; // записываем принятое в память
  DMA_CONFIG->CHANNELS[1].CFG = DMA_CH_CFG_READ_MODE_PERIPHERY_M // читаем из периферийного устройства
                       | DMA_CH_CFG_WRITE_MODE_MEMORY_M // пишем в память
                       | (4 << DMA_CH_CFG_READ_REQUEST_S) // номер для SPI_1
                       ;
  // немного подождём
  delay_ms( 150u );
  // сброс контроллера экрана
  display_Reset();
  // выбираем контроллер экрана
  display_Select();
  // отправка команд настройки
  display_ExecuteCommandList( a_init_sequence );
  // снимаем сигнал выбора контроллера экрана
  display_Unselect();
}


//
void display_SetRotation( uint8_t a_madctl ) {
  display_Select();
  display_WriteCommand( display_MADCTL );
  uint8_t v_cmd_data = a_madctl;
  display_WriteData( &v_cmd_data, sizeof(v_cmd_data) );
  display_Unselect();
}


// вывести точку на экран
void display_DrawPixel(uint16_t x, uint16_t y, uint16_t color) {
    if((x >= g_display_width) || (y >= g_display_height))
        return;

    display_Select();

    display_SetAddressWindow(x, y, x, y);
    color = (color >> 8) | ((color & 0xFF) << 8);
    display_WriteData((uint8_t *)&color, sizeof(color));

    display_Unselect();
}


// вывод символа с использованием двойного буфера
// 1. подготовить для вывода строку N
// 2. ждать завершения передачи строки N-1
// 2. отправить строку N для передачи в SPI через DMA
// 3. подготовить для вывода строку N+1
// 4. ждать завершения передачи строки N
// 5. отправить строку N+1 для передачи в SPI через DMA
// 6. N+=2, goto 1
static void display_WriteChar(uint16_t x, uint16_t y, display_char_s * a_data) {
  bool v_last_row = false;
  uint32_t bytes_to_write = a_data->m_cols_count * sizeof(uint16_t);

  uint16_t line_buf1[MAX_FONT_WIDTH]; // буфер по максимальной ширине символа в шрифте
  uint16_t line_buf2[MAX_FONT_WIDTH]; // тож самое
  
  // окно вывода
  display_SetAddressWindow(x, y, x+a_data->m_symbol->m_x_advance-1, y+a_data->m_font->m_row_height-1);

  // передаём строку 1
  a_data->m_pixbuf = line_buf1;
  v_last_row = display_char_row( a_data );
  display_spi_write_start((uint8_t *)line_buf1, bytes_to_write);
  //
  while ( !v_last_row ) {
    // передаём строку 2
    a_data->m_pixbuf = line_buf2;
    v_last_row = display_char_row( a_data );
    display_spi_write_end();
    display_spi_write_start((uint8_t *)line_buf2, bytes_to_write);
    if ( v_last_row ) {
      break;
    }
    // передаём строку 1
    a_data->m_pixbuf = line_buf1;
    v_last_row = display_char_row( a_data );
    display_spi_write_end();
    display_spi_write_start((uint8_t *)line_buf1, bytes_to_write);
  }
  // ожидаем завершения передачи последней строки
  display_spi_write_end();
}


// посимвольный вывод строки текста
void display_WriteString(uint16_t x, uint16_t y, const char* str, const packed_font_desc_s * fnt, uint16_t color, uint16_t bgcolor) {
    bool v_used = false;
    display_char_s v_ds;
    uint16_t v_colors[8];

    display_Select();

    for ( uint32_t c = get_next_utf8_code( &str ); 0 != c; c = get_next_utf8_code( &str ) ) {
        if ( !v_used ) {
          v_used = true;
          display_char_init( &v_ds, c, fnt, 0, bgcolor, color, v_colors );
        } else {
          display_char_init2( &v_ds, c );
        }
        
        if ( (x + v_ds.m_symbol->m_x_advance) >= g_display_width ) {
            x = 0;
            y += v_ds.m_font->m_row_height;
            
            if ( (y + v_ds.m_font->m_row_height) >= g_display_height ) {
                break;
            }
        }

        display_WriteChar(x, y, &v_ds);
        x += v_ds.m_symbol->m_x_advance;
    }

    display_Unselect();
}


#define MAX_ONE_STR_SYMBOLS 20

// подготовить очередную строку для всех символов строки
bool prepare_char_line( uint16_t * a_buf, display_char_s * a_symbols, int a_symbols_count ) {
  bool v_result = false;

  // with all symbols  
  for ( int i = 0; i < a_symbols_count; ++i ) {
    // set dst buffer for output symbol's row
    a_symbols->m_pixbuf = a_buf;
    // put symbol's row into buffer
    v_result = display_char_row( a_symbols ) || v_result;
    // advance dst ptr for next symbol
    a_buf += a_symbols->m_symbol->m_x_advance;
    // to next stmbol
    ++a_symbols;
  }

  return v_result;
}


static void translate_dummy( uint16_t * a_dst, uint16_t * a_src, uint16_t * a_colors_1, uint16_t * a_colors_2, int a_last_color1_column, int a_width ) {
  int i;
  for ( i = 0; i < a_last_color1_column; ++i ) {
    a_dst[i] = a_colors_1[a_src[i]];
  }
  for ( ; i < a_width; ++i ) {
    a_dst[i] = a_colors_2[a_src[i]];
  }
}

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
            ) {
    // буфер из описаний символов для всех символов строки
    display_char_s v_ds[MAX_ONE_STR_SYMBOLS];
    // цвета для отображения символа, расчитываются один раз для первого символа
    // почему 8? потому, что символы отображаются точками разного цвета с плавным переходом (на 8 градаций)
    // от цвета символа к цвету фона, при этом символы выглядят сглаженными, нет резких границ
    uint16_t v_colors[8];
    bzero( v_colors, sizeof(v_colors) );
    // буферы для двух строк
    uint16_t line_buf1[display_MAX_LINE_PIXELS];
    uint16_t line_buf2[display_MAX_LINE_PIXELS];
    // размеры строки при выводе на экран
    int v_str_width = 0;
    int v_str_height = 0;
    get_text_extent( a_fnt, a_str, &v_str_width, &v_str_height );
    // позиция по горизонтали для первого символа
    int v_start_str_column = (a_width - v_str_width) / 2;
    if ( v_start_str_column < 0 ) {
      v_start_str_column = 0;
    }
    // текущая позиция по горизонтали
    int v_symbol_column = v_start_str_column;

    // подготовка структур для каждого символа
    int v_symbols_count = 0;
    // для каждого символа в строке
    for ( uint32_t c = get_next_utf8_code( &a_str ); 0 != c && v_symbols_count < MAX_ONE_STR_SYMBOLS; c = get_next_utf8_code( &a_str ) ) {
      // подготовка структуры для вывода символа
      // буфер для вывода указывается как nullptr, т.к. при использовании двойного буфера
      // всё равно подставляется указательна нужное место буфера строки
      if ( 0 == v_symbols_count ) {
        display_char_init( &v_ds[v_symbols_count], c, a_fnt, 0, a_bgcolor, a_color, v_colors );
      } else {
        // используем шрифт и цвета от первого символа
        display_char_init3( &v_ds[v_symbols_count], c, 0, &v_ds[v_symbols_count - 1] );
      }
      // проверяем по ширине, если шире заданного размера
      if ( (v_symbol_column + v_ds[v_symbols_count].m_symbol->m_x_advance) >= a_width ) {
        // то остальные символы не выводим
        break;
      }
      // переставляем позицию по горизонтали на следующий символ
      v_symbol_column += v_ds[v_symbols_count].m_symbol->m_x_advance;
      // увеличиваем счётчик отображаемых символов
      ++v_symbols_count;
    }
    // заполнение пустого места слева и справа от строки
    for ( int i = 0; i < v_start_str_column; ++i ) {
      line_buf1[i] = v_colors[0];
      line_buf2[i] = v_colors[0];
    }
    for ( int i = v_symbol_column; i < a_width; ++i ) {
      line_buf1[i] = v_colors[0];
      line_buf2[i] = v_colors[0];
    }
    
    bool v_last_row = false;
    uint32_t bytes_to_write = a_width * sizeof(uint16_t);
    
    display_Select();

    // окно вывода
    display_SetAddressWindow( a_x, a_y, a_x + a_width - 1, a_y + a_height - 1 );

    // выводим построчно с двойным буферированием
    uint16_t * start_line_buf1 = line_buf1 + v_start_str_column;
    uint16_t * start_line_buf2 = line_buf2 + v_start_str_column;
    
    // вывод строки 1
    v_last_row = prepare_char_line( start_line_buf1, v_ds, v_symbols_count );
    display_spi_write_start( (uint8_t *)line_buf1, bytes_to_write );
    //
    while ( !v_last_row ) {
      // вывод строки 2
      v_last_row = prepare_char_line( start_line_buf2, v_ds, v_symbols_count );
      display_spi_write_end();
      display_spi_write_start((uint8_t *)line_buf2, bytes_to_write);
      if ( v_last_row ) {
        break;
      }
      // вывод строки 1
      v_last_row = prepare_char_line( start_line_buf1, v_ds, v_symbols_count );
      display_spi_write_end();
      display_spi_write_start((uint8_t *)line_buf1, bytes_to_write);
    }
    // ожидание завершения передачи последней строки
    display_spi_write_end();

    display_Unselect();
}


// вывести строку текста по указанным координатам в прямоугольнике заданного размера
// строка центрируется по горизонтали и не должна быть шире экрана
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
            ) {
    // buffer for all display symbols
    display_char_s v_ds[MAX_ONE_STR_SYMBOLS];
    // display colors
    uint16_t v_colors[8]; // dummy
    uint16_t v_colors_1[8];
    uint16_t v_colors_2[8];
    build_colors_table( a_bgcolor_1, a_color, v_colors_1 );
    build_colors_table( a_bgcolor_2, a_color, v_colors_2 );
    // display line buffers
    uint16_t line_buf[display_MAX_LINE_PIXELS];
    uint16_t line_buf1[display_MAX_LINE_PIXELS];
    uint16_t line_buf2[display_MAX_LINE_PIXELS];
    // get text bounds
    int v_str_width = 0;
    int v_str_height = 0;
    get_text_extent( a_fnt, a_str, &v_str_width, &v_str_height );
    // start column for first symbol
    int v_start_str_column = (a_width - v_str_width) / 2;
    if ( v_start_str_column < 0 ) {
      v_start_str_column = 0;
    }
    // current column number
    int v_symbol_column = v_start_str_column;

    // prepare symbols
    int v_symbols_count = 0;
    // for each symbol in a_str
    for ( uint32_t c = get_next_utf8_code( &a_str ); 0 != c && v_symbols_count < MAX_ONE_STR_SYMBOLS; c = get_next_utf8_code( &a_str ) ) {
      // prepare display structure
      // buffer ptr set to 0 (zero), as it use double buffering by line
      if ( 0 == v_symbols_count ) {
        display_char_init( &v_ds[v_symbols_count], c, a_fnt, 0, 0, 0x0007, v_colors );
      } else {
        // reuse font, and colors from prev symbol
        display_char_init3( &v_ds[v_symbols_count], c, 0, &v_ds[v_symbols_count - 1] );
      }
      // check str width
      if ( (v_symbol_column + v_ds[v_symbols_count].m_symbol->m_x_advance) >= a_width ) {
        // string up to current symbol wider than display rectangle, skip it and other symbols
        break;
      }
      // advance display offset
      v_symbol_column += v_ds[v_symbols_count].m_symbol->m_x_advance;
      // advance symbols counter
      ++v_symbols_count;
    }
    // prepare paddings for line buffers
    for ( int i = 0; i < v_start_str_column; ++i ) {
      line_buf[i] = 0;
    }
    for ( int i = v_symbol_column; i < a_width; ++i ) {
      line_buf[i] = 0;
    }
    // prepare indices for colors
    for ( int i = 0; i < 8; ++i ) {
      v_colors[i] = (uint16_t)i;
    }
    //
    int v_last_color1_column = a_columns_1;

    bool v_last_row = false;
    uint32_t bytes_to_write = a_width * sizeof(uint16_t);
    
    display_Select();
    // окно вывода
    display_SetAddressWindow( a_x, a_y, a_x + a_width - 1, a_y + a_height - 1 );

    // line by line double buffered display
    uint16_t * start_line_buf = line_buf + v_start_str_column;
    
    // write line 1
    v_last_row = prepare_char_line( start_line_buf, v_ds, v_symbols_count );
    translate_dummy( line_buf1, line_buf, v_colors_1, v_colors_2, v_last_color1_column, a_width );
    display_spi_write_start( (uint8_t *)line_buf1, bytes_to_write );
    //
    while ( !v_last_row ) {
      // write line 2
      v_last_row = prepare_char_line( start_line_buf, v_ds, v_symbols_count );
      translate_dummy( line_buf2, line_buf, v_colors_1, v_colors_2, v_last_color1_column, a_width );
      display_spi_write_end();
      display_spi_write_start((uint8_t *)line_buf2, bytes_to_write);
      if ( v_last_row ) {
        break;
      }
      // write line 1
      v_last_row = prepare_char_line( start_line_buf, v_ds, v_symbols_count );
      translate_dummy( line_buf1, line_buf, v_colors_1, v_colors_2, v_last_color1_column, a_width );
      display_spi_write_end();
      display_spi_write_start((uint8_t *)line_buf1, bytes_to_write);
    }
    // end wait
    display_spi_write_end();

    display_Unselect();
}


// нарисовать закрашенный прямоугольник, по одной точке
void display_FillRectangle(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
    // clipping
    if((x >= g_display_width) || (y >= g_display_height)) return;
    if((x + w - 1) >= g_display_width) w = g_display_width - x;
    if((y + h - 1) >= g_display_height) h = g_display_height - y;

    display_Select();
    display_SetAddressWindow(x, y, x+w-1, y+h-1);

    color = (color >> 8) | ((color & 0xFF) << 8);
    for(y = h; y > 0; y--) {
        for(x = w; x > 0; x--) {
            display_spi_write( (uint8_t *)&color, sizeof(color) );
        }
    }

    display_Unselect();
}


// нарисовать закрашенный прямоугольник, по одной линии шириной w
void display_FillRectangleFast(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
    // clipping
    if((x >= g_display_width) || (y >= g_display_height)) return;
    if((x + w - 1) >= g_display_width) {
      w = g_display_width - x;
    }
    if((y + h - 1) >= g_display_height) {
      h = g_display_height - y;
    }

    display_Select();
    display_SetAddressWindow(x, y, x+w-1, y+h-1);

    // Prepare whole line in a single buffer
    color = (color >> 8) | ((color & 0xFF) << 8);
    uint16_t line[display_MAX_LINE_PIXELS];
    for(x = 0; x < w; ++x) {
      line[x] = color;
    }

    uint32_t line_bytes = w * sizeof(color);
    for(y = h; y > 0; y--) {
        display_spi_write( (uint8_t *)line, line_bytes );
    }

    display_Unselect();
}


// рисуем прямоугольник, заполненный цветом, составленным из двух одинаковых байтов
// здесь буфер не требуется, через DMA сразу передаются все пиксели прямоугольника
// соответственно, адрес источника в памяти не меняется, т.е. передаётся один байт color
void display_FillRectangleFast_2( uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint8_t color ) {
  // проверка на нулевые размеры
  if ( 0 == w || 0 == h ) {
    return;
  }
  // clipping
  if((x >= g_display_width) || (y >= g_display_height)) return;
  if((x + w - 1) >= g_display_width) {
    w = g_display_width - x;
  }
  if((y + h - 1) >= g_display_height) {
    h = g_display_height - y;
  }
  // количество передаваемых байтов
  uint32_t v_bytes = ((uint32_t)w) * h * sizeof(uint16_t);
  //
  display_Select();
  display_SetAddressWindow( x, y, x+w-1, y+h-1 );
  // запуск передачи немного отличается от стандартного
  // канал передачи не увеличивает значение указателя адреса,
  // т.е. всё время отправляется один и тот же байт
  DMA_CONFIG->CONFIG_STATUS = 0x3F + DMA_CONFIG_CURRENT_VALUE_M;
  DMA_CONFIG->CHANNELS[0].SRC = (uint32_t)&color;
  DMA_CONFIG->CHANNELS[0].CFG = DMA_CH_CFG_READ_MODE_MEMORY_M // читаем из памяти
                     | DMA_CH_CFG_WRITE_MODE_PERIPHERY_M // пишем в периферийное устройство (SPI_1)
                     | (4 << DMA_CH_CFG_WRITE_REQUEST_S) // номер для SPI_1
                     ;
  DMA_CONFIG->CHANNELS[0].LEN = v_bytes - 1u;
  // DMA[1] - приём SPI1
  DMA_CONFIG->CHANNELS[1].LEN = v_bytes - 1u;
  // enable DMA channel 1 for receive
  DMA_CONFIG->CHANNELS[1].CFG |= DMA_CH_CFG_ENABLE_M;
  // enable DMA1 channel 0 for transmit
  DMA_CONFIG->CHANNELS[0].CFG |= DMA_CH_CFG_ENABLE_M;
  //
  display_calc_timeout( v_bytes );
  //
  display_spi_write_end();
  //
  display_Unselect();
  // восстанавливаем конфигурацию канала передачи
  DMA_CONFIG->CHANNELS[0].CFG = DMA_CH_CFG_READ_MODE_MEMORY_M // читаем из памяти
                       | DMA_CH_CFG_WRITE_MODE_PERIPHERY_M // пишем в периферийное устройство (SPI_1)
                       | DMA_CH_CFG_READ_INCREMENT_M // увеличиваем адрес чтения (т.е. адрес памяти)
                       | (4 << DMA_CH_CFG_WRITE_REQUEST_S) // номер для SPI_1
                       ;
}


// залить весь экран одним цветом, по одной точке
void display_FillScreen(uint16_t color) {
    display_FillRectangle(0, 0, g_display_width, g_display_height, color);
}


// залить весь экран одним цветом, по одной линии шириной g_display_width
void display_FillScreenFast(uint16_t color) {
    display_FillRectangleFast(0, 0, g_display_width, g_display_height, color);
}


// залить весь экран одним цветом, по одной линии шириной g_display_width
void display_FillScreenFast_2(uint8_t color) {
    display_FillRectangleFast_2(0, 0, g_display_width, g_display_height, color);
}


void display_RawImage(int x, int y, int w, int h, const uint8_t * a_data) {
  if((x >= g_display_width) || (y >= g_display_height)) return;
  if((x + w - 1) >= g_display_width) return;
  if((y + h - 1) >= g_display_height) return;

  display_Select();
  display_SetAddressWindow((uint16_t)x, (uint16_t)y, (uint16_t)(x+w-1), (uint16_t)(y+h-1));
  
  display_spi_write( a_data, (uint32_t)(w * h * sizeof(uint16_t)) );

  display_Unselect();
}


// распаковать и вывести изображение, распаковка построчная, вывод с использованием двойного буфера
void display_DrawImage(int x, int y, int w, int h, const uint8_t * a_data, int a_data_len) {
  uint8_t v_image_line1[display_MAX_LINE_PIXELS * sizeof(uint16_t)];
  uint8_t v_image_line2[display_MAX_LINE_PIXELS * sizeof(uint16_t)];
  if((x >= g_display_width) || (y >= g_display_height)) return;
  if((x + w - 1) >= g_display_width) return;
  if((y + h - 1) >= g_display_height) return;
  uint32_t v_row_bytes = w * sizeof(uint16_t);

  struct zic_decompress_state_s v_st;
  zic_decompress_init( a_data, a_data_len, v_image_line1, w, h, &v_st );

  display_Select();
  display_SetAddressWindow((uint16_t)x, (uint16_t)y, (uint16_t)(x+w-1), (uint16_t)(y+h-1));

  if ( h > 0 ) {
    if ( zic_decompress_row( &v_st ) ) {
      display_spi_write_start( v_image_line1, v_row_bytes );
      for ( --h; h > 0; --h ) {
        v_st.m_row_ptr = v_image_line2;
        if ( zic_decompress_row( &v_st ) ) {
          display_spi_write_end();
          display_spi_write_start( v_image_line2, v_row_bytes );
        } else {
          break;
        }
        if ( --h <= 0 ) {
          break;
        }
        v_st.m_row_ptr = v_image_line1;
        if ( zic_decompress_row( &v_st ) ) {
          display_spi_write_end();
          display_spi_write_start( v_image_line1, v_row_bytes );
        } else {
          break;
        }
      }
    }
    display_spi_write_end();
  }
  
  display_Unselect();
}

void display_InvertColors(int invert) {
    display_Select();
    display_WriteCommand(invert ? display_INVON : display_INVOFF);
    display_Unselect();
}

void display_SetGamma(GammaDef gamma)
{
  uint8_t v_gamma = (uint8_t)gamma;
	display_Select();
	display_WriteCommand(display_GAMSET);
	display_WriteData(&v_gamma, sizeof(v_gamma));
	display_Unselect();
}


void display_set_config( uint8_t a_madctl_value ) {
	display_Select();
  display_WriteCommand( display_MADCTL );
  display_WriteData( &a_madctl_value, 1 );
	display_Unselect();
}


void display_set_bounds( uint16_t a_width, uint16_t a_height ) {
  g_display_width = a_width;
  g_display_height = a_height;
}



//
// picojpeg
//

static uint8_t cb_read_jpeg( uint8_t * a_buf, uint8_t a_buf_size, uint8_t * a_pbytes_read, void * a_pcb_data )
{
  pjpeg_need_bytes_callback_state_t * v_pst = (pjpeg_need_bytes_callback_state_t *)a_pcb_data;
  int n = min( v_pst->m_nInSize - v_pst->m_nInOfs, (int)a_buf_size );
   
  if ( 0 != n ) {
    memcpy( a_buf, v_pst->m_data + v_pst->m_nInOfs, n );
  }
  *a_pbytes_read = (uint8_t)n;
  v_pst->m_nInOfs += n;
  return 0;
}


static void draw_jpeg_grayscale( int x, int y, pjpeg_image_info_t * a_image_info ) {
  uint16_t v_draw_buffer[8*8]; // 8x8
  int v_x = 0;
  int v_y = 0;
  // декодируем блоки последовательно
  for ( int v_status = pjpeg_decode_mcu(); 0 == v_status; v_status = pjpeg_decode_mcu() ) {
    uint16_t * v_dst = v_draw_buffer;
    // каждый блок это просто 256 градаций яркости, 8х8
    int v_y_lim = min( min( 8, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    int v_x_lim = min( min( 8, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      uint8_t * v_src = a_image_info->m_pMCUBufR;
      for ( int iy = 0; iy < v_y_lim; ++iy ) {
        for ( int ix = 0; ix < v_x_lim; ++ix ) {
          uint16_t c = v_src[ix];
          c = RGB565(c, c, c);
          c = (c >> 8) | ((c & 0xFF) << 8);
          *v_dst++ = c;
        }
        v_src += 8;
      }
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      display_WriteData( (uint8_t *)v_draw_buffer, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 8;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 8;
    }
  }
}


static void draw_jpeg_yh1v1( int x, int y, pjpeg_image_info_t * a_image_info ) {
  uint16_t v_draw_buffer[8*8]; // 8x8
  int v_x = 0;
  int v_y = 0;
  // декодируем блоки последовательно
  for ( int v_status = pjpeg_decode_mcu(); 0 == v_status; v_status = pjpeg_decode_mcu() ) {
    uint16_t * v_dst = v_draw_buffer;
    // каждый блок это три интенсивности цвета RGB, 8х8
    int v_y_lim = min( min( 8, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    int v_x_lim = min( min( 8, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      uint8_t * v_srcR = a_image_info->m_pMCUBufR;
      uint8_t * v_srcG = a_image_info->m_pMCUBufG;
      uint8_t * v_srcB = a_image_info->m_pMCUBufB;
      for ( int iy = 0; iy < v_y_lim; ++iy ) {
        for ( int ix = 0; ix < v_x_lim; ++ix ) {
          uint16_t c = RGB565(v_srcR[ix], v_srcG[ix], v_srcB[ix]);
          c = (c >> 8) | ((c & 0xFF) << 8);
          *v_dst++ = c;
        }
        v_srcR += 8;
        v_srcG += 8;
        v_srcB += 8;
      }
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      display_WriteData( (uint8_t *)v_draw_buffer, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 8;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 8;
    }
  }
}


static void draw_jpeg_yh1v2( int x, int y, pjpeg_image_info_t * a_image_info ) {
  uint16_t v_draw_buffer[8*16]; // 8x16
  int v_x = 0;
  int v_y = 0;
  // декодируем блоки последовательно
  for ( int v_status = pjpeg_decode_mcu(); 0 == v_status; v_status = pjpeg_decode_mcu() ) {
    uint16_t * v_dst = v_draw_buffer;
    // каждый блок два набора RGB 8х8, со смещением 0 и 128
    int v_y_lim = min( min( 16, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    int v_x_lim = min( min( 8, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      uint8_t * v_srcR = a_image_info->m_pMCUBufR;
      uint8_t * v_srcG = a_image_info->m_pMCUBufG;
      uint8_t * v_srcB = a_image_info->m_pMCUBufB;
      for ( int iy = 0; iy < v_y_lim; ++iy ) {
        int v_y_off = (iy < 8) ? 0 : 64;
        for ( int ix = 0; ix < v_x_lim; ++ix ) {
          uint16_t c = RGB565(v_srcR[ix + v_y_off], v_srcG[ix + v_y_off], v_srcB[ix + v_y_off]);
          c = (c >> 8) | ((c & 0xFF) << 8);
          *v_dst++ = c;
        }
        v_srcR += 8;
        v_srcG += 8;
        v_srcB += 8;
      }
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      display_WriteData( (uint8_t *)v_draw_buffer, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 8;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 16;
    }
  }
}


static void draw_jpeg_yh2v1( int x, int y, pjpeg_image_info_t * a_image_info ) {
  uint16_t v_draw_buffer[16*8]; // 16x8
  int v_x = 0;
  int v_y = 0;
  // декодируем блоки последовательно
  for ( int v_status = pjpeg_decode_mcu(); 0 == v_status; v_status = pjpeg_decode_mcu() ) {
    uint16_t * v_dst = v_draw_buffer;
    // каждый блок два набора RGB 8х8, со смещением 0 и 64
    int v_y_lim = min( min( 8, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    int v_x_lim = min( min( 16, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      uint8_t * v_srcR = a_image_info->m_pMCUBufR;
      uint8_t * v_srcG = a_image_info->m_pMCUBufG;
      uint8_t * v_srcB = a_image_info->m_pMCUBufB;
      for ( int iy = 0; iy < v_y_lim; ++iy ) {
        for ( int ix = 0; ix < v_x_lim; ++ix ) {
          int v_off = (ix < 8) ? 0 : 56;
          uint16_t c = RGB565(v_srcR[ix + v_off], v_srcG[ix + v_off], v_srcB[ix + v_off]);
          c = (c >> 8) | ((c & 0xFF) << 8);
          *v_dst++ = c;
        }
        v_srcR += 8;
        v_srcG += 8;
        v_srcB += 8;
      }
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      display_WriteData( (uint8_t *)v_draw_buffer, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 16;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 8;
    }
  }
}


static void copy_block_h2v2( pjpeg_image_info_t * a_ii, int a_x_lim, int a_y_lim, uint16_t * a_dst ) {
  // каждый блок четыре набора RGB 8х8, со смещением 0, 64, 128, 192
  uint8_t * v_srcR = a_ii->m_pMCUBufR;
  uint8_t * v_srcG = a_ii->m_pMCUBufG;
  uint8_t * v_srcB = a_ii->m_pMCUBufB;
  for ( int iy = 0; iy < a_y_lim; ++iy ) {
    int v_y_off = (iy < 8) ? 0 : 64;
    for ( int ix = 0; ix < a_x_lim; ++ix ) {
      int v_off = ((ix < 8) ? 0 : 56) + v_y_off;
      *a_dst++ = RGB565FINAL(v_srcR[ix + v_off], v_srcG[ix + v_off], v_srcB[ix + v_off]);
    }
    v_srcR += 8;
    v_srcG += 8;
    v_srcB += 8;
  }
}


// вывод блоками 16х16 с двойным буфером
static void draw_jpeg_yh2v2_db( int x, int y, pjpeg_image_info_t * a_image_info ) {
  uint16_t v_draw_buffer1[16*16]; // 16x16
  uint16_t v_draw_buffer2[16*16]; // 16x16
  int v_x = 0;
  int v_y = 0;
  // декодируем первый блок
  if ( 0 != pjpeg_decode_mcu() ) {
    return;
  }
  // первый блок копируем в буфер2
  int v_y_lim = min( min( 16, g_display_height - y - v_y ), a_image_info->m_height - v_y );
  int v_x_lim = min( min( 16, g_display_width - x - v_x ), a_image_info->m_width - v_x );
  copy_block_h2v2( a_image_info, v_x_lim, v_y_lim, v_draw_buffer2 );
  // окно вывода
  display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
  // запускаем передачу буфера2 через DMA
  display_spi_write_start( (uint8_t *)v_draw_buffer2, v_x_lim * v_y_lim * sizeof(uint16_t) );
  v_x += 16;
  if ( v_x >= a_image_info->m_width ) {
    v_x = 0;
    v_y += 16;
  }
  // декодируем блоки последовательно
  for ( ;; ) {
    if ( 0 != pjpeg_decode_mcu() ) {
      break;
    }
    // очередной блок копируем в буфер1
    v_y_lim = min( min( 16, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    v_x_lim = min( min( 16, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      copy_block_h2v2( a_image_info, v_x_lim, v_y_lim, v_draw_buffer1 );
      // ждём окончания передачи из буфера2
      display_spi_write_end();
      // окно вывода
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      // запускаем передачу буфера1 через DMA
      display_spi_write_start( (uint8_t *)v_draw_buffer1, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 16;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 16;
    }
    // декодируем следующий блок
    if ( 0 != pjpeg_decode_mcu() ) {
      break;
    }
    // очередной блок копируем в буфер2
    int v_y_lim = min( min( 16, g_display_height - y - v_y ), a_image_info->m_height - v_y );
    if ( v_y_lim <= 0 ) {
      break;
    }
    int v_x_lim = min( min( 16, g_display_width - x - v_x ), a_image_info->m_width - v_x );
    if ( v_x_lim > 0 ) {
      copy_block_h2v2( a_image_info, v_x_lim, v_y_lim, v_draw_buffer2 );
      // ждём окончания передачи из буфера1
      display_spi_write_end();
      // окно вывода
      display_set_addr_window_dma( (uint16_t)(x + v_x), (uint16_t)(y + v_y), (uint16_t)v_x_lim, (uint16_t)v_y_lim );
      // запускаем передачу буфера2 через DMA
      display_spi_write_start( (uint8_t *)v_draw_buffer2, v_x_lim * v_y_lim * sizeof(uint16_t) );
    }
    v_x += 16;
    if ( v_x >= a_image_info->m_width ) {
      v_x = 0;
      v_y += 16;
    }
  }
  // ждём окончания передачи
  display_spi_write_end();
}


// вывести на экран изображение, упакованное в формате JPEG
void display_draw_jpeg_image( int x, int y, const uint8_t * a_data, int a_data_len ) {
  pjpeg_need_bytes_callback_state_t v_callback_state;
  pjpeg_image_info_t v_image_info;
  
  // проверяем, отобразится ли хоть что-нибудь
  if ( x >= g_display_width || y >= g_display_height ) {
    return;
  }
  // данные для подгрузки файла
  v_callback_state.m_data = a_data;
  v_callback_state.m_nInOfs = 0;
  v_callback_state.m_nInSize = a_data_len;
  // инициализация декодера
  uint8_t v_status = pjpeg_decode_init( &v_image_info, cb_read_jpeg, &v_callback_state, 0 );
  //
  if ( 0 != v_status ) {
    // что-то пошло не так
    return;
  }
  display_Select();
  switch ( v_image_info.m_scanType ) {
    case PJPG_GRAYSCALE:
      draw_jpeg_grayscale( x, y, &v_image_info );
      break;
      
    case PJPG_YH1V1:
      draw_jpeg_yh1v1( x, y, &v_image_info );
      break;
      
    case PJPG_YH1V2:
      draw_jpeg_yh1v2( x, y, &v_image_info );
      break;
      
    case PJPG_YH2V1:
      draw_jpeg_yh2v1( x, y, &v_image_info );
      break;
      
    case PJPG_YH2V2:
      draw_jpeg_yh2v2_db( x, y, &v_image_info );
      break;
  }
  display_Unselect();
}
