import { chapters as baseChapters, type Chapter } from "./data";

const STORAGE_KEY = "mik32_course_data_v1";

export function loadChapters(): Chapter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseChapters;
    const overrides: Record<string, Chapter> = JSON.parse(raw);
    return baseChapters.map((ch) =>
      overrides[ch.id] ? { ...ch, ...overrides[ch.id] } : ch
    );
  } catch {
    return baseChapters;
  }
}

export function saveChapter(chapter: Chapter): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const overrides: Record<string, Chapter> = raw ? JSON.parse(raw) : {};
    overrides[chapter.id] = chapter;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new Event("mik32_data_changed"));
  } catch (e) {
    console.error("Failed to save chapter", e);
  }
}

export function resetChapter(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const overrides: Record<string, Chapter> = JSON.parse(raw);
    delete overrides[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new Event("mik32_data_changed"));
  } catch (e) {
    console.error("Failed to reset chapter", e);
  }
}

export function resetAll(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("mik32_data_changed"));
}

export function hasOverrides(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const overrides = JSON.parse(raw);
    return Object.keys(overrides).length > 0;
  } catch {
    return false;
  }
}

export function hasChapterOverride(id: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const overrides = JSON.parse(raw);
    return !!overrides[id];
  } catch {
    return false;
  }
}

export function exportDataTs(): string {
  const chapters = loadChapters();
  const json = JSON.stringify(chapters, null, 2);
  return json;
}

export { baseChapters };
