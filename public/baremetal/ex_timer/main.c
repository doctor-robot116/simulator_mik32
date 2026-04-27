#include "ili9341.h"
#include "xpt2046.h"
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/gpio_irq.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/epic.h>
#include <mik32_hwlibs/timer32.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/spi.h>
#include <mik32_hwlibs/eeprom.h>
#include <mik32_hwlibs/crc.h>
#include <mik32_hwlibs/analog_reg.h>
#include <fonts/font_25_30.h>

#include <0_.tga.h>
#include <1_.tga.h>
#include <2_.tga.h>
#include <3_.tga.h>
#include <4_.tga.h>
#include <5_.tga.h>
#include <6_.tga.h>
#include <7_.tga.h>
#include <8_.tga.h>
#include <9_.tga.h>
#include <action_pressed.h>
#include <action_released.h>
#include <minus_pressed.h>
#include <minus_released.h>
#include <plus_pressed.h>
#include <plus_released.h>
#include <ind_on.tga.h>
#include <ind_off.tga.h>
#include <clock00.tga.h>
#include <clock01.tga.h>
#include <clock02.tga.h>
#include <clock03.tga.h>
#include <clock04.tga.h>
#include <clock05.tga.h>
#include <clock06.tga.h>
#include <clock07.tga.h>
#include <clock08.tga.h>
#include <clock09.tga.h>
#include <clock10.tga.h>
#include <clock11.tga.h>
#include <clock12.tga.h>
#include <clock13.tga.h>
#include <clock14.tga.h>
#include <clock15.tga.h>
#include <clock16.tga.h>

#include <runtime.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>


#define DISPLAY_WIDTH  ILI9341_WIDTH
#define DISPLAY_HEIGHT ILI9341_HEIGHT


