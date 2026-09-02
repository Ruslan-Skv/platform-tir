import type { CrmDirection } from '@/shared/api/admin-crm';
import {
  PACKAGE_KIND_DIRECTION_SLUG,
  packageKindsWithCreateEnabled,
} from '@/views/admin/ContractDocuments/packages/config';

/**
 * Направления = те же, что в модалке «Новое оформление договора»
 * (реестр пакетов с createEnabled).
 */
export function filterCrmDirectionsForContractCreate(directions: CrmDirection[]): CrmDirection[] {
  const enabledSlugs = packageKindsWithCreateEnabled().map(
    (kind) => PACKAGE_KIND_DIRECTION_SLUG[kind]
  );
  const slugOrder = new Map(enabledSlugs.map((slug, index) => [slug, index]));
  return directions
    .filter((d) => slugOrder.has(d.slug) && d.isActive !== false)
    .sort((a, b) => (slugOrder.get(a.slug) ?? 0) - (slugOrder.get(b.slug) ?? 0));
}

/** Алиас: нумерация использует тот же набор, что и создание договора. */
export const filterCrmDirectionsForNumbering = filterCrmDirectionsForContractCreate;
