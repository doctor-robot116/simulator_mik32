export interface ConfigTool {
  id: string;
  mcu: string;
  vendor: string;
  description: string;
  /** Path to the standalone HTML (legacy author-built tool). */
  file?: string;
  /** If set, the tool is the generic engine loaded with ?mcu=<engineId>. */
  engineId?: string;
  /** Absolute external URL — opens in a new tab (cross-origin iframes blocked). */
  externalUrl?: string;
  /** Optional prominent badge (e.g. "Официальный"). */
  badge?: string;
  available: boolean;
}

export const CONFIG_TOOLS: ConfigTool[] = [
  {
    id: "mik32-web",
    mcu: "MIK32 АМУР — Web Configurator",
    vendor: "АО «Микрон»",
    description: "Полный визуальный конфигуратор всей периферии MIK32V2: PCC (тактирование), GPIO, UART, SPI, I²C, ADC, TIMER32, RTC, WDT. Генерирует main.c на базе HAL mik32v2-shared.",
    externalUrl: "/mik32-configurator",
    badge: "Встроенный",
    available: true,
  },
  {
    id: "mik32",
    mcu: "MIK32 АМУР — GPIO scheme",
    vendor: "АО «Микрон»",
    description: "Лёгкий конфигуратор только GPIO (Клиначев Н. В.). Удобен для иллюстрации распределения функций по выводам и быстрых учебных экспериментов",
    file: "MIK32 GPIO configuration.html",
    available: true,
  },
  {
    id: "k1948vk018",
    mcu: "К1948ВК018 / К1948ВК015",
    vendor: "АО «Микрон»",
    description: "Generic-движок (LQFP64). Размечен по предварительным данным",
    engineId: "k1948vk018",
    available: true,
  },
  {
    id: "k1921vk01t",
    mcu: "К1921ВК01Т",
    vendor: "АО «НИИЭТ»",
    description: "ARM Cortex-M4F, управление электроприводом",
    file: "K1921VK01T GPIO configuration.html",
    available: true,
  },
  {
    id: "ka5001vk1a",
    mcu: "КА5001ВК1А (К1946ВК028)",
    vendor: "АО «НИИЭТ»",
    description: "ARM Cortex-M4F с расширенными функциями",
    file: "KA5001VK1A GPIO configuration.html",
    available: true,
  },
  {
    id: "k1986ve92qi",
    mcu: "К1986ВЕ92QI",
    vendor: "ПКК «Миландр»",
    description: "32-разрядный микроконтроллер",
    file: "К1986ВЕ92QI GPIO configuration.html",
    available: true,
  },
  {
    id: "k1986vk01gi",
    mcu: "К1986ВК01GI",
    vendor: "ПКК «Миландр»",
    description: "32-разрядный микроконтроллер",
    file: "К1986ВК01GI GPIO configuration.html",
    available: true,
  },
  {
    id: "k1986vk025",
    mcu: "К1986ВК025",
    vendor: "ПКК «Миландр»",
    description: "32-разрядный счётчик электроэнергии",
    file: "К1986ВК025 GPIO configuration.html",
    available: true,
  },
  {
    id: "k1986ve1qi",
    mcu: "К1986ВЕ1QI",
    vendor: "ПКК «Миландр»",
    description: "Сканер выводов (1986ВЕ Авиа)",
    file: "К1986ВЕ1QI_ Сканер выводов.html",
    available: true,
  },
  {
    id: "lqfp100",
    mcu: "LQFP100",
    vendor: "Универсальный",
    description: "Сканер выводов корпуса LQFP100",
    file: "LQFP100_ Сканер выводов.html",
    available: true,
  },
  {
    id: "knv32cube",
    mcu: "KNV32Cube",
    vendor: "Справка",
    description: "Обзор семейства инструментов конфигурирования",
    file: "KNV32Cube.html",
    available: true,
  },
];

/**
 * Map legacy in-tool cross-link `<a href="...htm">` filenames → our tool id.
 * Used to intercept clicks inside the iframe and switch the active tool
 * within the same modal window (instead of failing 404).
 */
export const LEGACY_HREF_MAP: Record<string, string> = {
  "MIK32-QFP64.htm": "mik32",
  "K1921VK01T-QFP208.htm": "k1921vk01t",
  "KA5001VK1A-PBGA400.htm": "ka5001vk1a",
  "MDR32F9Q2I-LQFP64.htm": "k1986ve92qi",
  "MDR1201GI-BGA144.htm": "k1986vk01gi",
  "MDR32F02FI-QFN88.htm": "k1986vk025",
  "MDR32F1QI-LQFP144.htm": "k1986ve1qi",
  "LQFP100.htm": "lqfp100",
  "KNV32Cube.htm": "knv32cube",
};

export const TOOLS_AUTHOR = {
  name: "Клиначев Николай Васильевич",
  year: "2022",
  url: "http://model.exponenta.ru/",
  note: "Автор оригинальных интерактивных инструментов конфигурирования",
};

function basePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function toolUrl(tool: ConfigTool): string | null {
  if (tool.engineId) {
    return `${basePath()}/tools/pin-configurator.html?mcu=${encodeURIComponent(tool.engineId)}`;
  }
  if (tool.file) {
    return `${basePath()}/tools/${encodeURIComponent(tool.file)}`;
  }
  return null;
}