// отсчёты для косинуса, 4096 уровней для ЦАП, размещается в ОЗУ, чтобы доступ по времени был предсказуемым
// на случай LTO оптимизации, помещаем таблицу явно в секцию .data
// так как оптимизатор видит, что обращение к таблице только для чтения и помещает её
// в секцию констант, которая попадает в SPI Flash (если собирается для SPIFI)
__attribute((section(".data.g_cos_table_dac")))
uint16_t g_cos_table_dac[1024] = {
  2047, 2060, 2073, 2085, 2098, 2110, 2123, 2135
, 2148, 2161, 2173, 2186, 2198, 2211, 2223, 2236
, 2248, 2261, 2273, 2286, 2298, 2311, 2323, 2336
, 2348, 2360, 2373, 2385, 2398, 2410, 2422, 2435
, 2447, 2459, 2472, 2484, 2496, 2508, 2521, 2533
, 2545, 2557, 2569, 2582, 2594, 2606, 2618, 2630
, 2642, 2654, 2666, 2678, 2690, 2702, 2714, 2726
, 2737, 2749, 2761, 2773, 2785, 2796, 2808, 2820
, 2831, 2843, 2854, 2866, 2877, 2889, 2900, 2912
, 2923, 2934, 2946, 2957, 2968, 2980, 2991, 3002
, 3013, 3024, 3035, 3046, 3057, 3068, 3079, 3090
, 3100, 3111, 3122, 3133, 3143, 3154, 3164, 3175
, 3185, 3196, 3206, 3216, 3227, 3237, 3247, 3257
, 3267, 3278, 3288, 3298, 3307, 3317, 3327, 3337
, 3347, 3356, 3366, 3376, 3385, 3395, 3404, 3414
, 3423, 3432, 3441, 3451, 3460, 3469, 3478, 3487
, 3496, 3505, 3513, 3522, 3531, 3539, 3548, 3557
, 3565, 3573, 3582, 3590, 3598, 3606, 3615, 3623
, 3631, 3639, 3646, 3654, 3662, 3670, 3677, 3685
, 3692, 3700, 3707, 3715, 3722, 3729, 3736, 3743
, 3750, 3757, 3764, 3771, 3778, 3784, 3791, 3798
, 3804, 3811, 3817, 3823, 3829, 3836, 3842, 3848
, 3854, 3860, 3865, 3871, 3877, 3882, 3888, 3893
, 3899, 3904, 3909, 3915, 3920, 3925, 3930, 3935
, 3940, 3944, 3949, 3954, 3958, 3963, 3967, 3972
, 3976, 3980, 3984, 3988, 3992, 3996, 4000, 4004
, 4007, 4011, 4014, 4018, 4021, 4025, 4028, 4031
, 4034, 4037, 4040, 4043, 4046, 4048, 4051, 4054
, 4056, 4059, 4061, 4063, 4065, 4067, 4069, 4071
, 4073, 4075, 4077, 4079, 4080, 4082, 4083, 4084
, 4086, 4087, 4088, 4089, 4090, 4091, 4092, 4092
, 4093, 4094, 4094, 4095, 4095, 4095, 4095, 4095
, 4095, 4095, 4095, 4095, 4095, 4095, 4094, 4094
, 4093, 4092, 4092, 4091, 4090, 4089, 4088, 4087
, 4086, 4084, 4083, 4082, 4080, 4079, 4077, 4075
, 4073, 4071, 4069, 4067, 4065, 4063, 4061, 4059
, 4056, 4054, 4051, 4048, 4046, 4043, 4040, 4037
, 4034, 4031, 4028, 4025, 4021, 4018, 4014, 4011
, 4007, 4004, 4000, 3996, 3992, 3988, 3984, 3980
, 3976, 3972, 3967, 3963, 3958, 3954, 3949, 3944
, 3940, 3935, 3930, 3925, 3920, 3915, 3909, 3904
, 3899, 3893, 3888, 3882, 3877, 3871, 3865, 3860
, 3854, 3848, 3842, 3836, 3829, 3823, 3817, 3811
, 3804, 3798, 3791, 3784, 3778, 3771, 3764, 3757
, 3750, 3743, 3736, 3729, 3722, 3715, 3707, 3700
, 3692, 3685, 3677, 3670, 3662, 3654, 3646, 3639
, 3631, 3623, 3615, 3606, 3598, 3590, 3582, 3573
, 3565, 3557, 3548, 3539, 3531, 3522, 3513, 3505
, 3496, 3487, 3478, 3469, 3460, 3451, 3441, 3432
, 3423, 3414, 3404, 3395, 3385, 3376, 3366, 3356
, 3347, 3337, 3327, 3317, 3307, 3298, 3288, 3278
, 3267, 3257, 3247, 3237, 3227, 3216, 3206, 3196
, 3185, 3175, 3164, 3154, 3143, 3133, 3122, 3111
, 3100, 3090, 3079, 3068, 3057, 3046, 3035, 3024
, 3013, 3002, 2991, 2980, 2968, 2957, 2946, 2934
, 2923, 2912, 2900, 2889, 2877, 2866, 2854, 2843
, 2831, 2820, 2808, 2796, 2785, 2773, 2761, 2749
, 2737, 2726, 2714, 2702, 2690, 2678, 2666, 2654
, 2642, 2630, 2618, 2606, 2594, 2582, 2569, 2557
, 2545, 2533, 2521, 2508, 2496, 2484, 2472, 2459
, 2447, 2435, 2422, 2410, 2398, 2385, 2373, 2360
, 2348, 2336, 2323, 2311, 2298, 2286, 2273, 2261
, 2248, 2236, 2223, 2211, 2198, 2186, 2173, 2161
, 2148, 2135, 2123, 2110, 2098, 2085, 2073, 2060
, 2047, 2035, 2022, 2010, 1997, 1985, 1972, 1960
, 1947, 1934, 1922, 1909, 1897, 1884, 1872, 1859
, 1847, 1834, 1822, 1809, 1797, 1784, 1772, 1759
, 1747, 1735, 1722, 1710, 1697, 1685, 1673, 1660
, 1648, 1636, 1623, 1611, 1599, 1587, 1574, 1562
, 1550, 1538, 1526, 1513, 1501, 1489, 1477, 1465
, 1453, 1441, 1429, 1417, 1405, 1393, 1381, 1369
, 1358, 1346, 1334, 1322, 1310, 1299, 1287, 1275
, 1264, 1252, 1241, 1229, 1218, 1206, 1195, 1183
, 1172, 1161, 1149, 1138, 1127, 1115, 1104, 1093
, 1082, 1071, 1060, 1049, 1038, 1027, 1016, 1005
, 995, 984, 973, 962, 952, 941, 931, 920
, 910, 899, 889, 879, 868, 858, 848, 838
, 828, 817, 807, 797, 788, 778, 768, 758
, 748, 739, 729, 719, 710, 700, 691, 681
, 672, 663, 654, 644, 635, 626, 617, 608
, 599, 590, 582, 573, 564, 556, 547, 538
, 530, 522, 513, 505, 497, 489, 480, 472
, 464, 456, 449, 441, 433, 425, 418, 410
, 403, 395, 388, 380, 373, 366, 359, 352
, 345, 338, 331, 324, 317, 311, 304, 297
, 291, 284, 278, 272, 266, 259, 253, 247
, 241, 235, 230, 224, 218, 213, 207, 202
, 196, 191, 186, 180, 175, 170, 165, 160
, 155, 151, 146, 141, 137, 132, 128, 123
, 119, 115, 111, 107, 103, 99, 95, 91
, 88, 84, 81, 77, 74, 70, 67, 64
, 61, 58, 55, 52, 49, 47, 44, 41
, 39, 36, 34, 32, 30, 28, 26, 24
, 22, 20, 18, 16, 15, 13, 12, 11
, 9, 8, 7, 6, 5, 4, 3, 3
, 2, 1, 1, 0, 0, 0, 0, 0
, 0, 0, 0, 0, 0, 0, 1, 1
, 2, 3, 3, 4, 5, 6, 7, 8
, 9, 11, 12, 13, 15, 16, 18, 20
, 22, 24, 26, 28, 30, 32, 34, 36
, 39, 41, 44, 47, 49, 52, 55, 58
, 61, 64, 67, 70, 74, 77, 81, 84
, 88, 91, 95, 99, 103, 107, 111, 115
, 119, 123, 128, 132, 137, 141, 146, 151
, 155, 160, 165, 170, 175, 180, 186, 191
, 196, 202, 207, 213, 218, 224, 230, 235
, 241, 247, 253, 259, 266, 272, 278, 284
, 291, 297, 304, 311, 317, 324, 331, 338
, 345, 352, 359, 366, 373, 380, 388, 395
, 403, 410, 418, 425, 433, 441, 449, 456
, 464, 472, 480, 489, 497, 505, 513, 522
, 530, 538, 547, 556, 564, 573, 582, 590
, 599, 608, 617, 626, 635, 644, 654, 663
, 672, 681, 691, 700, 710, 719, 729, 739
, 748, 758, 768, 778, 788, 797, 807, 817
, 828, 838, 848, 858, 868, 879, 889, 899
, 910, 920, 931, 941, 952, 962, 973, 984
, 995, 1005, 1016, 1027, 1038, 1049, 1060, 1071
, 1082, 1093, 1104, 1115, 1127, 1138, 1149, 1161
, 1172, 1183, 1195, 1206, 1218, 1229, 1241, 1252
, 1264, 1275, 1287, 1299, 1310, 1322, 1334, 1346
, 1358, 1369, 1381, 1393, 1405, 1417, 1429, 1441
, 1453, 1465, 1477, 1489, 1501, 1513, 1526, 1538
, 1550, 1562, 1574, 1587, 1599, 1611, 1623, 1636
, 1648, 1660, 1673, 1685, 1697, 1710, 1722, 1735
, 1747, 1759, 1772, 1784, 1797, 1809, 1822, 1834
, 1847, 1859, 1872, 1884, 1897, 1909, 1922, 1934
, 1947, 1960, 1972, 1985, 1997, 2010, 2022, 2035
};

#define DDS_FREQ_1 618475291u   // 3600 Гц
#define DDS_FREQ_2 721554506u   // 4200 Гц

volatile bool g_sound_on = false;


uint32_t mik32_crc( const uint8_t * a_buf, int a_len );
bool display_numbers( int a_num );
bool test_left_num( int x, int y );
bool test_right_num( int x, int y );
void calibrate_touchscreen();
bool setup_timer();
bool do_timer();
bool test_minus_button( int x, int y );
bool test_plus_button( int x, int y );
bool test_go_button( int x, int y );
void screen_saver();
void do_alarm();

// последние отрисованные цифры в десятках и единицах
static int g_last_ones;
static int g_last_decs;


#define EEPROM_LAST_PAGE_OFFSET (EEPROM_SIZE-EEPROM_PAGE_SIZE)
#define EEPROM_LAST_PAGE_ADDR (EEPROM_BASE_ADDRESS+EEPROM_LAST_PAGE_OFFSET)

// структура для хранения в EEPROM коэффициентов калибровки тачскрина
typedef union {
  struct touch_coeff_s {
    int Ax;
    int Bx;
    int Dx;
    int Ay;
    int By;
    int Dy;
    uint32_t crc32;
  } coeff;
  uint32_t dummy[32];
} touch_coeff_eeprom_page;


