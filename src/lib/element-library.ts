// ═══════════════════════════════════════════════════════════════
// Каталог элементов wokwi-elements (интегрирован локально)
// При добавлении нового элемента — обновите этот файл
// ═══════════════════════════════════════════════════════════════

export const WOKWI_ELEMENTS_VERSION = '1.9.2';
export const WOKWI_ELEMENTS_UPDATED = '2025-04-16';

export interface WokwiElementMeta {
  tag: string;
  label: string;
  category: 'mcu' | 'output' | 'input' | 'passive' | 'display' | 'sensor' | 'motor' | 'comms';
  description: string;
  pinCount: number;
  supported: boolean;
}

export const WOKWI_ELEMENT_CATALOG: WokwiElementMeta[] = [
  // ── MIK32 (кастомные элементы) ────────────────────────────
  {
    tag: 'wokwi-mik32-amur',
    label: 'MIK32 Амур',
    category: 'mcu',
    description: 'Российский 32-бит RISC-V МК (МИКРОН). 40 GPIO, UART×2, SPI×2, I2C×2, ADC×8.',
    pinCount: 44,
    supported: true,
  },

  // ── Дискретные элементы ───────────────────────────────────
  {
    tag: 'wokwi-led',
    label: 'LED',
    category: 'output',
    description: 'Светодиод с регулировкой цвета и яркости.',
    pinCount: 2,
    supported: true,
  },
  {
    tag: 'wokwi-rgb-led',
    label: 'RGB LED',
    category: 'output',
    description: 'Трёхцветный LED (общий катод).',
    pinCount: 4,
    supported: true,
  },
  {
    tag: 'wokwi-led-bar-graph',
    label: 'LED Bar Graph',
    category: 'output',
    description: 'Светодиодная гребёнка 10 сегментов.',
    pinCount: 20,
    supported: false,
  },
  {
    tag: 'wokwi-neopixel',
    label: 'NeoPixel (WS2812B)',
    category: 'output',
    description: 'Адресный RGB LED WS2812B.',
    pinCount: 4,
    supported: true,
  },
  {
    tag: 'wokwi-neopixel-matrix',
    label: 'NeoPixel Matrix',
    category: 'output',
    description: 'Матрица адресных LED.',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-neopixel-ring',
    label: 'NeoPixel Ring',
    category: 'output',
    description: 'Кольцо адресных LED.',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-buzzer',
    label: 'Зуммер',
    category: 'output',
    description: 'Пьезозуммер с симуляцией звука.',
    pinCount: 2,
    supported: true,
  },
  {
    tag: 'wokwi-servo',
    label: 'Сервопривод',
    category: 'motor',
    description: 'Сервомотор (PWM управление, 0–180°).',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-stepper-motor',
    label: 'Шаговый мотор',
    category: 'motor',
    description: 'Шаговый двигатель с визуализацией вращения.',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-biaxial-stepper',
    label: 'Биосевой степпер',
    category: 'motor',
    description: 'Двухосевой шаговый мотор.',
    pinCount: 8,
    supported: false,
  },

  // ── Кнопки и переключатели ────────────────────────────────
  {
    tag: 'wokwi-pushbutton',
    label: 'Кнопка (DIP)',
    category: 'input',
    description: 'Тактовая кнопка DIP-пакет.',
    pinCount: 2,
    supported: true,
  },
  {
    tag: 'wokwi-pushbutton-6mm',
    label: 'Кнопка 6mm',
    category: 'input',
    description: 'Компактная тактовая кнопка 6×6mm.',
    pinCount: 2,
    supported: false,
  },
  {
    tag: 'wokwi-slide-switch',
    label: 'Слайдер',
    category: 'input',
    description: 'Движковый выключатель SPDT.',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-dip-switch-8',
    label: 'DIP Switch 8',
    category: 'input',
    description: 'Восьмипозиционный DIP-переключатель.',
    pinCount: 16,
    supported: false,
  },
  {
    tag: 'wokwi-ky-040',
    label: 'Энкодер KY-040',
    category: 'input',
    description: 'Поворотный энкодер с кнопкой.',
    pinCount: 5,
    supported: false,
  },
  {
    tag: 'wokwi-analog-joystick',
    label: 'Джойстик',
    category: 'input',
    description: 'Аналоговый джойстик (2 ось + кнопка).',
    pinCount: 5,
    supported: false,
  },
  {
    tag: 'wokwi-tilt-switch',
    label: 'Датчик наклона',
    category: 'input',
    description: 'Тилтовый переключатель.',
    pinCount: 2,
    supported: false,
  },
  {
    tag: 'wokwi-rotary-dialer',
    label: 'Диск набора',
    category: 'input',
    description: 'Импульсный наборный диск (ретро).',
    pinCount: 3,
    supported: false,
  },

  // ── Пассивные элементы ────────────────────────────────────
  {
    tag: 'wokwi-resistor',
    label: 'Резистор',
    category: 'passive',
    description: 'Резистор с цветовыми полосами.',
    pinCount: 2,
    supported: true,
  },
  {
    tag: 'wokwi-potentiometer',
    label: 'Потенциометр',
    category: 'passive',
    description: 'Переменный резистор с регулятором.',
    pinCount: 3,
    supported: true,
  },
  {
    tag: 'wokwi-slide-potentiometer',
    label: 'Ползунковый потенциометр',
    category: 'passive',
    description: 'Линейный потенциометр.',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-ntc-temperature-sensor',
    label: 'Термистор NTC',
    category: 'passive',
    description: 'Термистор с отрицательным ТКС.',
    pinCount: 2,
    supported: false,
  },

  // ── Дисплеи ───────────────────────────────────────────────
  {
    tag: 'wokwi-7segment',
    label: '7-сегментный индикатор',
    category: 'display',
    description: '7-сегментный LED-дисплей с одним знакоместом.',
    pinCount: 7,
    supported: true,
  },
  {
    tag: 'wokwi-lcd1602',
    label: 'LCD 1602',
    category: 'display',
    description: 'Символьный ЖК-дисплей 16×2 (Hitachi HD44780).',
    pinCount: 16,
    supported: false,
  },
  {
    tag: 'wokwi-lcd2004',
    label: 'LCD 2004',
    category: 'display',
    description: 'Символьный ЖК-дисплей 20×4.',
    pinCount: 16,
    supported: false,
  },
  {
    tag: 'wokwi-ssd1306',
    label: 'OLED SSD1306',
    category: 'display',
    description: 'OLED 128×64 I2C (SSD1306).',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-ili9341',
    label: 'TFT ILI9341',
    category: 'display',
    description: 'Цветной TFT 240×320 SPI (ILI9341).',
    pinCount: 8,
    supported: false,
  },
  {
    tag: 'wokwi-membrane-keypad',
    label: 'Мембранная клавиатура',
    category: 'input',
    description: 'Матричная клавиатура 4×4.',
    pinCount: 8,
    supported: false,
  },

  // ── Датчики ───────────────────────────────────────────────
  {
    tag: 'wokwi-dht22',
    label: 'DHT22',
    category: 'sensor',
    description: 'Датчик температуры и влажности DHT22.',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-hc-sr04',
    label: 'HC-SR04',
    category: 'sensor',
    description: 'Ультразвуковой датчик расстояния.',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-pir-motion-sensor',
    label: 'PIR датчик движения',
    category: 'sensor',
    description: 'Пассивный ИК датчик движения.',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-photoresistor-sensor',
    label: 'Фоторезистор',
    category: 'sensor',
    description: 'Датчик освещённости (LDR).',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-flame-sensor',
    label: 'Датчик пламени',
    category: 'sensor',
    description: 'ИК-детектор огня.',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-gas-sensor',
    label: 'Газовый датчик',
    category: 'sensor',
    description: 'Датчик горючих газов (MQ-серия).',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-mpu6050',
    label: 'MPU-6050',
    category: 'sensor',
    description: 'Акселерометр + гироскоп 6-DOF (I2C).',
    pinCount: 8,
    supported: false,
  },
  {
    tag: 'wokwi-heart-beat-sensor',
    label: 'Пульсоксиметр',
    category: 'sensor',
    description: 'Оптический датчик пульса.',
    pinCount: 3,
    supported: false,
  },

  // ── Интерфейсы ────────────────────────────────────────────
  {
    tag: 'wokwi-ds1307',
    label: 'DS1307 (RTC)',
    category: 'comms',
    description: 'Часы реального времени I2C (DS1307).',
    pinCount: 8,
    supported: false,
  },
  {
    tag: 'wokwi-hx711',
    label: 'HX711 (ADC)',
    category: 'comms',
    description: '24-бит АЦП для тензодатчиков.',
    pinCount: 4,
    supported: false,
  },
  {
    tag: 'wokwi-microsd-card',
    label: 'MicroSD',
    category: 'comms',
    description: 'Модуль карты MicroSD (SPI).',
    pinCount: 6,
    supported: false,
  },
  {
    tag: 'wokwi-ir-receiver',
    label: 'ИК приёмник',
    category: 'comms',
    description: 'ИК фотодетектор 38 кГц (VS1838).',
    pinCount: 3,
    supported: false,
  },
  {
    tag: 'wokwi-ir-remote',
    label: 'ИК пульт',
    category: 'comms',
    description: 'ИК пульт дистанционного управления.',
    pinCount: 0,
    supported: false,
  },
];

export const CATALOG_STATS = {
  total: WOKWI_ELEMENT_CATALOG.length,
  supported: WOKWI_ELEMENT_CATALOG.filter(e => e.supported).length,
  byCategory: WOKWI_ELEMENT_CATALOG.reduce<Record<string, number>>((acc, el) => {
    acc[el.category] = (acc[el.category] ?? 0) + 1;
    return acc;
  }, {}),
};
