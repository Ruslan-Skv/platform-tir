import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  applyRepairContractDiscountToNullableBase,
  repairEstimateTotalToContractFields,
} from './repairContractDiscount';
import type { RepairPackageFormData } from './repairPackageForm';

export type EstimateSnapshotLine = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
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
    const raw = preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft);
    const localSnapshot = applyAdditionalMarkupPercentToSnapshot(
      raw,
      getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
    );
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
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
};

export function parseEstimateSnapshotFromDraft(draftRaw: string): EstimateSnapshot | null {
  try {
    const parsed = JSON.parse(draftRaw) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return null;

    const rooms: EstimateSnapshotRoom[] = [];
    for (const calc of parsed.calcs) {
      const roomLines: EstimateSnapshotLine[] = [];
      for (const rawLine of calc.lines ?? []) {
        if (!rawLine?.itemId || typeof rawLine.quantity !== 'number' || rawLine.quantity <= 0)
          continue;
        const quantity = Number(rawLine.quantity);
        roomLines.push({
          name: `Позиция ${rawLine.itemId}`,
          unit: 'ед.',
          quantity,
          price: 0,
          amount: 0,
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

/** Снимок сметы для прикрепления к пакету: базовый расчёт + эффективная доп. наценка. */
export function getSnapshotForEstimateAttach(
  preset: ContractEstimatePreset,
  estimateGroups: ContractEstimateGroup[]
): EstimateSnapshot | null {
  return applyAdditionalMarkupPercentToSnapshot(
    preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
    getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
  );
}

function presetObjectGroupKey(preset: ContractEstimatePreset): string {
  return preset.groupId ? preset.groupId : '__ungrouped__';
}

/** Расчёт из неархивного объекта (или вне объекта) — доступен для прикрепления к пакету в ремонте. */
export function isContractEstimatePresetAttachable(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): boolean {
  if (preset.archived) return false;
  if (!preset.groupId) return true;
  const g = groups.find((x) => x.id === preset.groupId);
  return !g?.archived;
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
    return {
      ...previous,
      estimateObjectGroupKey: '',
      estimate: {
        ...previous.estimate,
        selectedPresetId: '',
        selectedPresetIds: [],
        snapshot: null,
        notes: '',
      },
    };
  }
  const selectedPresetsRaw = uniqueIds
    .map((id) => presets.find((it) => it.id === id))
    .filter((x): x is ContractEstimatePreset => Boolean(x));
  if (selectedPresetsRaw.length === 0) {
    return {
      ...previous,
      estimateObjectGroupKey: '',
      estimate: {
        ...previous.estimate,
        selectedPresetId: '',
        selectedPresetIds: [],
        snapshot: null,
        notes: '',
      },
    };
  }
  const groupKey = presetObjectGroupKey(selectedPresetsRaw[0]);
  const selectedPresets = selectedPresetsRaw.filter((p) => presetObjectGroupKey(p) === groupKey);
  const coercedIds = selectedPresets.map((p) => p.id);
  if (selectedPresets.length === 0) {
    return {
      ...previous,
      estimateObjectGroupKey: '',
      estimate: {
        ...previous.estimate,
        selectedPresetId: '',
        selectedPresetIds: [],
        snapshot: null,
        notes: '',
      },
    };
  }
  const mergedSnapshot = mergeEstimateSnapshots(
    selectedPresets.map((preset) => ({
      presetTitle: preset.title,
      snapshot: applyAdditionalMarkupPercentToSnapshot(
        preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
        getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
      ),
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
      snapshot: applyAdditionalMarkupPercentToSnapshot(
        preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
        getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
      ),
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
