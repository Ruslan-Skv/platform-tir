import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import { defaultRepairPackageFormData } from './defaults';
import type { RepairCustomerBlock, RepairPackageFormData } from './types';

/**
 * Те же примерные данные, что в превью библиотеки шаблонов (плюс реквизиты из карточек).
 * Используется, чтобы пустые поля пакета не давали «пустой» договор при тех же {{…}} в HTML.
 */
export type RepairTemplatePreviewCustomerKind = RepairCustomerBlock['type'];

export function buildRepairTemplatePreviewFallbackData(
  executorProfile: ExecutorRequisiteProfile | null | undefined,
  signatoryProfile: ContractSignatoryProfile | null | undefined,
  customerKind: RepairTemplatePreviewCustomerKind = 'PERSON'
): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  const executorKind = executorProfile?.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  const directorName =
    signatoryProfile?.directorNameNominative ||
    signatoryProfile?.directorNameGenitive ||
    'Петров Петр Петрович';

  const customerByKind: RepairCustomerBlock =
    customerKind === 'COMPANY'
      ? {
          ...base.customer,
          type: 'COMPANY',
          organizationName: 'ООО «Пример Заказчик»',
          representativeFullNameNominative: 'Сидоров Сидор Сидорович',
          representativeFullNameGenitive: 'Сидорова Сидора Сидоровича',
          representativePositionNominative: 'Генеральный директор',
          representativePositionGenitive: 'Генерального директора',
          inn: '7701234567',
          ogrn: '1027700132195',
          address: 'г. Мурманск, ул. Примерная, д. 2',
          phone: '+7 900 111-11-11',
          phones: ['+7 900 111-11-11'],
          email: 'client@example.com',
          bankDetails: 'р/с 40702810… в ПАО «Банк»',
        }
      : customerKind === 'ENTREPRENEUR'
        ? {
            ...base.customer,
            type: 'ENTREPRENEUR',
            organizationName: 'Иванов Иван Иванович',
            fullName: 'Иванов Иван Иванович',
            inn: '510123456789',
            ogrn: '324510000012345',
            address: 'г. Мурманск, ул. Предпринимателя, д. 3',
            phone: '+7 900 222-22-22',
            phones: ['+7 900 222-22-22'],
            email: 'ip@example.com',
            bankDetails: 'р/с 40802810…',
          }
        : {
            ...base.customer,
            type: 'PERSON',
            fullName: 'Иванов Иван Иванович',
            address: 'г. Мурманск, ул. Примерная, д. 1',
            phone: '+7 900 000-00-00',
            phones: ['+7 900 000-00-00'],
            passportSeriesNumber: '12 34 567890',
            passportIssuedBy: 'ОВД Примерный',
            passportIssueDate: '01.01.2010',
          };

  return {
    ...base,
    customer: customerByKind,
    executor: {
      ...base.executor,
      selectedProfileTitle: executorProfile?.title ?? '',
      executorKind,
      companyName: executorProfile?.companyName || 'ООО Территория ИР',
      inn: executorProfile?.inn || '2312345678',
      kpp: executorKind === 'ENTREPRENEUR' ? '' : (executorProfile?.kpp ?? '231201001'),
      ogrn: executorKind === 'ENTREPRENEUR' ? '' : (executorProfile?.ogrn ?? '1232300000000'),
      ogrnip: executorKind === 'ENTREPRENEUR' ? (executorProfile?.ogrnip ?? '') : '',
      legalAddress: executorProfile?.legalAddress || '',
      actualAddress: executorProfile?.actualAddress || '',
      bankDetails: executorProfile?.bankDetails || '',
      bankName: executorProfile?.bankName ?? '',
      bankBik: executorProfile?.bankBik ?? '',
      bankCorrAccount: executorProfile?.bankCorrAccount ?? '',
      bankSettlementAccount: executorProfile?.bankSettlementAccount ?? '',
      email: executorProfile?.email || 'info@example.com',
      selectedSignatoryProfileTitle: signatoryProfile?.title ?? '',
      signatoryCrmUserId: signatoryProfile?.crmUserId ?? '',
      directorNameNominative: signatoryProfile?.directorNameNominative ?? '',
      directorNameGenitive: signatoryProfile?.directorNameGenitive ?? '',
      directorName,
      basis: signatoryProfile?.basis || 'Устава',
      salesOffice: signatoryProfile?.salesOffice ?? '',
      officePhone: signatoryProfile?.officePhone ?? '',
    },
    object: {
      ...base.object,
      objectAddress: 'г. Краснодар, ул. Строителей, д. 10',
      objectFloor: '5',
      objectDescription: 'Косметический ремонт квартиры',
    },
    contract: {
      ...base.contract,
      number: 'R-001/26',
      date: '29.04.2026',
      totalAmount: '250000',
      recommendedPrepayment: '175000,00',
      totalAmountWords: 'двести пятьдесят тысяч рублей',
      prepaymentAmount: '175000,00',
      prepaymentAmountWords: 'сто семьдесят пять тысяч рублей',
      paymentBasis: 'по договору подряда № R-001/26 от 29.04.2026',
      workPeriod: '60',
    },
    addendumDocumentDates: ['15.05.2026', '16.05.2026', '17.05.2026', '', ''],
  };
}

/**
 * Раньше подмешивал пример из библиотеки в пустые поля пакета (фиктивные ФИО, паспорт, суммы).
 * Пакет договора больше не использует fallback — только данные вкладки «Данные» / CRM.
 * Пример для превью шаблонов: `buildRepairTemplatePreviewFallbackData` в библиотеке.
 */
export function mergeRepairPackageFormWithPreviewFallback(
  form: RepairPackageFormData,
  _fallback: RepairPackageFormData
): RepairPackageFormData {
  return form;
}
