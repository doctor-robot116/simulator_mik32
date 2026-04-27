// ═══════════════════════════════════════════════════════════════
// MIK32 Амур — типы для визуального редактора схем (diagram.json)
// ═══════════════════════════════════════════════════════════════

export interface DiagramPart {
  id: string;
  type: string;
  x: number;
  y: number;
  attrs: Record<string, string>;
}

export interface DiagramConnection {
  id: string;
  from: string; // "partId:pinName" или "mik32:P0_3" или "mik32:GND"
  to: string;
  color: string;
}

export interface Diagram {
  version: 1;
  parts: DiagramPart[];
  connections: DiagramConnection[];
}

export const EMPTY_DIAGRAM: Diagram = {
  version: 1,
  parts: [],
  connections: [],
};

export const WIRE_COLORS = [
  { label: 'Зелёный', value: '#22c55e' },
  { label: 'Красный',  value: '#ef4444' },
  { label: 'Синий',    value: '#3b82f6' },
  { label: 'Жёлтый',  value: '#facc15' },
  { label: 'Оранжевый', value: '#f97316' },
  { label: 'Белый',   value: '#e2e8f0' },
  { label: 'Чёрный',  value: '#475569' },
];