// количество минут таймера
int g_minutes = 0;


// настрока тактирования, UART_0, TIMER32_0, системного таймера, CRC
void process_init_mcu() {
  // включаем тактирование GPIO
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_2_M;
  // PORT2.7 - GPIO
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~(PAD_CONFIG_PIN_M(7)));
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(PAD_CONFIG_PIN_M(7)))
                        | PAD_CONFIG_PIN(7, 2)
                        ;
  // PORT2.7 выход (на плате ACE-UNO к этому выводу подключен светодиод)
  GPIO_2->DIRECTION_OUT = (1 << 7);
  GPIO_2->CLEAR = (1 << 7); // светодиод выключен
  // теперь настройка UART_0
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_UART_0_M;
  // PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(6)))
                          ;
  // UART_0
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 278; // 32000000/115200
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M;
  // ждём готовности
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}  // включаем тактирование TIMER32_0 и EPIC
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_TIMER32_0_M | PM_CLOCK_APB_M_EPIC_M;
  // выбираем истоником тактового сигнала для TIMER32_0 системную частоту
  PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
  // DAC
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_ANALOG_REGS_M;
  // типа выставляем бит включения и убираем "сигнал сброса"
  ANALOG_REG->DAC0.CFG = DAC_CFG_EN_M | DAC_CFG_RN_M;
  // для DAC1 выставляется делитель "частоты тактового сигнала", при используемых настройках
  // разницы для делителей 1 и 256 на глаз не обнаружено, а в документации про эту "частоту" ничего не сказано
  ANALOG_REG->DAC1.CFG = DAC_CFG_EN_M | DAC_CFG_RN_M | (255 << DAC_CFG_DIV_S);
  // конфигурируем выходы PORT1.12 и PORT1.13, аналоговый, "подтяжки" отключены
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_1_M;
  PAD_CONFIG->PORT_1_CFG |= (PAD_CONFIG->PORT_1_CFG & ~(PAD_CONFIG_PIN_M(12) | PAD_CONFIG_PIN_M(13)))
                         | PAD_CONFIG_PIN_M(12)
                         | PAD_CONFIG_PIN_M(13)
                         ;
  PAD_CONFIG->PORT_1_PUPD = (PAD_CONFIG->PORT_1_PUPD & ~(PAD_CONFIG_PIN_M(12) | PAD_CONFIG_PIN_M(13)));
  // настройка TIMER32_0
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
  TIMER32_0->TOP = 1279; // отсчёт 1280 тактов (25 кГц)
  TIMER32_0->PRESCALER = 0; // /1
  TIMER32_0->CONTROL = 0;
  TIMER32_0->INT_MASK = 0;
  TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_EN_M;
  // разрешаем прерывания по переполнению
  TIMER32_0->INT_MASK = TIMER32_INT_OVERFLOW_M;
  // разрешаем прерывание от TIMER32_0
  EPIC->MASK_LEVEL_SET = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  set_csr(mie, MIE_MEIE);
  // CRC, используем в варианте CRC32/POSIX
  PM->CLK_AHB_SET = PM_CLOCK_AHB_CRC32_M;
  CRC->POLY = 0x04C11DB7;
}


// точка входа после сброса
void main() {
  // инициализация экрана
  ILI9341_Init();
  // инициализация тачскрина
  xpt2046_init();
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
  xpt2046_wait_release( 2048u );
  // проверим, была ли калибровка или может нажатие на экран
  touch_coeff_eeprom_page * v_page = (touch_coeff_eeprom_page *)EEPROM_LAST_PAGE_ADDR;
  if ( !xpt2046_touched()
    && mik32_crc( (const uint8_t *)v_page, sizeof(v_page->coeff) - sizeof(uint32_t) ) == v_page->coeff.crc32 ) {
    // да, калибровочные данные есть и на экран не нажимали при включении
    xpt2046_set_coeff( v_page->coeff.Ax, v_page->coeff.Bx, v_page->coeff.Dx, v_page->coeff.Ay, v_page->coeff.By, v_page->coeff.Dy );
  } else {
    // калибровка тачскрина
    calibrate_touchscreen();
  }
  // основной цикл
  for (;;) {
    g_last_decs = g_last_ones = -1;
    if ( xpt2046_touched() ) {
      xpt2046_wait_release( 40960u );
      display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
      // настройка таймера и запуск
      if ( setup_timer() ) {
        // короткий бибик в честь запуска таймера
        g_sound_on = true;
        delay_ms( 200u );
        g_sound_on = false;
        // отработка таймера
        if ( do_timer() ) {
          do_alarm();
        } else {
          // счёт таймера был отменён
          g_sound_on = true;
          delay_ms( 200u );
          g_sound_on = false;
          if ( xpt2046_touched() ) {
            display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
            xpt2046_wait_release( 40960u );
          }
        }
      }
      // очистка экрана
      display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
    } else {
      screen_saver();
    }
  }
}


// информация о картинке, представляющей цифру
typedef struct {
  const uint8_t * m_ptr;
  int m_size;
} zic_def_t;

// массив из 10 структур и инфой о каждой цифре от 0 до 9
const zic_def_t g_num_array[10] = {
    { I0__tga_zic, sizeof(I0__tga_zic) }
  , { I1__tga_zic, sizeof(I1__tga_zic) }
  , { I2__tga_zic, sizeof(I2__tga_zic) }
  , { I3__tga_zic, sizeof(I3__tga_zic) }
  , { I4__tga_zic, sizeof(I4__tga_zic) }
  , { I5__tga_zic, sizeof(I5__tga_zic) }
  , { I6__tga_zic, sizeof(I6__tga_zic) }
  , { I7__tga_zic, sizeof(I7__tga_zic) }
  , { I8__tga_zic, sizeof(I8__tga_zic) }
  , { I9__tga_zic, sizeof(I9__tga_zic) }
};

// последние отрисованные цифры в десятках и единицах
static int g_last_ones = -1;
static int g_last_decs = -1;


