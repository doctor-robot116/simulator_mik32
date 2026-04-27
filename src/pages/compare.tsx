import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCompareArrows, Download, ExternalLink } from "lucide-react";

type Pair = {
  id: string;
  title: string;
  blurb: string;
  hal: { path: string; label: string };
  bare: { path: string; label: string };
};

const PAIRS: Pair[] = [
  {
    id: "gpio",
    title: "GPIO — мигалка / базовый ввод-вывод",
    blurb:
      "HAL прячет настройку PAD_CONFIG, тактирования и направления за HAL_GPIO_Init(). Baremetal делает то же руками: пишет в регистры PM, PAD_CONFIG и GPIO напрямую.",
    hal: { path: "sdk/periphery/gpio.h", label: "periphery/gpio.h" },
    bare: { path: "baremetal/ex_base/main.c", label: "ex_base/main.c" },
  },
  {
    id: "uart",
    title: "UART — последовательный вывод",
    blurb:
      "HAL использует UART_HandleTypeDef и HAL_UART_Transmit. Baremetal пишет байты в регистр TXDATA и опрашивает флаги статуса.",
    hal: { path: "sdk/libs/uart_lib.c", label: "libs/uart_lib.c" },
    bare: { path: "baremetal/ex_base_3/main.c", label: "ex_base_3/main.c" },
  },
  {
    id: "adc",
    title: "ADC — аналого-цифровое преобразование",
    blurb:
      "HAL: HAL_ADC_Init() + HAL_ADC_Single(). Baremetal: ANALOG_REG->ADC_CFG напрямую, ожидание EOC флага.",
    hal: { path: "sdk/periphery/analog_reg.h", label: "periphery/analog_reg.h" },
    bare: { path: "baremetal/ex_adc/main.c", label: "ex_adc/main.c" },
  },
  {
    id: "dac",
    title: "DAC — цифро-аналоговое преобразование",
    blurb:
      "HAL: HAL_DAC_Init/HAL_DAC_SetValue. Baremetal: запись в ANALOG_REG->DAC0_CFG / DAC0_VALUE.",
    hal: { path: "sdk/periphery/analog_reg.h", label: "periphery/analog_reg.h" },
    bare: { path: "baremetal/ex_dac/main.c", label: "ex_dac/main.c" },
  },
  {
    id: "i2c",
    title: "I²C — обмен с датчиками",
    blurb:
      "HAL предоставляет HAL_I2C_Master_Transmit/Receive с обработкой ARLO/NACK. Baremetal вручную взводит START/STOP и ждёт TXIS/RXNE.",
    hal: { path: "sdk/periphery/i2c.h", label: "periphery/i2c.h" },
    bare: { path: "baremetal/ex_i2c/main.c", label: "ex_i2c/main.c" },
  },
  {
    id: "spi",
    title: "SPI — обмен по шине / DMA",
    blurb:
      "HAL: HAL_SPI_Exchange + DMA-каналы через HAL_DMA_*. Baremetal: настройка SPI_CR1/CR2 и DMA-регистров напрямую, без слоя абстракции.",
    hal: { path: "sdk/libs/spi_lib.c", label: "libs/spi_lib.c" },
    bare: { path: "baremetal/ex_spi_dma/main.c", label: "ex_spi_dma/main.c" },
  },
  {
    id: "timer",
    title: "Timer32 — таймер / прерывания",
    blurb:
      "HAL: HAL_Timer32_Init + callback. Baremetal: TIMER32_x->ENABLE = ..., обработчик IRQ напрямую через EPIC.",
    hal: { path: "sdk/periphery/timer32.h", label: "periphery/timer32.h" },
    bare: { path: "baremetal/ex_timer/main.c", label: "ex_timer/main.c" },
  },
  {
    id: "crc",
    title: "CRC — аппаратный подсчёт",
    blurb:
      "HAL: HAL_CRC_Calculate. Baremetal: запись данных в CRC->DATA_IN, чтение CRC->DATA_OUT.",
    hal: { path: "sdk/periphery/crc.h", label: "periphery/crc.h" },
    bare: { path: "baremetal/ex_crc/main.c", label: "ex_crc/main.c" },
  },
  {
    id: "crypto",
    title: "Crypto — Кузнечик / Магма",
    blurb:
      "HAL: HAL_Crypto_*. Baremetal: прямые регистры CRYPTO->KEY/INIT/DATA + флаги готовности.",
    hal: { path: "sdk/periphery/crypto.h", label: "periphery/crypto.h" },
    bare: { path: "baremetal/ex_crypto/main.c", label: "ex_crypto/main.c" },
  },
];

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function CodePane({
  title,
  variant,
  src,
  label,
  fileName,
}: {
  title: string;
  variant: "hal" | "bare";
  src: string;
  label: string;
  fileName: string;
}) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${basePath()}/${src}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status))))
      .then((t) => !cancelled && setContent(t))
      .catch((e) => !cancelled && setContent("// Ошибка загрузки: " + e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [src]);

  const tone =
    variant === "hal"
      ? "border-emerald-500/30"
      : "border-amber-500/30";

  return (
    <Card className={`border-2 ${tone}`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
          <div className="font-mono text-xs flex items-center gap-2 min-w-0">
            <Badge
              variant={variant === "hal" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {title}
            </Badge>
            <span className="truncate">{label}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              const a = document.createElement("a");
              a.href = `${basePath()}/${src}`;
              a.download = fileName;
              a.click();
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ScrollArea className="h-[60vh]">
          <pre className="p-3 text-[11px] font-mono whitespace-pre overflow-x-auto leading-snug">
            {loading ? "Загрузка…" : content}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function ComparePage() {
  const [activeId, setActiveId] = useState<string>(PAIRS[0].id);
  const active = useMemo(
    () => PAIRS.find((p) => p.id === activeId) || PAIRS[0],
    [activeId],
  );

  return (
    <Layout>
      <div className="container max-w-[1600px] py-6 px-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitCompareArrows className="w-7 h-7 text-primary" />
            HAL vs Baremetal — сравнение SDK
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-3xl">
            Один и тот же модуль периферии в двух исполнениях: слева —
            официальный HAL из{" "}
            <a
              href="/sdk"
              className="text-primary hover:underline"
            >
              /sdk
            </a>
            , справа — пример без HAL из{" "}
            <a
              href="/baremetal"
              className="text-primary hover:underline"
            >
              /baremetal
            </a>{" "}
            (
            <a
              href="https://gitflic.ru/project/rabidrabbit/mik32-amur-simple"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              rabidrabbit/mik32-amur-simple
              <ExternalLink className="inline w-3 h-3 ml-0.5" />
            </a>
            ). Хорошо видно, что прячет HAL и какие регистры реально дёргаются.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PAIRS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                activeId === p.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              {p.title.split(" — ")[0]}
            </button>
          ))}
        </div>

        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="font-semibold text-sm mb-1">{active.title}</div>
            <div className="text-xs text-muted-foreground">{active.blurb}</div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CodePane
            title="HAL · /sdk"
            variant="hal"
            src={active.hal.path}
            label={active.hal.label}
            fileName={active.hal.label.split("/").pop() || "file"}
          />
          <CodePane
            title="Baremetal · /baremetal"
            variant="bare"
            src={active.bare.path}
            label={active.bare.label}
            fileName={active.bare.label.split("/").pop() || "file"}
          />
        </div>
      </div>
    </Layout>
  );
}
