import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadChapters } from "@/lib/data-store";
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";

const chapters = loadChapters();

function renderTheory(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let buffer: string[] = [];
  let keyIndex = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const content = buffer.join("\n");
    if (content.trim()) {
      result.push(
        <p key={`p-${keyIndex++}`} className="whitespace-pre-wrap text-foreground/90 leading-relaxed mb-2">
          {content}
        </p>
      );
    }
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      buffer.push("");
      continue;
    }

    const isAllCaps = trimmed.length > 3 &&
      trimmed === trimmed.toUpperCase() &&
      /[А-ЯA-Z]/.test(trimmed) &&
      !/^[•\-\d]/.test(trimmed) &&
      !trimmed.includes("→") &&
      !trimmed.startsWith("0x");

    if (isAllCaps) {
      flushBuffer();
      result.push(
        <h3
          key={`h-${keyIndex++}`}
          className="text-base font-bold text-primary uppercase tracking-wide mt-6 mb-2"
        >
          {trimmed}
        </h3>
      );
    } else {
      buffer.push(line);
    }
  }

  flushBuffer();
  return result;
}

export default function ChapterPage() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const chapterId = params.id;
  const [completed, setCompleted] = useState(false);

  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  const chapter = chapters[chapterIndex];

  const prevChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

  useEffect(() => {
    if (!chapter) {
      setLocation("/");
      return;
    }

    window.scrollTo(0, 0);

    const saved = localStorage.getItem("mik32_progress");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompleted(parsed.includes(chapter.id));
      } catch (e) {}
    } else {
      setCompleted(false);
    }
  }, [chapter, setLocation]);

  const markCompleted = () => {
    if (!chapter) return;

    const saved = localStorage.getItem("mik32_progress");
    let progress: string[] = [];
    if (saved) {
      try {
        progress = JSON.parse(saved);
      } catch (e) {}
    }

    if (!progress.includes(chapter.id)) {
      progress.push(chapter.id);
      localStorage.setItem("mik32_progress", JSON.stringify(progress));
      setCompleted(true);
      window.dispatchEvent(new Event("storage"));
    }

    if (nextChapter) {
      setLocation(`/chapter/${nextChapter.id}`);
    }
  };

  const unmarkCompleted = () => {
    if (!chapter) return;

    const saved = localStorage.getItem("mik32_progress");
    let progress: string[] = [];
    if (saved) {
      try {
        progress = JSON.parse(saved);
      } catch (e) {}
    }

    progress = progress.filter((id) => id !== chapter.id);
    localStorage.setItem("mik32_progress", JSON.stringify(progress));
    setCompleted(false);
    window.dispatchEvent(new Event("storage"));
  };

  if (!chapter) return null;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 md:px-8 lg:px-12">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Главная
        </Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-foreground font-medium">Глава {chapterIndex + 1}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {chapter.title}
          </h1>
          {completed && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Пройдено
            </Badge>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          {chapter.shortDescription}
        </p>
      </div>

      <Separator className="my-8" />

      {/* Theory */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-primary" />
          Теория
        </h2>
        <div className="text-base text-foreground/90">
          {renderTheory(chapter.theory)}
        </div>
      </div>

      {/* Code Blocks */}
      {chapter.codes.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="font-mono text-primary mr-2">{"</>"}</span>
            Примеры кода
          </h2>
          <div className="space-y-8">
            {chapter.codes.map((codeBlock, i) => (
              <div key={i}>
                <CodeBlock code={codeBlock.code} title={codeBlock.title} />
                <div className="mt-2 flex justify-end">
                  <Link href="/simulator" onClick={() => sessionStorage.setItem('mik32_sim_code', codeBlock.code)}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary">
                      <Play className="h-3 w-3" />
                      Запустить в симуляторе
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Functions */}
      {chapter.keyFunctions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Ключевые функции HAL</h2>
          <div className="flex flex-wrap gap-2">
            {chapter.keyFunctions.map((fn, i) => (
              <Badge key={i} variant="outline" className="font-mono bg-muted/50 text-sm py-1 border-border">
                {fn}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-10" />

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-12">
        {prevChapter ? (
          <Link href={`/chapter/${prevChapter.id}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Предыдущая глава
            </Button>
          </Link>
        ) : (
          <div className="w-full sm:w-auto" />
        )}

        <div className="flex gap-2 w-full sm:w-auto">
          {completed ? (
            <Button onClick={unmarkCompleted} className="w-full sm:w-auto" variant="secondary">
              Отметить как непройденное
            </Button>
          ) : (
            <Button onClick={markCompleted} className="w-full sm:w-auto">
              Отметить как пройденное
              {nextChapter && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
