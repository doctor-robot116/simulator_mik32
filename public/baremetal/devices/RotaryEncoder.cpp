// Собственно откуда исходное:
// -----
// RotaryEncoder.cpp - Library for using rotary encoders.
// This class is implemented for use with the Arduino environment.
//
// Copyright (c) by Matthias Hertel, http://www.mathertel.de
//
// This work is licensed under a BSD 3-Clause style license,
// https://www.mathertel.de/License.aspx.
//
// More information on: http://www.mathertel.de/Arduino
// -----
// Changelog: see RotaryEncoder.h
// -----

#include "RotaryEncoder.h"
#include <mik32_hwlibs/epic.h>

#include <runtime.h>
#include <stdlib.h>


namespace rotary_encoder {

#define LATCH0 0 // input state at position 0
#define LATCH3 3 // input state at position 3


// The array holds the values -1 for the entries where a position was decremented,
// a 1 for the entries where the position was incremented
// and 0 in all the other (no change or not valid) cases.

static const int KNOBDIR[] = {
   0, -1,  1,  0
,  1,  0,  0, -1
, -1,  0,  0,  1
,  0,  1, -1,  0
};

static GPIO_TypeDef * const GPIO_PORTS[3] = {
  GPIO_0
, GPIO_1
, GPIO_2
};


// positions: [3] 1 0 2 [3] 1 0 2 [3]
// [3] is the positions where my rotary switch detends
// ==> right, count up
// <== left,  count down


// ----- Initialization and Default Values -----

RotaryEncoder::RotaryEncoder(int a_gpio, int a_pin1, int a_pin2, uint32_t a_turn_ticks, LatchMode a_mode)
  : m_gpio(a_gpio % 3)
  , m_pin1(a_pin1)
  , m_pin2(a_pin2)
  , m_turn_ticks(a_turn_ticks)
  , m_line1(0)
  , m_line2(0)
  , m_mode(a_mode)
  , m_oldState(0)
  , m_position(0)
  , m_positionExt(0)
  , m_positionExtPrev(0)
  , m_positionExtTime(0)
  , m_positionExtTimePrev(g_milliseconds) {
  m_positionExtTime = m_positionExtTimePrev;
}


int RotaryEncoder::get_pin_state( int a_pin ) {
  return (0 != GPIO_PIN_STATE(m_gpio_ptr, a_pin)) ? 1 : 0;
}


int RotaryEncoder::get_current_state() {
  return get_pin_state(m_pin1) | (get_pin_state(m_pin2) << 1);
}


static uint32_t lines_direct_mapping_mux[40] = {
  0x0, 0x00, 0x000, 0x0000, 0x00000, 0x000000, 0x0000000, 0x00000000
, 0x1, 0x10, 0x100, 0x1000, 0x10000, 0x100000, 0x1000000, 0x10000000
, 0x2, 0x20, 0x200, 0x2000, 0x20000, 0x200000, 0x2000000, 0x20000000
, 0x3, 0x30, 0x300, 0x3000, 0x30000, 0x300000, 0x3000000, 0x30000000
, 0x4, 0x40, 0x400, 0x4000, 0x40000, 0x400000, 0x4000000, 0x40000000
};

static uint32_t lines_switch_mapping_mux[40] = {
  0x50000, 0x500000, 0x5000000, 0x50000000, 0x5, 0x50, 0x500, 0x5000
, 0x60000, 0x600000, 0x6000000, 0x60000000, 0x6, 0x60, 0x600, 0x6000 
, 0x70000, 0x700000, 0x7000000, 0x70000000, 0x7, 0x70, 0x700, 0x7000 
, 0x80000, 0x800000, 0x8000000, 0x80000000, 0x8, 0x80, 0x800, 0x8000 
, 0x90000, 0x900000, 0x9000000, 0x90000000, 0x9, 0x90, 0x900, 0x9000 
};

static uint8_t lines_switch_mapping_line[16] = {
  4, 5, 6, 7, 0, 1, 2, 3
, 4, 5, 6, 7, 0, 1, 2, 3
};

void RotaryEncoder::apply_gpio_settings() {
  // включаем тактирование GPIO
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M << m_gpio;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_IRQ_M;
  //
  m_gpio_ptr = GPIO_PORTS[m_gpio];
  // режим выводов GPIO с подтяжкой к питанию
  PAD_CONFIG_PORTS->PORT[m_gpio].CFG = (PAD_CONFIG_PORTS->PORT[m_gpio].CFG & ~(PAD_CONFIG_PIN_M(m_pin1) | PAD_CONFIG_PIN_M(m_pin2)));
  PAD_CONFIG_PORTS->PORT[m_gpio].DS = (PAD_CONFIG_PORTS->PORT[m_gpio].DS & ~(PAD_CONFIG_PIN_M(m_pin1) | PAD_CONFIG_PIN_M(m_pin2)));
  PAD_CONFIG_PORTS->PORT[m_gpio].PUPD = (PAD_CONFIG_PORTS->PORT[m_gpio].PUPD & ~(PAD_CONFIG_PIN_M(m_pin1) | PAD_CONFIG_PIN_M(m_pin2)))
                                      | PAD_CONFIG_PIN(m_pin1, PAD_CONFIG_PUPD_UP)
                                      | PAD_CONFIG_PIN(m_pin2, PAD_CONFIG_PUPD_UP)
                                      ;
  // выводы в режиме входов
  m_gpio_ptr->CONTROL = 0;
  m_gpio_ptr->DIRECTION_IN = GPIO_PIN_M(m_pin1) | GPIO_PIN_M(m_pin2);
  // разрешаем прерывания
  // настройка мультиплексоров - обы вывода на разных линиях
  GPIO_IRQ->LINE_MUX = lines_direct_mapping_mux[m_pin1 + (m_gpio * 16)]
                     | lines_switch_mapping_mux[m_pin2 + (m_gpio * 16)]
                     ;
  // включение прерывания для изменения состояния
  m_line1 = m_pin1 % 8;
  m_line2 = lines_switch_mapping_line[m_pin2];
  GPIO_IRQ->ENABLE_CLEAR = (1u << m_line1) | (1u << m_line2);
  GPIO_IRQ->CLEAR = (1u << m_line1) | (1u << m_line2);
  GPIO_IRQ->EDGE = (1u << m_line1) | (1u << m_line2);
  GPIO_IRQ->ANY_EDGE_SET = (1u << m_line1) | (1u << m_line2);
  GPIO_IRQ->ENABLE_SET = (1u << m_line1) | (1u << m_line2);
  // разрешаем прерывание от GPIO
  EPIC->MASK_LEVEL_SET = EPIC_LINE_M(EPIC_LINE_GPIO_IRQ_S);
}


void RotaryEncoder::init() {
  // when not started in motion, the current state of the encoder should be 3
  m_oldState = get_current_state();
}


int32_t RotaryEncoder::getPosition() const {
  return m_positionExt;
}


const char * RotaryEncoder::get_direction_string( Direction a_dir ) const {
  const char * v_result = "--";
  switch ( a_dir ) {
    case Direction::COUNTERCLOCKWISE:
      v_result = "<-";
      break;
      
    case Direction::CLOCKWISE:
      v_result = "->";
      break;

    default:
      break;
  }
  //
  return v_result;
}


RotaryEncoder::Direction RotaryEncoder::getDirection() {
  RotaryEncoder::Direction v_ret = Direction::NOROTATION;

  if ( m_positionExtPrev > m_positionExt ) {
    v_ret = Direction::COUNTERCLOCKWISE;
  } else if ( m_positionExtPrev < m_positionExt ) {
    v_ret = Direction::CLOCKWISE;
  } else {
    v_ret = Direction::NOROTATION;
  }
  m_positionExtPrev = m_positionExt;

  return v_ret;
}


void RotaryEncoder::setPosition( int32_t newPosition ) {
  switch ( m_mode ) {
    case LatchMode::FOUR3:
    case LatchMode::FOUR0:
      // only adjust the external part of the position.
      m_position = ((newPosition << 2) | (m_position & 0x03));
      break;

    case LatchMode::TWO03:
      // only adjust the external part of the position.
      m_position = ((newPosition << 1) | (m_position & 0x01L));
      break;
      
    default:
      break;
  }
  m_positionExt = newPosition;
  m_positionExtPrev = newPosition;
}


//
bool RotaryEncoder::tick_isr() {
  // сначал проверяем, что прерывание по "нашим" линиям
  if ( 0 != (GPIO_IRQ->INTERRUPT & (GPIO_PIN_M(m_line1) | GPIO_PIN_M(m_line2))) ) {
    // обрабатываем изменения состояния, если они есть :)
    tick();
    // сбрасываем состояние прерывания для "наших" линий
    GPIO_IRQ->CLEAR = (GPIO_PIN_M(m_line1) | GPIO_PIN_M(m_line2));
    return true;
  } else {
    return false;
  }
}


// проверить изменение состояния входов
// обычно этот метод вызывается из обработчика прерывания по измененияю состояния входов
void RotaryEncoder::tick() {
  // получить текущее состояние
  int thisState = get_current_state();

  // если отличается от предыдущего состояния
  if ( m_oldState != thisState ) {
    // модифицируем положение
    m_position += KNOBDIR[thisState | (m_oldState << 2)];
    m_oldState = thisState;

    switch ( m_mode ) {
      case LatchMode::FOUR3:
        if ( thisState == LATCH3 ) {
          // The hardware has 4 steps with a latch on the input state 3
          m_positionExt = m_position >> 2;
        }
        break;

      case LatchMode::FOUR0:
        if ( thisState == LATCH0) {
          // The hardware has 4 steps with a latch on the input state 0
          m_positionExt = m_position >> 2;
        }
        break;

      case LatchMode::TWO03:
        if ((thisState == LATCH0) || (thisState == LATCH3)) {
          // The hardware has 2 steps with a latch on the input state 0 and 3
          m_positionExt = m_position >> 1;
        }
        break;
        
      default:
        break;
    }
    //
    m_positionExtTimePrev = m_positionExtTime;
    m_positionExtTime = g_milliseconds;
  }
}


uint32_t RotaryEncoder::getMillisBetweenRotations() const {
  return m_positionExtTime - m_positionExtTimePrev;
}


uint32_t RotaryEncoder::getRPM() {
  uint64_t timeBetweenLastPositions = getMillisBetweenRotations();
  return 0 == timeBetweenLastPositions ? 0 : ((60000lu << 16)/(timeBetweenLastPositions * m_turn_ticks)) >> 16;
}


} // namespace rotary_encoder
