/** Приведение единиц к единому виду для отображения в каталоге */
export function normalizeUnit(raw: string): string {
  const t = raw.trim();
  if (t === '' || t === '—' || t === '-') return '—';

  const key = t.toLowerCase();
  const table: Record<string, string> = {
    м2: 'м²',
    'м²': 'м²',
    'м.кв.': 'м²',
    'м.п.': 'п.м.',
    'п.м.': 'п.м.',
    мп: 'п.м.',
    'шт.': 'шт',
    шт: 'шт',
    'точ.': 'точка',
    точка: 'точка',
    'пот.': 'п.м.',
    час: 'час',
  };
  if (table[key]) return table[key];

  return t;
}
