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
  if (path === 'estimate.roomsHtml') {
    return raw || '';
  }
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

/**
 * В шаблоне «Реквизиты» из редактора подписи уже в ячейках (м.п. / подпись и линия «___ / ФИО»).
 * Тогда не дублируем блок `contractPageSignatures` в конце.
 */
function requisitesTableHasInlinePartySignatures(tableHtml: string): boolean {
  if (!/\bcontractRequisitesBlock\b/i.test(tableHtml)) return false;
  if (!tableHtml.includes('ПОДРЯДЧИК') || !tableHtml.includes('ЗАКАЗЧИК')) return false;
  /* «м.п.» — без \b: в JS \b не работает с кириллицей рядом с > */
  const hasMp = /м\s*\.\s*п/i.test(tableHtml);
  const hasPodpis = /подпись/i.test(tableHtml);
  const hasUnderscoreSlash = /_{4,}\s*\//.test(tableHtml);
  const longUnderlineLines = (tableHtml.match(/_{10,}/g) ?? []).length;
  return (hasMp && hasPodpis && hasUnderscoreSlash) || longUnderlineLines >= 2;
}

function htmlHasRequisitesWithEmbeddedSignatures(html: string): boolean {
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(html, from);
    if (!found) break;
    if (requisitesTableHasInlinePartySignatures(found.block)) return true;
    from = found.end;
  }
  return false;
}

/** Убирает HTML-ссылки, оставляя только их текст (часто прилетают из Excel). */
function stripAnchorTags(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '');
}

const FINAL_SIGNATURES_ATTR = 'data-contract-final-signatures="1"';
const INLINE_PAGE_SIGNATURES_ATTR = 'data-contract-inline-page-signatures="1"';

/** Конец открывающего тега `<div ...>` от позиции `<`, учитывая кавычки в атрибутах (в т.ч. перенос строк внутри тега). */
function findOpeningTagEnd(html: string, ltIndex: number): number {
  let i = ltIndex + 1;
  let quote: "'" | '"' | null = null;
  while (i < html.length) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === '>') return i;
    i++;
  }
  return -1;
}

/**
 * Вставка непосредственно перед закрытием корневого `.docPrint`.
 * Нельзя использовать `lastIndexOf('</div>')`: в полях договора может быть HTML с закрывающими `</div>`.
 * Открывающий тег ищется по атрибуту class с учётом многострочной разметки.
 */
