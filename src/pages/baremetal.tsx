import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cpu, FolderOpen, Download, ExternalLink } from "lucide-react";

type Manifest = {
  generatedAt: string;
  groups: Record<string, string[]>;
};

const GROUP_LABELS: Record<string, string> = {
  _root: "Корень",
  mik32_hwlibs: "Регистры (mik32_hwlibs)",
  libbaremetal: "libbaremetal",
  ld_scripts: "Скрипты линковки",
  scmrtos: "scmRTOS",
  devices: "Драйверы устройств",
  fonts: "Шрифты",
  images: "Изображения (исходники)",
  docs: "Документация",
  tools: "Утилиты сборки/прошивки",
  utils: "Утилиты",
  jlink_related: "JLink",
  ex_base: "ex_base — GPIO + UART (база)",
  ex_base_3: "ex_base_3 — базовый шаблон",
  ex_adc: "ex_adc — АЦП, один канал",
  ex_adc_2: "ex_adc_2 — АЦП, несколько каналов",
  ex_buttons: "ex_buttons — кнопки",
  ex_crc: "ex_crc — блок CRC",
  ex_crypto: "ex_crypto — блок CRYPTO",
  ex_dac: "ex_dac — ЦАП, DDS-генератор",
  ex_encoder: "ex_encoder — поворотный энкодер (GPIO_IRQ)",
  ex_i2c: "ex_i2c — I2C (BME280/BMP280)",
  ex_mfrc522: "ex_mfrc522 — NFC RC522 (Mifare)",
  ex_onewire: "ex_onewire — 1-Wire через UART",
  ex_1wire_copy_key: "ex_1wire_copy_key — копирование iButton",
  ex_picolibc: "ex_picolibc — сборка с picolibc",
  ex_radio_rc: "ex_radio_rc — SI4432 приём",
  ex_radio_tr: "ex_radio_tr — SI4432 передача",
  ex_spi_dma: "ex_spi_dma — экран ST7735 (SPI+DMA)",
  ex_spi_dma_2: "ex_spi_dma_2 — экран ILI9341 (SPI+DMA)",
  ex_picojpeg: "ex_picojpeg — JPEG → экран",
  ex_picojpeg_2: "ex_picojpeg_2 — JPEG, 38 кадров + UART таймер",
  ex_touchscreen: "ex_touchscreen — XPT2046 + EEPROM",
  ex_tsens: "ex_tsens — датчик температуры МК",
  ex_timer: "ex_timer — кухонный таймер (SPI+DAC+EEPROM)",
  ex_scmrtos: "ex_scmrtos — мигалка под scmRTOS",
  ex_scmrtos_2: "ex_scmrtos_2 — расширенный scmRTOS",
  ex_loader: "ex_loader — загрузчик",
  ex_loader_2: "ex_loader_2 — загрузчик ELBEAR ACE-UNO",
  ex_loader_3: "ex_loader_3 — загрузчик BluePill-MIK32",
};

