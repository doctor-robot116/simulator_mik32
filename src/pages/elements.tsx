import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ChevronRight, Package, AlertCircle } from 'lucide-react';

// ─── Регистрация всех Lit-компонентов (side-effect) ───────────────────────────
import '@wokwi/elements';

// ─── Каталог компонентов ──────────────────────────────────────────────────────
import { WOKWI_ELEMENT_CATALOG, WokwiElementMeta } from '@/lib/element-library';

// ─── JSX-типы для custom elements ────────────────────────────────────────────
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wokwi-led': React.HTMLAttributes<HTMLElement> & {
        color?: string; value?: string | boolean; label?: string;
      };
      'wokwi-pushbutton': React.HTMLAttributes<HTMLElement> & {
        color?: string; label?: string;
      };
      'wokwi-resistor': React.HTMLAttributes<HTMLElement> & {
        value?: string;
      };
      'wokwi-7segment': React.HTMLAttributes<HTMLElement> & {
        color?: string; background?: string; digits?: number | string;
        values?: string;
      };
      'wokwi-neopixel': React.HTMLAttributes<HTMLElement> & {
        animation?: string;
      };
      'wokwi-buzzer': React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
      'wokwi-mik32-amur': React.HTMLAttributes<HTMLElement> & {
        ledPower?: boolean | string;
      };
    }
  }
}

// ─── Определения управляемых свойств ─────────────────────────────────────────

interface PropDef {
  name: string;
  label: string;
  type: 'boolean' | 'color' | 'select' | 'range' | 'text';
  default: unknown;
  options?: string[];
  min?: number; max?: number; step?: number;
}

interface RenderDef {
  props: PropDef[];
  render: (props: Record<string, unknown>) => React.ReactNode;
}

// ─── Реализованные компоненты (рендер + свойства) ────────────────────────────

const RENDERS: Record<string, RenderDef> = {
  'wokwi-mik32-amur': {
    props: [
      { name: 'ledPower', label: 'Светодиод питания', type: 'boolean', default: false },
    ],
    render: (p) => (
      <wokwi-mik32-amur
        style={{ display: 'block' }}
        {...(p.ledPower ? { ledPower: 'true' } : {})}
      />
    ),
  },
  'wokwi-led': {
    props: [
      { name: 'color', label: 'Цвет', type: 'color', default: '#22c55e' },
      { name: 'value', label: 'Горит', type: 'boolean', default: false },
      { name: 'label', label: 'Метка', type: 'text', default: 'LED' },
    ],
    render: (p) => (
      <wokwi-led
        color={String(p.color)}
        value={p.value ? '1' : '0'}
        label={String(p.label)}
        style={{ display: 'block', transform: 'scale(2)', transformOrigin: 'center center' }}
      />
    ),
  },
  'wokwi-pushbutton': {
    props: [
      { name: 'color', label: 'Цвет колпачка', type: 'select', default: 'green', options: ['green', 'red', 'blue', 'yellow', 'white', 'black'] },
      { name: 'label', label: 'Метка', type: 'text', default: 'BTN' },
    ],
    render: (p) => (
      <wokwi-pushbutton
        color={String(p.color)}
        label={String(p.label)}
        style={{ display: 'block', transform: 'scale(1.8)', transformOrigin: 'center center' }}
      />
    ),
  },
  'wokwi-resistor': {
    props: [
      {
        name: 'value', label: 'Номинал (Ом)', type: 'select', default: '220',
        options: ['100', '220', '330', '470', '1000', '4700', '10000', '100000'],
      },
    ],
    render: (p) => (
      <wokwi-resistor
        value={String(p.value)}
        style={{ display: 'block', transform: 'scale(1.8)', transformOrigin: 'center center' }}
      />
    ),
  },
  'wokwi-7segment': {
    props: [
      { name: 'color', label: 'Цвет сегментов', type: 'color', default: '#ff2200' },
      { name: 'digits', label: 'Кол-во цифр', type: 'range', default: 4, min: 1, max: 4, step: 1 },
      { name: 'preset', label: 'Отображаемая цифра', type: 'select', default: '1', options: ['0','1','2','3','4','5','6','7','8','9'] },
    ],
    render: (p) => {
      const MAP: Record<string, number[]> = {
        '0': [1,1,1,1,1,1,0,0], '1': [0,1,1,0,0,0,0,0],
        '2': [1,1,0,1,1,0,1,0], '3': [1,1,1,1,0,0,1,0],
        '4': [0,1,1,0,0,1,1,0], '5': [1,0,1,1,0,1,1,0],
        '6': [1,0,1,1,1,1,1,0], '7': [1,1,1,0,0,0,0,0],
        '8': [1,1,1,1,1,1,1,0], '9': [1,1,1,1,0,1,1,0],
      };
      const n = Number(p.digits);
      const seg = MAP[String(p.preset)] ?? [0,0,0,0,0,0,0,0];
      const allSegs = Array.from({ length: n }, () => seg).flat();
      return (
        <wokwi-7segment
          color={String(p.color)}
          digits={String(n)}
          values={JSON.stringify(allSegs)}
          style={{ display: 'block', transform: 'scale(1.5)', transformOrigin: 'center center' }}
        />
      );
    },
  },
  'wokwi-neopixel': {
    props: [
      {
        name: 'animation', label: 'Анимация', type: 'select', default: 'rainbow',
        options: ['rainbow', 'red', 'green', 'blue', 'white', 'none'],
      },
    ],
    render: (p) => (
      <wokwi-neopixel
        animation={String(p.animation)}
        style={{ display: 'block', transform: 'scale(3)', transformOrigin: 'center center' }}
      />
    ),
  },
  'wokwi-buzzer': {
    props: [],
    render: () => (
      <wokwi-buzzer
        style={{ display: 'block', transform: 'scale(2)', transformOrigin: 'center center' }}
      />
    ),
  },
};

