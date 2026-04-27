// ═══════════════════════════════════════════════════════════════
// MIK32 — библиотека компонентов для визуального редактора схем
// Вдохновлено подходом Wokwi Elements
// ═══════════════════════════════════════════════════════════════

export interface PinDef {
  name: string;
  localX: number;
  localY: number;
  description: string;
}

export type AttrType = 'color-led' | 'select' | 'range';

export interface AttrDef {
  name: string;
  label: string;
  type: AttrType;
  options?: string[];
  min?: number;
  max?: number;
  default: string;
}

export interface ComponentDef {
  type: string;
  label: string;
  emoji: string;
  category: 'output' | 'input' | 'passive';
  description: string;
  w: number;
  h: number;
  defaultAttrs: Record<string, string>;
  attrDefs: AttrDef[];
  pins: PinDef[];
}

// ─── Цвета светодиодов ────────────────────────────────────────

export const LED_COLORS: Record<string, string> = {
  red:    '#ef4444',
  green:  '#22c55e',
  blue:   '#3b82f6',
  yellow: '#facc15',
  orange: '#f97316',
  white:  '#f1f5f9',
  purple: '#a855f7',
};

export const LED_COLORS_DARK: Record<string, string> = {
  red:    '#3b0a0a',
  green:  '#052e16',
  blue:   '#0f172a',
  yellow: '#422006',
  orange: '#431407',
  white:  '#1e293b',
  purple: '#2e1065',
};

// ─── Определения всех компонентов ────────────────────────────

