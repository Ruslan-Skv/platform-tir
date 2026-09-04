import { computeCrmCustomerFormFillPercent } from '@/views/admin/CRM/Customers/shared/crmCustomerFillPercent';
import {
  type CrmCustomerFormState,
  emptyCrmCustomerForm,
} from '@/views/admin/CRM/Customers/shared/crmCustomerForm';
import { parseFullNameString } from '@/views/admin/CRM/Customers/shared/crmCustomerName';

import type { PackageFormData } from '../../form/packageForm';
import { calcPackageSectionCompletionPercent } from './packageDataTabUi';

/** Блок «Заказчик» → форма CRM для того же % заполненности, что в «Карточках клиента». */
export function packageFormToCrmCustomerFillState(form: PackageFormData): CrmCustomerFormState {
  const c = form.customer;
  const phones = (c.phones ?? []).map((p) => p.trim()).filter(Boolean);
  const phone = (c.phone ?? '').trim();
  const mergedPhones = [...phones];
  if (phone && !mergedPhones.includes(phone)) mergedPhones.unshift(phone);

  const objectAddress = (form.object.objectAddress ?? '').trim();
  const base = emptyCrmCustomerForm();

  if (c.type === 'PERSON') {
    const name = parseFullNameString(c.fullName ?? '');
    return {
      ...base,
      entityType: 'PERSON',
      email: c.email ?? '',
      phones: mergedPhones.length > 0 ? mergedPhones : [''],
      lastName: name.lastName,
      firstName: name.firstName,
      patronymic: name.patronymic,
      address: c.address ?? '',
      objectAddresses: objectAddress ? [objectAddress] : [],
      bankDetails: c.bankDetails ?? '',
      passportSeriesNumber: c.passportSeriesNumber ?? '',
      passportIssuedBy: c.passportIssuedBy ?? '',
      passportIssueDate: c.passportIssueDate ?? '',
    };
  }

  return {
    ...base,
    entityType: c.type,
    email: c.email ?? '',
    phones: mergedPhones.length > 0 ? mergedPhones : [''],
    repNom: c.representativeFullNameNominative ?? '',
    repGen: c.representativeFullNameGenitive ?? '',
    organizationName: c.organizationName ?? '',
    posNom: c.representativePositionNominative ?? '',
    posGen: c.representativePositionGenitive ?? '',
    inn: c.inn ?? '',
    ogrn: c.ogrn ?? '',
    address: c.address ?? '',
    objectAddresses: objectAddress ? [objectAddress] : [],
    bankDetails: c.bankDetails ?? '',
  };
}

/** Как % в карточке клиента CRM (паспорт не учитывается; для физлица — ФИО по частям). */
export function packageCustomerSectionCompletionPercent(form: PackageFormData): number {
  return computeCrmCustomerFormFillPercent(packageFormToCrmCustomerFillState(form));
}

export function packageExecutorSectionCompletionPercent(form: PackageFormData): number {
  return calcPackageSectionCompletionPercent([
    form.executor.companyName,
    form.executor.inn,
    form.executor.executorKind === 'COMPANY' ? form.executor.kpp : form.executor.ogrnip,
    form.executor.ogrn,
    form.executor.email,
    form.executor.legalAddress,
    form.executor.actualAddress,
    form.executor.bankName,
    form.executor.bankBik,
    form.executor.bankCorrAccount,
    form.executor.bankSettlementAccount,
  ]);
}

export function packageManagerSectionCompletionPercent(form: PackageFormData): number {
  return calcPackageSectionCompletionPercent([
    form.executor.signatoryCrmUserId,
    form.executor.directorNameNominative,
    form.executor.directorNameGenitive,
    form.executor.basis,
    form.executor.salesOffice,
    form.executor.officePhone,
  ]);
}
