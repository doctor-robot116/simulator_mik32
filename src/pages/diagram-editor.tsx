// ═══════════════════════════════════════════════════════════════
// MIK32 Амур — Визуальный редактор схем (diagram.json подход)
// Вдохновлено Wokwi: компоненты, пины, провода, симуляция
// ═══════════════════════════════════════════════════════════════

import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import { Link, useLocation } from 'wouter';
import {
  COMPONENT_DEFS, PALETTE_ORDER, LED_COLORS, LED_COLORS_DARK,
  type ComponentDef,
} from '@/lib/component-library';
import {
  WOKWI_ELEMENTS_VERSION,
  WOKWI_ELEMENTS_UPDATED,
  WOKWI_ELEMENT_CATALOG,
  CATALOG_STATS,
  type WokwiElementMeta,
} from '@/lib/element-library';
import {
  WIRE_COLORS,
  type Diagram, type DiagramPart, type DiagramConnection,
} from '@/lib/diagram-types';
import { runSimulation, type SimState, type SimResult } from '@/lib/mik32-sim';

// ───────────────────────────────────────────────────────────────
// ГЕОМЕТРИЯ ЧИПА MIK32
// ───────────────────────────────────────────────────────────────

const CX = 370, CY = 80, CW = 200, CH = 320;
const STUB = 13;
const P01_SP = 13;  // шаг пинов GPIO_0/GPIO_1
const P2_SP  = 24;  // шаг пинов GPIO_2

interface ChipPin { name: string; x: number; y: number; group: string }

const MIK32_PINS: ChipPin[] = [
  ...Array.from({ length: 16 }, (_, i) => ({
    name: `P0_${i}`, group: 'GPIO_0',
    x: CX - STUB,
    y: CY + 30 + i * P01_SP,
  })),
  ...Array.from({ length: 16 }, (_, i) => ({
    name: `P1_${i}`, group: 'GPIO_1',
    x: CX + CW + STUB,
    y: CY + 30 + i * P01_SP,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    name: `P2_${i}`, group: 'GPIO_2',
    x: CX + 20 + i * P2_SP,
    y: CY + CH + STUB,
  })),
  { name: 'VCC',  group: 'PWR', x: CX + 45,  y: CY - STUB },
  { name: 'GND',  group: 'PWR', x: CX + 85,  y: CY - STUB },
  { name: '3V3',  group: 'PWR', x: CX + 125, y: CY - STUB },
  { name: 'NRST', group: 'PWR', x: CX + 165, y: CY - STUB },
];

function getMIK32Pin(name: string): ChipPin | undefined {
  return MIK32_PINS.find(p => p.name === name);
}

// ───────────────────────────────────────────────────────────────
// ALTERNATE FUNCTIONS (из pinout.json web-configurator-main)
// ───────────────────────────────────────────────────────────────

const MIK32_ALT_FUNCTIONS: Record<string, string[]> = {
  // PORT 0
  P0_0:  ['SPI0_MISO', 'T32_1_CH1'],  P0_1:  ['SPI0_MOSI', 'T32_1_CH2'],
  P0_2:  ['SPI0_CLK',  'T32_1_CH3', 'ADC2'], P0_3:  ['SPI0_NSS',  'T32_1_CH4'],
  P0_4:  ['SPI0_SS0',  'T32_1_TX',  'ADC3'], P0_5:  ['UART0_RX',  'T16_0_IN1'],
  P0_6:  ['UART0_TX',  'T16_0_IN2'],          P0_7:  ['UART0_CTS', 'T16_0_OUT', 'ADC4'],
  P0_8:  ['UART0_RTS', 'T16_1_IN1'],          P0_9:  ['I2C0_SDA',  'T16_1_IN2', 'ADC5'],
  P0_10: ['I2C0_SCL',  'T16_1_OUT'],          P0_11: ['TDI',       'T16_2_IN1', 'ADC6'],
  P0_12: ['TCK',       'T16_2_IN2'],          P0_13: ['TMS',       'T16_2_OUT', 'ADC7'],
  P0_14: ['TRST'],                             P0_15: ['TDO'],
  // PORT 1
  P1_0:  ['SPI1_MISO', 'T32_2_CH1'],  P1_1:  ['SPI1_MOSI', 'T32_2_CH2'],
  P1_2:  ['SPI1_CLK',  'T32_2_CH3'],  P1_3:  ['SPI1_NSS',  'T32_2_CH4'],
  P1_4:  ['SPI1_SS0',  'T32_2_TX'],   P1_5:  ['SPI1_SS1',  'UART0_CK',  'ADC0'],
  P1_6:  ['SPI1_SS2',  'UART0_DDIS'], P1_7:  ['SPI1_SS3',  'ADC1'],
  P1_8:  ['UART1_RX'],                 P1_9:  ['UART1_TX'],
  P1_10: ['UART1_CTS'],                P1_11: ['UART1_RTS', 'REF'],
  P1_12: ['I2C1_SDA',  'UART0_DTR',  'DAC0'], P1_13: ['I2C1_SCL', 'UART0_DCD', 'DAC1'],
  P1_14: ['SPI0_SS1',  'UART0_DSR'], P1_15: ['SPI0_SS2',  'UART0_RI'],
  // PORT 2
  P2_0:  ['SPIFI_CLK', 'UART1_DTR'], P2_1:  ['SPIFI_CS',  'UART1_DCD'],
  P2_2:  ['SPIFI_D0',  'UART1_DSR'], P2_3:  ['SPIFI_D1',  'UART1_RI'],
  P2_4:  ['SPIFI_D2'], P2_5:  ['SPIFI_D3'],
  P2_6:  ['SPI0_SS3',  'UART1_CK'], P2_7:  [],
};

function altFnColor(fn: string): string {
  if (fn.startsWith('UART'))  return '#f97316';
  if (fn.startsWith('SPI') || fn.startsWith('SPIFI')) return '#60a5fa';
  if (fn.startsWith('I2C'))   return '#c084fc';
  if (fn.startsWith('ADC') || fn.startsWith('DAC')) return '#fbbf24';
  if (fn.startsWith('T16') || fn.startsWith('T32')) return '#34d399';
  if (['TDI','TDO','TCK','TMS','TRST'].includes(fn)) return '#6b7280';
  return '#94a3b8';
}

// ───────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ───────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function resolvePin(ref: string, parts: DiagramPart[]): { x: number; y: number } | null {
  if (ref.startsWith('mik32:')) {
    const pin = getMIK32Pin(ref.slice(6));
    return pin ? { x: pin.x, y: pin.y } : null;
  }
  const [partId, pinName] = ref.split(':');
  const part = parts.find(p => p.id === partId);
  const def = part ? COMPONENT_DEFS[part.type] : undefined;
  const pin = def?.pins.find(p => p.name === pinName);
  if (!part || !pin) return null;
  return { x: part.x + pin.localX, y: part.y + pin.localY };
}

function routeWire(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
    return `M${a.x},${a.y} L${mx},${a.y} L${mx},${b.y} L${b.x},${b.y}`;
  }
  return `M${a.x},${a.y} L${a.x},${my} L${b.x},${my} L${b.x},${b.y}`;
}

function distPointSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function findWireAt(cx: number, cy: number, connections: DiagramConnection[], parts: DiagramPart[]): string | null {
  const THRESH = 7;
  for (const conn of connections) {
    const a = resolvePin(conn.from, parts);
    const b = resolvePin(conn.to, parts);
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let segs: [number, number, number, number][];
    if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
      segs = [[a.x, a.y, mx, a.y], [mx, a.y, mx, b.y], [mx, b.y, b.x, b.y]];
    } else {
      segs = [[a.x, a.y, a.x, my], [a.x, my, b.x, my], [b.x, my, b.x, b.y]];
    }
    for (const [sx1, sy1, sx2, sy2] of segs) {
      if (distPointSeg(cx, cy, sx1, sy1, sx2, sy2) < THRESH) return conn.id;
    }
  }
  return null;
}

function findPartAt(cx: number, cy: number, parts: DiagramPart[]): string | null {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    const def = COMPONENT_DEFS[p.type];
    if (!def) continue;
    const PAD = 6;
    if (cx >= p.x - PAD && cx <= p.x + def.w + PAD && cy >= p.y - PAD && cy <= p.y + def.h + PAD)
      return p.id;
  }
  return null;
}

