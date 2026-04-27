import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu,
  Clock,
  Cable,
  Activity,
  Timer as TimerIcon,
  Lock,
  Copy,
  RotateCcw,
  Download,
} from "lucide-react";

/* ───────────────────── Configuration shape ───────────────────── */

type ClockSource = "hsi32m" | "hse" | "lsi32k" | "lse";

interface Cfg {
  pcc: {
    clockSources: ClockSource[];
    systemSource: ClockSource;
    forceSystemSource: boolean;
    monitorSource: "lsi32k" | "lse";
    ahb: number;
    apb_m: number;
    apb_p: number;
    coeff_HSI32M: number;
    coeff_LSI32K: number;
  };
  gpio: {
    enabled: boolean;
    pins: Record<string, { mode: GpioMode; pull: GpioPull }>;
  };
  usart: {
    enabled: boolean;
    instance: "UART_0" | "UART_1";
    baudrate: number;
    dataBits: 7 | 8 | 9;
    stopBits: 1 | 2;
    parity: "none" | "even" | "odd";
  };
  spi0: SpiCfg;
  spi1: SpiCfg;
  i2c0: I2cCfg;
  i2c1: I2cCfg;
  adc: { enabled: boolean; channel: number; vRef: "internal" | "external" };
  timer32: { enabled: boolean; prescaler: number; period: number };
  rtc: { enabled: boolean };
  wdt: { enabled: boolean; timeout: number };
}

type GpioMode = "GPIO_OUTPUT" | "GPIO_INPUT" | "SERIAL" | "ANALOG";
type GpioPull = "NONE" | "UP" | "DOWN";

interface SpiCfg {
  enabled: boolean;
  role: "master" | "slave";
  cpha: 0 | 1;
  cpol: 0 | 1;
  divider: number;
  dataSize: 8 | 16 | 32;
}
interface I2cCfg {
  enabled: boolean;
  speed: "standard" | "fast" | "fast_plus";
  ownAddress: number;
}

const STORAGE_KEY = "mik32cfg:v1";

