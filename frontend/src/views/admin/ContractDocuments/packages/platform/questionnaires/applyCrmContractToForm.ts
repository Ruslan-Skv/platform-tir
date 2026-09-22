import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import { formFromCrmCustomerDetail } from '@/views/admin/CRM/Customers/shared/crmCustomerForm';
import { joinPersonFullName } from '@/views/admin/CRM/Customers/shared/crmCustomerName';

import {
  type PackageCustomerBlock,
  type PackageFormData,
  defaultPackageFormData,
  normalizePackageCustomerBlock,
} from '../form/packageForm';
import {
  isManagerQuestionnaire1Filled,
  readManagerQuestionnaire1FromCrmDetail,
} from './crmManagerQuestionnaire1';

/** Блок «Заказчик» из карточки CRM (без слияния с предыдущими значениями формы). */
function packageCustomerBlockFromCrmDetail(detail: CrmCustomerDetail): PackageCustomerBlock {
  const { form, lockedPhones } = formFromCrmCustomerDetail(detail);
  const type = form.entityType as PackageCustomerBlock['type'];
  const personFullName = joinPersonFullName({
    lastName: form.lastName,
    firstName: form.firstName,
    patronymic: form.patronymic,
  });
  const extraPhones = form.phones.map((p) => p.trim()).filter(Boolean);
  const allPhones = [...lockedPhones, ...extraPhones];

  return normalizePackageCustomerBlock({
    type,
    fullName: type === 'PERSON' ? personFullName : form.repNom.trim(),
    representativeFullNameNominative: form.repNom.trim(),
    representativeFullNameGenitive: form.repGen.trim(),
    organizationName: form.organizationName.trim(),
    representativePositionNominative: form.posNom.trim(),
    representativePositionGenitive: form.posGen.trim(),
    inn: form.inn.trim(),
    ogrn: form.ogrn.trim(),
    address: form.address.trim(),
    email: form.email.trim(),
    bankDetails: form.bankDetails.trim(),
    passportSeriesNumber: form.passportSeriesNumber.trim(),
    passportIssuedBy: form.passportIssuedBy.trim(),
    passportIssueDate: form.passportIssueDate.trim(),
    phones: allPhones.length > 0 ? allPhones : [''],
    phone: allPhones[0] ?? '',
  });
}

/**
 * Подстановка заказчика и адреса объекта из карточки CRM (поиск в базе, создание заказчика).
 */
export function mergePackageFormFromCrmCustomerDetail(
  detail: CrmCustomerDetail,
  prev: PackageFormData
): PackageFormData {
  const { form } = formFromCrmCustomerDetail(detail);
  const objectAddress = (form.objectAddresses[0] ?? '').trim();
  const fromCustomer = readManagerQuestionnaire1FromCrmDetail(detail);

  return {
    ...prev,
    customer: packageCustomerBlockFromCrmDetail(detail),
    object: {
      ...prev.object,
      objectAddress,
    },
    managerQuestionnaire1: isManagerQuestionnaire1Filled(fromCustomer)
      ? fromCustomer
      : prev.managerQuestionnaire1,
  };
}

/** Сбрасывает поля, заполняемые из карточки CRM (блок «Заказчик» и «Адрес объекта»). */
export function clearPackageFormCrmCustomerFields(prev: PackageFormData): PackageFormData {
  const defaults = defaultPackageFormData();
  return {
    ...prev,
    customer: defaults.customer,
    object: {
      ...prev.object,
      objectAddress: defaults.object.objectAddress,
    },
  };
}

/** Есть ли в блоке «Заказчик» данные (в т.ч. без привязки `_linkedCrmCustomerId`). */
export function packageCustomerBlockHasContent(customer: PackageCustomerBlock): boolean {
  const phones = (customer.phones ?? []).map((p) => p.trim()).filter(Boolean);
  return Boolean(
    customer.fullName?.trim() ||
    customer.representativeFullNameNominative?.trim() ||
    customer.representativeFullNameGenitive?.trim() ||
    customer.organizationName?.trim() ||
    customer.representativePositionNominative?.trim() ||
    customer.representativePositionGenitive?.trim() ||
    customer.inn?.trim() ||
    customer.ogrn?.trim() ||
    customer.address?.trim() ||
    customer.phone?.trim() ||
    phones.length > 0 ||
    customer.email?.trim() ||
    customer.bankDetails?.trim() ||
    customer.passportSeriesNumber?.trim() ||
    customer.passportIssuedBy?.trim() ||
    customer.passportIssueDate?.trim()
  );
}

/** Заполняет блок «Заказчик» из ответа POST `/admin/customers` после создания карточки в CRM. */
export function mergePackageFormFromCreatedCrmCustomer(
  created: unknown,
  prev: PackageFormData
): PackageFormData {
  if (!created || typeof created !== 'object') return prev;
  const id = (created as { id?: unknown }).id;
  if (typeof id !== 'string' || !id.trim()) return prev;
  return mergePackageFormFromCrmCustomerDetail(created as CrmCustomerDetail, prev);
}
