import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import { getCrmCustomer, updateCrmCustomer } from '@/shared/api/admin-crm';

import {
  type RepairManagerQuestionnaire1Block,
  type RepairPackageFormData,
  defaultRepairManagerQuestionnaire1Block,
  mergeRepairPackageFormData,
} from './repairPackageForm';

/** Ключ в `Customer.extendedProfile` — общая анкета (опросник) для всех договоров клиента. */
export const CRM_PROFILE_REPAIR_MANAGER_QUESTIONNAIRE1_KEY = 'repairManagerQuestionnaire1';

/** Id карточки CRM в `formData` пакета договора. */
export const REPAIR_PACKAGE_LINKED_CRM_CUSTOMER_ID_KEY = '_linkedCrmCustomerId';

export function parseLinkedCrmCustomerIdFromFormData(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = (raw as Record<string, unknown>)[REPAIR_PACKAGE_LINKED_CRM_CUSTOMER_ID_KEY];
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export function parseManagerQuestionnaire1FromExtendedProfile(
  ext: Record<string, unknown> | null | undefined
): RepairManagerQuestionnaire1Block {
  const raw = ext?.[CRM_PROFILE_REPAIR_MANAGER_QUESTIONNAIRE1_KEY];
  if (!raw || typeof raw !== 'object') {
    return defaultRepairManagerQuestionnaire1Block();
  }
  return mergeRepairPackageFormData({
    managerQuestionnaire1: raw as RepairManagerQuestionnaire1Block,
  }).managerQuestionnaire1;
}

export function readManagerQuestionnaire1FromCrmDetail(
  detail: CrmCustomerDetail
): RepairManagerQuestionnaire1Block {
  const ext =
    detail.extendedProfile && typeof detail.extendedProfile === 'object'
      ? (detail.extendedProfile as Record<string, unknown>)
      : undefined;
  return parseManagerQuestionnaire1FromExtendedProfile(ext);
}

export function mergeManagerQuestionnaire1IntoCrmExtendedProfile(
  ext: Record<string, unknown>,
  block: RepairManagerQuestionnaire1Block
): Record<string, unknown> {
  return {
    ...ext,
    [CRM_PROFILE_REPAIR_MANAGER_QUESTIONNAIRE1_KEY]: block,
  };
}

export function isManagerQuestionnaire1Filled(block: RepairManagerQuestionnaire1Block): boolean {
  const empty = defaultRepairManagerQuestionnaire1Block();
  return JSON.stringify(block) !== JSON.stringify(empty);
}

export async function persistManagerQuestionnaire1ToCrmCustomer(
  customerId: string,
  block: RepairManagerQuestionnaire1Block,
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
  form: RepairPackageFormData
): Promise<{ form: RepairPackageFormData; migratedPackageToCustomer: boolean }> {
  const customer = await getCrmCustomer(customerId);
  const fromCustomer = readManagerQuestionnaire1FromCrmDetail(customer);
  const fromPackage = form.managerQuestionnaire1;

  if (isManagerQuestionnaire1Filled(fromCustomer)) {
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