// отрисовать двузначное десятичное число
bool display_numbers( int a_num ) {
  bool v_result = false;
  // цифра в десятках
  int i = (a_num / 10) % 10;
  // была нарисована другая цифра
  if ( i != g_last_decs ) {
    display_DrawImage(
        (DISPLAY_WIDTH - 128 - 128) / 2
      , (DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4
      , 128, 160
      , g_num_array[i].m_ptr, g_num_array[i].m_size
      );
    g_last_decs = i;
    v_result = true;
  }
  i = a_num % 10;
  if ( i != g_last_ones ) {
    display_DrawImage(
          (DISPLAY_WIDTH - 128 - 128) / 2 + 128
        , (DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4
      , 128, 160
      , g_num_array[i].m_ptr, g_num_array[i].m_size
      );
    g_last_ones = i;
    v_result = true;
  }
  // вернёт true, если что-нибудь было перерисовано
  return v_result;
}


bool test_left_num( int x, int y ) {
  return
       x >= ((DISPLAY_WIDTH - 128 - 128) / 2)
    && x <= (((DISPLAY_WIDTH - 128 - 128) / 2) + 128)
    && y >= ((DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4)
    && y <= (((DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4) + 160)
    ;
}

bool test_right_num( int x, int y ) {
  return
       x >= (((DISPLAY_WIDTH - 128 - 128) / 2) + 128)
    && x <= ((((DISPLAY_WIDTH - 128 - 128) / 2) + 128) + 128)
    && y >= ((DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4)
    && y <= (((DISPLAY_HEIGHT - Iaction_released_tga_height - 160) / 4) + 160)
    ;
}

uint32_t g_phase_1 = 0, g_phase_2 = 0, g_phase_3 = 0, g_phase_4 = 0;


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // если звук отключен, то молчим
    if ( !g_sound_on ) {
      ANALOG_REG->DAC0.VALUE = 2048u;
      ANALOG_REG->DAC1.VALUE = 2048u;
    } else {
      // амплитуды для двух частот складываем (индекс в таблице отсчётов - старшие 10 бит счётчика "фазы")
      uint32_t v_amp = g_cos_table_dac[g_phase_1 >> 22];
      v_amp += g_cos_table_dac[g_phase_2 >> 22];
      // результат делим на два
      v_amp /= 2;
      // следующее преобразование
      ANALOG_REG->DAC0.VALUE = v_amp;
      ANALOG_REG->DAC1.VALUE = 4096u - v_amp; // сдвинутое по фазе на 180 градусов
      //
      g_phase_1 += DDS_FREQ_1;
      g_phase_2 += DDS_FREQ_2;
    }
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return true;
  } else {
    return false;
  }
}


//
uint32_t mik32_crc( const uint8_t * a_buf, int a_len ) {
  // настройки с включенным битом записи начального значения
  CRC->CTRL = CRC_CTRL_TOT_BYTES_M
            | CRC_CTRL_TOTR_NONE_M
            | CRC_CTRL_FXOR_M
            | CRC_CTRL_WAS_M;
            ;
  // начальное значение
  CRC->DATA32 = 0;
  // обязательное чтение CRC->CTRL формирует необходимую задержку после записи в CRC->DATA32
  CRC->CTRL;
  // настройки с выключенным битом записи начального значения
  CRC->CTRL = CRC_CTRL_TOT_BYTES_M
            | CRC_CTRL_TOTR_NONE_M
            | CRC_CTRL_FXOR_M
            ;
  //
  while ( 0 != a_len ) {
    if ( a_len >= 4 ) {
      CRC->DATA32 = (a_buf[0] << 24)
                  | (a_buf[1] << 16)
                  | (a_buf[2] << 8)
                  | a_buf[3]
                  ;
      a_buf += 4;
      a_len -= 4;
    } else {
      if ( a_len >= 2 ) {
        CRC->DATA16 = (a_buf[0] << 8)
                    | a_buf[1]
                    ;
        a_buf += 2;
        a_len -= 2;
      } else {
        CRC->DATA8 = *a_buf;
        // один байт всегда последний
        break;
      }
    }
  }
  // на всяк случай задержка после записи в CRC->DATA
  CRC->CTRL;
  // ожидаем завершения обработки
  while ( 0 != (CRC->CTRL & CRC_CTRL_BUSY_M) ) {}
  return CRC->DATA32;
}


// стереть страницу EEPROM по указанному смещению
// a_page_offset должно быть смещением страницы, т.е. выровнено по границе 128 байт
bool eeprom_page_erase( uint32_t a_page_offset ) {
  // стирание страницы
  EEPROM_REGS->EEA = a_page_offset;
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     ;
  for ( size_t i = 0; i < (EEPROM_PAGE_SIZE / sizeof(uint32_t)); ++i ) {
    EEPROM_REGS->EEDAT = 0;
  }
  // запуск стирания
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     | EEPROM_EECON_OP(EEPROM_EECON_OP_ERASE)
                     | EEPROM_EECON_EX_M
                     ;
  // ждём
  for (uint32_t v_from = g_milliseconds; (g_milliseconds - v_from) < 250u; ) {
    if ( 0 == (EEPROM_REGS->EESTA & EEPROM_EESTA_BSY_M) ) {
      return true;
    }
  }
  // не дождались
  return false;
}


// записать страницу EEPROM по указанному смещению
// a_page_offset должно быть смещением страницы, т.е. выровнено по границе 128 байт
// a_page_data должно указывать на массив uint32_t[32] и адрес должен быть выравнен по границе в 4 байта
bool eeprom_page_program( uint32_t a_page_offset, uint32_t * a_page_data ) {
  // пишем
  EEPROM_REGS->EEA = a_page_offset;
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     ;
  for ( size_t i = 0; i < (EEPROM_PAGE_SIZE / sizeof(uint32_t)); ++i ) {
    EEPROM_REGS->EEDAT = a_page_data[i];
  }
  // старт записи
  EEPROM_REGS->EECON = EEPROM_EECON_BWE_M
                     | EEPROM_EECON_WRBEH(EEPROM_EECON_WRBEH_ONE_PAGE)
                     | EEPROM_EECON_OP(EEPROM_EECON_OP_PROG)
                     | EEPROM_EECON_EX_M
                     ;
  // ждём
  for (uint32_t v_from = g_milliseconds; (g_milliseconds - v_from) < 250u; ) {
    if ( 0 == (EEPROM_REGS->EESTA & EEPROM_EESTA_BSY_M) ) {
      // дождались
      return true;
    }
  }
  //
  return false;
}


// калибровка тачскрина с записью полученных коэффициентов в последнюю страницу EEPROM
// так что загрузчик в EEPROM должен быть размером не более 8192 - 128 байтов :)
void calibrate_touchscreen() {
  // калибровка
  // идея подсмотрена в https://embedded.icu/article/mikrokontrollery/rabota-s-rezistivnym-sensornym-ekranom
  // после калибровки координаты касаний будут соответствовать координатам в системе координат экрана
  // с учётов поворота осей и зеркалирования
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
  if ( xpt2046_touched() ) {
    int v_y = (DISPLAY_HEIGHT - (font_25_30_font.m_row_height * 3)) / 2;
    display_WriteStringWithBackground(
          0, v_y
        , DISPLAY_WIDTH, font_25_30_font.m_row_height
        , "Для начала"
        , &font_25_30_font
        , DISPLAY_COLOR_GREEN
        , DISPLAY_COLOR_BLACK
        );
    display_WriteStringWithBackground(
          0, v_y + font_25_30_font.m_row_height
        , DISPLAY_WIDTH, font_25_30_font.m_row_height
        , "калибровки"
        , &font_25_30_font
        , DISPLAY_COLOR_GREEN
        , DISPLAY_COLOR_BLACK
        );
    display_WriteStringWithBackground(
          0, v_y + (font_25_30_font.m_row_height * 2)
        , DISPLAY_WIDTH, font_25_30_font.m_row_height
        , "отпустите экран."
        , &font_25_30_font
        , DISPLAY_COLOR_GREEN
        , DISPLAY_COLOR_BLACK
        );
    while( xpt2046_touched() ) {}
  }
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
  //
  int v_y = (DISPLAY_HEIGHT - (font_25_30_font.m_row_height * 3)) / 2;
  display_WriteStringWithBackground(
        0, v_y
      , DISPLAY_WIDTH, font_25_30_font.m_row_height
      , "КАЛИБРОВКА"
      , &font_25_30_font
      , DISPLAY_COLOR_YELLOW
      , DISPLAY_COLOR_BLUE
      );
  display_WriteStringWithBackground(
        0, v_y + font_25_30_font.m_row_height
      , DISPLAY_WIDTH, font_25_30_font.m_row_height
      , "касайтесь экрана"
      , &font_25_30_font
      , DISPLAY_COLOR_WHITE
      , DISPLAY_COLOR_GRAY
      );
  display_WriteStringWithBackground(
        0, v_y + font_25_30_font.m_row_height * 2
      , DISPLAY_WIDTH, font_25_30_font.m_row_height
      , "там, где крестик"
      , &font_25_30_font
      , DISPLAY_COLOR_WHITE
      , DISPLAY_COLOR_GRAY
      );
  //
  int z;
  int corners[4][2];
  // левый верхний угол
  display_FillRectangleFast_2( 8, 0, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( 0, 8, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[0][0], &corners[0][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( 0, 0, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // правый верхний угол
  display_FillRectangleFast_2( DISPLAY_WIDTH - 9, 0, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, 8, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[1][0], &corners[1][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, 0, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // левый нижний угол
  display_FillRectangleFast_2( 8, DISPLAY_HEIGHT - 17, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( 0, DISPLAY_HEIGHT - 9, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[2][0], &corners[2][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( 0, DISPLAY_HEIGHT - 17, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // правый нижний угол
  display_FillRectangleFast_2( DISPLAY_WIDTH - 9, DISPLAY_HEIGHT - 17, 1, 17, DISPLAY_BYTE_COLOR_BLUE );
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, DISPLAY_HEIGHT - 9, 17, 1, DISPLAY_BYTE_COLOR_BLUE );
  // ждём нажатия
  for (;;) {
    while ( !xpt2046_touched() ) {}
    if ( xpt2046_read( &corners[3][0], &corners[3][1], &z ) ) {
      break;
    }
  }
  display_FillRectangleFast_2( DISPLAY_WIDTH - 17, DISPLAY_HEIGHT - 17, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  delay_ms( 250 );
  // определяем коэффициенты
  int Ax = 0, Bx = 0, Dx = 0, Ay = 0, By = 0, Dy = 0;
#ifdef _DEBUG
  for ( int i = 0; i < 4; ++i ) {
    printf( "[%d] x = %d, y = %d\n", i, corners[i][0], corners[i][1] );
  }
#endif
  // определяем совпадение осей координат
  // смотрим на разницу по Y двух точек с одинаковыми координатами по Y в экранной системе координат
  int dd = corners[1][1] - corners[0][1];
  if ( dd < 0 ) {
    dd = 0 - dd;
  }
#ifdef _DEBUG
  printf( "dd = %d\n" );
#endif
  do {
    // число 1024 подходит для 12-битных отсчётов от контроллера сенсорной поверхности
    if ( dd < 1024 ) {
      // коэффициенты Ay = 0 и Bx = 0, т.е. оси экрана (X, Y) совпадают с осями сенсорной поверхности
      // различия замеров по координатам
      int dx1 = corners[1][0] - corners[0][0];
      int dx2 = corners[3][0] - corners[2][0];
      int dy1 = corners[2][1] - corners[0][1];
      int dy2 = corners[3][1] - corners[1][1];
      if ( 0 == dx1 || 0 == dx2 || 0 == dy1 || 0 == dy2 ) {
#ifdef _DEBUG
        printf( "Calibration error\n" );
#endif
        break;
      }
      // расчитываем коэффициенты
      Ax = ( ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx1) + ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx2) ) / 2;
      Dx = ((4096 * 8) - (corners[0][0] * Ax))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[1][0] * Ax))
         + ((4096 * 8) - (corners[2][0] * Ax))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[3][0] * Ax))
         ;
      Dx /= 4;
#ifdef _DEBUG
      printf( "Ax = %d, Dx = %d\n", Ax, Dx );
#endif
      By = ( ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy1) + ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy2) ) / 2;
      Dy = ((4096 * 8) - (corners[0][1] * By))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[2][1] * By))
         + ((4096 * 8) - (corners[1][1] * By))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[3][1] * By))
         ;
      Dy /= 4;
#ifdef _DEBUG
      printf( "By = %d, Dy = %d\n", By, Dy );
#endif
    } else {
      // коэффициенты Ax = 0 и By = 0, т.е. оси экрана (X, Y) не совпадают с осями сенсорной поверхности
      // (X экрана соответствует Y сенсорной поверхности, Y экрана - X сенсорной поверхности)
      // различия замеров по координатам
      int dx1 = corners[1][1] - corners[0][1];
      int dx2 = corners[3][1] - corners[2][1];
      int dy1 = corners[2][0] - corners[0][0];
      int dy2 = corners[3][0] - corners[1][0];
      if ( 0 == dx1 || 0 == dx2 || 0 == dy1 || 0 == dy2 ) {
#ifdef _DEBUG
        printf( "Calibration error\n" );
#endif
        break;
      }
      // расчитываем коэффициенты
      Bx = ( ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx1) + ((4096 * (DISPLAY_WIDTH - 8 - 8)) / dx2) ) / 2;
      Dx = ((4096 * 8) - (corners[0][0] * Bx))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[1][0] * Bx))
         + ((4096 * 8) - (corners[2][0] * Bx))
         + ((4096 * (DISPLAY_WIDTH - 8)) - (corners[3][0] * Bx))
         ;
      Dx /= 4;
#ifdef _DEBUG
      printf( "Bx = %d, Dx = %d\n", Bx, Dx );
#endif
      Ay = ( ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy1) + ((4096 * (DISPLAY_HEIGHT - 8 - 8)) / dy2) ) / 2;
      Dy = ((4096 * 8) - (corners[0][1] * Ay))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[2][1] * Ay))
         + ((4096 * 8) - (corners[1][1] * Ay))
         + ((4096 * (DISPLAY_HEIGHT - 8)) - (corners[3][1] * Ay))
         ;
      Dy /= 4;
