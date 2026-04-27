import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'wouter';
import { runSimulation, type SimState, type SimResult, type UserInputs } from '@/lib/mik32-sim';

// ═══════════════════════════════════════════════════════════════
// BOARD GEOMETRY (SVG coordinate space, 660 × 460)
// ═══════════════════════════════════════════════════════════════

const BW = 660, BH = 460;

// MIK32 chip block
const CX = 230, CY = 90, CW = 150, CH = 255;
const CL = CX, CR = CX + CW, CT = CY, CB = CY + CH;

// Pin positions on chip edges
const PIN_SPACING = 14;
function p0(pin: number) { return { x: CL, y: CT + 22 + pin * PIN_SPACING }; }   // GPIO_0 left
function p1(pin: number) { return { x: CR, y: CT + 22 + pin * PIN_SPACING }; }   // GPIO_1 right
function p2(pin: number) { return { x: CL + 22 + pin * 18, y: CB }; }            // GPIO_2 bottom

// Component placement (LEDs & buttons)
const LED_R = 14; // LED radius
const BTN_W = 28, BTN_H = 18;

function ledPos(port: 0 | 1 | 2, pin: number): { x: number; y: number } {
  if (port === 0) return { x: 72, y: p0(pin).y };
  if (port === 1) return { x: BW - 72, y: p1(pin).y };
  return { x: p2(pin).x, y: BH - 55 };
}

function btnPos(port: 0 | 1 | 2, pin: number): { x: number; y: number } {
  if (port === 2) return { x: p2(pin).x, y: BH - 50 };
  if (port === 0) return { x: 72, y: p0(pin).y };
  return { x: BW - 72, y: p1(pin).y };
}

// Orthogonal wire path from chip pin edge to component
function wirePath(port: 0 | 1 | 2, pin: number, cx: number, cy: number): string {
  const chip = port === 0 ? p0(pin) : port === 1 ? p1(pin) : p2(pin);
  if (Math.abs(chip.y - cy) < 2) {
    // Straight horizontal
    return `M ${chip.x} ${chip.y} L ${cx} ${chip.y}`;
  }
  if (Math.abs(chip.x - cx) < 2) {
    // Straight vertical
    return `M ${chip.x} ${chip.y} L ${cx} ${cy}`;
  }
  // L-shaped
  if (port === 0) {
    const midX = Math.min(chip.x, cx) - 20;
    return `M ${chip.x} ${chip.y} L ${midX} ${chip.y} L ${midX} ${cy} L ${cx + LED_R} ${cy}`;
  }
  if (port === 1) {
    const midX = Math.max(chip.x, cx) + 20;
    return `M ${chip.x} ${chip.y} L ${midX} ${chip.y} L ${midX} ${cy} L ${cx - LED_R} ${cy}`;
  }
  return `M ${chip.x} ${chip.y} L ${cx} ${chip.y} L ${cx} ${cy}`;
}

// ═══════════════════════════════════════════════════════════════
// SCENE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface SceneLED  { id: string; port: 0|1|2; pin: number; color: string; label: string; pwm?: { channel: number }; }
interface SceneBtn  { id: string; port: 0|1|2; pin: number; label: string; }
interface Scene     { id: string; name: string; leds: SceneLED[]; buttons: SceneBtn[]; code: string; extra?: 'shift74hc595' | 'uartTerm'; }

const SCENES: Scene[] = [
  {
    id: 'blink',
    name: '2 LED — мигание',
    leds: [
      { id: 'l0', port: 0, pin: 3, color: '#22c55e', label: 'LED1' },
      { id: 'l1', port: 1, pin: 3, color: '#facc15', label: 'LED2' },
    ],
    buttons: [],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"

void SystemClock_Config(void);
void GPIO_Init(void);

int main(void)
{
    SystemClock_Config();
    GPIO_Init();

    while (1)
    {
        HAL_GPIO_TogglePin(GPIO_0, GPIO_PIN_3);
        HAL_GPIO_TogglePin(GPIO_1, GPIO_PIN_3);
        HAL_DelayMs(500);
    }
}

void SystemClock_Config(void)
{
    PCC_InitTypeDef PCC_OscInit = {0};
    PCC_OscInit.OscillatorEnable         = PCC_OSCILLATORTYPE_ALL;
    PCC_OscInit.FreqMon.OscillatorSystem = PCC_OSCILLATORTYPE_OSC32M;
    PCC_OscInit.FreqMon.ForceOscSys      = PCC_FORCE_OSC_SYS_UNFIXED;
    PCC_OscInit.FreqMon.Force32KClk      = PCC_FREQ_MONITOR_SOURCE_OSC32K;
    PCC_OscInit.AHBDivider               = 0;
    PCC_OscInit.APBMDivider              = 0;
    PCC_OscInit.APBPDivider              = 0;
    PCC_OscInit.HSI32MCalibrationValue   = 128;
    PCC_OscInit.LSI32KCalibrationValue   = 8;
    PCC_OscInit.RTCClockSelection        = PCC_RTC_CLOCK_SOURCE_AUTO;
    PCC_OscInit.RTCClockCPUSelection     = PCC_CPU_RTC_CLOCK_SOURCE_OSC32K;
    HAL_PCC_Config(&PCC_OscInit);
}

void GPIO_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_1_CLK_ENABLE();
    GPIO_InitStruct.Pin  = GPIO_PIN_3;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);
    HAL_GPIO_Init(GPIO_1, &GPIO_InitStruct);
}`,
  },
  {
    id: 'button',
    name: 'Кнопка + LED',
    leds: [{ id: 'l0', port: 0, pin: 3, color: '#22c55e', label: 'LED' }],
    buttons: [{ id: 'b0', port: 2, pin: 0, label: 'BTN' }],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_2_CLK_ENABLE();

    GPIO_InitTypeDef out = {0};
    out.Pin  = GPIO_PIN_3;
    out.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    out.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &out);

    GPIO_InitTypeDef in = {0};
    in.Pin  = GPIO_PIN_0;
    in.Mode = HAL_GPIO_MODE_GPIO_INPUT;
    in.Pull = HAL_GPIO_PULL_UP;
    HAL_GPIO_Init(GPIO_2, &in);

    int pressed = 0;
    while (1)
    {
        uint32_t btn = HAL_GPIO_ReadPin(GPIO_2, GPIO_PIN_0);
        if (btn == GPIO_PIN_LOW)
        {
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_HIGH);
            pressed++;
            printf("Нажата %d раз(а)\\n", pressed);
        }
        else
        {
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_LOW);
        }
        HAL_DelayMs(50);
    }
}`,
  },
  {
    id: 'rgb',
    name: '3 LED (RGB)',
    leds: [
      { id: 'r', port: 0, pin: 0, color: '#ef4444', label: 'RED' },
      { id: 'g', port: 0, pin: 1, color: '#22c55e', label: 'GRN' },
      { id: 'b', port: 0, pin: 2, color: '#3b82f6', label: 'BLU' },
    ],
    buttons: [],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_0 | GPIO_PIN_1 | GPIO_PIN_2;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    cfg.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &cfg);

    while (1)
    {
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_0, GPIO_PIN_HIGH);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_1, GPIO_PIN_LOW);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_2, GPIO_PIN_LOW);
        HAL_DelayMs(400);

        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_0, GPIO_PIN_LOW);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_1, GPIO_PIN_HIGH);
        HAL_DelayMs(400);

        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_1, GPIO_PIN_LOW);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_2, GPIO_PIN_HIGH);
        HAL_DelayMs(400);
    }
}`,
  },
  {
    id: 'uart',
    name: 'UART / printf',
    leds: [],
    buttons: [],
    extra: 'uartTerm',
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include <stdio.h>

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_3;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    cfg.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &cfg);

    printf("MIK32 Амур запущен!\\n");
    printf("Системная частота: 32 МГц\\n");
    printf("Ядро: SCR1 RISC-V RV32IMC\\n");

    int i = 0;
    while (1)
    {
        HAL_GPIO_TogglePin(GPIO_0, GPIO_PIN_3);
        printf("[%4d ms] LED: %s\\n",
               i * 1000,
               (i % 2 == 0) ? "ON" : "OFF");
        i++;
        HAL_DelayMs(1000);
    }
}`,
  },
  {
    id: 'adc',
    name: 'ADC — потенциометр',
    leds: [
      { id: 'l0', port: 0, pin: 0, color: '#ef4444', label: 'L0' },
      { id: 'l1', port: 0, pin: 1, color: '#facc15', label: 'L1' },
      { id: 'l2', port: 0, pin: 2, color: '#22c55e', label: 'L2' },
    ],
    buttons: [],
    extra: 'uartTerm',
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_adc.h"
#include <stdio.h>

ADC_HandleTypeDef hadc;

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_ADC_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_0 | GPIO_PIN_1 | GPIO_PIN_2;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    cfg.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &cfg);

    HAL_ADC_Init(&hadc);

    int i = 0;
    while (1)
    {
        uint32_t raw = HAL_ADC_GetValue(&hadc);
        uint32_t mv  = (raw * 3300UL) / 4095UL;

        printf("[%d] ADC = %u (%.1f %% = %u мВ)\\n",
               i++, raw, raw * 100.0 / 4095.0, mv);

        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_0, (raw > 1365) ? GPIO_PIN_HIGH : GPIO_PIN_LOW);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_1, (raw > 2730) ? GPIO_PIN_HIGH : GPIO_PIN_LOW);
        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_2, (raw > 3900) ? GPIO_PIN_HIGH : GPIO_PIN_LOW);

        HAL_DelayMs(250);
    }
}`,
  },
  {
    id: 'i2c',
    name: 'I2C — сканер шины',
    leds: [{ id: 'l0', port: 0, pin: 3, color: '#3b82f6', label: 'LED' }],
    buttons: [],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_i2c.h"
#include <stdio.h>

I2C_HandleTypeDef hi2c;

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_I2C_0_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_3;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    HAL_GPIO_Init(GPIO_0, &cfg);

    HAL_I2C_Init(&hi2c);

    printf("=== Сканирование I2C шины ===\\n");
    int found = 0;

    uint8_t buf[1] = {0};
    for (uint8_t addr = 0x08; addr < 0x78; addr++)
    {
        HAL_StatusTypeDef res = HAL_I2C_Master_Transmit(&hi2c, addr << 1, buf, 1);
        if (res == HAL_OK)
        {
            printf("  Устройство найдено: 0x%02X\\n", addr);
            found++;
            HAL_GPIO_TogglePin(GPIO_0, GPIO_PIN_3);
            HAL_DelayMs(50);
        }
    }

    printf("\\nИтого найдено: %d устройств\\n", found);
    if (found == 0)
        printf("Шина I2C пуста (ожидаемо в симуляторе)\\n");
    return 0;
}`,
  },
  {
    id: 'spi',
    name: 'SPI — 74HC595 → 8 LED',
    extra: 'shift74hc595',
    leds: [
      { id: 'q0', port: 1, pin: 0, color: '#ef4444', label: 'Q0' },
      { id: 'q1', port: 1, pin: 1, color: '#f97316', label: 'Q1' },
      { id: 'q2', port: 1, pin: 2, color: '#facc15', label: 'Q2' },
      { id: 'q3', port: 1, pin: 3, color: '#4ade80', label: 'Q3' },
      { id: 'q4', port: 1, pin: 4, color: '#22d3ee', label: 'Q4' },
      { id: 'q5', port: 1, pin: 5, color: '#3b82f6', label: 'Q5' },
      { id: 'q6', port: 1, pin: 6, color: '#a855f7', label: 'Q6' },
      { id: 'q7', port: 1, pin: 7, color: '#ec4899', label: 'Q7' },
    ],
    buttons: [],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include <stdio.h>

/* Симуляция 74HC595 через GPIO:
 * В реальном проекте используется SPI (P1.1/MOSI, P1.2/CLK, P1.3/CS)
 * Здесь GPIO_1[0..7] заменяют выходы Q0..Q7 сдвигового регистра */

void SetLEDs(uint8_t mask);

int main(void)
{
    __HAL_PCC_GPIO_1_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_0 | GPIO_PIN_1 | GPIO_PIN_2 | GPIO_PIN_3
             | GPIO_PIN_4 | GPIO_PIN_5 | GPIO_PIN_6 | GPIO_PIN_7;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    cfg.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_1, &cfg);

    printf("74HC595 SPI — 8 LED (Knight Rider)\\n");
    printf("GPIO_1[0..7] = выходы Q0..Q7 регистра\\n\\n");

    uint8_t pattern = 0x01;
    int dir = 1;

    while (1)
    {
        SetLEDs(pattern);
        printf("Q[7:0] = 0b");
        for (int b = 7; b >= 0; b--)
            printf("%d", (pattern >> b) & 1);
        printf("  (0x%02X)\\n", pattern);

        if (dir == 1) {
            pattern <<= 1;
            if (pattern == 0x80) dir = -1;
        } else {
            pattern >>= 1;
            if (pattern == 0x01) dir = 1;
        }
        HAL_DelayMs(150);
    }
}