export const COMPONENT_DEFS: Record<string, ComponentDef> = {

  // ── Светодиод (горизонтальный, A=правый, C=левый) ───────────
  led: {
    type: 'led',
    label: 'Светодиод',
    emoji: '💡',
    category: 'output',
    description: 'Светодиод. A — анод (GPIO-выход), C — катод (GND)',
    w: 54,
    h: 30,
    defaultAttrs: { color: 'green' },
    attrDefs: [
      {
        name: 'color',
        label: 'Цвет',
        type: 'color-led',
        options: ['red', 'green', 'blue', 'yellow', 'orange', 'white', 'purple'],
        default: 'green',
      },
    ],
    pins: [
      { name: 'A', localX: 54, localY: 15, description: 'Анод (+)' },
      { name: 'C', localX: 0,  localY: 15, description: 'Катод (−)' },
    ],
  },

  // ── Тактовая кнопка (2 пина, вертикальная) ──────────────────
  button: {
    type: 'button',
    label: 'Кнопка',
    emoji: '🔘',
    category: 'input',
    description: 'Тактовая кнопка. 1 — верх (GPIO), 2 — низ (GND)',
    w: 40,
    h: 54,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: '1', localX: 20, localY: 0,  description: 'Контакт 1 (GPIO)' },
      { name: '2', localX: 20, localY: 54, description: 'Контакт 2 (GND)' },
    ],
  },

  // ── Резистор (горизонтальный) ────────────────────────────────
  resistor: {
    type: 'resistor',
    label: 'Резистор',
    emoji: '⬛',
    category: 'passive',
    description: 'Токоограничивающий резистор. A/B — выводы',
    w: 70,
    h: 20,
    defaultAttrs: { value: '220' },
    attrDefs: [
      {
        name: 'value',
        label: 'Номинал',
        type: 'select',
        options: ['100', '220', '330', '470', '1k', '2.2k', '4.7k', '10k', '100k'],
        default: '220',
      },
    ],
    pins: [
      { name: 'A', localX: 0,  localY: 10, description: 'Вывод A' },
      { name: 'B', localX: 70, localY: 10, description: 'Вывод B' },
    ],
  },

  // ── Зуммер ──────────────────────────────────────────────────
  buzzer: {
    type: 'buzzer',
    label: 'Зуммер',
    emoji: '🔊',
    category: 'output',
    description: 'Пьезозуммер. + — GPIO-выход, − — GND',
    w: 50,
    h: 50,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: '+', localX: 12, localY: 0,  description: 'VCC / GPIO (+)' },
      { name: '-', localX: 38, localY: 0,  description: 'GND (−)' },
    ],
  },

  // ── Потенциометр ─────────────────────────────────────────────
  potentiometer: {
    type: 'potentiometer',
    label: 'Потенциометр',
    emoji: '🎛️',
    category: 'input',
    description: 'Переменный резистор. GND / SIG (АЦП) / VCC',
    w: 70,
    h: 50,
    defaultAttrs: { value: '50' },
    attrDefs: [
      {
        name: 'value',
        label: 'Положение (%)',
        type: 'range',
        min: 0,
        max: 100,
        default: '50',
      },
    ],
    pins: [
      { name: 'GND', localX: 0,  localY: 30, description: 'Земля' },
      { name: 'SIG', localX: 35, localY: 0,  description: 'Сигнал (вход АЦП)' },
      { name: 'VCC', localX: 70, localY: 30, description: 'Питание' },
    ],
  },

  // ── RGB-светодиод ────────────────────────────────────────────
  'rgb-led': {
    type: 'rgb-led',
    label: 'RGB-светодиод',
    emoji: '🌈',
    category: 'output',
    description: 'Трёхцветный LED (общий катод). R/G/B — GPIO, C — GND',
    w: 50,
    h: 60,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: 'R',   localX: 8,  localY: 60, description: 'Красный канал (GPIO)' },
      { name: 'G',   localX: 25, localY: 60, description: 'Зелёный канал (GPIO)' },
      { name: 'B',   localX: 42, localY: 60, description: 'Синий канал (GPIO)' },
      { name: 'COM', localX: 25, localY: 0,  description: 'Общий катод (GND)' },
    ],
  },

  // ── 7-сегментный индикатор (упрощённый) ─────────────────────
  '7seg': {
    type: '7seg',
    label: '7-сегментный',
    emoji: '🔢',
    category: 'output',
    description: '7-сегментный индикатор. A–G — сегменты (GPIO), CC — катод (GND)',
    w: 60,
    h: 80,
    defaultAttrs: { color: 'red' },
    attrDefs: [
      {
        name: 'color',
        label: 'Цвет',
        type: 'color-led',
        options: ['red', 'green', 'blue', 'yellow', 'orange', 'white'],
        default: 'red',
      },
    ],
    pins: [
      { name: 'A',  localX: 5,  localY: 80, description: 'Сегмент A' },
      { name: 'B',  localX: 15, localY: 80, description: 'Сегмент B' },
      { name: 'C',  localX: 25, localY: 80, description: 'Сегмент C' },
      { name: 'D',  localX: 35, localY: 80, description: 'Сегмент D' },
      { name: 'E',  localX: 45, localY: 80, description: 'Сегмент E' },
      { name: 'F',  localX: 55, localY: 80, description: 'Сегмент F' },
      { name: 'CC', localX: 30, localY: 0,  description: 'Общий катод (GND)' },
    ],
  },

  // ── NeoPixel ─────────────────────────────────────────────────
  neopixel: {
    type: 'neopixel',
    label: 'NeoPixel',
    emoji: '✨',
    category: 'output',
    description: 'Адресный RGB-светодиод WS2812B. DIN — GPIO-выход',
    w: 34,
    h: 34,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: 'DIN',  localX: 0,  localY: 17, description: 'Вход данных (GPIO)' },
      { name: 'DOUT', localX: 34, localY: 17, description: 'Выход данных (следующий)' },
      { name: 'VCC',  localX: 17, localY: 0,  description: 'Питание 5В' },
      { name: 'GND',  localX: 17, localY: 34, description: 'Земля' },
    ],
  },

  // ── OLED SSD1306 (I2C, 128×64) ───────────────────────────────
  ssd1306: {
    type: 'ssd1306',
    label: 'OLED SSD1306',
    emoji: '🖥️',
    category: 'output',
    description: 'OLED дисплей 128×64 по I2C. SDA/SCL — I2C, VCC — 3.3В, GND — земля',
    w: 72,
    h: 56,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: 'SDA', localX: 12, localY: 56, description: 'I2C данные (I2C0_SDA / I2C1_SDA)' },
      { name: 'SCL', localX: 28, localY: 56, description: 'I2C тактирование (I2C0_SCL / I2C1_SCL)' },
      { name: 'VCC', localX: 44, localY: 56, description: 'Питание 3.3В' },
      { name: 'GND', localX: 60, localY: 56, description: 'Земля' },
    ],
  },

  // ── Servo SG90 ───────────────────────────────────────────────
  servo: {
    type: 'servo',
    label: 'Servo SG90',
    emoji: '⚙️',
    category: 'output',
    description: 'Сервопривод SG90. SIG — PWM-выход таймера (20 мс период)',
    w: 64,
    h: 52,
    defaultAttrs: { angle: '90' },
    attrDefs: [
      {
        name: 'angle',
        label: 'Угол (°)',
        type: 'range',
        min: 0,
        max: 180,
        default: '90',
      },
    ],
    pins: [
      { name: 'SIG', localX: 0,  localY: 20, description: 'Управляющий PWM-сигнал (GPIO)' },
      { name: 'VCC', localX: 0,  localY: 32, description: 'Питание 5В' },
      { name: 'GND', localX: 0,  localY: 44, description: 'Земля' },
    ],
  },

  // ── DS18B20 (OneWire температурный датчик) ───────────────────
  ds18b20: {
    type: 'ds18b20',
    label: 'DS18B20',
    emoji: '🌡️',
    category: 'input',
    description: 'Цифровой термометр OneWire. DQ — данные (GPIO с подтяжкой 4.7кОм)',
    w: 40,
    h: 56,
    defaultAttrs: { temp: '25' },
    attrDefs: [
      {
        name: 'temp',
        label: 'Температура (°C)',
        type: 'range',
        min: -40,
        max: 125,
        default: '25',
      },
    ],
    pins: [
      { name: 'GND', localX: 8,  localY: 56, description: 'Земля' },
      { name: 'DQ',  localX: 20, localY: 56, description: 'OneWire данные (GPIO + подтяжка)' },
      { name: 'VCC', localX: 32, localY: 56, description: 'Питание 3.3-5В' },
    ],
  },

  // ── 74HC595 (8-битный сдвиговый регистр SPI) ─────────────────
  '74hc595': {
    type: '74hc595',
    label: '74HC595',
    emoji: '🔌',
    category: 'output',
    description: 'Последовательный→параллельный регистр SPI. DS/SH_CP/ST_CP — SPI, Q0-Q7 — выходы',
    w: 60,
    h: 80,
    defaultAttrs: {},
    attrDefs: [],
    pins: [
      { name: 'DS',    localX: 0,  localY: 12, description: 'Последовательные данные (SPI MOSI)' },
      { name: 'SH_CP', localX: 0,  localY: 26, description: 'Тактирование сдвига (SPI CLK)' },
      { name: 'ST_CP', localX: 0,  localY: 40, description: 'Тактирование защёлки (SPI CS)' },
      { name: 'MR',    localX: 0,  localY: 54, description: 'Сброс (активный LOW, подключить к VCC)' },
      { name: 'OE',    localX: 0,  localY: 68, description: 'Разрешение выхода (активный LOW, к GND)' },
      { name: 'VCC',   localX: 30, localY: 0,  description: 'Питание 3.3-5В' },
      { name: 'GND',   localX: 50, localY: 0,  description: 'Земля' },
      { name: 'Q0',    localX: 60, localY: 12, description: 'Выход бит 0' },
      { name: 'Q1',    localX: 60, localY: 22, description: 'Выход бит 1' },
      { name: 'Q2',    localX: 60, localY: 32, description: 'Выход бит 2' },
      { name: 'Q3',    localX: 60, localY: 42, description: 'Выход бит 3' },
      { name: 'Q4',    localX: 60, localY: 52, description: 'Выход бит 4' },
      { name: 'Q5',    localX: 60, localY: 62, description: 'Выход бит 5' },
      { name: 'Q6',    localX: 60, localY: 72, description: 'Выход бит 6' },
      { name: 'QH',    localX: 60, localY: 80, description: 'Выход бит 7 / каскад' },
    ],
  },

  // ── LCD 1602 (16x2 символьный дисплей) ───────────────────────
  lcd1602: {
    type: 'lcd1602',
    label: 'LCD 1602',
    emoji: '📺',
    category: 'output',
    description: 'Символьный дисплей 16×2. RS/E — управление, D4-D7 — данные (4-бит режим)',
    w: 90,
    h: 56,
    defaultAttrs: { text: 'MIK32 Амур     Hello, World!  ' },
    attrDefs: [],
    pins: [
      { name: 'RS',  localX: 8,  localY: 56, description: 'Выбор регистра' },
      { name: 'E',   localX: 20, localY: 56, description: 'Разрешение (строб)' },
      { name: 'D4',  localX: 32, localY: 56, description: 'Данные бит 4' },
      { name: 'D5',  localX: 44, localY: 56, description: 'Данные бит 5' },
      { name: 'D6',  localX: 56, localY: 56, description: 'Данные бит 6' },
      { name: 'D7',  localX: 68, localY: 56, description: 'Данные бит 7' },
      { name: 'VCC', localX: 80, localY: 56, description: 'Питание 5В' },
      { name: 'GND', localX: 80, localY: 44, description: 'Земля' },
    ],
  },
};

export const PALETTE_ORDER = [
  'led', 'button', 'resistor', 'buzzer',
  'potentiometer', 'rgb-led', '7seg', 'neopixel',
  'ssd1306', 'servo', 'ds18b20', '74hc595', 'lcd1602',
];

// ─── Хелперы ──────────────────────────────────────────────────

export function getComponentDef(type: string): ComponentDef | undefined {
  return COMPONENT_DEFS[type];
}

export function getPinPos(
  part: { type: string; x: number; y: number },
  pinName: string,
): { x: number; y: number } | null {
  const def = COMPONENT_DEFS[part.type];
  if (!def) return null;
  const pin = def.pins.find(p => p.name === pinName);
  if (!pin) return null;
  return { x: part.x + pin.localX, y: part.y + pin.localY };
}