const PIN_HIT = 10;
function findPinAt(
  cx: number, cy: number, parts: DiagramPart[], excludePart?: string,
): { ref: string; x: number; y: number } | null {
  for (const pin of MIK32_PINS) {
    if (Math.hypot(cx - pin.x, cy - pin.y) < PIN_HIT)
      return { ref: `mik32:${pin.name}`, x: pin.x, y: pin.y };
  }
  for (const part of parts) {
    if (part.id === excludePart) continue;
    const def = COMPONENT_DEFS[part.type];
    if (!def) continue;
    for (const pin of def.pins) {
      const px = part.x + pin.localX, py = part.y + pin.localY;
      if (Math.hypot(cx - px, cy - py) < PIN_HIT)
        return { ref: `${part.id}:${pin.name}`, x: px, y: py };
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────
// ГЕНЕРАЦИЯ C-КОДА по схеме
// ───────────────────────────────────────────────────────────────

function generateCode(parts: DiagramPart[], connections: DiagramConnection[]): string {
  type PinInfo = { port: number; pin: number };
  const outputs: PinInfo[] = [];
  const inputs: PinInfo[] = [];

  for (const conn of connections) {
    const mik32Ref = conn.from.startsWith('mik32:') ? conn.from
      : conn.to.startsWith('mik32:') ? conn.to : null;
    if (!mik32Ref) continue;
    const pinName = mik32Ref.slice(6);
    const m = pinName.match(/^P([012])_(\d+)$/);
    if (!m) continue;
    const info: PinInfo = { port: +m[1], pin: +m[2] };

    const compRef = conn.from.startsWith('mik32:') ? conn.to : conn.from;
    const partId = compRef.split(':')[0];
    const part = parts.find(p => p.id === partId);
    const def = part ? COMPONENT_DEFS[part.type] : undefined;
    if (def?.category === 'output') outputs.push(info);
    if (def?.category === 'input') inputs.push(info);
  }

  const dedup = (arr: PinInfo[]) => arr.filter(
    (a, i) => arr.findIndex(b => b.port === a.port && b.pin === a.pin) === i,
  );
  const outPins = dedup(outputs);
  const inPins  = dedup(inputs);
  const allPorts = [...new Set([...outPins, ...inPins].map(p => p.port))].sort();

  const byPort = (arr: PinInfo[]) => {
    const m = new Map<number, number[]>();
    arr.forEach(p => { if (!m.has(p.port)) m.set(p.port, []); m.get(p.port)!.push(p.pin); });
    return m;
  };

  let code = `#include "mik32_hal_pcc.h"\n#include "mik32_hal_gpio.h"\n`;
  if (outputs.length === 0 && inputs.length === 0) {
    return code + '\n// Подключите компоненты к пинам MIK32 для генерации кода\n\nvoid SystemClock_Config(void);\n\nint main(void)\n{\n    SystemClock_Config();\n\n    while (1)\n    {\n        // Ваш код здесь\n    }\n}\n\nvoid SystemClock_Config(void)\n{\n    /* Настройка тактирования */\n}\n';
  }

  code += `\nvoid SystemClock_Config(void);\nvoid GPIO_Init(void);\n\nint main(void)\n{\n    SystemClock_Config();\n    GPIO_Init();\n\n    while (1)\n    {\n`;
  for (const p of outPins)
    code += `        HAL_GPIO_TogglePin(GPIO_${p.port}, GPIO_PIN_${p.pin});\n`;
  if (inPins.length > 0)
    code += `\n        /* Чтение кнопок */\n`;
  for (const p of inPins)
    code += `        // uint32_t btn${p.port}_${p.pin} = HAL_GPIO_ReadPin(GPIO_${p.port}, GPIO_PIN_${p.pin});\n`;
  code += `        HAL_DelayMs(500);\n    }\n}\n\nvoid SystemClock_Config(void)\n{\n    PCC_InitTypeDef PCC_OscInit = {0};\n    PCC_OscInit.OscillatorEnable         = PCC_OSCILLATORTYPE_ALL;\n    PCC_OscInit.FreqMon.OscillatorSystem = PCC_OSCILLATORTYPE_OSC32M;\n    PCC_OscInit.FreqMon.ForceOscSys      = PCC_FORCE_OSC_SYS_UNFIXED;\n    PCC_OscInit.FreqMon.Force32KClk      = PCC_FREQ_MONITOR_SOURCE_OSC32K;\n    PCC_OscInit.AHBDivider               = 0;\n    PCC_OscInit.APBMDivider              = 0;\n    PCC_OscInit.APBPDivider              = 0;\n    PCC_OscInit.HSI32MCalibrationValue   = 128;\n    PCC_OscInit.LSI32KCalibrationValue   = 8;\n    PCC_OscInit.RTCClockSelection        = PCC_RTC_CLOCK_SOURCE_AUTO;\n    PCC_OscInit.RTCClockCPUSelection     = PCC_CPU_RTC_CLOCK_SOURCE_OSC32K;\n    HAL_PCC_Config(&PCC_OscInit);\n}\n\nvoid GPIO_Init(void)\n{\n    GPIO_InitTypeDef GPIO_InitStruct = {0};\n`;
  for (const port of allPorts)
    code += `    __HAL_PCC_GPIO_${port}_CLK_ENABLE();\n`;
  code += '\n';

  for (const [port, pins] of byPort(outPins)) {
    const mask = pins.map(p => `GPIO_PIN_${p}`).join(' | ');
    code += `    // Выходы GPIO_${port}\n    GPIO_InitStruct.Pin  = ${mask};\n    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;\n    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;\n    HAL_GPIO_Init(GPIO_${port}, &GPIO_InitStruct);\n\n`;
  }
  for (const [port, pins] of byPort(inPins)) {
    const mask = pins.map(p => `GPIO_PIN_${p}`).join(' | ');
    code += `    // Входы GPIO_${port}\n    GPIO_InitStruct.Pin  = ${mask};\n    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_INPUT;\n    GPIO_InitStruct.Pull = HAL_GPIO_PULL_UP;\n    HAL_GPIO_Init(GPIO_${port}, &GPIO_InitStruct);\n\n`;
  }
  code += '}\n';
  return code;
}

// ───────────────────────────────────────────────────────────────
// ЧИП MIK32 — SVG-РЕНДЕР
// ───────────────────────────────────────────────────────────────

function ChipSVG({
  gpioState, wiringMode, onPinClick, showAltFns, hoveredChipPin, onPinHover,
}: {
  gpioState: SimState['gpio'] | null;
  wiringMode: boolean;
  onPinClick: (ref: string, x: number, y: number) => void;
  showAltFns: boolean;
  hoveredChipPin: string | null;
  onPinHover: (name: string | null) => void;
}) {
  const pinColor = (name: string) => {
    const m = name.match(/^P([012])_(\d+)$/);
    if (!m || !gpioState) return '#252525';
    const port = +m[1] as 0 | 1 | 2, pin = +m[2];
    const p = gpioState[port]?.pins[pin];
    if (!p || p.mode === 'unset') return '#252525';
    if (p.value) {
      if (port === 0) return '#4ec9b0';
      if (port === 1) return '#9cdcfe';
      return '#dcdcaa';
    }
    if (port === 0) return '#1a4a40';
    if (port === 1) return '#1a304a';
    return '#3a3a10';
  };

  const groupColors: Record<string, string> = {
    GPIO_0: '#4ec9b0', GPIO_1: '#9cdcfe', GPIO_2: '#dcdcaa', PWR: '#f87171',
  };

  return (
    <g>
      {/* Chip body */}
      <rect x={CX} y={CY} width={CW} height={CH} rx={5}
        fill="#0a0a0a" stroke="#2a2a2a" strokeWidth={1.5} />
      <rect x={CX + 1} y={CY + 1} width={CW - 2} height={CH - 2} rx={4}
        fill="none" stroke="#1a4a35" strokeWidth={2} />

      {/* Pin-1 notch */}
      <circle cx={CX + 12} cy={CY + 12} r={5} fill="#1a1a1a" stroke="#333" strokeWidth={1} />

      {/* Center labels */}
      <text x={CX + CW / 2} y={CY + CH / 2 - 22} textAnchor="middle"
        fill="#e8e8e8" fontSize={14} fontWeight="bold" fontFamily="monospace" letterSpacing={1}>
        MIK32 Амур
      </text>
      <text x={CX + CW / 2} y={CY + CH / 2 - 4} textAnchor="middle"
        fill="#555" fontSize={9} fontFamily="monospace">
        SCR1 RISC-V 32-бит
      </text>
      <text x={CX + CW / 2} y={CY + CH / 2 + 10} textAnchor="middle"
        fill="#444" fontSize={8} fontFamily="monospace">
        LQFP-100
      </text>
      <rect x={CX + CW / 2 - 22} y={CY + CH / 2 + 18} width={44} height={18}
        rx={2} fill="#111" stroke="#2a3a30" strokeWidth={1} />
      <text x={CX + CW / 2} y={CY + CH / 2 + 30} textAnchor="middle"
        fill="#3a5a4a" fontSize={8} fontFamily="monospace">
        МИЛАНДР
      </text>

      {/* Port labels */}
      <text x={CX - 18} y={CY + 10} textAnchor="end" fontSize={8} fill="#4ec9b0" fontFamily="monospace">GPIO_0</text>
      <text x={CX + CW + 18} y={CY + 10} textAnchor="start" fontSize={8} fill="#9cdcfe" fontFamily="monospace">GPIO_1</text>
      <text x={CX + CW / 2} y={CY + CH + 30} textAnchor="middle" fontSize={8} fill="#dcdcaa" fontFamily="monospace">GPIO_2</text>

      {/* All pins */}
      {MIK32_PINS.map(pin => {
        const isGPIO = pin.name.startsWith('P');
        const col = isGPIO ? pinColor(pin.name) : (pin.name === 'GND' ? '#475569' : '#fbbf24');
        const groupCol = groupColors[pin.group] ?? '#9ca3af';
        const isPwr = pin.group === 'PWR';
        const isHovered = hoveredChipPin === pin.name;
        const altFns = isGPIO ? (MIK32_ALT_FUNCTIONS[pin.name] ?? []) : [];
        const primaryAlt = altFns[0];
        const primaryCol = primaryAlt ? altFnColor(primaryAlt) : groupCol;

        return (
          <g key={pin.name}
            onMouseEnter={() => isGPIO && onPinHover(pin.name)}
            onMouseLeave={() => onPinHover(null)}
          >
            {/* Stub line from chip edge to pin */}
            {pin.group === 'GPIO_0' && (
              <rect x={CX - STUB} y={pin.y - 2} width={STUB} height={4} rx={1}
                fill={isHovered ? primaryCol : '#5a4a3a'} opacity={isHovered ? 0.9 : 1} />
            )}
            {pin.group === 'GPIO_1' && (
              <rect x={CX + CW} y={pin.y - 2} width={STUB} height={4} rx={1}
                fill={isHovered ? primaryCol : '#5a4a3a'} opacity={isHovered ? 0.9 : 1} />
            )}
            {pin.group === 'GPIO_2' && (
              <rect x={pin.x - 2} y={CY + CH} width={4} height={STUB} rx={1}
                fill={isHovered ? primaryCol : '#5a4a3a'} opacity={isHovered ? 0.9 : 1} />
            )}
            {isPwr && (
              <rect x={pin.x - 2} y={CY - STUB} width={4} height={STUB} rx={1} fill="#5a4a3a" />
            )}

            {/* Pin dot (connection point) */}
            <circle
              cx={pin.x} cy={pin.y} r={isHovered ? 5.5 : wiringMode ? 6 : 4}
              fill={isHovered ? primaryCol : col}
              stroke={isHovered ? primaryCol : wiringMode ? groupCol : '#333'}
              strokeWidth={isHovered ? 1.5 : wiringMode ? 1.5 : 0.8}
              className={wiringMode ? 'cursor-crosshair' : 'cursor-pointer'}
              onMouseDown={(e) => {
                if (!wiringMode) return;
                e.stopPropagation();
                onPinClick(`mik32:${pin.name}`, pin.x, pin.y);
              }}
            />

            {/* Pin name label */}
            {pin.group === 'GPIO_0' && (
              <text x={CX - STUB - 4} y={pin.y + 3} textAnchor="end"
                fontSize={7} fill={isHovered ? groupCol : isGPIO && gpioState ? groupCol : '#3a3a3a'} fontFamily="monospace"
                fontWeight={isHovered ? 'bold' : 'normal'}>
                {pin.name}
              </text>
            )}
            {pin.group === 'GPIO_1' && (
              <text x={CX + CW + STUB + 4} y={pin.y + 3} textAnchor="start"
                fontSize={7} fill={isHovered ? groupCol : isGPIO && gpioState ? groupCol : '#3a3a3a'} fontFamily="monospace"
                fontWeight={isHovered ? 'bold' : 'normal'}>
                {pin.name}
              </text>
            )}
            {pin.group === 'GPIO_2' && (
              <text x={pin.x} y={CY + CH + STUB + 14} textAnchor="middle"
                fontSize={6.5} fill={isHovered ? groupCol : isGPIO && gpioState ? groupCol : '#3a3a3a'} fontFamily="monospace"
                fontWeight={isHovered ? 'bold' : 'normal'}>
                {pin.name}
              </text>
            )}
            {isPwr && (
              <text x={pin.x} y={CY - STUB - 5} textAnchor="middle"
                fontSize={7} fill={groupCol} fontFamily="monospace">
                {pin.name}
              </text>
            )}

            {/* Alt function label (showAltFns mode) */}
            {showAltFns && isGPIO && primaryAlt && (
              <>
                {pin.group === 'GPIO_0' && (
                  <text x={CX - STUB - 48} y={pin.y + 3} textAnchor="end"
                    fontSize={6} fill={primaryCol} fontFamily="monospace" opacity={0.85}>
                    {primaryAlt}
                  </text>
                )}
                {pin.group === 'GPIO_1' && (
                  <text x={CX + CW + STUB + 48} y={pin.y + 3} textAnchor="start"
                    fontSize={6} fill={primaryCol} fontFamily="monospace" opacity={0.85}>
                    {primaryAlt}
                  </text>
                )}
                {pin.group === 'GPIO_2' && (
                  <text x={pin.x} y={CY + CH + STUB + 24} textAnchor="middle"
                    fontSize={5.5} fill={primaryCol} fontFamily="monospace" opacity={0.85}>
                    {primaryAlt}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ───────────────────────────────────────────────────────────────
// SVG КОМПОНЕНТЫ
// ───────────────────────────────────────────────────────────────

function ComponentSVG({
  part, isSelected, gpioState, wiringMode, onBodyDown, onPinDown,
}: {
  part: DiagramPart;
  isSelected: boolean;
  gpioState: SimState['gpio'] | null;
  wiringMode: boolean;
  onBodyDown: (e: React.MouseEvent) => void;
  onPinDown: (pinName: string, x: number, y: number, e: React.MouseEvent) => void;
}) {
  const def = COMPONENT_DEFS[part.type];
  if (!def) return null;

  // Check if output pin is HIGH (for LED glow etc.)
  const getGPIOValue = (pinName: string): boolean => {
    if (!gpioState) return false;
    const conn = undefined; // will be computed from connections in parent
    void conn; void pinName;
    return false;
  };
  void getGPIOValue;

  return (
    <g transform={`translate(${part.x},${part.y})`}>
      {/* Component body */}
      <ComponentBody part={part} def={def} gpioState={gpioState}
        onBodyDown={onBodyDown} />

      {/* Selection outline */}
      {isSelected && (
        <rect x={-5} y={-5} width={def.w + 10} height={def.h + 10}
          fill="none" stroke="#22c55e" strokeWidth={1.5}
          strokeDasharray="5,3" rx={4} pointerEvents="none" />
      )}

      {/* Pin dots */}
      {def.pins.map(pin => (
        <g key={pin.name}>
          <circle cx={pin.localX} cy={pin.localY} r={wiringMode ? 7 : 4.5}
            fill={wiringMode ? '#0d2e18' : '#1a2a18'}
            stroke={wiringMode ? '#22c55e' : '#2a5a40'}
            strokeWidth={1.5}
            className={wiringMode ? 'cursor-crosshair' : 'cursor-default'}
            onMouseDown={e => {
              if (!wiringMode) return;
              e.stopPropagation();
              onPinDown(pin.name, part.x + pin.localX, part.y + pin.localY, e);
            }}
          />
          {wiringMode && (
            <text x={pin.localX} y={pin.localY - 9} textAnchor="middle"
              fontSize={7} fill="#22c55e" fontFamily="monospace" pointerEvents="none">
              {pin.name}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

// ─── Вспомогательные функции рендеринга ──────────────────────

// EIA resistor color bands (from wokwi-elements resistor-element.ts)
const BAND_COLORS = [
  '#000000','#8B4513','#ff2200','#ff8800','#ffff00',
  '#00aa00','#0055ff','#aa00ff','#aaaaaa','#ffffff',
];
function resistorBands(val: string): [string, string, string, string] {
  const ohms = val.endsWith('k') || val.endsWith('K')
    ? parseFloat(val) * 1000
    : val.endsWith('M') ? parseFloat(val) * 1_000_000
    : parseFloat(val);
  if (!isFinite(ohms) || ohms <= 0) return ['#000','#000','#000','#d4af37'];
  const exp = Math.max(0, Math.floor(Math.log10(ohms)) - 1);
  const base = Math.round(ohms / Math.pow(10, exp));
  const d1 = Math.floor(base / 10) % 10;
  const d2 = base % 10;
  const d3 = exp;
  return [
    BAND_COLORS[d1] ?? '#000',
    BAND_COLORS[d2] ?? '#000',
    BAND_COLORS[Math.max(0, Math.min(9, d3))] ?? '#000',
    '#d4af37', // tolerance: gold
  ];
}

function ComponentBody({
  part, def, gpioState, onBodyDown,
}: {
  part: DiagramPart;
  def: ComponentDef;
  gpioState: SimState['gpio'] | null;
  onBodyDown: (e: React.MouseEvent) => void;
}) {
  void gpioState;
  const attrs = part.attrs;
  const pid = part.id; // unique id for filter namespacing

  const bodyProps = {
    onMouseDown: onBodyDown,
    style: { cursor: 'grab' } as React.CSSProperties,
  };

  // ── LED (horizontal, inspired by wokwi led-element.ts) ─────────
  if (part.type === 'led') {
    const color = LED_COLORS[attrs.color] ?? '#22c55e';
    const lightColor = {
      red:'#ff8080', green:'#80ff80', blue:'#8080ff',
      yellow:'#ffff80', orange:'#ffcf80', white:'#ffffff', purple:'#ff80ff',
    }[attrs.color as string] ?? '#80ff80';
    return (
      <g {...bodyProps}>
        {/* Leads */}
        <line x1={0} y1={15} x2={12} y2={15} stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={42} y1={15} x2={54} y2={15} stroke="#8c8c8c" strokeWidth={1.5} />
        {/* LED body — viewBox from wokwi led-element.ts */}
        <svg x={8} y={0} width={38} height={30} viewBox="-10 -5 35.456 39.618">
          <defs>
            <filter id={`glow-${pid}`} x="-0.8" y="-0.8" height="2.2" width="2.8">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Wokwi LED dome paths */}
          <path d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            opacity=".3" />
          <path d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill="#e6e6e6" opacity=".5" />
          <path d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
            fill="#d1d1d1" opacity=".9" />
          <polygon points="2.2032 16.107 3.1961 16.107 3.1961 13.095 6.0156 13.095 10.012 8.8049 3.407 8.8049 2.2032 9.648"
            fill="#666666" />
          <polygon points="11.215 9.0338 7.4117 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.5241 10.778 8.5241"
            fill="#666666" />
          <path d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill={color} opacity=".65" />
          {/* Highlight */}
          <path d="m10.388 3.7541 1.4364-0.2736c-0.84168-1.1318-2.0822-1.9577-3.5417-2.2385l0.25416 1.0807c0.76388 0.27072 1.4068 0.78048 1.8511 1.4314z"
            fill="#ffffff" opacity=".5" />
          {/* Lead wires from Wokwi source */}
          <rect x="2.5099" y="20.382" width="2.1514" height="9.8273" fill="#8c8c8c" />
          <path d="m12.977 30.269c0-1.1736-0.86844-2.5132-1.8916-3.4024-0.41616-0.3672-1.1995-1.0015-1.1995-1.4249v-5.4706h-2.1614v5.7802c0 1.0584 0.94752 1.8785 1.9462 2.7482 0.44424 0.37584 1.3486 1.2496 1.3486 1.7694"
            fill="#8c8c8c" />
          {/* Glow overlay */}
          <ellipse cx="7" cy="10" rx="9" ry="9" fill={lightColor}
            filter={`url(#glow-${pid})`} opacity={0.35} />
        </svg>
        {/* C/A labels */}
        <text x={4} y={28} textAnchor="middle" fontSize={7} fill="#4a6a56" fontFamily="monospace">C</text>
        <text x={50} y={28} textAnchor="middle" fontSize={7} fill="#4a6a56" fontFamily="monospace">A</text>
      </g>
    );
  }

  // ── Кнопка (wokwi pushbutton-element.ts style) ─────────────────
  if (part.type === 'button') {
    return (
      <g {...bodyProps}>
        {/* PCB body */}
        <rect x={5} y={3} width={30} height={48} rx={2}
          fill="#464646" stroke="#333" strokeWidth={1} />
        <rect x={6.5} y={4.5} width={27} height={45} rx={1.5}
          fill="#eaeaea" />
        {/* Corner screws */}
        <circle cx={10} cy={8} r={1.5} fill="#1b1b1b" />
        <circle cx={30} cy={8} r={1.5} fill="#1b1b1b" />
        <circle cx={10} cy={45} r={1.5} fill="#1b1b1b" />
        <circle cx={30} cy={45} r={1.5} fill="#1b1b1b" />
        {/* Button cap */}
        <rect x={11} y={16} width={18} height={22} rx={3}
          fill="#22c55e" stroke="#166534" strokeWidth={1} />
        <rect x={12} y={17} width={10} height={5} rx={1}
          fill="rgba(255,255,255,0.3)" />
        {/* Leads */}
        <line x1={20} y1={0} x2={20} y2={5} stroke="#8c8c8c" strokeWidth={2} />
        <line x1={20} y1={51} x2={20} y2={54} stroke="#8c8c8c" strokeWidth={2} />
        <text x={20} y={62} textAnchor="middle" fontSize={7} fill="#4a6a56" fontFamily="monospace">BTN</text>
      </g>
    );
  }

  // ── Резистор (wokwi resistor-element.ts, EIA color bands) ──────
  if (part.type === 'resistor') {
    const val = attrs.value ?? '220';
    const [b1, b2, b3, b4] = resistorBands(val);
    return (
      <g {...bodyProps}>
        {/* Leads — from wokwi source */}
        <rect x={0} y={8.5} width={15} height={1.1} fill="#aaa" />
        <rect x={55} y={8.5} width={15} height={1.1} fill="#aaa" />
        {/* Body — beige resistor inspired by wokwi resistor-element.ts */}
        <path d="M15 5 Q15 2 18 2 L52 2 Q55 2 55 5 L55 13 Q55 16 52 16 L18 16 Q15 16 15 13 Z"
          fill="#d5b597" stroke="#b8956a" strokeWidth={0.5} />
        {/* Highlight sheen */}
        <path d="M18 3 L52 3 Q54 3 54 5 L54 6 Q54 4 52 4 L18 4 Q16 4 16 6 L16 5 Q16 3 18 3 Z"
          fill="rgba(255,255,255,0.4)" />
        {/* EIA color bands */}
        <rect x={20} y={2} width={4} height={14} rx={1} fill={b1} />
        <rect x={27} y={2} width={4} height={14} rx={1} fill={b2} />
        <rect x={34} y={2} width={4} height={14} rx={1} fill={b3} />
        <rect x={43} y={2} width={3} height={14} rx={1} fill={b4} />
        {/* Value */}
        <text x={35} y={24} textAnchor="middle" fontSize={7} fill="#4a6a56" fontFamily="monospace">{val}Ω</text>
      </g>
    );
  }

  // ── Зуммер (wokwi buzzer-element.ts) ───────────────────────────
  if (part.type === 'buzzer') {
    return (
      <g {...bodyProps}>
        {/* Leads */}
        <line x1={12} y1={0} x2={12} y2={8} stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={38} y1={0} x2={38} y2={8} stroke="#ff2222" strokeWidth={1.5} />
        {/* Outer body — wokwi buzzer is black disk */}
        <ellipse cx={25} cy={30} rx={22} ry={21}
          fill="#1a1a1a" stroke="#333" strokeWidth={0.7} />
        {/* Wokwi-style concentric rings */}
        <circle cx={25} cy={30} r={16.8} fill="none" stroke="#2a2a2a" strokeWidth={0.8} />
        <circle cx={25} cy={30} r={11.5} fill="none" stroke="#2a2a2a" strokeWidth={0.8} />
        {/* Center dome */}
        <circle cx={25} cy={30} r={3.6} fill="#cccccc" stroke="#888" strokeWidth={0.6} />
        {/* +/− labels */}
        <text x={12} y={14} textAnchor="middle" fontSize={8} fill="#f87171" fontFamily="monospace">+</text>
        <text x={38} y={14} textAnchor="middle" fontSize={8} fill="#9ca3af" fontFamily="monospace">−</text>
        <text x={25} y={56} textAnchor="middle" fontSize={7} fill="#4a6a56" fontFamily="monospace">BUZZ</text>
      </g>
    );
  }

  // ── Потенциометр (wokwi potentiometer-element.ts) ──────────────
  if (part.type === 'potentiometer') {
    const val = parseInt(attrs.value ?? '50');
    const knobDeg = (val / 100) * 270 - 225; // startDegree=-225, endDegree=45 (wokwi)
    const rad = (knobDeg * Math.PI) / 180;
    const kx = 35 + Math.cos(rad) * 7;
    const ky = 18 + Math.sin(rad) * 7;
    return (
      <g {...bodyProps}>
        {/* PCB — blue like wokwi potentiometer (#045881) */}
        <rect x={0} y={8} width={70} height={34} rx={1.5}
          fill="#045881" stroke="#033d5e" strokeWidth={0.5} />
        {/* Top label strip */}
        <rect x={20} y={8} width={30} height={5.5} rx={0.5} fill="#ccdae3" />
        {/* Corner mounting holes */}
        <circle cx={4} cy={12} r={2.5} fill="#033d5e" />
        <circle cx={66} cy={12} r={2.5} fill="#033d5e" />
        <circle cx={4} cy={38} r={2.5} fill="#033d5e" />
        <circle cx={66} cy={38} r={2.5} fill="#033d5e" />
        {/* Knob — wokwi uses ellipse with indicator */}
        <ellipse cx={35} cy={18} rx={11} ry={11}
          fill="#e4e8eb" stroke="#bbb" strokeWidth={0.4} />
        {/* Knob indicator line */}
        <line x1={35} y1={18} x2={kx} y2={ky} stroke="#333" strokeWidth={1.5} strokeLinecap="round" />
        {/* Pin labels — from wokwi potentiometer */}
        <text x={5} y={50} textAnchor="middle" fontSize={7} fill="#ccdae3" fontFamily="monospace">GND</text>
        <text x={35} y={50} textAnchor="middle" fontSize={7} fill="#ccdae3" fontFamily="monospace">SIG</text>
        <text x={64} y={50} textAnchor="middle" fontSize={7} fill="#ccdae3" fontFamily="monospace">VCC</text>
        {/* Pin connector strip */}
        <rect x={20} y={38} width={30} height={4.5} rx={0.5} fill="#fff3" />
        <circle cx={6} cy={42} r={2} fill="#b3b1b0" />
        <circle cx={35} cy={42} r={2} fill="#b3b1b0" />
        <circle cx={64} cy={42} r={2} fill="#b3b1b0" />
        {/* Leads */}
        <line x1={0}  y1={30} x2={7}  y2={30} stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={35} y1={0}  x2={35} y2={8}  stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={63} y1={30} x2={70} y2={30} stroke="#8c8c8c" strokeWidth={1.5} />
      </g>
    );
  }

  // ── RGB-светодиод (wokwi rgb-led-element.ts) ───────────────────
  if (part.type === 'rgb-led') {
    return (
      <g {...bodyProps}>
        {/* Legs — from wokwi rgb-led-element.ts */}
        <line x1={8}  y1={46} x2={8}  y2={60} stroke="#9D9999" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={25} y1={0}  x2={25} y2={5}  stroke="#9D9999" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={25} y1={46} x2={25} y2={60} stroke="#9D9999" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={42} y1={46} x2={42} y2={60} stroke="#9D9999" strokeWidth={1.5} strokeLinecap="round" />
        {/* LED body — wokwi rgb-led paths */}
        <path d="m33.2 18v-5.91c0-3.91-3.17-7.09-7.09-7.09-3.91 0-7.09 3.17-7.09 7.09v13.65c1.47 1.65 4.10 2.75 7.09 2.75 4.62 0 8.37-2.62 8.37-5.86v-1.52c0-1.14-0.47-2.20-1.28-3.11z"
          opacity=".3" />
        <path d="m33.2 18v-5.91c0-3.91-3.17-7.09-7.09-7.09-3.91 0-7.09 3.17-7.09 7.09v13.65c1.47 1.65 4.10 2.75 7.09 2.75 4.62 0 8.37-2.62 8.37-5.86v-1.52c0-1.14-0.47-2.20-1.28-3.11z"
          fill="#e6e6e6" opacity=".5" />
        <path d="m33.2 18v3.11c0 2.74-3.17 4.97-7.09 4.97-3.91 0-7.09-2.22-7.09-4.97v4.63c1.47 1.65 4.10 2.75 7.09 2.75 4.62 0 8.37-2.62 8.37-5.86v-1.52c0-1.14-0.47-2.20-1.28-3.11z"
          fill="#d1d1d1" opacity=".9" />
        {/* RGB segments in dome */}
        <polygon points="22 21 22.9 21 22.9 18 25.7 18 29.7 13.7 23.1 13.7 21.9 14.5"
          fill="#666" />
        <polygon points="28.9 14.0 25.1 18 28.8 18 28.8 21 29.7 21 29.7 13.5 28.5 13.5"
          fill="#666" />
        {/* Color fill */}
        <path d="m33.2 18v-5.91c0-3.91-3.17-7.09-7.09-7.09-3.91 0-7.09 3.17-7.09 7.09v13.65c1.47 1.65 4.10 2.75 7.09 2.75 4.62 0 8.37-2.62 8.37-5.86v-1.52c0-1.14-0.47-2.20-1.28-3.11z"
          fill="white" opacity=".65" />
        {/* RGB glow spots */}
        <ellipse cx={22} cy={16} rx={3} ry={3} fill="#ff0000" opacity={0.4} />
        <ellipse cx={30} cy={16} rx={3} ry={3} fill="#00ff00" opacity={0.4} />
        <ellipse cx={26} cy={21} rx={3} ry={3} fill="#0000ff" opacity={0.4} />
        {/* Labels */}
        <text x={8}  y={68} textAnchor="middle" fontSize={7} fill="#ef4444" fontFamily="monospace">R</text>
        <text x={25} y={68} textAnchor="middle" fontSize={7} fill="#22c55e" fontFamily="monospace">G</text>
        <text x={42} y={68} textAnchor="middle" fontSize={7} fill="#3b82f6" fontFamily="monospace">B</text>
        <text x={25} y={-4} textAnchor="middle" fontSize={7} fill="#9ca3af" fontFamily="monospace">COM</text>
      </g>
    );
  }

  // ── 7-сегментный индикатор ─────────────────────────────────────
  if (part.type === '7seg') {
    const color = LED_COLORS[attrs.color] ?? '#ef4444';
    const dark = LED_COLORS_DARK[attrs.color] ?? '#3b0a0a';
    return (
      <g {...bodyProps}>
        <rect x={2} y={2} width={56} height={70} rx={3}
          fill="#0a0a0a" stroke="#1a1a1a" strokeWidth={1.5} />
        {/* Segments A–G + DP */}
        <rect x={14} y={8}  width={26} height={5} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={37} y={10} width={5} height={22} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={37} y={36} width={5} height={22} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={14} y={55} width={26} height={5} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={18} y={36} width={5} height={22} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={18} y={10} width={5} height={22} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <rect x={14} y={31} width={26} height={5} rx={2} fill={dark} stroke={color} strokeWidth={0.5} />
        <circle cx={50} cy={57} r={3} fill={dark} stroke={color} strokeWidth={0.5} />
        {/* Leads */}
        {[5, 15, 25, 35, 45, 55].map((x, i) => (
          <line key={i} x1={x} y1={80} x2={x} y2={74} stroke="#666" strokeWidth={1.2} />
        ))}
        <line x1={30} y1={0} x2={30} y2={5} stroke="#666" strokeWidth={1.2} />
      </g>
    );
  }

  // ── NeoPixel WS2812B (wokwi neopixel-element.ts) ───────────────
  if (part.type === 'neopixel') {
    return (
      <g {...bodyProps}>
        {/* PCB square — wokwi neopixel is a small square module */}
        <rect x={1} y={1} width={32} height={32} rx={3}
          fill="#1a1a1a" stroke="#333" strokeWidth={1} />
        {/* Pin stubs on sides — wokwi neopixel has 4 pins */}
        <rect x={0}  y={6}  width={3} height={4}  fill="#c3c2c3" />
        <rect x={0}  y={22} width={3} height={4}  fill="#c3c2c3" />
        <rect x={31} y={6}  width={3} height={4}  fill="#c3c2c3" />
        <rect x={31} y={22} width={3} height={4}  fill="#c3c2c3" />
        {/* LED lens — white diffuser circle */}
        <circle cx={17} cy={17} r={10} fill="#dddddd" />
        <circle cx={17} cy={17} r={8}  fill="#e6e6e6" />
        {/* RGB spots inside lens — from wokwi neopixel-element.ts */}
        <ellipse cx={14} cy={15} rx={2.2} ry={2.2} fill="red"   opacity={0.55} />
        <ellipse cx={21} cy={21} rx={2.2} ry={2.2} fill="green" opacity={0.55} />
        <ellipse cx={20} cy={13} rx={2.2} ry={2.2} fill="blue"  opacity={0.55} />
        {/* IC pads */}
        <path d="m22.5 19.5s-0.45-0.44-0.45-0.67v-5.77s-0.3-0.89-1.0-0.89h-4.1s-1.24 0.12-1.18 1.54l0.16 10.2c2.74-0.23 5.24-1.75 6.57-4.44z"
          fill="#bfbfbf" opacity={0.6} />
        {/* Leads */}
        <line x1={0}  y1={17} x2={3}  y2={17} stroke="#666" strokeWidth={1.2} />
        <line x1={31} y1={17} x2={34} y2={17} stroke="#666" strokeWidth={1.2} />
        <line x1={17} y1={0}  x2={17} y2={3}  stroke="#666" strokeWidth={1.2} />
        <line x1={17} y1={31} x2={17} y2={34} stroke="#666" strokeWidth={1.2} />
      </g>
    );
  }

  // ── OLED SSD1306 (128×64 I2C display) ─────────────────────────
  if (part.type === 'ssd1306') {
    return (
      <g {...bodyProps}>
        {/* PCB */}
        <rect x={0} y={0} width={72} height={52} rx={3} fill="#1a1a4a" stroke="#3333aa" strokeWidth={1} />
        {/* Display screen area */}
        <rect x={4} y={4} width={64} height={38} rx={2} fill="#050510" stroke="#2222aa" strokeWidth={0.8} />
        {/* Screen content — simulated OLED dots */}
        <rect x={6} y={6} width={60} height={34} rx={1} fill="#000020" />
        {/* MIK32 text on OLED */}
        <text x={36} y={20} textAnchor="middle" fontSize={7} fill="#60a5fa" fontFamily="monospace" fontWeight="bold">MIK32 Амур</text>
        <text x={36} y={30} textAnchor="middle" fontSize={5} fill="#3a7060" fontFamily="monospace">OLED 128×64 SSD1306</text>
        <text x={36} y={37} textAnchor="middle" fontSize={4.5} fill="#1a4040" fontFamily="monospace">I2C 0x3C / 0x3D</text>
        {/* Pin row */}
        <rect x={4} y={43} width={64} height={7} rx={1} fill="#111" />
        {['SDA','SCL','VCC','GND'].map((p, i) => (
          <text key={p} x={12 + i * 16} y={49} textAnchor="middle" fontSize={4} fill="#4a6a76" fontFamily="monospace">{p}</text>
        ))}
        {/* Leads */}
        {[12, 28, 44, 60].map(x => (
          <line key={x} x1={x} y1={50} x2={x} y2={56} stroke="#8c8c8c" strokeWidth={1.2} />
        ))}
      </g>
    );
  }

  // ── Servo SG90 ─────────────────────────────────────────────────
  if (part.type === 'servo') {
    const angleDeg = parseInt(attrs.angle ?? '90');
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const armX = 48 + Math.cos(angleRad) * 14;
    const armY = 20 - Math.sin(angleRad) * 14;
    return (
      <g {...bodyProps}>
        {/* Body */}
        <rect x={8} y={4} width={56} height={40} rx={4} fill="#333" stroke="#555" strokeWidth={1} />
        <rect x={10} y={6} width={52} height={36} rx={3} fill="#444" />
        {/* Top flange */}
        <rect x={0} y={8} width={8} height={12} rx={2} fill="#3a3a3a" stroke="#555" strokeWidth={0.7} />
        <rect x={56} y={8} width={8} height={12} rx={2} fill="#3a3a3a" stroke="#555" strokeWidth={0.7} />
        {/* Shaft circle */}
        <circle cx={48} cy={20} r={10} fill="#222" stroke="#666" strokeWidth={1} />
        <circle cx={48} cy={20} r={4} fill="#aaa" stroke="#888" strokeWidth={0.5} />
        {/* Arm */}
        <line x1={48} y1={20} x2={armX} y2={armY} stroke="#ccc" strokeWidth={3} strokeLinecap="round" />
        <circle cx={armX} cy={armY} r={2.5} fill="#999" />
        {/* Label */}
        <text x={24} y={24} textAnchor="middle" fontSize={7} fill="#aaa" fontFamily="monospace">SG90</text>
        <text x={24} y={34} textAnchor="middle" fontSize={6} fill="#666" fontFamily="monospace">{angleDeg}°</text>
        {/* Wire connector */}
        <rect x={0} y={16} width={6} height={32} rx={1} fill="#1a1a1a" stroke="#444" strokeWidth={0.5} />
        {[20, 32, 44].map((y, i) => (
          <rect key={y} x={0} y={y} width={6} height={6} fill={['#f97316','#ef4444','#1a1a1a'][i]} rx={0.5} />
        ))}
      </g>
    );
  }

  // ── DS18B20 (OneWire temperature sensor) ───────────────────────
  if (part.type === 'ds18b20') {
    const temp = parseInt(attrs.temp ?? '25');
    const col = temp < 0 ? '#60a5fa' : temp < 40 ? '#4ade80' : temp < 80 ? '#f59e0b' : '#ef4444';
    return (
      <g {...bodyProps}>
        {/* Flat package body (TO-92 style) */}
        <path d="M8 0 Q32 0 32 0 L32 36 Q32 42 20 48 Q8 42 8 36 Z"
          fill="#1a1a1a" stroke="#333" strokeWidth={1} />
        <path d="M10 2 Q30 2 30 2 L30 35 Q30 40 20 46 Q10 40 10 35 Z"
          fill="#2a2a2a" />
        {/* DS18B20 text */}
        <text x={20} y={16} textAnchor="middle" fontSize={5.5} fill="#888" fontFamily="monospace">DS18B20</text>
        <text x={20} y={26} textAnchor="middle" fontSize={5} fill="#555" fontFamily="monospace">OneWire</text>
        {/* Temperature display */}
        <text x={20} y={36} textAnchor="middle" fontSize={6} fill={col} fontFamily="monospace" fontWeight="bold">
          {temp > 0 ? `+${temp}` : temp}°C
        </text>
        {/* Leads */}
        <line x1={8}  y1={56} x2={8}  y2={48} stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={20} y1={56} x2={20} y2={48} stroke="#8c8c8c" strokeWidth={1.5} />
        <line x1={32} y1={56} x2={32} y2={48} stroke="#8c8c8c" strokeWidth={1.5} />
        <text x={8}  y={64} textAnchor="middle" fontSize={5} fill="#4a6a56" fontFamily="monospace">GND</text>
        <text x={20} y={64} textAnchor="middle" fontSize={5} fill="#4a6a56" fontFamily="monospace">DQ</text>
        <text x={32} y={64} textAnchor="middle" fontSize={5} fill="#4a6a56" fontFamily="monospace">VCC</text>
      </g>
    );
  }

  // ── 74HC595 (Serial-in / Parallel-out shift register) ──────────
  if (part.type === '74hc595') {
    return (
      <g {...bodyProps}>
        {/* DIP package */}
        <rect x={10} y={0} width={40} height={80} rx={3} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
        {/* Notch */}
        <path d="M25 0 Q30 3 35 0" fill="none" stroke="#444" strokeWidth={1} />
        {/* Label */}
        <text x={30} y={20} textAnchor="middle" fontSize={7} fill="#888" fontFamily="monospace" fontWeight="bold">74HC</text>
        <text x={30} y={30} textAnchor="middle" fontSize={7} fill="#888" fontFamily="monospace" fontWeight="bold">595</text>
        <text x={30} y={44} textAnchor="middle" fontSize={5.5} fill="#555" fontFamily="monospace">SPI→8-bit</text>
        {/* Left pins (DS, SH_CP, ST_CP, MR, OE) */}
        {['DS','SH','ST','MR','OE'].map((n, i) => (
          <g key={n}>
            <rect x={0} y={10 + i * 14} width={12} height={4} rx={1} fill="#8B7355" />
            <text x={13} y={15 + i * 14} fontSize={5} fill="#555" fontFamily="monospace">{n}</text>
          </g>
        ))}
        {/* Right pins (VCC, GND, Q0-Q7) */}
        {['VCC','GND','Q0','Q1','Q2','Q3','Q4','Q5','Q6','QH'].map((n, i) => (
          <g key={n}>
            <rect x={48} y={i * 8} width={12} height={4} rx={1} fill="#8B7355" />
            <text x={46} y={5 + i * 8} fontSize={5} fill="#555" fontFamily="monospace" textAnchor="end">{n}</text>
          </g>
        ))}
      </g>
    );
  }

  // ── LCD 1602 (16x2 character display) ──────────────────────────
  if (part.type === 'lcd1602') {
    const text = (attrs.text as string) ?? 'MIK32 Амур     Hello, World!  ';
    const line1 = text.slice(0, 16).padEnd(16);
    const line2 = text.slice(16, 32).padEnd(16);
    return (
      <g {...bodyProps}>
        {/* PCB */}
        <rect x={0} y={0} width={90} height={52} rx={3} fill="#1a3a1a" stroke="#2a6a2a" strokeWidth={1} />
        {/* Screen area */}
        <rect x={5} y={5} width={80} height={38} rx={2} fill="#0d2a1a" stroke="#1a4a2a" strokeWidth={0.8} />
        <rect x={7} y={7} width={76} height={34} rx={1} fill="#0a4a14" />
        {/* Character grid */}
        {[line1, line2].map((line, row) => (
          <text key={row} x={45} y={22 + row * 14} textAnchor="middle"
            fontSize={7} fill="#4dff88" fontFamily="monospace" letterSpacing={0.5}>
            {line}
          </text>
        ))}
        {/* Pin row */}
        <rect x={4} y={43} width={82} height={8} rx={1} fill="#111" />
        {['RS','E','D4','D5','D6','D7','VCC','GND'].map((p, i) => (
          <text key={p} x={8 + i * 12} y={49} textAnchor="middle" fontSize={4} fill="#3a5a3a" fontFamily="monospace">{p}</text>
        ))}
        {/* Leads */}
        {[8, 20, 32, 44, 56, 68, 80, 80].map((x, i) => (
          <line key={i} x1={x} y1={51} x2={x} y2={56} stroke="#8c8c8c" strokeWidth={1.2} />
        ))}
      </g>
    );
  }

  // Fallback
  return (
    <rect x={0} y={0} width={def.w} height={def.h} rx={4}
      fill="#1a2a18" stroke="#2a5a40" strokeWidth={1}
      onMouseDown={onBodyDown} style={{ cursor: 'grab' }} />
  );
}

// ───────────────────────────────────────────────────────────────
// ПАЛИТРА КОМПОНЕНТОВ
// ───────────────────────────────────────────────────────────────

// ── Модальное окно библиотеки wokwi-elements ─────────────────

const CAT_COLORS: Record<WokwiElementMeta['category'], string> = {
  mcu:     '#a78bfa',
  output:  '#4ade80',
  input:   '#60a5fa',
  passive: '#f59e0b',
  display: '#f472b6',
  sensor:  '#22d3ee',
  motor:   '#fb923c',
  comms:   '#94a3b8',
};

const CAT_LABELS: Record<WokwiElementMeta['category'], string> = {
  mcu:     'МК',
  output:  'OUT',
  input:   'IN',
  passive: 'PAS',
  display: 'DSP',
  sensor:  'SNS',
  motor:   'MOT',
  comms:   'COM',
};

function ElementLibraryModal({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = React.useState<'all' | 'supported'>('all');
  const shown = filter === 'supported'
    ? WOKWI_ELEMENT_CATALOG.filter(e => e.supported)
    : WOKWI_ELEMENT_CATALOG;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-[620px] max-h-[80vh] flex flex-col rounded-lg border border-[#1a5a38] bg-[#080f0a] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3a28] bg-[#0a1a10]">
          <div>
            <div className="text-[13px] font-bold text-[#4ec9b0]">
              📦 Библиотека wokwi-elements
            </div>
            <div className="text-[10px] text-[#3a8060] mt-0.5">
              v{WOKWI_ELEMENTS_VERSION} · обновлено {WOKWI_ELEMENTS_UPDATED} ·{' '}
              {CATALOG_STATS.supported} активных / {CATALOG_STATS.total} элементов
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#3a8060] hover:text-[#f87171] text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 px-4 py-2 border-b border-[#1a3a28] flex-wrap">
          {Object.entries(CATALOG_STATS.byCategory).map(([cat, count]) => {
            const c = cat as WokwiElementMeta['category'];
            const color = CAT_COLORS[c] ?? '#94a3b8';
            return (
              <div key={cat} className="flex items-center gap-1 text-[10px]">
                <span className="rounded px-1.5 py-0.5 font-bold text-[9px]"
                  style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}>
                  {CAT_LABELS[c] ?? cat}
                </span>
                <span className="text-[#3a8060]">{count}</span>
              </div>
            );
          })}
          <div className="ml-auto flex rounded overflow-hidden border border-[#1a3a28] text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 transition-colors ${filter === 'all' ? 'bg-[#0d3020] text-[#4ade80]' : 'text-[#3a8060]'}`}
            >
              Все
            </button>
            <button
              onClick={() => setFilter('supported')}
              className={`px-2 py-0.5 transition-colors ${filter === 'supported' ? 'bg-[#0d3020] text-[#4ade80]' : 'text-[#3a8060]'}`}
            >
              Активные
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {shown.map(el => {
            const color = CAT_COLORS[el.category] ?? '#94a3b8';
            return (
              <div
                key={el.tag}
                className={`flex items-start gap-3 rounded px-3 py-2 border transition-colors ${
                  el.supported
                    ? 'border-[#1a3a28] bg-[#0a1a10] hover:border-[#22c55e]'
                    : 'border-[#111] opacity-50'
                }`}
              >
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold mt-0.5"
                  style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
                >
                  {CAT_LABELS[el.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#c8d8c0] font-mono">{el.label}</span>
                    {el.supported && (
                      <span className="text-[9px] text-[#22c55e]">✓ активен</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#3a8060] mt-0.5 leading-snug">{el.description}</div>
                  <div className="text-[9px] text-[#1a3a28] font-mono mt-0.5">{el.tag}</div>
                </div>
                <span className="shrink-0 text-[9px] text-[#2a5a40] mt-0.5">{el.pinCount} пин</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a3a28] text-[9px] text-[#1a5a38] text-center">
          Элементы хранятся локально · ver6/wokwi_replit/wokwi-elements-main/src/ ·
          Для добавления нового элемента создайте файл *-element.ts и обновите element-library.ts
        </div>
      </div>
    </div>
  );
}

// ── Панель палитры ─────────────────────────────────────────────

function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const [showLibrary, setShowLibrary] = React.useState(false);

  return (
    <>
      {showLibrary && <ElementLibraryModal onClose={() => setShowLibrary(false)} />}
      <div className="w-44 shrink-0 flex flex-col border-r border-[#1a3a28] bg-[#080f0a] overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold text-[#3a8060] uppercase tracking-wider border-b border-[#1a3a28]">
          Компоненты
        </div>
        <div className="p-1.5 space-y-1">
          {PALETTE_ORDER.map(type => {
            const def = COMPONENT_DEFS[type];
            if (!def) return null;
            const catColor = def.category === 'output' ? '#4ade80'
              : def.category === 'input' ? '#60a5fa' : '#f59e0b';
            return (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11px] border border-[#1a3a28] text-[#c8d8c0] hover:bg-[#0d2a1a] hover:border-[#22c55e] transition-colors group"
                title={def.description}
              >
                <span className="text-base">{def.emoji}</span>
                <span className="flex-1 leading-tight">{def.label}</span>
                <span className="shrink-0 text-[8px] rounded px-1 py-0.5 font-bold"
                  style={{ color: catColor, border: `1px solid ${catColor}44`, background: `${catColor}11` }}>
                  {def.category === 'output' ? 'OUT' : def.category === 'input' ? 'IN' : 'PAS'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Element Library section */}
        <div className="mt-auto border-t border-[#1a3a28]">
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-[#3a8060] hover:text-[#4ec9b0] hover:bg-[#0d2a1a] transition-colors group"
          >
            <span className="text-[11px]">📦</span>
            <span className="flex-1 text-left">Библиотека</span>
            <span className="text-[9px] rounded px-1 py-0.5 border border-[#1a5a38] text-[#22c55e] bg-[#22c55e11] group-hover:border-[#22c55e]">
              v{WOKWI_ELEMENTS_VERSION}
            </span>
          </button>
          <div className="px-3 pb-2 text-[9px] text-[#1a5a38]">
            {CATALOG_STATS.supported}/{CATALOG_STATS.total} активных
          </div>
        </div>
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────
// ПАНЕЛЬ СВОЙСТВ
// ───────────────────────────────────────────────────────────────

function PropertiesPanel({
  part, connections, onUpdateAttr, onDelete, onWireColorChange, wireColor, selectedWireId,
  onDeleteWire,
}: {
  part: DiagramPart | null;
  connections: DiagramConnection[];
  onUpdateAttr: (id: string, key: string, val: string) => void;
  onDelete: (id: string) => void;
  onWireColorChange: (color: string) => void;
  wireColor: string;
  selectedWireId: string | null;
  onDeleteWire: (id: string) => void;
}) {
  const def = part ? COMPONENT_DEFS[part.type] : null;

  if (selectedWireId) {
    const conn = connections.find(c => c.id === selectedWireId);
    return (
      <div className="w-52 shrink-0 border-l border-[#1a3a28] bg-[#080f0a] flex flex-col p-3 gap-3">
        <div className="text-[11px] font-semibold text-[#4ec9b0]">Провод</div>
        {conn && (
          <>
            <div className="text-[10px] text-[#3a8060] space-y-1">
              <div>От: <span className="text-[#c8d8c0] font-mono">{conn.from}</span></div>
              <div>До: <span className="text-[#c8d8c0] font-mono">{conn.to}</span></div>
            </div>
            <div>
              <div className="text-[10px] text-[#3a8060] mb-1">Цвет:</div>
              <div className="flex flex-wrap gap-1">
                {WIRE_COLORS.map(wc => (
                  <button key={wc.value}
                    onClick={() => onWireColorChange(wc.value)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{
                      background: wc.value,
                      borderColor: conn.color === wc.value ? '#fff' : 'transparent',
                    }}
                    title={wc.label}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => onDeleteWire(selectedWireId)}
          className="mt-auto px-2 py-1 rounded text-[11px] border border-[#f87171] text-[#f87171] hover:bg-[#f8717120] transition-colors"
        >
          Удалить провод
        </button>
      </div>
    );
  }

  if (!part || !def) {
    return (
      <div className="w-52 shrink-0 border-l border-[#1a3a28] bg-[#080f0a] flex flex-col p-3">
        <div className="text-[10px] text-[#2a5a40] mb-3">Цвет провода:</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {WIRE_COLORS.map(wc => (
            <button key={wc.value}
              onClick={() => onWireColorChange(wc.value)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                background: wc.value,
                borderColor: wireColor === wc.value ? '#fff' : 'transparent',
                boxShadow: wireColor === wc.value ? `0 0 6px ${wc.value}` : 'none',
              }}
              title={wc.label}
            />
          ))}
        </div>
        <div className="text-[10px] text-[#1a3a28] mt-auto text-center">
          Выберите компонент или провод
        </div>
      </div>
    );
  }

  return (
    <div className="w-52 shrink-0 border-l border-[#1a3a28] bg-[#080f0a] flex flex-col p-3 gap-3 overflow-y-auto">
      <div>
        <div className="text-[11px] font-semibold text-[#4ec9b0]">{def.emoji} {def.label}</div>
        <div className="text-[9px] text-[#2a5a40] mt-0.5 font-mono">{part.id}</div>
      </div>

      <div className="text-[10px] text-[#3a8060] leading-snug">{def.description}</div>

      {/* Attribute editors */}
      {def.attrDefs.map(attr => (
        <div key={attr.name}>
          <div className="text-[10px] text-[#3a8060] mb-1">{attr.label}:</div>
          {attr.type === 'color-led' && (
            <div className="flex flex-wrap gap-1.5">
              {attr.options?.map(opt => {
                const col = LED_COLORS[opt] ?? '#fff';
                return (
                  <button key={opt}
                    onClick={() => onUpdateAttr(part.id, attr.name, opt)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      background: col,
                      borderColor: part.attrs[attr.name] === opt ? '#fff' : 'transparent',
                      boxShadow: part.attrs[attr.name] === opt ? `0 0 6px ${col}` : 'none',
                    }}
                    title={opt}
                  />
                );
              })}
            </div>
          )}
          {attr.type === 'select' && (
            <select
              value={part.attrs[attr.name] ?? attr.default}
              onChange={e => onUpdateAttr(part.id, attr.name, e.target.value)}
              className="w-full rounded border border-[#1a3a28] bg-[#0a1a10] px-2 py-1 text-[11px] text-[#c8d8c0] outline-none"
            >
              {attr.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {attr.type === 'range' && (
            <div className="flex items-center gap-2">
              <input type="range"
                min={attr.min ?? 0} max={attr.max ?? 100}
                value={parseInt(part.attrs[attr.name] ?? attr.default)}
                onChange={e => onUpdateAttr(part.id, attr.name, e.target.value)}
                className="flex-1 accent-[#22c55e]"
              />
              <span className="text-[11px] text-[#4ec9b0] w-8 text-right">
                {part.attrs[attr.name] ?? attr.default}%
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Pins info */}
      <div>
        <div className="text-[10px] text-[#3a8060] mb-1">Пины:</div>
        <div className="space-y-0.5">
          {def.pins.map(pin => (
            <div key={pin.name} className="flex items-center gap-1.5 text-[9px]">
              <span className="font-mono text-[#4ec9b0] w-8 shrink-0">{pin.name}</span>
              <span className="text-[#3a8060] truncate">{pin.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="text-[9px] text-[#2a5a40] font-mono">
        x={Math.round(part.x)}, y={Math.round(part.y)}
      </div>

      <button
        onClick={() => onDelete(part.id)}
        className="mt-auto px-2 py-1 rounded text-[11px] border border-[#f87171] text-[#f87171] hover:bg-[#f8717120] transition-colors"
      >
        Удалить компонент
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// REPLAY: воссоздать состояние GPIO по индексу события
// ───────────────────────────────────────────────────────────────

function makeBlankGPIO(): SimState['gpio'] {
  const mkPort = (n: number) => ({
    enabled: false,
    pins: Array.from({ length: n }, () => ({
      mode: 'unset' as const,
      pull: 'none' as const,
      value: false,
    })),
  });
  return [mkPort(16), mkPort(16), mkPort(8)] as SimState['gpio'];
}

function replayGPIOState(events: SimState['events'], upTo: number): SimState['gpio'] {
  const gpio = makeBlankGPIO();
  for (let i = 0; i <= upTo && i < events.length; i++) {
    const ev = events[i];
    if (ev.type === 'clock_enable') {
      const p = ev.data?.periph as string;
      if (p === 'GPIO_0') gpio[0].enabled = true;
      else if (p === 'GPIO_1') gpio[1].enabled = true;
      else if (p === 'GPIO_2') gpio[2].enabled = true;
    } else if (ev.type === 'gpio_init') {
      const port = ev.data?.port as 0 | 1 | 2;
      const pinNames = ev.data?.pins as string[];
      const mode = ev.data?.mode as 'output' | 'input' | 'analog' | 'serial' | 'unset';
      const pull = ev.data?.pull as 'none' | 'up' | 'down';
      if (port !== undefined && Array.isArray(pinNames)) {
        pinNames.forEach(name => {
          const m = name.match(/^P[012]_(\d+)$/);
          if (m) {
            const idx = +m[1];
            if (gpio[port].pins[idx]) {
              gpio[port].pins[idx].mode = mode;
              gpio[port].pins[idx].pull = pull;
            }
          }
        });
      }
    } else if (ev.type === 'gpio_write') {
      const port = ev.data?.port as 0 | 1 | 2;
      const val = ev.data?.value as boolean;
      const pins = ev.data?.pins as number[] | undefined;
      const pin0 = ev.data?.pin as number;
      const targets = pins ?? [pin0];
      if (port !== undefined) {
        targets.forEach(idx => {
          if (gpio[port].pins[idx] !== undefined) gpio[port].pins[idx].value = val;
        });
      }
    } else if (ev.type === 'gpio_toggle') {
      const port = ev.data?.port as 0 | 1 | 2;
      const pins = ev.data?.pins as number[] | undefined;
      const pin0 = ev.data?.pin as number;
      const targets = pins ?? [pin0];
      if (port !== undefined) {
        targets.forEach(idx => {
          if (gpio[port].pins[idx] !== undefined)
            gpio[port].pins[idx].value = !gpio[port].pins[idx].value;
        });
      }
    }
  }
  return gpio;
}

// Icon helper for event types
function eventTypeIcon(type: string): string {
  const map: Record<string, string> = {
    clock_enable: '🔋', pcc_config: '⚙', gpio_init: '📌',
    gpio_write: '✏', gpio_toggle: '↕', gpio_read: '👁',
    uart_print: '📟', delay: '⏱', reg_write: '📝', reg_read: '📖',
    adc_read: '📊', spi_tx: '🔷', i2c_tx: '🔶', timer_init: '⏲',
    pwm_set: '〰', info: 'ℹ', warn: '⚠', error: '❌',
  };
  return map[type] ?? '•';
}

// ───────────────────────────────────────────────────────────────
// ГЛАВНАЯ СТРАНИЦА
// ───────────────────────────────────────────────────────────────

export default function DiagramEditorPage() {
  // Wouter navigate (для передачи кода в симулятор)
  const [, navigate] = useLocation();

  // ── Схема ──────────────────────────────────────────────────
  const [parts, setParts] = useState<DiagramPart[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);

  // ── Выделение ───────────────────────────────────────────────
  const [selectedPart, setSelectedPart]     = useState<string | null>(null);
  const [selectedWire, setSelectedWire]     = useState<string | null>(null);

  // ── Режим редактора ─────────────────────────────────────────
  const [mode, setMode] = useState<'select' | 'wire'>('select');

  // ── Прокладка провода ───────────────────────────────────────
  const [wiringFrom, setWiringFrom] = useState<{ ref: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });
  const [wireColor, setWireColor]   = useState('#22c55e');

  // ── Перетаскивание компонента ────────────────────────────────
  const dragging = useRef<{ partId: string; ox: number; oy: number } | null>(null);

  // ── Панорамирование ─────────────────────────────────────────
  const panning   = useRef<{ startMx: number; startMy: number; startPx: number; startPy: number } | null>(null);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // ── Симуляция ───────────────────────────────────────────────
  const [code, setCode]           = useState('');
  const [iterations, setIters]    = useState(8);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const gpioState = simResult?.state.gpio ?? null;
  const [simError, setSimError]   = useState('');
  const [showCode, setShowCode]   = useState(false);
  const [codeMode, setCodeMode]   = useState<'generated' | 'custom' | 'uart' | 'gpio'>('generated');

  // ── Анимация воспроизведения ────────────────────────────────
  const [animIndex, setAnimIndex]     = useState<number>(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animSpeed, setAnimSpeed]     = useState(180);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Альтернативные функции пинов ───────────────────────────
  const [showAltFns, setShowAltFns]         = useState(false);
  const [hoveredChipPin, setHoveredChipPin] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // ── Авто-генерация кода при изменении схемы ─────────────────
  const generatedCode = useMemo(() => generateCode(parts, connections), [parts, connections]);

  useEffect(() => {
    if (codeMode === 'generated') setCode(generatedCode);
  }, [generatedCode, codeMode]);

  // ── Анимация: таймер воспроизведения ───────────────────────
  useEffect(() => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (!isAnimating || !simResult) return;
    const total = simResult.state.events.length;
    if (total === 0) { setIsAnimating(false); return; }
    const next = animIndex < 0 ? 0 : animIndex + 1;
    if (next >= total) { setIsAnimating(false); return; }
    animTimerRef.current = setTimeout(() => setAnimIndex(next), animSpeed);
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [isAnimating, animIndex, simResult, animSpeed]);

  // ── Состояние GPIO с учётом текущего кадра анимации ────────
  const animatedGPIO = useMemo<SimState['gpio'] | null>(() => {
    if (!simResult) return null;
    if (animIndex < 0) return simResult.state.gpio;
    return replayGPIOState(simResult.state.events, animIndex);
  }, [simResult, animIndex]);

  // ── Координаты холста ───────────────────────────────────────
  const toCanvas = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top  - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Колесо прокрутки (зум) ──────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(3, Math.max(0.25, z - e.deltaY * 0.001)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Клавиатура ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWiringFrom(null);
        setSelectedPart(null);
        setSelectedWire(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        if (selectedPart) deletePart(selectedPart);
        if (selectedWire) deleteWire(selectedWire);
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) setMode('select');
      if (e.key === 'w' && !e.ctrlKey && !e.metaKey) setMode('wire');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPart, selectedWire]);

  // ── Добавление компонента из палитры ────────────────────────
  function addComponent(type: string) {
    const def = COMPONENT_DEFS[type];
    if (!def) return;
    const id = `${type}-${uid()}`;
    // Place near center of current view
    const cx = (480 - pan.x) / zoom - def.w / 2;
    const cy = (300 - pan.y) / zoom - def.h / 2;
    const { ...defAttrs } = def.defaultAttrs;
    setParts(prev => [...prev, { id, type, x: cx, y: cy, attrs: { ...defAttrs } }]);
    setSelectedPart(id);
    setSelectedWire(null);
    setMode('select');
  }

  // ── Удаление компонента ─────────────────────────────────────
  function deletePart(id: string) {
    setParts(prev => prev.filter(p => p.id !== id));
    setConnections(prev => prev.filter(c => !c.from.startsWith(id + ':') && !c.to.startsWith(id + ':')));
    if (selectedPart === id) setSelectedPart(null);
  }

  // ── Удаление провода ────────────────────────────────────────
  function deleteWire(id: string) {
    setConnections(prev => prev.filter(c => c.id !== id));
    if (selectedWire === id) setSelectedWire(null);
  }

  // ── Обновление атрибута ─────────────────────────────────────
  function updateAttr(id: string, key: string, val: string) {
    setParts(prev => prev.map(p => p.id === id ? { ...p, attrs: { ...p.attrs, [key]: val } } : p));
  }

  // ── Изменение цвета выбранного провода ───────────────────────
  function changeSelectedWireColor(color: string) {
    setWireColor(color);
    if (selectedWire) {
      setConnections(prev => prev.map(c => c.id === selectedWire ? { ...c, color } : c));
    }
  }

  // ── Сохранить схему (JSON) ───────────────────────────────────
  function saveDiagram() {
    const diagram: Diagram = { version: 1, parts, connections };
    const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'mik32-diagram.json' });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Загрузить схему (JSON) ───────────────────────────────────
  function loadDiagram() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const d = JSON.parse(e.target?.result as string) as Diagram;
          if (d.version === 1 && Array.isArray(d.parts)) {
            setParts(d.parts);
            setConnections(d.connections ?? []);
            setSelectedPart(null);
            setSelectedWire(null);
          }
        } catch { /* ignore */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Запустить симуляцию ─────────────────────────────────────
  function runSim() {
    const src = (codeMode === 'generated') ? generatedCode : code;
    const result = runSimulation(src, iterations);
    setSimResult(result);
    setSimError(result.error ?? '');
    setAnimIndex(-1);
    setIsAnimating(false);
    if (result.state.uartBuf) setCodeMode('uart');
  }

  // ── Очистить ────────────────────────────────────────────────
  function clearAll() {
    if (!confirm('Очистить всю схему?')) return;
    setParts([]);
    setConnections([]);
    setSelectedPart(null);
    setSelectedWire(null);
    setWiringFrom(null);
    setSimResult(null);
    setSimError('');
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  // ── Получить состояние GPIO для компонента ─────────────────
  function getComponentGPIO(partId: string, pinName: string): boolean {
    if (!animatedGPIO) return false;
    const conn = connections.find(c =>
      c.from === `${partId}:${pinName}` || c.to === `${partId}:${pinName}`
    );
    if (!conn) return false;
    const other = conn.from === `${partId}:${pinName}` ? conn.to : conn.from;
    const m = other.match(/^mik32:P([012])_(\d+)$/);
    if (!m) return false;
    return animatedGPIO[+m[1] as 0 | 1 | 2]?.pins[+m[2]]?.value ?? false;
  }

  // ── Состояние сигнала на проводе ────────────────────────────
  function getWireSignal(conn: DiagramConnection): 'high' | 'low' | 'none' {
    if (!animatedGPIO) return 'none';
    for (const ep of [conn.from, conn.to]) {
      const m = ep.match(/^mik32:P([012])_(\d+)$/);
      if (m) {
        const p = animatedGPIO[+m[1] as 0 | 1 | 2]?.pins[+m[2]];
        if (p && p.mode !== 'unset') return p.value ? 'high' : 'low';
      }
    }
    return 'none';
  }

  // ── SVG СОБЫТИЯ ─────────────────────────────────────────────

  const handleSVGMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const cp = toCanvas(e);

    if (mode === 'wire') {
      // Check if clicked on a chip pin
      const pin = findPinAt(cp.x, cp.y, parts);
      if (pin) {
        if (!wiringFrom) {
          setWiringFrom(pin);
        } else {
          if (pin.ref !== wiringFrom.ref) {
            setConnections(prev => [...prev, {
              id: uid(), from: wiringFrom.ref, to: pin.ref, color: wireColor,
            }]);
          }
          setWiringFrom(null);
        }
        return;
      }
      // Cancel wire if clicking empty space
      if (wiringFrom) { setWiringFrom(null); return; }
      return;
    }

    // Select mode: check wire hit
    const wireId = findWireAt(cp.x, cp.y, connections, parts);
    if (wireId) {
      setSelectedWire(wireId);
      setSelectedPart(null);
      return;
    }

    // Check part hit
    const partId = findPartAt(cp.x, cp.y, parts);
    if (partId) {
      setSelectedPart(partId);
      setSelectedWire(null);
      const part = parts.find(p => p.id === partId)!;
      dragging.current = { partId, ox: cp.x - part.x, oy: cp.y - part.y };
      return;
    }

    // Click on empty → deselect, start pan
    setSelectedPart(null);
    setSelectedWire(null);
    panning.current = {
      startMx: e.clientX, startMy: e.clientY,
      startPx: pan.x, startPy: pan.y,
    };
  }, [mode, parts, connections, wiringFrom, wireColor, pan, toCanvas]);

  const handleSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const cp = toCanvas(e);
    setMousePos(cp);

    if (dragging.current) {
      const { partId, ox, oy } = dragging.current;
      setParts(prev => prev.map(p =>
        p.id === partId ? { ...p, x: cp.x - ox, y: cp.y - oy } : p
      ));
      return;
    }

    if (panning.current) {
      const { startMx, startMy, startPx, startPy } = panning.current;
      setPan({
        x: startPx + (e.clientX - startMx),
        y: startPy + (e.clientY - startMy),
      });
    }
  }, [toCanvas]);

  const handleSVGMouseUp = useCallback(() => {
    dragging.current = null;
    panning.current  = null;
  }, []);

  // ── РЕНДЕР LED с учётом состояния GPIO ──────────────────────
  function renderLEDOverlay(part: DiagramPart) {
    if (part.type !== 'led') return null;
    const isOn = getComponentGPIO(part.id, 'A');
    const color = LED_COLORS[part.attrs.color] ?? '#22c55e';
    if (!isOn) return null;
    return (
      <g key={`glow-${part.id}`} transform={`translate(${part.x},${part.y})`} pointerEvents="none">
        {/* Outer ambient glow */}
        <ellipse cx={27} cy={14} rx={30} ry={24} fill={color} opacity={0.08} />
        <ellipse cx={27} cy={14} rx={22} ry={17} fill={color} opacity={0.14} />
        {/* Main glow */}
        <ellipse cx={27} cy={14} rx={14} ry={11} fill={color} opacity={0.38} />
        <ellipse cx={27} cy={14} rx={8}  ry={7}  fill={color} opacity={0.55} />
        {/* Label */}
        <text x={27} y={-8} textAnchor="middle" fontSize={8} fill={color}
          fontFamily="monospace" fontWeight="bold" opacity={1}>● ON</text>
      </g>
    );
  }

  // ── Вспомогательные функции анимации ─────────────────────────
  const totalEvents = simResult?.state.events.length ?? 0;
  const currentEvent = (animIndex >= 0 && simResult)
    ? simResult.state.events[animIndex] : null;

  function animPlay() {
    if (!simResult || totalEvents === 0) return;
    if (animIndex >= totalEvents - 1) setAnimIndex(-1);
    setIsAnimating(true);
  }
  function animPause()   { setIsAnimating(false); }
  function animStepBack() {
    setIsAnimating(false);
    setAnimIndex(i => Math.max(0, i < 0 ? totalEvents - 1 : i - 1));
  }
  function animStepFwd() {
    setIsAnimating(false);
    setAnimIndex(i => {
      const next = i < 0 ? 0 : i + 1;
      return next >= totalEvents ? totalEvents - 1 : next;
    });
  }
  function animReset() { setIsAnimating(false); setAnimIndex(-1); }
  function animGoEnd()  { setIsAnimating(false); setAnimIndex(-1); }

  // ─── LAYOUT ─────────────────────────────────────────────────
  const selPart = parts.find(p => p.id === selectedPart) ?? null;

  return (
    <div
      className="flex h-screen flex-col bg-[#0a1a10] text-[#c8d8c0]"
      style={{ fontFamily: 'Consolas, monospace' }}
    >
      <style>{`
        @keyframes flowWire {
          from { stroke-dashoffset: 28; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ledPulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 0.85; }
        }
      `}</style>
      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 border-b border-[#1a3a28] bg-[#080f0a] px-3 py-2 flex-wrap">
        <Link to="/" className="text-[11px] text-[#3a8060] hover:text-[#4ec9b0] transition-colors mr-1">← Курс</Link>
        <span className="text-[#1a5a38] text-xs">|</span>
        <span className="text-[11px] font-semibold text-[#4ec9b0]">Редактор схем MIK32</span>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Mode toggle */}
        <div className="flex rounded overflow-hidden border border-[#1a3a28]">
          <button
            onClick={() => { setMode('select'); setWiringFrom(null); }}
            className={`px-2 py-1 text-[10px] transition-colors ${mode === 'select'
              ? 'bg-[#0d3020] text-[#4ade80] border-r border-[#22c55e]'
              : 'text-[#3a8060] hover:text-[#4ec9b0]'}`}
          >
            ↖ Выбор [S]
          </button>
          <button
            onClick={() => { setMode('wire'); setSelectedPart(null); setSelectedWire(null); }}
            className={`px-2 py-1 text-[10px] transition-colors ${mode === 'wire'
              ? 'bg-[#0d3020] text-[#4ade80]'
              : 'text-[#3a8060] hover:text-[#4ec9b0]'}`}
          >
            ∿ Провод [W]
          </button>
        </div>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Run */}
        <button
          onClick={runSim}
          className="flex items-center gap-1 rounded px-3 py-1 text-[11px] font-semibold bg-[#166534] hover:bg-[#15803d] text-white border border-[#15803d] transition-colors"
        >
          ▶ Симуляция
        </button>

        {/* Code toggle */}
        <button
          onClick={() => setShowCode(v => !v)}
          className={`rounded px-2 py-1 text-[10px] border transition-colors ${showCode
            ? 'bg-[#0d3020] border-[#22c55e] text-[#4ade80]'
            : 'border-[#1a3a28] text-[#3a8060] hover:border-[#22c55e]'}`}
        >
          {'{}'} Код
        </button>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Save / Load */}
        <button onClick={saveDiagram}
          className="rounded px-2 py-1 text-[10px] border border-[#1a3a28] text-[#3a8060] hover:border-[#22c55e] hover:text-[#4ec9b0] transition-colors">
          ↓ Сохранить
        </button>
        <button onClick={loadDiagram}
          className="rounded px-2 py-1 text-[10px] border border-[#1a3a28] text-[#3a8060] hover:border-[#22c55e] hover:text-[#4ec9b0] transition-colors">
          ↑ Открыть
        </button>

        {/* Clear */}
        <button onClick={clearAll}
          className="rounded px-2 py-1 text-[10px] border border-[#1a3a28] text-[#3a8060] hover:border-[#f87171] hover:text-[#f87171] transition-colors">
          ✕ Очистить
        </button>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Alt Functions toggle */}
        <button
          onClick={() => setShowAltFns(v => !v)}
          className={`rounded px-2 py-1 text-[10px] border transition-colors ${showAltFns
            ? 'bg-[#0d2a3a] border-[#60a5fa] text-[#93c5fd]'
            : 'border-[#1a3a28] text-[#3a8060] hover:border-[#60a5fa] hover:text-[#60a5fa]'}`}
          title="Показать альтернативные функции пинов (UART/SPI/I2C/ADC/TIM)"
        >
          ⚡ Alt Fn
        </button>

        {/* Alt Fn legend (shown when active) */}
        {showAltFns && (
          <div className="flex items-center gap-2 text-[8px] border border-[#1a3a28] rounded px-2 py-1 bg-[#080f0a]">
            {[
              ['UART', '#f97316'], ['SPI', '#60a5fa'], ['I2C', '#c084fc'],
              ['ADC', '#fbbf24'], ['TIM', '#34d399'], ['JTAG', '#6b7280'],
            ].map(([name, color]) => (
              <span key={name} style={{ color }} className="font-mono">{name}</span>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          {animatedGPIO && !simError && animIndex < 0 && (
            <span className="text-[#22c55e]">✓ Симуляция выполнена · {totalEvents} событий</span>
          )}
          {animatedGPIO && animIndex >= 0 && (
            <span className="text-[#fbbf24] font-mono">
              ⏵ событие {animIndex + 1}/{totalEvents}
            </span>
          )}
          {simError && (
            <span className="text-[#f87171] max-w-[180px] truncate" title={simError}>⚠ {simError}</span>
          )}
          {wiringFrom && (
            <span className="text-[#fbbf24]">∿ Из: {wiringFrom.ref} → нажмите на пин</span>
          )}
          <span className="text-[#2a5a40] font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => {
              try {
                sessionStorage.setItem('mik32_sim_code', generatedCode);
                sessionStorage.setItem('mik32_sim_source', 'diagram-editor');
              } catch { /* ignore quota */ }
              navigate('/simulator');
            }}
            title="Передать сгенерированный код в симулятор и открыть его"
            className="text-[10px] text-[#4ade80] hover:text-white bg-[#0d3020] hover:bg-[#166534] transition-colors border border-[#15803d] rounded px-2 py-0.5">
            ▶ Открыть в симуляторе
          </button>
        </div>
      </div>

      {/* ── ANIMATION CONTROL BAR ─────────────────────────────── */}
      {simResult && totalEvents > 0 && (
        <div className="shrink-0 flex items-center gap-2 border-b border-[#1a3a28] bg-[#06120a] px-3 py-1.5"
          style={{ fontFamily: 'Consolas, monospace' }}>

          {/* Transport buttons */}
          <div className="flex items-center gap-0.5">
            <button onClick={animReset} title="В начало"
              className="w-7 h-7 flex items-center justify-center rounded text-[13px] text-[#3a8060] hover:text-[#4ec9b0] hover:bg-[#0d2a1a] transition-colors">⏮</button>
            <button onClick={animStepBack} title="Назад на 1 событие"
              className="w-7 h-7 flex items-center justify-center rounded text-[13px] text-[#3a8060] hover:text-[#4ec9b0] hover:bg-[#0d2a1a] transition-colors">⏪</button>
            {isAnimating ? (
              <button onClick={animPause} title="Пауза"
                className="w-8 h-7 flex items-center justify-center rounded text-[13px] bg-[#0d3020] text-[#4ade80] border border-[#22c55e] hover:bg-[#15803d] transition-colors">⏸</button>
            ) : (
              <button onClick={animPlay} title="Воспроизвести"
                className="w-8 h-7 flex items-center justify-center rounded text-[13px] bg-[#166534] text-white hover:bg-[#15803d] border border-[#15803d] transition-colors">▶</button>
            )}
            <button onClick={animStepFwd} title="Вперёд на 1 событие"
              className="w-7 h-7 flex items-center justify-center rounded text-[13px] text-[#3a8060] hover:text-[#4ec9b0] hover:bg-[#0d2a1a] transition-colors">⏩</button>
            <button onClick={animGoEnd} title="В конец (итог)"
              className="w-7 h-7 flex items-center justify-center rounded text-[13px] text-[#3a8060] hover:text-[#4ec9b0] hover:bg-[#0d2a1a] transition-colors">⏭</button>
          </div>

          <div className="w-px h-4 bg-[#1a3a28]" />

          {/* Progress slider */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] text-[#2a5a40] w-6 text-right shrink-0">
              {animIndex < 0 ? totalEvents : animIndex + 1}
            </span>
            <input
              type="range" min={0} max={totalEvents - 1}
              value={animIndex < 0 ? totalEvents - 1 : animIndex}
              onChange={e => { setIsAnimating(false); setAnimIndex(+e.target.value); }}
              className="flex-1 accent-[#22c55e] min-w-0"
              style={{ height: '4px' }}
            />
            <span className="text-[9px] text-[#2a5a40] w-6 shrink-0">{totalEvents}</span>
          </div>

          <div className="w-px h-4 bg-[#1a3a28]" />

          {/* Current event info */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-[280px]">
            {currentEvent ? (
              <>
                <span className="text-[12px] shrink-0">{eventTypeIcon(currentEvent.type)}</span>
                <span className="text-[10px] text-[#4ec9b0] font-semibold shrink-0 truncate max-w-[100px]">{currentEvent.label}</span>
                <span className="text-[9px] text-[#3a8060] truncate">{currentEvent.detail}</span>
                <span className="text-[9px] text-[#1a5a38] shrink-0 font-mono">{currentEvent.simTimeMs}мс</span>
              </>
            ) : (
              <span className="text-[9px] text-[#2a5a40]">← итоговое состояние · используйте ▶ для пошаговой анимации</span>
            )}
          </div>

          <div className="w-px h-4 bg-[#1a3a28]" />

          {/* Speed slider */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-[#2a5a40]">⚡</span>
            <input
              type="range" min={40} max={1000} step={20}
              value={animSpeed}
              onChange={e => setAnimSpeed(+e.target.value)}
              className="w-16 accent-[#22c55e]"
              style={{ height: '4px' }}
              title={`Скорость: ${animSpeed}мс/событие`}
            />
            <span className="text-[9px] text-[#2a5a40]">🐢</span>
          </div>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Palette */}
        <Palette onAdd={addComponent} />

        {/* Canvas */}
        <div className="flex-1 min-w-0 relative overflow-hidden bg-[#0a1a10]">
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: mode === 'wire' ? 'crosshair' : panning.current ? 'grabbing' : 'default' }}
            onMouseDown={handleSVGMouseDown}
            onMouseMove={handleSVGMouseMove}
            onMouseUp={handleSVGMouseUp}
            onMouseLeave={handleSVGMouseUp}
          >
            <defs>
              <pattern id="pcb-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x % 20},${pan.y % 20}) scale(${zoom})`}>
                <circle cx="10" cy="10" r="0.7" fill="#1a3a28" />
              </pattern>
            </defs>

            {/* PCB background */}
            <rect width="100%" height="100%" fill="#0a1210" />
            <rect width="100%" height="100%" fill="url(#pcb-grid)" />

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

              {/* ── Wires (drawn first, under components) ── */}
              {connections.map(conn => {
                const a = resolvePin(conn.from, parts);
                const b = resolvePin(conn.to, parts);
                if (!a || !b) return null;
                const d = routeWire(a, b);
                const isSelWire = selectedWire === conn.id;
                const sig = getWireSignal(conn);
                const wireStroke = sig === 'high' ? conn.color : sig === 'low' ? '#132a1a' : conn.color;
                const wireOpacity = sig === 'low' ? 0.25 : isSelWire ? 1 : 0.85;
                const wireWidth = sig === 'high' ? (isSelWire ? 3 : 2.2) : (isSelWire ? 2.5 : 1.8);
                return (
                  <g key={conn.id}>
                    {/* Ambient glow halo for HIGH signals */}
                    {sig === 'high' && (
                      <path d={d} fill="none" stroke={conn.color} strokeWidth={wireWidth + 5}
                        strokeLinecap="round" strokeLinejoin="round" opacity={0.13} pointerEvents="none" />
                    )}
                    {/* Base wire */}
                    <path d={d}
                      fill="none"
                      stroke={wireStroke}
                      strokeWidth={wireWidth}
                      strokeLinecap="round" strokeLinejoin="round"
                      opacity={wireOpacity}
                      className="cursor-pointer"
                      onMouseDown={e => {
                        if (mode !== 'select') return;
                        e.stopPropagation();
                        setSelectedWire(conn.id);
                        setSelectedPart(null);
                      }}
                    />
                    {/* Flowing electron pulse on HIGH wires during animation */}
                    {sig === 'high' && isAnimating && (
                      <path d={d} fill="none" stroke={conn.color}
                        strokeWidth={wireWidth - 0.5}
                        strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="10 18"
                        opacity={0.75}
                        pointerEvents="none"
                        style={{ animation: `flowWire ${Math.max(0.4, animSpeed / 600)}s linear infinite` }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Rubber-band wire while drawing */}
              {wiringFrom && (
                <line
                  x1={wiringFrom.x} y1={wiringFrom.y}
                  x2={mousePos.x}   y2={mousePos.y}
                  stroke={wireColor} strokeWidth={1.5}
                  strokeDasharray="5,3" opacity={0.7}
                  pointerEvents="none"
                />
              )}

              {/* ── MIK32 Chip ── */}
              <ChipSVG
                gpioState={animatedGPIO}
                wiringMode={mode === 'wire'}
                showAltFns={showAltFns}
                hoveredChipPin={hoveredChipPin}
                onPinHover={setHoveredChipPin}
                onPinClick={(ref, x, y) => {
                  if (!wiringFrom) {
                    setWiringFrom({ ref, x, y });
                  } else {
                    if (ref !== wiringFrom.ref) {
                      setConnections(prev => [...prev, {
                        id: uid(), from: wiringFrom.ref, to: ref, color: wireColor,
                      }]);
                    }
                    setWiringFrom(null);
                  }
                }}
              />

              {/* ── Placed components ── */}
              {parts.map(part => (
                <ComponentSVG
                  key={part.id}
                  part={part}
                  isSelected={selectedPart === part.id}
                  gpioState={gpioState}
                  wiringMode={mode === 'wire'}
                  onBodyDown={e => {
                    if (mode === 'wire') return;
                    e.stopPropagation();
                    setSelectedPart(part.id);
                    setSelectedWire(null);
                    const cp = toCanvas(e);
                    dragging.current = { partId: part.id, ox: cp.x - part.x, oy: cp.y - part.y };
                  }}
                  onPinDown={(pinName, x, y, e) => {
                    e.stopPropagation();
                    const ref = `${part.id}:${pinName}`;
                    if (!wiringFrom) {
                      setWiringFrom({ ref, x, y });
                    } else {
                      if (ref !== wiringFrom.ref) {
                        setConnections(prev => [...prev, {
                          id: uid(), from: wiringFrom.ref, to: ref, color: wireColor,
                        }]);
                      }
                      setWiringFrom(null);
                    }
                  }}
                />
              ))}

              {/* ── LED glow overlays ── */}
              {animatedGPIO && parts.map(part => renderLEDOverlay(part))}

              {/* Help text */}
              {parts.length === 0 && connections.length === 0 && (
                <text x={CX + CW / 2} y={CY + CH + 80} textAnchor="middle"
                  fontSize={11} fill="#2a5a40">
                  Добавьте компоненты из палитры слева и соедините с пинами МИК32
                </text>
              )}

            </g>
          </svg>

          {/* ── Pin hover tooltip ── */}
          {hoveredChipPin && (() => {
            const altFns = MIK32_ALT_FUNCTIONS[hoveredChipPin] ?? [];
            return (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                style={{ fontFamily: 'Consolas, monospace' }}>
                <div className="flex flex-col gap-1 rounded border border-[#2a5a40] bg-[#070e08ee] px-3 py-2 shadow-lg">
                  <div className="text-[11px] font-bold text-[#4ec9b0]">{hoveredChipPin}</div>
                  {altFns.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {altFns.map(fn => (
                        <span key={fn}
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                          style={{ color: altFnColor(fn), background: `${altFnColor(fn)}18`, border: `1px solid ${altFnColor(fn)}44` }}>
                          {fn}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9px] text-[#2a5a40]">GPIO only</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Zoom controls ── */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              className="w-7 h-7 rounded border border-[#1a3a28] bg-[#080f0a] text-[#3a8060] hover:text-[#4ec9b0] text-sm flex items-center justify-center transition-colors">+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="w-7 h-7 rounded border border-[#1a3a28] bg-[#080f0a] text-[#3a8060] hover:text-[#4ec9b0] text-[9px] flex items-center justify-center transition-colors">1:1</button>
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.2))}
              className="w-7 h-7 rounded border border-[#1a3a28] bg-[#080f0a] text-[#3a8060] hover:text-[#4ec9b0] text-sm flex items-center justify-center transition-colors">−</button>
          </div>

          {/* ── Quick hints ── */}
          <div className="absolute bottom-3 left-3 text-[9px] text-[#1a4a30] space-y-0.5">
            <div>S — режим выбора · W — провод · Del — удалить · Колесо — зум</div>
            <div>ЛКМ на пустом месте — панорамирование</div>
          </div>
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          part={selPart}
          connections={connections}
          onUpdateAttr={updateAttr}
          onDelete={deletePart}
          onWireColorChange={changeSelectedWireColor}
          wireColor={wireColor}
          selectedWireId={selectedWire}
          onDeleteWire={deleteWire}
        />
      </div>

      {/* ── CODE PANEL (toggle) ─────────────────────────────── */}
      {showCode && (
        <div className="shrink-0 h-[280px] flex flex-col border-t border-[#1a3a28] bg-[#080f0a]">
          {/* Code panel tab bar */}
          <div className="flex items-center gap-0 border-b border-[#1a3a28]">
            {(['generated', 'custom', 'uart', 'gpio'] as const).map(tab => {
              const labels: Record<string, string> = {
                generated: '✦ Авто-код',
                custom: '✎ Свой код',
                uart: '⟫ UART вывод',
                gpio: '⊞ GPIO состояние',
              };
              const hasData = tab === 'uart' ? !!simResult?.state.uartBuf : tab === 'gpio' ? !!gpioState : true;
              return (
                <button key={tab}
                  onClick={() => setCodeMode(tab)}
                  className={`px-3 py-1.5 text-[11px] border-r border-[#1a3a28] transition-colors whitespace-nowrap ${
                    codeMode === tab
                      ? 'bg-[#0a1a10] text-[#4ec9b0] border-t border-t-[#22c55e]'
                      : hasData
                        ? 'text-[#3a8060] hover:text-[#4ec9b0]'
                        : 'text-[#1a4a30] cursor-default'
                  }`}
                >{labels[tab]}{tab === 'uart' && simResult?.state.uartBuf ? <span className="ml-1 text-[9px] text-[#22c55e]">●</span> : null}</button>
              );
            })}
            <div className="flex items-center gap-2 px-3 ml-auto">
              <label className="text-[10px] text-[#3a8060]">Итер:
                <input type="number" min={1} max={200} value={iterations}
                  onChange={e => setIters(Math.max(1, +e.target.value || 1))}
                  className="ml-1 w-12 rounded border border-[#1a3a28] bg-[#080f0a] px-1.5 py-0.5 text-center text-[11px] text-[#4ec9b0] outline-none focus:border-[#22c55e]"
                />
              </label>
              <button onClick={runSim}
                className="rounded px-3 py-1 text-[11px] font-semibold bg-[#166534] hover:bg-[#15803d] text-white border border-[#15803d] transition-colors">
                ▶ Запустить
              </button>
              {codeMode === 'generated' && (
                <button
                  onClick={() => navigator.clipboard.writeText(generatedCode)}
                  className="rounded px-2 py-1 text-[10px] border border-[#1a3a28] text-[#3a8060] hover:text-[#4ec9b0] transition-colors">
                  ⎘ Копировать
                </button>
              )}
            </div>
          </div>

          {/* Code textarea */}
          <div className="flex-1 overflow-hidden">
            {codeMode === 'generated' ? (
              <pre className="h-full overflow-auto p-3 text-[11px] leading-5 text-[#c8d8c0] font-mono select-all bg-[#0a1a10]"
                style={{ fontFamily: 'Consolas, monospace' }}>
                {generatedCode}
              </pre>
            ) : codeMode === 'uart' ? (
              <div className="h-full overflow-auto bg-[#050d07] p-3">
                {simResult?.state.uartBuf ? (
                  <pre className="text-[11px] leading-5 text-[#22c55e] font-mono whitespace-pre-wrap"
                    style={{ fontFamily: 'Consolas, monospace' }}>
                    {simResult.state.uartBuf}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[#1a4a30]">
                    <span className="text-2xl">⟫</span>
                    <span className="text-[11px]">Нет вывода UART. Запустите симуляцию с printf() в коде.</span>
                  </div>
                )}
              </div>
            ) : codeMode === 'gpio' ? (
              <div className="h-full overflow-auto bg-[#050d07] p-3">
                {gpioState ? (
                  <div className="flex gap-6 text-[11px] font-mono" style={{ fontFamily: 'Consolas, monospace' }}>
                    {gpioState.map((port, pi) => {
                      const portName = ['GPIO_0', 'GPIO_1', 'GPIO_2'][pi];
                      const colors = ['#4ec9b0', '#9cdcfe', '#dcdcaa'];
                      const activePins = port.pins.filter(p => p.mode !== 'unset');
                      return (
                        <div key={pi} className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span style={{ color: colors[pi] }} className="font-bold">{portName}</span>
                            <span className={`text-[9px] px-1 rounded ${port.enabled ? 'bg-[#0d3020] text-[#22c55e]' : 'bg-[#1a1a1a] text-[#444]'}`}>
                              {port.enabled ? 'CLK ON' : 'CLK OFF'}
                            </span>
                            <span className="text-[9px] text-[#2a5a40]">{activePins.length} пин(ов)</span>
                          </div>
                          {port.pins.map((pin, idx) => pin.mode === 'unset' ? null : (
                            <div key={idx} className="flex items-center gap-2 py-0.5 border-b border-[#0d2018]">
                              <span className="w-12" style={{ color: colors[pi] }}>P{pi}_{idx}</span>
                              <span className={`w-14 text-center text-[10px] rounded px-1 ${pin.mode === 'output' ? 'bg-[#0d2018] text-[#3a7a58]' : 'bg-[#0d1828] text-[#3a5a7a]'}`}>
                                {pin.mode.toUpperCase()}
                              </span>
                              <span className={`w-8 text-center font-bold ${pin.value ? 'text-[#22c55e]' : 'text-[#444]'}`}>
                                {pin.value ? '1' : '0'}
                              </span>
                              <span className="text-[9px] text-[#2a4a38]">{pin.pull !== 'none' ? `↑${pin.pull}` : ''}</span>
                              {pin.mode === 'output' && (
                                <span className={`text-[9px] ${pin.value ? 'text-[#22c55e]' : 'text-[#2a4a30]'}`}>
                                  {pin.value ? '▲ HIGH' : '▽ LOW'}
                                </span>
                              )}
                            </div>
                          ))}
                          {activePins.length === 0 && (
                            <div className="text-[#1a4a30] text-[10px] mt-1">Нет активных пинов</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[#1a4a30]">
                    <span className="text-2xl">⊞</span>
                    <span className="text-[11px]">Запустите симуляцию чтобы увидеть состояние GPIO.</span>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                className="w-full h-full resize-none bg-[#0a1a10] p-3 font-mono text-[11px] leading-5 text-[#c8d8c0] outline-none"
                style={{ fontFamily: 'Consolas, monospace' }}
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                placeholder="// Введите C-код MIK32 HAL для симуляции..."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
