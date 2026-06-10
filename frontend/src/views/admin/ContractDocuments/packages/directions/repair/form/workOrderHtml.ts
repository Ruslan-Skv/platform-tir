import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type { EstimateEmbedSection } from '../../../directions/repair/estimates/repairEstimateDocPrintEmbedHtml';
import { buildWindowsWorkOrderComputed } from '../../windows/repairWindowsWorkOrder';
import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from '../estimates/repairContractDiscount';
import type { RepairEstimateBlock, RepairPackageFormData } from './types';

type WorkOrderRoomLine = {
  name: string;
  unit: string;
  quantity: number;
  originalPrice: number;
  originalAmount: number;
  adjustedPrice: number;
  adjustedAmount: number;
};

type WorkOrderRoom = {
  name: string;
  originalTotal: number;
  adjustedTotal: number;
  lines: WorkOrderRoomLine[];
};

function parsePercent(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

export function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function toPercentValue(value: string): string {
  const parsed = parsePercent(value);
  return parsed > 0 ? String(parsed).replace('.', ',') : '0';
}

function normalizeGradeIncreasePercent(v: unknown): 0 | 5 | 10 {
  return v === 5 || v === 10 ? v : 0;
}

/** Заказ-наряд: здесь и только здесь скидка доводится до суммы/цены каждой позиции (затем налог, наценка, разряд). */
function buildWorkOrderComputed(
  snapshot: RepairEstimateBlock['snapshot'],
  taxRaw: string,
  markupRaw: string,
  gradeIncreasePercentRaw: unknown,
  contractDiscountPercentRaw: string
) {
  const taxPercent = parsePercent(taxRaw);
  const markupPercent = parsePercent(markupRaw);
  const gradeIncreasePercent = normalizeGradeIncreasePercent(gradeIncreasePercentRaw);
  const gradeFactor = 1 + gradeIncreasePercent / 100;
  const contractDiscountPercent = parseRepairContractDiscountPercent(contractDiscountPercentRaw);
  const rooms: WorkOrderRoom[] = (snapshot?.rooms ?? []).map((room) => {
    const lines = room.lines.map((line) => {
      const afterDiscount = applyRepairContractDiscountToAmount(
        line.amount,
        contractDiscountPercent
      );
      const afterDiscountPrice = applyRepairContractDiscountToAmount(
        line.price,
        contractDiscountPercent
      );
      return {
        name: line.name,
        unit: line.unit,
        quantity: line.quantity,
        originalPrice: line.price,
        originalAmount: line.amount,
        /**
         * ВАЖНО: расчёт последовательный:
         * 0) скидка по договору от исходной суммы/цены
         * 1) сначала вычитаем налог из суммы после скидки
         * 2) затем вычитаем наценку из остатка
         * 3) после этого применяем надбавку разряда (5% или 10%)
         */
        adjustedPrice:
          afterDiscountPrice * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor,
        adjustedAmount:
          afterDiscount * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor,
      };
    });
    const adjustedTotal = lines.reduce((sum, line) => sum + line.adjustedAmount, 0);
    const originalTotal = lines.reduce((sum, line) => sum + line.originalAmount, 0);
    return {
      name: room.name,
      originalTotal,
      adjustedTotal,
      lines,
    };
  });
  const originalTotal = rooms.reduce((sum, room) => sum + room.originalTotal, 0);
  const adjustedTotal = rooms.reduce((sum, room) => sum + room.adjustedTotal, 0);
  const afterDiscountTotal = applyRepairContractDiscountToAmount(
    originalTotal,
    contractDiscountPercent
  );
  const taxAmount = afterDiscountTotal * (taxPercent / 100);
  const afterTax = afterDiscountTotal - taxAmount;
  const markupAmount = afterTax * (markupPercent / 100);
  const reductionAmount = taxAmount + markupAmount;
  return {
    taxPercent,
    markupPercent,
    gradeIncreasePercent,
    rooms,
    originalTotal,
    adjustedTotal,
    taxAmount,
    markupAmount,
    reductionAmount,
  };
}

type WorkOrderComputedForHtml = ReturnType<typeof buildWorkOrderComputed>;

function buildWindowsWorkOrderComputedForTemplate(
  snapshot: RepairEstimateBlock['snapshot'],
  contractDiscountPercentRaw: string,
  markupPercentRaw: unknown
): WorkOrderComputedForHtml {
  const w = buildWindowsWorkOrderComputed(snapshot, contractDiscountPercentRaw, markupPercentRaw);
  const reductionAmount = Math.max(0, w.originalTotal - w.adjustedTotal);
  return {
    taxPercent: 0,
    markupPercent: w.markupPercent,
    gradeIncreasePercent: 0,
    rooms: w.rooms.map((room) => ({
      name: room.name,
      originalTotal: room.originalTotal,
      adjustedTotal: room.adjustedTotal,
      lines: room.lines.map((line) => ({
        name: line.name,
        unit: line.unit,
        quantity: line.quantity,
        originalPrice: line.originalPrice,
        originalAmount: line.originalAmount,
        adjustedPrice: line.adjustedPrice,
        adjustedAmount: line.adjustedAmount,
      })),
    })),
    originalTotal: w.originalTotal,
    adjustedTotal: w.adjustedTotal,
    taxAmount: 0,
    markupAmount: reductionAmount,
    reductionAmount,
  };
}

export function resolveWorkOrderComputedForTemplate(
  snapshot: RepairEstimateBlock['snapshot'],
  form: RepairPackageFormData,
  options?: {
    packageKind?: ContractDocumentPackageKind;
    windowsWorkOrderMarkupPercent?: number;
  }
): WorkOrderComputedForHtml {
  if (isProductDirectionPackageKind(options?.packageKind)) {
    return buildWindowsWorkOrderComputedForTemplate(
      snapshot,
      form.contract.discountPercent,
      options.windowsWorkOrderMarkupPercent
    );
  }
  return buildWorkOrderComputed(
    snapshot,
    form.workOrder.taxPercent,
    form.workOrder.markupPercent,
    form.workOrder.gradeIncreasePercent,
    form.contract.discountPercent
  );
}

export function buildWorkOrderRoomsHtmlFromComputed(
  computed: WorkOrderComputedForHtml,
  sections?: EstimateEmbedSection[],
  showLineAmounts = true
): string {
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  if (computed.rooms.length === 0) return '';
  const sectionRooms =
    sections && sections.length > 0
      ? sections
          .map((section) => ({
            categoryName: section.categoryName,
            rooms: section.rooms.map((room) => room.name),
          }))
          .filter((section) => section.rooms.length > 0)
      : [];

  let roomCursor = 0;
  const groupedRooms =
    sectionRooms.length > 0
      ? sectionRooms.map((section) => {
          const rows = computed.rooms.slice(roomCursor, roomCursor + section.rooms.length);
          roomCursor += section.rooms.length;
          return {
            categoryName: section.categoryName,
            rooms: rows,
          };
        })
      : [{ categoryName: '—', rooms: computed.rooms }];
  return `<table style="width:100%;border-collapse:collapse;margin:4pt 0;page-break-inside:auto;break-inside:auto;font-size:10px;line-height:1.2;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:center;">№</th>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:left;">Вид работ</th>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">Кол-во</th>
      ${
        showLineAmounts
          ? '<th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">Стоимость</th>'
          : ''
      }
    </tr>
  </thead>
  <tbody>
    ${groupedRooms
      .map((section) => {
        const sectionHeader = `<tr>
      <td class="workOrderCategoryRow" colspan="${showLineAmounts ? 4 : 3}" style="border:1px solid #cbd5e1; padding:3px 4px; font-weight:700;">Категория работ: ${escapeHtml(
        section.categoryName
      )}</td>
    </tr>`;
        const sectionRoomsHtml = section.rooms
          .map((room) => {
            const roomHeader = `<tr>
      <td class="workOrderRoomRow" colspan="${showLineAmounts ? 4 : 3}" style="border:1px solid #cbd5e1; padding:3px 4px; font-weight:700;">
        ${escapeHtml(room.name)}
        <span style="float:right;">${formatMoney(room.adjustedTotal)} руб.</span>
      </td>
    </tr>`;
            const roomLines = room.lines
              .map(
                (line, index) => `<tr>
      <td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:center;">${index + 1}</td>
      <td style="border:1px solid #cbd5e1; padding:3px 4px;">${escapeHtml(line.name)}</td>
      <td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">${line.quantity} ${escapeHtml(line.unit)}</td>
      ${
        showLineAmounts
          ? `<td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">${formatMoney(line.adjustedAmount)}</td>`
          : ''
      }
    </tr>`
              )
              .join('');
            return `${roomHeader}${roomLines}`;
          })
          .join('');
        return `${sectionHeader}${sectionRoomsHtml}`;
      })
      .join('')}
  </tbody>
</table>`;
}

export function buildWorkOrderRoomsHtmlFromSnapshot(
  snapshot: RepairEstimateBlock['snapshot'],
  taxRaw: string,
  markupRaw: string,
  gradeIncreasePercentRaw: unknown,
  contractDiscountPercentRaw: string,
  sections?: EstimateEmbedSection[],
  showLineAmounts = true,
  precomputed?: WorkOrderComputedForHtml
): string {
  const computed =
    precomputed ??
    buildWorkOrderComputed(
      snapshot,
      taxRaw,
      markupRaw,
      gradeIncreasePercentRaw,
      contractDiscountPercentRaw
    );
  return buildWorkOrderRoomsHtmlFromComputed(computed, sections, showLineAmounts);
}