function insertInsideRootDocPrint(html: string, insertion: string): string {
  const lower = html.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < html.length) {
    const divIdx = lower.indexOf('<div', searchFrom);
    if (divIdx < 0) break;
    const openEnd = findOpeningTagEnd(html, divIdx);
    if (openEnd < 0) break;
    const openTag = html.slice(divIdx, openEnd + 1);
    const classMatch = /\bclass\s*=\s*(["'])([\s\S]*?)\1/i.exec(openTag);
    if (!classMatch || !/\bdocPrint\b/i.test(classMatch[2])) {
      searchFrom = divIdx + 4;
      continue;
    }
    let depth = 1;
    let pos = openEnd + 1;
    while (pos < html.length && depth > 0) {
      const nextOpen = lower.indexOf('<div', pos);
      const nextClose = lower.indexOf('</div', pos);
      if (nextClose < 0) break;
      const openFirst = nextOpen >= 0 && nextOpen < nextClose;
      if (openFirst) {
        depth++;
        pos = nextOpen + 4;
      } else {
        const closeGt = html.indexOf('>', nextClose);
        if (closeGt < 0) break;
        depth--;
        if (depth === 0) {
          return html.slice(0, nextClose) + insertion + html.slice(nextClose);
        }
        pos = closeGt + 1;
      }
    }
    searchFrom = divIdx + 4;
  }
  return `${html}${insertion}`;
}

function buildPageSignaturesBlock(
  flat: Record<string, string>,
  placement: 'inlineBeforeBreak' | 'documentFooter' = 'inlineBeforeBreak'
): string {
  const exec = escapeHtml((flat['executor.directorName'] ?? '').trim() || '____________________');
  const customer = escapeHtml((flat['customer.fullName'] ?? '').trim() || '____________________');
  const dataAttr =
    placement === 'documentFooter'
      ? ` ${FINAL_SIGNATURES_ATTR}`
      : ` ${INLINE_PAGE_SIGNATURES_ATTR}`;
  const marginTop = placement === 'documentFooter' ? '14pt' : '8pt';
  return `<table${dataAttr} class="${PAGE_SIGNATURES_CLASS}" style="width:100%;border-collapse:collapse;margin-top:${marginTop};padding-top:8pt;border-top:1px solid #bbb;page-break-inside:avoid;font-size:9pt;line-height:1.15;color:#111;">
  <tr>
    <td style="width:50%;vertical-align:bottom;padding:1pt 6pt 0 0;">
      <p style="margin:0;">Подрядчик ________________ / ${exec}</p>
      <p style="margin:0;font-size:7.5pt;line-height:1.1;">м.п.</p>
    </td>
    <td style="width:50%;vertical-align:bottom;padding:1pt 0 0 6pt;">
      <p style="margin:0;">Заказчик ________________ / ${customer}</p>
      <p style="margin:0;font-size:7.5pt;line-height:1.1;">подпись</p>
    </td>
  </tr>
</table>`;
}

/**
 * Пустой `<div style="…"> </div>` из кнопки «Разрыв страницы» (без вложенных тегов внутри),
 * иначе жадный `[\s\S]` схватит чужой закрывающий `</div>`.
 */
const PAGE_BREAK_MARKER_DIV_RE =
  /<div\b[\s\S]*?\bstyle\s*=\s*(["'])([\s\S]*?)\1[\s\S]*?>\s*<\/div\s*>/gi;

function styleSignalsManualPageBreak(styleValue: string): boolean {
  const s = styleValue.toLowerCase();
  return /page-break-after\s*:\s*always\b/.test(s) || /\bbreak-after\s*:\s*page\b/.test(s);
}

/**
 * Компактные подписи перед каждым ручным разрывом страницы (строго перед маркером из редактора).
 * Не опирается на `contractPageSignatures` в шаблоне — только на маркеры разрыва и защитный data-атрибут.
 */
function addPageSignatures(html: string, flat: Record<string, string>): string {
  if (html.includes(INLINE_PAGE_SIGNATURES_ATTR)) return html;

  const sign = buildPageSignaturesBlock(flat, 'inlineBeforeBreak');
  let replacedAny = false;
  const out = html.replace(PAGE_BREAK_MARKER_DIV_RE, (full, _q: string, styleInner: string) => {
    if (!styleSignalsManualPageBreak(styleInner)) return full;
    replacedAny = true;
    return `${sign}${full}`;
  });
  return replacedAny ? out : html;
}

/** Компактные подписи в конце договора (после раздела с реквизитами). */
function ensureFinalSignaturesRow(html: string, flat: Record<string, string>): string {
  if (html.includes(FINAL_SIGNATURES_ATTR)) return html;
  if (/data-contract-signatures-embedded\s*=\s*(["'])1\1/i.test(html)) return html;
  if (htmlHasRequisitesWithEmbeddedSignatures(html)) return html;
  const block = buildPageSignaturesBlock(flat, 'documentFooter');
  return insertInsideRootDocPrint(html, block);
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
  let html = ensureRequisitesTableClass(balanceStrongEmTags(stripAnchorTags(replaced)));
  html = html.replace(/page-break-before\s*:\s*always/gi, 'auto');
  html = html.replace(/\bbreak-before\s*:\s*page\b/gi, 'auto');
  html = addPageSignatures(html, flat);
  html = ensureFinalSignaturesRow(html, flat);
  return html;
}
