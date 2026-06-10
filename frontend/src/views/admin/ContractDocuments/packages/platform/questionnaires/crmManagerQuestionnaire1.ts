import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import { getCrmCustomer, updateCrmCustomer } from '@/shared/api/admin-crm';

import {
  type PackageFormData,
  type PackageManagerQuestionnaire1Block,
  defaultPackageManagerQuestionnaire1Block,
  mergePackageFormData,
} from '../form/packageForm';

/**
 * Единый ключ в `Customer.extendedProfile` — одна анкета (опросник) на заказчика
 * для всех направлений (Ремонт, Окна, …) и всех договоров.
 */
export const CRM_PROFILE_MANAGER_QUESTIONNAIRE1_KEY = 'repairManagerQuestionnaire1';

/** @deprecated Дублировался по «Окна»; при чтении подмешивается, при записи удаляется. */
const CRM_PROFILE_LEGACY_WINDOWS_MANAGER_QUESTIONNAIRE1_KEY = 'windowsManagerQuestionnaire1';

/** Совместимость со старыми импортами. */
export const CRM_PROFILE_REPAIR_MANAGER_QUESTIONNAIRE1_KEY = CRM_PROFILE_MANAGER_QUESTIONNAIRE1_KEY;

/** Id карточки CRM в `formData` пакета договора. */
export const REPAIR_PACKAGE_LINKED_CRM_CUSTOMER_ID_KEY = '_linkedCrmCustomerId';

function blockFromExtendedProfileRaw(raw: unknown): PackageManagerQuestionnaire1Block | null {
  if (!raw || typeof raw !== 'object') return null;
  return mergePackageFormData({
    managerQuestionnaire1: raw as PackageManagerQuestionnaire1Block,
  }).managerQuestionnaire1;
}

export function parseLinkedCrmCustomerIdFromFormData(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = (raw as Record<string, unknown>)[REPAIR_PACKAGE_LINKED_CRM_CUSTOMER_ID_KEY];
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Читает единую анкету заказчика (основной ключ, затем устаревший «Окна»). */
export function parseManagerQuestionnaire1FromExtendedProfile(
  ext: Record<string, unknown> | null | undefined
): PackageManagerQuestionnaire1Block {
  const primary = blockFromExtendedProfileRaw(ext?.[CRM_PROFILE_MANAGER_QUESTIONNAIRE1_KEY]);
  if (primary && isManagerQuestionnaire1Filled(primary)) {
    return primary;
  }
  const legacyWindows = blockFromExtendedProfileRaw(
    ext?.[CRM_PROFILE_LEGACY_WINDOWS_MANAGER_QUESTIONNAIRE1_KEY]
  );
  if (legacyWindows && isManagerQuestionnaire1Filled(legacyWindows)) {
    return legacyWindows;
  }
  return primary ?? legacyWindows ?? defaultPackageManagerQuestionnaire1Block();
}

export function readManagerQuestionnaire1FromCrmDetail(
  detail: CrmCustomerDetail
): PackageManagerQuestionnaire1Block {
  const ext =
    detail.extendedProfile && typeof detail.extendedProfile === 'object'
      ? (detail.extendedProfile as Record<string, unknown>)
      : undefined;
  return parseManagerQuestionnaire1FromExtendedProfile(ext);
}

export function mergeManagerQuestionnaire1IntoCrmExtendedProfile(
  ext: Record<string, unknown>,
  block: PackageManagerQuestionnaire1Block
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...ext, [CRM_PROFILE_MANAGER_QUESTIONNAIRE1_KEY]: block };
  delete next[CRM_PROFILE_LEGACY_WINDOWS_MANAGER_QUESTIONNAIRE1_KEY];
  return next;
}

export function isManagerQuestionnaire1Filled(block: PackageManagerQuestionnaire1Block): boolean {
  const empty = defaultPackageManagerQuestionnaire1Block();
  return JSON.stringify(block) !== JSON.stringify(empty);
}

export async function persistManagerQuestionnaire1ToCrmCustomer(
  customerId: string,
  block: PackageManagerQuestionnaire1Block,
  currentDetail?: CrmCustomerDetail
): Promise<void> {
  let ext: Record<string, unknown>;
  if (currentDetail?.extendedProfile && typeof currentDetail.extendedProfile === 'object') {
    ext = { ...(currentDetail.extendedProfile as Record<string, unknown>) };
  } else {
    const detail = await getCrmCustomer(customerId);
    ext =
      detail.extendedProfile && typeof detail.extendedProfile === 'object'
        ? { ...(detail.extendedProfile as Record<string, unknown>) }
        : {};
  }
  await updateCrmCustomer(customerId, {
    extendedProfile: mergeManagerQuestionnaire1IntoCrmExtendedProfile(ext, block),
  });
}

/** Подтягивает анкету из CRM; при необходимости переносит локальную копию из пакета в карточку клиента. */
export async function hydrateManagerQuestionnaire1FromLinkedCrmCustomer(
  customerId: string,
  form: PackageFormData
): Promise<{ form: PackageFormData; migratedPackageToCustomer: boolean }> {
  const customer = await getCrmCustomer(customerId);
  const fromCustomer = readManagerQuestionnaire1FromCrmDetail(customer);
  const fromPackage = form.managerQuestionnaire1;

  if (isManagerQuestionnaire1Filled(fromCustomer)) {
    const ext =
      customer.extendedProfile && typeof customer.extendedProfile === 'object'
        ? (customer.extendedProfile as Record<string, unknown>)
        : {};
    const canonical = blockFromExtendedProfileRaw(ext[CRM_PROFILE_MANAGER_QUESTIONNAIRE1_KEY]);
    if (
      ext[CRM_PROFILE_LEGACY_WINDOWS_MANAGER_QUESTIONNAIRE1_KEY] != null &&
      (!canonical || !isManagerQuestionnaire1Filled(canonical))
    ) {
      await persistManagerQuestionnaire1ToCrmCustomer(customerId, fromCustomer, customer);
    }
    return {
      form: { ...form, managerQuestionnaire1: fromCustomer },
      migratedPackageToCustomer: false,
    };
  }

  if (isManagerQuestionnaire1Filled(fromPackage)) {
    await persistManagerQuestionnaire1ToCrmCustomer(customerId, fromPackage, customer);
    return { form, migratedPackageToCustomer: true };
  }

  return {
    form: { ...form, managerQuestionnaire1: fromCustomer },
    migratedPackageToCustomer: false,
  };
}
