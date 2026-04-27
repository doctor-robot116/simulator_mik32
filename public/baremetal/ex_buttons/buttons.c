#include "buttons.h"
#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>


// последнее запомненное состояние кнопок
static uint32_t g_buttons = 0;
// маска кнопок, поменявших состояние, 1 в соответствущем бите означает, что состояние изменилось
static uint32_t g_buttons_change = 0;
// таймаут для каждой кнопки (подавление дребезга)
static uint32_t g_buttons_wait_ms[BT_COUNT];
// 
const uint32_t g_buttons_masks[BT_COUNT] = {
  GPIO_PIN_M(BT_01)
, GPIO_PIN_M(BT_02)
, GPIO_PIN_M(BT_03)
, GPIO_PIN_M(BT_04)
, GPIO_PIN_M(BT_05)
};
// временные метки от нажатия на кнопку для перехода в состояние повторного нажатия
static uint32_t g_repeat_wait[BT_COUNT];
// флаги автоматического генерирования повторного нажатия
static uint32_t g_repeat_flag = 0;

extern volatile uint32_t g_milliseconds;
void delay_ms( uint32_t a_ms );


// получить маску кнопок с изменившимся состоянием (1 - состояние изменилось)
uint32_t get_changed_buttons() {
  return g_buttons_change;
}


// получить маску состояния кнопок (0 - нажата)
uint32_t get_buttons_state() {
  return g_buttons;
}


// начальные настройки
void buttons_init() {
  // включаем тактирование GPIO_0
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M;
  // PORT0 .10, .0, .8, .1, ,2 входы с подтяжкой к питанию
  // режим выводов - GPIO
  PAD_CONFIG->PORT_0_CFG = ( PAD_CONFIG->PORT_0_CFG & ~( PAD_CONFIG_PIN_M(BT_01)
                                                      | PAD_CONFIG_PIN_M(BT_02)
                                                      | PAD_CONFIG_PIN_M(BT_03)
                                                      | PAD_CONFIG_PIN_M(BT_04)
                                                      | PAD_CONFIG_PIN_M(BT_05)
                                                      ));
  // включена подтяжка к питанию
  PAD_CONFIG->PORT_0_PUPD = ( PAD_CONFIG->PORT_0_PUPD & ~( PAD_CONFIG_PIN_M(BT_01)
                                                      | PAD_CONFIG_PIN_M(BT_02)
                                                      | PAD_CONFIG_PIN_M(BT_03)
                                                      | PAD_CONFIG_PIN_M(BT_04)
                                                      | PAD_CONFIG_PIN_M(BT_05)
                                                      ))
                            | PAD_CONFIG_PIN(BT_01, PAD_CONFIG_PUPD_UP)
                            | PAD_CONFIG_PIN(BT_02, PAD_CONFIG_PUPD_UP)
                            | PAD_CONFIG_PIN(BT_03, PAD_CONFIG_PUPD_UP)
                            | PAD_CONFIG_PIN(BT_04, PAD_CONFIG_PUPD_UP)
                            | PAD_CONFIG_PIN(BT_05, PAD_CONFIG_PUPD_UP)
                            ;
  // выводы в режим входов
  GPIO_0->DIRECTION_IN = GPIO_PIN_M(BT_01)
                       | GPIO_PIN_M(BT_02)
                       | GPIO_PIN_M(BT_03)
                       | GPIO_PIN_M(BT_04)
                       | GPIO_PIN_M(BT_05)
                       ;
  // запомним начальное состояние кнопок
  g_buttons = GPIO_0->STATE;
  // для всех кнопок таймаут подавления дребезга BT_IGNORE_INTERVAL_MS миллисекунд
  // (таймаут отсчитывается от текущего момента)
  for ( int i = 0; i < BT_COUNT; ++i ) {
    g_buttons_wait_ms[i] = g_milliseconds;
  }
}


// сканирование состояния кнопок
void buttons_scan() {
  // получим текущее состояние кнопок
  uint32_t v_buttons = GPIO_0->STATE;
  // текущее "время" в миллисекундах
  uint32_t v_now = g_milliseconds;
  // маска игнорирования, 1 в разряде кнопки, если её интервал "игнора" ещё не истёк
  uint32_t v_ignore_mask = 0;
  // по всем кнопкам
  for ( int i = 0; i < BT_COUNT; ++i ) {
    // проверим интервал "игнора"
    if ( ((uint32_t)(v_now - g_buttons_wait_ms[i])) < BT_IGNORE_INTERVAL_MS ) {
      // пока что игнорируем изменения состояния кнопки
      v_ignore_mask |= g_buttons_masks[i];
    }
  }
  // обновим флаги изменения состояния
  g_buttons_change = g_buttons ^ v_buttons;
  // в битах изменения замаскируем "игнорируемые" кнопки
  g_buttons_change &= ~v_ignore_mask;
  // перепишем только состояние кнопок, которые не в игноре
  g_buttons = (g_buttons & v_ignore_mask) | (v_buttons & ~v_ignore_mask);
  // обработка всех кнопок
  for ( int i = 0; i < BT_COUNT; ++i ) {
    if ( 0 != (v_ignore_mask & g_buttons_masks[i]) ) {
      // заигноренные кнопки пропускаем
      continue;
    }
    if ( 0 != (g_buttons_change & g_buttons_masks[i]) ) {
      // кнопка изменила состояние, зарядим интервал игнора
      g_buttons_wait_ms[i] = v_now;
      if ( 0 != (g_buttons & g_buttons_masks[i]) ) {
        // если кнопка была отпущена, снимаем флаг автоповтора
        g_repeat_flag &= ~g_buttons_masks[i];
      } else {
        // если кнопка была нажата, зарядим ожидание генерации автоповтора
        g_repeat_wait[i] = v_now;
      }
    } else {
      // кнопка не меняла состояние, поддерживаем интервал игнора, чтоб в следующий раз не игнорировать
      g_buttons_wait_ms[i] = v_now - BT_IGNORE_INTERVAL_MS;
      // состояние кнопки не изменилось, если прошло достаточно времени, запустим автоповтор
      if ( 0 == (g_buttons & g_buttons_masks[i]) ) {
        // кнопка нажата, проверим автоповтор
        if ( 0 != (g_repeat_flag & g_buttons_masks[i]) ) {
          // у кнопки включен автоповтор, проверим время последнего изменения состояния
          if ( ((uint32_t)(v_now - g_repeat_wait[i])) >= BT_AUTOREPEAT_INTERVAL ) {
            // генерируем автонажатие
            g_buttons_change |= g_buttons_masks[i];
            // задержка автоповтора
            g_repeat_wait[i] = v_now;
          }
        } else {
          // автоповтор выключен, проверим интервал запуска
          if ( ((uint32_t)(v_now - g_repeat_wait[i])) >= BT_AUTOREPEAT_WAIT ) {
            // можно запускать автоповтор
            g_repeat_flag |= g_buttons_masks[i];
            // генерируем автонажатие
            g_buttons_change |= g_buttons_masks[i];
            // задержка автоповтора
            g_repeat_wait[i] = v_now;
          }
        }
      }
    }
  }
}


bool is_repeated( unsigned int a_button_mask ) {
  return 0 != (g_repeat_flag & a_button_mask);
}
