import type { PackageFormData } from './packageForm';

/** ID расчётов из сметы пакета и из всех слотов Д/с (для учёта «ещё в пакетах»). */
export function collectEstimatePresetIdsFromPackageFormData(
  formData: Record<string, unknown>
): string[] {
  const ids: string[] = [];
  const est = formData.estimate;
  if (est && typeof est === 'object') {
    const e = est as Record<string, unknown>;
    if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) {
      ids.push(e.selectedPresetId.trim());
    }
    if (Array.isArray(e.selectedPresetIds)) {
      for (const id of e.selectedPresetIds) {
        if (typeof id === 'string' && id.trim()) ids.push(id.trim());
      }
    }
  }
  const slots = formData.addendumSlots;
  if (Array.isArray(slots)) {
    for (const sl of slots) {
      if (!sl || typeof sl !== 'object') continue;
      const slot = sl as Record<string, unknown>;
      const addIdsFrom = (value: unknown) => {
        if (!Array.isArray(value)) return;
        for (const id of value) {
          if (typeof id === 'string' && id.trim()) ids.push(id.trim());
        }
      };
      addIdsFrom(slot.selectedPresetIds);
      addIdsFrom(slot.excludedSelectedPresetIds);
    }
  }
  return [...new Set(ids)];
}

export function collectAddendumSlotPresetIds(
  slot: PackageFormData['addendumSlots'][number]
): Set<string> {
  const ids = new Set<string>();
  for (const id of slot.selectedPresetIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  for (const id of slot.excludedSelectedPresetIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  return ids;
}
