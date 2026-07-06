import { normalizeContractLegalListInHtml } from '@/views/admin/ContractDocuments/core/typography/contractLegalList';
import { normalizeContractActHandwrittenSignaturesInHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplateActSignatures';
import { normalizeContractTemplatePageBreaksInHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplatePageBreak';
import { packageContractTemplateStructureInHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplateStructure';
import {
  isLikelyContractTitleElement,
  normalizeContractTitleInDom,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateTitle';
import { unifyContractDocumentTypographyInHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';

import type { NormalizeMode } from './templatesLibraryStorage';

export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function normalizeTemplateEditorHtml(raw: string): string {
  return unifyContractDocumentTypographyInHtml(
    normalizeContractActHandwrittenSignaturesInHtml(
      normalizeContractTemplatePageBreaksInHtml(
        normalizeContractLegalListInHtml(packageContractTemplateStructureInHtml(raw))
      )
    )
  );
}

/** Нормализация целого фрагмента (абзац, ячейка): схлопывает пробелы и обрезает края. */
function normalizeTextWhitespace(input: string): string {
  return normalizeInlineTextWhitespace(input).trim();
}

/** Нормализация текстового узла в DOM: краевые пробелы сохраняются (между соседними span). */
function normalizeInlineTextWhitespace(input: string): string {
  return input
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/[ \t]*\n+[ \t]*/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ');
}

export function normalizeTemplateHtmlWhitespace(sourceHtml: string, mode: NormalizeMode): string {
  if (typeof window === 'undefined') return sourceHtml;
  const container = window.document.createElement('div');
  container.innerHTML = sourceHtml || '';

  const walker = window.document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const textNode of textNodes) {
    const normalized = normalizeInlineTextWhitespace(textNode.nodeValue ?? '');
    textNode.nodeValue = normalized;
  }

  const blocks = Array.from(container.querySelectorAll('p, div, li'));
  for (const el of blocks) {
    if (el.classList.contains('docPrint')) continue;
    const hasMeaningfulChild = !!el.querySelector('table, img, hr, ul, ol, blockquote');
    const normalizedText = normalizeTextWhitespace(el.textContent ?? '');
    if (!hasMeaningfulChild && !normalizedText) {
      el.remove();
    }
  }

  if (mode === 'strict') {
    const isSimpleTextBlock = (el: Element): el is HTMLDivElement | HTMLParagraphElement => {
      const tag = el.tagName.toLowerCase();
      if (tag !== 'p' && tag !== 'div') return false;
      if ((el as HTMLElement).classList.contains('docPrint')) return false;
      return !el.querySelector('table, ul, ol, li, blockquote, img, hr');
    };

    const normalizeBlockText = (el: Element): string => {
      const clone = el.cloneNode(true) as HTMLElement;
      for (const br of Array.from(clone.querySelectorAll('br'))) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      return normalizeTextWhitespace(clone.textContent ?? '');
    };

    const mergeSimpleBlocksIn = (root: ParentNode) => {
      const nodes = Array.from(root.childNodes);
      let i = 0;
      while (i < nodes.length) {
        const node = nodes[i];
        if (!(node instanceof HTMLElement) || !isSimpleTextBlock(node)) {
          i += 1;
          continue;
        }
        const group: HTMLElement[] = [node];
        let j = i + 1;
        while (j < nodes.length) {
          const next = nodes[j];
          if (!(next instanceof HTMLElement) || !isSimpleTextBlock(next)) break;
          group.push(next);
          j += 1;
        }
        if (group.length > 1) {
          if (group.some((el) => isLikelyContractTitleElement(el))) {
            i = j;
            continue;
          }
          const merged = normalizeTextWhitespace(
            group
              .map((el) => normalizeBlockText(el))
              .filter(Boolean)
              .join(' ')
          );
          group[0].textContent = merged;
          group[0].setAttribute(
            'style',
            'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;'
          );
          for (let k = 1; k < group.length; k += 1) {
            group[k].remove();
          }
        }
        i = j;
      }
    };

    mergeSimpleBlocksIn(container);
    for (const printable of Array.from(container.querySelectorAll('.docPrint'))) {
      mergeSimpleBlocksIn(printable);
    }

    const normalizeCellText = (cell: HTMLTableCellElement): string => {
      const clone = cell.cloneNode(true) as HTMLElement;
      for (const br of Array.from(clone.querySelectorAll('br'))) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      return normalizeTextWhitespace(clone.textContent ?? '');
    };

    const tables = Array.from(container.querySelectorAll('table'));
    for (const table of tables) {
      const getRows = () => Array.from(table.querySelectorAll('tr'));
      const getMaxCols = (rows: HTMLTableRowElement[]) =>
        rows.reduce((acc, row) => {
          const cols = Array.from(row.querySelectorAll('td, th')).reduce((sum, el) => {
            const span = Number((el as HTMLTableCellElement).getAttribute('colspan') ?? '1');
            return sum + (Number.isFinite(span) && span > 0 ? span : 1);
          }, 0);
          return Math.max(acc, cols);
        }, 1);

      const initialRows = getRows();
      if (initialRows.length === 0) continue;
      const rowTexts = initialRows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td, th')) as HTMLTableCellElement[];
        return normalizeTextWhitespace(cells.map((c) => normalizeCellText(c)).join(' '));
      });
      const introStartIdx = rowTexts.findIndex((text) => text.includes('{{executor.companyName}}'));
      const introEndIdx = rowTexts.findIndex(
        (text) =>
          text.includes('далее «Заказчик»') ||
          text.includes('далее "Заказчик"') ||
          text.includes('далее Заказчик')
      );
      if (introStartIdx >= 0 && introEndIdx >= introStartIdx) {
        const mergedText = normalizeTextWhitespace(
          rowTexts
            .slice(introStartIdx, introEndIdx + 1)
            .filter(Boolean)
            .join(' ')
        );
        if (mergedText) {
          const maxCols = getMaxCols(initialRows);
          const replacementRow = window.document.createElement('tr');
          const replacementCell = window.document.createElement('td');
          replacementCell.setAttribute('colspan', String(maxCols));
          replacementCell.setAttribute('style', 'text-align: justify; padding: 2px 0;');
          replacementCell.textContent = mergedText;
          replacementRow.appendChild(replacementCell);
          const first = initialRows[introStartIdx];
          first.replaceWith(replacementRow);
          for (let i = introStartIdx + 1; i <= introEndIdx; i += 1) {
            initialRows[i]?.remove();
          }
        }
      }

      const rows = getRows();
      const maxCols = getMaxCols(rows);
      const extractPointNumber = (text: string): string | null => {
        const normalized = normalizeTextWhitespace(text);
        const match = normalized.match(/^(\d+(?:\.\d+)+)\b/);
        return match ? match[1] : null;
      };
      let i = 0;
      while (i < rows.length) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td, th')) as HTMLTableCellElement[];
        if (cells.length < 2) {
          i += 1;
          continue;
        }
        const firstCellText = normalizeCellText(cells[0]);
        const pointNumber = extractPointNumber(firstCellText);
        if (!pointNumber) {
          i += 1;
          continue;
        }

        const chunk: string[] = [];
        const markerTail = normalizeTextWhitespace(firstCellText.replace(/^(\d+(?:\.\d+)+)\b/, ''));
        if (markerTail) chunk.push(markerTail);
        const firstBody = normalizeTextWhitespace(
          cells
            .slice(1)
            .map((c) => normalizeCellText(c))
            .join(' ')
        );
        if (firstBody) chunk.push(firstBody);
        let j = i + 1;
        while (j < rows.length) {
          const nextCells = Array.from(
            rows[j].querySelectorAll('td, th')
          ) as HTMLTableCellElement[];
          if (nextCells.length === 0) break;
          const marker = normalizeCellText(nextCells[0]);
          if (extractPointNumber(marker)) break;
          const nextJoined = normalizeTextWhitespace(
            nextCells.map((c) => normalizeCellText(c)).join(' ')
          );
          if (/^\d+\.\s+[А-ЯA-ZЁ]/.test(nextJoined)) break;
          const nextBody = normalizeTextWhitespace(
            (marker ? [marker] : [])
              .concat(nextCells.slice(1).map((c) => normalizeCellText(c)))
              .join(' ')
          );
          if (nextBody) chunk.push(nextBody);
          j += 1;
        }
        const mergedPointText = normalizeTextWhitespace(chunk.join(' '));
        const replacementRow = window.document.createElement('tr');
        const numberCell = window.document.createElement('td');
        numberCell.textContent = pointNumber;
        numberCell.setAttribute(
          'style',
          'text-align: justify; padding: 2px 0; vertical-align: top;'
        );
        const bodyCell = window.document.createElement('td');
        bodyCell.setAttribute('colspan', String(Math.max(1, maxCols - 1)));
        bodyCell.setAttribute('style', 'text-align: justify; padding: 2px 0;');
        bodyCell.textContent = mergedPointText;
        replacementRow.append(numberCell, bodyCell);
        row.replaceWith(replacementRow);
        if (j - i > 1) {
          for (let k = i + 1; k < j; k += 1) {
            rows[k]?.remove();
          }
        }
        i = j;
      }
    }

    const paragraphs = Array.from(container.querySelectorAll('p'));
    for (const p of paragraphs) {
      if (p.classList.contains('docPrint')) continue;
      if (isLikelyContractTitleElement(p)) continue;
      const brNodes = Array.from(p.querySelectorAll('br'));
      for (const br of brNodes) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      p.setAttribute('style', 'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;');
      p.textContent = normalizeTextWhitespace(p.textContent ?? '');
    }

    normalizeContractTitleInDom(container);

    const spans = Array.from(container.querySelectorAll('span'));
    for (const span of spans) {
      if (span.attributes.length === 0) {
        span.replaceWith(...Array.from(span.childNodes));
      }
    }
  }

  return container.innerHTML;
}

function stripDangerousInlineScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

function extractHtmlBodyInner(full: string): string {
  const match = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return stripDangerousInlineScripts((match ? match[1] : full).trim());
}

/** Импорт из Word «Веб-страница»: оборачиваем в `.docPrint`, если корня ещё нет. */
export function ensureDocPrintRootWrapper(inner: string): string {
  const t = extractHtmlBodyInner(inner);
  if (!t) return '<div class="docPrint"></div>';
  if (
    /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bdocPrint\b/i.test(t) ||
    /<div\b[^>]*\bclass\s*=\s*docPrint\b/i.test(t)
  ) {
    return t;
  }
  return `<div class="docPrint">\n${t}\n</div>`;
}
