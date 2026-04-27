import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronRight, Save, RotateCcw, Download, Plus, Trash2,
  AlertTriangle, CheckCircle2, Edit3, ChevronDown, ChevronUp,
  FileText, Code2, Tag, Info, Lock
} from "lucide-react";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  loadChapters, saveChapter, resetChapter, resetAll,
  hasChapterOverride, hasOverrides, exportDataTs, baseChapters
} from "@/lib/data-store";
import type { Chapter, ChapterCode } from "@/lib/data";

function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-border mb-4 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            active === t.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="text-sm font-medium text-foreground">{children}</label>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

function TextArea({
  value, onChange, rows = 6, placeholder, mono = false
}: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y ${mono ? "font-mono text-xs leading-relaxed" : "leading-relaxed"}`}
    />
  );
}

function TextInput({
  value, onChange, placeholder
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
}

function CodeEditor({
  codes,
  onChange
}: {
  codes: ChapterCode[];
  onChange: (codes: ChapterCode[]) => void;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const update = (i: number, field: keyof ChapterCode, value: string) => {
    const next = codes.map((c, idx) => idx === i ? { ...c, [field]: value } : c);
    onChange(next);
  };

  const add = () => {
    onChange([...codes, { title: "Новый пример", code: "// Код примера" }]);
    setExpandedIndex(codes.length);
  };

  const remove = (i: number) => {
    onChange(codes.filter((_, idx) => idx !== i));
    setExpandedIndex(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...codes];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setExpandedIndex(j);
  };

  return (
    <div className="space-y-3">
      {codes.map((code, i) => (
        <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
          >
            <Code2 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">{code.title || `Пример ${i + 1}`}</span>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                title="Вверх"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === codes.length - 1}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                title="Вниз"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove(i)}
                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {expandedIndex === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
          {expandedIndex === i && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div>
                <FieldLabel>Заголовок примера</FieldLabel>
                <TextInput value={code.title} onChange={(v) => update(i, "title", v)} placeholder="Название примера кода" />
              </div>
              <div>
                <FieldLabel note="(C-код, сохраняйте отступы)">Код</FieldLabel>
                <TextArea
                  value={code.code}
                  onChange={(v) => update(i, "code", v)}
                  rows={14}
                  mono
                  placeholder="// Вставьте код примера"
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Добавить пример кода
      </Button>
    </div>
  );
}

function KeyFunctionsEditor({
  functions,
  onChange
}: {
  functions: string[];
  onChange: (fns: string[]) => void;
}) {
  const [newFn, setNewFn] = useState("");

  const add = () => {
    const trimmed = newFn.trim();
    if (!trimmed || functions.includes(trimmed)) return;
    onChange([...functions, trimmed]);
    setNewFn("");
  };

  const remove = (i: number) => {
    onChange(functions.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {functions.map((fn, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 font-mono text-xs text-foreground"
          >
            {fn}
            <button
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
        {functions.length === 0 && (
          <span className="text-sm text-muted-foreground italic">Функции не добавлены</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newFn}
          onChange={(e) => setNewFn(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="HAL_GPIO_Init()"
          className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ChapterEditor({
  chapter,
  onSaved,
  onReset
}: {
  chapter: Chapter;
  onSaved: () => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<Chapter>({ ...chapter });
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [tab, setTab] = useState("main");

  useEffect(() => {
    setDraft({ ...chapter });
    setDirty(false);
  }, [chapter.id]);

  const update = <K extends keyof Chapter>(key: K, value: Chapter[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    saveChapter(draft);
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    onSaved();
  };

  const handleReset = () => {
    if (!confirm("Сбросить все изменения этой главы к исходному значению?")) return;
    resetChapter(chapter.id);
    onReset();
  };

  const isOverridden = hasChapterOverride(chapter.id);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isOverridden && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
              Изменено
            </Badge>
          )}
          {dirty && (
            <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
              Несохранённые изменения
            </Badge>
          )}
          {savedFlash && (
            <Badge variant="outline" className="border-primary/50 text-primary text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Сохранено
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isOverridden && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-red-400">
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Сбросить
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty} className="gap-1.5">
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "main", label: "Основное", icon: <FileText className="w-3.5 h-3.5" /> },
          { id: "theory", label: "Теория", icon: <Edit3 className="w-3.5 h-3.5" /> },
          { id: "codes", label: `Примеры (${draft.codes.length})`, icon: <Code2 className="w-3.5 h-3.5" /> },
          { id: "functions", label: `Функции (${draft.keyFunctions.length})`, icon: <Tag className="w-3.5 h-3.5" /> },
        ]}
      />

      {tab === "main" && (
        <div className="space-y-5 overflow-y-auto flex-1 pr-1">
          <div>
            <FieldLabel>ID главы</FieldLabel>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-mono text-muted-foreground select-all">
              {draft.id}
            </div>
          </div>
          <div>
            <FieldLabel>Заголовок главы</FieldLabel>
            <TextInput
              value={draft.title}
              onChange={(v) => update("title", v)}
              placeholder="Заголовок главы"
            />
          </div>
          <div>
            <FieldLabel note="(показывается на главной странице)">Краткое описание</FieldLabel>
            <TextArea
              value={draft.shortDescription}
              onChange={(v) => update("shortDescription", v)}
              rows={3}
              placeholder="Краткое описание содержимого главы..."
            />
          </div>
        </div>
      )}

      {tab === "theory" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="mb-2 flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Строки, написанные полностью ЗАГЛАВНЫМИ БУКВАМИ, отображаются как заголовки разделов.
              Символ •, пробелы и табуляция сохраняются.
            </span>
          </div>
          <TextArea
            value={draft.theory}
            onChange={(v) => update("theory", v)}
            rows={28}
            placeholder="Текст теории..."
          />
        </div>
      )}

      {tab === "codes" && (
        <div className="overflow-y-auto flex-1 pr-1">
          <CodeEditor
            codes={draft.codes}
            onChange={(codes) => update("codes", codes)}
          />
        </div>
      )}

      {tab === "functions" && (
        <div className="overflow-y-auto flex-1 pr-1">
          <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>Ключевые функции HAL, отображаемые внизу страницы главы. Введите имя функции и нажмите Enter или +.</span>
          </div>
          <KeyFunctionsEditor
            functions={draft.keyFunctions}
            onChange={(fns) => update("keyFunctions", fns)}
          />
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  const [, navigate] = useLocation();
  const [authed] = useState(() => isAdminAuthenticated());

  useEffect(() => {
    if (!authed) {
      navigate("/");
    }
  }, [authed, navigate]);

  const [chapters, setChapters] = useState<Chapter[]>(() => loadChapters());
  const [selectedId, setSelectedId] = useState<string>(chapters[0]?.id ?? "");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setChapters(loadChapters());
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("mik32_data_changed", reload);
    return () => window.removeEventListener("mik32_data_changed", reload);
  }, [reload]);

  const selectedChapter = chapters.find((c) => c.id === selectedId) ?? chapters[0];

  const handleExport = () => {
    const json = exportDataTs();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mik32-course-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAll = () => {
    if (!confirm("Сбросить ВСЕ изменения и вернуть исходный контент курса?")) return;
    resetAll();
  };

  const anyOverrides = hasOverrides();

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 flex-wrap">
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-foreground font-medium flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-primary" />
            Редактор курса
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          {anyOverrides && (
            <Button variant="ghost" size="sm" onClick={handleResetAll} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Сбросить всё
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Экспорт JSON
          </Button>
          <Link href={selectedChapter ? `/chapter/${selectedChapter.id}` : "/"}>
            <Button variant="outline" size="sm" className="text-xs">
              Предпросмотр
            </Button>
          </Link>
        </div>
      </div>

      {anyOverrides && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-300 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Изменения сохранены в браузере (localStorage). Используйте «Экспорт JSON» для сохранения данных вне браузера.
          </span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chapter list sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-border overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2">
              Главы ({chapters.length})
            </div>
            {chapters.map((ch, i) => {
              const overridden = hasChapterOverride(ch.id);
              const isSelected = ch.id === selectedId;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedId(ch.id)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5 ${
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-xs text-muted-foreground mt-0.5 min-w-[1.25rem] text-right shrink-0">
                    {i + 1}.
                  </span>
                  <span className="flex-1 leading-snug truncate">{ch.title}</span>
                  {overridden && (
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5" title="Изменено" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Editor panel */}
        <main className="flex-1 overflow-hidden">
          {selectedChapter && (
            <div className="h-full p-5 flex flex-col" key={`${selectedChapter.id}-${refreshKey}`}>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedChapter.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedChapter.id}</p>
              </div>
              <Separator className="mb-4" />
              <ChapterEditor
                chapter={selectedChapter}
                onSaved={reload}
                onReset={reload}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