// ─── Категории на русском ─────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  mcu:     'Микроконтроллеры',
  output:  'Индикаторы',
  input:   'Управление',
  passive: 'Пассивные',
  display: 'Дисплеи',
  sensor:  'Датчики',
  motor:   'Моторы',
  comms:   'Интерфейсы',
};

// ─── Получить имя исходного файла из тега ─────────────────────────────────────
// wokwi-mik32-amur → mik32-amur-element.ts
// wokwi-led        → led-element.ts
function tagToFilename(tag: string): string {
  const base = tag.replace(/^wokwi-/, '');
  // особые случаи без "-element" суффикса
  if (base === 'patterns' || base === 'types' || base === 'utils') return `${base}.ts`;
  return `${base}-element.ts`;
}

// ─── Элемент управления свойством ────────────────────────────────────────────

function PropControl({
  def, value, onChange,
}: {
  def: PropDef; value: unknown; onChange: (v: unknown) => void;
}) {
  const base = 'w-full rounded px-2 py-1 text-sm bg-[#0a1a10] border border-[#1a3a28] text-[#cdd6f4] focus:outline-none focus:border-[#4ec9b0]';

  if (def.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => onChange(!value)}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-[#4ec9b0]' : 'bg-[#1a3a28]'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-[#4ec9b0] text-sm font-mono">{value ? 'true' : 'false'}</span>
      </label>
    );
  }
  if (def.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input type="color" value={String(value)} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-[#1a3a28] bg-transparent cursor-pointer" />
        <span className="font-mono text-sm text-[#4ec9b0]">{String(value)}</span>
      </div>
    );
  }
  if (def.type === 'select') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={base}>
        {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (def.type === 'range') {
    return (
      <div className="flex items-center gap-3">
        <input type="range" min={def.min} max={def.max} step={def.step} value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[#4ec9b0]" />
        <span className="font-mono text-sm text-[#4ec9b0] w-8 text-right">{String(value)}</span>
      </div>
    );
  }
  if (def.type === 'text') {
    return (
      <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className={base} />
    );
  }
  return null;
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function ElementsPage() {
  const [selectedTag, setSelectedTag] = useState(WOKWI_ELEMENT_CATALOG[0].tag);
  const [propValues, setPropValues] = useState<Record<string, Record<string, unknown>>>(() => {
    const init: Record<string, Record<string, unknown>> = {};
    for (const el of WOKWI_ELEMENT_CATALOG) {
      const rd = RENDERS[el.tag];
      if (rd) {
        init[el.tag] = Object.fromEntries(rd.props.map((p) => [p.name, p.default]));
      }
    }
    return init;
  });

  const selected = WOKWI_ELEMENT_CATALOG.find((e) => e.tag === selectedTag) ?? WOKWI_ELEMENT_CATALOG[0];
  const renderDef = RENDERS[selected.tag];
  const currentProps = propValues[selected.tag] ?? {};

  function setProps(tag: string, name: string, value: unknown) {
    setPropValues((prev) => ({
      ...prev,
      [tag]: { ...prev[tag], [name]: value },
    }));
  }

  // Группировка по категориям
  const grouped = WOKWI_ELEMENT_CATALOG.reduce<Record<string, WokwiElementMeta[]>>((acc, el) => {
    if (!acc[el.category]) acc[el.category] = [];
    acc[el.category].push(el);
    return acc;
  }, {});

  const implementedCount = WOKWI_ELEMENT_CATALOG.filter((e) => RENDERS[e.tag]).length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#080f0a', color: '#cdd6f4', fontFamily: 'Consolas, monospace' }}
    >
      {/* Header */}
      <header
        style={{ background: '#0a1a10', borderBottom: '1px solid #1a3a28' }}
        className="flex items-center gap-4 px-5 py-3 flex-shrink-0"
      >
        <Link href="/">
          <button
            className="flex items-center gap-1 text-sm hover:text-[#4ec9b0] transition-colors"
            style={{ color: '#6a9a80' }}
          >
            <ArrowLeft size={14} />
            Назад
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Package size={16} style={{ color: '#4ec9b0' }} />
          <h1 className="font-bold text-base tracking-wide" style={{ color: '#e0e0e0' }}>
            МИК32 — Галерея компонентов
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span style={{ color: '#4ec9b0' }}>{implementedCount} реализовано</span>
          <span style={{ color: '#2a5a40' }}>·</span>
          <span style={{ color: '#2a5a40' }}>{WOKWI_ELEMENT_CATALOG.length} всего</span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — полный каталог */}
        <nav
          className="w-56 flex-shrink-0 overflow-y-auto"
          style={{ background: '#0a1208', borderRight: '1px solid #1a3a28' }}
        >
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest flex items-center justify-between"
                style={{ color: '#2a5a40' }}>
                <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span style={{ color: '#1a4a30' }}>{items.length}</span>
              </div>
              {items.map((el) => {
                const isImpl = !!RENDERS[el.tag];
                const isSelected = selectedTag === el.tag;
                return (
                  <button
                    key={el.tag}
                    onClick={() => setSelectedTag(el.tag)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 text-sm transition-colors"
                    style={{
                      background: isSelected ? '#0d2a1a' : 'transparent',
                      color: isSelected ? '#4ec9b0' : isImpl ? '#6a9a80' : '#2a4a38',
                      borderLeft: isSelected ? '2px solid #4ec9b0' : '2px solid transparent',
                    }}
                  >
                    <span className="truncate pr-1">{el.label}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isImpl && <span style={{ color: '#1a4a30', fontSize: 9 }}>●</span>}
                      {isSelected && <ChevronRight size={11} />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 lg:flex-row">
          {/* Preview */}
          <div
            className="flex-1 flex flex-col items-center justify-center min-h-64 lg:min-h-0 relative"
            style={{ background: '#0a1a10', borderRight: '1px solid #1a3a28' }}
          >
            {/* PCB grid background */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #1a3a28 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                opacity: 0.4,
              }}
            />

            <div className="relative z-10 flex items-center justify-center p-12">
              {renderDef ? (
                <div style={{ minWidth: 160, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderDef.render(currentProps)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <AlertCircle size={32} style={{ color: '#1a4a30' }} />
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#2a5a40' }}>Компонент не реализован</div>
                    <div className="text-xs" style={{ color: '#1a3a28' }}>
                      Создайте рендер-функцию в{' '}
                      <span className="font-mono" style={{ color: '#2a5a40' }}>src/pages/elements.tsx</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono px-3 py-1.5 rounded" style={{ background: '#0d2a1a', color: '#2a6a40', border: '1px solid #1a3a28' }}>
                    {tagToFilename(selected.tag)}
                  </div>
                </div>
              )}
            </div>

            {/* Filename badge */}
            <div
              className="absolute bottom-4 left-4 text-xs px-2 py-1 rounded font-mono flex items-center gap-1.5"
              style={{ background: '#0d2a1a', color: '#2a6a40', border: '1px solid #1a3a28' }}
            >
              <span style={{ color: '#1a4a30' }}>ts</span>
              {tagToFilename(selected.tag)}
            </div>

            {/* Реализован / не реализован */}
            <div
              className="absolute bottom-4 right-4 text-xs px-2 py-1 rounded"
              style={{
                background: renderDef ? '#0d2a1a' : '#120a08',
                color: renderDef ? '#4ec9b0' : '#3a2a28',
                border: `1px solid ${renderDef ? '#1a5a38' : '#2a1a18'}`,
              }}
            >
              {renderDef ? '● реализован' : '○ в разработке'}
            </div>
          </div>

          {/* Controls panel */}
          <div
            className="w-full lg:w-80 flex-shrink-0 overflow-y-auto flex flex-col"
            style={{ background: '#0a1208' }}
          >
            {/* Component info */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1a3a28' }}>
              <h2 className="font-bold text-base mb-1" style={{ color: '#e0e0e0' }}>{selected.label}</h2>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#4a7a60' }}>{selected.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#0d2a1a', color: '#2a6a40', border: '1px solid #1a3a28' }}>
                  {selected.pinCount} пин{selected.pinCount === 1 ? '' : selected.pinCount < 5 ? 'а' : 'ов'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#0d2a1a', color: '#2a6a40', border: '1px solid #1a3a28' }}>
                  {CATEGORY_LABELS[selected.category] ?? selected.category}
                </span>
              </div>
            </div>

            {/* Props controls */}
            <div className="px-5 pt-4 pb-6 flex-1">
              {!renderDef ? (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#2a5a40' }}>
                    Как добавить
                  </div>
                  <div className="text-xs leading-relaxed space-y-2" style={{ color: '#2a5a40' }}>
                    <p>1. Исходный файл компонента:</p>
                    <code className="block text-[10px] px-2 py-1.5 rounded" style={{ background: '#0d2a1a', color: '#4ec9b0', border: '1px solid #1a3a28' }}>
                      {tagToFilename(selected.tag)}
                    </code>
                    <p>2. Добавьте запись в объект <code style={{ color: '#9cdcfe' }}>RENDERS</code> в файле:</p>
                    <code className="block text-[10px] px-2 py-1.5 rounded" style={{ background: '#0d2a1a', color: '#4ec9b0', border: '1px solid #1a3a28' }}>
                      src/pages/elements.tsx
                    </code>
                    <p>3. Добавьте JSX-тип в блок <code style={{ color: '#9cdcfe' }}>declare global</code> в том же файле.</p>
                  </div>
                </div>
              ) : renderDef.props.length === 0 ? (
                <div className="text-xs" style={{ color: '#2a5a40' }}>Нет настраиваемых свойств</div>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#2a5a40' }}>
                    Свойства
                  </div>
                  <div className="space-y-5">
                    {renderDef.props.map((pd) => (
                      <div key={pd.name}>
                        <div className="text-xs mb-1.5 flex justify-between">
                          <span style={{ color: '#9cdcfe' }}>{pd.label}</span>
                          <span className="font-mono" style={{ color: '#2a5a40' }}>{pd.name}</span>
                        </div>
                        <PropControl
                          def={pd}
                          value={currentProps[pd.name] ?? pd.default}
                          onChange={(v) => setProps(selected.tag, pd.name, v)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Reset button — только для реализованных */}
            {renderDef && renderDef.props.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: '1px solid #1a3a28' }}>
                <button
                  onClick={() =>
                    setPropValues((prev) => ({
                      ...prev,
                      [selected.tag]: Object.fromEntries(renderDef.props.map((p) => [p.name, p.default])),
                    }))
                  }
                  className="w-full py-1.5 text-xs rounded transition-colors"
                  style={{ background: '#0d2a1a', color: '#4a7a60', border: '1px solid #1a3a28' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#4ec9b0')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#4a7a60')}
                >
                  Сбросить значения
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
