import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { RepairPackageFormData } from '../repairPackageForm';
import { isEstimatePresetAttachableToContract } from './estimatePipelineStage';
import {
  applyRepairContractDiscountToNullableBase,
  repairEstimateTotalToContractFields,
} from './repairContractDiscount';

/** Снятие основной сметы договора: очистить снимок и суммы в блоке договора (не из шаблона вручную). */
function detachMainRepairEstimateFromForm(previous: RepairPackageFormData): RepairPackageFormData {
  const cleared = repairEstimateTotalToContractFields(null);
  return {
    ...previous,
    estimateObjectGroupKey: '',
    contract: {
      ...previous.contract,
      totalAmount: cleared.totalAmount,
      totalAmountWords: cleared.totalAmountWords,
      recommendedPrepayment: cleared.recommendedPrepayment,
    },
    estimate: {
      ...previous.estimate,
      selectedPresetId: '',
      selectedPresetIds: [],
      snapshot: null,
      notes: '',
    },
  };
}

export type EstimateSnapshotLine = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  /** Id позиции каталога (пишется при сохранении сметы из ответа calculate). */
  itemId?: string;
};

export type EstimateSnapshotRoom = {
  name: string;
  total: number;
  lines: EstimateSnapshotLine[];
};

export type EstimateSnapshot = {
  total: number;
  rooms: EstimateSnapshotRoom[];
};

const ESTIMATE_ADDITIONAL_MARKUP_MAX = 999;

export function clampEstimateAdditionalMarkupPercent(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > ESTIMATE_ADDITIONAL_MARKUP_MAX) return ESTIMATE_ADDITIONAL_MARKUP_MAX;
  return raw;
}

export function getGroupEstimateAdditionalMarkupPercent(
  groupId: string | undefined,
  groups: ContractEstimateGroup[]
): number {
  if (!groupId) return 0;
  const g = groups.find((x) => x.id === groupId);
  if (
    !g ||
    typeof g.additionalMarkupPercent !== 'number' ||
    !Number.isFinite(g.additionalMarkupPercent)
  ) {
    return 0;
  }
  return clampEstimateAdditionalMarkupPercent(g.additionalMarkupPercent);
}

/** Наценка на расчёт; если на расчёте не задана — для расчёта в объекте используется наценка объекта. */
export function getEffectiveEstimateAdditionalMarkupPercent(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): number {
  if (
    typeof preset.additionalMarkupPercent === 'number' &&
    Number.isFinite(preset.additionalMarkupPercent)
  ) {
    return clampEstimateAdditionalMarkupPercent(preset.additionalMarkupPercent);
  }
  return getGroupEstimateAdditionalMarkupPercent(preset.groupId, groups);
}

/** Увеличивает цену и сумму по каждой позиции на `percent` %; пересчитывает итоги по помещениям и всей смете. */
export function applyAdditionalMarkupPercentToSnapshot(
  snapshot: EstimateSnapshot | null,
  percent: number
): EstimateSnapshot | null {
  if (!snapshot?.rooms?.length) return snapshot;
  const factor = 1 + clampEstimateAdditionalMarkupPercent(percent) / 100;
  if (factor <= 1) return snapshot;
  let grandTotal = 0;
  const rooms: EstimateSnapshotRoom[] = snapshot.rooms.map((room) => {
    let roomTotal = 0;
    const lines = room.lines.map((line) => {
      const price = line.price * factor;
      const amount = line.amount * factor;
      roomTotal += amount;
      return { ...line, price, amount };
    });
    grandTotal += roomTotal;
    return { ...room, total: roomTotal, lines };
  });
  return { total: grandTotal, rooms };
}

function formatMoneyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function mergeEstimateSnapshots(
  parts: Array<{ presetTitle: string; snapshot: EstimateSnapshot | null }>
): EstimateSnapshot | null {
  const rooms: EstimateSnapshotRoom[] = [];
  let total = 0;
  for (const part of parts) {
    if (!part.snapshot) continue;
    total += part.snapshot.total;
    for (const room of part.snapshot.rooms) {
      rooms.push({
        ...room,
        name: room.name,
      });
    }
  }
  if (rooms.length === 0) return null;
  return { total, rooms };
}

