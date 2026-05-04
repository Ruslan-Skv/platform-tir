import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateSnapshot,
  type EstimateSnapshotRoom,
  parseEstimateSnapshotFromDraft,
} from './repairApplyEstimatePresetIds';

export type EstimateEmbedSection = {
  categoryName: string;
  rooms: EstimateSnapshotRoom[];
};

/** Как на вкладке «Смета»: группировка помещений по категориям выбранных расчётов. */
export function buildEstimateSectionsFromPresetIds(
  presetIds: string[] | undefined | null,
  estimatePresets: ContractEstimatePreset[]
): EstimateEmbedSection[] {
  const sectionMap = new Map<string, { categoryName: string; rooms: EstimateSnapshotRoom[] }>();
  for (const presetId of presetIds ?? []) {
    const preset = estimatePresets.find((row) => row.id === presetId);
    if (!preset) continue;
    const categoryName = preset.categoryName.trim() || '—';
    const snapshot = preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft);
    const existing = sectionMap.get(categoryName);
    if (existing) {
      existing.rooms.push(...(snapshot?.rooms ?? []));
    } else {
      sectionMap.set(categoryName, { categoryName, rooms: [...(snapshot?.rooms ?? [])] });
    }
  }
  return [...sectionMap.values()];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function buildSignaturesHtml(directorName: string, customerFullName: string): string {
  const d = escapeHtml(directorName.trim() || '____________');
  const c = escapeHtml(customerFullName.trim() || '____________');
  return `<div class="estimateA4Signatures">
  <table class="estimateA4SignaturesTable">
    <tbody>
      <tr>
        <td class="estimateA4SignaturesCellLeft">
          <p class="estimateA4SignaturePartyLine">Подрядчик _____________________ / ${d}</p>
          <p class="estimateA4SignNote">м.п.</p>
        </td>
        <td class="estimateA4SignaturesCellRight">
          <p class="estimateA4SignaturePartyLine">Заказчик _____________________ / ${c}</p>
          <p class="estimateA4SignNote">подпись</p>
        </td>
      </tr>
    </tbody>
  </table>
</div>`;
}

function buildHandwritingNoteHtml(): string {
  return `<div class="estimateA4HandwritingNote">
  <p class="estimateA4HandwritingNoteLabel">Примечание:</p>
  <div class="estimateA4HandwritingLines" aria-hidden="true">
    <div class="estimateA4HandwritingLine"></div>
    <div class="estimateA4HandwritingLine"></div>
    <div class="estimateA4HandwritingLine"></div>
  </div>
</div>`;
}

/**
 * HTML-блок сметы для вставки в `.docPrint` (Д/с и т.п.): как на вкладке «Смета» —
 * категории, таблицы по помещениям, итоги по категориям, итого, подписи, примечание, подписи.
 */
export function buildEstimateDocPrintEmbedHtml(options: {
  sections: EstimateEmbedSection[];
  snapshot: EstimateSnapshot | null;
  directorName: string;
  customerFullName: string;
}): string {
  const { snapshot, directorName, customerFullName } = options;
  if (!snapshot?.rooms?.length) return '';

  let sections = options.sections.filter((s) => s.rooms.length > 0);
  if (sections.length === 0) {
    sections = [{ categoryName: '—', rooms: snapshot.rooms }];
  }

  const categoriesHtml = sections
    .map(
      (section) => `<section class="estimateA4CategorySection">
  <p class="estimateA4Meta">Категория работ: <strong>${escapeHtml(section.categoryName)}</strong>;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: ${section.rooms.length}</p>
  ${section.rooms
    .map(
      (room, roomIndex) => `<section class="estimateA4Room">
    <div class="estimateA4RoomHeader">
      <span>${roomIndex + 1}. ${escapeHtml(room.name)}</span>
      <strong>${formatMoney(room.total)} руб.</strong>
    </div>
    <table class="estimateA4Table">
      <thead>
        <tr>
          <th>№</th>
          <th>Наименование</th>
          <th>Ед.</th>
          <th>Кол-во</th>
          <th>Цена</th>
          <th>Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${room.lines
          .map(
            (line, lineIndex) => `<tr>
          <td>${lineIndex + 1}</td>
          <td>${escapeHtml(line.name)}</td>
          <td>${escapeHtml(line.unit)}</td>
          <td>${line.quantity}</td>
          <td>${formatMoney(line.price)}</td>
          <td>${formatMoney(line.amount)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </section>`
    )
    .join('')}
</section>`
    )
    .join('');

  const summaryInner =
    sections.length > 0
      ? `<h5 class="estimateA4SummaryTitle">Итоги по категориям</h5>
  <ul class="estimateA4SummaryList">
    ${sections
      .map((section) => {
        const categoryTotal = section.rooms.reduce((sum, room) => sum + room.total, 0);
        return `<li><span>${escapeHtml(section.categoryName)}</span><strong>${formatMoney(categoryTotal)} руб.</strong></li>`;
      })
      .join('')}
  </ul>`
      : '';

  return `<div class="estimateA4DocPrintEmbed estimateRoomsEmbed">
${categoriesHtml}
<section class="estimateA4Summary">
${summaryInner}
</section>
<p class="estimateA4Total">Итого по смете: <strong>${formatMoney(snapshot.total)} руб.</strong></p>
${buildSignaturesHtml(directorName, customerFullName)}
${buildHandwritingNoteHtml()}
${buildSignaturesHtml(directorName, customerFullName)}
</div>`;
}
