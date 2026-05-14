import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { parseDraftRooms } from './contractDocumentsEstimateSnapshot';
import {
  type EstimateSnapshot,
  type EstimateSnapshotRoom,
  getSnapshotForEstimateAttach,
} from './repairApplyEstimatePresetIds';
import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';

export type EstimateEmbedSection = {
  categoryName: string;
  rooms: EstimateSnapshotRoom[];
};

type DraftMultiCategoryMeta = {
  categories?: Array<{ slug: string; name: string; roomCount: number; total: number }>;
  slugs?: string[];
};

function normalizeUniqueSlugs(slugs: string[] | undefined): string[] {
  if (!Array.isArray(slugs)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    const t = typeof s === 'string' ? s.trim() : '';
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function resolvePresetMultiSlugOrder(
  preset: ContractEstimatePreset,
  meta: DraftMultiCategoryMeta | null
): string[] {
  const fromPreset = normalizeUniqueSlugs(preset.multiCategorySlugs);
  if (fromPreset.length > 1) return fromPreset;
  const fromMeta = normalizeUniqueSlugs(meta?.slugs);
  if (fromMeta.length > 1) return fromMeta;
  return [];
}

/**
 * Помещения объединённого снимка режутся по категориям комплексного расчёта (как при сохранении):
 * сначала `__adminMultiCategory.categories`, иначе порядок slug'ов и число помещений из черновиков по категориям.
 */
function buildEmbedSectionsForMergedPreset(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot
): EstimateEmbedSection[] {
  if (!snapshot.rooms.length) return [];
  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);
  const categories = meta?.categories ?? [];

  if (categories.length > 1) {
    const out: EstimateEmbedSection[] = [];
    let cursor = 0;
    for (const cat of categories) {
      const count = Math.max(0, Number(cat.roomCount) || 0);
      const rooms = snapshot.rooms.slice(cursor, cursor + count);
      cursor += count;
      if (rooms.length === 0) continue;
      const slug = (cat.slug || '').trim();
      const categoryName = (cat.name || '').trim() || slug.replace(/-/g, ' ') || '—';
      out.push({ categoryName, rooms: [...rooms] });
    }
    if (cursor < snapshot.rooms.length) {
      const tailRooms = snapshot.rooms.slice(cursor);
      const name = preset.categoryName.trim() || '—';
      out.push({ categoryName: name, rooms: [...tailRooms] });
    }
    return out;
  }

  const slugOrder = resolvePresetMultiSlugOrder(preset, meta);
  const byCat = preset.calculatorDraftByCategory as Record<string, string> | undefined;
  if (slugOrder.length > 1 && byCat && typeof byCat === 'object') {
    let cursor = 0;
    const out: EstimateEmbedSection[] = [];
    for (const slug of slugOrder) {
      const draft = byCat[slug];
      if (!draft || !String(draft).trim()) {
        return [{ categoryName: preset.categoryName.trim() || '—', rooms: [...snapshot.rooms] }];
      }
      const roomCount = parseDraftRooms(draft).length;
      if (roomCount <= 0) {
        return [{ categoryName: preset.categoryName.trim() || '—', rooms: [...snapshot.rooms] }];
      }
      const rooms = snapshot.rooms.slice(cursor, cursor + roomCount);
      cursor += roomCount;
      if (rooms.length === 0) continue;
      const catMeta = categories.find((c) => (c.slug || '').trim() === slug);
      const categoryName =
        (catMeta?.name && String(catMeta.name).trim()) || slug.replace(/-/g, ' ') || '—';
      out.push({ categoryName, rooms: [...rooms] });
    }
    if (cursor < snapshot.rooms.length) {
      out.push({
        categoryName: preset.categoryName.trim() || '—',
        rooms: [...snapshot.rooms.slice(cursor)],
      });
    }
    if (out.length > 0) return out;
  }

  return [{ categoryName: preset.categoryName.trim() || '—', rooms: [...snapshot.rooms] }];
}

function parseDraftMultiCategoryMeta(draftRaw: string): DraftMultiCategoryMeta | null {
  try {
    const parsed = JSON.parse(draftRaw) as Record<string, unknown>;
    const raw = parsed.__adminMultiCategory;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as DraftMultiCategoryMeta;
  } catch {
    return null;
  }
}

/** Как на вкладке «Смета»: группировка помещений по категориям выбранных расчётов (с учётом доп. наценки). */
export function buildEstimateSectionsFromPresetIds(
  presetIds: string[] | undefined | null,
  estimatePresets: ContractEstimatePreset[],
  estimateGroups: ContractEstimateGroup[] = []
): EstimateEmbedSection[] {
  const sectionMap = new Map<string, { categoryName: string; rooms: EstimateSnapshotRoom[] }>();
  for (const presetId of presetIds ?? []) {
    const preset = estimatePresets.find((row) => row.id === presetId);
    if (!preset) continue;
    const snapshot = getSnapshotForEstimateAttach(preset, estimateGroups);
    if (!snapshot?.rooms?.length) continue;
    for (const sec of buildEmbedSectionsForMergedPreset(preset, snapshot)) {
      const existing = sectionMap.get(sec.categoryName);
      if (existing) existing.rooms.push(...sec.rooms);
      else
        sectionMap.set(sec.categoryName, { categoryName: sec.categoryName, rooms: [...sec.rooms] });
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
 *
 * Договорная скидка: цены и суммы **по строкам** всегда без скидки (как в расчёте).
 * При переданном `contractDiscountPercent` скидка отражается **только** в подвальном `discountBlock`
 * (итоги). Дисконт по позициям — только в заказ-наряде (`buildWorkOrderRoomsHtmlFromSnapshot`).
 */
export function buildEstimateDocPrintEmbedHtml(options: {
  sections: EstimateEmbedSection[];
  snapshot: EstimateSnapshot | null;
  directorName: string;
  customerFullName: string;
  includeFooter?: boolean;
  /** Скидка по договору, % — блок в подвале сметы. */
  contractDiscountPercent?: string;
}): string {
  const {
    snapshot,
    directorName,
    customerFullName,
    includeFooter = true,
    contractDiscountPercent = '',
  } = options;
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

  const discountPercent = parseRepairContractDiscountPercent(contractDiscountPercent);
  const grossTotal = snapshot.total;
  const totalAfterDiscount = applyRepairContractDiscountToAmount(grossTotal, discountPercent);
  const discountBlock =
    discountPercent > 0 && grossTotal > 0
      ? `<p class="estimateA4DiscountMeta">Скидка по договору: ${String(discountPercent).replace('.', ',')}%</p>
<p class="estimateA4Total">Итого по смете (без скидки): <strong>${formatMoney(grossTotal)} руб.</strong></p>
<p class="estimateA4Total">Итого со скидкой: <strong>${formatMoney(totalAfterDiscount)} руб.</strong></p>`
      : `<p class="estimateA4Total">Итого по смете: <strong>${formatMoney(grossTotal)} руб.</strong></p>`;

  const bodyHtml = `<div class="estimateA4DocPrintEmbed estimateRoomsEmbed">
${categoriesHtml}
<section class="estimateA4Summary">
${summaryInner}
</section>
${discountBlock}
</div>`;
  if (!includeFooter) return bodyHtml;
  return `${bodyHtml}
${buildEstimateDocPrintFooterHtml({ directorName, customerFullName })}`;
}

export function buildEstimateDocPrintFooterHtml(options: {
  directorName: string;
  customerFullName: string;
}): string {
  const { directorName, customerFullName } = options;
  return `<div class="estimateA4DocPrintEmbed estimateRoomsEmbed">
${buildSignaturesHtml(directorName, customerFullName)}
${buildHandwritingNoteHtml()}
${buildSignaturesHtml(directorName, customerFullName)}
</div>`;
}