void SetLEDs(uint8_t mask)
{
    for (int i = 0; i < 8; i++)
    {
        HAL_GPIO_WritePin(GPIO_1, (1u << i),
            (mask >> i) & 1 ? GPIO_PIN_HIGH : GPIO_PIN_LOW);
    }
}`,
  },
  {
    id: 'uart_echo',
    name: 'UART Echo / эхо',
    leds: [
      { id: 'rx', port: 0, pin: 5, color: '#22d3ee', label: 'RX' },
      { id: 'tx', port: 0, pin: 6, color: '#4ade80', label: 'TX' },
    ],
    buttons: [{ id: 'b0', port: 2, pin: 0, label: 'SEND' }],
    extra: 'uartTerm',
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_uart.h"
#include <stdio.h>
#include <string.h>

UART_HandleTypeDef huart;

void UART_Init(void);

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_2_CLK_ENABLE();
    __HAL_PCC_UART_0_CLK_ENABLE();

    GPIO_InitTypeDef led_cfg = {0};
    led_cfg.Pin  = GPIO_PIN_5 | GPIO_PIN_6;
    led_cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    led_cfg.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &led_cfg);

    GPIO_InitTypeDef btn_cfg = {0};
    btn_cfg.Pin  = GPIO_PIN_0;
    btn_cfg.Mode = HAL_GPIO_MODE_GPIO_INPUT;
    btn_cfg.Pull = HAL_GPIO_PULL_UP;
    HAL_GPIO_Init(GPIO_2, &btn_cfg);

    UART_Init();

    const char* msg = "MIK32 Амур — UART Echo\\r\\n";
    printf("UART0 инициализирован (115200 8N1)\\n");
    printf("P0.5 = RX (UART0_RX)\\n");
    printf("P0.6 = TX (UART0_TX)\\n\\n");

    int count = 0;
    while (1)
    {
        if (HAL_GPIO_ReadPin(GPIO_2, GPIO_PIN_0) == GPIO_PIN_LOW)
        {
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_6, GPIO_PIN_HIGH); // TX LED
            HAL_UART_Transmit(&huart, (uint8_t*)msg, strlen(msg), 1000);
            printf("[TX #%d] %s", ++count, msg);
            HAL_DelayMs(20);
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_6, GPIO_PIN_LOW);

            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_5, GPIO_PIN_HIGH); // RX LED (echo)
            printf("[RX #%d] Эхо получено\\n", count);
            HAL_DelayMs(50);
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_5, GPIO_PIN_LOW);

            HAL_DelayMs(200);
        }
        HAL_DelayMs(10);
    }
}

void UART_Init(void)
{
    huart.Instance        = UART_0;
    huart.Init.BaudRate   = 115200;
    huart.Init.WordLength = UART_WORDLENGTH_8B;
    huart.Init.StopBits   = UART_STOPBITS_1;
    huart.Init.Parity     = UART_PARITY_NONE;
    HAL_UART_Init(&huart);
}`,
  },
  {
    id: 'pwm',
    name: 'PWM — плавная яркость',
    leds: [{ id: 'l0', port: 0, pin: 5, color: '#f59e0b', label: 'PWM', pwm: { channel: 0 } }],
    buttons: [],
    code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_timer.h"
#include <stdio.h>

TIM_HandleTypeDef htim;

int main(void)
{
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_TIMER32_0_CLK_ENABLE();

    GPIO_InitTypeDef cfg = {0};
    cfg.Pin  = GPIO_PIN_5;
    cfg.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    HAL_GPIO_Init(GPIO_0, &cfg);

    TIM_InitTypeDef timCfg = {0};
    timCfg.Prescaler = 32;
    timCfg.Period    = 100;
    HAL_TIM_Init(&htim, &timCfg);

    printf("PWM яркость: нарастание...\\n");

    int duty = 0;
    int dir  = 10;
    while (1)
    {
        HAL_TIM_SetDutyCycle(&htim, 0, duty);
        printf("PWM duty = %3d%%\\n", duty);

        HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_5,
            (duty > 50) ? GPIO_PIN_HIGH : GPIO_PIN_LOW);

        duty += dir;
        if (duty >= 100) { duty = 100; dir = -10; printf("PWM: MAX → убывание\\n"); }
        else if (duty <= 0) { duty = 0; dir = 10; printf("PWM: MIN → нарастание\\n"); }

        HAL_DelayMs(100);
    }
}`,
  },
];

// ═══════════════════════════════════════════════════════════════
// GPIO STATE REPLAY
// ═══════════════════════════════════════════════════════════════

interface ReplayInfo {
  gpio: SimState['gpio'];
  uart: string;
  timeMs: number;
  powered: boolean;
  clockSource: string;
  /** Скважность PWM по номеру канала (0..100) */
  pwmDuty: Record<number, number>;
}

function emptyGPIO(): SimState['gpio'] {
  return [
    { enabled: false, pins: Array(16).fill(null).map(() => ({ mode: 'unset' as const, pull: 'none' as const, value: false })) },
    { enabled: false, pins: Array(16).fill(null).map(() => ({ mode: 'unset' as const, pull: 'none' as const, value: false })) },
    { enabled: false, pins: Array(8).fill(null).map(() => ({ mode: 'unset' as const, pull: 'none' as const, value: false })) },
  ];
}

function replayGPIO(result: SimResult, upToIndex: number): ReplayInfo {
  const gpio = emptyGPIO();
  let uart = '';
  let timeMs = 0;
  let powered = false;
  let clockSource = '—';
  const pwmDuty: Record<number, number> = {};
  const events = result.state.events;
  const limit = upToIndex < 0 ? events.length : Math.min(upToIndex + 1, events.length);
  for (let i = 0; i < limit; i++) {
    const ev = events[i];
    const d = ev.data as Record<string, unknown> | undefined;
    timeMs = ev.simTimeMs;
    if (!d) continue;
    if (ev.type === 'pwm_set') {
      const ch = Number(d.channel ?? 0);
      const duty = Math.max(0, Math.min(100, Number(d.duty ?? 0)));
      pwmDuty[ch] = duty;
      continue;
    }
    if (ev.type === 'clock_enable') {
      powered = true;
      const p = String(d.periph ?? '');
      if (p === 'GPIO_0') gpio[0].enabled = true;
      else if (p === 'GPIO_1') gpio[1].enabled = true;
      else if (p === 'GPIO_2') gpio[2].enabled = true;
    } else if (ev.type === 'pcc_config') {
      powered = true;
      if (d.source) clockSource = String(d.source);
    } else if (ev.type === 'gpio_init') {
      const pi = Number(d.port ?? 0) as 0 | 1 | 2;
      const pins = (d.pins as string[] | undefined) ?? [];
      const mode = (d.mode as 'output' | 'input') ?? 'output';
      const pull = (d.pull as 'none' | 'up' | 'down') ?? 'none';
      pins.forEach(p => {
        const m = p.match(/P\d_(\d+)/);
        if (m && gpio[pi].pins[+m[1]]) {
          gpio[pi].pins[+m[1]].mode = mode;
          gpio[pi].pins[+m[1]].pull = pull;
          if (mode === 'input') {
            if (pull === 'up') gpio[pi].pins[+m[1]].value = true;
            else if (pull === 'down') gpio[pi].pins[+m[1]].value = false;
          }
        }
      });
    } else if (ev.type === 'gpio_write') {
      const pi = Number(d.port ?? 0) as 0 | 1 | 2;
      const pins = (d.pins as number[] | undefined) ?? [Number(d.pin ?? 0)];
      const v = Boolean(d.value);
      pins.forEach(pn => { if (gpio[pi].pins[pn]) gpio[pi].pins[pn].value = v; });
    } else if (ev.type === 'gpio_toggle') {
      const pi = Number(d.port ?? 0) as 0 | 1 | 2;
      const pins = (d.pins as number[] | undefined) ?? [Number(d.pin ?? 0)];
      pins.forEach(pn => { if (gpio[pi].pins[pn]) gpio[pi].pins[pn].value = !gpio[pi].pins[pn].value; });
    } else if (ev.type === 'uart_print') {
      uart += String(d.text ?? '');
    }
  }
  return { gpio, uart, timeMs, powered, clockSource, pwmDuty };
}

// ═══════════════════════════════════════════════════════════════
// SVG COMPONENTS
// ═══════════════════════════════════════════════════════════════

function LEDComp({ x, y, color, label, isOn, duty }: {
  x: number; y: number; color: string; label: string; isOn: boolean;
  /** Если задан — диод управляется PWM (0..100), визуализируем как яркость. */
  duty?: number;
}) {
  // Нормированная «яркость» 0..1: для PWM — duty/100, иначе 1 при isOn, 0 иначе.
  const brightness = duty !== undefined
    ? Math.max(0, Math.min(1, duty / 100))
    : (isOn ? 1 : 0);
  const lit = brightness > 0.02;
  return (
    <g>
      {/* Lead line to board */}
      <line x1={x} y1={y + LED_R} x2={x} y2={y + LED_R + 18} stroke="#666" strokeWidth={1.5} />
      <line x1={x - 5} y1={y + LED_R + 14} x2={x + 5} y2={y + LED_R + 14} stroke="#666" strokeWidth={1.5} />
      {/* Glow halo (масштабируется яркостью) */}
      {lit && <circle cx={x} cy={y} r={LED_R + 10} fill={color} opacity={0.18 * brightness} />}
      {lit && <circle cx={x} cy={y} r={LED_R + 5} fill={color} opacity={0.25 * brightness} />}
      {/* LED body */}
      <circle cx={x} cy={y} r={LED_R}
        fill={lit ? color : '#1c1c1c'}
        fillOpacity={lit ? 0.35 + 0.65 * brightness : 1}
        stroke={lit ? color : '#333'} strokeWidth={1.5} />
      {/* Dome highlight */}
      {lit && <ellipse cx={x - 4} cy={y - 5} rx={5} ry={4} fill={`rgba(255,255,255,${0.15 + 0.30 * brightness})`} />}
      {/* Flat base */}
      <rect x={x - LED_R} y={y + LED_R - 4} width={LED_R * 2} height={5} rx={1} fill={lit ? color : '#282828'} fillOpacity={lit ? 0.35 + 0.65 * brightness : 1} />
      {/* Label */}
      <text x={x} y={y + LED_R + 30} textAnchor="middle" fontSize={9} fill={lit ? color : '#666'} fontFamily="monospace" fontWeight={lit ? 'bold' : 'normal'}>
        {label}
      </text>
      {duty !== undefined ? (
        <text x={x} y={y + LED_R + 40} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace" opacity={0.85}>
          {Math.round(brightness * 100)}%
        </text>
      ) : isOn && (
        <text x={x} y={y + LED_R + 40} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace" opacity={0.8}>ON</text>
      )}
    </g>
  );
}

function ButtonComp({ x, y, label, isInput, pressed, onPressDown, onPressUp }: {
  x: number; y: number; label: string; isInput: boolean;
  pressed?: boolean;
  onPressDown?: () => void;
  onPressUp?: () => void;
}) {
  // «Утопленная» кнопка чуть смещена вниз и темнее.
  const offY = pressed ? 1.5 : 0;
  const capFill = pressed ? '#15803d' : (isInput ? '#1e3a2e' : '#2a2a2a');
  const capStroke = pressed ? '#22c55e' : (isInput ? '#22c55e44' : '#333');
  const dotFill = pressed ? '#fff' : (isInput ? '#22c55e' : '#444');
  return (
    <g
      onMouseDown={onPressDown}
      onMouseUp={onPressUp}
      onMouseLeave={onPressUp}
      onTouchStart={(e) => { e.preventDefault(); onPressDown?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); onPressUp?.(); }}
      style={{ cursor: onPressDown ? 'pointer' : 'default', userSelect: 'none' }}
    >
      {/* Leads up to chip */}
      <line x1={x - 7} y1={y - BTN_H / 2} x2={x - 7} y2={y - BTN_H / 2 - 14} stroke="#666" strokeWidth={1.5} />
      <line x1={x + 7} y1={y - BTN_H / 2} x2={x + 7} y2={y - BTN_H / 2 - 14} stroke="#666" strokeWidth={1.5} />
      {/* Button body (опорная пластина) */}
      <rect x={x - BTN_W / 2} y={y - BTN_H / 2} width={BTN_W} height={BTN_H} rx={3} fill="#222" stroke="#444" strokeWidth={1} />
      {/* Button cap (двигается при нажатии) */}
      <rect x={x - BTN_W / 2 + 4} y={y - BTN_H / 2 + 4 + offY} width={BTN_W - 8} height={BTN_H - 8} rx={2}
        fill={capFill} stroke={capStroke} strokeWidth={1} />
      {/* Center dot */}
      <circle cx={x} cy={y + offY} r={3} fill={dotFill} />
      {/* Pressed glow */}
      {pressed && <circle cx={x} cy={y} r={BTN_W / 2 + 6} fill="#22c55e" opacity={0.18} />}
      {/* Label */}
      <text x={x} y={y + BTN_H / 2 + 13} textAnchor="middle" fontSize={9}
        fill={pressed ? '#4ade80' : (isInput ? '#22c55e' : '#888')} fontWeight={pressed ? 'bold' : 'normal'}
        fontFamily="monospace">
        {label}{pressed ? ' ⏎' : ''}
      </text>
    </g>
  );
}

function ChipSVG({ gpio }: { gpio: SimState['gpio'] }) {
  return (
    <g>
      {/* PCB traces visible area on chip */}
      <rect x={CX - 1} y={CY - 1} width={CW + 2} height={CH + 2} rx={5} fill="none" stroke="#1a4a35" strokeWidth={3} />
      {/* Chip body */}
      <rect x={CX} y={CY} width={CW} height={CH} rx={4} fill="#0a0a0a" stroke="#2a2a2a" strokeWidth={1.5} />
      {/* Pin-1 notch */}
      <circle cx={CX + 12} cy={CY + 12} r={5} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {/* Center label */}
      <text x={CX + CW / 2} y={CY + CH / 2 - 18} textAnchor="middle" fill="#e8e8e8" fontSize={13} fontWeight="bold" fontFamily="monospace" letterSpacing={1}>MIK32 Амур</text>
      <text x={CX + CW / 2} y={CY + CH / 2} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">SCR1 RISC-V 32-bit</text>
      <text x={CX + CW / 2} y={CY + CH / 2 + 14} textAnchor="middle" fill="#444" fontSize={8} fontFamily="monospace">LQFP-100</text>
      {/* Decorative chip logo */}
      <rect x={CX + CW / 2 - 18} y={CY + CH / 2 + 24} width={36} height={18} rx={2} fill="#111" stroke="#333" strokeWidth={1} />
      <text x={CX + CW / 2} y={CY + CH / 2 + 36} textAnchor="middle" fill="#3a5a4a" fontSize={8} fontFamily="monospace">МИЛАНДР</text>

      {/* Port labels */}
      <text x={CL - 6} y={CY + 10} textAnchor="end" fontSize={8} fill="#4ec9b0" fontFamily="monospace">GPIO_0</text>
      <text x={CR + 6} y={CY + 10} textAnchor="start" fontSize={8} fill="#9cdcfe" fontFamily="monospace">GPIO_1</text>
      <text x={CX + CW / 2} y={CB + 14} textAnchor="middle" fontSize={8} fill="#dcdcaa" fontFamily="monospace">GPIO_2</text>

      {/* GPIO_0 pins (left side) */}
      {Array.from({ length: 16 }, (_, i) => {
        const { x, y } = p0(i);
        const pin = gpio[0].pins[i];
        const active = pin.mode !== 'unset';
        const hi = pin.value;
        return (
          <g key={`p0-${i}`}>
            <rect x={x - 18} y={y - 2} width={18} height={4} rx={1} fill="#8B7355" />
            <circle cx={x} cy={y} r={3.5}
              fill={active ? (hi ? '#4ec9b0' : '#1a4a40') : '#252525'}
              stroke={active ? '#4ec9b0' : '#353535'} strokeWidth={0.8} />
            <text x={x - 22} y={y + 3} textAnchor="end" fontSize={7} fill={active ? '#4ec9b0' : '#444'} fontFamily="monospace">
              P0_{i}
            </text>
          </g>
        );
      })}

      {/* GPIO_1 pins (right side) */}
      {Array.from({ length: 16 }, (_, i) => {
        const { x, y } = p1(i);
        const pin = gpio[1].pins[i];
        const active = pin.mode !== 'unset';
        const hi = pin.value;
        return (
          <g key={`p1-${i}`}>
            <rect x={x} y={y - 2} width={18} height={4} rx={1} fill="#8B7355" />
            <circle cx={x} cy={y} r={3.5}
              fill={active ? (hi ? '#9cdcfe' : '#1a304a') : '#252525'}
              stroke={active ? '#9cdcfe' : '#353535'} strokeWidth={0.8} />
            <text x={x + 22} y={y + 3} textAnchor="start" fontSize={7} fill={active ? '#9cdcfe' : '#444'} fontFamily="monospace">
              P1_{i}
            </text>
          </g>
        );
      })}

      {/* GPIO_2 pins (bottom side) */}
      {Array.from({ length: 8 }, (_, i) => {
        const { x, y } = p2(i);
        const pin = gpio[2].pins[i];
        const active = pin.mode !== 'unset';
        const hi = pin.value;
        return (
          <g key={`p2-${i}`}>
            <rect x={x - 2} y={y} width={4} height={18} rx={1} fill="#8B7355" />
            <circle cx={x} cy={y} r={3.5}
              fill={active ? (hi ? '#dcdcaa' : '#3a3a10') : '#252525'}
              stroke={active ? '#dcdcaa' : '#353535'} strokeWidth={0.8} />
            <text x={x} y={y + 28} textAnchor="middle" fontSize={7} fill={active ? '#dcdcaa' : '#444'} fontFamily="monospace">
              P2_{i}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// 74HC595 SHIFT-REGISTER (decorative DIP-16 chip)
// ═══════════════════════════════════════════════════════════════

function ShiftReg74HC595() {
  // Размещаем DIP-16 справа от MIK32, между ним и колонкой светодиодов P1.x.
  const x = CR + 60, y = CY + 30;
  const w = 60, h = 200;
  return (
    <g>
      {/* Корпус DIP */}
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#0c0c0c" stroke="#2a2a2a" strokeWidth={1.5} />
      {/* Выемка ориентации сверху */}
      <path d={`M ${x + w / 2 - 6} ${y} A 6 6 0 0 0 ${x + w / 2 + 6} ${y}`}
        fill="#1a1a1a" stroke="#333" strokeWidth={1} />
      {/* Метка чипа */}
      <text x={x + w / 2} y={y + h / 2 - 6} textAnchor="middle" fill="#e8e8e8" fontSize={10} fontWeight="bold" fontFamily="monospace">74HC595</text>
      <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" fill="#666" fontSize={7} fontFamily="monospace">8-bit shift</text>
      <text x={x + w / 2} y={y + h / 2 + 20} textAnchor="middle" fill="#444" fontSize={7} fontFamily="monospace">SIPO</text>
      {/* Ножки слева (вход) */}
      {Array.from({ length: 8 }, (_, i) => {
        const py = y + 14 + i * 22;
        const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'GND'];
        return (
          <g key={`l-${i}`}>
            <rect x={x - 8} y={py - 1.5} width={8} height={3} rx={0.5} fill="#8B7355" />
            <text x={x - 12} y={py + 2.5} textAnchor="end" fontSize={6} fill="#888" fontFamily="monospace">{labels[i]}</text>
          </g>
        );
      })}
      {/* Ножки справа (выход) */}
      {Array.from({ length: 8 }, (_, i) => {
        const py = y + 14 + i * 22;
        const labels = ['Vcc', 'SER', 'OE̅', 'RCLK', 'SRCLK', 'SRCLR̅', 'Q7\'', 'Q0'];
        return (
          <g key={`r-${i}`}>
            <rect x={x + w} y={py - 1.5} width={8} height={3} rx={0.5} fill="#8B7355" />
            <text x={x + w + 12} y={py + 2.5} textAnchor="start" fontSize={6} fill="#888" fontFamily="monospace">{labels[i]}</text>
          </g>
        );
      })}
      {/* Подпись */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fontSize={7} fill="#3a8060" fontFamily="monospace">DIP-16 (имитация)</text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL BOARD
// ═══════════════════════════════════════════════════════════════

function VisualBoard({ gpio, scene, simTimeMs, running, pwmDuty, uart, pressedBtns, onPressBtn, onReleaseBtn }: {
  gpio: SimState['gpio'];
  scene: Scene;
  simTimeMs: number;
  running: boolean;
  pwmDuty?: Record<number, number>;
  uart?: string;
  pressedBtns?: Record<string, boolean>;
  onPressBtn?: (port: 0|1|2, pin: number) => void;
  onReleaseBtn?: (port: 0|1|2, pin: number) => void;
}) {
  return (
    <svg
      viewBox={`0 0 ${BW} ${BH}`}
      className="w-full h-full"
      style={{ fontFamily: 'Consolas, monospace' }}
    >
      <defs>
        <pattern id="pcb-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.8" fill="#1a3a28" />
        </pattern>
        <filter id="led-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* PCB background */}
      <rect width={BW} height={BH} fill="#0e2219" rx={8} />
      <rect width={BW} height={BH} fill="url(#pcb-grid)" rx={8} />

      {/* Board outline */}
      <rect x={8} y={8} width={BW - 16} height={BH - 16} rx={6} fill="none" stroke="#1a3a28" strokeWidth={1.5} />

      {/* Board corner markers */}
      {[[20, 20], [BW - 20, 20], [20, BH - 20], [BW - 20, BH - 20]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={5} fill="none" stroke="#2a5a40" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={1.5} fill="#2a5a40" />
        </g>
      ))}

      {/* Board label */}
      <text x={BW / 2} y={22} textAnchor="middle" fontSize={11} fill="#2a5a40" fontWeight="bold" letterSpacing={2}>
        MIK32V2 DEVELOPMENT BOARD
      </text>

      {/* Sim time indicator */}
      {simTimeMs > 0 && (
        <text x={BW - 20} y={BH - 12} textAnchor="end" fontSize={9} fill="#2a5a40">
          t = {simTimeMs.toFixed(0)} ms
        </text>
      )}

      {/* ── Wires (drawn under components) ── */}
      {scene.leds.map(led => {
        const pos = ledPos(led.port, led.pin);
        const chipPin = led.port === 0 ? p0(led.pin) : led.port === 1 ? p1(led.pin) : p2(led.pin);
        const pin = gpio[led.port].pins[led.pin];
        const isOn = pin.value;
        const d = wirePath(led.port, led.pin, pos.x, pos.y);
        return (
          <path key={led.id} d={d}
            fill="none"
            stroke={isOn ? led.color : '#2a3a30'}
            strokeWidth={isOn ? 2 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isOn ? 0.9 : 0.5}
          />
        );
      })}

      {scene.buttons.map(btn => {
        const pos = btnPos(btn.port, btn.pin);
        const d = wirePath(btn.port, btn.pin, pos.x, pos.y);
        const pin = gpio[btn.port]?.pins[btn.pin];
        const active = pin?.mode === 'input';
        return (
          <path key={btn.id} d={d}
            fill="none"
            stroke={active ? '#22c55e' : '#2a3a30'}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? 0.7 : 0.4}
          />
        );
      })}

      {/* ── Chip ── */}
      <ChipSVG gpio={gpio} />

      {/* ── 74HC595 шилд (для SPI-сцены) ── */}
      {scene.extra === 'shift74hc595' && <ShiftReg74HC595 />}

      {/* ── LED components ── */}
      {scene.leds.map(led => {
        const pos = ledPos(led.port, led.pin);
        const pin = gpio[led.port].pins[led.pin];
        const isOn = pin.value;
        const duty = led.pwm ? pwmDuty?.[led.pwm.channel] : undefined;
        return (
          <LEDComp key={led.id} x={pos.x} y={pos.y} color={led.color} label={led.label} isOn={isOn} duty={duty} />
        );
      })}

      {/* ── Button components (clickable) ── */}
      {scene.buttons.map(btn => {
        const pos = btnPos(btn.port, btn.pin);
        const pin = gpio[btn.port]?.pins[btn.pin];
        const isInput = pin?.mode === 'input';
        const key = `${btn.port}_${btn.pin}`;
        const pressed = !!pressedBtns?.[key];
        return (
          <ButtonComp
            key={btn.id}
            x={pos.x} y={pos.y} label={btn.label} isInput={isInput}
            pressed={pressed}
            onPressDown={isInput && onPressBtn ? () => onPressBtn(btn.port, btn.pin) : undefined}
            onPressUp={isInput && onReleaseBtn ? () => onReleaseBtn(btn.port, btn.pin) : undefined}
          />
        );
      })}

      {/* ── UART terminal mini-display (если сцена пишет в UART) ── */}
      {scene.extra === 'uartTerm' && <UartTerminal x={BW - 195} y={BH - 110} text={uart ?? ''} />}

      {/* Idle placeholder */}
      {!running && simTimeMs === 0 && (
        <text x={BW / 2} y={BH - 25} textAnchor="middle" fontSize={10} fill="#2a5a40">
          Нажмите ▶ Запустить для начала симуляции
        </text>
      )}
    </svg>
  );
}

// ─── UART терминал-монитор на плате ──────────────────────────
function UartTerminal({ x, y, text }: { x: number; y: number; text: string }) {
  const W = 180, H = 95;
  const lines = (text || '').split('\n').filter(Boolean).slice(-6);
  const cursorOn = ((Date.now() / 500) | 0) % 2 === 0;
  return (
    <g>
      {/* Корпус-«монитор» */}
      <rect x={x} y={y} width={W} height={H} rx={6} fill="#0f0f0f" stroke="#444" strokeWidth={1.5} />
      <rect x={x + 4} y={y + 4} width={W - 8} height={H - 8} rx={4} fill="#000" stroke="#1a3a1a" strokeWidth={1} />
      {/* «LED» индикатор приёма */}
      <circle cx={x + W - 10} cy={y + 10} r={3} fill={text ? '#22c55e' : '#333'}>
        {text && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
      </circle>
      <text x={x + 8} y={y + 14} fontSize={7} fill="#22c55e88" fontFamily="monospace">UART0 / 9600 8N1</text>
      {/* Текст терминала (scroll-tail) */}
      {lines.map((ln, i) => (
        <text
          key={i}
          x={x + 8}
          y={y + 28 + i * 10}
          fontSize={8}
          fill="#4ade80"
          fontFamily="monospace"
        >
          {ln.length > 28 ? ln.slice(0, 27) + '…' : ln}
          {i === lines.length - 1 && cursorOn ? '▌' : ''}
        </text>
      ))}
      {lines.length === 0 && (
        <text x={x + 8} y={y + 28} fontSize={8} fill="#22c55e44" fontFamily="monospace">
          (ожидание данных{cursorOn ? '▌' : ''})
        </text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIC ANALYZER — signal trace builder
// ═══════════════════════════════════════════════════════════════

interface SignalTrace {
  port: number;
  pin: number;
  points: { t: number; v: boolean }[];
}

function buildSignalTraces(events: SimResult['state']['events']): SignalTrace[] {
  const map = new Map<string, SignalTrace>();

  function getOrCreate(port: number, pin: number): SignalTrace {
    const key = `${port}_${pin}`;
    if (!map.has(key)) map.set(key, { port, pin, points: [{ t: 0, v: false }] });
    return map.get(key)!;
  }

  for (const ev of events) {
    const d = ev.data as Record<string, unknown> | undefined;
    if (!d) continue;

    if (ev.type === 'gpio_write') {
      const port = Number(d.port);
      const val = Boolean(d.value);
      const pins = Array.isArray(d.pins) ? (d.pins as number[]) : [Number(d.pin)];
      for (const pin of pins) {
        const tr = getOrCreate(port, pin);
        const last = tr.points[tr.points.length - 1];
        if (!last || last.v !== val || last.t !== ev.simTimeMs) {
          tr.points.push({ t: ev.simTimeMs, v: val });
        }
      }
    } else if (ev.type === 'gpio_toggle') {
      const port = Number(d.port);
      const pins = Array.isArray(d.pins) ? (d.pins as number[]) : [Number(d.pin)];
      for (const pin of pins) {
        const tr = getOrCreate(port, pin);
        const lastV = tr.points[tr.points.length - 1]?.v ?? false;
        tr.points.push({ t: ev.simTimeMs, v: !lastV });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.port - b.port || a.pin - b.pin);
}

// ═══════════════════════════════════════════════════════════════
// LOGIC ANALYZER PANEL
// ═══════════════════════════════════════════════════════════════

const PORT_COLORS_LA = ['#4ec9b0', '#9cdcfe', '#dcdcaa'];
const LA_ROW_H = 44;
const LA_LABEL_W = 70;
const LA_HEADER_H = 24;
const LA_PAD_R = 20;
const LA_WAVE_W = 920;

function LogicAnalyzer({ result, evIdx }: { result: SimResult | null; evIdx: number }) {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[#2a5a40]">
        Запустите симуляцию для отображения анализатора логики
      </div>
    );
  }

  const events = result.state.events;
  const totalTime = Math.max(result.state.simTimeMs, 1);
  const traces = buildSignalTraces(events);

  if (traces.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[#2a5a40]">
        Нет GPIO write/toggle событий для отображения
      </div>
    );
  }

  const svgH = LA_HEADER_H + traces.length * LA_ROW_H;
  const svgW = LA_LABEL_W + LA_WAVE_W + LA_PAD_R;

  function tX(t: number) {
    return LA_LABEL_W + (t / totalTime) * LA_WAVE_W;
  }

  const cursorTime =
    evIdx >= 0 && evIdx < events.length ? events[evIdx].simTimeMs : -1;
  const cursorX = cursorTime >= 0 ? tX(cursorTime) : -1;

  const TICKS = 10;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (i * totalTime) / TICKS);

  function buildWavePaths(
    points: { t: number; v: boolean }[],
    rowY: number,
  ): { stroke: string; fill: string } {
    const hiY = rowY + 9;
    const loY = rowY + LA_ROW_H - 9;

    let stroke = `M ${tX(0)} ${loY}`;
    let curV = false;

    const extended = [...points, { t: totalTime, v: points[points.length - 1]?.v ?? false }];
    for (const pt of extended) {
      const x = tX(pt.t);
      if (pt.v !== curV) {
        stroke += ` H ${x} V ${pt.v ? hiY : loY}`;
        curV = pt.v;
      } else {
        stroke += ` H ${x}`;
      }
    }

    const finalY = curV ? hiY : loY;
    const fill = `${stroke} L ${tX(totalTime)} ${loY} L ${tX(0)} ${loY} Z`;
    void finalY;

    return { stroke, fill };
  }

  return (
    <div className="flex-1 overflow-auto bg-[#080f0a]" style={{ fontFamily: 'Consolas, monospace' }}>
      <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
        {/* Background */}
        <rect width={svgW} height={svgH} fill="#080f0a" />

        {/* Time axis header */}
        <rect x={LA_LABEL_W} y={0} width={LA_WAVE_W + LA_PAD_R} height={LA_HEADER_H} fill="#0a1208" />
        {ticks.map((t, i) => {
          const x = tX(t);
          return (
            <g key={i}>
              <line x1={x} y1={LA_HEADER_H - 5} x2={x} y2={LA_HEADER_H} stroke="#2a5a40" strokeWidth={1} />
              <text x={x} y={LA_HEADER_H - 7} textAnchor="middle" fontSize={8} fill="#3a8060">
                {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t.toFixed(0)}ms`}
              </text>
              <line
                x1={x} y1={LA_HEADER_H} x2={x} y2={svgH}
                stroke="#111d14" strokeWidth={0.8}
              />
            </g>
          );
        })}

        {/* Label / waveform separator */}
        <line x1={LA_LABEL_W} y1={0} x2={LA_LABEL_W} y2={svgH} stroke="#1a3a28" strokeWidth={1} />

        {/* Pin rows */}
        {traces.map((trace, ri) => {
          const rowY = LA_HEADER_H + ri * LA_ROW_H;
          const color = PORT_COLORS_LA[trace.port] ?? '#9ca3af';
          const hiY = rowY + 9;
          const loY = rowY + LA_ROW_H - 9;
          const { stroke, fill } = buildWavePaths(trace.points, rowY);

          return (
            <g key={`${trace.port}_${trace.pin}`}>
              {/* Row background */}
              <rect
                x={0} y={rowY} width={svgW} height={LA_ROW_H}
                fill={ri % 2 === 0 ? '#080f0a' : '#091310'}
              />

              {/* Label */}
              <text
                x={LA_LABEL_W - 8} y={rowY + LA_ROW_H / 2 + 4}
                textAnchor="end" fontSize={10} fontWeight="bold" fill={color}
              >
                P{trace.port}_{trace.pin}
              </text>

              {/* H / L level hints */}
              <text x={LA_LABEL_W - 8} y={hiY + 3} textAnchor="end" fontSize={7} fill={color} opacity={0.45}>H</text>
              <text x={LA_LABEL_W - 8} y={loY + 3} textAnchor="end" fontSize={7} fill={color} opacity={0.45}>L</text>

              {/* Mid-row divider */}
              <line x1={0} y1={rowY + LA_ROW_H} x2={svgW} y2={rowY + LA_ROW_H} stroke="#121e14" strokeWidth={0.5} />

              {/* Waveform fill (area under HIGH) */}
              <path d={fill} fill={color} opacity={0.07} />

              {/* Waveform stroke */}
              <path d={stroke} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="square" />

              {/* HIGH / LOW end-label */}
              {(() => {
                const lastV = trace.points[trace.points.length - 1]?.v ?? false;
                return (
                  <text
                    x={tX(totalTime) + 4} y={lastV ? hiY + 4 : loY + 4}
                    fontSize={8} fill={color} opacity={0.6}
                  >
                    {lastV ? '1' : '0'}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Current-event cursor */}
        {cursorX >= LA_LABEL_W && (
          <g>
            <line
              x1={cursorX} y1={LA_HEADER_H} x2={cursorX} y2={svgH}
              stroke="#22c55e" strokeWidth={1} strokeDasharray="4,3" opacity={0.85}
            />
            <text x={cursorX + 3} y={LA_HEADER_H + 10} fontSize={8} fill="#22c55e" opacity={0.8}>
              {cursorTime >= 1000 ? `${(cursorTime / 1000).toFixed(2)}s` : `${cursorTime.toFixed(0)}ms`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVENT LOG ROW
// ═══════════════════════════════════════════════════════════════

const EV_COLORS: Record<string, string> = {
  clock_enable: '#f59e0b', pcc_config: '#fbbf24', gpio_init: '#60a5fa',
  gpio_write: '#4ade80', gpio_toggle: '#34d399', gpio_read: '#22d3ee',
  uart_print: '#c084fc', delay: '#fb923c', reg_write: '#f87171',
  reg_read: '#fca5a5', adc_read: '#818cf8', spi_tx: '#e879f9',
  i2c_tx: '#f472b6', timer_init: '#38bdf8', pwm_set: '#a3e635',
  info: '#9ca3af', warn: '#fbbf24', error: '#f87171',
};

function EventRow({ ev, active, onClick }: {
  ev: { id: number; type: string; simTimeMs: number; label: string; detail: string };
  active: boolean;
  onClick: () => void;
}) {
  const c = EV_COLORS[ev.type] ?? '#9ca3af';
  return (
    <div
      data-ev
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-1 text-[11px] cursor-pointer border-b border-[#1a2a22] select-none ${active ? 'bg-[#0d3020]' : 'hover:bg-[#0a1e14]'}`}
    >
      <span className="shrink-0 mt-0.5 font-mono text-[10px] w-14 text-right" style={{ color: '#3a8060' }}>{ev.simTimeMs.toFixed(0)}ms</span>
      <span className="shrink-0 font-bold" style={{ color: c }}>{ev.label}</span>
      <span className="text-[#6a8a76] min-w-0 truncate">{ev.detail}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SIMULATOR PAGE
// ═══════════════════════════════════════════════════════════════

export default function SimulatorPage() {
  const [sceneId, setSceneId] = useState('blink');
  const scene = SCENES.find(s => s.id === sceneId) ?? SCENES[0];

  const [code, setCode] = useState(() => {
    const fromChapter = sessionStorage.getItem('mik32_sim_code');
    if (fromChapter) { sessionStorage.removeItem('mik32_sim_code'); return fromChapter; }
    return scene.code;
  });
  const [iterations, setIterations] = useState(6);
  const [result, setResult] = useState<SimResult | null>(null);
  const [evIdx, setEvIdx] = useState(-1);          // current event index (-1 = show final)
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(220);         // ms per event
  const [bottomTab, setBottomTab] = useState<'uart' | 'events' | 'logic'>('uart');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evListRef = useRef<HTMLDivElement>(null);
  // Интерактивные «физические» входы: нажатые кнопки, положение АЦП-ползунка
  const [pressedBtns, setPressedBtns] = useState<Record<string, boolean>>({});
  const [adcValue, setAdcValue] = useState<number>(2048); // ~1.65 В на 3.3 В
  // Признак «надо перезапустить симуляцию» — флаг, на который реагирует useEffect
  const [autoRerunTick, setAutoRerunTick] = useState(0);

  // When scene changes, load its code
  const handleSceneChange = (id: string) => {
    setSceneId(id);
    const s = SCENES.find(sc => sc.id === id);
    if (s) setCode(s.code);
    stopPlay();
    setResult(null);
    setEvIdx(-1);
    // При смене сцены сбрасываем интерактивные входы
    setPressedBtns({});
    setAdcValue(2048);
  };

  // Хелперы для интерактивных кнопок ─ срабатывают «press-and-hold».
  function pressBtn(port: 0 | 1 | 2, pin: number) {
    setPressedBtns(p => ({ ...p, [`${port}_${pin}`]: true }));
    setAutoRerunTick(t => t + 1);
  }
  function releaseBtn(port: 0 | 1 | 2, pin: number) {
    setPressedBtns(p => {
      const c = { ...p };
      delete c[`${port}_${pin}`];
      return c;
    });
    setAutoRerunTick(t => t + 1);
  }
  function setAdc(v: number) {
    setAdcValue(v);
    setAutoRerunTick(t => t + 1);
  }

  // Scroll active event into view
  useEffect(() => {
    if (evIdx >= 0 && evListRef.current) {
      const rows = evListRef.current.querySelectorAll('[data-ev]');
      (rows[evIdx] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [evIdx]);

  const stopPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
  }, []);

  const startPlay = useCallback((events: SimResult['state']['events'], from: number) => {
    stopPlay();
    setPlaying(true);
    let idx = from;
    timerRef.current = setInterval(() => {
      setEvIdx(idx);
      idx++;
      if (idx >= events.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setPlaying(false);
      }
    }, speed);
  }, [stopPlay, speed]);

  function handleRun() {
    stopPlay();
    const inputs: UserInputs = { buttons: pressedBtns, adcValue };
    const r = runSimulation(code, iterations, inputs);
    setResult(r);
    setEvIdx(-1);
  }

  // Автоматический перезапуск симуляции при изменении интерактивных входов
  // (нажатие кнопки, движение ползунка АЦП). Срабатывает только если уже
  // была хотя бы одна успешная симуляция — иначе ждём явного «Запустить».
  useEffect(() => {
    if (autoRerunTick === 0 || !result) return;
    const inputs: UserInputs = { buttons: pressedBtns, adcValue };
    const r = runSimulation(code, iterations, inputs);
    setResult(r);
    setEvIdx(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRerunTick]);

  function handlePlay() {
    if (!result) return;
    if (playing) { stopPlay(); return; }
    const from = evIdx < 0 ? 0 : evIdx;
    startPlay(result.state.events, from);
  }

  function handleStep(dir: 1 | -1) {
    if (!result) return;
    stopPlay();
    const max = result.state.events.length - 1;
    const next = Math.max(0, Math.min(max, (evIdx < 0 ? -1 : evIdx) + dir));
    setEvIdx(next);
  }

  function handleReset() {
    stopPlay();
    setResult(null);
    setEvIdx(-1);
  }

  const events = result?.state.events ?? [];
  const { gpio, uart, timeMs, powered, clockSource, pwmDuty } = result
    ? replayGPIO(result, evIdx)
    : { gpio: emptyGPIO(), uart: '', timeMs: 0, powered: false, clockSource: '—', pwmDuty: {} as Record<number, number> };

  const curEvent = evIdx >= 0 && evIdx < events.length ? events[evIdx] : null;
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-[#0a1a10] text-[#c8d8c0]" style={{ fontFamily: 'Consolas, monospace' }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 border-b border-[#1a3a28] bg-[#080f0a] px-3 py-2 flex-wrap">
        <Link to="/" className="text-[11px] text-[#3a8060] hover:text-[#4ec9b0] transition-colors mr-1">← Курс</Link>
        <span className="text-[#1a5a38] text-xs">|</span>
        <span className="text-[11px] font-semibold text-[#4ec9b0]">MIK32 Симулятор</span>

        {/* Power / clock indicator */}
        <span
          title={powered
            ? `МК запитан. Источник тактирования: ${clockSource}`
            : 'МК НЕ инициализирован: не вызван PCC_Config / __HAL_PCC_*_CLK_ENABLE'}
          className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${
            powered
              ? 'border-[#15803d] bg-[#0d3020] text-[#4ade80]'
              : 'border-[#7f1d1d] bg-[#1a0606] text-[#f87171]'
          }`}
        >
          <span className={powered ? 'animate-pulse' : ''}>{powered ? '⚡' : '○'}</span>
          {powered ? `PWR · ${clockSource}` : 'PWR OFF'}
        </span>

        <button
          onClick={() => setShowHelp(v => !v)}
          className="rounded border border-[#1a3a28] px-2 py-0.5 text-[10px] text-[#3a8060] hover:border-[#4ec9b0] hover:text-[#4ec9b0] transition-colors"
          title="Как пользоваться симулятором"
        >? Помощь</button>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Scene selector */}
        <div className="flex gap-1">
          {SCENES.map(s => (
            <button
              key={s.id}
              onClick={() => handleSceneChange(s.id)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                sceneId === s.id
                  ? 'bg-[#0d3020] border-[#22c55e] text-[#4ade80]'
                  : 'border-[#1a3a28] text-[#3a8060] hover:border-[#2a5a40] hover:text-[#4ec9b0]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Run */}
        <button
          onClick={handleRun}
          className="flex items-center gap-1.5 rounded px-3 py-1 text-[11px] font-semibold bg-[#166534] hover:bg-[#15803d] text-white border border-[#15803d] transition-colors"
        >
          ▶ Запустить
        </button>

        {/* Play/Pause */}
        {result && (
          <>
            <button
              onClick={handlePlay}
              className={`rounded px-2 py-1 text-[11px] border transition-colors ${
                playing
                  ? 'bg-[#0d3020] border-[#22c55e] text-[#4ade80]'
                  : 'border-[#1a3a28] text-[#3a8060] hover:border-[#22c55e] hover:text-[#4ade80]'
              }`}
            >
              {playing ? '⏸ Пауза' : '▶▶ Плей'}
            </button>
            <button
              onClick={() => handleStep(-1)}
              disabled={evIdx <= 0}
              className="rounded px-2 py-1 text-[11px] border border-[#1a3a28] text-[#3a8060] hover:border-[#2a5a40] hover:text-[#4ec9b0] disabled:opacity-30 transition-colors"
            >◀</button>
            <button
              onClick={() => handleStep(1)}
              disabled={evIdx >= events.length - 1}
              className="rounded px-2 py-1 text-[11px] border border-[#1a3a28] text-[#3a8060] hover:border-[#2a5a40] hover:text-[#4ec9b0] disabled:opacity-30 transition-colors"
            >▶</button>
            <button
              onClick={handleReset}
              className="rounded px-2 py-1 text-[11px] border border-[#1a3a28] text-[#3a8060] hover:border-[#f87171] hover:text-[#f87171] transition-colors"
            >■ Сброс</button>
          </>
        )}

        <div className="w-px h-4 bg-[#1a3a28] mx-1" />

        {/* Speed */}
        <label className="flex items-center gap-1.5 text-[10px] text-[#3a8060]">
          Скорость:
          <input type="range" min={50} max={800} step={50} value={850 - speed}
            onChange={e => setSpeed(850 - +e.target.value)}
            className="w-16 accent-[#22c55e]"
          />
        </label>

        {/* Iterations */}
        <label className="flex items-center gap-1.5 text-[10px] text-[#3a8060]">
          Итер:
          <input type="number" min={1} max={200} value={iterations}
            onChange={e => setIterations(Math.max(1, +e.target.value || 1))}
            className="w-12 rounded border border-[#1a3a28] bg-[#080f0a] px-1.5 py-0.5 text-center text-[11px] text-[#4ec9b0] outline-none focus:border-[#22c55e]"
          />
        </label>

        {/* Status */}
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          {result && !result.error && (
            <span className="text-[#22c55e]">✓ {events.length} событий · {result.state.simTimeMs.toFixed(0)} мс</span>
          )}
          {result?.error && <span className="text-[#f87171]">⚠ {result.error.slice(0, 60)}</span>}
          {curEvent && (
            <span className="text-[#3a8060]">[{evIdx + 1}/{events.length}] {curEvent.label}</span>
          )}
        </div>
      </div>

      {/* ── HELP PANEL ───────────────────────────────────────── */}
      {showHelp && (
        <div className="shrink-0 border-b border-[#1a3a28] bg-[#0a1a10] px-4 py-3 text-[11px] leading-relaxed text-[#a8c8b0]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#4ec9b0]">Как пользоваться симулятором MIK32</span>
            <button onClick={() => setShowHelp(false)} className="text-[#3a8060] hover:text-[#f87171]">✕</button>
          </div>
          <ul className="ml-4 list-disc space-y-1">
            <li>Выберите <b>сцену</b> (примерный сценарий) либо вставьте свой C-код в левый редактор.</li>
            <li>Нажмите <b className="text-[#4ade80]">▶ Запустить</b> — код будет статически проинтерпретирован,
              события (clock_enable, GPIO_Init, write/read, UART, I2C…) появятся в правой панели «События».</li>
            <li>Индикатор <span className="text-[#4ade80]">⚡ PWR · OSC32M</span> сверху показывает,
              что МК «запитан»: был вызов <code>HAL_PCC_Config(...)</code> или
              <code>__HAL_PCC_GPIO_*_CLK_ENABLE()</code>. Без него вся периферия мертва — это самая частая
              ошибка новичков.</li>
            <li>Кнопками <b>◀ ▶</b> можно <b>пошагово прокрутить</b> события, наблюдая SVG-схему слева.
              Зелёный кружок на ноге = HIGH, серый = LOW, красная окантовка = выход.</li>
            <li>Кнопка <b className="text-[#4ade80]">▶▶ Плей</b> запускает автопрокрутку, ползунок «Скорость»
              меняет интервал.</li>
            <li>Текст из <code>printf()</code> и <code>HAL_UART_Transmit()</code> попадает в окно <b>UART</b>
              (правая нижняя вкладка).</li>
            <li>Для I2C-сцен «найденными» считаются адреса 0x27 (LCD), 0x3C (OLED), 0x50 (EEPROM), 0x68 (RTC) —
              этого достаточно, чтобы сценарий «I2C-сканер» давал ненулевой ответ.</li>
            <li>Симулятор не исполняет настоящий RISC-V и не моделирует регистры — он отлично подходит,
              чтобы <i>проверить логику</i> алгоритма, но не тайминги.</li>
            <li>Хотите перейти от схемы → к коду → к симуляции?
              Откройте <Link to="/diagram-editor" className="text-[#4ade80] underline">редактор схем</Link>,
              соберите подключения, нажмите «Сгенерировать код» и затем «▶ Открыть в симуляторе».</li>
          </ul>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── LEFT: Code Editor ── */}
        <div className="flex w-[45%] shrink-0 flex-col border-r border-[#1a3a28]">
          {/* Tab */}
          <div className="flex shrink-0 items-center border-b border-[#1a3a28] bg-[#080f0a]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#1a3a28] bg-[#0d1a10] text-[11px] text-[#4ec9b0]">
              <span>📄</span> main.c
            </div>
            <div className="flex-1" />
            <span className="px-3 text-[10px] text-[#2a5a40]">C / MIK32 HAL</span>
          </div>

          {/* Editor with line numbers */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Gutter */}
            <div className="shrink-0 select-none bg-[#080f0a] border-r border-[#1a2a18] text-right text-[11px] leading-5 text-[#2a5a40] pt-3 pr-2 overflow-hidden"
              style={{ width: 42, fontFamily: 'Consolas, monospace' }}>
              {code.split('\n').map((_, i) => <div key={i} className="px-1">{i + 1}</div>)}
            </div>
            {/* Code area */}
            <textarea
              className="flex-1 resize-none bg-[#0a1a10] p-3 font-mono text-[12px] leading-5 text-[#c8d8c0] outline-none placeholder-[#2a4a35] min-h-0"
              style={{ fontFamily: 'Consolas, monospace' }}
              value={code}
              onChange={e => { setCode(e.target.value); setResult(null); stopPlay(); setEvIdx(-1); }}
              spellCheck={false}
              placeholder="// Вставьте C-код MIK32 HAL..."
            />
          </div>

          {/* Status bar */}
          <div className="shrink-0 flex items-center gap-3 px-3 py-0.5 bg-[#0d3020] border-t border-[#1a3a28] text-[10px] text-[#4ec9b0]">
            <span>C/C++</span>
            <span className="opacity-40">|</span>
            <span>MIK32 HAL Simulator</span>
            {curEvent && (
              <>
                <span className="opacity-40">|</span>
                <span className="text-[#22c55e]">{curEvent.label}: {curEvent.detail.slice(0, 40)}</span>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Board + Console ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Interactive controls strip — нажимаемые кнопки и АЦП-ползунок */}
          {(scene.buttons.length > 0 || scene.id === 'adc') && (
            <div className="shrink-0 border-b border-[#1a3a28] bg-[#0c1810] px-3 py-2 flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-[#3a8060]">Управление:</span>

              {/* Кнопки сцены */}
              {scene.buttons.map(btn => {
                const key = `${btn.port}_${btn.pin}`;
                const pressed = !!pressedBtns[key];
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onMouseDown={() => pressBtn(btn.port, btn.pin)}
                    onMouseUp={() => releaseBtn(btn.port, btn.pin)}
                    onMouseLeave={() => pressed && releaseBtn(btn.port, btn.pin)}
                    onTouchStart={(e) => { e.preventDefault(); pressBtn(btn.port, btn.pin); }}
                    onTouchEnd={(e) => { e.preventDefault(); releaseBtn(btn.port, btn.pin); }}
                    className={
                      'select-none rounded-md border px-3 py-1.5 text-[11px] font-mono font-semibold transition-all ' +
                      (pressed
                        ? 'bg-[#15803d] border-[#22c55e] text-white shadow-[0_0_12px_rgba(34,197,94,0.5)] translate-y-px'
                        : 'bg-[#0a1a10] border-[#1a3a28] text-[#4ec9b0] hover:border-[#22c55e] hover:bg-[#0d2418]')
                    }
                    title={`Удерживайте, чтобы замкнуть P${btn.port}_${btn.pin} на GND`}
                  >
                    {pressed ? '◉' : '○'} {btn.label} <span className="opacity-50">P{btn.port}_{btn.pin}</span>
                  </button>
                );
              })}

              {/* Ползунок АЦП — только для сцены ADC */}
              {scene.id === 'adc' && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-[11px] font-mono text-[#4ec9b0]">🎛 Потенциометр:</span>
                  <input
                    type="range"
                    min={0}
                    max={4095}
                    step={1}
                    value={adcValue}
                    onChange={(e) => setAdc(Number(e.target.value))}
                    className="w-44 accent-[#22c55e]"
                    title="Значение, которое отдаёт HAL_ADC_GetValue"
                  />
                  <span className="font-mono text-[11px] text-[#22c55e] tabular-nums w-32">
                    {adcValue.toString().padStart(4, ' ')} / 4095
                    <span className="text-[#3a8060] ml-1">({((adcValue * 3300) / 4095).toFixed(0)} мВ)</span>
                  </span>
                </div>
              )}

              <span className="ml-auto text-[10px] text-[#3a8060] italic">
                {result ? '↻ симуляция перезапускается автоматически' : 'нажмите ▶ Запустить'}
              </span>
            </div>
          )}

          {/* Visual board */}
          <div className="flex-1 min-h-0 overflow-hidden p-2">
            <VisualBoard
              gpio={gpio}
              scene={scene}
              simTimeMs={timeMs}
              running={!!result}
              pwmDuty={pwmDuty}
              uart={uart}
              pressedBtns={pressedBtns}
              onPressBtn={pressBtn}
              onReleaseBtn={releaseBtn}
            />
          </div>

          {/* Bottom panel: UART + Events */}
          <div className="flex h-[30%] shrink-0 flex-col border-t border-[#1a3a28]">
            {/* Tab bar */}
            <div className="flex shrink-0 items-end bg-[#080f0a] border-b border-[#1a3a28]">
              {([
                { id: 'uart', label: '> Console' },
                { id: 'events', label: `📋 Events (${events.length})` },
                { id: 'logic', label: '〜 Logic Analyzer' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`px-4 py-1.5 text-[11px] border-r border-[#1a3a28] transition-colors ${
                    bottomTab === tab.id
                      ? 'bg-[#0a1a10] text-[#4ec9b0] border-t-[1.5px] border-t-[#22c55e]'
                      : 'text-[#3a8060] hover:text-[#4ec9b0]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* UART tab */}
            {bottomTab === 'uart' && (
              <pre className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-5 text-[#4ade80] bg-[#0a1a10]"
                style={{ fontFamily: 'Consolas, monospace' }}>
                {uart || <span className="text-[#2a5a40]">// Вывод printf/UART появится здесь...</span>}
              </pre>
            )}

            {/* Events tab */}
            {bottomTab === 'events' && (
              <div className="flex-1 overflow-y-auto bg-[#0a1a10]" ref={evListRef}>
                {events.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-[#2a5a40]">Запустите симуляцию чтобы увидеть события HAL</div>
                ) : events.map((ev, i) => (
                  <EventRow
                    key={ev.id}
                    ev={ev}
                    active={i === evIdx}
                    onClick={() => { stopPlay(); setEvIdx(i); }}
                  />
                ))}
              </div>
            )}

            {/* Logic Analyzer tab */}
            {bottomTab === 'logic' && (
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <LogicAnalyzer result={result} evIdx={evIdx} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
