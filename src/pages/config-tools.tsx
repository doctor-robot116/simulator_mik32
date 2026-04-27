import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings2, ExternalLink, Maximize2, Printer, Code2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CONFIG_TOOLS,
  TOOLS_AUTHOR,
  LEGACY_HREF_MAP,
  toolUrl,
  type ConfigTool,
} from "@/lib/config-tools";

const DARK_INJECT_CSS = `
  html, body { background: #0e1116 !important; color: #e6e6e6 !important; }
  body * { color: inherit; }
  svg { background: #1b1f27 !important; }
  rect[style*="fill:white"], rect[style*="fill:azure"], rect[style*="fill:lavender"] {
    fill: #1b1f27 !important;
  }
  text { fill: #e6e6e6 !important; }
  .menu, .toolbar { background: #1b1f27 !important; border-color: #3a4150 !important; }
  a { color: #4cd47a !important; }
`;

function findToolById(id: string | undefined | null) {
  if (!id) return null;
  return CONFIG_TOOLS.find((t) => t.id === id) ?? null;
}

export default function ConfigToolsPage() {
  const [active, setActive] = useState<ConfigTool | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Track whether the page is in dark theme so we can mirror it inside the iframe.
  const isDark = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  // Inject dark theme CSS + intercept cross-links inside legacy HTML files.
  const onIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Dark theme injection (legacy + engine).
    if (isDark()) {
      // Engine page reacts to postMessage (better — no CSS hacks needed).
      iframe.contentWindow?.postMessage({ type: "pinconf:theme", theme: "dark" }, "*");
      // Legacy pages: inject style override.
      let styleEl = doc.getElementById("__darkInject") as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = "__darkInject";
        styleEl.textContent = DARK_INJECT_CSS;
        doc.head.appendChild(styleEl);
      }
    } else {
      iframe.contentWindow?.postMessage({ type: "pinconf:theme", theme: "light" }, "*");
      doc.getElementById("__darkInject")?.remove();
    }

    // Intercept cross-links (legacy `<a href="MIK32-QFP64.htm">…</a>`).
    doc.querySelectorAll<HTMLAnchorElement>("a[href$='.htm'], a[href$='.html']").forEach((a) => {
      if (a.dataset.intercepted) return;
      a.dataset.intercepted = "1";
      a.addEventListener("click", (ev) => {
        const href = a.getAttribute("href") || "";
        const file = href.split("/").pop() || href;
        const targetId = LEGACY_HREF_MAP[file];
        if (targetId) {
          ev.preventDefault();
          const next = findToolById(targetId);
          if (next) setActive(next);
        }
      });
    });
  };

  // Listen for HAL code export messages from the engine iframe.
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && d.type === "pinconf:export" && typeof d.code === "string") {
        navigator.clipboard?.writeText(d.code).catch(() => {});
        toast({
          title: "Код HAL_GPIO_Init готов",
          description:
            "Код инициализации скопирован в буфер обмена. Можно вставить в редактор кода или симулятор.",
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [toast]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const handleExportHAL = () => {
    const win = iframeRef.current?.contentWindow as
      | (Window & { exportHAL?: () => void })
      | undefined;
    if (win && typeof win.exportHAL === "function") {
      win.exportHAL();
    } else {
      toast({
        title: "Экспорт HAL недоступен",
        description: "Эта функция работает только в инструментах на новом движке.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-primary" />
            Инструмент конфигурирования микроконтроллера
          </h1>
          <p className="text-muted-foreground mt-2">
            Интерактивные конфигураторы выводов GPIO для отечественных микроконтроллеров. Оригинальные
            инструменты сохранены без изменений; инструменты на универсальном движке поддерживают
            сохранение конфигурации, экспорт HAL-кода и тёмную тему.
          </p>

          <div className="mt-4 p-3 rounded-md border border-border bg-muted/40 text-sm">
            <span className="text-muted-foreground">Автор оригинальных инструментов:</span>{" "}
            <a
              href={TOOLS_AUTHOR.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              © {TOOLS_AUTHOR.name}, {TOOLS_AUTHOR.year}
              <ExternalLink className="inline w-3 h-3 ml-1" />
            </a>
            <div className="text-xs text-muted-foreground mt-1">{TOOLS_AUTHOR.note}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONFIG_TOOLS.map((tool) => (
            <Card key={tool.id} className={tool.available ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-tight">{tool.mcu}</CardTitle>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {tool.badge && (
                      <Badge className="text-[10px] bg-primary text-primary-foreground">
                        {tool.badge}
                      </Badge>
                    )}
                    {tool.engineId && (
                      <Badge variant="secondary" className="text-[10px]">
                        Engine
                      </Badge>
                    )}
                    {!tool.available && (
                      <Badge variant="outline">В разработке</Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">{tool.vendor}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground min-h-[2.5rem]">{tool.description}</p>
                <div className="flex gap-2">
                  {tool.externalUrl ? (
                    tool.externalUrl.startsWith("/") ? (
                      <Button size="sm" className="flex-1" onClick={() => navigate(tool.externalUrl!)}>
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        Открыть
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(tool.externalUrl!, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Открыть в новой вкладке
                      </Button>
                    )
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!tool.available}
                        onClick={() => tool.available && setActive(tool)}
                      >
                        <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                        Открыть
                      </Button>
                      {tool.available && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const url = toolUrl(tool);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          title="Открыть в новой вкладке"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span>{active?.mcu} — конфигуратор GPIO</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Печать
                </Button>
                {active?.engineId && (
                  <Button size="sm" variant="outline" onClick={handleExportHAL}>
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> HAL-код
                  </Button>
                )}
                <a
                  href={TOOLS_AUTHOR.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary font-normal"
                >
                  © {TOOLS_AUTHOR.name}, {TOOLS_AUTHOR.year}
                </a>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {active?.vendor} · {active?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-white">
            {active && (
              <iframe
                ref={iframeRef}
                key={active.id}
                src={toolUrl(active) ?? ""}
                title={active.mcu}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                onLoad={onIframeLoad}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
