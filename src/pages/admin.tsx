import React, { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Server, Package, Globe, Shield, Terminal, Copy, Check, AlertTriangle, Info, Settings, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Копировать"
    >
      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeSnippet({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg border border-border bg-[#1a1a2e] overflow-hidden mt-3 mb-4">
      <div className="flex items-center px-4 py-2 border-b border-border/50 bg-black/20">
        <Terminal className="w-3.5 h-3.5 text-muted-foreground mr-2" />
        <span className="text-xs text-muted-foreground font-mono">{lang}</span>
      </div>
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm font-mono text-green-300 leading-relaxed">{code}</pre>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold flex items-center gap-2 text-foreground mb-5">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Note({ type = "info", children }: { type?: "info" | "warning"; children: React.ReactNode }) {
  const isWarning = type === "warning";
  return (
    <div className={`flex gap-3 p-4 rounded-lg border mb-4 ${
      isWarning
        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
        : "bg-primary/10 border-primary/30 text-foreground/80"
    }`}>
      {isWarning ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" /> : <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 md:px-8 lg:px-12">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-foreground font-medium">Руководство администратора</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Руководство по развёртыванию</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Пошаговая инструкция для системного администратора по сборке и публикации курса MIK32 SDK на production-сервере.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="border-border">Node.js 18+</Badge>
          <Badge variant="outline" className="border-border">pnpm 8+</Badge>
          <Badge variant="outline" className="border-border">Nginx</Badge>
          <Badge variant="outline" className="border-border">Ubuntu 22.04 / Debian 12</Badge>
        </div>
      </div>

      <Separator className="my-8" />

      {/* 1. Requirements */}
      <Section icon={<HardDrive className="w-5 h-5" />} title="1. Системные требования">
        <p className="text-foreground/80 mb-4 leading-relaxed">
          Приложение является статическим SPA (Single Page Application), собранным с помощью Vite. После сборки оно представляет собой набор HTML, CSS и JavaScript файлов без какого-либо серверного кода — достаточно любого веб-сервера, умеющего отдавать статику.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[
            { label: "Сборочная машина", value: "Node.js ≥ 18, pnpm ≥ 8" },
            { label: "Производительный сервер", value: "1 vCPU, 512 МБ RAM" },
            { label: "Дисковое пространство", value: "~50 МБ для собранных файлов" },
            { label: "Порт по умолчанию", value: "HTTP 80 / HTTPS 443" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="font-mono text-sm text-foreground">{value}</div>
            </div>
          ))}
        </div>
        <Note>
          Данное приложение полностью статическое — не требует базы данных, бэкенда или переменных окружения на сервере. Прогресс пользователя хранится в <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> браузера.
        </Note>
      </Section>

      {/* 2. Install Node */}
      <Section icon={<Package className="w-5 h-5" />} title="2. Установка Node.js и pnpm">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Выполните следующие команды на сборочной машине (либо в CI-окружении) для установки Node.js 20 LTS через официальный репозиторий NodeSource:
        </p>
        <CodeSnippet code={`# Установить curl и gnupg (если отсутствуют)
sudo apt-get update && sudo apt-get install -y curl gnupg

# Добавить репозиторий NodeSource для Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Установить Node.js
sudo apt-get install -y nodejs

# Проверить версии
node -v   # → v20.x.x
npm -v    # → 10.x.x

# Установить pnpm глобально
npm install -g pnpm

# Проверить pnpm
pnpm -v   # → 8.x.x или 9.x.x`} />
      </Section>

      {/* 3. Build */}
      <Section icon={<Terminal className="w-5 h-5" />} title="3. Сборка проекта">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Получите исходный код (например, через <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">git clone</code>) и выполните сборку из корня монорепозитория:
        </p>
        <CodeSnippet code={`# Клонировать репозиторий
git clone https://github.com/your-org/mik32-course.git
cd mik32-course

# Установить зависимости
pnpm install

# Собрать приложение (production-сборка)
cd artifacts/mik32-course
pnpm build

# Результат сборки находится в каталоге:
ls dist/
# → index.html  assets/  ...`} />
        <Note>
          Каталог <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">artifacts/mik32-course/dist/</code> содержит всё, что нужно для публикации. Скопируйте его содержимое на сервер.
        </Note>

        <p className="text-foreground/80 mb-3 leading-relaxed mt-4">
          Если приложение будет обслуживаться не из корня домена, а по подпути (например, <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">https://example.com/mik32/</code>), укажите базовый путь при сборке:
        </p>
        <CodeSnippet code={`# Сборка с базовым путём /mik32/
pnpm build -- --base=/mik32/

# Или установить в vite.config.ts:
# base: '/mik32/'`} />
      </Section>

      {/* 4. Nginx */}
      <Section icon={<Globe className="w-5 h-5" />} title="4. Конфигурация Nginx">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Установите Nginx и скопируйте собранные файлы в каталог веб-сервера:
        </p>
        <CodeSnippet code={`# Установить Nginx
sudo apt-get install -y nginx

# Создать каталог для сайта
sudo mkdir -p /var/www/mik32-course

# Скопировать собранные файлы (замените путь на ваш)
sudo cp -r artifacts/mik32-course/dist/. /var/www/mik32-course/

# Установить правильного владельца
sudo chown -R www-data:www-data /var/www/mik32-course
sudo chmod -R 755 /var/www/mik32-course`} />

        <p className="text-foreground/80 mb-3 mt-4 leading-relaxed">
          Создайте конфигурационный файл виртуального хоста Nginx:
        </p>
        <CodeSnippet lang="nginx" code={`# /etc/nginx/sites-available/mik32-course

server {
    listen 80;
    server_name example.com;          # Замените на ваш домен или IP

    root /var/www/mik32-course;
    index index.html;

    # Gzip-сжатие для ускорения загрузки
    gzip on;
    gzip_types text/plain text/css application/javascript
               application/json image/svg+xml;
    gzip_min_length 1024;

    # Кэширование статических ресурсов (CSS, JS, изображения)
    location ~* \\.(js|css|png|jpg|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Для SPA: все маршруты направлять на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}`} />

        <CodeSnippet code={`# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/mik32-course \\
           /etc/nginx/sites-enabled/mik32-course

# Проверить синтаксис
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx

# Убедиться, что Nginx запускается при старте системы
sudo systemctl enable nginx`} />
      </Section>

      {/* 5. HTTPS */}
      <Section icon={<Shield className="w-5 h-5" />} title="5. Настройка HTTPS (Let's Encrypt)">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Для получения бесплатного TLS-сертификата используйте Certbot. Требуется реальный домен, указывающий на IP вашего сервера.
        </p>
        <CodeSnippet code={`# Установить Certbot и плагин для Nginx
sudo apt-get install -y certbot python3-certbot-nginx

# Получить и установить сертификат (замените домен)
sudo certbot --nginx -d example.com

# Проверить автообновление
sudo certbot renew --dry-run`} />
        <Note>
          После успешного получения сертификата Certbot автоматически изменит конфигурацию Nginx, добавив переадресацию с HTTP на HTTPS и настройки SSL.
        </Note>

        <p className="text-foreground/80 mb-3 mt-4 leading-relaxed">
          Если Let's Encrypt недоступен (закрытая сеть, интранет), настройте самоподписанный сертификат:
        </p>
        <CodeSnippet code={`# Сгенерировать самоподписанный сертификат на 3650 дней
sudo openssl req -x509 -nodes -days 3650 \\
  -newkey rsa:2048 \\
  -keyout /etc/ssl/private/mik32-course.key \\
  -out /etc/ssl/certs/mik32-course.crt \\
  -subj "/C=RU/O=MIK32 Course/CN=example.local"

# Обновить конфиг Nginx для использования сертификата:
# ssl_certificate     /etc/ssl/certs/mik32-course.crt;
# ssl_certificate_key /etc/ssl/private/mik32-course.key;`} />
      </Section>

      {/* 6. Docker */}
      <Section icon={<Settings className="w-5 h-5" />} title="6. Альтернативное развёртывание через Docker">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Если на сервере установлен Docker, можно собрать и запустить приложение без ручной установки Node.js или Nginx:
        </p>
        <CodeSnippet lang="dockerfile" code={`# Dockerfile — разместите в корне репозитория

# Этап 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/mik32-course ./artifacts/mik32-course
RUN pnpm install --frozen-lockfile
RUN cd artifacts/mik32-course && pnpm build

# Этап 2: Nginx для отдачи статики
FROM nginx:1.25-alpine
COPY --from=builder /app/artifacts/mik32-course/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`} />

        <CodeSnippet lang="nginx" code={`# nginx.conf для Docker
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location ~* \\.(js|css|png|jpg|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`} />

        <CodeSnippet code={`# Собрать образ
docker build -t mik32-course:latest .

# Запустить контейнер на порту 8080
docker run -d -p 8080:80 --name mik32-course mik32-course:latest

# Проверить статус
docker ps
docker logs mik32-course

# Автозапуск при перезагрузке сервера
docker update --restart=always mik32-course`} />
      </Section>

      {/* 7. Update */}
      <Section icon={<Package className="w-5 h-5" />} title="7. Обновление содержимого курса">
        <p className="text-foreground/80 mb-3 leading-relaxed">
          Весь контент курса содержится в одном файле TypeScript. Для обновления или добавления материала достаточно отредактировать этот файл и пересобрать проект:
        </p>
        <div className="rounded-lg border border-border bg-card p-4 mb-4 font-mono text-sm">
          <span className="text-muted-foreground">Файл с контентом: </span>
          <span className="text-primary">artifacts/mik32-course/src/lib/data.ts</span>
        </div>
        <CodeSnippet code={`# 1. Обновить исходный код (git pull или ручное редактирование)
git pull origin main

# 2. Пересобрать
cd artifacts/mik32-course
pnpm build

# 3. Обновить файлы на сервере
sudo rsync -av --delete dist/. /var/www/mik32-course/

# 4. Перезагрузить Nginx (не обязательно, но рекомендуется)
sudo systemctl reload nginx`} />
        <Note>
          Обновление содержимого не требует перезапуска Nginx — достаточно заменить файлы в каталоге веб-сервера. Браузеры пользователей автоматически загрузят новые версии файлов благодаря механизму хеширования имён в Vite.
        </Note>
      </Section>

      {/* 8. Troubleshooting */}
      <Section icon={<AlertTriangle className="w-5 h-5" />} title="8. Устранение неисправностей">
        <div className="space-y-4">
          {[
            {
              problem: "Страница не найдена (404) при прямом переходе по URL",
              solution: "Убедитесь, что в конфиге Nginx есть директива try_files $uri $uri/ /index.html — она необходима для SPA с клиентской маршрутизацией.",
            },
            {
              problem: "Белый экран / JavaScript не загружается",
              solution: "Проверьте правильность базового пути. Если приложение обслуживается по подпути (например /mik32/), убедитесь, что параметр base в vite.config.ts совпадает с путём Nginx.",
            },
            {
              problem: "Устаревшее содержимое после обновления",
              solution: "Очистите кэш браузера (Ctrl+Shift+R) или проверьте заголовки Cache-Control. Vite добавляет хеш к именам файлов, поэтому при правильной конфигурации Nginx кэш обновляется автоматически.",
            },
            {
              problem: "Ошибка CORS или Mixed Content",
              solution: "Приложение полностью статическое и не делает сетевых запросов. Если вы добавляете внешние ресурсы (шрифты, CDN), убедитесь, что они тоже обслуживаются по HTTPS.",
            },
          ].map(({ problem, solution }) => (
            <div key={problem} className="rounded-lg border border-border bg-card p-4">
              <div className="font-medium text-sm text-foreground mb-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                {problem}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{solution}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <Separator className="my-8" />
      <div className="text-center pb-10">
        <Link href="/">
          <Button variant="outline">
            ← Вернуться к курсу
          </Button>
        </Link>
      </div>
    </div>
  );
}
