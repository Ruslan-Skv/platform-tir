/**
 * Преобразует лист Excel с текстом договора в HTML-обёртку для вкладки «Договор».
 * Лист: предпочтительно «Договор» или «Contract», иначе — первый лист книги.
 * Каждая непустая строка (объединение всех непустых ячеек строки через пробел) → абзац <p>.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pickContractSheetName(sheetNames: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase();
  const byPreferred = sheetNames.find((n) => ['договор', 'contract'].includes(norm(n)));
  return byPreferred ?? sheetNames[0] ?? '';
}

export function contractHtmlFromExcelArrayBuffer(
  buf: ArrayBuffer,
  XLSX: typeof import('xlsx')
): { html: string; sheetUsed: string } {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  if (!wb.SheetNames.length) {
    throw new Error('В файле нет листов.');
  }
  const sheetUsed = pickContractSheetName(wb.SheetNames);
  const ws = wb.Sheets[sheetUsed];
  if (!ws) {
    throw new Error('Не удалось прочитать лист.');
  }
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  const paragraphs: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const line = row
      .map((c) => (c === null || c === undefined ? '' : String(c)).trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (line) paragraphs.push(line);
  }

  if (!paragraphs.length) {
    throw new Error('На листе нет текста: заполните строки или проверьте имя листа «Договор».');
  }

  const inner = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
  const html = `<div class="docPrint">\n${inner}\n</div>`;
  return { html, sheetUsed };
}
