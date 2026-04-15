/** Нормализация ввода цены при редактировании с публичного сайта */
export function normalizePriceDraftInput(raw: string): string {
  return raw.replace(/\s/g, '').replace(',', '.');
}

export function isPublicPriceDraftDirty(draft: string, baseline: string): boolean {
  const d = normalizePriceDraftInput(draft);
  const b = normalizePriceDraftInput(baseline);
  const nd = parseFloat(d);
  const nb = parseFloat(b);
  if (Number.isFinite(nd) && Number.isFinite(nb)) return nd !== nb;
  return draft.trim() !== baseline.trim();
}