const DEFAULT: Cfg = {
  pcc: {
    clockSources: ["hsi32m", "lsi32k"],
    systemSource: "hsi32m",
    forceSystemSource: false,
    monitorSource: "lsi32k",
    ahb: 1,
    apb_m: 1,
    apb_p: 1,
    coeff_HSI32M: 128,
    coeff_LSI32K: 8,
  },
  gpio: {
    enabled: true,
    pins: {
      P0_5: { mode: "SERIAL", pull: "NONE" },
      P0_6: { mode: "SERIAL", pull: "NONE" },
    },
  },
  usart: {
    enabled: true,
    instance: "UART_0",
    baudrate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  spi0: { enabled: false, role: "master", cpha: 0, cpol: 0, divider: 16, dataSize: 8 },
  spi1: { enabled: false, role: "master", cpha: 0, cpol: 0, divider: 16, dataSize: 8 },
  i2c0: { enabled: false, speed: "standard", ownAddress: 0x10 },
  i2c1: { enabled: false, speed: "standard", ownAddress: 0x10 },
  adc: { enabled: false, channel: 0, vRef: "internal" },
  timer32: { enabled: false, prescaler: 0, period: 32000 },
  rtc: { enabled: false },
  wdt: { enabled: false, timeout: 1000 },
};

function loadCfg(): Cfg {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT);
}
function saveCfg(c: Cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/* ───────────────────── Code generator ───────────────────── */

function generateCode(c: Cfg): string {
  const out: string[] = [];
  out.push("/* Сгенерировано MIK32 Web Configurator (встроенным) */");
  out.push('#include "mik32_hal_pcc.h"');
  out.push('#include "mik32_hal_gpio.h"');
  if (c.usart.enabled) out.push('#include "mik32_hal_usart.h"');
  if (c.spi0.enabled || c.spi1.enabled) out.push('#include "mik32_hal_spi.h"');
  if (c.i2c0.enabled || c.i2c1.enabled) out.push('#include "mik32_hal_i2c.h"');
  if (c.adc.enabled) out.push('#include "mik32_hal_adc.h"');
  if (c.timer32.enabled) out.push('#include "mik32_hal_timer32.h"');
  if (c.rtc.enabled) out.push('#include "mik32_hal_rtc.h"');
  if (c.wdt.enabled) out.push('#include "mik32_hal_wdt.h"');
  out.push("");

  /* Periphery handles */
  if (c.usart.enabled) out.push(`UART_HandleTypeDef h${c.usart.instance.toLowerCase()};`);
  if (c.spi0.enabled) out.push("SPI_HandleTypeDef hspi0;");
  if (c.spi1.enabled) out.push("SPI_HandleTypeDef hspi1;");
  if (c.i2c0.enabled) out.push("I2C_HandleTypeDef hi2c0;");
  if (c.i2c1.enabled) out.push("I2C_HandleTypeDef hi2c1;");
  if (c.adc.enabled) out.push("ADC_HandleTypeDef hadc;");
  if (c.timer32.enabled) out.push("TIMER32_HandleTypeDef htimer32;");
  if (c.rtc.enabled) out.push("RTC_HandleTypeDef hrtc;");
  if (c.wdt.enabled) out.push("WDT_HandleTypeDef hwdt;");
  out.push("");

  /* SystemClock_Config — соответствует API mik32_hal_pcc.h */
  out.push("static void SystemClock_Config(void) {");
  out.push("    PCC_InitTypeDef PCC_OscInit = {0};");
  const srcMap: Record<ClockSource, string> = {
    hsi32m: "PCC_OSCILLATORTYPE_HSI32M",
    hse: "PCC_OSCILLATORTYPE_OSC32M",
    lsi32k: "PCC_OSCILLATORTYPE_LSI32K",
    lse: "PCC_OSCILLATORTYPE_OSC32K",
  };
  const sysMap: Record<ClockSource, string> = {
    hsi32m: "PCC_SYSTEM_CLOCK_HSI32M",
    hse: "PCC_SYSTEM_CLOCK_OSC32M",
    lsi32k: "PCC_SYSTEM_CLOCK_LSI32K",
    lse: "PCC_SYSTEM_CLOCK_OSC32K",
  };
  const srcMask = c.pcc.clockSources.map((s) => srcMap[s]).join(" | ") || "PCC_OSCILLATORTYPE_HSI32M";
  out.push(`    PCC_OscInit.OscillatorEnable = ${srcMask};`);
  out.push(`    PCC_OscInit.FreqMon.OscillatorSystem = ${sysMap[c.pcc.systemSource]};`);
  out.push(`    PCC_OscInit.FreqMon.ForceOscSys = ${c.pcc.forceSystemSource ? "PCC_FORCE_OSC_SYS_FIXED" : "PCC_FORCE_OSC_SYS_UNFIXED"};`);
  out.push(`    PCC_OscInit.FreqMon.Force32KClk  = ${c.pcc.monitorSource === "lse" ? "PCC_FREQ_MONITOR_SOURCE_OSC32K" : "PCC_FREQ_MONITOR_SOURCE_LSI32K"};`);
  out.push(`    PCC_OscInit.AHBDivider = ${c.pcc.ahb};`);
  out.push(`    PCC_OscInit.APBMDivider = ${c.pcc.apb_m};`);
  out.push(`    PCC_OscInit.APBPDivider = ${c.pcc.apb_p};`);
  out.push(`    PCC_OscInit.HSI32MCalibrationValue = ${c.pcc.coeff_HSI32M};`);
  out.push(`    PCC_OscInit.LSI32KCalibrationValue = ${c.pcc.coeff_LSI32K};`);
  out.push(`    PCC_OscInit.RTCClockSelection = PCC_RTC_CLOCK_SOURCE_AUTO;`);
  out.push(`    PCC_OscInit.RTCClockCPUSelection = PCC_CPU_RTC_CLOCK_SOURCE_AUTO;`);
  out.push("    HAL_PCC_Config(&PCC_OscInit);");
  out.push("}");
  out.push("");

  /* GPIO_Init — группировка по портам, как в mik32v2-shared/libs/uart_lib.c */
  if (c.gpio.enabled) {
    out.push("static void MX_GPIO_Init(void) {");
    out.push("    __HAL_PCC_GPIO_0_CLK_ENABLE();");
    out.push("    __HAL_PCC_GPIO_1_CLK_ENABLE();");
    out.push("    __HAL_PCC_GPIO_2_CLK_ENABLE();");
    const groups: Record<string, { bit: number; mode: GpioMode; pull: GpioPull }[]> = {
      GPIO_0: [],
      GPIO_1: [],
      GPIO_2: [],
    };
    Object.entries(c.gpio.pins).forEach(([k, v]) => {
      const m = k.match(/^P(\d)_(\d+)$/);
      if (!m) return;
      const port = "GPIO_" + m[1];
      if (groups[port]) groups[port].push({ bit: +m[2], mode: v.mode, pull: v.pull });
    });
    Object.entries(groups).forEach(([port, list]) => {
      if (!list.length) return;
      // Same mode/pull → one HAL_GPIO_Init; otherwise emit per-pin block.
      const byKey = list.reduce<Record<string, number[]>>((a, p) => {
        const key = p.mode + "|" + p.pull;
        (a[key] ||= []).push(p.bit);
        return a;
      }, {});
      Object.entries(byKey).forEach(([key, bits]) => {
        const [mode, pull] = key.split("|");
        out.push("    {");
        out.push("        GPIO_InitTypeDef init = {0};");
        out.push("        init.Pin  = " + bits.map((b) => "GPIO_PIN_" + b).join(" | ") + ";");
        out.push(`        init.Mode = HAL_GPIO_MODE_${mode};`);
        out.push(`        init.Pull = HAL_GPIO_PULL_${pull};`);
        out.push(`        HAL_GPIO_Init(${port}, &init);`);
        out.push("    }");
      });
    });
    out.push("}");
    out.push("");
  }

  /* USART_Init */
  if (c.usart.enabled) {
    const inst = c.usart.instance;
    const handle = "h" + inst.toLowerCase();
    out.push(`static void MX_${inst}_Init(void) {`);
    out.push(`    ${handle}.Instance = ${inst};`);
    out.push(`    ${handle}.transmitting = Enable;`);
    out.push(`    ${handle}.receiving = Enable;`);
    out.push(`    ${handle}.frame = Frame_${c.usart.dataBits}bit;`);
    out.push(`    ${handle}.parity_bit = Parity_${c.usart.parity === "none" ? "None" : c.usart.parity === "even" ? "Even" : "Odd"};`);
    out.push(`    ${handle}.stop_bit = StopBit_${c.usart.stopBits};`);
    out.push(`    ${handle}.baudrate = ${c.usart.baudrate};`);
    out.push(`    HAL_UART_Init(&${handle});`);
    out.push("}");
    out.push("");
  }

  /* SPI_Init */
  const emitSpi = (id: 0 | 1, cfg: SpiCfg) => {
    if (!cfg.enabled) return;
    out.push(`static void MX_SPI${id}_Init(void) {`);
    out.push(`    hspi${id}.Instance = SPI_${id};`);
    out.push(`    hspi${id}.Init.Mode = HAL_SPI_MODE_${cfg.role.toUpperCase()};`);
    out.push(`    hspi${id}.Init.CLKPhase = SPI_PHASE_${cfg.cpha === 0 ? "FIRST" : "SECOND"};`);
    out.push(`    hspi${id}.Init.CLKPolarity = SPI_POLARITY_${cfg.cpol === 0 ? "LOW" : "HIGH"};`);
    out.push(`    hspi${id}.Init.BaudRateDiv = SPI_BAUDRATE_DIV${cfg.divider};`);
    out.push(`    hspi${id}.Init.DataSize = SPI_DATASIZE_${cfg.dataSize}BIT;`);
    out.push(`    HAL_SPI_Init(&hspi${id});`);
    out.push("}");
    out.push("");
  };
  emitSpi(0, c.spi0);
  emitSpi(1, c.spi1);

  /* I2C_Init */
  const emitI2c = (id: 0 | 1, cfg: I2cCfg) => {
    if (!cfg.enabled) return;
    const speedMap = { standard: "100000", fast: "400000", fast_plus: "1000000" } as const;
    out.push(`static void MX_I2C${id}_Init(void) {`);
    out.push(`    hi2c${id}.Instance = I2C_${id};`);
    out.push(`    hi2c${id}.Init.Mode = HAL_I2C_MODE_MASTER;`);
    out.push(`    hi2c${id}.Init.Timing.ClockSpeed = ${speedMap[cfg.speed]};`);
    out.push(`    hi2c${id}.Init.OwnAddress1 = 0x${cfg.ownAddress.toString(16).toUpperCase()};`);
    out.push(`    hi2c${id}.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;`);
    out.push(`    HAL_I2C_Init(&hi2c${id});`);
    out.push("}");
    out.push("");
  };
  emitI2c(0, c.i2c0);
  emitI2c(1, c.i2c1);

  /* ADC */
  if (c.adc.enabled) {
    out.push("static void MX_ADC_Init(void) {");
    out.push("    hadc.Instance = ANALOG_REG;");
    out.push(`    hadc.Init.Sel = ADC_CHANNEL${c.adc.channel};`);
    out.push(`    hadc.Init.EXTRef = ${c.adc.vRef === "external" ? "ADC_EXTREF_ON" : "ADC_EXTREF_OFF"};`);
    out.push("    HAL_ADC_Init(&hadc);");
    out.push("}");
    out.push("");
  }

  /* TIMER32 */
  if (c.timer32.enabled) {
    out.push("static void MX_TIMER32_Init(void) {");
    out.push("    htimer32.Instance = TIMER32_1;");
    out.push("    htimer32.Top = " + c.timer32.period + ";");
    out.push("    htimer32.State = TIMER32_STATE_DISABLE;");
    out.push(`    htimer32.Clock.Source = TIMER32_SOURCE_PRESCALER;`);
    out.push(`    htimer32.Clock.Prescaler = ${c.timer32.prescaler};`);
    out.push("    htimer32.InterruptMask = 0;");
    out.push("    htimer32.CountMode = TIMER32_COUNTMODE_FORWARD;");
    out.push("    HAL_Timer32_Init(&htimer32);");
    out.push("}");
    out.push("");
  }

  /* RTC / WDT — простые заготовки */
  if (c.rtc.enabled) {
    out.push("static void MX_RTC_Init(void) {");
    out.push("    hrtc.Instance = RTC;");
    out.push("    HAL_RTC_Init(&hrtc);");
    out.push("}");
    out.push("");
  }
  if (c.wdt.enabled) {
    out.push("static void MX_WDT_Init(void) {");
    out.push("    hwdt.Instance = WDT;");
    out.push(`    hwdt.Init.Timeout = ${c.wdt.timeout};`);
    out.push("    HAL_WDT_Init(&hwdt);");
    out.push("}");
    out.push("");
  }

  /* main */
  out.push("int main(void) {");
  out.push("    HAL_Init();");
  out.push("    SystemClock_Config();");
  if (c.gpio.enabled) out.push("    MX_GPIO_Init();");
  if (c.usart.enabled) out.push(`    MX_${c.usart.instance}_Init();`);
  if (c.spi0.enabled) out.push("    MX_SPI0_Init();");
  if (c.spi1.enabled) out.push("    MX_SPI1_Init();");
  if (c.i2c0.enabled) out.push("    MX_I2C0_Init();");
  if (c.i2c1.enabled) out.push("    MX_I2C1_Init();");
  if (c.adc.enabled) out.push("    MX_ADC_Init();");
  if (c.timer32.enabled) out.push("    MX_TIMER32_Init();");
  if (c.rtc.enabled) out.push("    MX_RTC_Init();");
  if (c.wdt.enabled) out.push("    MX_WDT_Init();");
  out.push("    while (1) {");
  out.push("        /* TODO: ваш код */");
  out.push("    }");
  out.push("}");
  return out.join("\n");
}

/* ───────────────────── UI helpers ───────────────────── */

const SECTIONS = [
  { id: "pcc", group: "Система", label: "PCC — тактирование", icon: Clock },
  { id: "gpio", group: "Система", label: "GPIO", icon: Cpu },
  { id: "wdt", group: "Система", label: "WDT — сторож", icon: Activity },
  { id: "usart", group: "Интерфейсы", label: "UART", icon: Cable },
  { id: "spi0", group: "Интерфейсы", label: "SPI 0", icon: Cable },
  { id: "spi1", group: "Интерфейсы", label: "SPI 1", icon: Cable },
  { id: "i2c0", group: "Интерфейсы", label: "I²C 0", icon: Cable },
  { id: "i2c1", group: "Интерфейсы", label: "I²C 1", icon: Cable },
  { id: "adc", group: "Аналог", label: "АЦП", icon: Activity },
  { id: "timer32", group: "Таймеры", label: "TIMER32", icon: TimerIcon },
  { id: "rtc", group: "Таймеры", label: "RTC", icon: TimerIcon },
  { id: "crypto", group: "Безопасность", label: "Crypto", icon: Lock },
] as const;

const GROUPS = Array.from(new Set(SECTIONS.map((s) => s.group)));

/* ───────────────────── Page ───────────────────── */

export default function Mik32ConfiguratorPage() {
  const [cfg, setCfg] = useState<Cfg>(() => loadCfg());
  const [active, setActive] = useState<string>("pcc");
  const { toast } = useToast();
  const code = useMemo(() => generateCode(cfg), [cfg]);

  useEffect(() => saveCfg(cfg), [cfg]);

  const update = <K extends keyof Cfg>(k: K, v: Partial<Cfg[K]>) =>
    setCfg((c) => ({ ...c, [k]: { ...(c[k] as object), ...v } as Cfg[K] }));

  const reset = () => {
    if (!confirm("Сбросить всю конфигурацию к значениям по умолчанию?")) return;
    setCfg(structuredClone(DEFAULT));
  };
  const copyCode = () => {
    navigator.clipboard?.writeText(code).then(
      () => toast({ title: "Код скопирован", description: "main.c скопирован в буфер обмена" }),
      () => toast({ title: "Ошибка копирования", variant: "destructive" }),
    );
  };
  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/x-csrc" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.c";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container max-w-[1600px] py-4 px-4">
        <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" />
              MIK32 АМУР — Web Configurator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Встроенный конфигуратор всей периферии MIK32V2: PCC, GPIO, UART, SPI, I²C, ADC,
              таймеры. Генерирует <code className="text-xs">main.c</code> на основе официального HAL{" "}
              <code className="text-xs">mik32v2-shared</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Сбросить
            </Button>
            <Button size="sm" variant="outline" onClick={copyCode}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Копировать main.c
            </Button>
            <Button size="sm" onClick={downloadCode}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Скачать main.c
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_540px] gap-4">
          {/* Left: groups + sections */}
          <Card className="lg:sticky lg:top-4 lg:self-start">
            <CardContent className="p-2">
              <ScrollArea className="h-[78vh]">
                <div className="space-y-3">
                  {GROUPS.map((g) => (
                    <div key={g}>
                      <div className="px-2 text-xs uppercase font-semibold text-muted-foreground mb-1">
                        {g}
                      </div>
                      {SECTIONS.filter((s) => s.group === g).map((s) => {
                        const Icon = s.icon;
                        const enabled = isSectionEnabled(cfg, s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                              active === s.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 truncate">{s.label}</span>
                            {enabled && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  active === s.id ? "bg-white" : "bg-green-500"
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Middle: form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {SECTIONS.find((s) => s.id === active)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[72vh] pr-2">
                <SectionForm id={active} cfg={cfg} update={update} />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: code preview */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Сгенерированный код</CardTitle>
              <Badge variant="secondary" className="text-[10px]">main.c</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[72vh]">
                <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre">
                  {code}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function isSectionEnabled(c: Cfg, id: string): boolean {
  switch (id) {
    case "pcc": return true;
    case "gpio": return c.gpio.enabled;
    case "wdt": return c.wdt.enabled;
    case "usart": return c.usart.enabled;
    case "spi0": return c.spi0.enabled;
    case "spi1": return c.spi1.enabled;
    case "i2c0": return c.i2c0.enabled;
    case "i2c1": return c.i2c1.enabled;
    case "adc": return c.adc.enabled;
    case "timer32": return c.timer32.enabled;
    case "rtc": return c.rtc.enabled;
    default: return false;
  }
}

/* ───────────────────── Forms ───────────────────── */

interface FormProps {
  id: string;
  cfg: Cfg;
  update: <K extends keyof Cfg>(k: K, v: Partial<Cfg[K]>) => void;
}

function SectionForm({ id, cfg, update }: FormProps) {
  if (id === "pcc") return <PccForm cfg={cfg} update={update} />;
  if (id === "gpio") return <GpioForm cfg={cfg} update={update} />;
  if (id === "usart") return <UsartForm cfg={cfg} update={update} />;
  if (id === "spi0") return <SpiForm id={0} cfg={cfg.spi0} onChange={(v) => update("spi0", v)} />;
  if (id === "spi1") return <SpiForm id={1} cfg={cfg.spi1} onChange={(v) => update("spi1", v)} />;
  if (id === "i2c0") return <I2cForm id={0} cfg={cfg.i2c0} onChange={(v) => update("i2c0", v)} />;
  if (id === "i2c1") return <I2cForm id={1} cfg={cfg.i2c1} onChange={(v) => update("i2c1", v)} />;
  if (id === "adc") return <AdcForm cfg={cfg} update={update} />;
  if (id === "timer32") return <Timer32Form cfg={cfg} update={update} />;
  if (id === "rtc") return <ToggleOnly label="Включить RTC" value={cfg.rtc.enabled} onChange={(v) => update("rtc", { enabled: v })} note="RTC будет инициализирован с настройками по умолчанию (тактирование от LSE/LSI)." />;
  if (id === "wdt") return <WdtForm cfg={cfg} update={update} />;
  if (id === "crypto") return <p className="text-sm text-muted-foreground">Crypto-модуль (BC2/BC3) — детальные настройки появятся в следующих версиях.</p>;
  return null;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5 mb-3">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <Input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = +e.target.value;
        if (!Number.isNaN(v)) onChange(v);
      }}
    />
  );
}

function ToggleOnly({ label, value, onChange, note }: { label: string; value: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch checked={value} onCheckedChange={onChange} />
        <Label>{label}</Label>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

/* PCC */
function PccForm({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const p = cfg.pcc;
  const toggleSrc = (src: ClockSource) => {
    const s = new Set(p.clockSources);
    if (s.has(src)) s.delete(src); else s.add(src);
    update("pcc", { clockSources: Array.from(s) as ClockSource[] });
  };
  const sources: { v: ClockSource; label: string }[] = [
    { v: "hsi32m", label: "HSI32M (внутренний 32 МГц)" },
    { v: "hse",    label: "HSE / OSC32M (внешний 32 МГц)" },
    { v: "lsi32k", label: "LSI32K (внутренний 32 кГц)" },
    { v: "lse",    label: "LSE / OSC32K (внешний 32 кГц)" },
  ];
  return (
    <>
      <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Источники тактирования</p>
      <div className="space-y-1.5 mb-3">
        {sources.map((s) => (
          <label key={s.v} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={p.clockSources.includes(s.v)} onCheckedChange={() => toggleSrc(s.v)} />
            {s.label}
          </label>
        ))}
      </div>
      <Separator className="my-3" />
      <Field label="Приоритетный источник системы">
        <Select value={p.systemSource} onValueChange={(v) => update("pcc", { systemSource: v as ClockSource })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {sources.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-2 mb-3">
        <Switch checked={p.forceSystemSource} onCheckedChange={(v) => update("pcc", { forceSystemSource: v })} />
        <Label className="text-sm">Задать источник системы принудительно</Label>
      </div>
      <Field label="Опорный источник монитора частоты">
        <Select value={p.monitorSource} onValueChange={(v) => update("pcc", { monitorSource: v as "lsi32k" | "lse" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lsi32k">LSI32K</SelectItem>
            <SelectItem value="lse">LSE / OSC32K</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Separator className="my-3" />
      <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Делители</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Field label="AHB"><NumInput value={p.ahb} min={1} max={256} onChange={(n) => update("pcc", { ahb: n })} /></Field>
        <Field label="APB_M"><NumInput value={p.apb_m} min={1} max={256} onChange={(n) => update("pcc", { apb_m: n })} /></Field>
        <Field label="APB_P"><NumInput value={p.apb_p} min={1} max={256} onChange={(n) => update("pcc", { apb_p: n })} /></Field>
      </div>
      <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Калибровка</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="HSI32M"><NumInput value={p.coeff_HSI32M} min={0} max={255} onChange={(n) => update("pcc", { coeff_HSI32M: n })} /></Field>
        <Field label="LSI32K"><NumInput value={p.coeff_LSI32K} min={0} max={15} onChange={(n) => update("pcc", { coeff_LSI32K: n })} /></Field>
      </div>
    </>
  );
}

/* GPIO */
const GPIO_PORTS: Array<{ port: 0 | 1 | 2; bits: number[] }> = [
  { port: 0, bits: Array.from({ length: 16 }, (_, i) => i) },
  { port: 1, bits: Array.from({ length: 16 }, (_, i) => i) },
  { port: 2, bits: Array.from({ length: 8 }, (_, i) => i) },
];
function GpioForm({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const setPin = (key: string, mode: GpioMode, pull: GpioPull) =>
    update("gpio", { pins: { ...cfg.gpio.pins, [key]: { mode, pull } } });
  const removePin = (key: string) => {
    const p = { ...cfg.gpio.pins };
    delete p[key];
    update("gpio", { pins: p });
  };
  return (
    <>
      <ToggleOnly
        label="Включить GPIO (тактирование портов)"
        value={cfg.gpio.enabled}
        onChange={(v) => update("gpio", { enabled: v })}
      />
      <Separator className="my-3" />
      <p className="text-xs text-muted-foreground mb-3">
        Кликните на ножку, чтобы назначить режим. Назначения сохраняются автоматически.
      </p>
      <div className="space-y-4">
        {GPIO_PORTS.map(({ port, bits }) => (
          <div key={port}>
            <div className="text-sm font-semibold mb-1">GPIO_{port}</div>
            <div className="grid grid-cols-8 gap-1">
              {bits.map((b) => {
                const k = `P${port}_${b}`;
                const v = cfg.gpio.pins[k];
                return (
                  <button
                    key={k}
                    onClick={() => {
                      if (!v) setPin(k, "GPIO_OUTPUT", "NONE");
                      else if (v.mode === "GPIO_OUTPUT") setPin(k, "GPIO_INPUT", "UP");
                      else if (v.mode === "GPIO_INPUT") setPin(k, "SERIAL", "NONE");
                      else if (v.mode === "SERIAL") setPin(k, "ANALOG", "NONE");
                      else removePin(k);
                    }}
                    title={v ? `${v.mode} / pull ${v.pull}` : "не назначено"}
                    className={`text-[10px] p-1.5 rounded border ${
                      !v ? "bg-muted border-border text-muted-foreground"
                        : v.mode === "GPIO_OUTPUT" ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400"
                        : v.mode === "GPIO_INPUT" ? "bg-green-100 dark:bg-green-900/40 border-green-400"
                        : v.mode === "SERIAL" ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400"
                        : "bg-purple-100 dark:bg-purple-900/40 border-purple-400"
                    }`}
                  >
                    P{port}_{b}
                    {v && <div className="text-[8px] mt-0.5">{v.mode.replace("GPIO_", "")}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
        <div>Цикл по клику: → OUT → IN(pull-up) → SERIAL → ANALOG → не назначено.</div>
      </div>
    </>
  );
}

/* USART */
function UsartForm({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const u = cfg.usart;
  return (
    <>
      <ToggleOnly label="Включить UART" value={u.enabled} onChange={(v) => update("usart", { enabled: v })} />
      {u.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Экземпляр">
            <Select value={u.instance} onValueChange={(v) => update("usart", { instance: v as "UART_0" | "UART_1" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UART_0">UART_0 (P0_5/P0_6)</SelectItem>
                <SelectItem value="UART_1">UART_1 (P1_8/P1_9)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Скорость, бит/с">
            <NumInput value={u.baudrate} min={300} max={10000000} onChange={(n) => update("usart", { baudrate: n })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Биты данных">
              <Select value={String(u.dataBits)} onValueChange={(v) => update("usart", { dataBits: +v as 7 | 8 | 9 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Стоп-биты">
              <Select value={String(u.stopBits)} onValueChange={(v) => update("usart", { stopBits: +v as 1 | 2 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Чётность">
              <Select value={u.parity} onValueChange={(v) => update("usart", { parity: v as "none" | "even" | "odd" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Нет</SelectItem>
                  <SelectItem value="even">Чётная</SelectItem>
                  <SelectItem value="odd">Нечётная</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </>
      )}
    </>
  );
}

/* SPI */
function SpiForm({ id, cfg, onChange }: { id: 0 | 1; cfg: SpiCfg; onChange: (v: Partial<SpiCfg>) => void }) {
  return (
    <>
      <ToggleOnly label={`Включить SPI ${id}`} value={cfg.enabled} onChange={(v) => onChange({ enabled: v })} />
      {cfg.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Роль">
            <Select value={cfg.role} onValueChange={(v) => onChange({ role: v as "master" | "slave" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="slave">Slave</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="CPHA">
              <Select value={String(cfg.cpha)} onValueChange={(v) => onChange({ cpha: +v as 0 | 1 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (FIRST EDGE)</SelectItem>
                  <SelectItem value="1">1 (SECOND EDGE)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="CPOL">
              <Select value={String(cfg.cpol)} onValueChange={(v) => onChange({ cpol: +v as 0 | 1 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (LOW)</SelectItem>
                  <SelectItem value="1">1 (HIGH)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Делитель частоты" hint="2, 4, 8, 16, 32, 64, 128, 256">
            <Select value={String(cfg.divider)} onValueChange={(v) => onChange({ divider: +v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 4, 8, 16, 32, 64, 128, 256].map((d) => (
                  <SelectItem key={d} value={String(d)}>÷ {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Размер слова">
            <Select value={String(cfg.dataSize)} onValueChange={(v) => onChange({ dataSize: +v as 8 | 16 | 32 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 бит</SelectItem>
                <SelectItem value="16">16 бит</SelectItem>
                <SelectItem value="32">32 бит</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
    </>
  );
}

/* I2C */
function I2cForm({ id, cfg, onChange }: { id: 0 | 1; cfg: I2cCfg; onChange: (v: Partial<I2cCfg>) => void }) {
  return (
    <>
      <ToggleOnly label={`Включить I²C ${id}`} value={cfg.enabled} onChange={(v) => onChange({ enabled: v })} />
      {cfg.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Скорость">
            <Select value={cfg.speed} onValueChange={(v) => onChange({ speed: v as I2cCfg["speed"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (100 кГц)</SelectItem>
                <SelectItem value="fast">Fast (400 кГц)</SelectItem>
                <SelectItem value="fast_plus">Fast+ (1 МГц)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Собственный адрес (7-bit)" hint="0x00 — 0x7F">
            <Input
              value={"0x" + cfg.ownAddress.toString(16).toUpperCase()}
              onChange={(e) => {
                const v = parseInt(e.target.value.replace(/^0x/i, ""), 16);
                if (!Number.isNaN(v) && v >= 0 && v <= 0x7f) onChange({ ownAddress: v });
              }}
            />
          </Field>
        </>
      )}
    </>
  );
}

/* ADC */
function AdcForm({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const a = cfg.adc;
  return (
    <>
      <ToggleOnly label="Включить АЦП" value={a.enabled} onChange={(v) => update("adc", { enabled: v })} />
      {a.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Канал">
            <Select value={String(a.channel)} onValueChange={(v) => update("adc", { channel: +v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>ADC_CHANNEL{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Опорное напряжение">
            <Select value={a.vRef} onValueChange={(v) => update("adc", { vRef: v as "internal" | "external" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Внутреннее</SelectItem>
                <SelectItem value="external">Внешнее (VREF)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
    </>
  );
}

/* TIMER32 */
function Timer32Form({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const t = cfg.timer32;
  return (
    <>
      <ToggleOnly label="Включить TIMER32" value={t.enabled} onChange={(v) => update("timer32", { enabled: v })} />
      {t.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Предделитель" hint="0 … 255">
            <NumInput value={t.prescaler} min={0} max={255} onChange={(n) => update("timer32", { prescaler: n })} />
          </Field>
          <Field label="Период (Top)" hint="0 … 4 294 967 295">
            <NumInput value={t.period} min={0} onChange={(n) => update("timer32", { period: n })} />
          </Field>
        </>
      )}
    </>
  );
}

/* WDT */
function WdtForm({ cfg, update }: { cfg: Cfg; update: FormProps["update"] }) {
  const w = cfg.wdt;
  return (
    <>
      <ToggleOnly label="Включить сторожевой таймер (WDT)" value={w.enabled} onChange={(v) => update("wdt", { enabled: v })} />
      {w.enabled && (
        <>
          <Separator className="my-3" />
          <Field label="Таймаут, мс">
            <NumInput value={w.timeout} min={1} onChange={(n) => update("wdt", { timeout: n })} />
          </Field>
        </>
      )}
    </>
  );
}
