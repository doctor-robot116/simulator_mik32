// ============================================================
// MIK32 Амур — браузерный симулятор HAL-кода
// ============================================================

// ─── Типы событий симуляции ──────────────────────────────────

export type SimEventType =
  | 'clock_enable'
  | 'pcc_config'
  | 'gpio_init'
  | 'gpio_write'
  | 'gpio_toggle'
  | 'gpio_read'
  | 'uart_print'
  | 'delay'
  | 'reg_write'
  | 'reg_read'
  | 'adc_read'
  | 'spi_tx'
  | 'i2c_tx'
  | 'timer_init'
  | 'pwm_set'
  | 'info'
  | 'warn'
  | 'error';

export interface SimEvent {
  id: number;
  type: SimEventType;
  simTimeMs: number;
  label: string;
  detail: string;
  data?: Record<string, unknown>;
}

export interface GPIOPin {
  mode: 'output' | 'input' | 'analog' | 'serial' | 'unset';
  pull: 'none' | 'up' | 'down';
  value: boolean;
}

export interface GPIOPort {
  enabled: boolean;
  pins: GPIOPin[];
}

export interface SimState {
  gpio: [GPIOPort, GPIOPort, GPIOPort];
  uartBuf: string;
  simTimeMs: number;
  sysclk: number;
  events: SimEvent[];
  stepCount: number;
  /** МК «запитан» — был вызван PCC_Config или __HAL_PCC_*_CLK_ENABLE */
  powered: boolean;
  /** Активный системный источник тактирования (OSC32M / HSI32M / OSC32K / LSI32K) */
  clockSource: string;
}

export interface SimResult {
  state: SimState;
  error?: string;
}

// ─── Начальное состояние ─────────────────────────────────────

function makePort(pinCount: number): GPIOPort {
  return {
    enabled: false,
    pins: Array.from({ length: pinCount }, () => ({
      mode: 'unset',
      pull: 'none',
      value: false,
    })),
  };
}

function makeInitialState(): SimState {
  return {
    gpio: [makePort(16), makePort(16), makePort(8)],
    uartBuf: '',
    simTimeMs: 0,
    sysclk: 32_000_000,
    events: [],
    stepCount: 0,
    powered: false,
    clockSource: '—',
  };
}

// ─── Пользовательские «физические» входы ─────────────────────
// Позволяют интерактивно задавать состояние внешних устройств:
// нажатые кнопки, текущее значение АЦП-потенциометра и т.п.
export interface UserInputs {
  /** Удерживаемые кнопки в формате `${port}_${pin}` → true (LOW при чтении). */
  buttons?: Record<string, boolean>;
  /** Значение, которое отдаёт `HAL_ADC_GetValue` (0..4095). Если не задано — случайное. */
  adcValue?: number;
}

// ─── HAL-окружение для выполнения ────────────────────────────

