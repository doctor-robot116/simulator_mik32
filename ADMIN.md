# ADMIN.md — MIK32 SDK Курс: техническая документация

> Последнее обновление: 21 апреля 2026 г.

---

## 1. Описание проекта

**MIK32 SDK Курс** — браузерное учебное приложение для изучения программирования микроконтроллера MIK32 Амур (RISC-V, МИКРОН, Зеленоград).

Стек: **React 18 + Vite 5 + TypeScript + Tailwind CSS 4 + Lit 3**.

Приложение полностью самодостаточно — вся папка `mik32-course/` содержит все исходники и может быть развёрнута на любом сервере без внешних зависимостей за пределами папки.

---

## 2. Структура папок и файлов

```
mik32-course/
│
├── src/                          ← исходный код React-приложения
│   ├── App.tsx                   ← корневой компонент, маршрутизация (wouter)
│   ├── main.tsx                  ← точка входа Vite
│   ├── index.css                 ← глобальные стили (Tailwind v4 + CSS-переменные)
│   │
│   ├── pages/                    ← страницы (по маршруту)
│   │   ├── home.tsx              ← / — главная (список глав курса)
│   │   ├── chapter.tsx           ← /chapter/:id — страница главы (теория + тест)
│   │   ├── simulator.tsx         ← /simulator — симулятор MIK32 HAL + Logic Analyzer
│   │   ├── diagram-editor.tsx    ← /diagram — визуальный редактор схем (перетаскивание)
│   │   ├── elements.tsx          ← /elements — галерея Wokwi-компонентов
│   │   ├── config-tools.tsx      ← /config-tools — каталог инструментов конфигурирования
│   │   ├── mik32-configurator.tsx← /mik32-configurator — встроенный Web-конфигуратор MIK32V2
│   │   ├── sdk.tsx               ← /sdk — браузер исходников SDK mik32v2-shared
│   │   ├── editor.tsx            ← /editor — редактор контента курса (только для admins)
│   │   ├── admin.tsx             ← /admin — страница входа администратора
│   │   └── not-found.tsx         ← 404-страница
│   │
│   ├── components/               ← переиспользуемые React-компоненты
│   │   ├── layout.tsx            ← шапка + боковое меню (навигация всего приложения)
│   │   ├── code-block.tsx        ← подсветка синтаксиса C/C++ через highlight.js
│   │   ├── admin-login-modal.tsx ← диалог ввода пароля администратора
│   │   └── ui/                   ← shadcn/ui компоненты (радикс-примитивы)
│   │       └── ... (50+ файлов, accordion, button, dialog, tabs, switch, ...)
│   │
│   ├── lib/                      ← бизнес-логика и данные
│   │   ├── config-tools.ts       ← каталог карточек инструментов конфигурирования (CONFIG_TOOLS)
│   │   ├── data.ts               ← учебный контент (15 глав): теория, код, тесты
│   │   ├── data-store.ts         ← localStorage-хранилище для редактора (CRUD глав)
│   │   ├── mik32-sim.ts          ← движок симуляции MIK32 HAL (C → JS интерпретатор)
│   │   ├── component-library.ts  ← определения компонентов для редактора СХЕМ
│   │   ├── element-library.ts    ← каталог Wokwi-элементов для галереи /elements
│   │   ├── diagram-types.ts      ← TypeScript типы для редактора схем
│   │   ├── admin-auth.ts         ← управление сессией администратора
│   │   ├── admin-config.ts       ← пароль администратора (изменить здесь)
│   │   └── utils.ts              ← утилита cn() для tailwind-merge
│   │
│   └── hooks/
│       ├── use-mobile.tsx        ← хук определения мобильного устройства
│       └── use-toast.ts          ← хук уведомлений (toast)
│
├── wokwi-elements/               ← Lit Web Components (wokwi open-source + кастомный MIK32)
│   ├── src/
│   │   ├── index.ts              ← реэкспорт всех элементов (точка входа для Vite-алиаса)
│   │   ├── react-types.ts        ← JSX/TypeScript типы для всех wokwi-тегов
│   │   ├── mik32-amur-element.ts ← КАСТОМНЫЙ элемент <wokwi-mik32-amur> (SVG PCB)
│   │   ├── led-element.ts        ← <wokwi-led>
│   │   ├── pushbutton-element.ts ← <wokwi-pushbutton>
│   │   ├── resistor-element.ts   ← <wokwi-resistor>
│   │   ├── 7segment-element.ts   ← <wokwi-7segment>
│   │   ├── neopixel-element.ts   ← <wokwi-neopixel>
│   │   ├── buzzer-element.ts     ← <wokwi-buzzer>
│   │   └── ... (53 файла, один компонент = один .ts файл)
│   ├── node_modules -> ../node_modules   ← симлинк (Lit резолвится из mik32-course)
│   ├── package.json              ← метаданные wokwi-elements (нужен для tsconfig)
│   ├── tsconfig.json             ← TypeScript конфиг wokwi-elements
│   ├── LICENSE                   ← MIT лицензия
│   └── README.md                 ← оригинальная документация wokwi-elements
│
├── public/
│   ├── favicon.svg
│   └── opengraph.jpg
│
├── index.html                    ← HTML-шаблон Vite
├── vite.config.ts                ← конфигурация сборки
├── tsconfig.json                 ← TypeScript конфиг приложения
├── package.json                  ← зависимости и скрипты
├── pnpm-lock.yaml                ← lock-файл (используется pnpm)
├── components.json               ← конфиг shadcn/ui
└── ADMIN.md                      ← данный документ
```

