import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode2, FolderOpen, Download, ExternalLink } from "lucide-react";

type SdkFile = { path: string; label: string; group: string };

const SDK_FILES: SdkFile[] = [
  // include/
  ...["mik32_memory_map.h", "csr.h", "riscv_csr_encoding.h", "scr1_csr_encoding.h", "scr1_specific.h"]
    .map((f) => ({ path: `include/${f}`, label: f, group: "include" })),
  // periphery/
  ...[
    "analog_reg.h", "boot.h", "crc.h", "crypto.h", "dma_config.h", "eeprom.h", "epic.h",
    "gpio.h", "gpio_irq.h", "i2c.h", "otp.h", "pad_config.h", "power_manager.h",
    "pvd_control.h", "rtc.h", "scr1_timer.h", "spi.h", "spifi.h", "timer16.h",
    "timer32.h", "uart.h", "wakeup.h", "wdt.h", "wdt_bus.h",
  ].map((f) => ({ path: `periphery/${f}`, label: f, group: "periphery" })),
  // libs/
  ...["dma_lib.h", "dma_lib.c", "rtc_lib.h", "rtc_lib.c", "spi_lib.h", "spi_lib.c",
      "uart_lib.h", "uart_lib.c", "xprintf.h", "xprintf.c"]
    .map((f) => ({ path: `libs/${f}`, label: f, group: "libs" })),
  // ldscripts/
  ...["sections.lds", "eeprom.ld", "ram.ld", "spifi.ld"]
    .map((f) => ({ path: `ldscripts/${f}`, label: f, group: "ldscripts" })),
  // runtime/
  { path: "runtime/crt0.S", label: "crt0.S", group: "runtime" },
];

const GROUP_LABELS: Record<string, string> = {
  include: "Заголовки ядра",
  periphery: "Периферия (регистры)",
  libs: "HAL-библиотеки",
  ldscripts: "Скрипты линковки",
  runtime: "Runtime",
};

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export default function SdkPage() {
  const [active, setActive] = useState<SdkFile>(SDK_FILES.find((f) => f.label === "gpio.h")!);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${basePath()}/sdk/${active.path}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status))))
      .then((t) => !cancelled && setContent(t))
      .catch((e) => !cancelled && setContent("// Ошибка загрузки: " + e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const g: Record<string, SdkFile[]> = {};
    SDK_FILES.forEach((f) => {
      if (q && !f.label.toLowerCase().includes(q)) return;
      (g[f.group] ||= []).push(f);
    });
    return g;
  }, [filter]);

  return (
    <Layout>
      <div className="container max-w-7xl py-6 px-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCode2 className="w-7 h-7 text-primary" />
            SDK MIK32V2 — заголовки и HAL
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Официальный набор для сборки приложений под MIK32V2: заголовочные файлы,
            HAL-библиотеки периферии, скрипты линковки и стартовый код.
            Источник:{" "}
            <a
              href="https://github.com/MikronMIK32/mik32v2-shared"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MikronMIK32/mik32v2-shared <ExternalLink className="inline w-3 h-3" />
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <Card className="md:sticky md:top-4 md:self-start">
            <CardContent className="p-3 space-y-3">
              <Input
                placeholder="Поиск файла…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8"
              />
              <ScrollArea className="h-[70vh] pr-2">
                <div className="space-y-3">
                  {Object.entries(grouped).map(([g, files]) => (
                    <div key={g}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {GROUP_LABELS[g] || g}
                      </div>
                      <div className="space-y-0.5">
                        {files.map((f) => (
                          <button
                            key={f.path}
                            onClick={() => setActive(f)}
                            className={`w-full text-left px-2 py-1 rounded text-sm font-mono truncate ${
                              active.path === f.path
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <div className="font-mono text-sm flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {active.group}
                  </Badge>
                  /{active.path}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `${basePath()}/sdk/${active.path}`;
                    a.download = active.label;
                    a.click();
                  }}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Скачать
                </Button>
              </div>
              <ScrollArea className="h-[75vh]">
                <pre className="p-4 text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed">
                  {loading ? "Загрузка…" : content}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
