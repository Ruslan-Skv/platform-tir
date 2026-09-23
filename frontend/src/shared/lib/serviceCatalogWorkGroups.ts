/**
 * Группы работ справочника услуг (демонтаж / черновые / чистовые) —
 * альтернативная группировка видов работ в расчётах.
 */

export type ServiceCatalogWorkGroupKey = 'DEMOLITION' | 'ROUGH' | 'FINISHING';

export const SERVICE_CATALOG_WORK_GROUP_OPTIONS: {
  value: ServiceCatalogWorkGroupKey;
  label: string;
}[] = [
  { value: 'DEMOLITION', label: 'Демонтажные работы' },
  { value: 'ROUGH', label: 'Черновые работы' },
  { value: 'FINISHING', label: 'Чистовые работы' },
];

export const SERVICE_CATALOG_WORK_GROUP_LABELS: Record<ServiceCatalogWorkGroupKey, string> =
  Object.fromEntries(
    SERVICE_CATALOG_WORK_GROUP_OPTIONS.map(({ value, label }) => [value, label])
  ) as Record<ServiceCatalogWorkGroupKey, string>;

/** Подпись группы работ; для пустого/неизвестного ключа — «Без группы». */
export function serviceCatalogWorkGroupLabel(key: string | null | undefined): string {
  if (!key) return 'Без группы';
  return SERVICE_CATALOG_WORK_GROUP_LABELS[key as ServiceCatalogWorkGroupKey] ?? 'Без группы';
}

export function isServiceCatalogWorkGroupKey(value: unknown): value is ServiceCatalogWorkGroupKey {
  return value === 'DEMOLITION' || value === 'ROUGH' || value === 'FINISHING';
}
