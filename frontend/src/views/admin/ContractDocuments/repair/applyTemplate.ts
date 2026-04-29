function flattenForTemplate(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out[prefix] = String(obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenForTemplate(v, key));
    } else {
      out[key] = v === null || v === undefined ? '' : String(v);
    }
  }
  return out;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTemplateValue(path: string, raw: string, plainCustomer: boolean): string {
  const trimmed = raw.trim();
  const fallback = path.startsWith('customer.') && !trimmed ? 'Не предоставлено' : trimmed;
  const safe = escapeHtml(fallback || '__________');
  if (path.startsWith('customer.') && !plainCustomer) {
    return `<strong><em>${safe}</em></strong>`;
  }
  return safe;
}

/**
 * Закрывает незакрытые `<strong>` / `<em>` (частая ошибка после правок в contenteditable),
 * из‑за которой жирный/курсив «тянется» на следующие абзацы (например, на примечание).
 */
function balanceStrongEmTags(html: string): string {
  const re = /<\s*(\/?)\s*(strong|em)\b[^>]*>/gi;
  const stack: ('strong' | 'em')[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const isClose = m[1] === '/';
    const name = m[2].toLowerCase() as 'strong' | 'em';
    if (isClose) {
      const idx = stack.lastIndexOf(name);
      if (idx >= 0) stack.splice(idx, 1);
    } else {
      stack.push(name);
    }
  }
  if (stack.length === 0) return html;
  return (
    html +
    [...stack]
      .reverse()
      .map((t) => `</${t}>`)
      .join('')
  );
}

/** Таблица реквизитов (две колонки): для сброса лишнего жирного в превью/печати. */
const REQUISITES_TABLE_CLASS = 'contractRequisitesBlock';
const PAGE_SIGNATURES_CLASS = 'contractPageSignatures';

function findNextTableBlock(
  html: string,
  from: number
): { start: number; end: number; block: string } | null {
  const lower = html.toLowerCase();
  const start = lower.indexOf('<table', from);
  if (start < 0) return null;
  const gt = html.indexOf('>', start);
  if (gt < 0) return null;
  let depth = 1;
  let pos = gt + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = lower.indexOf('<table', pos);
    const nextClose = lower.indexOf('</table>', pos);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 6;
    } else {
      depth--;
      pos = nextClose + 8;
    }
  }
  if (depth !== 0) return null;
  return { start, end: pos, block: html.slice(start, pos) };
}

/** Помечает таблицу с ПОДРЯДЧИК/ЗАКАЗЧИК, чтобы стили сняли <strong>/<em> в ячейках. */
function ensureRequisitesTableClass(html: string): string {
  if (!html.includes('ПОДРЯДЧИК') || !html.includes('ЗАКАЗЧИК')) return html;
  let out = html;
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(out, from);
    if (!found) break;
    const { start, end, block } = found;
    if (
      block.includes('ПОДРЯДЧИК') &&
      block.includes('ЗАКАЗЧИК') &&
      !block.includes(REQUISITES_TABLE_CLASS)
    ) {
      const openMatch = block.match(/^<table\b[^>]*>/i);
      if (openMatch) {
        const fullTag = openMatch[0];
        let newTag: string;
        if (/\bclass\s*=/i.test(fullTag)) {
          newTag = fullTag.replace(/class\s*=\s*(["'])([^"']*)\1/i, (_, q, cls) => {
            const t = cls.trim();
            return `class=${q}${t ? `${t} ` : ''}${REQUISITES_TABLE_CLASS}${q}`;
          });
        } else {
          newTag = fullTag.replace(/<table\b/i, `<table class="${REQUISITES_TABLE_CLASS}"`);
        }
        const newBlock = block.replace(fullTag, newTag);
        out = out.slice(0, start) + newBlock + out.slice(end);
        from = start + newBlock.length;
        continue;
      }
    }
    from = end;
  }
  return out;
}

/** Убирает HTML-ссылки, оставляя только их текст (часто прилетают из Excel). */
function stripAnchorTags(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '');
}

function buildPageSignaturesBlock(flat: Record<string, string>): string {
  const exec = escapeHtml((flat['executor.directorName'] ?? '').trim() || '____________________');
  const customer = escapeHtml((flat['customer.fullName'] ?? '').trim() || '____________________');
  return `<table class="${PAGE_SIGNATURES_CLASS}" style="width: 100%; border-collapse: collapse; margin-top: 14pt; page-break-inside: avoid;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding: 6pt 10pt 0 0;">
      <p style="margin: 0 0 4pt;">Подрядчик _____________________ / ${exec}</p>
      <p style="margin: 0; font-size: 9pt;">м.п.</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding: 6pt 0 0 10pt;">
      <p style="margin: 0 0 4pt;">Заказчик _____________________ / ${customer}</p>
      <p style="margin: 0; font-size: 9pt;">подпись</p>
    </td>
  </tr>
</table>`;
}

function addPageSignatures(html: string, flat: Record<string, string>): string {
  if (!/page-break-after\s*:\s*always/i.test(html)) return html;
  if (html.includes(PAGE_SIGNATURES_CLASS)) return html;
  const sign = buildPageSignaturesBlock(flat);
  let out = html.replace(
    /(<div\b[^>]*style\s*=\s*["'][^"']*page-break-after\s*:\s*always[^"']*["'][^>]*>\s*<\/div>)/gi,
    `${sign}$1`
  );
  if (!out.includes(sign)) return out;
  if (/<div\b[^>]*class\s*=\s*["'][^"']*\bdocPrint\b[^"']*["'][^>]*>\s*<\/div>\s*$/i.test(out)) {
    out = out.replace(
      /(<div\b[^>]*class\s*=\s*["'][^"']*\bdocPrint\b[^"']*["'][^>]*>\s*<\/div>\s*)$/i,
      `${sign}$1`
    );
  } else {
    out = `${out}${sign}`;
  }
  return out;
}

/**
 * Подстановка плейсхолдеров вида `{{customer.fullName}}`.
 * Для обычного текста без жирного/курсива у заказчика: `{{customer.fullName|plain}}`.
 */
export function applyTemplate(template: string, data: unknown): string {
  const flat = flattenForTemplate(data);
  const replaced = template.replace(
    /\{\{\s*([\w.]+)\s*(\|\s*plain\s*)?\}\}/g,
    (_, path: string, plainMod: string) =>
      formatTemplateValue(path, flat[path] ?? '', Boolean(plainMod))
  );
  return addPageSignatures(
    ensureRequisitesTableClass(balanceStrongEmTags(stripAnchorTags(replaced))),
    flat
  );
}