---

## 3. Маршруты приложения

| URL | Страница | Описание |
|---|---|---|
| `/` | `home.tsx` | Главная: список 15 глав курса |
| `/chapter/:id` | `chapter.tsx` | Глава: теория, примеры кода, тест |
| `/simulator` | `simulator.tsx` | Симулятор MIK32 HAL + Logic Analyzer |
| `/diagram` | `diagram-editor.tsx` | Визуальный редактор схем |
| `/elements` | `elements.tsx` | Галерея Wokwi-компонентов |
| `/config-tools` | `config-tools.tsx` | Каталог инструментов конфигурирования (GPIO-схемы Клиначёва + встроенный конфигуратор) |
| `/mik32-configurator` | `mik32-configurator.tsx` | **Встроенный** Web-конфигуратор всей периферии MIK32V2 → генерация `main.c` |
| `/sdk` | `sdk.tsx` | Браузер исходников официального SDK `mik32v2-shared` (include / periphery / libs / ldscripts / runtime) |
| `/editor` | `editor.tsx` | Редактор контента (только admin) |
| `/admin` | `admin.tsx` | Вход администратора |

---

## 4. Ключевые библиотечные файлы

### `src/lib/data.ts`
Учебный контент курса: 15 глав (GPIO, АЦП, UART, SPI, I2C, DMA, Timer16/32, ...).
Каждая глава содержит: `title`, `description`, `theory[]`, `codeExamples[]`, `quiz[]`.
**Редактировать здесь** чтобы обновить базовый контент (применяется при первом запуске и после сброса в редакторе).

### `src/lib/mik32-sim.ts`
JavaScript-интерпретатор MIK32 HAL: парсит C-код, выполняет `HAL_GPIO_WritePin`, `HAL_GPIO_TogglePin`, `HAL_DelayMs`, `printf`, ADC и т.д. Возвращает массив событий симуляции с временными метками.

### `src/lib/component-library.ts`
Определения компонентов для **редактора схем** (`/diagram`): геометрия (w×h), пины (name, localX, localY), атрибуты (color, value, range). Содержит 13 компонентов: led, button, resistor, buzzer, potentiometer, rgb-led, 7seg, neopixel, ssd1306, servo, ds18b20, 74hc595, lcd1602.

### `src/lib/element-library.ts`
Каталог **Wokwi-элементов** для галереи `/elements`. Содержит метаданные всех 39 элементов (тег, название, категория, описание, кол-во пинов, статус поддержки). Не содержит рендеринга — только справочные данные для интерфейса.

### `src/lib/admin-config.ts`
```typescript
export const ADMIN_PASSWORD = "mik32admin";  // ← изменить пароль здесь
export const ADMIN_SESSION_LIFETIME_MS = 0;   // 0 = только до закрытия вкладки
```

---

## 5. Архитектура wokwi-elements

### Принцип: один файл = один компонент

Каждый Wokwi-элемент — отдельный **Lit Web Component** (`.ts`), зарегистрированный как HTML Custom Element:

```
wokwi-elements/src/
  led-element.ts          → <wokwi-led>
  pushbutton-element.ts   → <wokwi-pushbutton>
  resistor-element.ts     → <wokwi-resistor>
  mik32-amur-element.ts   → <wokwi-mik32-amur>  ← кастомный
  ...
  index.ts                → реэкспортирует все элементы
  react-types.ts          → JSX-типы для TypeScript
```

**Преимущества подхода:**
- Добавление нового компонента = создать один `.ts` файл + добавить строку в `index.ts` и `react-types.ts`
- Нет единого монолитного файла
- Каждый компонент независим, можно удалять/обновлять без риска сломать другие

### Как Vite подключает wokwi-elements