#ifdef _DEBUG
      printf( "Ay = %d, Dy = %d\n", Ay, Dy );
#endif
    }
  } while (false);
  // устанавливаем коэффициенты
  xpt2046_set_coeff( Ax, Bx, Dx, Ay, By, Dy );
  // заносим коэффициенты в EEPROM
  touch_coeff_eeprom_page v_eepg;
  v_eepg.coeff.Ax = Ax;
  v_eepg.coeff.Bx = Bx;
  v_eepg.coeff.Dx = Dx;
  v_eepg.coeff.Ay = Ay;
  v_eepg.coeff.By = By;
  v_eepg.coeff.Dy = Dy;
  // считаем CRC
  v_eepg.coeff.crc32 = mik32_crc( (const uint8_t *)&v_eepg.coeff, sizeof(v_eepg.coeff) - sizeof(uint32_t) );
  // заносим в последнюю страницу EEPROM
  // стирание страницы
  if ( eeprom_page_erase( EEPROM_LAST_PAGE_OFFSET ) ) {
    // объект в стеке размещается с выравниванием на 4 байта
#ifdef _DEBUG
    if ( !eeprom_page_program( EEPROM_LAST_PAGE_ADDR, (uint32_t *)&v_eepg ) ) {
      printf( "EEPROM page program error.\n" );
    }
#else
    eeprom_page_program( EEPROM_LAST_PAGE_ADDR, (uint32_t *)&v_eepg );
#endif
#ifdef _DEBUG
  } else {
    printf( "EEPROM page erase error.\n" );
#endif
  }
  //
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_BLACK );
}