function formatEstimateSnapshotNotes(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot | null
): string {
  if (!snapshot) {
    return `Выбранный расчёт: ${preset.title} (${preset.categoryName}).`;
  }
  const lines: string[] = [];
  lines.push(`Расчёт: ${preset.title}`);
  lines.push(`Категория: ${preset.categoryName}`);
  lines.push(`Итого: ${formatMoneyValue(snapshot.total)}`);
  lines.push('');
  snapshot.rooms.forEach((room, roomIndex) => {
    lines.push(`${roomIndex + 1}. ${room.name} — ${formatMoneyValue(room.total)}`);
    room.lines.forEach((line) => {
      lines.push(
        `   - ${line.name}: ${line.quantity} ${line.unit} × ${formatMoneyValue(line.price)} = ${formatMoneyValue(line.amount)}`
      );
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}

function formatCombinedEstimateNotes(
  selectedPresets: ContractEstimatePreset[],
  mergedSnapshot: EstimateSnapshot | null,
  estimateGroups: ContractEstimateGroup[]
): string {
  if (selectedPresets.length === 0) return '';
  const blocks: string[] = selectedPresets.map((preset, idx) => {
    const localSnapshot = getSnapshotForEstimateAttach(preset, estimateGroups);
    const localText = formatEstimateSnapshotNotes(preset, localSnapshot);
    return `${idx + 1}) ${localText}`;
  });
  if (!mergedSnapshot) return blocks.join('\n\n');
  return [
    `Объединённая смета (${selectedPresets.length} расч.): ${formatMoneyValue(mergedSnapshot.total)}`,
    '',
    ...blocks,
  ].join('\n');
}

type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number | string }>;
  }>;
};

function draftLineQuantityPositive(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(String(raw).replace(',', '.').trim())
        : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseEstimateSnapshotFromDraft(draftRaw: string): EstimateSnapshot | null {
  try {
    const parsed = JSON.parse(draftRaw) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return null;

    const rooms: EstimateSnapshotRoom[] = [];
    for (const calc of parsed.calcs) {
      const roomLines: EstimateSnapshotLine[] = [];
      for (const rawLine of calc.lines ?? []) {
        const qty = draftLineQuantityPositive(rawLine?.quantity);
        const itemId =
          rawLine?.itemId === null || rawLine?.itemId === undefined
            ? null
            : String(rawLine.itemId).trim() || null;
        if (!itemId || qty == null) continue;
        roomLines.push({
          name: `Позиция ${itemId}`,
          unit: 'ед.',
          quantity: qty,
          price: 0,
          amount: 0,
          itemId,
        });
      }
      const roomTotal = roomLines.reduce((sum, line) => sum + line.amount, 0);
      if (roomLines.length > 0) {
        rooms.push({
          name: calc.name?.trim() || 'Помещение',
          total: roomTotal,
          lines: roomLines,
        });
      }
    }

    if (rooms.length === 0) return null;
    return {
      rooms,
      total: rooms.reduce((sum, room) => sum + room.total, 0),
    };
  } catch {
    return null;
  }
}

/** Снимок с наценкой, без фильтра по объёму работ (для дерева выбора в модалке «Разделение сметы»). */
export function getBaseSnapshotWithMarkupForPreset(
  preset: ContractEstimatePreset,
  estimateGroups: ContractEstimateGroup[]
): EstimateSnapshot | null {
  return applyAdditionalMarkupPercentToSnapshot(
    preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
    getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
  );
}

function filterSnapshotByWorkScopeLineKeys(
  snapshot: EstimateSnapshot | null,
  keys: string[] | null | undefined
): EstimateSnapshot | null {
  if (!snapshot?.rooms?.length) return snapshot;
  if (keys === undefined || keys === null) return snapshot;
  if (keys.length === 0) return { total: 0, rooms: [] };
  const keySet = new Set(keys);
  let grandTotal = 0;
  const rooms: EstimateSnapshotRoom[] = [];
  snapshot.rooms.forEach((room, gri) => {
    const lines = (room.lines ?? []).filter((_, li) => keySet.has(`wsl:${gri}:${li}`));
    if (lines.length === 0) return;
    const roomTotal = lines.reduce((s, ln) => s + ln.amount, 0);
    grandTotal += roomTotal;
    rooms.push({ ...room, lines, total: roomTotal });
  });
  if (rooms.length === 0) return { total: 0, rooms: [] };
  return { total: grandTotal, rooms };
}

/** Снимок сметы для прикрепления к пакету: наценка и при необходимости только выбранные позиции (`estimateWorkScopeKeys`). */
export function getSnapshotForEstimateAttach(
  preset: ContractEstimatePreset,
  estimateGroups: ContractEstimateGroup[]
): EstimateSnapshot | null {
  const base = getBaseSnapshotWithMarkupForPreset(preset, estimateGroups);
  return filterSnapshotByWorkScopeLineKeys(base, preset.estimateWorkScopeKeys);
}

function presetObjectGroupKey(preset: ContractEstimatePreset): string {
  return preset.groupId ? preset.groupId : '__ungrouped__';
}

/** Расчёт из «В работе», неархивного объекта (или вне объекта) — доступен для прикрепления к пакету. */
export function isContractEstimatePresetAttachable(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): boolean {
  return isEstimatePresetAttachableToContract(preset, groups);
}

/** Для пакета «Окна» — только расчёты карточки заказчика, привязанной к договору. */
export function isEstimatePresetForLinkedContractCustomer(
  preset: ContractEstimatePreset,
  options: {
    filterByLinkedCustomer: boolean;
    linkedCrmCustomerId: string | null | undefined;
  }
): boolean {
  if (!options.filterByLinkedCustomer) return true;
  const linkedId = options.linkedCrmCustomerId?.trim();
  if (!linkedId) return false;
  return (preset.crmCustomerId ?? '').trim() === linkedId;
}

/** Объект сметы договора: по первому прикреплённому расчёту или по полю формы до прикрепления. */
export function getContractEstimateObjectGroupKey(
  form: RepairPackageFormData,
  presets: ContractEstimatePreset[]
): string {
  const ids = form.estimate.selectedPresetIds ?? [];
  if (ids.length > 0) {
    const p0 = presets.find((p) => p.id === ids[0]);
    if (!p0) return '';
    return presetObjectGroupKey(p0);
  }
  return (form.estimateObjectGroupKey || '').trim();
}

/** Пересчёт блока estimate + сумм договора по списку id пресетов (как в редакторе пакета). */
export function applyEstimatePresetIdsToRepairForm(
  previous: RepairPackageFormData,
  presetIds: string[],
  presets: ContractEstimatePreset[],
  estimateGroups: ContractEstimateGroup[] = []
): RepairPackageFormData {
  const uniqueIds = [...new Set(presetIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return detachMainRepairEstimateFromForm(previous);
  }
  const selectedPresetsRaw = uniqueIds
    .map((id) => presets.find((it) => it.id === id))
    .filter((x): x is ContractEstimatePreset => Boolean(x));
  if (selectedPresetsRaw.length === 0) {
    return detachMainRepairEstimateFromForm(previous);
  }
  const groupKey = presetObjectGroupKey(selectedPresetsRaw[0]);
  const selectedPresets = selectedPresetsRaw.filter((p) => presetObjectGroupKey(p) === groupKey);
  const coercedIds = selectedPresets.map((p) => p.id);
  if (selectedPresets.length === 0) {
    return detachMainRepairEstimateFromForm(previous);
  }
  const mergedSnapshot = mergeEstimateSnapshots(
    selectedPresets.map((preset) => ({
      presetTitle: preset.title,
      snapshot: getSnapshotForEstimateAttach(preset, estimateGroups),
    }))
  );
  const notes = formatCombinedEstimateNotes(selectedPresets, mergedSnapshot, estimateGroups);
  const contractTotals = repairEstimateTotalToContractFields(
    applyRepairContractDiscountToNullableBase(
      mergedSnapshot?.total ?? null,
      previous.contract.discountPercent
    )
  );
  return {
    ...previous,
    estimateObjectGroupKey: groupKey,
    contract: {
      ...previous.contract,
      totalAmount: contractTotals.totalAmount,
      totalAmountWords: contractTotals.totalAmountWords,
      recommendedPrepayment: contractTotals.recommendedPrepayment,
    },
    estimate: {
      ...previous.estimate,
      selectedPresetId: coercedIds[0] ?? '',
      selectedPresetIds: coercedIds,
      snapshot: mergedSnapshot,
      notes,
    },
  };
}

/** Прикрепление расчётов к слоту Д/с №1…5 (без изменения сумм основного договора). */
export function applyEstimatePresetIdsToAddendumSlot(
  previous: RepairPackageFormData,
  slotIndex0: number,
  presetIds: string[],
  presets: ContractEstimatePreset[],
  estimateGroups: ContractEstimateGroup[] = [],
  target: 'additional' | 'excluded' = 'additional',
  /** Снятие расчёта из списка «Расчёты» и т.п.: разрешает менять слот даже при статусе SIGNED. */
  force = false
): RepairPackageFormData {
  if (slotIndex0 < 0 || slotIndex0 > 4) return previous;
  const slot = previous.addendumSlots[slotIndex0];
  if (!slot || (!force && slot.status === 'SIGNED')) return previous;

  const objectKey = getContractEstimateObjectGroupKey(previous, presets);
  if (!objectKey) return previous;

  const uniqueIds = [...new Set(presetIds.filter(Boolean))].filter((id) => {
    const pr = presets.find((x) => x.id === id);
    return pr && presetObjectGroupKey(pr) === objectKey;
  });
  const nextSlots = [...previous.addendumSlots] as RepairPackageFormData['addendumSlots'];

  if (uniqueIds.length === 0) {
    nextSlots[slotIndex0] = {
      ...slot,
      ...(target === 'additional'
        ? { selectedPresetIds: [], snapshot: null, notes: '' }
        : { excludedSelectedPresetIds: [], excludedSnapshot: null, excludedNotes: '' }),
    };
    return { ...previous, addendumSlots: nextSlots };
  }

  const selectedPresets = uniqueIds
    .map((id) => presets.find((it) => it.id === id))
    .filter((x): x is ContractEstimatePreset => Boolean(x));
  const mergedSnapshot = mergeEstimateSnapshots(
    selectedPresets.map((preset) => ({
      presetTitle: preset.title,
      snapshot: getSnapshotForEstimateAttach(preset, estimateGroups),
    }))
  );
  const notes = formatCombinedEstimateNotes(selectedPresets, mergedSnapshot, estimateGroups);
  nextSlots[slotIndex0] = {
    ...slot,
    ...(target === 'additional'
      ? { selectedPresetIds: uniqueIds, snapshot: mergedSnapshot, notes }
      : {
          excludedSelectedPresetIds: uniqueIds,
          excludedSnapshot: mergedSnapshot,
          excludedNotes: notes,
        }),
  };
  return { ...previous, addendumSlots: nextSlots };
}
