// Собственно откуда исходное:
// -----
// RotaryEncoder.h - Library for using rotary encoders.
// This class is implemented for use with the Arduino environment.
//
// Copyright (c) by Matthias Hertel, http://www.mathertel.de
//
// This work is licensed under a BSD 3-Clause style license,
// https://www.mathertel.de/License.aspx.
//
// More information on: http://www.mathertel.de/Arduino
// -----
// 18.01.2014 created by Matthias Hertel
// 16.06.2019 pin initialization using INPUT_PULLUP
// 10.11.2020 Added the ability to obtain the encoder RPM
// 29.01.2021 Options for using rotary encoders with 2 state changes per latch.
// -----

// Название класса, обозначения констант и названия методов оставлены как есть,
// для упрощения переноса существующего кода

#ifndef _RotaryEncoder_h_
#define _RotaryEncoder_h_


#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/gpio_irq.h>
#include <mik32_hwlibs/pad_config.h>

#include <stdint.h>


namespace rotary_encoder {

class RotaryEncoder
{
public:
  enum class Direction {
    NOROTATION =         0
  , CLOCKWISE =          1
  , COUNTERCLOCKWISE =  -1
  };

  enum class LatchMode {
    // состояния переключателей при "устойчивом" положении вала энкодера
    
    // 4 steps, Latch at position 3 only (compatible to older versions)
    // Переключатели в выключенном состоянии
    FOUR3 = 1
    // 4 steps, Latch at position 0 (reverse wirings)
    // Переключатели во включенном состоянии
  , FOUR0 = 2
    // 2 steps, Latch at position 0 and 3 
    // Переключатели либо оба в выключенном, либо оба во включенном состоянии
  , TWO03 = 3
  };

  // ctor
  RotaryEncoder(int a_gpio, int a_pin1, int a_pin2, uint32_t a_turn_ticks, LatchMode a_mode = LatchMode::FOUR0);

  // retrieve the current position
  int32_t getPosition() const;

  // simple retrieve of the direction the knob was rotated last time. 0 = No rotation, 1 = Clockwise, -1 = Counter Clockwise
  Direction getDirection();
  
  //
  const char * get_direction_string( Direction a_dir ) const;

  // adjust the current position
  void setPosition(int32_t newPosition);

  // call this function every some milliseconds or by using an interrupt for handling state changes of the rotary encoder.
  void tick();
  //
  bool tick_isr();

  // Returns the time in milliseconds between the current observed
  uint32_t getMillisBetweenRotations() const;

  // Returns the RPM
  uint32_t getRPM();
  
  // применить настройки для указанных в конфтрукторе выводов
  // режим входов, с подтяжкой к питанию, прерывание по любому изменению состояния
  // соответственно, где-то в основном коде (например, в прерывании от GPIO) нужно
  // дёргать за метод tick()
  void apply_gpio_settings();
  
  // начальная инициализация, вынесено из конструктора
  void init();

private:
  // используются две ноги одного порта.
  // для использования ного на разных портах нужно переделывать код
  int m_gpio; // номер порта
  int m_pin1, m_pin2; // номера ног порта
  uint32_t m_turn_ticks; // количество устойчивых положений вала энкодера на один полный оборот
  int m_line1, m_line2; // вычисляемые номера линий прерывания GPIO
  
  LatchMode m_mode; // Latch mode from initialization

  volatile int m_oldState;

  volatile int32_t m_position;        // Internal position (4 times _positionExt)
  volatile int32_t m_positionExt;     // External position
  volatile int32_t m_positionExtPrev; // External position (used only for direction checking)

  uint32_t m_positionExtTime;     // The time the last position change was detected.
  uint32_t m_positionExtTimePrev; // The time the previous position change was detected.
  
  GPIO_TypeDef * m_gpio_ptr;
  

  int get_pin_state( int a_pin );
  int get_current_state();
};

} // namespace rotary_encoder

#endif // #ifndef _RotaryEncoder_h_