//
bool setup_timer() {
  // рисуем кнопки
  display_DrawImage(
      0, DISPLAY_HEIGHT - Iminus_released_tga_height
    , Iminus_released_tga_width, Iminus_released_tga_height
    , Iminus_released_tga_zic, sizeof(Iminus_released_tga_zic)
    );
  display_DrawImage(
      Iminus_released_tga_width + 10, DISPLAY_HEIGHT - Iplus_released_tga_height
    , Iplus_released_tga_width, Iplus_released_tga_height
    , Iplus_released_tga_zic, sizeof(Iplus_released_tga_zic)
    );
  display_DrawImage(
      Iminus_released_tga_width + Iplus_released_tga_width + 20, DISPLAY_HEIGHT - Iaction_released_tga_height
    , Iaction_released_tga_width, Iaction_released_tga_height
    , Iaction_released_tga_zic, sizeof(Iaction_released_tga_zic)
    );
  // рисуем два нуля
  display_numbers( 0 );
  // ноль минут
  g_minutes = 0;
  // запомним, когда начали
  uint32_t v_from = g_milliseconds;
  // если не 1 минуту не будет тычков в экран, то вернёмся к скринсейверу
  while ( (g_milliseconds - v_from) < 60000u ) {
    // будем отрабатывать нажатия
    if ( xpt2046_touched() ) {
      int x, y, z;
      if ( xpt2046_read( &x, &y, &z ) ) {
        // обновим точку отсчёта таймаута
        v_from = g_milliseconds;
        // получим координаты касания в экранной системе координат
        int X, Y;
        X = xpt2046_get_X( x, y );
        Y = xpt2046_get_Y( x, y );
        // попадание в цифру десятков
        if ( test_left_num( X, Y ) ) {
          // увеличим число десятком минут на 1, после 9 снова ноль
          int v_decs = (g_minutes / 10) + 1;
          if ( v_decs > 9 ) {
            g_minutes %= 10;
          } else {
            g_minutes += 10;
          }
          //
          display_numbers( g_minutes );
          continue;
        }
        // попадание в цифру единиц
        if ( test_right_num( X, Y ) ) {
          // увеличим число единиц на 1, после 9 снова ноль
          int v_ones = (g_minutes % 10) + 1;
          if ( v_ones > 9 ) {
            g_minutes -= 9;
          } else {
            g_minutes += 1;
          }
          //
          display_numbers( g_minutes );
          continue;
        }
        // попадание в кнопку "минус"
        if ( test_minus_button( X, Y ) ) {
          // отрисуем нажатую кнопку
          display_DrawImage(
              0, DISPLAY_HEIGHT - Iminus_pressed_tga_height
            , Iminus_pressed_tga_width, Iminus_pressed_tga_height
            , Iminus_pressed_tga_zic, sizeof(Iminus_pressed_tga_zic)
            );
          // ждём отпускания экрана, пока касание есть, уменьшаем количество минут
          do {
            xpt2046_wait_release( 256u );
            --g_minutes;
            if ( g_minutes <= 0 ) {
              return false;
            }
            display_numbers( g_minutes );
          } while ( xpt2046_touched() );
          // рисуем отпущенную снопку
          display_DrawImage(
              0, DISPLAY_HEIGHT - Iminus_released_tga_height
            , Iminus_released_tga_width, Iminus_released_tga_height
            , Iminus_released_tga_zic, sizeof(Iminus_released_tga_zic)
            );
          continue;
        }
        // попадание в кнопку "плюс"
        if ( test_plus_button( X, Y ) ) {
          // рисуем нажатую кнопку
          display_DrawImage(
              Iminus_pressed_tga_width + 10, DISPLAY_HEIGHT - Iplus_pressed_tga_height
            , Iplus_pressed_tga_width, Iplus_pressed_tga_height
            , Iplus_pressed_tga_zic, sizeof(Iplus_pressed_tga_zic)
            );
          // ждём отпускания экрана, пока касание есть, увеличиваем количество минут
          do {
            xpt2046_wait_release( 256u );
            g_minutes += 5;
            if ( g_minutes > 99 ) {
              g_minutes = 99;
            }
            display_numbers( g_minutes );
          } while ( xpt2046_touched() );
          // рисуем отпущенную кнопку
          display_DrawImage(
              Iminus_released_tga_width + 10, DISPLAY_HEIGHT - Iplus_released_tga_height
            , Iplus_released_tga_width, Iplus_released_tga_height
            , Iplus_released_tga_zic, sizeof(Iplus_released_tga_zic)
            );
          continue;
        }
        // попадание в кнопку "старт"
        if ( test_go_button( X, Y ) ) {
          // рисуем нажатую кнопку
          display_DrawImage(
              Iminus_pressed_tga_width + 10 + Iplus_pressed_tga_width + 10, DISPLAY_HEIGHT - Iaction_pressed_tga_height
            , Iaction_pressed_tga_width, Iaction_pressed_tga_height
            , Iaction_pressed_tga_zic, sizeof(Iaction_pressed_tga_zic)
            );
          // ждём отпускания экрана (долго)
          xpt2046_wait_release( 40960u );
          // рисуем отпущенную кнопку
          display_DrawImage(
              Iminus_released_tga_width + 10 + Iplus_released_tga_width + 10, DISPLAY_HEIGHT - Iaction_released_tga_height
            , Iaction_released_tga_width, Iaction_released_tga_height
            , Iaction_released_tga_zic, sizeof(Iaction_released_tga_zic)
            );
          return g_minutes > 0 && !xpt2046_touched();
        }
      }
    }
  }
  // более минуты не было касаний экрана
  return false;
}