В `vite.config.ts` настроен алиас:
```typescript
"@wokwi/elements": "./wokwi-elements/src/index.ts"
```

Импорт в коде приложения:
```typescript
import "@wokwi/elements";  // регистрирует все custom elements
```

Симлинк `wokwi-elements/node_modules → ../node_modules` позволяет Lit резолвиться из `node_modules` верхнего уровня.

### Кастомный элемент `<wokwi-mik32-amur>`

Файл: `wokwi-elements/src/mik32-amur-element.ts`

Lit Web Component, визуализирующий плату MIK32 Амур:
- SVG PCB с пинами GPIO_0 (левый: P0_0–P0_15), GPIO_1 (правый: P1_0–P1_15), GPIO_2 (нижний: P2_0–P2_7)
- Свойство `ledPower: boolean` — зелёный светодиод питания с glow SVG-фильтром
- Блоки на кристалле: RISC-V 32-bit, SRAM 16K, OTP 256K, SPI×3, I2C×2, UART×2

### Добавление нового компонента в галерею

1. Создать `wokwi-elements/src/my-widget-element.ts`:
```typescript
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("wokwi-my-widget")
export class MyWidgetElement extends LitElement { ... }
```

2. Добавить строку в `wokwi-elements/src/index.ts`:
```typescript
export * from "./my-widget-element.js";
```

3. Добавить JSX-тип в `wokwi-elements/src/react-types.ts`:
```typescript
"wokwi-my-widget": React.DetailedHTMLProps<...>
```

4. Добавить запись в массив `ELEMENTS` в `src/pages/elements.tsx` и в `src/lib/element-library.ts`.

---

## 6. Симулятор HAL (`/simulator`)

Имитирует выполнение MIK32 HAL-кода в браузере.

### Поддерживаемые функции HAL

| Функция | Поведение |
|---|---|
| `HAL_GPIO_WritePin(port, pin, state)` | Устанавливает бит в GPIO-порту |
| `HAL_GPIO_TogglePin(port, pin)` | Инвертирует бит |
| `HAL_GPIO_ReadPin(port, pin)` | Возвращает текущее состояние |
| `HAL_DelayMs(ms)` | Аккумулирует виртуальное время |
| `printf(fmt, ...)` | Выводит в Console-панель |

### Ограничения симулятора

- `while(1)` / `for(;;)` ограничиваются числом итераций из UI (по умолчанию 6)
- Максимум 2000 HAL-вызовов на симуляцию
- `readU32` всегда возвращает 0
- ADC возвращает случайные значения

### Три вкладки нижней панели

| Вкладка | Содержание |
|---|---|
| **Console** | Вывод `printf`/`uart` |
| **Events** | Таблица всех HAL-событий с временными метками |
| **Logic Analyzer** | SVG осциллограммы GPIO-сигналов |

### Logic Analyzer — ключевые константы (`simulator.tsx`)

| Константа | Значение | Описание |
|---|---|---|
| `LA_ROW_H` | 44 | Высота строки одного пина (px) |
| `LA_LABEL_W` | 70 | Ширина колонки с именем пина (px) |
| `LA_HEADER_H` | 24 | Высота заголовка со шкалой времени (px) |
| `LA_WAVE_W` | 920 | Ширина зоны сигналов (px) |

Цветовая кодировка: GPIO_0 = `#4ec9b0`, GPIO_1 = `#9cdcfe`, GPIO_2 = `#dcdcaa`.

---

## 7. Редактор схем (`/diagram`)

Визуальный drag-and-drop редактор принципиальных схем.

### Возможности

- **Перетаскивание** компонентов из библиотеки на SVG-холст
- **Соединение** пинов проводами (L-образная ортогональная маршрутизация)
- **Режимы**: `S` — выбор/перетаскивание, `W` — рисование провода
- **Редактирование свойств** выбранного компонента (цвет, номинал, угол)
- **Генерация C-кода** — скелет HAL-кода по текущей схеме
- **Симуляция** — запуск движка симулятора прямо на холсте

### Компоненты библиотеки схем (из `component-library.ts`)

`led`, `button`, `resistor`, `buzzer`, `potentiometer`, `rgb-led`, `7seg`, `neopixel`, `ssd1306`, `servo`, `ds18b20`, `74hc595`, `lcd1602`

---

## 8. Галерея компонентов (`/elements`)

