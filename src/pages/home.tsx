import React from "react";
import { Link } from "wouter";
import { BookOpen, ChevronRight, Cpu, Zap, Layers, Activity, GitBranch, Terminal, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loadChapters } from "@/lib/data-store";

const chapters = loadChapters();

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="bg-muted/50 border-b border-border py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            <Cpu className="w-4 h-4 mr-2" />
            Российский RISC-V Микроконтроллер
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-foreground">
            Курс по разработке под MIK32V2
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[800px] mb-8">
            Профессиональное руководство по программированию 32-битного микроконтроллера на базе ядра SCR1. Изучите работу с периферией на регистровом уровне и с использованием HAL-библиотеки.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/chapter/1-intro">
              <Button size="lg" className="h-12 px-8 font-medium">
                Начать обучение
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 font-medium border-border hover:bg-muted" onClick={() => {
              document.getElementById('chapters-grid')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Смотреть программу
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Глубокое погружение</h3>
              <p className="text-sm text-muted-foreground">От базовой настройки тактирования до работы с DMA и крипто-блоком.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Практические примеры</h3>
              <p className="text-sm text-muted-foreground">Готовые куски кода на языке C с использованием MIK32 SDK и HAL.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Без воды</h3>
              <p className="text-sm text-muted-foreground">Только технически точная информация, необходимая для разработки.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dev Tools Section */}
      <section className="py-10 border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Инструменты разработки</h2>
              <p className="text-sm text-muted-foreground mt-1">Интерактивные среды для отладки и тестирования кода</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/diagram">
              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Редактор схем</h3>
                  <p className="text-xs text-muted-foreground">Визуальное подключение компонентов к пинам MIK32. Авто-генерация HAL-кода и симуляция GPIO прямо в браузере.</p>
                </div>
                <span className="mt-auto text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
                  Открыть <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
            <Link href="/simulator">
              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">HAL Симулятор</h3>
                  <p className="text-xs text-muted-foreground">Пошаговое выполнение HAL-кода MIK32: GPIO, UART, ADC, задержки. Пошаговая отладка с таймлайном событий.</p>
                </div>
                <span className="mt-auto text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
                  Открыть <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
            <Link href="/elements">
              <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Галерея компонентов</h3>
                  <p className="text-xs text-muted-foreground">Интерактивная библиотека элементов: МИК32 Амур, LED, кнопки, дисплеи, датчики. Предпросмотр с управляемыми свойствами.</p>
                </div>
                <span className="mt-auto text-xs text-primary font-medium group-hover:underline flex items-center gap-1">
                  Открыть <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Chapters Grid */}
      <section id="chapters-grid" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Программа курса</h2>
            <div className="text-sm text-muted-foreground">
              {chapters.length} тем
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter, index) => (
              <Card key={chapter.id} className="flex flex-col bg-card hover:bg-muted/50 transition-colors border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Глава {index + 1}
                    </span>
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">{chapter.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground">
                    {chapter.shortDescription}
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/chapter/${chapter.id}`} className="w-full">
                    <Button variant="secondary" className="w-full font-medium justify-between">
                      Перейти
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
