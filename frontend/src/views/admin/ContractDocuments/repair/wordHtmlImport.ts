/**
 * Импорт HTML, сохранённого из Word («Веб-страница»): кодировка и мелкая очистка разметки.
 */

function countCyrillicLetters(s: string): number {
  return (s.match(/[а-яёА-ЯЁ]/g) ?? []).length;
}

function sniffCharsetLabel(bytes: Uint8Array): 'utf-8' | 'windows-1251' | null {
  const n = Math.min(bytes.length, 48_000);
  const head = new TextDecoder('iso-8859-1').decode(bytes.subarray(0, n)).toLowerCase();
  const m = head.match(/charset\s*=\s*["']?\s*([\w._-]+)/i);
  if (!m) return null;
  const c = m[1].trim().toLowerCase();
  if (c === 'utf-8' || c === 'utf8') return 'utf-8';
  if (c === 'windows-1251' || c === 'cp1251' || c === 'x-cp1251' || c === 'ansi')
    return 'windows-1251';
  if (c.includes('1251')) return 'windows-1251';
  return null;
}

function decodeLabel(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

/**
 * Читает байты HTML-файла с учётом типичного для Word РФ экспорта в windows-1251.
 */
export function decodeWordHtmlFileBytes(bytes: Uint8Array): string {
  const fromMeta = sniffCharsetLabel(bytes);
  if (fromMeta === 'windows-1251') return decodeLabel(bytes, 'windows-1251');
  if (fromMeta === 'utf-8') return decodeLabel(bytes, 'utf-8');

  const utf8 = decodeLabel(bytes, 'utf-8');
  const cp1251 = decodeLabel(bytes, 'windows-1251');
  const cUtf = countCyrillicLetters(utf8);
  const c1251 = countCyrillicLetters(cp1251);
  if (utf8.includes('\uFFFD') && c1251 > 0) return cp1251;
  if (c1251 > cUtf + 8) return cp1251;
  return utf8;
}

/** Служебные блоки Word для выравнивания колонок — в браузере не нужны и мешают таблице. */
export function stripWordOptionalTableBlocks(html: string): string {
  return html.replace(/<!\[if\s+!supportMisalignedColumns\]>[\s\S]*?<!\[endif\]>/gi, '');
}

/** Скрытая строка с «нулевой» высотой — задаёт ширины колонок в Word и даёт лишнюю высоту в браузере. */
export function stripWordZeroHeightLayoutRow(html: string): string {
  return html.replace(/<tr\b[^>]*\bheight\s*=\s*["']?0["']?[^>]*>[\s\S]*?<\/tr>/gi, '');
}

/**
 * Ячейка с подписью «Линия отреза» (типичный КО-1 из Word) — класс для сужения колонки в CSS.
 */
export function markKoTearLineGuideCells(html: string): string {
  return html.replace(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi, (full, attrs: string, inner: string) => {
    if (!/Линия отреза/i.test(inner) || !/\browspan\s*=/i.test(attrs)) return full;
    if (/\bkoTearGuideCell\b/i.test(attrs)) return full;

    if (/\bclass\s*=\s*"/i.test(attrs)) {
      return `<td${attrs.replace(/\bclass\s*=\s*"/i, 'class="koTearGuideCell ')}>${inner}</td>`;
    }
    if (/\bclass\s*=\s*'/i.test(attrs)) {
      return `<td${attrs.replace(/\bclass\s*=\s*'/i, "class='koTearGuideCell ")}>${inner}</td>`;
    }
    return `<td class="koTearGuideCell"${attrs}>${inner}</td>`;
  });
}

/**
 * После обёртки в `.docPrint`: для типичного экспорта Word (`.WordSection1`, КО и т.п.)
 * помечает корень классом `docPrintWordCompact` — к нему в CSS и в стилях печати привязаны
 * более плотные отступы и межстрочный интервал (в т.ч. при печати).
 */
export function applyWordImportedDocPrintCompact(html: string): string {
  let out = stripWordZeroHeightLayoutRow(html);

  if (/\bWordSection1\b/i.test(out) && !/\bdocPrintWordCompact\b/i.test(out)) {
    const withQuoted = out.replace(
      /<div\b([^>]*\bclass=")([^"]*\bdocPrint\b)([^"]*)(")/i,
      '<div$1$2 docPrintWordCompact$3$4'
    );
    if (withQuoted !== out) {
      out = withQuoted;
    } else {
      out = out.replace(
        /<div\b([^>]*\bclass=)docPrint(\s|>)/i,
        '<div$1"docPrint docPrintWordCompact"$2'
      );
    }
  }

  return markKoTearLineGuideCells(out);
}

export async function readWordHtmlExportFileAsString(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const raw = decodeWordHtmlFileBytes(new Uint8Array(buf));
  return stripWordZeroHeightLayoutRow(stripWordOptionalTableBlocks(raw));
}