function buildHAL(state: SimState, maxSteps: number, inputs: UserInputs = {}) {
  let evId = 0;
  const MAX_UART = 4096;

  function addEvent(
    type: SimEventType,
    label: string,
    detail: string,
    data?: Record<string, unknown>,
  ): void {
    state.events.push({ id: evId++, type, simTimeMs: state.simTimeMs, label, detail, data });
  }

  function portIndex(p: unknown): 0 | 1 | 2 {
    const n = Number(p);
    if (n === 0 || n === 1 || n === 2) return n as 0 | 1 | 2;
    return 0;
  }

  function pinIndex(p: unknown): number {
    const n = Number(p);
    if (n <= 0) return 0;
    // Convert bitmask to bit index (lowest set bit position)
    const lsb = n & (-n);
    return Math.min(Math.round(Math.log2(lsb)), 15);
  }

  function pinsFromMask(mask: number, portPinCount: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < portPinCount; i++) {
      if ((mask >> i) & 1) result.push(i);
    }
    return result;
  }

  function portName(p: 0 | 1 | 2): string {
    return ['GPIO_0', 'GPIO_1', 'GPIO_2'][p];
  }

  function pinName(pin: number): string {
    return `PIN_${pin}`;
  }

  return {
    // ── Тактирование ──────────────────────────────────────────
    PCC_CLK_ENABLE(periph: string): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');

      // Любой clock_enable означает, что МК «живой» и периферия запитана
      state.powered = true;

      if (periph === 'GPIO_0') state.gpio[0].enabled = true;
      else if (periph === 'GPIO_1') state.gpio[1].enabled = true;
      else if (periph === 'GPIO_2') state.gpio[2].enabled = true;

      addEvent('clock_enable', `Такт. ${periph}`, `Тактирование ${periph} включено`, { periph });
    },

    PCC_Config(cfg: Record<string, unknown>): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const freqMon = cfg?.FreqMon as Record<string, unknown> | undefined;
      const src = String(freqMon?.OscillatorSystem ?? 'OSC32M').replace(/"/g, '');
      state.powered = true;
      state.clockSource = src;
      addEvent('pcc_config', 'PCC Config', `Системная частота: ${src}, AHB div=${cfg?.AHBDivider ?? 0}`, { cfg, source: src });
    },

    // ── GPIO ──────────────────────────────────────────────────
    GPIO_Init(port: unknown, cfg: Record<string, unknown>): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const pi = portIndex(port);
      const portObj = state.gpio[pi];
      const pinMask = Number(cfg?.Pin ?? 0);
      const mode = String(cfg?.Mode ?? 'output').includes('INPUT') ? 'input' : 'output';
      const pull = String(cfg?.Pull ?? '').includes('UP')
        ? 'up'
        : String(cfg?.Pull ?? '').includes('DOWN')
          ? 'down'
          : 'none';

      const initializedPins: string[] = [];
      for (let i = 0; i < portObj.pins.length; i++) {
        if (pinMask === -1 || (pinMask >> i) & 1) {
          portObj.pins[i].mode = mode;
          portObj.pins[i].pull = pull;
          // Для входов с подтяжкой задаём «логический уровень в покое»:
          // pull-up → линия удерживается в HIGH (1), pull-down → LOW (0).
          // Без подтяжки ничего не трогаем.
          if (mode === 'input') {
            if (pull === 'up') portObj.pins[i].value = true;
            else if (pull === 'down') portObj.pins[i].value = false;
          }
          initializedPins.push(`P${pi}_${i}`);
        }
      }

      addEvent(
        'gpio_init',
        `GPIO_Init ${portName(pi)}`,
        `Пины [${initializedPins.join(', ')}]: режим=${mode.toUpperCase()}, подтяжка=${pull}`,
        { port: pi, pins: initializedPins, mode, pull },
      );
    },

    GPIO_WritePin(port: unknown, pin: unknown, value: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const pi = portIndex(port);
      const mask = Number(pin);
      const val = value === 0 || value === false || String(value).includes('LOW') ? false : true;
      const portPinCount = state.gpio[pi].pins.length;
      const affected = mask > 0 ? pinsFromMask(mask, portPinCount) : [pinIndex(pin)];
      affected.forEach(pn => { state.gpio[pi].pins[pn].value = val; });
      const pinStr = affected.map(pn => `P${pi}_${pn}`).join(', ');
      addEvent(
        'gpio_write',
        `GPIO_Write ${pinStr}`,
        `${pinStr} → ${val ? 'HIGH (1)' : 'LOW (0)'}`,
        { port: pi, pin: affected[0] ?? 0, pins: affected, value: val },
      );
    },

    GPIO_TogglePin(port: unknown, pin: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const pi = portIndex(port);
      const mask = Number(pin);
      const portPinCount = state.gpio[pi].pins.length;
      const affected = mask > 0 ? pinsFromMask(mask, portPinCount) : [pinIndex(pin)];
      affected.forEach(pn => { state.gpio[pi].pins[pn].value = !state.gpio[pi].pins[pn].value; });
      const pinStr = affected.map(pn => `P${pi}_${pn}`).join(', ');
      const firstVal = state.gpio[pi].pins[affected[0] ?? 0]?.value ?? false;
      addEvent(
        'gpio_toggle',
        `GPIO_Toggle ${pinStr}`,
        `${pinStr}: ${firstVal ? '0→1' : '1→0'}`,
        { port: pi, pin: affected[0] ?? 0, pins: affected, value: firstVal },
      );
    },

    GPIO_ReadPin(port: unknown, pin: unknown): number {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const pi = portIndex(port);
      const pn = pinIndex(pin);
      // Если пользователь интерактивно «нажал» кнопку — линия садится в LOW
      // (моделирование подтянутого ко VCC входа с активным замыканием на GND).
      const userPressed = inputs.buttons?.[`${pi}_${pn}`];
      let val: number;
      if (userPressed === true) {
        val = 0;
        state.gpio[pi].pins[pn].value = false;
      } else {
        val = state.gpio[pi].pins[pn].value ? 1 : 0;
      }
      addEvent(
        'gpio_read',
        `GPIO_Read P${pi}_${pn}`,
        `Считано P${pi}_${pn} = ${val}${userPressed === true ? ' (кнопка нажата)' : ''}`,
        { port: pi, pin: pn, value: val, userPressed: !!userPressed },
      );
      return val;
    },

    // ── LL GPIO ───────────────────────────────────────────────
    ll_gpio_toggle(mask: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const m = Number(mask);
      const pi = portIndex((m >> 24) & 0x3);
      const pn = pinIndex(m & 0xFFFF);
      const prev = state.gpio[pi].pins[pn].value;
      state.gpio[pi].pins[pn].value = !prev;
      addEvent('gpio_toggle', `LL Toggle P${pi}_${pn}`, `P${pi}_${pn}: ${prev ? '1→0' : '0→1'}`, { port: pi, pin: pn });
    },

    ll_gpio_out_write(mask: unknown, val: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const m = Number(mask);
      const pi = portIndex((m >> 24) & 0x3);
      const pn = pinIndex(m & 0xFFFF);
      const v = Number(val) !== 0;
      state.gpio[pi].pins[pn].value = v;
      addEvent('gpio_write', `LL Write P${pi}_${pn}`, `P${pi}_${pn} → ${v ? '1' : '0'}`, { port: pi, pin: pn, value: v });
    },

    // ── UART / printf ─────────────────────────────────────────
    printf(fmt: string, ...args: unknown[]): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      let s = String(fmt ?? '');
      let ai = 0;
      // Поддерживаем спецификаторы вида %[-+0 #]?[width]?(.[prec])?[hl]?[diuoxXeEfFgGscp%]
      s = s.replace(/%([-+0 #]*)(\d+)?(?:\.(\d+))?[hl]{0,2}([diuoxXeEfFgGscp%])/g,
        (_m, flags: string, widthS: string, precS: string, conv: string) => {
          if (conv === '%') return '%';
          const arg = args[ai++];
          const width = widthS ? parseInt(widthS, 10) : 0;
          const prec = precS ? parseInt(precS, 10) : -1;
          let str: string;
          switch (conv) {
            case 'd': case 'i':
              str = String(Math.trunc(Number(arg) || 0)); break;
            case 'u':
              str = String(Math.max(0, Math.trunc(Number(arg) || 0))); break;
            case 'x':
              str = (Math.trunc(Number(arg) || 0) >>> 0).toString(16); break;
            case 'X':
              str = (Math.trunc(Number(arg) || 0) >>> 0).toString(16).toUpperCase(); break;
            case 'o':
              str = (Math.trunc(Number(arg) || 0) >>> 0).toString(8); break;
            case 'c':
              str = typeof arg === 'number' ? String.fromCharCode(arg) : String(arg).charAt(0); break;
            case 's':
              str = String(arg ?? ''); if (prec >= 0) str = str.slice(0, prec); break;
            case 'f': case 'F': case 'g': case 'G': case 'e': case 'E':
              str = (Number(arg) || 0).toFixed(prec >= 0 ? prec : 6); break;
            case 'p':
              str = '0x' + (Math.trunc(Number(arg) || 0) >>> 0).toString(16).toUpperCase(); break;
            default:
              str = String(arg);
          }
          // выравнивание по ширине
          if (width > str.length) {
            const padCh = flags.includes('0') && !flags.includes('-') && /[diouxX]/.test(conv) ? '0' : ' ';
            str = flags.includes('-') ? str.padEnd(width, ' ') : str.padStart(width, padCh);
          }
          return str;
        });
      s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '');
      if (state.uartBuf.length < MAX_UART) state.uartBuf += s;
      addEvent('uart_print', 'UART TX', s.replace(/\n$/, '') || '(пустая строка)', { text: s });
    },

    UART_Transmit(_uart: unknown, data: unknown, _len: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const s = String(data);
      if (state.uartBuf.length < MAX_UART) state.uartBuf += s;
      addEvent('uart_print', 'UART TX', s || '(данные)', { text: s });
    },

    // ── Задержка ──────────────────────────────────────────────
    DelayMs(ms: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const t = Number(ms) || 0;
      state.simTimeMs += t;
      addEvent('delay', `Задержка ${t} мс`, `Симулировано: +${t} мс (t=${state.simTimeMs} мс)`, { ms: t });
    },

    // ── Прямой доступ к регистрам ─────────────────────────────
    writeU32(addr: unknown, val: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const a = Number(addr);
      const v = Number(val);
      addEvent(
        'reg_write',
        `MEM[0x${a.toString(16).toUpperCase().padStart(8, '0')}] = 0x${v.toString(16).toUpperCase()}`,
        `Запись 0x${v.toString(16).toUpperCase()} по адресу 0x${a.toString(16).toUpperCase().padStart(8, '0')}`,
        { addr: a, value: v },
      );
    },

    readU32(addr: unknown): number {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      const a = Number(addr);
      addEvent(
        'reg_read',
        `MEM[0x${a.toString(16).toUpperCase().padStart(8, '0')}]`,
        `Чтение по адресу 0x${a.toString(16).toUpperCase().padStart(8, '0')}`,
        { addr: a },
      );
      return 0;
    },

    // ── ADC ───────────────────────────────────────────────────
    ADC_GetValue(_hadc: unknown): number {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      // Если пользователь крутит «потенциометр» (ползунок) — отдаём его значение,
      // иначе случайное (как раньше).
      const fromUser = inputs.adcValue;
      const val = (fromUser === undefined || fromUser === null)
        ? Math.floor(Math.random() * 4096)
        : Math.max(0, Math.min(4095, Math.round(Number(fromUser))));
      const mv = Math.round((val * 3300) / 4095);
      addEvent('adc_read', 'ADC GetValue',
        `АЦП вернул: ${val} (0x${val.toString(16).toUpperCase()}, ~${mv} мВ)`,
        { value: val, mv });
      return val;
    },

    // ── SPI ───────────────────────────────────────────────────
    SPI_Transmit(_hspi: unknown, data: unknown, size: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      addEvent('spi_tx', 'SPI TX', `Передано ${size} байт`, { data: String(data), size: Number(size) });
    },

    // ── I2C ───────────────────────────────────────────────────
    I2C_Master_Transmit(_hi2c: unknown, addr: unknown, _data: unknown, size: unknown): number {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      // Эмулируем «найденные» устройства по детерминированной маске адресов,
      // чтобы сцена «I2C сканер» давала осмысленный вывод (HAL_OK = 0).
      const a = Number(addr) >> 1; // сбрасываем R/W бит
      const FAKE_DEVS = new Set([0x27, 0x3C, 0x50, 0x68]); // LCD, OLED, EEPROM, RTC
      const ok = FAKE_DEVS.has(a);
      addEvent('i2c_tx',
        `I2C → 0x${a.toString(16).toUpperCase()}`,
        `${size} байт, ${ok ? 'ACK (устройство найдено)' : 'NACK (нет ответа)'}`,
        { addr: a, size: Number(size), ok });
      return ok ? 0 /* HAL_OK */ : 1 /* HAL_ERROR */;
    },

    // ── Timer ─────────────────────────────────────────────────
    TIM_Init(_htim: unknown, cfg: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      addEvent('timer_init', 'Timer Init', `Таймер инициализирован: ${JSON.stringify(cfg)}`, {});
    },

    // ── PWM ───────────────────────────────────────────────────
    TIM_SetDutyCycle(_htim: unknown, ch: unknown, duty: unknown): void {
      state.stepCount++;
      if (state.stepCount > maxSteps) throw new Error('__MAX_STEPS__');
      addEvent('pwm_set', `PWM канал ${ch}`, `Скважность: ${duty}%`, { channel: Number(ch), duty: Number(duty) });
    },

    // ── Служебные ─────────────────────────────────────────────
    log(msg: string): void {
      addEvent('info', 'LOG', String(msg));
    },

    warn(msg: string): void {
      addEvent('warn', 'WARN', String(msg));
    },

    // ── Самовоспроизводящиеся struct'ы ────────────────────────
    // Нужны, чтобы C-код вида `cfg.FreqMon.OscillatorSystem = ...`
    // не упирался в "Cannot set properties of undefined".
    struct(): unknown {
      // Свойства, которые нельзя «оживлять», иначе JSON.stringify,
      // console.log и шаблонные литералы уйдут в бесконечную рекурсию.
      const SKIP = new Set<string>([
        'toJSON', 'toString', 'valueOf', 'then', 'constructor',
        'nodeType', 'tagName', 'length',
        '$$typeof', '@@toPrimitive',
        // React/inspector heuristics
        '_isReactElement', 'isReactComponent',
      ]);
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(target, prop) {
          if (typeof prop === 'symbol') {
            if (prop === Symbol.toPrimitive) return () => '[struct]';
            return undefined;
          }
          if (SKIP.has(prop)) return undefined;
          if (!(prop in target)) {
            target[prop] = new Proxy({} as Record<string, unknown>, handler);
          }
          return target[prop];
        },
        has(target, prop) {
          if (typeof prop === 'symbol') return false;
          return prop in target;
        },
      };
      return new Proxy({} as Record<string, unknown>, handler);
    },
  };
}

