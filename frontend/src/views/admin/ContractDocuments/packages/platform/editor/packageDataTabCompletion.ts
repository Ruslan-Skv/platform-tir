import type { PackageFormData } from '../form/packageForm';
import { calcPackageSectionCompletionPercent } from './packageDataTabUi';

export function packageCustomerSectionCompletionPercent(
  form: PackageFormData,
  linkedCrmCustomerId: string | null
): number {
  if (!linkedCrmCustomerId) return 0;
  if (form.customer.type === 'PERSON') {
    return calcPackageSectionCompletionPercent([
      form.customer.fullName,
      form.customer.address,
      form.customer.email,
      form.customer.phones,
      form.customer.passportSeriesNumber,
      form.customer.passportIssuedBy,
      form.customer.passportIssueDate,
      form.customer.bankDetails,
    ]);
  }
  return calcPackageSectionCompletionPercent([
    form.customer.representativeFullNameNominative,
    form.customer.representativeFullNameGenitive,
    form.customer.organizationName,
    form.customer.representativePositionNominative,
    form.customer.representativePositionGenitive,
    form.customer.inn,
    form.customer.ogrn,
    form.customer.address,
    form.customer.email,
    form.customer.phones,
    form.customer.bankDetails,
  ]);
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