Интерактивная галерея Wokwi-элементов в стиле [elements.wokwi.com](https://elements.wokwi.com).

### Интерфейс

- **Левая панель** — список 7 компонентов (категории и теги)
- **Центр** — предпросмотр компонента на PCB-фоне (зелёный сетчатый паттерн)
- **Правая панель** — интерактивные Controls (свойства) и описание

### Встроенные компоненты галереи

| Компонент | Тег | Управляемые свойства |
|---|---|---|
| МИК32 Амур | `<wokwi-mik32-amur>` | `ledPower` (switch) |
| Светодиод | `<wokwi-led>` | `color`, `value`, `label` |
| Кнопка | `<wokwi-pushbutton>` | `color`, `label` |
| Резистор | `<wokwi-resistor>` | `value` (номинал) |
| 7-сег. дисплей | `<wokwi-7segment>` | `color`, `digits`, цифра |
| NeoPixel | `<wokwi-neopixel>` | `animation` |
| Зуммер | `<wokwi-buzzer>` | — |

---

## 9. Администрирование контента

### Пароль администратора

```
src/lib/admin-config.ts  →  ADMIN_PASSWORD = "mik32admin"
```

После изменения — пересобрать (`pnpm build`) или перезапустить dev-сервер.

### Доступ к редактору

- Кнопка «Редактор» в шапке заблокирована (иконка замка)
- Ввод пароля открывает сессию (хранится в `sessionStorage`, до закрытия вкладки)
- В режиме admin: кнопка «Выйти» и полный доступ к редактору глав

### Что редактируется в Editor (`/editor`)

| Поле | Описание |
|---|---|
| Заголовок | Название главы |
| Краткое описание | Текст на главной странице |
| Теория | Текст урока (строки ЗАГЛАВНЫМИ = заголовки разделов) |
| Примеры кода | C-код для главы |
| Тест | Вопросы с вариантами ответов |

### Хранение данных

- **Рабочие данные** — `localStorage` браузера (ключ: `mik32-course-data`)
- **Базовые данные** — `src/lib/data.ts` (применяются при первом запуске и после «Сбросить всё»)
- **Экспорт** — кнопка «Экспорт JSON» скачивает `mik32-course-data.json`

---

## 10. Сборка и развёртывание

### Требования

- Node.js v18+ (`node --version`)
- pnpm v8+ (`pnpm --version`)

### Команды

```bash
# Перейти в папку проекта
cd mik32-course

# Установить зависимости
pnpm install

# Режим разработки (hot-reload)
pnpm dev       # http://localhost:5173

# Production-сборка
pnpm build     # создаёт dist/public/

# Предпросмотр собранного
pnpm serve     # http://localhost:4173
```

### Вариант 1 — Vite preview (простой)

```bash
pnpm build
node ./node_modules/vite/bin/vite.js --config vite.config.ts preview --host 0.0.0.0 --port 4173
```

Доступ: `http://<IP_сервера>:4173`

### Вариант 2 — Nginx (рекомендуется для production)

```nginx
server {
    listen 80;
    server_name _;

    root /путь/к/mik32-course/dist/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mik32-course /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### Вариант 3 — systemd сервис

```ini
[Unit]
Description=MIK32 Course Web App
After=network.target

[Service]
Type=simple
WorkingDirectory=/путь/к/mik32-course
ExecStart=/usr/bin/node ./node_modules/vite/bin/vite.js --config vite.config.ts preview --host 0.0.0.0 --port 4173
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable mik32-course
sudo systemctl start mik32-course
```

### Windows

```bat
cd C:\путь\к\mik32-course
pnpm install
pnpm build
node .\node_modules\vite\bin\vite.js --config vite.config.ts preview --host 0.0.0.0 --port 4173
```

Открыть порт в брандмауэре:
```powershell
New-NetFirewallRule -DisplayName "MIK32 Course" -Direction Inbound -Protocol TCP -LocalPort 4173 -Action Allow
```

---

## 11. Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `5173` | Порт dev/preview сервера |
| `BASE_PATH` | `/` | Базовый путь (для размещения не в корне) |

---

## 12. Устранение проблем

| Проблема | Решение |
|---|---|
| Элементы wokwi не рендерятся | Проверить `wokwi-elements/node_modules` — должен быть симлинк на `../node_modules` |
| Ошибки TypeScript в wokwi-elements | Запустить `pnpm typecheck` для диагностики |
| Белый экран после сборки | Убедиться что `BASE_PATH` совпадает с URL-префиксом сервера |
| Порт занят | Установить переменную `PORT=8080 pnpm dev` |
| Данные курса сбились | Кнопка «Сбросить всё» в `/editor` восстанавливает данные из `data.ts` |
| Забыт пароль admin | Изменить `ADMIN_PASSWORD` в `src/lib/admin-config.ts`, пересобрать |

---

## 13. Каталог инструментов конфигурирования (`/config-tools`)

Страница `src/pages/config-tools.tsx` показывает карточки внешних и встроенных инструментов конфигурирования периферии.

### Источник данных
`src/lib/config-tools.ts` — массив `CONFIG_TOOLS: ConfigTool[]`. Поля карточки:

| Поле | Описание |
|---|---|
| `id` | Уникальный идентификатор |
| `mcu` / `vendor` | Название МК и производитель |
| `description` | Краткое описание |
| `externalUrl` | Если URL начинается с `/` — открывается **внутренней** навигацией (Wouter `navigate`); иначе — `window.open` в новой вкладке |
| `localToolPath` | Путь к HTML-инструменту в `public/tools/` для открытия в встроенном iframe-модале |
| `badge`, `available` | Метка (например, «Встроенный») и активность карточки |

### Поведение iframe-модала (для `localToolPath`)
- Перехватывает клики и `postMessage` для применения тёмной темы внутри iframe
- Кнопки: «Открыть в новой вкладке», «На весь экран», «Печать/PDF», «Экспорт HAL» (если инструмент поддерживает `pin-configurator` API)

---

## 14. Встроенный Web-конфигуратор MIK32V2 (`/mik32-configurator`)

Файл: `src/pages/mik32-configurator.tsx` — самостоятельная реализация конфигуратора всей периферии MIK32V2 БЕЗ зависимости от `configurator.mik32.ru`.

### Архитектура страницы

Трёхколоночная вёрстка:
1. **Левая колонка (220 px)** — группы и разделы периферии (PCC, GPIO, WDT, UART, SPI 0/1, I²C 0/1, ADC, TIMER32, RTC, Crypto). Зелёная точка показывает включённые модули.
2. **Центральная колонка** — форма настроек активного раздела (Select / Switch / NumInput / Checkbox).
3. **Правая колонка (540 px)** — живой просмотр сгенерированного `main.c`, обновляется на каждое изменение.

### Хранилище состояния
- Тип `Cfg` — единая структура всей конфигурации.
- LocalStorage ключ: **`mik32cfg:v1`** (версионируется, чтобы при смене схемы можно было увеличить ключ).
- Сохранение автоматическое (`useEffect → saveCfg`).
- Кнопка «Сбросить» возвращает `DEFAULT`.

### Генератор кода (`generateCode(cfg): string`)
Использует **реальные сигнатуры HAL** из `mik32v2-shared`:

| Модуль | Сигнатура |
|---|---|
| PCC | `PCC_InitTypeDef`, `HAL_PCC_Config(&PCC_OscInit)` |
| GPIO | `GPIO_InitTypeDef`, `HAL_GPIO_Init(GPIO_0/1/2, &init)`, `HAL_GPIO_MODE_*`, `HAL_GPIO_PULL_*` |
| UART | `UART_HandleTypeDef`, `HAL_UART_Init(&huart_X)`, `Frame_8bit`, `Parity_None/Even/Odd`, `StopBit_1/2` |
| SPI | `SPI_HandleTypeDef`, `HAL_SPI_Init`, `SPI_PHASE_FIRST/SECOND`, `SPI_POLARITY_LOW/HIGH`, `SPI_BAUDRATE_DIVN` |
| I²C | `I2C_HandleTypeDef`, `HAL_I2C_Init`, `I2C_ADDRESSINGMODE_7BIT` |
| ADC | `ADC_HandleTypeDef.Instance = ANALOG_REG`, `ADC_CHANNEL{N}`, `ADC_EXTREF_ON/OFF` |
| TIMER32 | `TIMER32_HandleTypeDef`, `HAL_Timer32_Init`, `TIMER32_SOURCE_PRESCALER`, `TIMER32_COUNTMODE_FORWARD` |
| RTC / WDT | базовые `HAL_RTC_Init` / `HAL_WDT_Init` со значениями по умолчанию |

GPIO группируется **по портам и одинаковому Mode|Pull** — один `HAL_GPIO_Init` на группу пинов (как в `mik32v2-shared/libs/uart_lib.c`).

### Кнопки экспорта
| Кнопка | Действие |
|---|---|
| Сбросить | Сбросить всю конфигурацию к `DEFAULT` (с подтверждением) |
| Копировать main.c | `navigator.clipboard.writeText(code)` + toast |
| Скачать main.c | Blob → `<a download="main.c">` |

### Как добавить новую периферию
1. Расширить интерфейс `Cfg` новым полем (например, `dma: { enabled: boolean; channel: number }`).
2. Добавить значение в `DEFAULT`.
3. Добавить запись в массив `SECTIONS` (id, group, label, icon).
4. Добавить case в `isSectionEnabled` и в switch внутри `SectionForm`.
5. Написать функциональный компонент формы (`DmaForm`), используя помощники `Field`, `NumInput`, `ToggleOnly`.
6. Добавить блок генерации кода в `generateCode(cfg)`.

---

## 15. Браузер исходников SDK (`/sdk`)

Файл: `src/pages/sdk.tsx` — навигатор по копии официального **MIK32V2 SDK** (`mik32v2-shared`), скопированной в `public/sdk/` (~308 KB).

### Структура `public/sdk/`
```
public/sdk/
├── include/        ← регистровые описания (CMSIS-style)
├── periphery/      ← заголовки HAL (gpio.h, pcc.h, usart.h, spi.h, i2c.h, ...)
├── libs/           ← реализации HAL и low-level библиотек (.c)
├── ldscripts/      ← скрипты компоновщика для разных образов памяти
└── runtime/        ← startup/runtime (crt0.S и т.п.)
```

### Возможности страницы
- Дерево навигации с раскрытием каталогов
- Просмотр содержимого выбранного файла с подсветкой
- Поиск по именам файлов
- Кнопка скачивания текущего файла

### Обновление SDK
При выпуске новой версии `mik32v2-shared`:
1. Скопировать поверх содержимое в `public/sdk/`.
2. Если изменились HAL-сигнатуры — обновить генератор `mik32-configurator.tsx → generateCode(cfg)` соответственно.
3. Обновить шаблоны экспорта в `public/tools/pin-configurator.html` (HAL_GPIO export).

---

## 16. Универсальный движок Pin-Configurator (`public/tools/pin-configurator.html`)

JSON-управляемый конфигуратор распиновки в виде статической HTML-страницы (без сборки), встраивается в `/config-tools` через iframe-модал.

### Источники данных
- JSON-описания МК: `data/k1948vk018.json` (К1948ВК018/015 — АО «Микрон», LQFP-64), и т.п.
- Каждый JSON описывает: вендора, корпус, габариты SVG, массив пинов с их альтернативными функциями.

### Возможности
- SVG-рендер корпуса (QFP / LQFP) с интерактивными ножками
- Сохранение назначений в localStorage (ключ зависит от ID МК)
- Тёмная тема через `postMessage({ type: 'theme', value: 'dark' })`
- Печать / PDF
- **Экспорт HAL** — генерирует `HAL_GPIO_Init` грубо в формате `mik32v2-shared`, группируя пины по портам GPIO_0/1/2

---

## 17. Атрибуция и лицензии встроенных материалов

| Материал | Источник | Статус |
|---|---|---|
| GPIO-схемы К1986ВЕ92QI / К1921ВК01Т / 1986ВЕ8Т / К1948ВК018-015 | © Олег Клиначёв (klinachev.com) | Встроены с указанием авторства; ссылка в карточке инструмента |
| `mik32v2-shared` SDK (заголовки, libs, ldscripts, runtime) | АО «Микрон», открытый репозиторий | Скопирован в `public/sdk/`; используется для генерации main.c |
| Wokwi-elements | Wokwi (MIT) | Подкаталог `wokwi-elements/`, MIT-лицензия сохранена |
| Кастомные элементы (`<wokwi-mik32-amur>`, K1948VK*) | Этот проект | — |


---

## §18. Симулятор + редактор схем — питание МК, события и связка инструментов
*(добавлено 2026-04-22, после правок симулятора)*

### 18.1 Что значит «МК запитан»
В реальной отладке MIK32V2 контроллер «оживает» только после двух вещей:

1. На плату подаётся питание (3.3 В), горит зелёный LED `PWR`.
2. Прошивка вызывает **`HAL_PCC_Config(...)`** или хотя бы один
   **`__HAL_PCC_<periph>_CLK_ENABLE()`** — иначе AHB/APB-шины тактирования
   отключены и любые регистры периферии возвращают 0xDEADBEEF / висят.

Симулятор повторяет ту же модель: если в коде нет ни одного
`__HAL_PCC_*_CLK_ENABLE` и нет `HAL_PCC_Config(...)`, то **в правом верхнем углу**
горит красный индикатор `○ PWR OFF`. Как только встречается такой вызов —
индикатор переключается в зелёный `⚡ PWR · OSC32M` (или другой источник).

> **Самая частая ошибка новичков** — забыть `__HAL_PCC_GPIO_0_CLK_ENABLE()`
> перед `HAL_GPIO_Init(...)`. На реальной плате LED просто не загорится,
> в симуляторе — вы это увидите по индикатору и отсутствию событий
> `gpio_init` / `gpio_write` в правой панели «События».

### 18.2 Жизненный цикл события в симуляторе
```
исходный C-код
   │
   ▼   transformC()           убирает #include, комментарии,
   │                          C-суффиксы (1u → 1, 0xFFul → 0xFF),
   │                          приводит { } к JS-блокам
   ▼
JS-функция в new Function(HAL, ...)
   │
   ▼   HAL.* при вызове добавляет SimEvent в state.events
   │   (clock_enable, pcc_config, gpio_init, gpio_write,
   │    gpio_toggle, uart_print, i2c_tx, spi_tx, tim_init…)
   ▼
правая панель «События»  ←  пользователь шагает ◀ ▶
   │
   ▼   replayGPIO(result, evIdx)  — детерминированно
   │                              восстанавливает состояние
   ▼   GPIO/UART/PWR/CLK на момент события N
SVG-схема + UART-консоль + индикатор питания
```

### 18.3 Исправленные баги симулятора (этот патч)
| Что было | Как стало |
|---------|----------|
| `1u`, `0x10ul`, `100UL` ломали `new Function(...)` (синтакс. ошибка) | `transformC` снимает суффиксы `[uU][lL]{0,2}` и `[lL]{1,2}[uU]?` до парсинга |
| Вход с `pull-up` сразу читался как `0` (низкий) | `GPIO_Init` ставит `value=true` для входа с подтяжкой к +V; `false` — для подтяжки к земле |
| `I2C_Master_Transmit` возвращал `undefined`, поэтому сцена «I2C-сканер» всегда находила 0 устройств | Возвращает `HAL_OK (0)` для адресов из набора `{0x27, 0x3C, 0x50, 0x68}` (LCD/OLED/EEPROM/RTC), иначе `HAL_ERROR (1)` |
| `printf("%02X", x)` печатал «12» вместо «0C» | Переписан парсер формата: `%[-+0 #]?[width]?(.[prec])?[hl]?[diuoxXeEfFgGscp%]` со штатным выравниванием/нулями |
| Не было видно, инициализировано ли тактирование | В topbar симулятора: бейдж `⚡ PWR · <источник>` / `○ PWR OFF`, всплывающая подсказка с диагнозом |
| Непонятно, как вообще пользоваться симулятором | Кнопка «? Помощь» открывает встроенную панель с пояснением модели событий и сцены/код-флоу |

### 18.4 Связка «Редактор схем → Симулятор»
В правом верхнем углу `/diagram-editor` теперь стоит **зелёная** кнопка
**«▶ Открыть в симуляторе»**. Она:

1. Записывает текущий **сгенерированный код** (`generatedCode`) в
   `sessionStorage['mik32_sim_code']`.
2. Записывает источник (`sessionStorage['mik32_sim_source'] = 'diagram-editor'`)
   — на будущее, чтобы симулятор мог показать «← вернуться в редактор».
3. Делает Wouter-навигацию на `/simulator`.

Симулятор при старте читает `mik32_sim_code` (см. `simulator.tsx`,
`useState(() => { ... sessionStorage.getItem('mik32_sim_code') ... })`),
сразу удаляет ключ (одноразовая передача) и подставляет код в редактор.
Дальше пользователь жмёт `▶ Запустить` — и видит ту же логику, что описала схема.

### 18.5 Рекомендуемый учебный workflow
1. **`/diagram-editor`** — собрать схему (МК + LED + кнопка/I2C/UART…).
2. Нажать **«Сгенерировать код»** в правой панели. Появится HAL-каркас.
3. Нажать **«▶ Открыть в симуляторе»**.
4. В **`/simulator`** проверить:
   * горит ли `⚡ PWR · OSC32M` (если нет — забыли тактирование);
   * есть ли в правой панели событие `gpio_init` для нужного пина;
   * пошагово ◀ ▶ убедиться, что LED меняет состояние.
5. **Скопировать код** кнопкой `📋 Копировать` в редакторе и:
   * перенести в **`/mik32-configurator`** (`Скачать .c` / `Скачать .zip`),
     либо
   * вставить в локальный проект `mik32v2-shared` (см. §14) и собрать
     `mik32-uploader`-ом на реальной плате.

### 18.6 Что симулятор не делает (намеренно)
* Не выполняет настоящие RISC-V инструкции (нет регистров `x0..x31`, нет
  CSR, нет таймингов в тактах).
* Не проверяет корректность схемы (LED без резистора пройдёт).
* Не моделирует прерывания и DMA — есть только последовательный поток
  событий.
* Не учитывает реальные задержки — `HAL_Delay(ms)` только инкрементирует
  виртуальный `simTimeMs` и тратит один шаг.

Для тайминг-критичного кода (PWM, UART baud, I²C clock-stretching) проверяйте
на реальной плате через `mik32-uploader`.

---

## 19. Раздел `/baremetal` — SDK без HAL (rabidrabbit/mik32-amur-simple)

В проект интегрирован альтернативный baremetal-SDK для MIK32 Amur от
**rabidrabbit** (gitflic: `rabidrabbit/mik32-amur-simple`). Это набор
~30 примеров без HAL — прямая работа с регистрами через заголовки
`mik32_hwlibs/` и тонкую обвязку `libbaremetal/`. Полезен, когда нужно
понять, что именно делает HAL, или выжать максимум скорости/памяти.

### 19.1 Что добавлено
* `public/baremetal/` — копия всего дерева `MIK32_AMUR_simple/`
  (≈6.1 МБ, 420 файлов): `ex_*` примеры (adc, i2c, spi_dma, mfrc522,
  encoder, crypto, timer, scmRTOS, loaders), `mik32_hwlibs/`,
  `libbaremetal/`, `ld_scripts/`, `devices/`, `tools/`.
* `public/baremetal/manifest.json` — индекс из 373 текстовых файлов,
  сгруппированных по 39 категориям (генерируется Node-скриптом по
  дереву каталогов).
* `src/pages/baremetal.tsx` — страница-браузер по образцу `/sdk`:
  раскрывающееся дерево групп, поиск-фильтр, просмотр кода
  (`<pre>`-вьюер), кнопка скачивания файла.
* Маршрут `/baremetal` зарегистрирован в `src/App.tsx`; ссылка с
  иконкой `Cpu` добавлена в боковое меню (`src/components/layout.tsx`).

### 19.2 Как обновлять
Если апстрим `MIK32_AMUR_simple/` обновится:
1. Заменить содержимое `mik32-course/public/baremetal/` свежей копией
   (без `.git/`, `build/`, `*.o`, `*.elf`).
2. Перегенерировать `manifest.json` тем же Node-скриптом (обходит дерево,
   группирует по верхнему каталогу, фильтрует бинарники).
3. Перезапустить `Start application`.

### 19.3 Соотношение с `/sdk`
* `/sdk` — официальный HAL-SDK от Микрона (`mik32-amur` HAL).
* `/baremetal` — неофициальный SDK без HAL от rabidrabbit, для
  низкоуровневого изучения периферии и регистров.

Обе страницы используют одинаковый паттерн (manifest + group tree +
viewer), поэтому правки в одной легко переносить в другую.

---

## 20. Раздел `/compare` — HAL vs Baremetal бок о бок

Страница для прямого сравнения одного и того же модуля периферии в двух
исполнениях: слева HAL из `/sdk`, справа baremetal-пример из `/baremetal`.

### 20.1 Что добавлено
* `src/pages/compare.tsx` — две колонки кода с переключателем модулей
  сверху. Файлы грузятся прямо из `public/sdk/` и `public/baremetal/` тем
  же `fetch + basePath()`, что и существующие страницы.
* Маршрут `/compare` зарегистрирован в `src/App.tsx`.
* Ссылка с иконкой `GitCompareArrows` добавлена в боковое меню
  (`src/components/layout.tsx`) сразу после «Bare-metal SDK».

### 20.2 Список пар (`PAIRS` в `compare.tsx`)
| Модуль | HAL (`/sdk`)               | Baremetal (`/baremetal`)        |
|--------|----------------------------|---------------------------------|
| GPIO   | `periphery/gpio.h`         | `ex_base/main.c`                |
| UART   | `libs/uart_lib.c`          | `ex_base_3/main.c`              |
| ADC    | `periphery/analog_reg.h`   | `ex_adc/main.c`                 |
| DAC    | `periphery/analog_reg.h`   | `ex_dac/main.c`                 |
| I²C    | `periphery/i2c.h`          | `ex_i2c/main.c`                 |
| SPI    | `libs/spi_lib.c`           | `ex_spi_dma/main.c`             |
| Timer  | `periphery/timer32.h`      | `ex_timer/main.c`               |
| CRC    | `periphery/crc.h`          | `ex_crc/main.c`                 |
| Crypto | `periphery/crypto.h`       | `ex_crypto/main.c`              |

### 20.3 Как добавить новую пару
1. Положить нужные файлы в `public/sdk/...` и `public/baremetal/...`
   (если их там ещё нет).
2. Добавить запись в массив `PAIRS` в `src/pages/compare.tsx` —
   `id`, `title`, короткое объяснение `blurb`, и пути `hal`/`bare`.
3. Готово — кнопка-переключатель появится сама.

Цвет рамки колонки: HAL — изумрудный, baremetal — янтарный, чтобы их
нельзя было перепутать с первого взгляда.
