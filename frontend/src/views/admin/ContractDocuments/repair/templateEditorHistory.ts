/** История изменений HTML шаблона (undo/redo) для режимов HTML и визуального конструктора. */

export const TEMPLATE_EDITOR_HISTORY_MAX = 100;

export const TEMPLATE_EDITOR_ZOOM_MIN_PCT = 40;
export const TEMPLATE_EDITOR_ZOOM_MAX_PCT = 150;

export function clampTemplateEditorZoomPct(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(
    TEMPLATE_EDITOR_ZOOM_MIN_PCT,
    Math.min(TEMPLATE_EDITOR_ZOOM_MAX_PCT, Math.round(value))
  );
}

export function appendTemplateHistoryEntry(
  history: string[],
  index: number,
  nextHtml: string,
  maxEntries: number = TEMPLATE_EDITOR_HISTORY_MAX
): { history: string[]; index: number } {
  const base = index >= 0 ? history.slice(0, index + 1) : [];
  if (base.length > 0 && base[base.length - 1] === nextHtml) {
    return { history: base, index: base.length - 1 };
  }
  let next = [...base, nextHtml];
  if (next.length > maxEntries) {
    const overflow = next.length - maxEntries;
    next = next.slice(overflow);
  }
  return { history: next, index: next.length - 1 };
}