// счёт таймера, отсчитываем настроенное количество минут
bool do_timer() {
  // ждём откускания экрана, долго ждём
  xpt2046_wait_release( 40960u );
  // нарисуем индикатор работы включенный
  display_DrawImage( 0, 0, Iind_on_tga_width, Iind_on_tga_height, Iind_on_tga_zic, sizeof(Iind_on_tga_zic) );
  // вычисляем количество миллисекунд
  uint32_t v_mscount = g_minutes * (1000u * 60u);
  // точка отсчёта
  uint32_t v_count_from = g_milliseconds;
  // это для рисования мигающего индикатора работы.
  uint32_t v_ind = 0;
  // индикация текущего состояния нажатия
  bool v_pressed = xpt2046_touched();
  // индикатор нажатого состояния кнопки "старт/стоп"
  bool v_stop_pressed = false;
  // в какой момент нажали "старт/стоп"
  uint32_t v_stop_from = 0;
  // точка отсчёта для мигания индикатора
  uint32_t v_blink_from = g_milliseconds;
  // пока время не истекло
  for ( uint32_t v_elapsed = g_milliseconds - v_count_from; v_elapsed <= v_mscount; v_elapsed = g_milliseconds - v_count_from ) {
    if ( xpt2046_touched() ) {
      int x, y, z;
      if ( !xpt2046_read( &x, &y, &z ) ) {
        // фигня какая-то, нажатие фиксируется, а координаты не прочитались. просто продолжаем цикл
        continue;
      }
      // экранные координаты
      int X = xpt2046_get_X( x, y );
      int Y = xpt2046_get_Y( x, y );
      // куда-то ткнули в экран. нас интересуют только области кнопок
      if ( !v_pressed ) {
        // фиксируем касание сенсора
        v_pressed = true;
        // если ткнули в "минус"
        if ( test_minus_button( X, Y ) ) {
          display_DrawImage(
              0, DISPLAY_HEIGHT - Iminus_pressed_tga_height
            , Iminus_pressed_tga_width, Iminus_pressed_tga_height
            , Iminus_pressed_tga_zic, sizeof(Iminus_pressed_tga_zic)
            );
          // если время счёта больше минуты
          if ( v_mscount > (1000u * 60u) ) {
            // уменьшили время на минуту
            v_mscount -= (1000u * 60u);
            // если при этом не останется времени (счёт шёл в по последней минуте), тоже на выход
            if ( (g_milliseconds - v_count_from) > v_mscount ) {
              return false;
            }
          } else {
            // время счёта было меньше минуты, фиксируем отмену счёта таймера
            return false;
          }
        }
        // если ткнули в "плюс"
        if ( test_plus_button( X, Y ) ) {
          display_DrawImage(
              Iminus_pressed_tga_width + 10, DISPLAY_HEIGHT - Iplus_pressed_tga_height
            , Iplus_pressed_tga_width, Iplus_pressed_tga_height
            , Iplus_pressed_tga_zic, sizeof(Iplus_pressed_tga_zic)
            );
          // добавим 5 минут, но не больше 99 минут в итоге
          v_mscount += (1000u * 60u * 5u);
          if ( (g_milliseconds - v_count_from) < v_mscount && (v_mscount - g_milliseconds + v_count_from) > (1000u * 60u * 99u) ) {
            v_mscount = 1000u * 60u * 99u;
            v_count_from = g_milliseconds;
          }
        }
        // если ткнули в "старт/стоп"
        if ( test_go_button( X, Y ) ) {
          display_DrawImage(
              Iminus_pressed_tga_width + 10 + Iplus_pressed_tga_width + 10, DISPLAY_HEIGHT - Iaction_pressed_tga_height
            , Iaction_pressed_tga_width, Iaction_pressed_tga_height
            , Iaction_pressed_tga_zic, sizeof(Iaction_pressed_tga_zic)
            );
          // зарядим счётчик отмены счёта :)
          v_stop_pressed = true;
          v_stop_from = g_milliseconds;
        }
      } else {
        // нажатие продолжается
        if ( v_stop_pressed ) {
          // нажатие было на кнопку "старт/стоп", надо проверить, что нажатие всё ещё на кнопке
          if ( test_go_button( X, Y ) ) {
            // да, "палец на кнопке"
            if ( (g_milliseconds - v_stop_from) >= 3000u ) {
              // фиксируем отмену счёта таймера
              return false;
            }
          } else {
            // нет, "палец уехал". отрисовываем отжатую кнопку
            display_DrawImage(
                Iminus_released_tga_width + 10 + Iplus_released_tga_width + 10, DISPLAY_HEIGHT - Iaction_released_tga_height
              , Iaction_released_tga_width, Iaction_released_tga_height
              , Iaction_released_tga_zic, sizeof(Iaction_released_tga_zic)
              );
            //
            v_stop_pressed = false;
          }
        }
      }
    } else {
      // касания нет
      if ( v_pressed ) {
        v_pressed = false;
        v_stop_pressed = false;
        // а оно было, значит перерисуем все кнопки
        display_DrawImage(
            0, DISPLAY_HEIGHT - Iminus_released_tga_height
          , Iminus_released_tga_width, Iminus_released_tga_height
          , Iminus_released_tga_zic, sizeof(Iminus_released_tga_zic)
          );
        display_DrawImage(
            Iminus_released_tga_width + 10, DISPLAY_HEIGHT - Iplus_released_tga_height
          , Iplus_released_tga_width, Iplus_released_tga_height
          , Iplus_released_tga_zic, sizeof(Iplus_released_tga_zic)
          );
        display_DrawImage(
            Iminus_released_tga_width + 10 + Iplus_released_tga_width + 10, DISPLAY_HEIGHT - Iaction_released_tga_height
          , Iaction_released_tga_width, Iaction_released_tga_height
          , Iaction_released_tga_zic, sizeof(Iaction_released_tga_zic)
          );
      }
    }
    // рисуем количество оставшихся минут
    display_numbers( (v_mscount - v_elapsed + ((1000u * 60u) - 1)) / (1000u * 60u) );
    //
    if ( (g_milliseconds - v_blink_from) > 384u ) {
      // если младший разряд переходит в 1, то надо рисовать "выключенный" индикатор, иначе "включенный"
      if ( 0 == (++v_ind & 1) ) {
        display_DrawImage( 0, 0, Iind_on_tga_width, Iind_on_tga_height, Iind_on_tga_zic, sizeof(Iind_on_tga_zic) );
      } else {
        display_DrawImage( 0, 0, Iind_off_tga_width, Iind_off_tga_height, Iind_off_tga_zic, sizeof(Iind_off_tga_zic) );
      }
      // обновим точку отсчёта
      v_blink_from = g_milliseconds;
    }
  }
  //
  display_numbers( 0 );
  // здесь время истекло
  return true;
}


