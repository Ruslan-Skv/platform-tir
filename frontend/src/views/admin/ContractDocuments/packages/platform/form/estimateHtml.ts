import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../form/packageContractDiscount';
import type { PackageEstimateBlock } from './types';

/** Подвал после таблицы сметы: скидка и итог со скидкой (не трогает суммы по строкам). */
function buildEstimateRoomsDiscountSuffixHtml(
  grossTotal: number,
  contractDiscountPercentRaw?: string
): string {
  const p = parsePackageContractDiscountPercent(contractDiscountPercentRaw ?? '');
  if (p <= 0 || !Number.isFinite(grossTotal) || grossTotal <= 0) return '';
  const net = applyPackageContractDiscountToAmount(grossTotal, p);
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  return `<p class="estimateA4DiscountMeta" style="margin:8px 0 0;text-align:right;">Скидка по договору: ${String(p).replace('.', ',')}%</p>
<p class="estimateA4Total" style="margin:4px 0 0;text-align:right;">Итого со скидкой: <strong>${fmt(net)} руб.</strong></p>`;
}

/** HTML-таблица объединённой сметы по снимку (как на вкладке «Смета» / в шаблоне). Строки — без договорной скидки; при необходимости скидка только в подвале через `buildEstimateRoomsDiscountSuffixHtml`. */
export function buildEstimateRoomsHtmlFromSnapshot(
  snapshot: PackageEstimateBlock['snapshot'],
  contractDiscountPercentRaw?: string
): string {
  if (!snapshot?.rooms?.length) return '';
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  return `<table style="width:100%;border-collapse:collapse;margin:8pt 0;page-break-inside:auto;break-inside:auto;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Помещение / позиция</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Кол-во</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Цена</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Сумма</th>
    </tr>
  </thead>
  <tbody>
    ${snapshot.rooms
      .map((room) => {
        const roomHeader = `<tr>
      <td colspan="4" style="border:1px solid #cbd5e1; padding:6px; font-weight:700; background:#f8fafc;">${escapeHtml(
        room.name
      )} — ${room.total.toFixed(2).replace('.', ',')}</td>
    </tr>`;
        const roomLines = room.lines
          .map(
            (line) => `<tr>
      <td style="border:1px solid #cbd5e1; padding:6px;">${escapeHtml(line.name)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.quantity} ${escapeHtml(line.unit)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.price.toFixed(2).replace('.', ',')}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.amount.toFixed(2).replace('.', ',')}</td>
    </tr>`
          )
          .join('');
        return `${roomHeader}${roomLines}`;
      })
      .join('')}
    <tr>
      <td colspan="3" style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">Итого</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">${snapshot.total
        .toFixed(2)
        .replace('.', ',')}</td>
    </tr>
  </tbody>
</table>${buildEstimateRoomsDiscountSuffixHtml(snapshot.total, contractDiscountPercentRaw)}`;
}