// ─── Парсер вызовов C-функций со сбалансированными скобками ──
// Используется вместо «глупых» regex, чтобы корректно обрабатывать
// аргументы вида `HAL_GPIO_WritePin(GPIO_1, (1u << i), …)`.
function replaceCall(
  src: string,
  name: string,
  fn: (args: string[]) => string,
): string {
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index;
    let i = m.index + m[0].length;
    let depth = 1;
    let cur = '';
    const args: string[] = [];
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '(') { depth++; cur += ch; }
      else if (ch === ')') {
        depth--;
        if (depth === 0) { if (cur.trim() || args.length) args.push(cur.trim()); break; }
        cur += ch;
      } else if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; }
      else cur += ch;
      i++;
    }
    if (depth !== 0) break;
    out += src.slice(last, start) + fn(args.map(a => a.replace(/^&/, '')));
    last = i + 1;
    re.lastIndex = last;
  }
  out += src.slice(last);
  return out;
}

// ─── Трансформатор C → JavaScript ────────────────────────────

function removeComments(src: string): string {
  // Block comments
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Line comments
  src = src.replace(/\/\/[^\n]*/g, '');
  return src;
}

function transformC(src: string): string {
  // ── Шаг 0: убираем комментарии (сохраняем переносы строк)
  src = removeComments(src);

  // ── Шаг 0.1: убираем C-суффиксы целых литералов (1u, 1ul, 0xFFul, 100UL, 0LL)
  // Делаем это ДО любых замен, чтобы JavaScript не споткнулся об «1u».
  src = src.replace(/(0x[0-9a-fA-F]+|\d+)(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?)\b/g, '$1');

  // ── Шаг 0.2: пустой список параметров `(void)` → `()`
  src = src.replace(/\(\s*void\s*\)/g, '()');

  // ── Шаг 0.3: переименовываем C-идентификаторы, конфликтующие с
  // зарезервированными словами JS strict mode (in, interface, package, …).
  // Заменяем только идентификаторы вне строковых литералов.
  const RESERVED_WORDS = ['in', 'interface', 'package', 'private', 'protected',
    'public', 'implements', 'yield', 'enum'];
  src = src.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\w+)\b/g,
    (m, str, word) => {
      if (str) return str;
      return RESERVED_WORDS.includes(word) ? `__${word}` : word;
    });

  // ── Шаг 1: #include убираем
  src = src.replace(/#include\s*[<"][^>"]*[>"]/g, '');

  // ── Шаг 2: #define NAME VALUE → const NAME = VALUE;
  src = src.replace(/#define\s+(\w+)\s+([^\n]+)/g, (_m, name, val) => {
    const v = val.trim().replace(/\s*\/\*[^*]*\*\//g, '').trim();
    return `const ${name} = ${v || '0'};`;
  });

  // ── Шаг 3: extern "C" убираем
  src = src.replace(/extern\s+"C"\s*\{[\s\S]*?\}/g, '');

  // ── Шаг 4: typedef ... TypeDef; убираем (только declaration)
  src = src.replace(/typedef\s+struct\s*\{[\s\S]*?\}\s*\w+TypeDef\s*;/g, '');
  src = src.replace(/typedef\s+\w+\s+\w+;/g, '');

  // ── Шаг 5: константы MIK32 HAL
  const CONSTANTS: Record<string, string> = {
    GPIO_0: '0', GPIO_1: '1', GPIO_2: '2',
    GPIO_PIN_HIGH: '1', GPIO_PIN_LOW: '0',
    GPIO_PIN_SET: '1', GPIO_PIN_RESET: '0',
    HAL_GPIO_MODE_GPIO_OUTPUT: '"output"',
    HAL_GPIO_MODE_GPIO_INPUT: '"input"',
    HAL_GPIO_MODE_SERIAL: '"serial"',
    HAL_GPIO_MODE_ANALOG: '"analog"',
    HAL_GPIO_PULL_NONE: '"none"',
    HAL_GPIO_PULL_UP: '"up"',
    HAL_GPIO_PULL_DOWN: '"down"',
    HAL_GPIO_DS_2MA: '2', HAL_GPIO_DS_4MA: '4', HAL_GPIO_DS_8MA: '8',
    PCC_OSCILLATORTYPE_ALL: '0xFF',
    PCC_OSCILLATORTYPE_OSC32M: '"OSC32M"',
    PCC_OSCILLATORTYPE_HSI32M: '"HSI32M"',
    PCC_OSCILLATORTYPE_OSC32K: '"OSC32K"',
    PCC_OSCILLATORTYPE_LSI32K: '"LSI32K"',
    PCC_FORCE_OSC_SYS_UNFIXED: '0',
    PCC_FORCE_OSC_SYS_FIXED: '1',
    PCC_FREQ_MONITOR_SOURCE_OSC32K: '0',
    PCC_FREQ_MONITOR_SOURCE_LSI32K: '1',
    PCC_RTC_CLOCK_SOURCE_AUTO: '0',
    PCC_CPU_RTC_CLOCK_SOURCE_OSC32K: '0',
    HAL_OK: '0', HAL_ERROR: '1', HAL_BUSY: '2', HAL_TIMEOUT: '3',
    NULL: 'null', TRUE: 'true', FALSE: 'false',
    ENABLE: '1', DISABLE: '0',
  };
  // GPIO_PIN_x (0..15) — bitmasks as per real MIK32 HAL (GPIO_PIN_3 = 1<<3 = 8)
  for (let i = 0; i < 16; i++) {
    CONSTANTS[`GPIO_PIN_${i}`] = String(1 << i);
  }
  // GPIO_PIN_ALL — all pins mask
  CONSTANTS['GPIO_PIN_ALL'] = String(0xFFFF);

  for (const [k, v] of Object.entries(CONSTANTS)) {
    src = src.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
  }

  // ── Шаг 6: P0_N и P1_N LL pin macros → специальное число с портом в байте
  // P0_x = port 0 << 24 | pin x
  src = src.replace(/\bP0_(\d+)\b/g, (_, n) => String((0 << 24) | parseInt(n)));
  src = src.replace(/\bP1_(\d+)\b/g, (_, n) => String((1 << 24) | parseInt(n)));
  src = src.replace(/\bP2_(\d+)\b/g, (_, n) => String((2 << 24) | parseInt(n)));

  // ── Шаг 7: __HAL_PCC_xxx_CLK_ENABLE() → __hal.PCC_CLK_ENABLE("xxx")
  src = src.replace(/__HAL_PCC_(\w+)_CLK_ENABLE\s*\(\s*\)/g, '__hal.PCC_CLK_ENABLE("$1")');

  // ── Шаг 8: HAL функции → __hal.xxx (через сбалансированный парсер)
  // Используем replaceCall, чтобы корректно обрабатывать аргументы со
  // вложенными скобками, например `HAL_GPIO_WritePin(GPIO_1, (1u << i), …)`.
  const HAL_MAP: Array<[string, (a: string[]) => string]> = [
    ['HAL_GPIO_Init',           a => `__hal.GPIO_Init(${a[0]}, ${a[1]})`],
    ['HAL_GPIO_WritePin',       a => `__hal.GPIO_WritePin(${a[0]}, ${a[1]}, ${a[2]})`],
    ['HAL_GPIO_TogglePin',      a => `__hal.GPIO_TogglePin(${a[0]}, ${a[1]})`],
    ['HAL_GPIO_ReadPin',        a => `__hal.GPIO_ReadPin(${a[0]}, ${a[1]})`],
    ['HAL_DelayMs',             a => `__hal.DelayMs(${a[0]})`],
    ['HAL_Delay',               a => `__hal.DelayMs(${a[0]})`],
    ['HAL_PCC_Config',          a => `__hal.PCC_Config(${a[0]})`],
    ['HAL_ADC_GetValue',        a => `__hal.ADC_GetValue(${a[0]})`],
    ['HAL_SPI_Transmit',        a => `__hal.SPI_Transmit(${a[0]}, ${a[1]}, ${a[2]})`],
    ['HAL_I2C_Master_Transmit', a => `__hal.I2C_Master_Transmit(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`],
    ['HAL_UART_Transmit',       a => `__hal.UART_Transmit(${a[0]}, ${a[1]}, ${a[2]})`],
    ['HAL_UART_Init',           a => `__hal.log("UART Init: " + ${JSON.stringify(a[0])})`],
    ['HAL_ADC_Init',            a => `__hal.log("ADC Init: " + ${JSON.stringify(a[0])})`],
    ['HAL_I2C_Init',            a => `__hal.log("I2C Init: " + ${JSON.stringify(a[0])})`],
    ['HAL_TIM_Init',            a => `__hal.TIM_Init(${a[0]}, ${a[1]})`],
    ['HAL_TIM_SetDutyCycle',    a => `__hal.TIM_SetDutyCycle(${a[0]}, ${a[1]}, ${a[2]})`],
    ['ll_gpio_toggle',          a => `__hal.ll_gpio_toggle(${a[0]})`],
    ['LL_GPIO_TOGGLE',          a => `__hal.ll_gpio_toggle(${a[0]})`],
    ['ll_gpio_out_write',       a => `__hal.ll_gpio_out_write(${a[0]}, ${a[1]})`],
    ['LL_GPIO_OUT_WRITE',       a => `__hal.ll_gpio_out_write(${a[0]}, ${a[1]})`],
  ];
  for (const [name, fn] of HAL_MAP) {
    src = replaceCall(src, name, fn);
  }

  // ── Шаг 9: printf → __hal.printf
  src = src.replace(/\bprintf\s*\(/g, '__hal.printf(');

  // ── Шаг 10: указатели volatile uint32_t* — запись
  src = src.replace(
    /\*\s*\(\s*volatile\s+uint(?:8|16|32)_t\s*\*\s*\)\s*(0x[\dA-Fa-f]+|\w+)\s*=/g,
    '__hal.writeU32($1) /*=*/ , __ignoredWrite =',
  );
  // чтение
  src = src.replace(
    /\*\s*\(\s*volatile\s+uint(?:8|16|32)_t\s*\*\s*\)\s*(0x[\dA-Fa-f]+|\w+)/g,
    '__hal.readU32($1)',
  );

  // ── Шаг 11а: прототипы функций → убираем (ДО обработки типов)
  src = src.replace(/^[ \t]*void\s+\w+\s*\([^)]*\)\s*;[ \t]*$/gm, '');
  src = src.replace(/^[ \t]*(?:int|uint\w*)\s+\w+\s*\([^)]*\)\s*;[ \t]*$/gm, '');

  // ── Шаг 11б: объявления функций → JS function (ДО удаления типов!)
  src = src.replace(/\bvoid\s+(\w+)\s*\(\s*\)/g, 'function $1()');
  src = src.replace(/\bvoid\s+(\w+)\s*\(/g, 'function $1(');
  src = src.replace(/\bint\s+main\s*\(\s*(?:void)?\s*\)/g, 'function main()');
  src = src.replace(/\bint\s+(\w+)\s*\(/g, 'function $1(');

  // ── Шаг 11в: for(TYPE var = ...) → for(let var = ...) (ДО удаления типов!)
  const FOR_TYPES = '(?:uint32_t|uint16_t|uint8_t|int32_t|int16_t|int8_t|uint64_t|int64_t|unsigned\\s+int|signed\\s+int|int|char|short|long|float|double)';
  src = src.replace(new RegExp(`\\bfor\\s*\\(\\s*${FOR_TYPES}\\s+(\\w+)\\s*=`, 'g'), 'for (let $1 =');

  // ── Шаг 11г: TYPE var = ...  и  TYPE var; → let var = ... / let var  (ДО удаления типов!)
  // Обрабатываем все целочисленные типы, включая sized (uint8_t…), указатели и массивы.
  const VAR_TYPE = '(?:uint(?:8|16|32|64)_t|int(?:8|16|32|64)_t|unsigned\\s+(?:int|char|short|long)|signed\\s+(?:int|char|short|long)|int|char|short|long|float|double|size_t|bool)';
  const QUAL = '(?:(?:const|static|volatile|register|inline|extern)\\s+)*';

  // pointer: TYPE *var = ...   (один или несколько *)
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s*\\*+\\s*(\\w+)\\s*=`, 'g'), 'let $1 =');
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s*\\*+\\s*(\\w+)\\s*;`, 'g'), 'let $1 = null;');

  // array: TYPE name[N] = {...}  → let name = [...]
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s+(\\w+)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([^}]*)\\}`, 'g'),
    (_m, name, body) => `let ${name} = [${body}]`);
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s+(\\w+)\\s*\\[[^\\]]*\\]\\s*;`, 'g'), 'let $1 = [];');

  // plain: TYPE var = ... ; / TYPE var ;
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s+(\\w+)\\s*=`, 'g'), 'let $1 =');
  src = src.replace(new RegExp(`\\b${QUAL}${VAR_TYPE}\\s+(\\w+)\\s*;`, 'g'), 'let $1;');

  // ── Шаг 12: убираем оставшиеся типы C (всё, что выжило выше — например,
  // типы внутри сложных выражений, приведений, sizeof и т.п.)
  const C_TYPES = [
    'uint32_t', 'uint16_t', 'uint8_t', 'int32_t', 'int16_t', 'int8_t',
    'uint64_t', 'int64_t', 'size_t', 'volatile', 'unsigned', 'signed',
    'int', 'char', 'short', 'long', 'float', 'double',
    'static', 'extern', 'register', 'inline', 'const', 'void',
  ];
  for (const t of C_TYPES) {
    src = src.replace(new RegExp(`\\b${t}\\b\\s*`, 'g'), '');
  }

  // ── Шаг 13: C type struct инициализации: TypeDef var = {0} → let var = __hal.struct()
  // Используем self-vivifying Proxy, чтобы код вида
  // `cfg.FreqMon.OscillatorSystem = …` не упирался в "Cannot set properties of undefined".
  src = src.replace(/\b\w+TypeDef\s+(\w+)\s*=\s*\{[^{}]*\}/g, 'let $1 = __hal.struct()');
  src = src.replace(/\b\w+TypeDef\s+(\w+)\s*=/g, 'let $1 =');
  src = src.replace(/\b\w+TypeDef\s+(\w+)\s*;/g, 'let $1 = __hal.struct();');
  src = src.replace(/\b\w+TypeDef\s+(\w+)\s*,\s*(\w+)\s*;/g,
    'let $1 = __hal.struct(); let $2 = __hal.struct();');
  src = src.replace(/(\w+_t)\s+(\w+)\s*=/g, 'let $2 =');

  // ── Шаг 14: while(1) / for(;;) → while(__steps-- > 0)
  src = src.replace(/\bwhile\s*\(\s*1\s*\)/g, 'while(__steps-- > 0)');
  src = src.replace(/\bfor\s*\(\s*;\s*;\s*\)/g, 'while(__steps-- > 0)');
  src = src.replace(/\bfor\s*\(\s*;\s*1\s*;\s*\)/g, 'while(__steps-- > 0)');

  // ── Шаг 15: убираем & перед именами переменных (оставшиеся)
  src = src.replace(/&(\w)/g, '$1');

  // ── Шаг 16: cast операторы C → убираем
  src = src.replace(/\(\s*\w+\s*\*?\s*\)\s*(?=\w|0x)/g, '');
  // Остаточные приведения вида `(*)msg` или `( *)msg` (после удаления `uint8_t`)
  src = src.replace(/\(\s*\*+\s*\)/g, '');

  // ── Шаг 17: автоматические заглушки для неизвестных ALL_CAPS-идентификаторов
  // (UART_0, UART_WORDLENGTH_8B, I2C_SPEED_FAST, …). Так пользовательский код,
  // ссылающийся на любые HAL-константы, не упирается в "X is not defined".
  const KNOWN_GLOBALS = new Set([
    'NaN', 'Infinity', 'JSON', 'Math', 'Object', 'Array', 'String', 'Number',
    'Boolean', 'RegExp', 'Date', 'Map', 'Set', 'Symbol', 'Error', 'Promise',
    'Function', 'TRUE', 'FALSE', 'NULL',
  ]);
  const declared = new Set<string>();
  // соберём все объявления `let X` / `const X` / `function X` / `var X`
  for (const m of src.matchAll(/\b(?:let|const|var|function)\s+([A-Za-z_]\w*)/g)) {
    declared.add(m[1]);
  }
  // соберём все ALL_CAPS-идентификаторы вне строк
  const used = new Set<string>();
  src.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b([A-Z][A-Z0-9_]{2,})\b/g,
    (_m, str, word) => {
      if (!str && word && !KNOWN_GLOBALS.has(word) && !declared.has(word)) {
        used.add(word);
      }
      return _m;
    });
  const stubs = Array.from(used).map(n => `let ${n}=0;`).join('');

  // ── Шаг 18: размещаем вызов main() и __steps в начале + stdlib-заглушки
  const stdlib = `
    function strlen(s){ return (s == null) ? 0 : String(s).length; }
    function strcpy(dst, src){ return String(src ?? ''); }
    function strncpy(dst, src, n){ return String(src ?? '').slice(0, Number(n) || 0); }
    function strcmp(a, b){ a = String(a ?? ''); b = String(b ?? ''); return a < b ? -1 : a > b ? 1 : 0; }
    function strncmp(a, b, n){ n = Number(n) || 0; return strcmp(String(a ?? '').slice(0, n), String(b ?? '').slice(0, n)); }
    function strcat(a, b){ return String(a ?? '') + String(b ?? ''); }
    function memset(dst, v, n){ return dst; }
    function memcpy(dst, src, n){ return dst; }
    function memcmp(a, b, n){ return 0; }
    function abs(x){ return Math.abs(Number(x) || 0); }
    function sqrt(x){ return Math.sqrt(Number(x) || 0); }
    function pow(a, b){ return Math.pow(Number(a) || 0, Number(b) || 0); }
    function sprintf(buf, fmt){ return String(fmt ?? ''); }
    function snprintf(buf, n, fmt){ return String(fmt ?? '').slice(0, Number(n) || 0); }
    function puts(s){ __hal.printf(String(s ?? '') + "\\n"); }
    function putchar(c){ __hal.printf(typeof c === 'number' ? String.fromCharCode(c) : String(c)); return c; }
  `;
  src = `let __steps = __maxSteps;\nlet __ignoredWrite = 0;\n${stdlib}\n${stubs}\n${src}\nif (typeof main === 'function') main();`;

  return src;
}

// ─── Запуск симуляции ─────────────────────────────────────────

export function runSimulation(
  cCode: string,
  maxLoopIterations = 30,
  inputs: UserInputs = {},
): SimResult {
  const state = makeInitialState();

  try {
    const jsCode = transformC(cCode);
    const hal = buildHAL(state, 2000, inputs);

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      '__hal',
      '__maxSteps',
      `"use strict";\n${jsCode}`,
    );

    fn(hal, maxLoopIterations);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === '__MAX_STEPS__') {
      state.events.push({
        id: state.events.length,
        type: 'warn',
        simTimeMs: state.simTimeMs,
        label: 'Лимит итераций',
        detail: `Достигнут лимит итераций (${maxLoopIterations}). Симуляция остановлена.`,
      });
    } else {
      state.events.push({
        id: state.events.length,
        type: 'error',
        simTimeMs: state.simTimeMs,
        label: 'Ошибка выполнения',
        detail: msg,
      });
      return { state, error: msg };
    }
  }

  return { state };
}

// ─── Хелпер: получить цвет иконки события ────────────────────

export function eventColor(type: SimEventType): string {
  switch (type) {
    case 'clock_enable': return 'text-amber-400';
    case 'pcc_config': return 'text-amber-300';
    case 'gpio_init': return 'text-blue-400';
    case 'gpio_write': return 'text-green-400';
    case 'gpio_toggle': return 'text-teal-400';
    case 'gpio_read': return 'text-cyan-400';
    case 'uart_print': return 'text-purple-400';
    case 'delay': return 'text-orange-400';
    case 'reg_write': return 'text-red-400';
    case 'reg_read': return 'text-rose-300';
    case 'adc_read': return 'text-indigo-400';
    case 'spi_tx': return 'text-fuchsia-400';
    case 'i2c_tx': return 'text-pink-400';
    case 'timer_init': return 'text-sky-400';
    case 'pwm_set': return 'text-lime-400';
    case 'info': return 'text-gray-400';
    case 'warn': return 'text-yellow-400';
    case 'error': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function eventIcon(type: SimEventType): string {
  switch (type) {
    case 'clock_enable': return '⚡';
    case 'pcc_config': return '⚙️';
    case 'gpio_init': return '🔧';
    case 'gpio_write': return '📤';
    case 'gpio_toggle': return '🔄';
    case 'gpio_read': return '📥';
    case 'uart_print': return '💬';
    case 'delay': return '⏱️';
    case 'reg_write': return '✍️';
    case 'reg_read': return '👁️';
    case 'adc_read': return '📊';
    case 'spi_tx': return '🔌';
    case 'i2c_tx': return '🔗';
    case 'timer_init': return '⏰';
    case 'pwm_set': return '〰️';
    case 'warn': return '⚠️';
    case 'error': return '❌';
    default: return 'ℹ️';
  }
}