// проверить попадание в область копки "минус"
bool test_minus_button( int x, int y ) {
  return  x >= 0
       && x <= Iminus_released_tga_width
       && y >= (DISPLAY_HEIGHT - Iminus_released_tga_height)
       ;
}


// проверить попадание в область копки "плюс"
bool test_plus_button( int x, int y ) {
  return  x >= (Iminus_pressed_tga_width + 10)
       && x <= (Iminus_pressed_tga_width + 10 + Iplus_released_tga_width)
       && y >= (DISPLAY_HEIGHT - Iplus_released_tga_height)
       ;
}


// проверить попадание в область копки "старт/стоп"
bool test_go_button( int x, int y ) {
  return  x >= (Iminus_pressed_tga_width + 10 + Iplus_released_tga_width + 10)
       && y >= (DISPLAY_HEIGHT - Iaction_released_tga_height)
       ;
}


// переменный для работы "скринсейвера"
// цвет рисуемого квадратика
static uint16_t g_screen_saver_colour = 0;
// координаты квадратика
static int g_ssx = 0;
static int g_ssy = 0;
// приращение координат квадратика
static int g_delta_ssx = 1;
static int g_delta_ssy = 1;


// перемещает квадратик в новое место на экране плюс задержка на "видеть глазом" :)
void screen_saver() {
  // стираем квадратик на текущем месте
  display_FillRectangleFast_2( g_ssx, g_ssy, 17, 17, DISPLAY_BYTE_COLOR_BLACK );
  // добавляем приращение по X
  g_ssx += g_delta_ssx;
  if ( g_ssx < 0 || g_ssx > (DISPLAY_WIDTH - 17) ) {
    g_ssx -= 2 * g_delta_ssx;
    g_delta_ssx = 0 - g_delta_ssx;
  }
  // добавляем приращение по Y
  g_ssy += g_delta_ssy;
  if ( g_ssy < 0 || g_ssy > (DISPLAY_HEIGHT - 17) ) {
    g_ssy -= 2 * g_delta_ssy;
    g_delta_ssy = 0 - g_delta_ssy;
  }
  // рисуем квадратик в новых координатах
  display_FillRectangleFast( g_ssx, g_ssy, 17, 17, g_screen_saver_colour++ );
  // задержка
  delay_ms( 32u );
}


// массив из 17 структур и инфой о каждом кадре будильника
const zic_def_t g_clock_array[17] = {
    { Iclock00_tga_zic, sizeof(Iclock00_tga_zic) }
  , { Iclock01_tga_zic, sizeof(Iclock01_tga_zic) }
  , { Iclock02_tga_zic, sizeof(Iclock02_tga_zic) }
  , { Iclock03_tga_zic, sizeof(Iclock03_tga_zic) }
  , { Iclock04_tga_zic, sizeof(Iclock04_tga_zic) }
  , { Iclock05_tga_zic, sizeof(Iclock05_tga_zic) }
  , { Iclock06_tga_zic, sizeof(Iclock06_tga_zic) }
  , { Iclock07_tga_zic, sizeof(Iclock07_tga_zic) }
  , { Iclock08_tga_zic, sizeof(Iclock08_tga_zic) }
  , { Iclock09_tga_zic, sizeof(Iclock09_tga_zic) }
  , { Iclock10_tga_zic, sizeof(Iclock10_tga_zic) }
  , { Iclock11_tga_zic, sizeof(Iclock11_tga_zic) }
  , { Iclock12_tga_zic, sizeof(Iclock12_tga_zic) }
  , { Iclock13_tga_zic, sizeof(Iclock13_tga_zic) }
  , { Iclock14_tga_zic, sizeof(Iclock14_tga_zic) }
  , { Iclock15_tga_zic, sizeof(Iclock15_tga_zic) }
  , { Iclock16_tga_zic, sizeof(Iclock16_tga_zic) }
};


// отобразить анимацию сработавшего будильника
void do_alarm() {
  // будильник нарисован на белом фоне, так что закрасим весь экран белым цветом
  display_FillScreenFast_2( DISPLAY_BYTE_COLOR_WHITE );
  // включаем звук
  g_sound_on = true;
  // пока не было касания экрана, выводим поочерёдно кадры анимации (i - номер кадра)
  // каждые восемь кадров меняем состояние вкл/выкл звука (k - общий счётчик отрисованных кадров)
  int i = 0, k = 0;
  while ( !xpt2046_touched() ) {
    display_DrawImage( 100, 56, 120, 128, g_clock_array[i].m_ptr, g_clock_array[i].m_size );
    if ( ++i >= (int)(sizeof(g_clock_array)/sizeof(g_clock_array[0])) ) {
      i = 0;
    }
    // переключение звука
    g_sound_on = ( 0 == (++k & 8) );
  }
  // выключаем звук
  g_sound_on = false;
  // ждём отпускания экрана
  xpt2046_wait_release( 40960u );
}
