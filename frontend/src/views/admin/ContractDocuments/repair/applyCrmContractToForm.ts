import type {
  Contract,
  ContractCustomer,
  CrmCustomerDetail,
  DocumentCustomerBlock,
} from '@/shared/api/admin-crm';
import { formFromCrmCustomerDetail } from '@/views/admin/CRM/Customers/crmCustomerForm';
import { joinPersonFullName } from '@/views/admin/CRM/Customers/crmCustomerName';

import { amountToRussianWords } from './amountToRussianWords';
import { isoOrCrmDateToContractDdMmYyyy } from './contractDateFormat';
import {
  type RepairCustomerBlock,
  type RepairPackageFormData,
  defaultRepairPackageFormData,
  normalizeRepairCustomerBlock,
} from './repairPackageForm';

function formatMoney(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function documentCustomerToRepairCustomer(doc: DocumentCustomerBlock): RepairCustomerBlock {
  const typeRaw = doc.type?.trim();
  const type: RepairCustomerBlock['type'] =
    typeRaw === 'COMPANY' || typeRaw === 'ENTREPRENEUR' || typeRaw === 'PERSON'
      ? typeRaw
      : 'PERSON';
  const phone = (doc.phone ?? '').trim();
  return normalizeRepairCustomerBlock({
    type,
    fullName: doc.fullName ?? '',
    representativeFullNameNominative: doc.representativeFullNameNominative ?? '',
    representativeFullNameGenitive: doc.representativeFullNameGenitive ?? '',
    organizationName: doc.organizationName ?? '',
    representativePositionNominative: doc.representativePositionNominative ?? '',
    representativePositionGenitive: doc.representativePositionGenitive ?? '',
    inn: doc.inn ?? '',
    ogrn: doc.ogrn ?? '',
    address: (doc.address ?? '').trim(),
    phone,
    phones: phone ? [phone] : [''],
    email: (doc.email ?? '').trim(),
    bankDetails: doc.bankDetails ?? '',
    passportSeriesNumber: doc.passportSeriesNumber ?? '',
    passportIssuedBy: doc.passportIssuedBy ?? '',
    passportIssueDate: doc.passportIssueDate ?? '',
  });
}

function contractSnapshotCustomer(c: Contract): RepairCustomerBlock {
  const name = (c.customerName ?? '').trim();
  const addr = (c.customerAddress ?? '').trim();
  const tel = (c.customerPhone ?? '').trim();
  return normalizeRepairCustomerBlock({
    ...defaultRepairPackageFormData().customer,
    type: 'PERSON',
    fullName: name,
    address: addr,
    phone: tel,
    phones: tel ? [tel] : [''],
  });
}

/** Блок «Заказчик» из карточки CRM (без слияния с предыдущими значениями формы). */
function repairCustomerBlockFromCrmDetail(detail: CrmCustomerDetail): RepairCustomerBlock {
  const { form, lockedPhones } = formFromCrmCustomerDetail(detail);
  const type = form.entityType as RepairCustomerBlock['type'];
  const personFullName = joinPersonFullName({
    lastName: form.lastName,
    firstName: form.firstName,
    patronymic: form.patronymic,
  });
  const extraPhones = form.phones.map((p) => p.trim()).filter(Boolean);
  const allPhones = [...lockedPhones, ...extraPhones];

  return normalizeRepairCustomerBlock({
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
export function mergeRepairFormFromCrmCustomerDetail(
  detail: CrmCustomerDetail,
  prev: RepairPackageFormData
): RepairPackageFormData {
  const { form } = formFromCrmCustomerDetail(detail);
  const objectAddress = (form.objectAddresses[0] ?? '').trim();

  return {
    ...prev,
    customer: repairCustomerBlockFromCrmDetail(detail),
    object: {
      ...prev.object,
      objectAddress,
    },
  };
}

/** Сбрасывает поля, заполняемые из карточки CRM (блок «Заказчик» и «Адрес объекта»). */
export function clearRepairFormCrmCustomerFields(
  prev: RepairPackageFormData
): RepairPackageFormData {
  const defaults = defaultRepairPackageFormData();
  return {
    ...prev,
    customer: defaults.customer,
    object: {
      ...prev.object,
      objectAddress: defaults.object.objectAddress,
    },
  };
}

/**
 * Подстановка данных пакета по договору CRM и строке поиска.
 * Блок «Заказчик» **полностью** берётся из `documentCustomer` строки поиска (если есть),
 * иначе — только поля из самого договора (ФИО/адрес/телефон).
 */
export function mergeRepairFormFromCrmContract(
  c: Contract,
  prev: RepairPackageFormData,
  searchRow?: ContractCustomer | null
): RepairPackageFormData {
  const total = formatMoney(c.totalAmount);
  const advance = formatMoney(c.advanceAmount);
  const nextPrepayment = advance.trim() ? advance : prev.contract.prepaymentAmount;

  const doc = searchRow?.documentCustomer;
  const customer = doc ? documentCustomerToRepairCustomer(doc) : contractSnapshotCustomer(c);

  const objectAddress =
    (c.customerAddress ?? '').trim() || customer.address || prev.object.objectAddress;

  return {
    ...prev,
    customer,
    object: {
      ...prev.object,
      objectAddress,
    },
    contract: {
      ...prev.contract,
      number: c.contractNumber || prev.contract.number,
      date: isoOrCrmDateToContractDdMmYyyy(c.contractDate) || prev.contract.date,
      totalAmount: total || prev.contract.totalAmount,
      prepaymentAmount: nextPrepayment,
      prepaymentAmountWords: nextPrepayment.trim() ? amountToRussianWords(nextPrepayment) : '',
    },
  };
}

/** Заполняет блок «Заказчик» из ответа POST `/admin/customers` после создания карточки в CRM. */
export function mergeRepairFormFromCreatedCrmCustomer(
  created: unknown,
  prev: RepairPackageFormData
): RepairPackageFormData {
  if (!created || typeof created !== 'object') return prev;
  const id = (created as { id?: unknown }).id;
  if (typeof id !== 'string' || !id.trim()) return prev;
  return mergeRepairFormFromCrmCustomerDetail(created as CrmCustomerDetail, prev);
}
