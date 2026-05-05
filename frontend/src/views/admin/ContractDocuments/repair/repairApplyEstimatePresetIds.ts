import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from './amountToRussianWords';
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
  mergedSnapshot: EstimateSnapshot | null
): string {
  if (selectedPresets.length === 0) return '';
  const blocks: string[] = selectedPresets.map((preset, idx) => {
    const localSnapshot = preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft);
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

function estimateTotalToContractFields(total: number | null): {
  totalAmount: string;
  totalAmountWords: string;
  recommendedPrepayment: string;
} {
  if (total === null) {
    return {
      totalAmount: '',
      totalAmountWords: '',
      recommendedPrepayment: '',
    };
  }
  const totalAmount = total.toFixed(2).replace('.', ',');
  return {
    totalAmount,
    totalAmountWords: amountToRussianWords(totalAmount),
    recommendedPrepayment: formatMoneyValue(total * 0.7),
  };
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

function presetObjectGroupKey(preset: ContractEstimatePreset): string {
  return preset.groupId ? preset.groupId : '__ungrouped__';
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
  presets: ContractEstimatePreset[]
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
      snapshot: preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
    }))
  );
  const notes = formatCombinedEstimateNotes(selectedPresets, mergedSnapshot);
  const contractTotals = estimateTotalToContractFields(mergedSnapshot?.total ?? null);
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
      snapshot: preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft),
    }))
  );
  const notes = formatCombinedEstimateNotes(selectedPresets, mergedSnapshot);
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
