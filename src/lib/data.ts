export interface ChapterCode {
  title: string;
  code: string;
}

export interface Chapter {
  id: string;
  title: string;
  shortDescription: string;
  theory: string;
  codes: ChapterCode[];
  keyFunctions: string[];
}

export const chapters: Chapter[] = [
  {
    id: "1-intro",
    title: "Введение в MIK32 Амур",
    shortDescription: "Архитектура RISC-V микроконтроллера К1948ВК018, отладочная плата DIP-MIK32-V4, среды разработки, подсистема тактирования и карта памяти.",
    theory: `Микроконтроллер MIK32 Амур (К1948ВК018, К1948ВК015) — отечественный 32-битный микроконтроллер производства АО «Микрон» (Зеленоград), разработанный для применения в устройствах промышленного Интернета вещей (IIoT). Микросхема использует открытую архитектуру RISC-V и реализована в 64-выводном корпусе QFN.

ПРОЦЕССОРНОЕ ЯДРО SCR1
Ядро SCR1 — разработка компании Syntacore (Россия) на базе открытой ISA RISC-V. Реализована конфигурация RV32IMC:
  • RV32I — базовый 32-битный целочисленный набор инструкций; 32 регистра общего назначения (x0–x31) по 32 бита каждый; 32-битное адресное пространство.
  • Расширение «M» — аппаратные операции целочисленного умножения и деления (MUL, DIV, REM).
  • Расширение «C» — сжатые 16-битные инструкции (Compressed), уменьшающие размер кода программы.
  • Трёхстадийный конвейер: выборка (IF), декодирование (ID), исполнение (EX).
  • Поддержка отладки через JTAG (IEEE Std 1149.1-2013), совместимость со стандартом RISC-V External Debug Support Spec v0.13.2. Поддерживаются: Reset, Halt/Resume/Step, доступ к GPR, CSR, MEM, аппаратные точки останова (HW Breakpoint/Watchpoint).
  • Встроенный контроллер прерываний EPIC поддерживает до 32 маскируемых прерываний от периферии.

ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ
  • Максимальная рабочая частота: 32 МГц
  • Внутренняя RAM: 16 КБ
  • Встроенная EEPROM: 8 КБ (64 страницы × 32 слова × 32 бит)
  • Однократно программируемая память OTP: 256 бит
  • Внешняя Flash через SPIFI: до 2 ГБ (SPI Single/Dual/Quad, прямой доступ XIP + 1 КБ кэш)
  • Напряжение питания основного домена: 2,97–3,63 В
  • Напряжение питания батарейного домена: 2,5–3,63 В
  • Динамический ток потребления: до 50 мА (активный режим, 32 МГц)
  • Диапазон рабочих температур: −45 … +85 °C

ПОДСИСТЕМА ТАКТИРОВАНИЯ
MIK32 имеет четыре независимых источника тактирования:
  1. OSC32M — генератор с внешним кварцевым резонатором до 32 МГц (основной источник системной частоты)
  2. OSC32K — генератор с внешним часовым резонатором 32768 Гц (для RTC)
  3. HSI32M — встроенный RC-генератор 32 МГц с калибровкой (регистр HSI32MCalibrationValue)
  4. LSI32K — встроенный RC-генератор 32 кГц с калибровкой (регистр LSI32KCalibrationValue)

Модуль PCC (Power Control and Clock) управляет:
  • Выбором и переключением источника системной частоты;
  • Делителями шин: AHBDivider, APBMDivider (APB_M), APBPDivider (APB_P);
  • Включением/отключением тактирования отдельных периферийных блоков;
  • Монитором частоты с автоматическим переключением на резервный источник.

КАРТА ПАМЯТИ
  Адрес             Устройство
  ─────────────────────────────────────────
  0x00000000        Загрузочная область (зависит от Boot0/Boot1)
  0x01000000        Внутренняя EEPROM (8 КБ)
  0x02000000        Внутренняя SRAM (16 КБ)
  0x00040000        Коммутационная матрица AHB (DMA, CRC, Crypto)
  0x00050000        APB_M (PM, WDT_BUS, OTP, PVD)
  0x00060000        Батарейный домен (WU, RTC, BOOT_MANAGER)
  0x00070000        Подсистема памяти (SPIFI_CONFIG, EEPROM_REGS)
  0x00080000        AHB_P (CRYPTO, CRC32)
  0x00081000        APB_P (WDT, UART0/1, TIMER16_0/1/2, TIMER32_1/2, SPI0/1, I2C0/1, GPIO0/1/2)
  0x80000000        Внешняя память через SPIFI (до 2 ГБ)

РЕЖИМЫ ЗАГРУЗКИ (BOOT)
Режим загрузки определяется состоянием выводов Boot0 и Boot1 при подаче питания:
  Boot0=0, Boot1=0 → загрузка из внутренней EEPROM (адрес 0x01000000 отображается на 0x00000000)
  Boot0=0, Boot1=1 → загрузка из внешней Flash через SPIFI
  Boot0=1, Boot1=0 → загрузка из системного ОЗУ (RAM)
На плате DIP-MIK32-V4 выводы Boot0 и Boot1 выведены на специальный разъём для выбора режима загрузки.

ОТЛАДОЧНАЯ ПЛАТА DIP-MIK32-V4
Плата DIP-MIK32-V4 — сменный микроконтроллерный модуль форм-фактора DIP, предназначенный для прототипирования, обучения и быстрого выпуска устройств на базе MIK32 Амур. В состав платы входят:
  • Микроконтроллер MIK32 Амур (К1948ВК018) в корпусе QFN-64
  • Кварцевый резонатор 32 МГц (для OSC32M)
  • Кварцевый резонатор 32768 Гц (для OSC32K / RTC)
  • Разъём JTAG (10-контактный) для подключения внешнего отладчика/программатора
  • Разъём выбора режима загрузки (Boot0/Boot1)
  • Два пользовательских светодиода: LED1 на порту P0_3 (GPIO_0, PIN_3), LED2 на порту P1_3 (GPIO_1, PIN_3)
  • Кнопка RESET (сброс)
  • Пользовательская кнопка
  • Тестовые точки, включая VPROG для программирования OTP-памяти
  • Светодиод-индикатор питания

Для подключения отладчика рекомендуются программаторы на базе FT2232: Olimex ARM-USB-OCD-H, Olimex ARM-USB-OCD, ELJTAG (MikronLink).

СРЕДЫ РАЗРАБОТКИ
1. MIK32 IDE v1.2.2 — специализированная IDE на базе Eclipse, поставляемая АО Микрон:
   • Встроенные конфигурации сборки: Debug EEPROM, Debug RAM, Debug Flash
   • Встроенная поддержка OpenOCD для загрузки и отладки
   • Шаблоны проектов (template-c-project, template-c-project-shared)
   • Набор примеров в каталоге examples/

2. PlatformIO + VS Code — универсальная среда с поддержкой цепочки компиляторов RISC-V GCC:
   • Настройка в файле platformio.ini: platform = riscv, framework = mik32
   • Поддержка загрузки через OpenOCD и отладки через GDB
   • Автоматическая подтяжка SDK и HAL библиотек

ПОДСИСТЕМА ПИТАНИЯ И РЕЖИМЫ ЭНЕРГОПОТРЕБЛЕНИЯ
  Режим              Источник    Частота CPU   Потребление
  ────────────────────────────────────────────────────────
  Активный           OSC32M      32 МГц        12,5–15 мА
  Пониженный         LSI32K      125 кГц       1,5–1,8 мА
  Спящий (Sleep)     LSI32K      125 кГц       1,5–1,8 мА
  Стоп (Stop)        OSC32M      125 кГц       2,0–2,4 мА`,
    codes: [
      {
        title: "SystemClock_Config — настройка тактирования от OSC32M",
        code: `#include "mik32_hal_pcc.h"

/*
 * Стандартная конфигурация тактирования для платы DIP-MIK32-V4:
 * Системная частота — внешний кварц OSC32M (32 МГц)
 * Делители AHB, APB_M, APB_P = 0 (деление на 1, максимальная частота)
 * Мониторинг частоты — LSI32K (внутренний 32 кГц резонатор)
 */
void SystemClock_Config(void)
{
    PCC_InitTypeDef PCC_OscInit = {0};

    /* Включить все источники тактирования */
    PCC_OscInit.OscillatorEnable = PCC_OSCILLATORTYPE_ALL;

    /* Системная частота — от внешнего кварца 32 МГц */
    PCC_OscInit.FreqMon.OscillatorSystem = PCC_OSCILLATORTYPE_OSC32M;

    /* Режим монитора: не фиксированный источник (может переключаться) */
    PCC_OscInit.FreqMon.ForceOscSys = PCC_FORCE_OSC_SYS_UNFIXED;

    /* Источник 32K для монитора частоты — OSC32K (внешний кварц 32768 Гц) */
    PCC_OscInit.FreqMon.Force32KClk = PCC_FREQ_MONITOR_SOURCE_OSC32K;

    /* Делители шин: 0 = делить на 1 (максимальная скорость) */
    PCC_OscInit.AHBDivider  = 0;   /* f_AHB  = 32 МГц */
    PCC_OscInit.APBMDivider = 0;   /* f_APB_M = 32 МГц */
    PCC_OscInit.APBPDivider = 0;   /* f_APB_P = 32 МГц */

    /* Калибровочные значения RC-генераторов */
    PCC_OscInit.HSI32MCalibrationValue = 128; /* ~32 МГц */
    PCC_OscInit.LSI32KCalibrationValue = 8;   /* ~32 кГц */

    /* Источник тактирования RTC: автовыбор */
    PCC_OscInit.RTCClockSelection    = PCC_RTC_CLOCK_SOURCE_AUTO;
    PCC_OscInit.RTCClockCPUSelection = PCC_CPU_RTC_CLOCK_SOURCE_OSC32K;

    HAL_PCC_Config(&PCC_OscInit);
}`
      },
      {
        title: "Минимальный проект — мигание светодиодами на DIP-MIK32-V4",
        code: `/*
 * Мигание светодиодами LED1 (P0_3) и LED2 (P1_3)
 * Отладочная плата DIP-MIK32-V4
 *
 * Светодиоды подключены к портам GPIO_0 (пин 3) и GPIO_1 (пин 3).
 * Период мигания: 500 мс (на частоте 32 МГц).
 */
#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"

void SystemClock_Config(void);
void GPIO_Init(void);

int main(void)
{
    SystemClock_Config();
    GPIO_Init();

    while (1)
    {
        HAL_GPIO_TogglePin(GPIO_0, GPIO_PIN_3);  /* LED1 */
        HAL_GPIO_TogglePin(GPIO_1, GPIO_PIN_3);  /* LED2 */
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

    /* Включение тактирования GPIO_0 и GPIO_1 */
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_1_CLK_ENABLE();

    /* Настройка пина 3 в обоих портах как выход без подтяжки */
    GPIO_InitStruct.Pin  = GPIO_PIN_3;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);
    HAL_GPIO_Init(GPIO_1, &GPIO_InitStruct);
}`
      }
    ],
    keyFunctions: ["HAL_PCC_Config()", "HAL_GPIO_Init()", "HAL_GPIO_TogglePin()", "HAL_DelayMs()", "__HAL_PCC_GPIO_x_CLK_ENABLE()"]
  },
  {
    id: "2-gpio",
    title: "GPIO — Порт ввода/вывода общего назначения",
    shortDescription: "Архитектура GPIO, контроллер PAD_CONFIG, режимы работы, подтяжки, прерывания, HAL и LL уровни программирования. Практические примеры для платы DIP-MIK32-V4.",
    theory: `Модуль порта ввода/вывода общего назначения (GPIO) микроконтроллера MIK32 предоставляет программный интерфейс для управления цифровыми выводами микросхемы. Понимание структуры GPIO — фундамент для работы с любой периферией МК.

АРХИТЕКТУРА GPIO В MIK32
MIK32 содержит три порта GPIO, адресованных в пространстве APB_P:
  • GPIO_0 — 16 выводов (P0_0 … P0_15), базовый адрес APB_P + 0x3000
  • GPIO_1 — 16 выводов (P1_0 … P1_15), базовый адрес APB_P + 0x3400
  • GPIO_2 — 8 выводов (P2_0 … P2_7), базовый адрес APB_P + 0x3800
Итого: 40 пользовательских выводов общего назначения.

Каждый порт имеет следующие 32-битные регистры:
  • OUTPUT      — регистр управления выходным уровнем (чтение/запись)
  • DIRECTION_OUT — направление: 1 = выход, 0 = вход (для каждого бита)
  • INPUT        — регистр чтения входного состояния выводов (только чтение)
  • SET          — атомарная установка битов (запись «1» устанавливает соответствующий вывод в HIGH)
  • CLEAR        — атомарная сброс битов (запись «1» устанавливает вывод в LOW)

КОНТРОЛЛЕР ВЫВОДОВ PAD_CONFIG
Каждый физический вывод микроконтроллера является мультиплексированным: он может работать как GPIO или как выход/вход одного из периферийных интерфейсов (UART, SPI, I2C, Timer, АЦП и т.д.). Выбор функции вывода и его электрических параметров осуществляется через контроллер PAD_CONFIG.

Для каждого вывода выделено 4 бита конфигурации в регистрах PORT_x_CFG:
  Биты [1:0] — функция вывода (MODE):
    00 — GPIO режим (GPIO_OUTPUT или GPIO_INPUT)
    01 — последовательный интерфейс (SERIAL: UART/SPI/I2C)
    10 — таймер или последовательный интерфейс (TIMER_SERIAL)
    11 — аналоговый режим (ANALOG: АЦП, ЦАП)
  Бит [2] — подтяжка (PULL):
    00 — без подтяжки (PULL_NONE)
    01 — подтяжка к питанию VDD (PULL_UP), внутренний резистор
    10 — подтяжка к земле GND (PULL_DOWN)
  Бит [3] — нагрузочная способность (Drive Strength, DS):
    00 — 2 мА
    01 — 4 мА
    10 — 8 мА

Важно: тактирование PAD_CONFIG необходимо включить отдельно через __HAL_PCC_PAD_CONFIG_CLK_ENABLE(). HAL_GPIO_Init делает это автоматически.

ВКЛЮЧЕНИЕ ТАКТИРОВАНИЯ GPIO
Перед использованием каждого порта GPIO необходимо включить его тактирование через модуль PCC:
  __HAL_PCC_GPIO_0_CLK_ENABLE();  // Включить тактирование GPIO_0
  __HAL_PCC_GPIO_1_CLK_ENABLE();  // Включить тактирование GPIO_1
  __HAL_PCC_GPIO_2_CLK_ENABLE();  // Включить тактирование GPIO_2
  __HAL_PCC_GPIO_IRQ_CLK_ENABLE(); // Включить тактирование модуля прерываний GPIO

Без включения тактирования записи в регистры GPIO не будут иметь эффекта — это классическая ошибка начинающих.

РЕЖИМЫ РАБОТЫ (HAL_GPIO_ModeTypeDef)
  HAL_GPIO_MODE_GPIO_INPUT  (0b100) — цифровой вход (GPIO)
  HAL_GPIO_MODE_GPIO_OUTPUT (0b000) — цифровой выход (GPIO)
  HAL_GPIO_MODE_SERIAL      (0b01)  — выход/вход периферийного интерфейса
  HAL_GPIO_MODE_TIMER_SERIAL(0b10)  — таймер или последовательный интерфейс
  HAL_GPIO_MODE_ANALOG      (0b11)  — аналоговый режим (АЦП/ЦАП)

ПОДТЯЖКИ (HAL_GPIO_PullTypeDef)
  HAL_GPIO_PULL_NONE (0b00) — без подтяжки
  HAL_GPIO_PULL_UP   (0b01) — подтяжка к питанию (Pull-up, ~50 кОм)
  HAL_GPIO_PULL_DOWN (0b10) — подтяжка к земле (Pull-down, ~50 кОм)
Подтяжки используются для обеспечения стабильного логического уровня на входах при отсутствии активного сигнала (например, для кнопок).

НАГРУЗОЧНАЯ СПОСОБНОСТЬ (HAL_GPIO_DSTypeDef)
  HAL_GPIO_DS_2MA — 2 мА (по умолчанию, для большинства применений)
  HAL_GPIO_DS_4MA — 4 мА
  HAL_GPIO_DS_8MA — 8 мА (для выходов с повышенной нагрузкой)

HAL ФУНКЦИИ GPIO
  HAL_GPIO_Init(GPIOx, &GPIO_InitStruct)          — инициализация вывода(ов)
  HAL_GPIO_WritePin(GPIOx, GPIO_PINx, state)       — установить уровень (GPIO_PIN_HIGH / GPIO_PIN_LOW)
  HAL_GPIO_ReadPin(GPIOx, GPIO_PINx)               — считать состояние входа
  HAL_GPIO_TogglePin(GPIOx, GPIO_PINx)             — инвертировать состояние выхода
  HAL_GPIO_InitInterruptLine(mux, mode)             — настроить линию прерывания GPIO
  HAL_GPIO_LineInterruptState(line)                 — получить флаг прерывания
  HAL_GPIO_ClearInterrupts()                        — сбросить флаги прерываний GPIO

LL (Low Level) ФУНКЦИИ GPIO
Библиотека LL работает непосредственно с регистрами и не требует структуры инициализации:
  ll_gpio_out_write(pin_mask, value)  — установить значение вывода через маску
  ll_gpio_toggle(pin_mask)            — инвертировать вывод через маску
  LL_GPIO_TOGGLE(pin)                 — макрос инвертирования (объявлен через P1_3, P0_3 и т.д.)
  LL_GPIO_OUT_WRITE(pin, val)         — макрос установки уровня

ПРЕРЫВАНИЯ GPIO (GPIO_IRQ)
MIK32 имеет модуль внешних прерываний GPIO, обеспечивающий до 8 независимых линий прерывания. Каждая линия может быть назначена на любой вывод любого порта через мультиплексор GPIO_MUX.

Режимы срабатывания прерывания (HAL_GPIO_InterruptMode):
  GPIO_INT_MODE_RISING     — по нарастающему фронту
  GPIO_INT_MODE_FALLING    — по спадающему фронту
  GPIO_INT_MODE_ANY_EDGE   — по любому фронту (нарастающему или спадающему)
  GPIO_INT_MODE_HIGH_LEVEL — по высокому уровню
  GPIO_INT_MODE_LOW_LEVEL  — по низкому уровню

Алгоритм настройки прерываний:
  1. Включить тактирование GPIO_IRQ: __HAL_PCC_GPIO_IRQ_CLK_ENABLE()
  2. Настроить вывод как цифровой вход: HAL_GPIO_Init(...)
  3. Назначить вывод на линию прерывания: HAL_GPIO_InitInterruptLine(GPIO_MUX_PORTx_y_LINE_z, mode)
  4. Включить прерывание в EPIC: HAL_EPIC_MaskLevelSet(HAL_EPIC_GPIO_IRQ_MASK)
  5. Разрешить глобальные прерывания: HAL_IRQ_EnableInterrupts()
  6. Реализовать обработчик: trap_handler()

ПРАКТИЧЕСКИЕ ПРИМЕНЕНИЯ НА ПЛАТЕ DIP-MIK32-V4
На плате DIP-MIK32-V4:
  • LED1 подключён к GPIO_0, пин 3 (P0_3) — настраивать как GPIO_OUTPUT
  • LED2 подключён к GPIO_1, пин 3 (P1_3) — настраивать как GPIO_OUTPUT
  • Пользовательская кнопка — подключена к одному из выводов GPIO_2, настраивать как GPIO_INPUT с PULL_UP (кнопка подтягивает к GND при нажатии)`,
    codes: [
      {
        title: "HAL — мигание светодиодами LED1 (P0_3) и LED2 (P1_3)",
        code: `/*
 * Мигание двумя пользовательскими светодиодами платы DIP-MIK32-V4.
 * LED1 — GPIO_0, PIN_3 (P0_3)
 * LED2 — GPIO_1, PIN_3 (P1_3)
 *
 * HAL_GPIO_Init настраивает PAD_CONFIG автоматически.
 */
#include "mik32_hal_pcc.h"
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

    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);  /* LED1 */
    HAL_GPIO_Init(GPIO_1, &GPIO_InitStruct);  /* LED2 */
}`
      },
      {
        title: "LL — мигание через Low-Level регистровый интерфейс",
        code: `/*
 * Работа с GPIO на уровне LL (Low Level) — прямой доступ к регистрам.
 * LL API позволяет выполнять операции с минимальными накладными расходами.
 *
 * Макросы P0_3 и P1_3 раскрываются в маску бита с указанием порта.
 * ll_gpio_toggle(mask) — атомарная операция инвертирования через XOR регистра OUTPUT.
 */
#include "mik32_hal.h"
#include "mik32_hal_pcc.h"
#include "mik32_ll_gpio.h"

/* Псевдонимы для выводов: P0_3 = GPIO_0 | (1<<3), P1_3 = GPIO_1 | (1<<3) */
#define LED_1  P0_3
#define LED_2  P1_3

int main(void)
{
    /* Включение тактирования GPIO и PAD_CONFIG */
    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_1_CLK_ENABLE();
    __HAL_PCC_PAD_CONFIG_CLK_ENABLE();

    /* Установить начальный уровень выходов */
    ll_gpio_out_write(LED_1, 0);
    LL_GPIO_OUT_WRITE(LED_2, 1);

    while (1)
    {
        /* Инвертировать выводы через маску (XOR OUTPUT) */
        ll_gpio_toggle(LED_1);
        LL_GPIO_TOGGLE(LED_2);

        HAL_DelayMs(500);
    }
}`
      },
      {
        title: "Чтение входа — кнопка управляет светодиодом",
        code: `/*
 * Чтение состояния кнопки и управление светодиодом.
 *
 * LED1 = GPIO_0, PIN_3 — выход (HIGH = светодиод горит)
 * BTN  = GPIO_2, PIN_6 — вход с подтяжкой к питанию PULL_UP
 *         При нажатии кнопки вывод замыкается на GND → читаем LOW.
 *
 * HAL_GPIO_ReadPin возвращает: GPIO_PIN_HIGH (1) или GPIO_PIN_LOW (0)
 */
#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"

void SystemClock_Config(void);
void GPIO_Init(void);

int main(void)
{
    SystemClock_Config();
    GPIO_Init();

    while (1)
    {
        GPIO_PinState btn_state = HAL_GPIO_ReadPin(GPIO_2, GPIO_PIN_6);

        if (btn_state == GPIO_PIN_LOW)
        {
            /* Кнопка нажата — зажечь LED1 */
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_HIGH);
        }
        else
        {
            /* Кнопка отпущена — погасить LED1 */
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_LOW);
        }
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
    __HAL_PCC_GPIO_2_CLK_ENABLE();

    /* LED1 — выход */
    GPIO_InitStruct.Pin  = GPIO_PIN_3;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);

    /* Кнопка — вход с подтяжкой к питанию */
    GPIO_InitStruct.Pin  = GPIO_PIN_6;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_INPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_UP;
    HAL_GPIO_Init(GPIO_2, &GPIO_InitStruct);
}`
      },
      {
        title: "Прерывание по фронту — GPIO_IRQ + EPIC",
        code: `/*
 * Прерывание GPIO по нарастающему фронту.
 * Вывод P2_5 (выход) → P2_6 (вход с прерыванием). Соединить их проводом.
 * P2_5 меняет состояние каждые 500 мс. Прерывание переключает переменную flag.
 * В зависимости от flag — LED1 (P0_3) и LED2 (P1_3) на DIP-MIK32-V4 вкл/выкл.
 *
 * trap_handler — обработчик всех трапп (прерываний) в MIK32.
 * EPIC_CHECK_GPIO_IRQ() — проверяет, что источник прерывания — GPIO_IRQ.
 * HAL_GPIO_LineInterruptState(line) — проверяет, что сработала нужная линия.
 */
#include "mik32_hal.h"
#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_irq.h"

void SystemClock_Config(void);
void GPIO_Init(void);

volatile uint32_t flag = 0;

int main(void)
{
    HAL_Init();
    SystemClock_Config();
    GPIO_Init();

    /* Разрешить прерывания GPIO в контроллере EPIC */
    HAL_EPIC_MaskLevelSet(HAL_EPIC_GPIO_IRQ_MASK);
    /* Разрешить глобальные прерывания (CSR mstatus.MIE = 1) */
    HAL_IRQ_EnableInterrupts();

    while (1)
    {
        /* Генерация тестового фронта на P2_5 */
        HAL_GPIO_TogglePin(GPIO_2, GPIO_PIN_5);
        HAL_DelayMs(500);

        /* Управление светодиодами в зависимости от флага */
        if (flag)
        {
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_HIGH); /* LED1 вкл */
            HAL_GPIO_WritePin(GPIO_1, GPIO_PIN_3, GPIO_PIN_HIGH); /* LED2 вкл */
        }
        else
        {
            HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_LOW);  /* LED1 выкл */
            HAL_GPIO_WritePin(GPIO_1, GPIO_PIN_3, GPIO_PIN_LOW);  /* LED2 выкл */
        }
    }
}

void GPIO_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    __HAL_PCC_GPIO_0_CLK_ENABLE();
    __HAL_PCC_GPIO_1_CLK_ENABLE();
    __HAL_PCC_GPIO_2_CLK_ENABLE();
    __HAL_PCC_GPIO_IRQ_CLK_ENABLE();

    /* LED1 (P0_3) и LED2 (P1_3) — выходы */
    GPIO_InitStruct.Pin  = GPIO_PIN_3;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);
    HAL_GPIO_Init(GPIO_1, &GPIO_InitStruct);

    /* P2_5 — генератор тестового сигнала (выход) */
    GPIO_InitStruct.Pin  = GPIO_PIN_5;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_2, &GPIO_InitStruct);

    /* P2_6 — вход с прерыванием по нарастающему фронту */
    GPIO_InitStruct.Pin  = GPIO_PIN_6;
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_GPIO_INPUT;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_2, &GPIO_InitStruct);

    /* Назначить P2_6 на линию прерывания LINE_2, режим: нарастающий фронт */
    HAL_GPIO_InitInterruptLine(GPIO_MUX_PORT2_6_LINE_2, GPIO_INT_MODE_RISING);
}

/* Обработчик всех прерываний и исключений MIK32 */
void trap_handler(void)
{
    if (EPIC_CHECK_GPIO_IRQ())
    {
        /* Проверить, что сработала именно линия LINE_2 */
        if (HAL_GPIO_LineInterruptState(GPIO_LINE_2))
        {
            flag = !flag;  /* Переключить флаг */
        }
        HAL_GPIO_ClearInterrupts();
    }

    /* Обязательно сбросить все флаги в EPIC */
    HAL_EPIC_Clear(0xFFFFFFFF);
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
}`
      }
    ],
    keyFunctions: [
      "HAL_GPIO_Init()",
      "HAL_GPIO_WritePin()",
      "HAL_GPIO_ReadPin()",
      "HAL_GPIO_TogglePin()",
      "HAL_GPIO_InitInterruptLine()",
      "HAL_GPIO_LineInterruptState()",
      "HAL_GPIO_ClearInterrupts()",
      "HAL_EPIC_MaskLevelSet()",
      "HAL_IRQ_EnableInterrupts()",
      "ll_gpio_toggle()",
      "LL_GPIO_TOGGLE()",
      "__HAL_PCC_GPIO_x_CLK_ENABLE()"
    ]
  },
  {
    id: "3-adc",
    title: "АЦП — Аналого-цифровой преобразователь",
    shortDescription: "12-битный АЦП с 8 каналами, встроенное и внешнее опорное напряжение 1,2 В, режимы одиночного и непрерывного преобразования.",
    theory: `Аналого-цифровой преобразователь (АЦП) микроконтроллера MIK32 реализован по принципу последовательного приближения (SAR ADC — Successive Approximation Register). Модуль входит в состав аналогового блока ANALOG_REG, расположенного по адресу 0x00081000 в пространстве APB_P.

ПРИНЦИП РАБОТЫ SAR АЦП
Преобразование выполняется методом двоичного поиска: компаратор последовательно сравнивает входное напряжение с напряжением, задаваемым внутренней ЦАП-схемой (DAC) суммирующего регистра приближений (SAR). За каждый тактовый цикл определяется один бит результата, начиная со старшего (MSB). Для получения 12-битного результата требуется 12 шагов + 1 цикл выборки-хранения (S&H). Суммарная латентность преобразования: N_SAH + 12 тактов АЦП.

ХАРАКТЕРИСТИКИ АЦП
  • Разрядность: 12 бит (диапазон кодов 0…4095; разрешение ≈ 1200/4096 ≈ 0,293 мВ/LSB)
  • Количество каналов: 8 аналоговых входов (ADC_CHANNEL0 … ADC_CHANNEL7)
  • Максимальная частота дискретизации: до 800 кГц (при минимальном SAH)
  • Максимальное допустимое входное напряжение: 1,2 ± 0,1 В (АБСОЛЮТНЫЙ МАКСИМУМ — не превышать!)
  • Источники опорного напряжения: встроенный бандгап 1,2 В или внешний через вывод ADCREF

РЕГИСТРОВАЯ КАРТА АНАЛОГОВОГО БЛОКА (ANALOG_REG, база 0x00081000)
  Смещение  Регистр          Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      ADC_CONFIG       Конфигурация АЦП
  0x04      ADC_SINGLE       Запуск одиночного преобразования (write)
  0x08      ADC_CONTINUOUS   Запуск непрерывных преобразований (write)
  0x0C      ADC_STATUS       Статус АЦП (READ ONLY)
  0x10      ADC_RESULT       Результат преобразования (READ ONLY, 12 бит)

РЕГИСТР ADC_CONFIG (смещение 0x00)
  Биты [7:4] — SEL[3:0]: выбор канала (0…7 = ADC_CHANNEL0…ADC_CHANNEL7)
  Бит  [2]   — EXTEN: источник опорного напряжения (0 = внутренний 1,2 В; 1 = внешний ADCREF)
  Бит  [3]   — EXTPAD: выбор источника EXTREF (0 = нога ADCREF; 1 = другой источник)
  Биты [10:8]— SAH_TIME: время выборки-хранения (N тактов АЦП; больше → точнее при высоком R_src)
  Бит  [1]   — RN: программный сброс АЦП
  Бит  [0]   — EN: разрешение работы АЦП

РЕГИСТР ADC_STATUS (смещение 0x0C)
  Бит [0] — VALID: результат в ADC_RESULT корректен (1 = готово)
  Бит [1] — BUSY: преобразование выполняется (1 = занято)

НАЗНАЧЕНИЕ КАНАЛОВ К ВЫВОДАМ МК
  ADC_CHANNEL0 → вывод P0_2  (GPIO_0, PIN_2)
  ADC_CHANNEL1 → вывод P0_4  (GPIO_0, PIN_4)
  ADC_CHANNEL2 → вывод P0_7  (GPIO_0, PIN_7)
  ADC_CHANNEL3 → вывод P0_9  (GPIO_0, PIN_9)
  ADC_CHANNEL4 → вывод P1_5  (GPIO_1, PIN_5)
  ADC_CHANNEL5 → вывод P1_7  (GPIO_1, PIN_7)
  ADC_CHANNEL6 → вывод P1_11 (GPIO_1, PIN_11; доступен на MIK32V2, также VREF_EXT)

Выводы, используемые как аналоговые входы, ОБЯЗАТЕЛЬНО переводятся в режим HAL_GPIO_MODE_ANALOG через функцию HAL_GPIO_Init (в callback HAL_ADC_MspInit). Перевод в аналоговый режим отключает цифровые входные буферы (триггер Шмитта), что предотвращает паразитные токи утечки и снижает потребление.

ПЕРЕКЛЮЧЕНИЕ КАНАЛОВ — ТЕХНИЧЕСКИЙ НЮАНС
Переключение мультиплексора аналогового входа происходит в момент завершения текущего преобразования (не мгновенно). Поэтому при многоканальных измерениях следует применять технику «опережающей установки канала»:
  1. Записать код следующего канала в ADC_CONFIG.SEL.
  2. Запустить текущее преобразование (HAL_ADC_SINGLE).
  3. После завершения текущего преобразования уже идёт новый канал.
  4. Первый результат после переключения — «холостой», его следует отбросить.
Функция HAL_ADC_SINGLE_AND_SET_CH автоматически реализует эту технику.

РЕЖИМЫ ЗАПУСКА
  Одиночное преобразование (Single): HAL_ADC_SINGLE → АЦП выполняет одно преобразование и останавливается; результат читается через HAL_ADC_WaitAndGetValue.
  Непрерывный режим (Continuous): HAL_ADC_ContinuousEnable → АЦП повторяет преобразования автоматически; каждый новый результат обновляет ADC_RESULT.

ПЕРЕСЧЁТ КОДА В НАПРЯЖЕНИЕ
При внутреннем опорном напряжении Vref = 1200 мВ:
  U_вх (мВ) = (ADC_RESULT × 1200) / 4095
При внешнем опорном напряжении Vref_ext (мВ):
  U_вх (мВ) = (ADC_RESULT × Vref_ext) / 4095

РЕКОМЕНДАЦИИ ПО СХЕМОТЕХНИКЕ
  • Входное сопротивление источника сигнала не должно превышать ~10 кОм при времени выборки SAH_TIME = 0; при больших R_src увеличивайте SAH_TIME.
  • Между аналоговым входом и землёй рекомендуется конденсатор 100 нФ для подавления высокочастотных помех.
  • Цепи питания AVDD (аналоговое питание, вывод VDD_AO) следует развязать от цифровой земли конденсаторами 100 нФ + 10 мкФ.`,
    codes: [
      {
        title: "Многоканальное измерение АЦП",
        code: `#include "mik32_hal_adc.h"
#include "uart_lib.h"
#include "xprintf.h"

/*
 * Последовательный опрос каналов АЦП 0..4.
 * Техника перекрытия: записываем следующий канал сразу после старта текущего,
 * чтобы переключение произошло без потери времени.
 */

ADC_HandleTypeDef hadc;

void SystemClock_Config(void);
static void ADC_Init(void);

int main(void)
{
    SystemClock_Config();
    UART_Init(UART_0, 3333, UART_CONTROL1_TE_M | UART_CONTROL1_M_8BIT_M, 0, 0);
    ADC_Init();

    uint16_t adc_value = 0;

    while (1)
    {
        /* Первое измерение — для переключения на канал 0 */
        ADC_SEL_CHANNEL(hadc.Instance, 0);
        HAL_ADC_SINGLE(hadc.Instance);
        HAL_ADC_WaitValid(&hadc);

        /* Последовательный опрос каналов 0..4 */
        for (uint32_t j = 0; j < 5; j++)
        {
            /* Записать следующий канал сразу после старта текущего */
            HAL_ADC_SINGLE_AND_SET_CH(hadc.Instance, (j + 1) % 5);

            /* Ожидать окончания преобразования и прочитать результат */
            adc_value = HAL_ADC_WaitAndGetValue(&hadc);

            /* Вывод: код и напряжение в вольтах (при Vref=1200 мВ) */
            xprintf("ADC[%u]: %u (U = %u.%03u V)\\n",
                    j,
                    adc_value,
                    ((adc_value * 1200) / 4095) / 1000,
                    ((adc_value * 1200) / 4095) % 1000);
        }
        xprintf("\\n");
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

static void ADC_Init(void)
{
    hadc.Instance      = ANALOG_REG;
    hadc.Init.Sel      = ADC_CHANNEL0;
    hadc.Init.EXTRef   = ADC_EXTREF_OFF;      /* Встроенный ОИН 1,2 В */
    hadc.Init.EXTClb   = ADC_EXTCLB_ADCREF;  /* Источник внешнего ОИН: вывод ADCREF */
    HAL_ADC_Init(&hadc);
}

/* MSP-callback: настройка аналоговых выводов */
void HAL_ADC_MspInit(ADC_HandleTypeDef *hadc)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    __HAL_PCC_ANALOG_REGS_CLK_ENABLE();

    /* Перевести выводы АЦП в аналоговый режим */
    GPIO_InitStruct.Mode = HAL_GPIO_MODE_ANALOG;
    GPIO_InitStruct.Pull = HAL_GPIO_PULL_NONE;

    GPIO_InitStruct.Pin = GPIO_PIN_5 | GPIO_PIN_7;  /* Каналы 4,5 на GPIO_1 */
    HAL_GPIO_Init(GPIO_1, &GPIO_InitStruct);

    GPIO_InitStruct.Pin = GPIO_PIN_2 | GPIO_PIN_4 | GPIO_PIN_7 | GPIO_PIN_9; /* Каналы 0-3 на GPIO_0 */
    HAL_GPIO_Init(GPIO_0, &GPIO_InitStruct);
}`
      }
    ],
    keyFunctions: ["HAL_ADC_Init()", "HAL_ADC_Single()", "HAL_ADC_ContinuousEnable()", "HAL_ADC_WaitAndGetValue()", "HAL_ADC_WaitValid()", "ADC_SEL_CHANNEL()", "HAL_ADC_SINGLE_AND_SET_CH()"]
  },
  {
    id: "4-eeprom",
    title: "EEPROM — Энергонезависимая память",
    shortDescription: "Встроенная EEPROM 8 КБ (64 страницы × 32 слова), двух- и трёхстадийный режимы записи, коррекция ошибок ECC.",
    theory: `Встроенная энергонезависимая память EEPROM (Electrically Erasable Programmable Read-Only Memory) MIK32 основана на технологии флэш-ячеек с туннельным стиранием (Fowler-Nordheim tunneling). Она сохраняет данные при полном отключении питания (типичное время хранения — не менее 10 лет). Контроллер EEPROM расположен по адресу 0x00070400 (EEPROM_REGS) в подсистеме памяти APB_M. Прямое чтение данных возможно по базовому адресу 0x01000000.

ХАРАКТЕРИСТИКИ EEPROM
  • Объём: 8 КБ = 8192 байт = 2048 слов × 32 бит
  • Организация: 64 страницы × 32 слова × 32 бит/слово
  • Базовый адрес данных в карте памяти МК: 0x01000000 … 0x01001FFF
  • Адрес EEPROM_REGS (регистры контроллера): 0x00070400
  • Число циклов перезаписи: не менее 1 000 000 (при комнатной температуре)
  • Защита от ошибок: аппаратный ECC (Error Correction Code) — исправляет 1-битные ошибки, обнаруживает 2-битные
  • Аппаратный генератор высокого напряжения (charge pump) для стирания/записи: встроен

РЕГИСТРОВАЯ КАРТА (EEPROM_REGS, база 0x00070400)
  Смещение  Имя        Описание
  ─────────────────────────────────────────────────────────────────────────
  0x00      EEDAT      Регистр данных для записи (32 бит)
  0x04      EEA        Регистр адреса (биты [12:2] — адрес слова, биты [1:0] = 0)
  0x08      EECON      Регистр управления операцией
  0x0C      EESTA      Регистр состояния (READ ONLY)
  0x10      EERB       Регистр коррекции ECC (READ ONLY)
  0x14      EEADJ      Регистр подстройки аналоговой части

РЕГИСТР EECON (0x08) — поля
  Бит  [0]    EX     — Execute: запуск операции (1 = старт)
  Биты [2:1]  OP     — тип операции: 00 = чтение, 01 = запись, 10 = стирание, 11 = стирание+запись
  Биты [4:3]  WRBEH  — поведение при записи: 00 = все, 01 = нечётные, 10 = чётные
  Бит  [5]    APBNWS — количество тактов ожидания APB-доступа при чтении (0 = 0WS, 1 = 1WS)
  Бит  [6]    DISECC — отключить ECC (1 = выключить; по умолчанию ECC включён)
  Бит  [7]    BWE    — разрешение записи байт (0 = только полными словами, 1 = побайтово)
  Бит  [8]    IESERR — прерывание при однобитной ошибке ECC (1 = включить)

РЕГИСТР EESTA (0x0C) — поля
  Бит [0]  BSY  — флаг занятости (1 = операция выполняется)
  Бит [1]  SERR — флаг однобитной ошибки ECC (1 = была исправлена ошибка)

РЕГИСТР EERB (0x10) — поля
  Биты [5:0]  CORRECT — позиция исправленного бита (адрес бита в последнем прочитанном слове)

ОПЕРАЦИИ С EEPROM
Прямое чтение: обращение по адресу 0x01000000 + байтовый_смещение через обычный указатель (uint32_t *).
Запись: выполняется только через контроллер (регистры EECON/EEA/EEDAT), не напрямую по адресному пространству.

ДВУХСТАДИЙНЫЙ РЕЖИМ ЗАПИСИ (HAL_EEPROM_MODE_TWO_STAGE)
  Стадия 1: стирание страницы (запись всех ячеек в «1»)
  Стадия 2: программирование (запись «0» в нужные биты)
Это стандартный режим, рекомендуемый для большинства применений. Одновременно обрабатываются как чётные, так и нечётные страницы.

ТРЁХСТАДИЙНЫЙ РЕЖИМ ЗАПИСИ (HAL_EEPROM_MODE_THREE_STAGE)
  Стадия 1: стирание нечётных страниц
  Стадия 2: стирание чётных страниц
  Стадия 3: программирование
Данный режим позволяет независимо управлять чётными и нечётными страницами для реализации схем wear-leveling (выравнивания износа).

ВРЕМЕННЫ́Е ПАРАМЕТРЫ
Функция HAL_EEPROM_CalculateTimings(&heeprom, OSC_SYSTEM_VALUE) автоматически вычисляет и устанавливает временны́е параметры операций (время стирания ~5 мс, время программирования ~5 мс) исходя из текущей системной частоты. При неверных временны́х параметрах запись может завершиться с ошибкой или повредить данные.

РЕКОМЕНДАЦИИ ПО БЕЗОПАСНОМУ ИСПОЛЬЗОВАНИЮ
  • Всегда стирать страницу (HAL_EEPROM_Erase) перед записью.
  • Не прерывать операцию стирания/записи (не отключать питание, не сбрасывать МК).
  • Использовать ECC (ErrorCorrection = HAL_EEPROM_ECC_ENABLE) для выявления радиационных сбоев.
  • Для critical-данных хранить два зеркальных экземпляра на разных страницах и верифицировать через HAL_EEPROM_Read.`,
    codes: [
      {
        title: "Стирание, запись и чтение EEPROM",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_usart.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_eeprom.h"
#include "xprintf.h"

#define EEPROM_OP_TIMEOUT  100000
#define EEPROM_PAGE_WORDS  32      /* 32 слова (32-бит) на страницу */
#define EEPROM_PAGE_COUNT  64      /* 64 страницы всего */

HAL_EEPROM_HandleTypeDef heeprom;
USART_HandleTypeDef husart0;

void SystemClock_Config(void);
void USART_Init(void);
void EEPROM_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();

    xprintf("\\n==== EEPROM Demo ====\\n");
    EEPROM_Init();

    uint32_t write_buf[EEPROM_PAGE_WORDS];
    uint32_t read_buf[EEPROM_PAGE_WORDS];

    /* --- 1. Стирание страницы 0 --- */
    xprintf("Erasing page 0...\\n");
    HAL_EEPROM_Erase(&heeprom, 0, EEPROM_PAGE_WORDS,
                     HAL_EEPROM_WRITE_ALL, EEPROM_OP_TIMEOUT);

    /* --- 2. Запись данных в страницу 0 --- */
    for (int i = 0; i < EEPROM_PAGE_WORDS; i++)
        write_buf[i] = 0xA5A5A500 | i;

    xprintf("Writing...\\n");
    HAL_EEPROM_Write(&heeprom, 0, write_buf, EEPROM_PAGE_WORDS,
                     HAL_EEPROM_WRITE_ALL, EEPROM_OP_TIMEOUT);

    /* --- 3. Чтение и проверка --- */
    xprintf("Reading...\\n");
    HAL_EEPROM_Read(&heeprom, 0, read_buf, EEPROM_PAGE_WORDS,
                    EEPROM_OP_TIMEOUT);

    int errors = 0;
    for (int i = 0; i < EEPROM_PAGE_WORDS; i++)
    {
        if (read_buf[i] != write_buf[i])
        {
            xprintf("Mismatch at [%d]: wrote 0x%08X, read 0x%08X\\n",
                    i, write_buf[i], read_buf[i]);
            errors++;
        }
    }
    xprintf(errors ? "FAIL: %d errors\\n" : "OK: all data verified\\n", errors);

    while (1) {}
}

void EEPROM_Init(void)
{
    heeprom.Instance        = EEPROM_REGS;
    heeprom.Mode            = HAL_EEPROM_MODE_TWO_STAGE;
    heeprom.ErrorCorrection = HAL_EEPROM_ECC_ENABLE;
    heeprom.EnableInterrupt = HAL_EEPROM_SERR_DISABLE;

    HAL_EEPROM_Init(&heeprom);
    /* Автоматический расчёт временны́х параметров по частоте тактирования */
    HAL_EEPROM_CalculateTimings(&heeprom, OSC_SYSTEM_VALUE);
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

void USART_Init(void)
{
    husart0.Instance    = UART_0;
    husart0.transmitting = Enable;
    husart0.receiving   = Disable;
    husart0.baudrate    = 9600;
    HAL_USART_Init(&husart0);
}`
      }
    ],
    keyFunctions: ["HAL_EEPROM_Init()", "HAL_EEPROM_Erase()", "HAL_EEPROM_Write()", "HAL_EEPROM_Read()", "HAL_EEPROM_SetMode()", "HAL_EEPROM_CalculateTimings()"]
  },
  {
    id: "5-timer16",
    title: "Timer16 — 16-битный таймер",
    shortDescription: "Однобуферный 16-битный таймер: непрерывный счёт, одиночный выстрел, ШИМ, внешние триггеры, цифровые фильтры, энкодер.",
    theory: `Модуль Timer16 — 16-битный однобуферный таймер/счётчик с низким потреблением. MIK32 содержит три независимых экземпляра: TIMER16_0, TIMER16_1 и TIMER16_2, каждый расположен по отдельному адресу в пространстве APB_P. Архитектурно Timer16 совместим с LPTIM (Low-Power Timer) семейства STM32.

АДРЕСА МОДУЛЕЙ В КАРТЕ ПАМЯТИ
  TIMER16_0 — база 0x00081400
  TIMER16_1 — база 0x00081800
  TIMER16_2 — база 0x00081C00

РЕГИСТРОВАЯ КАРТА (смещения относительно базы)
  Смещение  Имя     Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      ISR     Interrupt and Status Register (READ ONLY)
  0x04      ICR     Interrupt Clear Register (WRITE ONLY)
  0x08      IER     Interrupt Enable Register
  0x0C      CFGR    Configuration Register (нельзя менять при работающем таймере!)
  0x10      CR      Control Register (запуск/останов)
  0x14      CMP     Compare Register (16 бит, порог сравнения)
  0x18      ARR     AutoReload Register (16 бит, верхняя граница счёта)
  0x1C      CNT     Counter Register (16 бит, текущее значение, READ ONLY в реж. EN)

РЕГИСТР ISR — флаги состояния (READ ONLY)
  Бит [6]  DOWN    — счётчик достиг нижней границы (при реверсе)
  Бит [5]  UP      — счётчик достиг верхней границы (CNT = ARR)
  Бит [4]  ARROK   — значение ARR успешно обновлено в буфере
  Бит [3]  CMPOK   — значение CMP успешно обновлено в буфере
  Бит [2]  EXTTRIG — внешний триггер сработал
  Бит [1]  ARRM    — совпадение CNT == ARR (период истёк)
  Бит [0]  CMPM    — совпадение CNT == CMP

РЕГИСТР CFGR — поля конфигурации (до включения CR.ENABLE)
  Биты [12:11]  PRELOAD: предзагрузка ARR/CMP (0 = немедленно, 1 = в конце периода)
  Биты [10:9]   PRESC: предделитель входной частоты:
                  00 = /1,  01 = /2,  10 = /4,  11 = /8
  (дополнительно Prescaler = /16, /32, /64, /128 задаётся полем CFGR[11:9])
  Биты [8:7]    TRGFLT: фильтр триггерного входа (0 = нет, 1…3 = N тактов)
  Биты [6:3]    TRIGSEL: выбор источника триггера (см. таблицу ниже)
  Бит  [2]      TIMOUT: режим одиночного захвата (1 = таймер стоп после триггера)
  Бит  [1]      WAVPOL: полярность ШИМ (0 = HIGH при CNT<CMP; 1 = инвертировано)
  Бит  [0]      WAVE: включить ШИМ-выход на вывод OUT (1 = ШИМ)

ИСТОЧНИКИ ТАКТИРОВАНИЯ (поле CFGR.CKSEL + CFGR.CKFLT)
  TIMER16_SOURCE_INTERNAL_SYSTEM — тактирование от APB (до 32 МГц)
  TIMER16_SOURCE_INTERNAL_LSI    — внутренний RC 32 кГц (LSI32K)
  TIMER16_SOURCE_INTERNAL_LSE    — внешний кварц 32768 Гц (OSC32K)
  TIMER16_SOURCE_EXTERNAL        — внешний сигнал на выводе IN (с фильтрацией)

ДЕЛИТЕЛИ ТАКТОВОЙ ЧАСТОТЫ
  TIMER16_PRESCALER_1   = /1    TIMER16_PRESCALER_2   = /2
  TIMER16_PRESCALER_4   = /4    TIMER16_PRESCALER_8   = /8
  TIMER16_PRESCALER_16  = /16   TIMER16_PRESCALER_32  = /32
  TIMER16_PRESCALER_64  = /64   TIMER16_PRESCALER_128 = /128

Результирующая частота тактирования счётчика:
  f_CNT = f_src / Prescaler

РЕЖИМЫ РАБОТЫ

1. Непрерывный счёт (TIMER16_START_CONTIN_MODE)
Счётчик CNT считает от 0 до ARR, при CNT=ARR генерируется событие ARRM и счётчик сбрасывается в 0. Период:
  T_period = (ARR + 1) / f_CNT

2. Одиночный выстрел (TIMER16_START_SINGLE_MODE)
Счётчик отсчитывает от 0 до ARR один раз и останавливается. Используется для формирования точной задержки или одиночного импульса.

3. Режим ШИМ (CFGR.WAVE = 1)
На выводе OUT формируется прямоугольный сигнал:
  HIGH при CNT < CMP (при WAVPOL=0)
  LOW  при CNT ≥ CMP
  Скважность D = CMP / (ARR + 1) × 100%
  При WAVPOL=1 — сигнал инвертируется.

4. Режим энкодера (CFGR.ENC = 1)
Счётчик следует за двухфазным квадратурным энкодером (сигналы IN и EXTRIG). Направление счёта определяется фазовым соотношением сигналов.

ВНЕШНИЕ ТРИГГЕРЫ (CFGR.TRIGSEL)
Модуль поддерживает аппаратный запуск/останов счёта от внешних сигналов:
  TIMER16_TRIGGER_TIM0_GPIO1_9  — GPIO1.9
  TIMER16_TRIGGER_TIM1_GPIO1_9  — GPIO1.9 (для TIMER16_1)
  TIMER16_TRIGGER_SOFTWARE       — программный запуск (функция HAL)
  ... (см. полный список в Reference Manual)

ЦИФРОВЫЕ ФИЛЬТРЫ (CFGR.CKFLT, CFGR.TRGFLT)
Фильтры подавляют высокочастотный дребезг на входах IN и EXTRIG:
  0 = нет фильтра
  1 = стабильность 2 тактов
  2 = стабильность 4 тактов
  3 = стабильность 8 тактов

ПРЕРЫВАНИЯ
Каждый флаг ISR может генерировать прерывание через EPIC, если соответствующий бит IER установлен:
  IER.CMPMIE  — прерывание по совпадению CMP
  IER.ARRMIE  — прерывание по совпадению ARR (период)
  IER.EXTTRIGIE — прерывание по внешнему триггеру
  IER.CMPOKIE — прерывание при обновлении CMP
  IER.ARROKIE — прерывание при обновлении ARR
  IER.UPIE    — прерывание при счёте вверх
  IER.DOWNIE  — прерывание при счёте вниз (режим энкодера)`,
    codes: [
      {
        title: "Генерация ШИМ сигнала 50% на Timer16",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_timer16.h"

/*
 * Генерация ШИМ с периодом ARR=0xFFFF и скважностью 50% (CMP = ARR/2).
 * Выход ШИМ Timer16_1 — назначить соответствующему GPIO-выводу в режим TIMER_SERIAL.
 */

Timer16_HandleTypeDef htimer16_1;

void SystemClock_Config(void);
static void Timer16_1_Init(void);

int main(void)
{
    SystemClock_Config();
    Timer16_1_Init();

    /* Запуск ШИМ: период 0xFFFF, скважность 50% */
    HAL_Timer16_StartPWM(&htimer16_1, 0xFFFF, 0xFFFF / 2);

    while (1)
    {
        /* Чтение текущего значения счётчика */
        uint16_t cnt = HAL_Timer16_GetCounterValue(&htimer16_1);
        (void)cnt;

        /* Проверка флага совпадения (CMP match) */
        if (__HAL_TIMER16_GET_FLAG(&htimer16_1, TIMER16_FLAG_CMPM))
        {
            __HAL_TIMER16_CLEAR_FLAG(&htimer16_1, TIMER16_FLAG_CMPM);
        }
    }
}

static void Timer16_1_Init(void)
{
    htimer16_1.Instance = TIMER16_1;

    /* Источник тактирования: системная частота APB */
    htimer16_1.Clock.Source    = TIMER16_SOURCE_INTERNAL_SYSTEM;
    htimer16_1.CountMode       = TIMER16_COUNTMODE_INTERNAL;
    htimer16_1.Clock.Prescaler = TIMER16_PRESCALER_1;

    htimer16_1.ActiveEdge          = TIMER16_ACTIVEEDGE_RISING;
    htimer16_1.Preload             = TIMER16_PRELOAD_AFTERWRITE;

    /* Триггер: программный (счёт запускается вызовом HAL функции) */
    htimer16_1.Trigger.Source     = TIMER16_TRIGGER_TIM1_GPIO1_9;
    htimer16_1.Trigger.ActiveEdge = TIMER16_TRIGGER_ACTIVEEDGE_SOFTWARE;
    htimer16_1.Trigger.TimeOut    = TIMER16_TIMEOUT_DISABLE;

    htimer16_1.Filter.ExternalClock = TIMER16_FILTER_NONE;
    htimer16_1.Filter.Trigger       = TIMER16_FILTER_NONE;
    htimer16_1.EncoderMode          = TIMER16_ENCODER_DISABLE;

    /* Включить ШИМ без инверсии полярности */
    htimer16_1.Waveform.Enable   = TIMER16_WAVEFORM_GENERATION_ENABLE;
    htimer16_1.Waveform.Polarity = TIMER16_WAVEFORM_POLARITY_NONINVERTED;

    HAL_Timer16_Init(&htimer16_1);
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
}`
      }
    ],
    keyFunctions: ["HAL_Timer16_Init()", "HAL_Timer16_StartPWM()", "HAL_Timer16_Counter_Start()", "HAL_Timer16_StartOneShot()", "HAL_Timer16_GetCounterValue()", "__HAL_TIMER16_GET_FLAG()", "__HAL_TIMER16_CLEAR_FLAG()"]
  },
  {
    id: "6-timer32",
    title: "Timer32 — 32-битный таймер",
    shortDescription: "32-битный многоканальный таймер: режимы счёта, ШИМ (4 канала), захват входного сигнала, сравнение, прерывания.",
    theory: `Модуль Timer32 — 32-битный многофункциональный таймер/счётчик с четырьмя каналами захвата/сравнения/ШИМ. MIK32 содержит три независимых экземпляра: TIMER32_0, TIMER32_1 и TIMER32_2. Модули TIMER32_1 и TIMER32_2 оснащены четырьмя каналами (CH0…CH3), TIMER32_0 — базовый таймер без каналов. Все три модуля подключены к шине APB_P.

АДРЕСА МОДУЛЕЙ В КАРТЕ ПАМЯТИ
  TIMER32_0 — база 0x00082000
  TIMER32_1 — база 0x00082400
  TIMER32_2 — база 0x00082800

РЕГИСТРОВАЯ КАРТА (смещения относительно базы)
  Смещение  Имя           Описание
  ──────────────────────────────────────────────────────────────────────────────
  0x00      VALUE         Текущее значение счётчика (32 бит, READ/WRITE)
  0x04      TOP           Верхняя граница счёта (32 бит)
  0x08      PRESCALER     Предделитель: биты [7:0] = делитель-1; бит [8] = ENABLE
  0x0C      CONTROL       Управление: режим и источник тактирования
  0x10      ENABLE        Запуск/останов/сброс таймера
  0x14      INT_MASK      Маска прерываний
  0x18      INT_CLEAR     Сброс флагов прерываний (WRITE ONLY)
  0x1C      INT_FLAGS     Текущие флаги прерываний (READ ONLY)
  --- Канальные регистры (каждые 0x10 байт начиная с 0x80) ---
  0x80+N*10h  CH[N].CNTRL  Управление каналом N (N = 0…3)
  0x84+N*10h  CH[N].OCR    Output Compare Register (значение сравнения)
  0x88+N*10h  CH[N].ICR    Input Capture Register (захваченное значение, READ ONLY)

РЕГИСТР PRESCALER
  Биты [7:0]  — делитель частоты (значение 0…255 = делитель 1…256)
  Бит  [8]    — PRESCALER_ENABLE: 1 = предделитель включён, 0 = отключён

РЕГИСТР CONTROL
  Биты [3:2]  CLOCK_SEL: источник тактирования
    00 = от предделителя (системная частота / Prescaler)
    01 = от TIMER32_1 (каскадирование)
    10 = от вывода TX_PIN
    11 = от TIMER32_2
  Биты [1:0]  MODE: направление счёта
    00 = прямой (UP) 0 → TOP
    01 = обратный (DOWN) TOP → 0
    10 = двунаправленный (BIDIR) 0 → TOP → 0 → ...

РЕГИСТР ENABLE
  Бит [0]  TIM_EN   — запуск таймера (1 = работает)
  Бит [1]  TIM_CLR  — сброс счётчика в 0 (самосбрасывается)

РЕГИСТРЫ ПРЕРЫВАНИЙ (INT_MASK / INT_CLEAR / INT_FLAGS)
  Бит [0]  OVERFLOW  — переполнение (VALUE == TOP при прямом счёте)
  Бит [1]  UNDERFLOW — опустошение (VALUE == 0 при обратном счёте)
  Биты [5:2]  IC[3:0]  — событие захвата канала N (Input Capture)
  Биты [9:6]  OC[3:0]  — событие сравнения канала N (Output Compare / PWM)

РЕГИСТР CH[N].CNTRL — управление каналом N
  Бит  [0]   NOISE_FILT  — шумоподавляющий фильтр входного сигнала (1 = включён)
  Бит  [4]   CAPTURE_EDGE — фронт захвата: 0 = нарастающий, 1 = спадающий
  Биты [6:5]  MODE: режим канала
    00 = отключён
    01 = сравнение (Compare): событие при VALUE == OCR
    10 = захват (Capture): фиксация VALUE по внешнему фронту в ICR
    11 = ШИМ (PWM): HIGH при VALUE < OCR, LOW при VALUE ≥ OCR
  Бит  [7]   ENABLE — включить канал
  Бит  [8]   INVERTED_PWM — инвертировать ШИМ-выход
  Бит  [9]   DIR — направление канала (при двунаправленном счёте)

РАСЧЁТ ЧАСТОТЫ ШИМ
  f_PWM = f_APB / (Prescaler × (TOP + 1))
  При f_APB = 32 МГц, Prescaler = 1, TOP = 31999:
    f_PWM = 32 000 000 / (1 × 32000) = 1000 Гц = 1 кГц

РАСЧЁТ СКВАЖНОСТИ ШИМ
  D (%) = OCR / (TOP + 1) × 100%
  При TOP = 31999, OCR = 16000: D ≈ 50%

РЕЖИМ ЗАХВАТА (Input Capture)
Используется для измерения периода, длительности импульса или частоты внешнего сигнала. При событии на входе канала текущее значение VALUE копируется в ICR. Для измерения периода:
  T_signal = (ICR_N - ICR_Prev) / f_CNT

КАСКАДИРОВАНИЕ ТАЙМЕРОВ
TIMER32_1 и TIMER32_2 могут тактироваться от переполнения TIMER32_0 (CLOCK_SEL = 01/11), что позволяет получить 64-битный счётчик или формировать очень длинные временны́е интервалы.

ТИПОВЫЕ ПРИМЕНЕНИЯ
  • Генерация многоканального ШИМ (управление несколькими двигателями/LED-каналами)
  • Измерение длительности и периода внешних сигналов (Input Capture)
  • Точные программные задержки без блокировки CPU (прерывание по сравнению)
  • Формирование мёртвого времени (dead-time) в схемах мостового управления`,
    codes: [
      {
        title: "Timer32 — ШИМ на канале 0 и чтение счётчика",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_timer32.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Пример: TIMER32_0, канал 0 в режиме ШИМ (скважность 50%).
 * TOP = 31999 → f_PWM = 32 МГц / 32000 = 1 кГц.
 * Значение счётчика выводится по UART0 каждые ~500 000 тиков.
 */

TIMER32_HandleTypeDef         htimer32_0;
TIMER32_CHANNEL_HandleTypeDef htimer32_channel0;
USART_HandleTypeDef           husart0;

void SystemClock_Config(void);
static void Timer32_0_Init(void);
void USART_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();
    Timer32_0_Init();

    HAL_Timer32_Channel_Enable(&htimer32_channel0);
    HAL_Timer32_Value_Clear(&htimer32_0);
    HAL_Timer32_Start(&htimer32_0);

    while (1)
    {
        /* Прочитать текущее значение 32-битного счётчика */
        uint32_t cnt = HAL_Timer32_Value_Get(&htimer32_0);
        xprintf("CNT = %lu\\n", cnt);

        /* Пауза ~500 000 тиков (при 32 МГц ≈ 15.6 мс) */
        for (volatile uint32_t i = 0; i < 500000; i++);
    }
}

static void Timer32_0_Init(void)
{
    /* Настройка таймера */
    htimer32_0.Instance      = TIMER32_0;
    htimer32_0.Top           = 31999;                    /* f_PWM = 32 МГц / 32000 = 1 кГц */
    htimer32_0.State         = TIMER32_STATE_DISABLE;
    htimer32_0.Clock.Source  = TIMER32_SOURCE_PRESCALER; /* Выход делителя (AHB) */
    htimer32_0.Clock.Prescaler = 0;                      /* Делитель = Prescaler + 1 = 1 */
    htimer32_0.InterruptMask = 0;
    htimer32_0.CountMode     = TIMER32_COUNTMODE_FORWARD;
    HAL_Timer32_Init(&htimer32_0);

    /* Настройка канала 0: ШИМ, скважность 50% */
    htimer32_channel0.TimerInstance = htimer32_0.Instance;
    htimer32_channel0.ChannelIndex  = TIMER32_CHANNEL_0;
    htimer32_channel0.PWM_Invert    = TIMER32_CHANNEL_NON_INVERTED_PWM;
    htimer32_channel0.Mode          = TIMER32_CHANNEL_MODE_PWM;
    htimer32_channel0.CaptureEdge   = TIMER32_CHANNEL_CAPTUREEDGE_RISING;
    htimer32_channel0.OCR           = 31999 >> 1;        /* 50% скважность */
    htimer32_channel0.Noise         = TIMER32_CHANNEL_FILTER_OFF;
    HAL_Timer32_Channel_Init(&htimer32_channel0);
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

void USART_Init(void)
{
    husart0.Instance          = UART_0;
    husart0.transmitting      = Enable;
    husart0.receiving         = Disable;
    husart0.frame             = Frame_8bit;
    husart0.parity_bit        = Disable;
    husart0.parity_bit_inversion = Disable;
    husart0.bit_direction     = LSB_First;
    husart0.data_inversion    = Disable;
    husart0.tx_inversion      = Disable;
    husart0.rx_inversion      = Disable;
    husart0.swap              = Disable;
    husart0.lbm               = Disable;
    husart0.stop_bit          = StopBit_1;
    husart0.mode              = Asynchronous_Mode;
    husart0.xck_mode          = XCK_Mode3;
    husart0.last_byte_clock   = Disable;
    husart0.overwrite         = Disable;
    husart0.rts_mode          = AlwaysEnable_mode;
    husart0.dma_tx_request    = Disable;
    husart0.dma_rx_request    = Disable;
    husart0.channel_mode      = Duplex_Mode;
    husart0.tx_break_mode     = Disable;
    husart0.Interrupt.ctsie   = Disable;
    husart0.Interrupt.eie     = Disable;
    husart0.Interrupt.idleie  = Disable;
    husart0.Interrupt.lbdie   = Disable;
    husart0.Interrupt.peie    = Disable;
    husart0.Interrupt.rxneie  = Disable;
    husart0.Interrupt.tcie    = Disable;
    husart0.Interrupt.txeie   = Disable;
    husart0.Modem.rts         = Disable;
    husart0.Modem.cts         = Disable;
    husart0.Modem.dtr         = Disable;
    husart0.Modem.dcd         = Disable;
    husart0.Modem.dsr         = Disable;
    husart0.Modem.ri          = Disable;
    husart0.Modem.ddis        = Disable;
    husart0.baudrate          = 9600;
    HAL_USART_Init(&husart0);
}`
      }
    ],
    keyFunctions: ["HAL_Timer32_Init()", "HAL_Timer32_Start()", "HAL_Timer32_Stop()", "HAL_Timer32_Value_Clear()", "HAL_Timer32_Value_Get()", "HAL_Timer32_Top_Set()", "HAL_Timer32_Channel_Init()", "HAL_Timer32_Channel_Enable()", "HAL_Timer32_Channel_OCR_Set()"]
  },
  {
    id: "7-spi",
    title: "SPI — Последовательный периферийный интерфейс",
    shortDescription: "Синхронный полнодуплексный интерфейс: режимы Master/Slave, 4 линии CS, настройка CPOL/CPHA, делители частоты /2…/256, DMA.",
    theory: `SPI (Serial Peripheral Interface) — синхронный полнодуплексный последовательный интерфейс, разработанный компанией Motorola. Обеспечивает высокоскоростной обмен данными между мастером и одним или несколькими ведомыми. MIK32 содержит два независимых модуля SPI: SPI_0 и SPI_1, расположенных в пространстве APB_P.

АДРЕСА МОДУЛЕЙ В КАРТЕ ПАМЯТИ
  SPI_0 — база 0x00083000
  SPI_1 — база 0x00083400

СИГНАЛЬНЫЙ ИНТЕРФЕЙС
  SCK  — тактовый сигнал (Serial Clock); генерируется исключительно мастером
  MOSI — данные мастер → ведомый (Master Out, Slave In)
  MISO — данные ведомый → мастер (Master In, Slave Out)
  CS0…CS3 — выбор ведомого (Chip Select), активный низкий уровень

РЕГИСТРОВАЯ КАРТА (смещения относительно базы)
  Смещение  Имя      Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      CONFIG   Конфигурация SPI (режим, полярность, разрядность)
  0x04      STATUS   Статус FIFO и ошибок (READ ONLY)
  0x08      IEN      Interrupt Enable (разрешение прерываний)
  0x0C      IDIS     Interrupt Disable (запрет прерываний)
  0x10      IMASK    Interrupt Mask (маска прерываний, READ ONLY)
  0x14      ENABLE   Управление модулем (вкл/откл, сброс FIFO)
  0x18      DELAY    Задержки между транзакциями (BTWN, AFTER, INIT)
  0x1C      TXD      Регистр передачи (WRITE ONLY, пишем в FIFO TX)
  0x20      RXD      Регистр приёма (READ ONLY, читаем из FIFO RX)
  0x24      SLAVE_IDLE_COUNT  Счётчик простоя (режим ведомого)
  0x28      TX_THRESHOLD / RX_THRESHOLD  Порог FIFO

РЕГИСТР CONFIG (0x00)
  Бит  [0]   MODE_SEL     — режим: 0 = Slave, 1 = Master
  Бит  [1]   CLK_PH       — CPHA: фаза тактирования (0 = захват по первому фронту; 1 = по второму)
  Бит  [2]   CLK_POL      — CPOL: полярность SCK в покое (0 = LOW; 1 = HIGH)
  Биты [5:3]  BAUD_DIV    — делитель тактовой частоты (см. ниже)
  Биты [9:6]  BITS        — размер слова передачи: 4 = 4 бит … 15 = 16 бит (по умолчанию 15 = 16 бит; для 8-битного обмена = 7)
  Биты [12:10] CS_DECODE  — выбор декодера CS (0 = прямой выбор 1 из 4; 1 = декодер 2→4)
  Бит  [13]   MANUAL_CS   — ручное управление CS (0 = авто; 1 = ручное через HAL_SPI_CS_Enable)
  Биты [17:14] CS_N       — выбранная линия CS (0…3 для SPI_CS_0…SPI_CS_3)

РЕЖИМЫ ТАКТИРОВАНИЯ (CPOL/CPHA)
  Режим  CPOL  CPHA  Описание
  ──────────────────────────────────────────────────────────
  SPI 0   0     0    Покой LOW, захват по нарастающему фронту
  SPI 1   0     1    Покой LOW, захват по спадающему фронту
  SPI 2   1     0    Покой HIGH, захват по спадающему фронту
  SPI 3   1     1    Покой HIGH, захват по нарастающему фронту

ДЕЛИТЕЛИ ЧАСТОТЫ (CONFIG.BAUD_DIV)
  000 = /2   → при 32 МГц: f_SPI = 16 МГц  (максимум!)
  001 = /4   → 8 МГц
  010 = /8   → 4 МГц
  011 = /16  → 2 МГц
  100 = /32  → 1 МГц
  101 = /64  → 500 кГц
  110 = /128 → 250 кГц
  111 = /256 → 125 кГц

РЕГИСТР STATUS (0x04) — флаги FIFO и ошибок
  Бит [15]  SPI_ACTIVE             — транзакция активна
  Бит [6]   TX_FIFO_UNDERFLOW      — попытка передачи при пустом TX FIFO (ошибка!)
  Бит [5]   RX_FIFO_FULL           — RX FIFO переполнен
  Бит [4]   RX_FIFO_NOT_EMPTY      — в RX FIFO есть данные для чтения
  Бит [3]   TX_FIFO_FULL           — TX FIFO полон
  Бит [2]   TX_FIFO_NOT_FULL       — TX FIFO принимает данные
  Бит [1]   MODE_FAIL              — конфликт: обнаружена активность ведомого (MODF)
  Бит [0]   RX_OVERFLOW            — RX FIFO переполнен, данные потеряны

РЕГИСТР ENABLE (0x14)
  Бит [3]   CLEAR_RX_FIFO  — сброс буфера приёма
  Бит [2]   CLEAR_TX_FIFO  — сброс буфера передачи
  Бит [0]   SPI_ENABLE     — включить модуль SPI

РЕГИСТР DELAY (0x18)
  Биты [31:16]  BTWN   — задержка между транзакциями (в тактах SCK)
  Биты [15:8]   AFTER  — задержка после снятия CS
  Биты [7:0]    INIT   — задержка перед первым SCK после активации CS

ВЫБОР ВЕДОМОГО (CS)
SPI MIK32 аппаратно поддерживает до 4 линий CS (SPI_CS_0 … SPI_CS_3).
  SPI_MANUALCS_OFF — аппаратное управление: CS активируется автоматически при начале транзакции и снимается по завершении каждой посылки.
  SPI_MANUALCS_ON  — ручное управление: HAL_SPI_CS_Enable(&hspi, CS_N) / HAL_SPI_CS_Disable(&hspi, CS_N). Используется для передачи нескольких байт подряд без снятия CS.

РАБОТА С FIFO
TX FIFO и RX FIFO — 8-слотовые буферы. ThresholdTX задаёт уровень «не полно» TX FIFO для генерации прерывания. Операции с FIFO:
  Передача: запись в TXD → данные помещаются в TX FIFO → SPI выталкивает их побайтово
  Приём:   SPI захватывает данные → помещает в RX FIFO → программа читает из RXD

РЕЖИМ DMA
SPI поддерживает подачу/чтение данных через DMA, что устраняет прерывания от каждого байта. Для активации: dma_tx_request и dma_rx_request в конфигурации DMA-канала (DMA_REQUEST_SPI0_TX, DMA_REQUEST_SPI0_RX и аналогичные для SPI_1).`,
    codes: [
      {
        title: "SPI Master — обмен 20 байтами",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_spi.h"
#include "uart_lib.h"
#include "xprintf.h"

/*
 * SPI_0 в режиме мастера: передача и приём 20 байт по CS0.
 * Режим: CPOL=1 (SCK HIGH в покое), CPHA=1 (данные по второму фронту).
 * Делитель частоты: /64 → f_SPI = 32/64 = 0.5 МГц.
 */

SPI_HandleTypeDef hspi0;

void SystemClock_Config(void);
static void SPI0_Init(void);

int main(void)
{
    SystemClock_Config();
    UART_Init(UART_0, 3333, UART_CONTROL1_TE_M | UART_CONTROL1_M_8BIT_M, 0, 0);
    SPI0_Init();

    uint8_t master_tx[] = {0xA0,0xA1,0xA2,0xA3,0xA4,
                           0xA5,0xA6,0xA7,0xA8,0xA9,
                           0xB0,0xB1,0xB2,0xB3,0xB4,
                           0xB5,0xB6,0xB7,0xB8,0xB9};
    uint8_t master_rx[sizeof(master_tx)];

    while (1)
    {
        /* Обмен данными: TX и RX одновременно (full-duplex) */
        HAL_StatusTypeDef status = HAL_SPI_Exchange(
            &hspi0, master_tx, master_rx,
            sizeof(master_tx), SPI_TIMEOUT_DEFAULT);

        if (status != HAL_OK)
        {
            xprintf("SPI Error %d (OVR=%d MODF=%d)\\n",
                    status,
                    hspi0.ErrorCode & HAL_SPI_ERROR_OVR,
                    hspi0.ErrorCode & HAL_SPI_ERROR_MODF);
            HAL_SPI_ClearError(&hspi0);
        }

        for (uint32_t i = 0; i < sizeof(master_rx); i++)
            xprintf("RX[%02u] = 0x%02X\\n", i, master_rx[i]);
        xprintf("\\n");

        for (volatile int i = 0; i < 1000000; i++);
    }
}

static void SPI0_Init(void)
{
    hspi0.Instance = SPI_0;

    hspi0.Init.SPI_Mode     = HAL_SPI_MODE_MASTER;
    hspi0.Init.CLKPhase     = SPI_PHASE_ON;       /* CPHA=1 */
    hspi0.Init.CLKPolarity  = SPI_POLARITY_HIGH;  /* CPOL=1 */
    hspi0.Init.ThresholdTX  = 4;                  /* FIFO порог TX */
    hspi0.Init.BaudRateDiv  = SPI_BAUDRATE_DIV64;
    hspi0.Init.Decoder      = SPI_DECODER_NONE;
    hspi0.Init.ManualCS     = SPI_MANUALCS_OFF;   /* Автоматический CS */
    hspi0.Init.ChipSelect   = SPI_CS_0;

    HAL_SPI_Init(&hspi0);
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
}`
      }
    ],
    keyFunctions: ["HAL_SPI_Init()", "HAL_SPI_Exchange()", "HAL_SPI_Transmit()", "HAL_SPI_Receive()", "HAL_SPI_CS_Enable()", "HAL_SPI_CS_Disable()", "HAL_SPI_ClearError()"]
  },
  {
    id: "8-i2c",
    title: "I2C — Межинтегральная схема",
    shortDescription: "Двухпроводной интерфейс (SDA/SCL): режимы Master/Slave, настройка частоты через PRESC/SCLDEL/SDADEL/SCLH/SCLL, аналоговый и цифровой фильтры.",
    theory: `I2C (Inter-Integrated Circuit) — двухпроводной синхронный последовательный интерфейс с открытым стоком, разработанный компанией Philips (ныне NXP). Поддерживает многоустройственные шины (multimaster, multislave). MIK32 содержит два модуля: I2C_0 и I2C_1, расположенных в пространстве APB_P.

АДРЕСА МОДУЛЕЙ В КАРТЕ ПАМЯТИ
  I2C_0 — база 0x00084000
  I2C_1 — база 0x00084400

ФИЗИЧЕСКИЙ УРОВЕНЬ
  SCL — тактовый сигнал с открытым стоком (Serial Clock), генерируется мастером
  SDA — двунаправленная линия данных с открытым стоком (Serial Data)
Обе линии требуют внешних подтягивающих резисторов к VDD:
  Standard Mode (100 кГц): 4,7 кОм
  Fast Mode (400 кГц):     2,2 кОм
  Fast Mode Plus (1 МГц):  1 кОм (при соответствующей нагрузке)

ПРОТОКОЛ ПЕРЕДАЧИ
  START  → АДРЕС (7 бит) + R/W (1 бит) → ACK → ДАННЫЕ (8 бит) × N → ACK/NACK → STOP
  REPEATED START — повторный старт без освобождения шины (для транзакций чтения после записи)
  
Биты передаются MSB-first. Ведомый отвечает битом ACK (SDA = LOW) после каждого байта.

РЕГИСТРОВАЯ КАРТА I2C (смещения от базы)
  Смещение  Имя        Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      CR1        Управляющий регистр 1 (общая конфигурация)
  0x04      CR2        Управляющий регистр 2 (адрес/направление/размер)
  0x08      OAR1       Собственный адрес 1 (режим ведомого)
  0x0C      OAR2       Собственный адрес 2 (режим ведомого, дополнительный)
  0x10      TIMINGR    Регистр временны́х параметров SCL/SDA
  0x14      TIMEOUTR   Регистр таймаута шины
  0x18      ISR        Регистр статуса прерываний (READ ONLY)
  0x1C      ICR        Регистр сброса флагов (WRITE ONLY)
  0x20      PECR       Регистр PEC (Packet Error Checking)
  0x24      RXDR       Регистр принятых данных (READ ONLY)
  0x28      TXDR       Регистр передаваемых данных (WRITE ONLY)

РЕГИСТР TIMINGR — расчёт временны́х параметров
Для f_I2C = 32 МГц (APB):
  t_I2C = 1 / f_I2C = 31,25 нс
  t_presc = (PRESC + 1) × t_I2C

Поля TIMINGR:
  Биты [31:28]  PRESC  — предделитель (0…15)
  Биты [23:20]  SCLDEL — задержка данных SDA после START/REPEATED_START (такты предделителя)
  Биты [19:16]  SDADEL — задержка SDA после спадающего фронта SCL
  Биты [15:8]   SCLH   — длительность высокого уровня SCL
  Биты [7:0]    SCLL   — длительность низкого уровня SCL

Пример расчёта для 100 кГц при APB = 32 МГц:
  PRESC = 7  → t_presc = 8 × 31,25 нс = 250 нс
  SCLL  = 19 → t_SCLL  = 20 × 250 нс = 5000 нс (5 мкс)
  SCLH  = 15 → t_SCLH  = 16 × 250 нс = 4000 нс (4 мкс)
  f_SCL = 1 / (t_SCLL + t_SCLH) ≈ 1 / 9 мкс ≈ 111 кГц ≈ 100 кГц (с учётом задержек)

Пример расчёта для 400 кГц при APB = 32 МГц:
  PRESC = 1  → t_presc = 2 × 31,25 нс = 62,5 нс
  SCLL  = 9  → t_SCLL  = 10 × 62,5 нс = 625 нс
  SCLH  = 3  → t_SCLH  = 4 × 62,5 нс  = 250 нс
  f_SCL ≈ 1 / 875 нс ≈ 400 кГц (приближённо)

ФИЛЬТРЫ ПОМЕХ
  Цифровой фильтр (CR1.DNF): значение 1…15 — отбрасывать импульсы длительностью ≤ N тактов APB.
  Аналоговый фильтр (CR1.ANFOFF = 0): встроенный RC-фильтр подавляет импульсы длительностью ≤ 50 нс.
  При активном цифровом фильтре необходимо корректировать TIMINGR.

РЕЖИМЫ РАБОТЫ
  Master Transmit — мастер отправляет N байт ведомому (адрес + запись)
  Master Receive  — мастер считывает N байт от ведомого (адрес + чтение)
  Slave Transmit  — ведомый отвечает данными по запросу мастера
  Slave Receive   — ведомый принимает данные от мастера

АВТОМАТИЧЕСКОЕ ЗАВЕРШЕНИЕ (CR2.AUTOEND)
  I2C_AUTOEND_ENABLE  — STOP генерируется аппаратно после передачи NBYTES байт
  I2C_AUTOEND_DISABLE — требуется программный STOP (CR2 |= I2C_CR2_STOP_M)

РЕГИСТР ISR — флаги состояния
  TXIS — регистр TXDR пуст, можно записать следующий байт
  RXNE — в RXDR есть принятый байт для чтения
  ADDR — ведомый распознал свой адрес (адрес совпал)
  NACKF — получен NACK (ошибка)
  STOPF — обнаружен STOP на шине
  TC   — передача N байт завершена (в режиме AUTOEND_DISABLE)
  BUSY — шина занята

ОБРАБОТКА ОШИБОК
  HAL_I2C_Reset(&hi2c) — полный сброс модуля (при обнаружении NACK или зависании шины)
  Зависание шины (Bus Hang): если ведомый удерживает SDA = LOW, можно освободить шину принудительными тактами SCL программно (9 импульсов SCL).`,
    codes: [
      {
        title: "I2C Master — запись и чтение 10 байт по адресу 0x36",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_i2c.h"
#include "uart_lib.h"
#include "xprintf.h"

/*
 * I2C_0 в режиме мастера.
 * Запись 10 байт по адресу 0x36, затем чтение обратно.
 * Используется режим AutoEnd (STOP генерируется автоматически).
 */

I2C_HandleTypeDef hi2c0;

void SystemClock_Config(void);
static void I2C0_Init(void);

int main(void)
{
    SystemClock_Config();
    UART_Init(UART_0, 3333, UART_CONTROL1_TE_M | UART_CONTROL1_M_8BIT_M, 0, 0);
    I2C0_Init();

    uint8_t data[10];
    HAL_StatusTypeDef err;

    while (1)
    {
        /* Подготовить данные */
        for (int i = 0; i < 10; i++) data[i] = (uint8_t)i;

        /* --- Запись по I2C адресу 0x36 --- */
        xprintf("\\nMaster Write -> 0x36\\n");
        err = HAL_I2C_Master_Transmit(&hi2c0, 0x36, data, sizeof(data),
                                       I2C_TIMEOUT_DEFAULT);
        if (err != HAL_OK)
        {
            xprintf("Transmit error #%d, ISR=0x%08X\\n",
                    err, hi2c0.Instance->ISR);
            HAL_I2C_Reset(&hi2c0);
        }

        for (volatile int i = 0; i < 1000000; i++);

        /* --- Чтение с I2C адреса 0x36 --- */
        xprintf("Master Read  <- 0x36\\n");
        err = HAL_I2C_Master_Receive(&hi2c0, 0x36, data, sizeof(data),
                                      I2C_TIMEOUT_DEFAULT);
        if (err != HAL_OK)
        {
            xprintf("Receive error #%d, ISR=0x%08X\\n",
                    err, hi2c0.Instance->ISR);
            HAL_I2C_Reset(&hi2c0);
        }
        else
        {
            for (int i = 0; i < 10; i++)
                xprintf("data[%d] = %u\\n", i, data[i]);
        }

        for (volatile int i = 0; i < 1000000; i++);
    }
}

static void I2C0_Init(void)
{
    hi2c0.Instance = I2C_0;
    hi2c0.Init.Mode          = HAL_I2C_MODE_MASTER;
    hi2c0.Init.DigitalFilter = I2C_DIGITALFILTER_OFF;
    hi2c0.Init.AnalogFilter  = I2C_ANALOGFILTER_DISABLE;
    hi2c0.Init.AutoEnd       = I2C_AUTOEND_ENABLE;

    /* Настройка временны́х параметров (примерно 100 кГц при 32 МГц APB) */
    hi2c0.Clock.PRESC  = 1;
    hi2c0.Clock.SCLDEL = 1;
    hi2c0.Clock.SDADEL = 1;
    hi2c0.Clock.SCLH   = 1;
    hi2c0.Clock.SCLL   = 1;

    HAL_I2C_Init(&hi2c0);
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
}`
      }
    ],
    keyFunctions: ["HAL_I2C_Init()", "HAL_I2C_Master_Transmit()", "HAL_I2C_Master_Receive()", "HAL_I2C_Slave_Transmit()", "HAL_I2C_Slave_Receive()", "HAL_I2C_Reset()"]
  },
  {
    id: "9-usart",
    title: "USART — Универсальный приёмопередатчик",
    shortDescription: "Асинхронный и синхронный режимы, настройка baud rate, 8/9-битный фрейм, аппаратный контроль потока, DMA, прерывания.",
    theory: `USART (Universal Synchronous/Asynchronous Receiver/Transmitter) — универсальный приёмопередатчик, поддерживающий как асинхронный (UART), так и синхронный (с тактовым сигналом XCK) режимы работы. MIK32 содержит два модуля: UART_0 и UART_1, расположенных в пространстве APB_P. Совместим с уровнями сигналов 3,3 В; для RS-232 (±12 В) необходимо внешнее согласование (например, MAX3232).

АДРЕСА МОДУЛЕЙ В КАРТЕ ПАМЯТИ
  UART_0 — база 0x00085000
  UART_1 — база 0x00085400

РЕГИСТРОВАЯ КАРТА UART (смещения от базы)
  Смещение  Имя         Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      CONTROL1    Основные настройки (вкл/откл TX/RX, чётность, длина слова)
  0x04      CONTROL2    Режим, стоп-биты, тактирование XCK
  0x08      CONTROL3    Аппаратный контроль потока, DMA
  0x0C      DIVIDER     Делитель скорости (BRR: целая + дробная часть)
  0x10      FLAGS       Регистр флагов состояния (READ ONLY)
  0x14      INTMASK     Маска прерываний
  0x18      RXDATA      Регистр принятых данных (READ ONLY)
  0x1C      TXDATA      Регистр передаваемых данных (WRITE ONLY)

РЕГИСТР CONTROL1 (0x00) — ключевые биты
  Бит [0]   UE    — включить UART (1 = работает)
  Бит [2]   RE    — включить приёмник (Receiver Enable)
  Бит [3]   TE    — включить передатчик (Transmitter Enable)
  Бит [9]   PS    — чётность: 0 = чётная (Even), 1 = нечётная (Odd)
  Бит [10]  PCE   — включить контроль чётности
  Бит [12]  M0    — длина слова: 0 = 8 бит, 1 = 9 бит
  Бит [28]  M1    — длина слова (вместе с M0): 00 = 8 бит, 01 = 9 бит, 10 = 7 бит

РЕГИСТР CONTROL2 (0x04)
  Биты [13:12]  STOP  — количество стоп-битов: 00 = 1, 01 = 0.5, 10 = 2, 11 = 1.5
  Бит  [11]     CLKEN — синхронный режим: выводить тактовый сигнал XCK
  Бит  [10]     CPOL  — полярность XCK (при синхронном режиме)
  Бит  [9]      CPHA  — фаза XCK
  Бит  [8]      LBCL  — тактировать последний бит XCK
  Бит  [4]      ADDM7 — режим адресации (0 = 4-битный, 1 = 7-битный, для MultiProcessor)

РЕГИСТР CONTROL3 (0x08)
  Бит [3]  HDSEL — режим полудуплекса (один вывод для TX и RX)
  Бит [6]  DMAT  — запрос DMA для передачи
  Бит [7]  DMAR  — запрос DMA для приёма
  Бит [8]  RTSE  — аппаратный RTS (Request To Send)
  Бит [9]  CTSE  — аппаратный CTS (Clear To Send)
  Бит [14] DE    — включить Driver Enable (для RS-485)

РАСЧЁТ СКОРОСТИ ПЕРЕДАЧИ (BRR)
Делитель скорости вычисляется по формуле:
  BRR = ROUND(f_APB / baudrate)
Примеры при f_APB = 32 МГц:
  9600 бод:   BRR = 32000000 / 9600   = 3333  (фактическая погрешность: 0,003%)
  115200 бод: BRR = 32000000 / 115200 = 277,8 ≈ 278 (погрешность: 0,08%)
  1000000 бод: BRR = 32000000 / 1000000 = 32 (погрешность: 0%)

HAL автоматически вычисляет BRR по заданному полю baudrate в структуре.

РЕГИСТР FLAGS (0x10) — флаги состояния
  Бит [0]  PE    — ошибка чётности
  Бит [1]  FE    — ошибка фрейма (не обнаружен стоп-бит)
  Бит [2]  NF    — обнаружен шум
  Бит [3]  ORE   — ошибка переполнения буфера (данные потеряны)
  Бит [4]  IDLE  — линия простаивает (IDLE line detected)
  Бит [5]  RXNE  — буфер приёма не пуст (данные готовы для чтения)
  Бит [6]  TC    — передача завершена (TX FIFO пуст + ведущий передал всё)
  Бит [7]  TXE   — буфер передачи пуст (можно записать следующий байт)
  Бит [9]  CTSIF — изменение состояния CTS

СТРУКТУРА АСИНХРОННОГО ФРЕЙМА (8N1)
  ___|START|D0|D1|D2|D3|D4|D5|D6|D7|STOP|___
  Длительность бита: 1 / baudrate (с)
  При 9600 бод: 1 бит ≈ 104,2 мкс; полный фрейм 10 бит ≈ 1042 мкс

АППАРАТНЫЙ КОНТРОЛЬ ПОТОКА
  RTS/CTS — стандартный аппаратный контроль потока:
    RTS (выход МК): МК удерживает LOW, когда готов принимать данные
    CTS (вход МК): МК не передаёт, пока ведомый удерживает CTS = HIGH
  DTR/DSR, DCD, RI — поля структуры Modem (для полной RS-232 совместимости)

РЕЖИМ RS-485 (Driver Enable)
При CONTROL3.DE = 1 вывод DE автоматически активируется во время передачи. Используется для управления направлением линии RS-485 (differential pair).

РАБОТА С DMA
  dma_tx_request = Enable → запрос DMA при каждом освобождении TX
  dma_rx_request = Enable → запрос DMA при каждом принятом байте
Это позволяет передавать/принимать большие массивы данных без прерываний CPU.`,
    codes: [
      {
        title: "USART — эхо-сервер (приём строки, отправка обратно)",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_usart.h"

/*
 * Эхо-сервер: принимает строку по UART0 до символа '\\n',
 * затем отправляет принятую строку обратно.
 *
 * Подключение: через USB-UART адаптер к разъёму UART0 на плате.
 * Настройки терминала: 9600 8N1.
 */

#define BUFFER_LENGTH  50

USART_HandleTypeDef husart0;

void SystemClock_Config(void);
void USART_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();

    HAL_USART_Print(&husart0, "MIK32 UART Echo Server\\n", USART_TIMEOUT_DEFAULT);

    char buf[BUFFER_LENGTH];
    uint8_t ptr = 0;

    while (1)
    {
        /* Принять один символ */
        HAL_USART_Receive(&husart0, (uint8_t *)(buf + ptr), USART_TIMEOUT_DEFAULT);

        if (buf[ptr] == '\\n')
        {
            buf[ptr] = '\\0';
            ptr = 0;
            /* Отправить принятую строку обратно */
            HAL_USART_Print(&husart0, buf, USART_TIMEOUT_DEFAULT);
            HAL_USART_Transmit(&husart0, '\\n', USART_TIMEOUT_DEFAULT);
        }
        else
        {
            if (++ptr >= BUFFER_LENGTH) ptr = 0;  /* Защита от переполнения */
        }
    }
}

void USART_Init(void)
{
    husart0.Instance              = UART_0;
    husart0.transmitting          = Enable;
    husart0.receiving             = Enable;
    husart0.frame                 = Frame_8bit;
    husart0.parity_bit            = Disable;
    husart0.parity_bit_inversion  = Disable;
    husart0.bit_direction         = LSB_First;
    husart0.data_inversion        = Disable;
    husart0.tx_inversion          = Disable;
    husart0.rx_inversion          = Disable;
    husart0.swap                  = Disable;
    husart0.lbm                   = Disable;
    husart0.stop_bit              = StopBit_1;
    husart0.mode                  = Asynchronous_Mode;
    husart0.xck_mode              = XCK_Mode3;
    husart0.last_byte_clock       = Disable;
    husart0.overwrite             = Disable;
    husart0.rts_mode              = AlwaysEnable_mode;
    husart0.dma_tx_request        = Disable;
    husart0.dma_rx_request        = Disable;
    husart0.channel_mode          = Duplex_Mode;
    husart0.tx_break_mode         = Disable;
    husart0.Modem.rts             = Disable;
    husart0.Modem.cts             = Disable;
    husart0.Modem.dtr             = Disable;
    husart0.Modem.dcd             = Disable;
    husart0.Modem.dsr             = Disable;
    husart0.Modem.ri              = Disable;
    husart0.Modem.ddis            = Disable;
    husart0.baudrate              = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["HAL_USART_Init()", "HAL_USART_Print()", "HAL_USART_Transmit()", "HAL_USART_Receive()", "HAL_USART_TransmitBuf()", "HAL_USART_ReceiveBuf()"]
  },
  {
    id: "10-dma",
    title: "DMA — Прямой доступ к памяти",
    shortDescription: "4-канальный контроллер DMA: режимы Memory-to-Memory, Peripheral-to-Memory, Memory-to-Peripheral; 4 уровня приоритетов, поддержка SPI/I2C/UART/Timer32/Crypto.",
    theory: `DMA (Direct Memory Access) — контроллер прямого доступа к памяти, позволяющий организовывать передачи данных между ОЗУ, EEPROM и регистрами периферии без участия процессорного ядра SCR1. Освобождение CPU во время длинных передач позволяет выполнять вычислительные задачи параллельно с вводом/выводом. Контроллер DMA расположен на шине AHB, что обеспечивает максимальную пропускную способность.

АДРЕС КОНТРОЛЛЕРА В КАРТЕ ПАМЯТИ
  DMA_CONFIG — база 0x00040000 (шина AHB)

ХАРАКТЕРИСТИКИ DMA MIK32
  • 4 независимых канала: DMA_CHANNEL_0 … DMA_CHANNEL_3
  • 4 уровня приоритетов: VERY_HIGH (11), HIGH (10), MEDIUM (01), LOW (00)
  • Режимы передачи:
      Memory-to-Memory    : WRITE_MODE=MEMORY, READ_MODE=MEMORY
      Peripheral-to-Memory: WRITE_MODE=MEMORY, READ_MODE=PERIPHERY
      Memory-to-Peripheral: WRITE_MODE=PERIPHERY, READ_MODE=MEMORY
      Peripheral-to-Peripheral: WRITE_MODE=PERIPHERY, READ_MODE=PERIPHERY
  • Размеры элемента: BYTE (1 байт), HALFWORD (2 байта), WORD (4 байта)
  • Инкремент адреса: READ_INCREMENT / WRITE_INCREMENT (вкл/откл)
  • Burst-режим: 2^BurstSize элементов за одну транзакцию (BurstSize: 0…3 → 1,2,4,8)

РЕГИСТРОВАЯ КАРТА КАНАЛА DMA
Каждый из 4 каналов имеет следующий набор регистров:
  DMA_CH_CFG      — конфигурация канала (32 бит)
  DMA_CH_LEN      — количество байт для передачи
  DMA_CH_READ_ADDR  — адрес источника
  DMA_CH_WRITE_ADDR — адрес назначения

РЕГИСТР DMA_CH_CFG — битовые поля
  Бит  [0]      ENABLE         — включить канал (1 = старт)
  Биты [2:1]    PRIOR          — приоритет (00=LOW, 01=MEDIUM, 10=HIGH, 11=VERY_HIGH)
  Бит  [3]      READ_MODE      — источник: 0=периферия, 1=память
  Бит  [4]      WRITE_MODE     — назначение: 0=периферия, 1=память
  Бит  [5]      READ_INCREMENT — инкрементировать адрес источника
  Бит  [6]      WRITE_INCREMENT— инкрементировать адрес назначения
  Биты [8:7]    READ_SIZE      — размер чтения: 00=BYTE, 01=HALFWORD, 10=WORD
  Биты [10:9]   WRITE_SIZE     — размер записи: 00=BYTE, 01=HALFWORD, 10=WORD
  Биты [13:11]  READ_BURST_SIZE— burst при чтении: N → 2^N элементов
  Биты [16:14]  WRITE_BURST_SIZE — burst при записи
  Биты [20:17]  READ_REQUEST   — номер DMA-запроса источника (для периферии)
  Биты [24:21]  WRITE_REQUEST  — номер DMA-запроса назначения
  Бит  [25]     READ_ACK_EN    — подтверждение чтения
  Бит  [26]     WRITE_ACK_EN   — подтверждение записи
  Бит  [27]     IRQ_EN         — прерывание по завершению передачи

ТАБЛИЦА ЗАПРОСОВ ПЕРИФЕРИИ (READ_REQUEST / WRITE_REQUEST)
  Номер  Периферия              TX/RX
  ───────────────────────────────────────────────────
  0      ---                    ---
  1      SPI_0                  TX
  2      SPI_0                  RX
  3      SPI_1                  TX
  4      SPI_1                  RX
  5      UART_0                 TX
  6      UART_0                 RX
  7      UART_1                 TX
  8      UART_1                 RX
  9      I2C_0                  TX
  10     I2C_0                  RX
  11     I2C_1                  TX
  12     I2C_1                  RX
  13     TIMER32_1 CH0…CH3      —
  14     TIMER32_2 CH0…CH3      —
  15     CRYPTO                 TX/RX
(Точный список см. в технической документации MIK32 Ref Manual)

ОГРАНИЧЕНИЯ НА РАЗМЕРЫ ПЕРЕДАЧ
  • Количество байт (LEN) должно быть кратно READ_SIZE и WRITE_SIZE.
  • BurstSize должен быть совместим с размером элемента (BurstSize ≥ 1).
  • При несоответствии размеров возникает выравнивание с потерей данных.

ПОРЯДОК ИНИЦИАЛИЗАЦИИ DMA-КАНАЛА
  1. HAL_DMA_Init(&hdma) — инициализировать контроллер DMA (DMA_CONFIG, CurrentValue)
  2. Заполнить DMA_ChannelHandleTypeDef: Channel, Priority, ReadMode/WriteMode, размеры, burst, request
  3. HAL_DMA_Start(&hdma_ch, src, dst, len) — запустить передачу
  4. HAL_DMA_Wait(&hdma_ch, timeout) или HAL_DMA_IsComplete — ожидать завершения
  5. Проверить статус на ошибки шины (BUS_ERROR_READ / BUS_ERROR_WRITE)

РЕЖИМ ПРЕРЫВАНИЯ (IRQ_EN = 1)
По завершении передачи генерируется прерывание через EPIC. В обработчике прерывания необходимо сбросить флаг и при необходимости перезапустить канал.

ТИПОВЫЕ ПРИМЕНЕНИЯ
  • Приём пакета UART в кольцевой буфер без программной обработки каждого байта
  • Передача таблицы синуса в ЦАП для генерации аналогового сигнала
  • Вычисление CRC32 над большим массивом данных во Flash/ОЗУ
  • Шифрование блока данных с помощью крипто-ускорителя ГОСТ/AES`,
    codes: [
      {
        title: "DMA Memory-to-Memory — копирование массива слов",
        code: `#include "mik32_hal.h"
#include "mik32_hal_pcc.h"
#include "mik32_hal_dma.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Копирование массива из 4 слов (WORD) через DMA канал 0.
 * Приоритет: VERY_HIGH. Размер: DMA_CHANNEL_SIZE_WORD (32 бит).
 * Burst: 2 элемента за транзакцию.
 * После завершения — вывод результата по UART.
 */

DMA_InitTypeDef          hdma;
DMA_ChannelHandleTypeDef hdma_ch0;
USART_HandleTypeDef      husart0;

uint32_t word_src[] = {0xAAAAAAAA, 0xBBBBBBBB, 0xCCCCCCCC, 0xDDDDDDDD};
uint32_t word_dst[] = {0, 0, 0, 0};

void SystemClock_Config(void);
static void DMA_CH0_Init(DMA_InitTypeDef *hdma);
static void DMA_Init(void);
static void USART_Init(void);

int main(void)
{
    HAL_Init();
    SystemClock_Config();
    USART_Init();
    DMA_Init();

    /* Запуск передачи: src → dst, sizeof(word_src)-1 байт */
    HAL_DMA_Start(&hdma_ch0, word_src, word_dst, sizeof(word_src) - 1);

    /* Ожидание завершения с таймаутом */
    if (HAL_DMA_Wait(&hdma_ch0, DMA_TIMEOUT_DEFAULT) != HAL_OK)
    {
        xprintf("DMA Timeout!\\n");
    }

    /* Вывод скопированных данных */
    for (uint32_t i = 0; i < 4; i++)
        xprintf("word_dst[%d] = 0x%08X\\n", i, word_dst[i]);

    while (1) {}
}

static void DMA_CH0_Init(DMA_InitTypeDef *hdma)
{
    hdma_ch0.dma = hdma;

    hdma_ch0.ChannelInit.Channel  = DMA_CHANNEL_0;
    hdma_ch0.ChannelInit.Priority = DMA_CHANNEL_PRIORITY_VERY_HIGH;

    /* Источник: память с инкрементом, WORD, burst=2 */
    hdma_ch0.ChannelInit.ReadMode      = DMA_CHANNEL_MODE_MEMORY;
    hdma_ch0.ChannelInit.ReadInc       = DMA_CHANNEL_INC_ENABLE;
    hdma_ch0.ChannelInit.ReadSize      = DMA_CHANNEL_SIZE_WORD;
    hdma_ch0.ChannelInit.ReadBurstSize = 2;
    hdma_ch0.ChannelInit.ReadRequest   = 0;
    hdma_ch0.ChannelInit.ReadAck       = DMA_CHANNEL_ACK_DISABLE;

    /* Назначение: память с инкрементом, WORD, burst=2 */
    hdma_ch0.ChannelInit.WriteMode      = DMA_CHANNEL_MODE_MEMORY;
    hdma_ch0.ChannelInit.WriteInc       = DMA_CHANNEL_INC_ENABLE;
    hdma_ch0.ChannelInit.WriteSize      = DMA_CHANNEL_SIZE_WORD;
    hdma_ch0.ChannelInit.WriteBurstSize = 2;
    hdma_ch0.ChannelInit.WriteRequest   = 0;
    hdma_ch0.ChannelInit.WriteAck       = DMA_CHANNEL_ACK_DISABLE;
}

static void DMA_Init(void)
{
    hdma.Instance     = DMA_CONFIG;
    hdma.CurrentValue = DMA_CURRENT_VALUE_ENABLE;

    if (HAL_DMA_Init(&hdma) != HAL_OK)
        xprintf("DMA_Init Error!\\n");

    DMA_CH0_Init(&hdma);
}

static void USART_Init(void)
{
    husart0.Instance    = UART_0;
    husart0.transmitting = Enable;
    husart0.receiving   = Disable;
    husart0.baudrate    = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["HAL_DMA_Init()", "HAL_DMA_Start()", "HAL_DMA_Wait()", "HAL_DMA_Stop()", "HAL_DMA_IsComplete()"]
  },
  {
    id: "11-crc32",
    title: "CRC32 — Блок вычисления контрольных сумм",
    shortDescription: "Аппаратный вычислитель CRC: поддержка произвольных полиномов (CRC-32Q, CRC-32/MPEG-2, CRC-16 и др.), инверсия входа/выхода, пословая и побайтовая запись.",
    theory: `Блок CRC32 (Cyclic Redundancy Check) MIK32 — аппаратный вычислитель циклического избыточного кода. Реализует универсальный конвейерный алгоритм: за один такт APB обрабатывается одно слово (32 бит), что обеспечивает пиковую пропускную способность 32 МГц × 4 байта = 128 Мбайт/с. Контроллер расположен на шине AHB.

АДРЕС В КАРТЕ ПАМЯТИ
  CRC — база 0x00080000 (шина AHB)

МАТЕМАТИЧЕСКАЯ ОСНОВА
CRC-код — остаток от деления полиномиального представления сообщения M(x) на порождающий полином G(x) по модулю 2 (т. е. без переносов). При реализации «до нас идёт MSB»:
  CRC = M(x) mod G(x) в GF(2^32)
Стандартный полином CRC-32 (Ethernet, ZIP, PNG): G(x) = x^32+x^26+x^23+x^22+x^16+x^12+x^11+x^10+x^8+x^7+x^5+x^4+x^2+x+1 = 0x04C11DB7.

РЕГИСТРОВАЯ КАРТА CRC (смещения от базы)
  Смещение  Имя           Описание
  ──────────────────────────────────────────────────────────────────────
  0x00      CRC_POLY      Полином (полное 32-битное значение без старшего бита)
  0x04      CRC_INIT      Начальное значение регистра CRC
  0x08      CRC_CONTROL   Управление: направление битов, XOR выхода
  0x0C      CRC_DATA      Регистр записи данных (1 байт или 4 байта)
  0x10      CRC_VALUE     Текущий результат CRC (READ ONLY)

РЕГИСТР CRC_CONTROL — битовые поля
  Бит [0]  REFIN  — битовый реверс каждого входного байта (0 = без реверса; 1 = LSB first)
  Бит [1]  REFOUT — битовый реверс выходного значения CRC
  Бит [2]  XOROUT — XOR выхода с 0xFFFFFFFF (инверсия конечного результата)
  Бит [3]  RESET  — сброс регистра CRC в CRC_INIT (самосбрасывающийся бит)

ПАРАМЕТРЫ КОНФИГУРАЦИИ АЛГОРИТМОВ
  Алгоритм            Poly        Init        RefIn  RefOut  XorOut
  ─────────────────────────────────────────────────────────────────────────────
  CRC-32 (Ethernet)   0x04C11DB7  0xFFFFFFFF  true   true    0xFFFFFFFF
  CRC-32Q (авиац.)    0x814141AB  0x00000000  false  false   0x00000000
  CRC-32/MPEG-2       0x04C11DB7  0xFFFFFFFF  false  false   0x00000000
  CRC-32/BZIP2        0x04C11DB7  0xFFFFFFFF  false  false   0x00000000
  CRC-32/POSIX        0x04C11DB7  0x00000000  false  false   0xFFFFFFFF
  CRC-16/CCITT        0x00001021  0xFFFF      false  false   0x0000 (16-бит)

ВЕРИФИКАЦИОННЫЙ ТЕСТ
Строка «123456789» (ASCII: 0x31…0x39, 9 байт) является стандартным тест-вектором:
  CRC-32 (Ethernet):  0xCBF43926
  CRC-32Q:            0x3010BF7F
  CRC-32/MPEG-2:      0x0376E6E7

РАБОТА С DMA
Для вычисления CRC над большими массивами рекомендуется использовать DMA-канал (WriteRequest = DMA_REQUEST_CRC), что позволяет освободить CPU во время вычисления.

ИНТЕГРАЦИЯ В ПРОТОКОЛЫ
  • Ethernet FCS (Frame Check Sequence): CRC-32 (Ethernet) от заголовка + данных
  • PNG: CRC-32 (Ethernet) для каждого чанка
  • ZIP, GZIP: CRC-32 от содержимого файла
  • Авиационные протоколы (ARINC, DO-254): CRC-32Q
  • Верификация прошивок EEPROM/Flash: любой алгоритм по выбору разработчика`,
    codes: [
      {
        title: "Вычисление CRC32-Q для байтового массива и массива слов",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_crc32.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Вычисление CRC по алгоритму CRC-32Q.
 * Тест: сообщение "123456789" → ожидаемый результат 0x3010BF7F
 */

CRC_HandleTypeDef  hcrc;
USART_HandleTypeDef husart0;

void SystemClock_Config(void);
static void CRC_Init(void);
void USART_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();
    CRC_Init();

    /* Тест 1: побайтовая запись */
    uint8_t message[] = {'1','2','3','4','5','6','7','8','9'};
    HAL_CRC_WriteData(&hcrc, message, sizeof(message));
    uint32_t crc1 = HAL_CRC_ReadCRC(&hcrc);
    xprintf("CRC32-Q byte: 0x%08X (expected 0x3010BF7F) %s\\n",
            crc1, crc1 == 0x3010BF7F ? "OK" : "FAIL");

    /* Тест 2: пословная запись (32-бит) */
    uint32_t data[] = {0xABCDABCD, 0xA1B2C3D4};
    HAL_CRC_WriteData32(&hcrc, data, sizeof(data) / sizeof(*data));
    uint32_t crc2 = HAL_CRC_ReadCRC(&hcrc);
    xprintf("CRC32-Q word: 0x%08X (expected 0x6311BC18) %s\\n",
            crc2, crc2 == 0x6311BC18 ? "OK" : "FAIL");

    while (1) {}
}

static void CRC_Init(void)
{
    hcrc.Instance = CRC;

    /* Алгоритм CRC-32Q */
    hcrc.Poly            = 0x814141AB;
    hcrc.Init            = 0x00000000;
    hcrc.InputReverse    = CRC_REFIN_FALSE;
    hcrc.OutputReverse   = CRC_REFOUT_FALSE;
    hcrc.OutputInversion = CRC_OUTPUTINVERSION_OFF;

    HAL_CRC_Init(&hcrc);
}

void USART_Init(void)
{
    husart0.Instance    = UART_0;
    husart0.transmitting = Enable;
    husart0.receiving   = Disable;
    husart0.baudrate    = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["HAL_CRC_Init()", "HAL_CRC_WriteData()", "HAL_CRC_WriteData32()", "HAL_CRC_ReadCRC()"]
  },
  {
    id: "12-crypto",
    title: "Крипто-блок — Ускоритель симметричной криптографии",
    shortDescription: "Аппаратный блок с поддержкой ГОСТ Р 34.12-2015 (Кузнечик/Магма) и AES-128: режимы ECB/CBC/CTR/CFB/OFB, имитовставка, работа через DMA.",
    theory: `Аппаратный ускоритель симметричной криптографии MIK32 — редкая для класса микроконтроллеров функция, критически важная для российских встраиваемых систем, работающих в защищённых сегментах ИТ-инфраструктуры. Блок CRYPTO реализует несколько алгоритмов с аппаратным расписанием ключей и подстановочными таблицами (S-box). Расположен на шине AHB.

АДРЕС В КАРТЕ ПАМЯТИ
  CRYPTO — база 0x00080400 (шина AHB)

ПОДДЕРЖИВАЕМЫЕ АЛГОРИТМЫ
  Алгоритм                  Стандарт          Блок     Ключ    Описание
  ────────────────────────────────────────────────────────────────────────────────
  AES-128                   FIPS 197           128 бит  128 бит  Международный стандарт
  ГОСТ Р 34.12-2015 «Кузнечик» (Grasshopper)  128 бит  256 бит  Российский стандарт
  ГОСТ Р 34.12-2015 «Магма»                   64 бит   256 бит  Развитие ГОСТ 28147-89

AES-128 (Advanced Encryption Standard)
Состоит из 10 раундов преобразований: SubBytes (замена через S-box 8×8), ShiftRows (сдвиг строк), MixColumns (умножение в GF(2^8)), AddRoundKey (XOR с раундовым ключом). Аппаратное развёртывание ключа (Key Expansion) выполняется автоматически при загрузке ключа в CRYPTO_KEY[0..3].

ГОСТ «Кузнечик» (Grasshopper)
10 раундов нелинейного преобразования S + линейного L (над GF(2^8) с порождающим полиномом x^8+x^7+x^6+x+1). Ключ 256 бит → 10 раундовых ключей по 128 бит каждый. Аппаратное разворачивание ключа занимает несколько тактов AHB.

ГОСТ «Магма»
32 раунда сети Фейстеля с 8 S-box'ами 4×4 и сдвигом влево на 11 бит. Структурно — развитие советского ГОСТ 28147-89. Блок 64 бит требует особого внимания при выборе режима.

РЕЖИМЫ ШИФРОВАНИЯ
  Режим  Описание                                    Нужен IV  Параллелизм
  ─────────────────────────────────────────────────────────────────────────
  ECB    Electronic Codebook — независимые блоки     Нет       Да (небезопасно для длинных данных)
  CBC    Cipher Block Chaining — XOR с предыдущим    Да        Нет (последовательный)
  CFB    Cipher Feedback — потоковый режим           Да        Нет
  OFB    Output Feedback — потоковый режим           Да        Да (блоки независимы)
  CTR    Counter Mode — XOR счётчика                 Да (Nonce) Да (безопасно, рекомендуется)
  MAC    Имитовставка (Message Authentication Code)  Нет       Нет

ВЕКТОР ИНИЦИАЛИЗАЦИИ (IV)
В режимах CBC/CFB/OFB/CTR для каждого сеанса шифрования необходимо использовать случайный IV. Повторное использование одного IV с одним ключом — критическая уязвимость. IV загружается в регистры CRYPTO_IV[0..3] (128 бит = 4 × 32 бит).

РЕГИСТРОВАЯ КАРТА CRYPTO (смещения от базы)
  Смещение   Имя           Описание
  ───────────────────────────────────────────────────────────────────────────
  0x00       CRYPTO_CFG    Конфигурация (алгоритм, режим, направление)
  0x04       CRYPTO_CNT    Счётчик блоков
  0x08       CRYPTO_CTRL   Управление (запуск, сброс)
  0x0C       CRYPTO_STATUS Статус (занятость, готовность)
  0x10…0x1C  CRYPTO_KEY    Ключ [0..3] (128 бит для AES; первые 4 слова из 8 для ГОСТ)
  0x20…0x2C  CRYPTO_KEY_HI Ключ [4..7] (только для ГОСТ, вторые 128 бит)
  0x30…0x3C  CRYPTO_IV     Вектор инициализации (128 бит = 4 слова × 32 бит)
  0x40…0x4C  CRYPTO_DATA_IN  Блок входных данных (4 × 32 бит)
  0x50…0x5C  CRYPTO_DATA_OUT Блок выходных данных (4 × 32 бит, READ ONLY)

РЕГИСТР CRYPTO_CFG — поля
  Биты [2:0]  ALGO    — алгоритм: 000=AES128, 001=Кузнечик, 010=Магма
  Биты [5:3]  MODE    — режим: 000=ECB, 001=CTR, 010=OFB, 011=CBC, 100=CFB, 101=MAC
  Бит  [6]    DECRYPT — направление: 0=шифрование, 1=расшифрование
  Бит  [7]    DMA_EN  — включить DMA-режим (данные подаются через DMA)

ПОРЯДОК РАБОТЫ (без DMA)
  1. Загрузить ключ в CRYPTO_KEY[0..3] (и KEY_HI для ГОСТ)
  2. Задать IV в CRYPTO_IV[0..3] (для CBC/CTR/OFB/CFB)
  3. Настроить CRYPTO_CFG (алгоритм, режим, направление)
  4. Записать блок открытого/зашифрованного текста в CRYPTO_DATA_IN[0..3]
  5. Запустить (CRYPTO_CTRL.START = 1)
  6. Ождать сброса CRYPTO_STATUS.BUSY = 0
  7. Прочитать результат из CRYPTO_DATA_OUT[0..3]
  8. Повторить с п.4 для следующего блока

ИМИТОВСТАВКА (MAC) ПО ГОСТ Р 34.11-2012
  HAL_Crypto_MAC_Start(&hcrypto)     — инициализировать внутренний аккумулятор MAC
  HAL_Crypto_MAC_Feed(&hcrypto, data, len) — подать очередной блок данных
  HAL_Crypto_MAC_Done(&hcrypto, mac) — получить 64 или 128-битный MAC (зависит от алгоритма)

ПРОИЗВОДИТЕЛЬНОСТЬ
  AES-128 ECB при 32 МГц: ~32 Мбит/с (1 блок 128 бит ≈ 1 мкс)
  ГОСТ «Кузнечик» при 32 МГц: немного ниже из-за большего числа операций

НОРМАТИВНАЯ БАЗА
  • ГОСТ Р 34.12-2015: «Кузнечик» и «Магма» — утверждён Росстандартом
  • AES-128: FIPS 197, ISO/IEC 18033-3
  Применение аппаратного крипто-блока позволяет разрабатывать устройства, соответствующие требованиям ФСБ и ФСТЭК по защите информации.`,
    codes: [
      {
        title: "Шифрование и дешифрование AES-128 в режиме ECB",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_crypto.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Демонстрация AES-128 ECB:
 *  1. Шифрование открытого текста
 *  2. Дешифрование шифртекста
 *  3. Сравнение с исходным открытым текстом
 *
 * Ключ: 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F (128 бит)
 * Текст: 00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF
 */

Crypto_HandleTypeDef hcrypto;
USART_HandleTypeDef  husart0;

/* 128-битный ключ AES: 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F */
uint32_t aes_key[4] = {0x00010203, 0x04050607, 0x08090A0B, 0x0C0D0E0F};

void SystemClock_Config(void);
static void Crypto_Init(void);
void USART_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();
    Crypto_Init();

    uint32_t plaintext[4]  = {0x00112233, 0x44556677, 0x8899AABB, 0xCCDDEEFF};
    uint32_t ciphertext[4] = {0};
    uint32_t decrypted[4]  = {0};

    /* --- Задать режим и ключ перед операцией --- */
    HAL_Crypto_SetCipherMode(&hcrypto, CRYPTO_CIPHER_MODE_ECB);
    HAL_Crypto_SetKey(&hcrypto, aes_key);

    /* --- Шифрование --- */
    HAL_Crypto_Encode(&hcrypto, plaintext, ciphertext, 4);
    xprintf("Ciphertext:\\n");
    for (int i = 0; i < 4; i++)
        xprintf("  [%d] = 0x%08X\\n", i, ciphertext[i]);

    /* --- Дешифрование --- */
    HAL_Crypto_SetCipherMode(&hcrypto, CRYPTO_CIPHER_MODE_ECB);
    HAL_Crypto_SetKey(&hcrypto, aes_key);
    HAL_Crypto_Decode(&hcrypto, ciphertext, decrypted, 4);
    xprintf("Decrypted:\\n");
    int match = 1;
    for (int i = 0; i < 4; i++)
    {
        xprintf("  [%d] = 0x%08X %s\\n", i, decrypted[i],
                decrypted[i] == plaintext[i] ? "OK" : "MISMATCH");
        if (decrypted[i] != plaintext[i]) match = 0;
    }
    xprintf(match ? "AES-128 ECB: PASS\\n" : "AES-128 ECB: FAIL\\n");

    while (1) {}
}

static void Crypto_Init(void)
{
    hcrypto.Instance   = CRYPTO;
    hcrypto.Algorithm  = CRYPTO_ALG_AES128;
    hcrypto.CipherMode = CRYPTO_CIPHER_MODE_ECB;
    hcrypto.SwapMode   = CRYPTO_SWAP_MODE_NONE;
    hcrypto.OrderMode  = CRYPTO_ORDER_MODE_MSW;
    HAL_Crypto_Init(&hcrypto);
}

void USART_Init(void)
{
    husart0.Instance             = UART_0;
    husart0.transmitting         = Enable;
    husart0.receiving            = Disable;
    husart0.frame                = Frame_8bit;
    husart0.parity_bit           = Disable;
    husart0.parity_bit_inversion = Disable;
    husart0.bit_direction        = LSB_First;
    husart0.data_inversion       = Disable;
    husart0.tx_inversion         = Disable;
    husart0.rx_inversion         = Disable;
    husart0.swap                 = Disable;
    husart0.lbm                  = Disable;
    husart0.stop_bit             = StopBit_1;
    husart0.mode                 = Asynchronous_Mode;
    husart0.xck_mode             = XCK_Mode3;
    husart0.last_byte_clock      = Disable;
    husart0.overwrite            = Disable;
    husart0.rts_mode             = AlwaysEnable_mode;
    husart0.dma_tx_request       = Disable;
    husart0.dma_rx_request       = Disable;
    husart0.channel_mode         = Duplex_Mode;
    husart0.tx_break_mode        = Disable;
    husart0.Interrupt.ctsie      = Disable;
    husart0.Interrupt.eie        = Disable;
    husart0.Interrupt.idleie     = Disable;
    husart0.Interrupt.lbdie      = Disable;
    husart0.Interrupt.peie       = Disable;
    husart0.Interrupt.rxneie     = Disable;
    husart0.Interrupt.tcie       = Disable;
    husart0.Interrupt.txeie      = Disable;
    husart0.Modem.rts            = Disable;
    husart0.Modem.cts            = Disable;
    husart0.Modem.dtr            = Disable;
    husart0.Modem.dcd            = Disable;
    husart0.Modem.dsr            = Disable;
    husart0.Modem.ri             = Disable;
    husart0.Modem.ddis           = Disable;
    husart0.baudrate             = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["HAL_Crypto_Init()", "HAL_Crypto_SetCipherMode()", "HAL_Crypto_SetKey()", "HAL_Crypto_Encode()", "HAL_Crypto_Decode()", "HAL_Crypto_SetIV()", "HAL_Crypto_MAC_Start()", "HAL_Crypto_MAC_Feed()", "HAL_Crypto_MAC_Done()"]
  },
  {
    id: "13-dac",
    title: "DAC — Цифро-аналоговый преобразователь",
    shortDescription: "12-битный ЦАП, 2 канала, частота до 1 МГц, максимальное выходное напряжение 1,2 В, встроенное и внешнее опорное напряжение.",
    theory: `Цифро-аналоговый преобразователь (ЦАП/DAC) MIK32 реализует преобразование цифрового кода в аналоговое напряжение по принципу делителя напряжения с резистивной матрицей (R-2R ladder) или схемой суммирования токов. Модуль входит в состав аналогового блока ANALOG_REG, разделяя общий источник опорного напряжения с АЦП.

АДРЕС В КАРТЕ ПАМЯТИ
  ANALOG_REG (DAC + ADC + TSENS) — база 0x00081000 (APB_P)

ХАРАКТЕРИСТИКИ ЦАП MIK32
  • Разрядность: 12 бит (коды 0…4095)
  • Количество каналов: 2 независимых (Channel 0, Channel 1)
  • Максимальная частота обновления: до 1 МГц (при тактовой APB 32 МГц)
  • Выходной диапазон: 0 … U_ref (максимум 1,2 ± 0,1 В при внутреннем опоре)
  • Источник опорного напряжения: встроенный бандгап 1,2 В или внешний (вывод ADCREF)
  • Нагрузочная способность выхода: выход с открытым стоком, требует буфер для больших нагрузок

РЕГИСТРОВАЯ КАРТА ЦАП в ANALOG_REG
  Смещение  Имя           Описание
  ────────────────────────────────────────────────────────────────────────────
  0x00      DAC_CFG       Регистр конфигурации ЦАП (канал 0 и 1)
  0x04      DAC_DATA0     Выходной код канала 0 (биты [11:0])
  0x08      DAC_DATA1     Выходной код канала 1 (биты [11:0])

РЕГИСТР DAC_CFG (0x00) — поля
  Бит  [0]    EN        — включить ЦАП (1 = работает)
  Бит  [1]    RN        — сброс ЦАП (1 = сброс выхода в 0)
  Биты [9:2]  DIV       — делитель тактовой частоты ЦАП (0…255 → делитель 1…256)
  Бит  [10]   EXTEN     — источник опорного напряжения (0 = внутренний 1,2 В; 1 = внешний)
  Бит  [11]   EXTPAD    — включить вывод ADCREF как внешний опорный для ЦАП
  Бит  [13]   EMPTY_READ — флаг буфера (READ ONLY)

РАСЧЁТ ВЫХОДНОГО НАПРЯЖЕНИЯ
  U_вых = (DAC_DATA / 4095) × U_ref
При внутреннем опорном напряжении U_ref = 1200 мВ:
  DAC_DATA = 0    → U_вых ≈ 0,000 В
  DAC_DATA = 1024 → U_вых ≈ 0,300 В
  DAC_DATA = 2048 → U_вых ≈ 0,600 В
  DAC_DATA = 3072 → U_вых ≈ 0,899 В
  DAC_DATA = 4095 → U_вых ≈ 1,200 В

ДЕЛИТЕЛЬ ТАКТИРОВАНИЯ ЦАП
Поле DAC_CFG.DIV задаёт делитель частоты APB для ЦАП:
  f_DAC = f_APB / (DIV + 1)
  При DIV=0 (делитель 1): f_DAC = 32 МГц → максимальная скорость обновления
  При DIV=31 (делитель 32): f_DAC = 1 МГц
Скорость обновления выхода ограничена ёмкостью нагрузки и временем установки.

СИНХРОНИЗАЦИЯ С DMA ДЛЯ СИНТЕЗА СИГНАЛОВ
Наиболее эффективный способ генерации аналоговых сигналов — использование DMA-канала, который передаёт значения из таблицы (хранящейся в ОЗУ) в регистр DAC_DATA без участия CPU. Совместно с Timer32 (для точного управления скоростью обновления) это позволяет генерировать синусоиды, треугольные волны и произвольные формы сигналов.

Пример: генерация синуса 1 кГц, таблица 100 точек:
  f_DMA_trigger = 1000 × 100 = 100 000 Гц = 100 кГц
  Настройка Timer32 → overflow каждые 320 тактов (при 32 МГц) → запрос DMA

СХЕМОТЕХНИЧЕСКИЕ РЕКОМЕНДАЦИИ
  • Выход ЦАП нагружать через операционный усилитель-повторитель (буфер) с Rail-to-Rail входом.
  • Для выходного диапазона > 1,2 В использовать внешний ОУ с усилением: U_out = U_DAC × (1 + Rf/Rg).
  • Фильтрующий конденсатор 100 нФ между ADCREF и землёй обязателен.
  • ЦАП и АЦП совместно используют цепь опорного напряжения — не изменять конфигурацию опора во время работы одного из них.

ВСТРОЕННЫЙ ДАТЧИК ТЕМПЕРАТУРЫ (TSENS)
В состав ANALOG_REG помимо ЦАП и АЦП входит датчик температуры кристалла (TSENS):
  TSENS_VALUE_TO_CELSIUS(v) — макрос перевода кода TSENS в температуру (°C × 100)
  Диапазон измерений: −45 … +125 °C
  Разрешение: ~0,5 °C
Датчик полезен для компенсации температурного дрейфа параметров АЦП/ЦАП и защиты от перегрева.`,
    codes: [
      {
        title: "ЦАП — генерация синусоидального сигнала",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_dac.h"

/*
 * Генерация синусоидального сигнала на выходе ЦАП.
 * Таблица синуса: 64 точки, нормированные к диапазону 0..4095.
 * При частоте обновления ~10 кГц (1 мс задержка × 64 точки):
 *   f_sin ≈ 1000 / 64 ≈ 15.6 Гц.
 */

DAC_HandleTypeDef hdac;

/* Таблица синуса (64 точки, диапазон 0..4095, смещение до середины) */
static const uint16_t sine_table[64] = {
    2048, 2248, 2447, 2642, 2831, 3013, 3185, 3346,
    3495, 3630, 3750, 3853, 3939, 4007, 4056, 4085,
    4095, 4085, 4056, 4007, 3939, 3853, 3750, 3630,
    3495, 3346, 3185, 3013, 2831, 2642, 2447, 2248,
    2048, 1847, 1648, 1453, 1264, 1082,  910,  749,
     600,  465,  345,  242,  156,   88,   39,   10,
       0,   10,   39,   88,  156,  242,  345,  465,
     600,  749,  910, 1082, 1264, 1453, 1648, 1847
};

void SystemClock_Config(void);
static void DAC_Init(void);

int main(void)
{
    SystemClock_Config();
    DAC_Init();

    uint32_t idx = 0;

    while (1)
    {
        /* Установить код ЦАП из таблицы синуса */
        HAL_DAC_SetValue(&hdac, sine_table[idx]);
        idx = (idx + 1) % 64;

        /* Задержка определяет частоту синуса */
        for (volatile int i = 0; i < 500; i++);
    }
}

static void DAC_Init(void)
{
    hdac.Instance    = ANALOG_REG;
    hdac.Init.EXTRef = DAC_EXTREF_OFF; /* Встроенное ОИН 1,2 В */
    HAL_DAC_Init(&hdac);
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
}`
      }
    ],
    keyFunctions: ["HAL_DAC_Init()", "HAL_DAC_SetValue()", "HAL_DAC_Enable()", "HAL_DAC_Disable()"]
  },
  {
    id: "14-freertos",
    title: "FreeRTOS — Операционная система реального времени",
    shortDescription: "Многозадачность на MIK32: задачи (Tasks), очереди (Queues), семафоры, мьютексы, программные таймеры. Настройка FreeRTOSConfig.h.",
    theory: `FreeRTOS — открытая операционная система реального времени (RTOS), разработанная компанией Real Time Engineers Ltd и поддерживаемая Amazon (FreeRTOS/AWS). Порт для RISC-V (архитектура RV32IMC, ядро SCR1 MIK32) поставляется в составе MIK32 SDK. FreeRTOS обеспечивает детерминированное выполнение задач с гарантированным временем реакции на события.

КЛЮЧЕВЫЕ КОНЦЕПЦИИ FREERTOS

СОСТОЯНИЯ ЗАДАЧИ
Задача в любой момент находится в одном из четырёх состояний:
  Running   — выполняется на процессоре (только одна задача одновременно)
  Ready     — готова к выполнению, ожидает CPU
  Blocked   — ожидает события (таймер, очередь, семафор, vTaskDelay)
  Suspended — приостановлена (vTaskSuspend), не учитывается планировщиком

ПЛАНИРОВЩИК (SCHEDULER)
FreeRTOS использует вытесняющий приоритетный планировщик с квантованием времени (Round-Robin) для задач одного приоритета. Тик планировщика генерируется аппаратным таймером (scr1_timer / mtime CSR регистр RISC-V). Квант времени: 1/configTICK_RATE_HZ.

  vTaskStartScheduler() — запустить планировщик. Функция не возвращается при нормальной работе.
  При нехватке памяти на создание задачи idle — функция возвращает управление.

СОЗДАНИЕ ЗАДАЧ
  xTaskCreate(
      pvTaskCode,    // указатель на функцию задачи (void fn(void *))
      pcName,        // текстовое имя (для отладки)
      usStackDepth,  // глубина стека в СЛОВАХ (32 бит); типично 128…512
      pvParameters,  // параметр для функции задачи
      uxPriority,    // приоритет: 0 (idle) … configMAX_PRIORITIES-1
      pxCreatedTask  // handle задачи (можно NULL)
  )
Задача должна содержать бесконечный цикл и никогда не должна возвращать управление (или вызвать vTaskDelete(NULL) для самоудаления).

ПРИОРИТЕТЫ
Приоритет 0 — задача idle (встроенная, не блокирует CPU). Приоритет configMAX_PRIORITIES-1 — наивысший. При одинаковом приоритете задачи поочерёдно получают квант времени (round-robin).

ЗАДЕРЖКИ
  vTaskDelay(ticks) — перевести задачу в Blocked на N тиков (абсолютная задержка от момента вызова)
  vTaskDelayUntil(&lastWake, period) — периодический таймер с компенсацией дрейфа
  pdMS_TO_TICKS(ms) — макрос: ms × configTICK_RATE_HZ / 1000

ОЧЕРЕДИ (QUEUES) — FIFO буфер фиксированного размера
  QueueHandle_t q = xQueueCreate(uxQueueLength, uxItemSize)
  xQueueSend(q, &item, xTicksToWait)     — отправить (копирует item по значению)
  xQueueSendFromISR(q, &item, &woken)    — вызов из прерывания
  xQueueReceive(q, &item, xTicksToWait)  — получить (удаляет из очереди)
Очереди обеспечивают потокобезопасную передачу данных между задачами и прерываниями.

СЕМАФОРЫ
  xSemaphoreCreateBinary()   — двоичный (0/1); сигнализация задача→задача или ISR→задача
  xSemaphoreCreateCounting(maxCount, initCount) — счётный; пул ресурсов
  xSemaphoreTake(sem, timeout) — захватить (декрементировать); блокирует если 0
  xSemaphoreGive(sem)          — освободить (инкрементировать)
  xSemaphoreGiveFromISR(sem, &woken) — освободить из прерывания

МЬЮТЕКСЫ
  SemaphoreHandle_t m = xSemaphoreCreateMutex()
  xSemaphoreTake(m, portMAX_DELAY) — захватить мьютекс (ждать бесконечно)
  xSemaphoreGive(m)                — освободить мьютекс
Мьютексы поддерживают наследование приоритета (Priority Inheritance) для предотвращения инверсии приоритетов.

ПРОГРАММНЫЕ ТАЙМЕРЫ
  TimerHandle_t t = xTimerCreate(name, period, uxAutoReload, pvTimerID, pxCallbackFunction)
  xTimerStart(t, timeout) — запустить
  xTimerStop(t, timeout)  — остановить
  xTimerReset(t, timeout) — перезапустить
Таймеры выполняются в контексте задачи-демона (timer daemon task), не в ISR.

УПРАВЛЕНИЕ ПАМЯТЬЮ
FreeRTOS предлагает пять схем heap (heap_1…heap_5). Для MIK32 с 16 КБ ОЗУ рекомендуется heap_4 (слияние свободных блоков). Размер кучи задаётся в configTOTAL_HEAP_SIZE (обычно 8192…12288 байт для MIK32).

КЛЮЧЕВЫЕ ПАРАМЕТРЫ FreeRTOSConfig.h ДЛЯ MIK32
  #define configCPU_CLOCK_HZ          32000000UL  // 32 МГц
  #define configTICK_RATE_HZ          1000         // 1 тик = 1 мс
  #define configMAX_PRIORITIES        5            // 5 уровней: 0…4
  #define configMINIMAL_STACK_SIZE    128          // минимальный стек (в словах = 512 байт)
  #define configTOTAL_HEAP_SIZE       8192         // 8 КБ из 16 КБ на кучу FreeRTOS
  #define configUSE_PREEMPTION        1            // вытесняющий планировщик
  #define configUSE_TIME_SLICING      1            // round-robin при равных приоритетах
  #define configUSE_MUTEXES           1            // мьютексы
  #define configUSE_TIMERS            1            // программные таймеры
  #define configUSE_IDLE_HOOK         0            // хук задачи idle (0 = не используется)
  #define configUSE_TICK_HOOK         0            // хук каждого тика

API ДЛЯ ИСПОЛЬЗОВАНИЯ ИЗ ПРЕРЫВАНИЙ
Все функции, вызываемые из ISR (Interrupt Service Routine), имеют суффикс FromISR:
  xQueueSendFromISR, xSemaphoreGiveFromISR, xTaskNotifyFromISR, ...
После вызова FromISR-функции необходимо вызвать portYIELD_FROM_ISR(xHigherPriorityTaskWoken) для немедленного переключения контекста, если разбуженная задача имеет более высокий приоритет.`,
    codes: [
      {
        title: "Две независимые задачи — LED и UART",
        code: `#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "mik32_hal_pcc.h"
#include "mik32_hal_gpio.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Задача 1: мигание LED1 (P0_3) каждые 500 мс
 * Задача 2: вывод счётчика по UART каждую секунду
 * Обе задачи независимы и выполняются параллельно.
 */

static USART_HandleTypeDef husart0;

/* Прототипы задач */
static void vLEDTask(void *pvParameters);
static void vUARTTask(void *pvParameters);

void SystemClock_Config(void);

int main(void)
{
    SystemClock_Config();

    /* Создание задач: имя, размер стека (слов), параметры, приоритет, handle */
    xTaskCreate(vLEDTask,  "LED",  128, NULL, 1, NULL);
    xTaskCreate(vUARTTask, "UART", 256, NULL, 1, NULL);

    /* Запуск планировщика FreeRTOS (не возвращается) */
    vTaskStartScheduler();

    while (1) {}  /* Не должны сюда попасть */
}

/* Задача LED: мигание P0_3 каждые 500 мс */
static void vLEDTask(void *pvParameters)
{
    (void)pvParameters;

    GPIO_InitTypeDef init = {0};
    __HAL_PCC_GPIO_0_CLK_ENABLE();

    init.Pin  = GPIO_PIN_3;
    init.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    init.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &init);

    while (1)
    {
        HAL_GPIO_TogglePin(GPIO_0, GPIO_PIN_3);
        vTaskDelay(pdMS_TO_TICKS(500));  /* Задержка 500 мс, CPU свободен */
    }
}

/* Задача UART: вывод счётчика каждую секунду */
static void vUARTTask(void *pvParameters)
{
    (void)pvParameters;

    husart0.Instance    = UART_0;
    husart0.transmitting = Enable;
    husart0.receiving   = Disable;
    husart0.baudrate    = 9600;
    HAL_USART_Init(&husart0);

    uint32_t counter = 0;

    while (1)
    {
        xprintf("Tick: %lu\\n", counter++);
        vTaskDelay(pdMS_TO_TICKS(1000));  /* Задержка 1 с */
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
}`
      }
    ],
    keyFunctions: ["xTaskCreate()", "vTaskStartScheduler()", "vTaskDelay()", "pdMS_TO_TICKS()", "xQueueCreate()", "xQueueSend()", "xQueueReceive()", "xSemaphoreCreateMutex()", "xSemaphoreTake()", "xSemaphoreGive()"]
  },
  {
    id: "15-spifi",
    title: "SPIFI — Контроллер внешней SPI Flash памяти",
    shortDescription: "Интерфейс SPI Flash (Single/Dual/Quad): XIP-исполнение кода из внешней Flash, кэш 1 КБ, поддержка W25Q16/64/128/256 и аналогов.",
    theory: `SPIFI (Serial Peripheral Interface Flash Interface) — специализированный контроллер MIK32 для подключения внешней серийной Flash-памяти. В отличие от стандартного SPI, SPIFI реализует режим «прозрачного» XIP-доступа (eXecute In Place): внешняя Flash отображается в адресное пространство МК начиная с адреса 0x80000000, и процессор SCR1 исполняет инструкции из неё так же, как из ОЗУ. Это принципиально важно для проектов, где программа не умещается в 8 КБ EEPROM.

АДРЕС КОНТРОЛЛЕРА В КАРТЕ ПАМЯТИ
  SPIFI_CONFIG — база 0x00070000 (APB_M, подсистема памяти)
  XIP-область  — 0x80000000 … 0xFFFFFFFF (до 2 ГБ)

РЕЖИМЫ ШИНЫ SPIFI
  Single SPI (1-bit): MOSI/MISO — полудуплекс; 1 бит/такт; совместим со стандартным SPI Flash
  Dual SPI   (2-bit): IO0, IO1  — 2 бит/такт; скорость вдвое выше Single
  Quad SPI   (4-bit): IO0…IO3  — 4 бит/такт; максимальная скорость чтения

ВЫВОДЫ SPIFI
  SPIFI_CS  — Chip Select внешней Flash (активный низкий)
  SPIFI_CLK — тактовый сигнал
  SPIFI_IO0 — данные (MOSI в Single; IO0 в Dual/Quad)
  SPIFI_IO1 — данные (MISO в Single; IO1 в Dual/Quad)
  SPIFI_IO2 — IO2 (только Quad; часто WP# у Flash)
  SPIFI_IO3 — IO3 (только Quad; часто HOLD# у Flash)

РЕГИСТРОВАЯ КАРТА SPIFI_CONFIG (смещения от 0x00070000)
  Смещение  Имя             Описание
  ────────────────────────────────────────────────────────────────────────────
  0x00      CTRL            Управление: скорость, кэш, прерывания
  0x04      CMD             Команда для обращения к Flash (структурированный формат)
  0x08      ADDR            Адрес в Flash (24 или 32 бит)
  0x0C      IDATA           Промежуточные данные команды (Intermediate Data, ID)
  0x10      CLIMIT          Ограничение кэша (Cache Limit)
  0x14      DATA            Регистр данных для чтения/записи (TX/RX)
  0x18      MCMD            Команда для режима памяти (XIP-режим)
  0x1C      STAT            Статус (занятость, ошибки)

РЕГИСТР CTRL (0x00) — ключевые поля
  Биты [15:0]  TIMEOUT   — таймаут (число APB-тактов между байтами)
  Биты [23:16] SCE       — делитель тактовой частоты SPIFI (0…255 → делитель 1…256)
  Бит  [27]    PREFETCH  — включить кэш-предвыборку (1 = кэш активен)
  Бит  [28]    INTEN     — прерывание по завершению команды
  Бит  [29]    MODE3     — полярность SCK (0 = CPOL=0, 1 = CPOL=1)
  Бит  [30]    PRFTCH_RST — сброс кэша
  Бит  [31]    DMAEN     — включить DMA для SPIFI

СТРУКТУРА КОМАНДЫ (РЕГИСТР CMD / MCMD)
  Биты [13:0]  DATALEN     — длина данных в байтах (0…16383)
  Бит  [14]    POLL        — режим опроса статусного регистра Flash
  Бит  [15]    DOUT        — направление данных (0 = чтение, 1 = запись в Flash)
  Биты [18:16] INTLEN      — длина промежуточных данных (0…4 байта)
  Биты [20:19] FIELDFORM   — формат передачи данных:
                              00 = всё последовательно (SPI)
                              01 = данные параллельно (Dual/Quad), остальное последовательно
                              10 = опкод последовательно, адрес+данные параллельно
                              11 = всё параллельно (Fast Read Quad)
  Биты [23:21] FRAMEFORM   — структура фрейма:
                              001 = только опкод (без адреса)
                              010 = опкод + 1 байт адреса
                              011 = опкод + 2 байта адреса
                              100 = опкод + 3 байта адреса (24-бит, стандартный)
                              101 = опкод + 4 байта адреса (32-бит, для Flash > 128 МБ)
                              110 = без опкода + 3 байта адреса
                              111 = без опкода + 4 байта адреса
  Биты [31:24] OPCODE      — код команды Flash (1 байт: например 0x6B = Fast Read Quad Output)

КЭШ SPIFI
Встроенный кэш 1 КБ (4 строки × 256 байт с тегами) хранит ранее прочитанные данные из Flash. При повторном обращении к тому же адресу данные отдаются немедленно, без обращения к Flash. Кэш обеспечивает до 4-5× ускорение при последовательном выполнении кода. Активируется полем CTRL.PREFETCH.

ПОДДЕРЖИВАЕМЫЕ FLASH-ЧИПЫ (JEDEC-совместимые)
  Winbond:  W25Q16, W25Q32, W25Q64, W25Q128, W25Q256 (SPI/Dual/Quad)
  GigaDevice: GD25Q16, GD25Q64, GD25Q128
  Macronix:  MX25L1606, MX25L12835F (Quad)
  Российские: GSN2516Y (16 Мбит), GSN25P64

ТИПОВЫЕ КОМАНДЫ FLASH (SPI NOR Flash JEDEC)
  0x03  Read Data             — чтение (Single, медленно, без задержки)
  0x0B  Fast Read             — быстрое чтение (Single + 1 байт задержки)
  0x3B  Fast Read Dual Output — Dual чтение (IO0, IO1 для данных)
  0x6B  Fast Read Quad Output — Quad чтение (IO0…IO3 для данных, рекомендуется)
  0xEB  Fast Read Quad I/O    — адрес + данные по Quad (максимальная скорость)
  0x02  Page Program          — запись страницы (256 байт)
  0x20  Sector Erase (4 КБ)  — стирание сектора
  0xD8  Block Erase (64 КБ)  — стирание блока
  0xC7  Chip Erase            — стирание всей Flash (осторожно!)
  0x06  Write Enable (WREN)   — разрешить запись (обязателен перед Erase/Program)
  0x05  Read Status Register  — прочитать статус (бит BUSY, WEL)

ЗАГРУЗОЧНЫЕ РЕЖИМЫ И LINKER SCRIPT
При Boot0=0, Boot1=1 программа загружается из SPIFI:
  Вектор сброса: 0x80000000 (начало внешней Flash)
  Linker script размещает .text и .rodata в адрес 0x80000000.
  .data и .bss — в ОЗУ (0x02000000).
  Стартап-код (startup.S) копирует .data из Flash в ОЗУ при инициализации.

СХЕМОТЕХНИКА ПОДКЛЮЧЕНИЯ
  • Flash питается от 3,3 В (тот же уровень, что и MIK32 — согласование не требуется).
  • CS: рекомендуется подтяжка 10 кОм к VDD для предотвращения случайного выбора при старте.
  • CLK, IO0…IO3: без подтяжки.
  • По цепи питания Flash (VCC): конденсаторы 100 нФ + 10 мкФ как можно ближе к выводу питания.
  • Трассировка: минимизировать длину дорожек (< 30 мм), избегать переходных отверстий.`,
    codes: [
      {
        title: "SPIFI QuadSPI — инициализация и прямое чтение через XIP",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_spifi_master.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"

/*
 * Инициализация SPIFI в режиме Quad SPI с кэшем.
 * После инициализации Flash-память доступна по адресу 0x80000000
 * как обычная читаемая память (XIP — Execute In Place).
 *
 * Чтение через указатель — стандартный доступ к памяти.
 */

SPIFI_HandleTypeDef hspifi;
USART_HandleTypeDef husart0;

void SystemClock_Config(void);
void USART_Init(void);
static void SPIFI_Init(void);

int main(void)
{
    SystemClock_Config();
    USART_Init();
    SPIFI_Init();

    /* Прямое чтение из внешней Flash через XIP (адрес 0x80000000) */
    volatile uint8_t *flash = (volatile uint8_t *)0x80000000UL;

    xprintf("SPIFI Flash dump (first 16 bytes):\\n");
    for (int i = 0; i < 16; i++)
        xprintf("  [0x%04X] = 0x%02X\\n", i, flash[i]);

    /* Проверка сигнатуры загрузчика (первые 4 байта) */
    uint32_t signature = *(volatile uint32_t *)0x80000000UL;
    xprintf("Signature: 0x%08X\\n", signature);

    while (1) {}
}

static void SPIFI_Init(void)
{
    hspifi.Instance = SPIFI_CONFIG;

    /* Режим QuadSPI: 4 линии данных */
    hspifi.Init.Mode        = SPIFI_MEMORY_MODE_QUAD;

    /* Кэш-предвыборка: включить для ускорения XIP */
    hspifi.Init.Prefetch    = SPIFI_PREFETCH_ENABLE;

    /* Прерывание по завершению команды: отключить */
    hspifi.Init.Interrupt   = SPIFI_INTERRUPT_DISABLE;

    /* Ограничение кэша: 0 = весь кэш доступен */
    hspifi.Init.CacheLimit  = 0;

    if (HAL_SPIFI_Init(&hspifi) != HAL_OK)
        xprintf("SPIFI Init Error!\\n");
}

void USART_Init(void)
{
    husart0.Instance    = UART_0;
    husart0.transmitting = Enable;
    husart0.receiving   = Disable;
    husart0.baudrate    = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["HAL_SPIFI_Init()", "HAL_SPIFI_WriteEnable()", "HAL_SPIFI_EraseSector()", "HAL_SPIFI_Program()", "HAL_SPIFI_ReadID()"]
  },
  {
    id: "16-startup",
    title: "Инфраструктура запуска: crt0, скрипты линковки, карта памяти, CSR и EPIC",
    shortDescription: "Детальный разбор crt0.S, скриптов линковки (eeprom/ram/spifi), карты памяти MIK32, регистров CSR RISC-V, контроллера прерываний EPIC и системного таймера SCR1.",
    theory: `Данная глава рассматривает нижний уровень системной инфраструктуры MIK32 — тот слой, который существует до вызова функции main(). Это знание необходимо для глубокого понимания процесса загрузки, работы прерываний, распределения памяти и создания bare-metal приложений без HAL.

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 1. КАРТА ПАМЯТИ MIK32 (mik32_memory_map.h)
═══════════════════════════════════════════════════════════════════

MIK32 реализует плоское 32-битное адресное пространство (0x00000000 … 0xFFFFFFFF). Каждый ресурс — память или периферийный блок — доступен по фиксированному адресу. Понимание карты памяти обязательно при работе со скриптами линковки и отладчиком.

ОСНОВНЫЕ ОБЛАСТИ ПАМЯТИ
  Адрес            Размер    Тип        Описание
  ─────────────────────────────────────────────────────────────────────
  0x00000000       16 КБ   ROM (RX)   Boot ROM — маршрутизатор загрузки
  0x01000000        8 КБ   EEPROM     Встроенная Flash (EEPROM), исполнение кода
  0x02000000       16 КБ   SRAM (RWX) Основное ОЗУ — данные, стек, код
  0x80000000       2 ГБ    SPIFI (RX) Внешняя SPI Flash (XIP-режим)

СИСТЕМНЫЕ ШИНЫ И ПЕРИФЕРИЯ
  AHB-домен (быстрая шина):
    0x00040000   DMA_CONFIG   — контроллер прямого доступа к памяти
    0x00080000   CRYPTO       — аппаратный крипто-блок
    0x00080400   CRC          — вычислитель контрольных сумм

  APB_M-домен (шина управляющей периферии):
    0x00050000   PM (PCC)     — менеджер тактирования и питания
    0x00050400   EPIC         — контроллер прерываний
    0x00050800   TIMER32_0    — 32-битный таймер 0 (базовый, без DMA)
    0x00050C00   PAD_CONFIG   — конфигурация выводов (аналог «IOMUX»)
    0x00051000   WDT_BUS      — сторожевой таймер шины
    0x00060000   WU           — модуль пробуждения из сна
    0x00060400   RTC          — часы реального времени
    0x00070000   SPIFI_CONFIG — регистры управления SPIFI-контроллером
    0x00070400   EEPROM_REGS  — регистры управления EEPROM
    0x00490000   SCR1_TIMER   — системный таймер ядра (mtime / RISC-V mtime)

  APB_P-домен (периферия пользователя):
    0x00081000   WDT          — сторожевой таймер
    0x00081400   UART_0       — интерфейс UART 0
    0x00081800   UART_1       — интерфейс UART 1
    0x00081C00   TIMER16_0    — 16-битный таймер 0
    0x00082000   TIMER16_1    — 16-битный таймер 1
    0x00082400   TIMER16_2    — 16-битный таймер 2
    0x00082800   TIMER32_1    — 32-битный таймер 1 (с DMA)
    0x00082C00   TIMER32_2    — 32-битный таймер 2 (с DMA)
    0x00083000   SPI_0        — интерфейс SPI 0
    0x00083400   SPI_1        — интерфейс SPI 1
    0x00083800   I2C_0        — интерфейс I2C 0
    0x00083C00   I2C_1        — интерфейс I2C 1
    0x00084000   GPIO_0       — порт ввода-вывода 0
    0x00084400   GPIO_1       — порт ввода-вывода 1
    0x00084800   GPIO_2       — порт ввода-вывода 2
    0x00084C00   GPIO_IRQ     — прерывания от GPIO
    0x00085000   ANALOG_REG   — АЦП / ЦАП / датчик температуры

Каждый периферийный блок отображается в память через указатель на структуру:
  #define UART_0  ((UART_TypeDef *) 0x00081400)
Обращение к регистру: UART_0->CONTROL1 = ... — это дословно: запись в ячейку памяти 0x00081400 + смещение поля CONTROL1.

НАЗНАЧЕНИЕ PM_CLOCK_xxx МАСОК
Каждый периферийный блок должен быть тактирован явно через регистры PM (Power Manager / PCC).
Маски из mik32_memory_map.h используются HAL-макросами типа __HAL_PCC_UART_0_CLK_ENABLE():
  PM_CLOCK_APB_P_UART_0_M = (1 << 1) — бит 1 регистра PM→APB_P_CLK_EN

ТАБЛИЦА ЛИНИЙ ПРЕРЫВАНИЙ (используется в EPIC)
  Индекс  Источник
  ──────────────────────────────────────
  0       TIMER32_0
  1       UART_0
  2       UART_1
  3       SPI_0
  4       SPI_1
  5       GPIO_IRQ
  6       I2C_0
  7       I2C_1
  8       WDT
  9…11    TIMER16_0…2
  12…13   TIMER32_1…2
  14      SPIFI
  15      RTC
  16      EEPROM
  20      DMA
  29      ADC
  30      DAC0
  31      DAC1

ТАБЛИЦА ЗАПРОСОВ DMA
  Индекс  Источник DMA
  ─────────────────────────────────────
  0       UART_0
  1       UART_1
  2       CRYPTO
  3       SPI_0
  4       SPI_1
  5       I2C_0
  6       I2C_1
  7       SPIFI
  8…9     TIMER32_1…2
  10…11   DAC0…1
  12      TIMER32_0

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 2. СКРИПТЫ ЛИНКОВКИ
═══════════════════════════════════════════════════════════════════

Скрипты линковки (Linker Scripts, .ld) — это инструкции для компоновщика (ld/lld), которые описывают, куда именно в адресном пространстве размещать каждую секцию объектных файлов. MIK32 имеет три варианта разметки:

eeprom.ld — программа хранится в EEPROM (8 КБ, 0x01000000)
  MEMORY {
    eeprom (RX) : ORIGIN = 0x01000000, LENGTH = 8K
    ram    (RWX): ORIGIN = 0x02000000, LENGTH = 16K
  }
  REGION_ALIAS("REGION_TEXT", eeprom)
  REGION_ALIAS("REGION_RAM",  ram)
  Применяется по умолчанию для большинства проектов MIK32 SDK.
  Максимальный размер программы ограничен 8 КБ.

ram.ld — программа целиком в ОЗУ (16 КБ, 0x02000000)
  MEMORY {
    ram (RWX): ORIGIN = 0x02000000, LENGTH = 16K
  }
  REGION_ALIAS("REGION_TEXT", ram)
  REGION_ALIAS("REGION_RAM",  ram)
  Удобен для быстрой отладки через OpenOCD — загрузка прошивки в ОЗУ и запуск без стирания EEPROM.
  REGION_TEXT и REGION_RAM указывают на одну и ту же область, поэтому .data копирование из «Flash» в RAM не происходит.

spifi.ld — программа во внешней Flash через SPIFI (до 2 ГБ, 0x80000000)
  MEMORY {
    spifi (RX) : ORIGIN = 0x80000000, LENGTH = 2*1024M
    ram   (RWX): ORIGIN = 0x02000000, LENGTH = 16K
  }
  REGION_ALIAS("REGION_TEXT", spifi)
  REGION_ALIAS("REGION_RAM",  ram)
  SECTION_ALIGNMENT = 16  (увеличен для выравнивания в SPIFI)
  Применяется для программ, не умещающихся в 8 КБ EEPROM. XIP-режим SPIFI позволяет ядру выполнять инструкции прямо из внешней Flash.

ОБЩИЕ СЕКЦИИ (sections.lds)
Файл sections.lds включается во все три скрипта и описывает универсальную разметку секций:

  .startup  → REGION_TEXT  — стартовый код crt0.S (KEEP — не выбрасывать оптимизатором)
  .ram_text → REGION_RAM (AT>REGION_TEXT) — код для выполнения из ОЗУ; при размещении хранится в REGION_TEXT, затем crt0.S копирует его в REGION_RAM. Здесь размещается таблица векторов прерываний (.trap_text), которая всегда должна быть в ОЗУ (mtvec указывает на ОЗУ).
  .text     → REGION_TEXT  — основной код программы и константы (.rodata)
  .data     → REGION_RAM (AT>REGION_TEXT) — инициализированные глобальные переменные; хранятся в REGION_TEXT (Flash), копируются в ОЗУ при старте crt0.S
  .sdata    → REGION_RAM (AT>REGION_TEXT) — «малые» данные, доступные через gp-относительную адресацию RISC-V (оптимизация — команда lw вместо lui+lw)
  .srodata  → REGION_RAM (AT>REGION_TEXT) — «малые» константы
  .bss      → REGION_RAM  — неинициализированные глобальные переменные (обнуляются crt0.S)
  .sbss     → REGION_RAM  — «малое» BSS (через gp-адресацию)

СИМВОЛЫ ЛИНКОВКИ (экспортируемые в crt0.S)
  __C_STACK_TOP__         — вершина стека (конец RAM, выровненный до 16 байт)
  __global_pointer$       — оптимальная точка для gp-регистра (±2 КБ охват)
  __DATA_IMAGE_START/END__ — диапазон .data во Flash (источник для memcpy)
  __DATA_START__          — адрес .data в ОЗУ (назначение для memcpy)
  __SBSS_START__ / __BSS_END__ — диапазон для обнуления (memset нулями)
  __RAM_TEXT_IMAGE_START/END__ — диапазон .ram_text во Flash (источник)
  __RAM_TEXT_START__      — адрес .ram_text в ОЗУ (назначение)
  __TRAP_TEXT_START__     — точный адрес таблицы обработчика (0xC0 от начала ОЗУ)
  _end, __end, end        — конец статических данных = начало кучи (heap)
  __STACK_BOTTOM__        — нижняя граница стека
  _heap_end               — верхняя граница кучи (= __STACK_BOTTOM__ - 16)

РАСЧЁТ РАЗБИВКИ ОЗУ (16 КБ)
  ОЗУ: 0x02000000 … 0x02003FFF (16 384 байт)
  Макет снизу вверх:
  0x02000000  .ram_text (.trap_text @ +0xC0)  — обработчик прерываний
  0x02000000+N .data / .sdata / .srodata      — инициализированные данные
  далее       .bss / .sbss                    — неинициализированные данные
  ↑ end       начало кучи (heap)
  ↓           _heap_end (стек снизу)
  0x02003FF0  __C_STACK_TOP__                 — вершина стека (SP)
  Стек растёт вниз, куча растёт вверх. При переполнении стека __ASSERT в секции .ld предупредит: "Statically allocated data overlaps the stack".
  Размер стека по умолчанию: __stack_size = 1024 байт.

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 3. СТАРТОВЫЙ ФАЙЛ crt0.S — АНАЛИЗ ПОШАГОВО
═══════════════════════════════════════════════════════════════════

crt0.S (C RunTime 0) — первый код, который выполняет процессор после снятия сброса. Написан на ассемблере RISC-V (GAS синтаксис). Размещён в секции .startup, которая компоновщиком ставится самой первой в REGION_TEXT.

МАКРОСЫ crt0.S

  memcpy src_beg, src_end, dst, tmp_reg
    — побайтовое (по 4 байта, lw/sw) копирование [src_beg..src_end) → dst
    — используется для копирования .data и .ram_text из Flash в ОЗУ

  memset dst_beg, dst_end, val_reg
    — заполнение диапазона значением val_reg (4 байта за итерацию)
    — используется для обнуления .bss регистром zero (x0)

  la_abs reg, address
    — загрузка абсолютного адреса в регистр через: lui + addi
    — в отличие от псевдоинструкции la (которая использует PC-относительную адресацию), la_abs работает корректно при любом PC, включая Boot ROM
    — .option norelax запрещает релакс-оптимизацию компоновщика (важно для корректности)

  jalr_abs return_reg, address
    — вызов функции по абсолютному адресу через: lui + jalr
    — аналогично la_abs, необходим для вызова SmallSystemInit/SystemInit из произвольного PC

ПОСЛЕДОВАТЕЛЬНОСТЬ ВЫПОЛНЕНИЯ _start

Шаг 1: Задержка стабилизации питания
  li t0, 128000
  start_loop_delay: addi t0, t0, -1 / bnez t0, start_loop_delay
  — 128 000 итераций ≈ 4 мс при 32 МГц (каждая итерация ~1 такт)
  — необходима для стабилизации источника питания и PLL после POR (Power-On Reset)
  — критична при «холодном» старте с нестабильным напряжением питания

Шаг 2: Инициализация стека и глобального указателя
  la_abs sp, __C_STACK_TOP__      → sp = 0x02003FF0 (вершина 16 КБ ОЗУ)
  la_abs gp, __global_pointer$    → gp = оптимальная точка gp
  — Стек (SP) растёт вниз от вершины ОЗУ; все последующие вызовы функций (включая SmallSystemInit, SystemInit) требуют рабочего стека
  — gp (global pointer, x3) используется компилятором для быстрого доступа к .sdata/.sbss через команды с 12-битным смещением (диапазон ±2 КБ)

Шаг 3: Копирование секции .data в ОЗУ
  la_abs a1, __DATA_IMAGE_START__   → источник: адрес .data во Flash
  la_abs a2, __DATA_IMAGE_END__     → конец источника
  la_abs a3, __DATA_START__         → назначение: адрес .data в ОЗУ
  memcpy a1, a2, a3, t0             → побайтовое копирование
  — Все глобальные/статические переменные с инициализатором (int x = 5;) хранятся в образе Flash в секции .data. При старте они обязательно копируются в ОЗУ, иначе переменные останутся в Read-Only памяти.
  — Охватывает также .sdata, .srodata (через __DATA_IMAGE_END__)

Шаг 4: Обнуление секции .bss
  la_abs a1, __SBSS_START__         → начало .sbss
  la_abs a2, __BSS_END__            → конец .bss
  memset a1, a2, zero               → заполнение нулями (zero = x0 = всегда 0)
  — Стандарт C гарантирует, что неинициализированные глобальные переменные равны нулю при старте. Это обеспечивает crt0.
  — В ОЗУ нет гарантий содержимого после сброса.

Шаг 5: Инициализация вектора прерываний mtvec
  la_abs t0, __TRAP_TEXT_START__   → адрес таблицы в ОЗУ (0x020000C0)
  csrw mtvec, t0                   → записать в CSR mtvec
  — RISC-V: при любом прерывании или исключении ядро SCR1 переходит по адресу из mtvec
  — __TRAP_TEXT_START__ = ORIGIN(REGION_RAM) + 0xC0 = 0x020000C0 (фиксировано в sections.lds)
  — Это должно совпадать со значением mtvec по умолчанию, описанным в scr1_arch_description.svh

Шаг 6: Вызов инициализирующих функций
  jalr_abs ra, SmallSystemInit    → копирование .ram_text из Flash в ОЗУ
  jalr_abs ra, SystemInit         → системная инициализация (PCC, тактирование)
  jalr_abs ra, __libc_init_array  → вызов конструкторов C++ статических объектов
  jalr_abs ra, main               → вызов пользовательской main()
  jalr_abs ra, __libc_fini_array  → деструкторы C++ (если main вернула значение)
  wfi / j loop                    → если main вернулась — зависание в WFI (ожидание прерывания)

  SmallSystemInit (слабый символ, переопределяемый):
    — По умолчанию копирует .ram_text (включая .trap_text) из Flash в ОЗУ
    — Если проект не использует функции в ОЗУ — функция сводится к ret

  SystemInit (слабый символ, переопределяемый):
    — Пользователь переопределяет для ранней инициализации PCC/тактирования
    — HAL вызывает SystemInit через SystemClock_Config() из main(); если SystemInit переопределён в crt0 — не дублировать

ОБРАБОТЧИК ИСКЛЮЧЕНИЙ И ПРЕРЫВАНИЙ

.section .trap_text, "ax"
trap_entry:         j raw_trap_handler

raw_trap_handler:
  — Сохранение всех 31 регистров (x1…x31) на стеке: addi sp, sp, -(31×4) = -124 байта
  — Вызов C-обработчика trap_handler через: la ra, trap_handler / jalr ra
  — Восстановление регистров и возврат: mret (Machine-mode Return)

  .irp index, 1,2,...,31
    sw x{index}, 4*(index-1)(sp)
  .endr
  Макрос .irp разворачивается компилятором ассемблера в 31 инструкцию сохранения.

trap_handler (слабый символ):
  — По умолчанию бесконечный цикл (j 1b)
  — Переопределяется пользователем в C:
      void trap_handler(void) { ... }
  — При вызове доступны CSR-регистры: mcause, mepc, mtval

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 4. RISC-V CSR — СИСТЕМНЫЕ РЕГИСТРЫ УПРАВЛЕНИЯ
═══════════════════════════════════════════════════════════════════

CSR (Control and Status Registers) — специальные 32-битные регистры ядра RISC-V, недоступные через обычные команды lw/sw. Доступ осуществляется специальными инструкциями:
  csrr  rd, csr      — чтение CSR в rd
  csrw  csr, rs      — запись rs в CSR
  csrrs rd, csr, rs  — атомарное: rd := CSR; CSR |= rs (set bits)
  csrrc rd, csr, rs  — атомарное: rd := CSR; CSR &= ~rs (clear bits)

Макросы из csr.h инкапсулируют inline-ассемблер:
  read_csr(reg)         — возвращает unsigned long
  write_csr(reg, val)   — записывает значение
  set_csr(reg, bit)     — возвращает старое значение, устанавливает биты
  clear_csr(reg, bit)   — возвращает старое значение, сбрасывает биты

КЛЮЧЕВЫЕ CSR РЕГИСТРЫ MIK32/SCR1

mstatus (Machine Status Register)
  Бит  [3]   MIE   — глобальное разрешение прерываний машинного уровня (1 = разрешены)
  Бит  [7]   MPIE  — сохранённый MIE (восстанавливается при mret)
  Биты [12:11] MPP — режим до прерывания (для SCR1: всегда 11 = Machine)
  Включение глобальных прерываний:  set_csr(mstatus, MSTATUS_MIE)
  Отключение:                        clear_csr(mstatus, MSTATUS_MIE)

mtvec (Machine Trap-Vector Base-Address Register)
  Биты [31:2] BASE — базовый адрес обработчика (выровнен на 4 байта)
  Биты [1:0]  MODE — режим:
    00 = Direct (один обработчик для всех прерываний)
    01 = Vectored (таблица адресов для каждого прерывания)
  MIK32 использует Direct: mtvec = адрес trap_entry (= __TRAP_TEXT_START__)

mcause (Machine Cause Register)
  Бит [31]      — 1 = прерывание, 0 = исключение
  Биты [30:0]   — код причины
  Прерывания:
    11 = Machine External Interrupt (внешнее прерывание от EPIC)
    7  = Machine Timer Interrupt    (от SCR1 TIMER: mtimecmp)
    3  = Machine Software Interrupt
  Исключения:
    0  = Instruction address misaligned
    2  = Illegal instruction
    5  = Load access fault
    7  = Store/AMO access fault
    11 = Environment call (ecall)

mepc (Machine Exception Program Counter)
  — Адрес инструкции, которая вызвала исключение или была прервана
  — mret выполняет переход к mepc

mtval (Machine Trap Value Register)
  — Дополнительная информация: адрес при ошибке доступа или код инструкции

mie (Machine Interrupt Enable)
  Бит [11]  MEIE — разрешить Machine External Interrupt (от EPIC)
  Бит [7]   MTIE — разрешить Machine Timer Interrupt (от SCR1 TIMER)
  set_csr(mie, (1 << 11))   — разрешить внешние прерывания

Счётчики производительности (Performance Counters):
  rdcycle()   — число тактов ядра с момента сброса (32 бит)
  rdtime()    — время в единицах SCR1_TIMER (mtime)
  rdinstret() — число выполненных инструкций

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 5. EPIC — КОНТРОЛЛЕР ПЕРИФЕРИЙНЫХ ПРЕРЫВАНИЙ
═══════════════════════════════════════════════════════════════════

EPIC (Extended Peripheral Interrupt Controller) — контроллер прерываний MIK32, расположенный по адресу 0x00050400. EPIC объединяет до 32 линий прерываний от периферии в один сигнал, который подаётся на единственный вход Machine External Interrupt ядра SCR1 (RISC-V mcause = 11).

ДВУХУРОВНЕВАЯ СИСТЕМА ПРЕРЫВАНИЙ
  Периферия → [EPIC] → Machine External Interrupt → [mie.MEIE=1] → trap_handler
  В trap_handler: читаем EPIC->STATUS и определяем, какая именно периферия сработала.

РЕГИСТРЫ EPIC (база 0x00050400)
  Смещение  Имя              Описание
  ─────────────────────────────────────────────────────────────────────
  0x00      MASK_EDGE_SET    — разрешить прерывание по фронту (1-bit = бит источника)
  0x04      MASK_EDGE_CLEAR  — запретить прерывание по фронту
  0x08      MASK_LEVEL_SET   — разрешить прерывание по уровню
  0x0C      MASK_LEVEL_CLEAR — запретить прерывание по уровню
  0x18      CLEAR            — сброс флагов (запись 1 в бит очищает флаг источника)
  0x1C      STATUS           — текущие активные прерывания (с учётом маски)
  0x20      RAW_STATUS       — «сырые» флаги (до маскирования)

УПРАВЛЕНИЕ ПРЕРЫВАНИЯМИ
  Разрешить прерывание по уровню от TIMER32_0 (бит 0):
    EPIC->MASK_LEVEL_SET = (1 << EPIC_LINE_TIMER32_0_S);

  Разрешить по фронту от GPIO_IRQ (бит 5):
    EPIC->MASK_EDGE_SET = (1 << EPIC_LINE_GPIO_IRQ_S);

  Запретить прерывание от UART_0 (бит 1):
    EPIC->MASK_LEVEL_CLEAR = (1 << EPIC_LINE_UART_0_S);

  Сбросить флаг от TIMER32_0 в обработчике:
    EPIC->CLEAR = (1 << EPIC_LINE_TIMER32_0_S);

  Прочитать активные прерывания:
    uint32_t active = EPIC->STATUS;
    if (active & (1 << EPIC_LINE_UART_0_S)) { /* UART_0 сработал */ }

РЕЖИМ EDGE vs LEVEL
  Edge (фронт): прерывание генерируется однократно при изменении сигнала.
    Используется для: GPIO, UART (событие), DMA завершение.
    Требует явного сброса флага (EPIC->CLEAR) в обработчике.
  Level (уровень): прерывание удерживается, пока источник активен.
    Используется для: таймеры с флагом переполнения, ADC, CRC.
    Источник должен быть сброшен до выхода из обработчика.

═══════════════════════════════════════════════════════════════════
РАЗДЕЛ 6. SCR1 СИСТЕМНЫЙ ТАЙМЕР (mtime)
═══════════════════════════════════════════════════════════════════

Ядро SCR1 содержит стандартный RISC-V Machine Timer (mtime / mtimecmp) — 64-битный монотонный счётчик, отображённый в память по адресу 0x00490000. Он реализует прерывание Machine Timer Interrupt (mcause = 7).

РЕГИСТРЫ SCR1_TIMER (база 0x00490000)
  Смещение  Имя       Описание
  ──────────────────────────────────────────────────────
  0x00      TIMER_CTRL  — управление: бит[0]=EN (вкл), бит[1]=CLKSRC (0=AHB, 1=RTC 32К)
  0x04      TIMER_DIV   — делитель частоты (0…1023): f = f_AHB / (DIV+1)
  0x08      MTIME       — 32 младших бита счётчика (R/W)
  0x0C      MTIMEH      — 32 старших бита счётчика (R/W)
  0x10      MTIMECMP    — 32 младших бита компаратора
  0x14      MTIMECMPH   — 32 старших бита компаратора

ПРИНЦИП РАБОТЫ
  Счётчик mtime непрерывно считает вверх. Когда mtime ≥ mtimecmp, генерируется Machine Timer Interrupt (ядро SCR1 проверяет это сравнение аппаратно).
  Для периодических прерываний: в обработчике увеличивать mtimecmp на период.

РАСЧЁТ ПЕРИОДА
  f_mtime = f_AHB / (TIMER_DIV + 1)
  При f_AHB = 32 МГц, TIMER_DIV = 31:
    f_mtime = 32 000 000 / 32 = 1 000 000 Гц (1 МГц)
  Период 1 мс: mtimecmp = mtime + 1000

СВЯЗЬ С FreeRTOS
  Порт FreeRTOS для MIK32 использует SCR1_TIMER как источник системного тика планировщика. FreeRTOSConfig.h: configTICK_RATE_HZ = 1000 → тик каждую миллисекунду.`,
    codes: [
      {
        title: "Обработчик прерывания TIMER32_0 через EPIC и trap_handler",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_timer32.h"
#include "mik32_hal_usart.h"
#include "mik32_hal_gpio.h"
#include "xprintf.h"
#include "epic.h"           /* EPIC_TypeDef, EPIC_LINE_* */
#include "csr.h"            /* read_csr, write_csr, set_csr, clear_csr */
#include "riscv_csr_encoding.h"  /* MSTATUS_MIE, MSTATUS_MPIE */
#include "mik32_memory_map.h"    /* EPIC */

/*
 * Пример использования низкоуровневой инфраструктуры прерываний:
 *  - TIMER32_0 настроен на переполнение каждые 320 000 тактов (~10 мс)
 *  - EPIC разрешает прерывание от TIMER32_0 по уровню
 *  - CSR mstatus.MIE и mie.MEIE разрешают прерывания в ядре
 *  - trap_handler (переопределён) выполняет при срабатывании:
 *      - мигание LED1 (GPIO_0 PIN_3)
 *      - инкремент счётчика и вывод в UART
 *
 * Плата DIP-MIK32-V4: LED1 = GPIO_0 PIN_3
 */

TIMER32_HandleTypeDef htimer32_0;
USART_HandleTypeDef   husart0;

volatile uint32_t g_tick_count = 0;

void SystemClock_Config(void);
static void Timer32_0_Init(void);
static void EPIC_Init(void);
void USART_Init(void);
void GPIO_Init(void);

int main(void)
{
    SystemClock_Config();
    GPIO_Init();
    USART_Init();
    Timer32_0_Init();
    EPIC_Init();

    /* Разрешить внешние прерывания в ядре SCR1:
     * mie.MEIE (бит 11) — Machine External Interrupt Enable */
    set_csr(mie, (1 << 11));

    /* Разрешить глобальные прерывания:
     * mstatus.MIE (бит 3) */
    set_csr(mstatus, MSTATUS_MIE);

    xprintf("System started. Waiting for interrupts...\\n");

    while (1)
    {
        /* Основной цикл пуст — вся работа в прерывании */
        __asm volatile ("wfi");  /* Ожидание прерывания (экономия энергии) */
    }
}

/* Обработчик прерываний — переопределяем слабый символ из crt0.S
 * Вызывается из raw_trap_handler (ассемблерного контекста), после
 * сохранения всех регистров на стеке. */
void trap_handler(void)
{
    /* Определить причину: прерывание или исключение */
    uint32_t cause = read_csr(mcause);

    if (cause & 0x80000000)  /* Бит 31 = 1: прерывание */
    {
        uint32_t irq_code = cause & 0x7FFFFFFF;

        if (irq_code == 11)  /* Machine External Interrupt (от EPIC) */
        {
            uint32_t epic_status = EPIC->STATUS;

            /* Проверить: прерывание от TIMER32_0 (бит 0) */
            if (epic_status & (1 << EPIC_LINE_TIMER32_0_S))
            {
                /* --- Сбросить флаг переполнения таймера --- */
                TIMER32_0->INT_CLEAR = TIMER32_INT_OVERFLOW_M;

                /* --- Сбросить флаг в EPIC --- */
                EPIC->CLEAR = (1 << EPIC_LINE_TIMER32_0_S);

                /* --- Действие: мигать LED1 (GPIO_0 PIN_3) --- */
                GPIO_0->OUTPUT ^= GPIO_PIN_3;

                /* --- Счётчик и UART каждые 100 прерываний --- */
                g_tick_count++;
                if ((g_tick_count % 100) == 0)
                {
                    xprintf("Tick: %lu (каждые 10 мс, прошло %lu мс)\\n",
                            g_tick_count, g_tick_count * 10);
                }
            }
        }
    }
    else  /* Исключение */
    {
        uint32_t epc = read_csr(mepc);
        xprintf("EXCEPTION! cause=%lu mepc=0x%08X\\n",
                cause, epc);
        /* В реальном приложении: логировать и сбросить систему */
        while (1) {}
    }
}

static void Timer32_0_Init(void)
{
    htimer32_0.Instance       = TIMER32_0;
    htimer32_0.Top            = 319999;                 /* 320 000 тактов = 10 мс при 32 МГц */
    htimer32_0.State          = TIMER32_STATE_DISABLE;
    htimer32_0.Clock.Source   = TIMER32_SOURCE_PRESCALER;
    htimer32_0.Clock.Prescaler = 0;
    htimer32_0.InterruptMask  = TIMER32_INT_OVERFLOW_M; /* Прерывание по переполнению */
    htimer32_0.CountMode      = TIMER32_COUNTMODE_FORWARD;
    HAL_Timer32_Init(&htimer32_0);

    HAL_Timer32_Value_Clear(&htimer32_0);
    HAL_Timer32_Start(&htimer32_0);
}

static void EPIC_Init(void)
{
    /* Разрешить прерывание от TIMER32_0 по уровню (бит 0) */
    EPIC->MASK_LEVEL_SET = (1 << EPIC_LINE_TIMER32_0_S);
}

void GPIO_Init(void)
{
    GPIO_InitTypeDef init = {0};

    __HAL_PCC_GPIO_0_CLK_ENABLE();

    /* LED1: GPIO_0 PIN_3 — выход */
    init.Pin  = GPIO_PIN_3;
    init.Mode = HAL_GPIO_MODE_GPIO_OUTPUT;
    init.Pull = HAL_GPIO_PULL_NONE;
    HAL_GPIO_Init(GPIO_0, &init);

    HAL_GPIO_WritePin(GPIO_0, GPIO_PIN_3, GPIO_PIN_LOW);
}

void USART_Init(void)
{
    husart0.Instance             = UART_0;
    husart0.transmitting         = Enable;
    husart0.receiving            = Disable;
    husart0.frame                = Frame_8bit;
    husart0.parity_bit           = Disable;
    husart0.parity_bit_inversion = Disable;
    husart0.bit_direction        = LSB_First;
    husart0.data_inversion       = Disable;
    husart0.tx_inversion         = Disable;
    husart0.rx_inversion         = Disable;
    husart0.swap                 = Disable;
    husart0.lbm                  = Disable;
    husart0.stop_bit             = StopBit_1;
    husart0.mode                 = Asynchronous_Mode;
    husart0.xck_mode             = XCK_Mode3;
    husart0.last_byte_clock      = Disable;
    husart0.overwrite            = Disable;
    husart0.rts_mode             = AlwaysEnable_mode;
    husart0.dma_tx_request       = Disable;
    husart0.dma_rx_request       = Disable;
    husart0.channel_mode         = Duplex_Mode;
    husart0.tx_break_mode        = Disable;
    husart0.Interrupt.ctsie      = Disable;
    husart0.Interrupt.eie        = Disable;
    husart0.Interrupt.idleie     = Disable;
    husart0.Interrupt.lbdie      = Disable;
    husart0.Interrupt.peie       = Disable;
    husart0.Interrupt.rxneie     = Disable;
    husart0.Interrupt.tcie       = Disable;
    husart0.Interrupt.txeie      = Disable;
    husart0.Modem.rts            = Disable;
    husart0.Modem.cts            = Disable;
    husart0.Modem.dtr            = Disable;
    husart0.Modem.dcd            = Disable;
    husart0.Modem.dsr            = Disable;
    husart0.Modem.ri             = Disable;
    husart0.Modem.ddis           = Disable;
    husart0.baudrate             = 9600;
    HAL_USART_Init(&husart0);
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
}`,
      },
      {
        title: "Низкоуровневое использование SCR1 системного таймера (mtime)",
        code: `#include "mik32_hal_pcc.h"
#include "mik32_hal_usart.h"
#include "xprintf.h"
#include "scr1_timer.h"      /* SCR1_TIMER_TypeDef, SCR1_TIMER_CTRL_* */
#include "mik32_memory_map.h" /* SCR1_TIMER */
#include "csr.h"             /* read_csr, set_csr */
#include "riscv_csr_encoding.h"

/*
 * SCR1 Machine Timer (mtime):
 *  - 64-битный счётчик, адрес 0x00490000
 *  - При mtime >= mtimecmp: генерируется Machine Timer Interrupt (mcause bit31=1, code=7)
 *  - Пример: прерывание каждую 1 мс при f_AHB=32 МГц, TIMER_DIV=31 (f_mtime=1МГц)
 *
 * В данном примере используется прямой опрос (polling) без прерываний —
 * для демонстрации работы таймера и измерения временных интервалов.
 */

USART_HandleTypeDef husart0;

void SystemClock_Config(void);
void USART_Init(void);

/* Инициализация SCR1_TIMER */
static void SCR1_Timer_Init(void)
{
    /* Делитель = 31: f_mtime = 32 МГц / 32 = 1 МГц (1 тик = 1 мкс) */
    SCR1_TIMER->TIMER_DIV  = 31;

    /* Сбросить счётчик */
    SCR1_TIMER->MTIME  = 0;
    SCR1_TIMER->MTIMEH = 0;

    /* Включить таймер, источник — AHB (бит CLKSRC=0) */
    SCR1_TIMER->TIMER_CTRL = SCR1_TIMER_CTRL_ENABLE_M;
}

/* Чтение 64-битного mtime без гонки (атомарный read) */
static uint64_t mtime_read(void)
{
    uint32_t hi1, lo, hi2;
    do {
        hi1 = SCR1_TIMER->MTIMEH;
        lo  = SCR1_TIMER->MTIME;
        hi2 = SCR1_TIMER->MTIMEH;
    } while (hi1 != hi2);  /* Повторить при переносе старшего слова */
    return ((uint64_t)hi1 << 32) | lo;
}

/* Задержка в микросекундах (f_mtime = 1 МГц → 1 тик = 1 мкс) */
static void delay_us(uint32_t us)
{
    uint64_t target = mtime_read() + us;
    while (mtime_read() < target);
}

int main(void)
{
    SystemClock_Config();
    USART_Init();
    SCR1_Timer_Init();

    xprintf("SCR1 mtime demo. f_mtime = 1 MHz (1 tick = 1 us)\\n");

    uint32_t loop = 0;
    while (1)
    {
        uint64_t t0 = mtime_read();

        /* Измерить реальное время задержки 10 000 мкс */
        delay_us(10000);

        uint64_t t1 = mtime_read();
        uint32_t elapsed_us = (uint32_t)(t1 - t0);

        xprintf("Loop %lu: elapsed = %lu us (expected ~10000)\\n",
                loop++, elapsed_us);
    }
}

void USART_Init(void)
{
    husart0.Instance             = UART_0;
    husart0.transmitting         = Enable;
    husart0.receiving            = Disable;
    husart0.frame                = Frame_8bit;
    husart0.parity_bit           = Disable;
    husart0.parity_bit_inversion = Disable;
    husart0.bit_direction        = LSB_First;
    husart0.data_inversion       = Disable;
    husart0.tx_inversion         = Disable;
    husart0.rx_inversion         = Disable;
    husart0.swap                 = Disable;
    husart0.lbm                  = Disable;
    husart0.stop_bit             = StopBit_1;
    husart0.mode                 = Asynchronous_Mode;
    husart0.xck_mode             = XCK_Mode3;
    husart0.last_byte_clock      = Disable;
    husart0.overwrite            = Disable;
    husart0.rts_mode             = AlwaysEnable_mode;
    husart0.dma_tx_request       = Disable;
    husart0.dma_rx_request       = Disable;
    husart0.channel_mode         = Duplex_Mode;
    husart0.tx_break_mode        = Disable;
    husart0.Interrupt.ctsie      = Disable;
    husart0.Interrupt.eie        = Disable;
    husart0.Interrupt.idleie     = Disable;
    husart0.Interrupt.lbdie      = Disable;
    husart0.Interrupt.peie       = Disable;
    husart0.Interrupt.rxneie     = Disable;
    husart0.Interrupt.tcie       = Disable;
    husart0.Interrupt.txeie      = Disable;
    husart0.Modem.rts            = Disable;
    husart0.Modem.cts            = Disable;
    husart0.Modem.dtr            = Disable;
    husart0.Modem.dcd            = Disable;
    husart0.Modem.dsr            = Disable;
    husart0.Modem.ri             = Disable;
    husart0.Modem.ddis           = Disable;
    husart0.baudrate             = 9600;
    HAL_USART_Init(&husart0);
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
}`
      }
    ],
    keyFunctions: ["_start", "SmallSystemInit()", "SystemInit()", "trap_handler()", "trap_entry", "read_csr()", "write_csr()", "set_csr()", "clear_csr()", "EPIC->MASK_LEVEL_SET", "EPIC->STATUS", "EPIC->CLEAR", "SCR1_TIMER->MTIME", "rdcycle()", "rdtime()"]
  }
];
