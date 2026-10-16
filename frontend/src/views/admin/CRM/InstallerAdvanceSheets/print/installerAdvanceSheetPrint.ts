import type { InstallerAdvanceSheetDetail } from '@/shared/api/crm/admin-installer-advance-sheets';
import {
  downloadDocumentPdf,
  printDocumentHtml,
} from '@/views/admin/ContractDocuments/core/printDocument';

import { formatIasGradeShort } from '../shared/installer-advance-sheets-page.constants';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value: number | string): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDateRu(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

/**
 * Печатная форма ведомости: мастер расписывается за получение каждой суммы.
 * Тот же HTML используется для печати (окно браузера) и скачивания PDF.
 */
export function buildInstallerAdvanceSheetInnerHtml(sheet: InstallerAdvanceSheetDetail): string {
  const masterGrade = formatIasGradeShort(sheet.installer.grade);
  const masterLine = escapeHtml(
    masterGrade ? `${sheet.installer.name} (${masterGrade})` : sheet.installer.name
  );

  const rows = sheet.items
    .map(
      (item, index) => `
      <tr>
        <td style="text-align:center;">${index + 1}</td>
        <td>${escapeHtml(item.contractNumber || '—')}</td>
        <td>${escapeHtml([item.customerName, item.objectAddress].filter(Boolean).join(', ') || '—')}</td>
        <td style="text-align:right; white-space:nowrap;">${formatMoney(item.amount)} ₽</td>
        <td style="width:22%;"></td>
      </tr>`
    )
    .join('');

  const noteBlock = sheet.note?.trim()
    ? `<p style="margin:10pt 0 0;">Примечание: ${escapeHtml(sheet.note.trim())}</p>`
    : '';

  return `
  <div class="docPrint">
    <h1>Ведомость № ${sheet.number} выплаты авансов мастеру</h1>
    <p style="text-align:center; margin:0 0 10pt;">от ${formatDateRu(sheet.createdAt)}</p>
    <p style="margin:0 0 4pt;"><strong>Мастер:</strong> ${masterLine}</p>
    <p style="margin:0 0 8pt;"><strong>Создал:</strong> ${escapeHtml(sheet.createdBy?.name ?? '—')}</p>
    <table style="width:100%; border-collapse:collapse; font-size:11pt;">
      <thead>
        <tr>
          <th style="border:1pt solid #111; padding:4pt 6pt; text-align:center; width:5%;">№</th>
          <th style="border:1pt solid #111; padding:4pt 6pt; text-align:left;">№ договора</th>
          <th style="border:1pt solid #111; padding:4pt 6pt; text-align:left;">Заказчик, адрес</th>
          <th style="border:1pt solid #111; padding:4pt 6pt; text-align:right;">Сумма, ₽</th>
          <th style="border:1pt solid #111; padding:4pt 6pt; text-align:left;">Подпись мастера</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td style="border:1pt solid #111; padding:4pt 6pt;" colspan="3"><strong>Итого к выдаче</strong></td>
          <td style="border:1pt solid #111; padding:4pt 6pt; text-align:right; white-space:nowrap;"><strong>${formatMoney(sheet.totalAmount)} ₽</strong></td>
          <td style="border:1pt solid #111; padding:4pt 6pt;"></td>
        </tr>
      </tbody>
    </table>
    ${noteBlock}
    <table style="width:100%; margin-top:36pt; font-size:11pt; border-collapse:collapse;">
      <tr>
        <td style="width:50%; padding:4pt 0;">Выдал (ведущий специалист): ______________ / ______________</td>
        <td style="width:50%; padding:4pt 0;">Получил (мастер): ______________ / ${masterLine}</td>
      </tr>
    </table>
  </div>`;
}

export function printInstallerAdvanceSheet(sheet: InstallerAdvanceSheetDetail): void {
  printDocumentHtml(
    buildInstallerAdvanceSheetInnerHtml(sheet),
    `Ведомость № ${sheet.number} авансов — ${sheet.installer.name}`
  );
}

export async function downloadInstallerAdvanceSheetPdf(
  sheet: InstallerAdvanceSheetDetail
): Promise<void> {
  await downloadDocumentPdf(
    buildInstallerAdvanceSheetInnerHtml(sheet),
    `Ведомость № ${sheet.number} авансов — ${sheet.installer.name}`,
    `Ведомость_авансов_№${sheet.number}_${sheet.installer.name}`
  );
}