const GROUP_ORDER = [
  "_root",
  "ex_base",
  "ex_base_3",
  "ex_adc",
  "ex_adc_2",
  "ex_buttons",
  "ex_dac",
  "ex_encoder",
  "ex_i2c",
  "ex_onewire",
  "ex_1wire_copy_key",
  "ex_mfrc522",
  "ex_radio_rc",
  "ex_radio_tr",
  "ex_spi_dma",
  "ex_spi_dma_2",
  "ex_picojpeg",
  "ex_picojpeg_2",
  "ex_touchscreen",
  "ex_tsens",
  "ex_timer",
  "ex_crc",
  "ex_crypto",
  "ex_picolibc",
  "ex_scmrtos",
  "ex_scmrtos_2",
  "ex_loader",
  "ex_loader_2",
  "ex_loader_3",
  "mik32_hwlibs",
  "libbaremetal",
  "ld_scripts",
  "scmrtos",
  "devices",
  "fonts",
  "images",
  "tools",
  "utils",
  "docs",
  "jlink_related",
];

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export default function BaremetalPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [active, setActive] = useState<string>("ex_base/main.c");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ex_base: true,
  });

  useEffect(() => {
    fetch(`${basePath()}/baremetal/manifest.json`)
      .then((r) => r.json())
      .then((m: Manifest) => setManifest(m))
      .catch(() => setManifest({ generatedAt: "", groups: {} }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${basePath()}/baremetal/${active}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status))))
      .then((t) => !cancelled && setContent(t))
      .catch((e) => !cancelled && setContent("// Ошибка загрузки: " + e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const grouped = useMemo(() => {
    if (!manifest) return [];
    const q = filter.trim().toLowerCase();
    const keys = Object.keys(manifest.groups);
    keys.sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return keys
      .map((g) => {
        const files = manifest.groups[g].filter(
          (f) => !q || f.toLowerCase().includes(q),
        );
        return { group: g, files };
      })
      .filter((x) => x.files.length > 0);
  }, [manifest, filter]);

  const totalFiles = manifest
    ? Object.values(manifest.groups).reduce((s, a) => s + a.length, 0)
    : 0;

  const activeGroup = active.includes("/") ? active.split("/")[0] : "_root";
  const activeName = active.includes("/")
    ? active.substring(active.lastIndexOf("/") + 1)
    : active;

  return (
    <Layout>
      <div className="container max-w-7xl py-6 px-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cpu className="w-7 h-7 text-primary" />
            MIK32 Amur — bare-metal SDK и примеры
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Альтернативный SDK для К1948ВК018 (MIK32 Amur) <b>без HAL</b>:
            прямой доступ к регистрам, компактные прошивки. Содержит{" "}
            {totalFiles > 0 && (
              <Badge variant="secondary" className="text-[10px] mx-1">
                {totalFiles} файлов
              </Badge>
            )}
            в {Object.keys(manifest?.groups ?? {}).length} разделах:
            заголовки регистров (<code>mik32_hwlibs/</code>),{" "}
            <code>libbaremetal/</code>, скрипты линковки, scmRTOS и набор
            рабочих примеров (<code>ex_base</code>, <code>ex_adc</code>,{" "}
            <code>ex_i2c</code>, <code>ex_spi_dma</code>,{" "}
            <code>ex_mfrc522</code> и др.). Источник:{" "}
            <a
              href="https://gitflic.ru/project/rabidrabbit/mik32-amur-simple"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              rabidrabbit/mik32-amur-simple
              <ExternalLink className="inline w-3 h-3 ml-0.5" />
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
          <Card className="md:sticky md:top-4 md:self-start">
            <CardContent className="p-3 space-y-3">
              <Input
                placeholder="Поиск файла…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8"
              />
              <ScrollArea className="h-[75vh] pr-2">
                <div className="space-y-2">
                  {grouped.map(({ group, files }) => {
                    const isOpen =
                      openGroups[group] ?? (filter.trim().length > 0);
                    return (
                      <div key={group}>
                        <button
                          className="w-full text-left text-xs font-semibold uppercase mb-1 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setOpenGroups((s) => ({
                              ...s,
                              [group]: !isOpen,
                            }))
                          }
                        >
                          <FolderOpen className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {GROUP_LABELS[group] || group}
                          </span>
                          <span className="ml-auto text-[10px] opacity-60">
                            {files.length}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="space-y-0.5 ml-3 border-l border-border pl-2">
                            {files.map((f) => {
                              const label = f.startsWith(group + "/")
                                ? f.substring(group.length + 1)
                                : f;
                              return (
                                <button
                                  key={f}
                                  onClick={() => setActive(f)}
                                  className={`w-full text-left px-2 py-0.5 rounded text-xs font-mono truncate ${
                                    active === f
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-muted"
                                  }`}
                                  title={f}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!manifest && (
                    <div className="text-xs text-muted-foreground">
                      Загрузка манифеста…
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <div className="font-mono text-sm flex items-center gap-2 truncate">
                  <Badge variant="secondary" className="text-[10px]">
                    {activeGroup}
                  </Badge>
                  <span className="truncate">/{active}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `${basePath()}/baremetal/${active}`;
                    a.download = activeName;
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
