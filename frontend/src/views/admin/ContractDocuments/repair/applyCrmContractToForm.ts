import type { Contract, ContractCustomer, DocumentCustomerBlock } from '@/shared/api/admin-crm';
import { parseObjectAddresses } from '@/views/admin/CRM/Customers/crmCustomerExtendedProfile';

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

/** Заполняет блок «Заказчик» из ответа POST `/admin/customers` после создания карточки в CRM (другие сценарии). */
export function mergeRepairFormFromCreatedCrmCustomer(
  created: unknown,
  prev: RepairPackageFormData
): RepairPackageFormData {
  if (!created || typeof created !== 'object') return prev;
  const r = created as Record<string, unknown>;
  const ext =
    r.extendedProfile && typeof r.extendedProfile === 'object' && !Array.isArray(r.extendedProfile)
      ? (r.extendedProfile as Record<string, unknown>)
      : {};

  const s = (v: unknown) => (typeof v === 'string' ? v : '');

  const entityRaw = s(r.entityType) || s(ext.type);
  const type: RepairCustomerBlock['type'] =
    entityRaw === 'COMPANY' || entityRaw === 'ENTREPRENEUR' || entityRaw === 'PERSON'
      ? entityRaw
      : 'PERSON';

  const rawPhones = Array.isArray(r.phones)
    ? r.phones.map((x) => (typeof x === 'string' ? x : ''))
    : [];
  const primaryFromRow = s(r.phone).trim();
  const phonesForBlock = rawPhones.some((p) => p.trim())
    ? rawPhones
    : primaryFromRow
      ? [primaryFromRow]
      : undefined;

  const firstName = s(r.firstName);
  const lastName = s(r.lastName);
  const composedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const fullNamePerson = s(ext.fullName).trim() || composedName;
  const orgName = s(ext.organizationName).trim() || s(r.company).trim();

  const customerPatch: Partial<RepairCustomerBlock> & { phones?: string[] } = {
    type,
    fullName:
      type === 'PERSON'
        ? fullNamePerson || prev.customer.fullName
        : s(ext.fullName).trim() || prev.customer.fullName,
    representativeFullNameNominative:
      s(ext.representativeFullNameNominative) || prev.customer.representativeFullNameNominative,
    representativeFullNameGenitive:
      s(ext.representativeFullNameGenitive) || prev.customer.representativeFullNameGenitive,
    organizationName: orgName || prev.customer.organizationName,
    representativePositionNominative:
      s(ext.representativePositionNominative) ||
      s(r.position) ||
      prev.customer.representativePositionNominative,
    representativePositionGenitive:
      s(ext.representativePositionGenitive) || prev.customer.representativePositionGenitive,
    inn: s(ext.inn) || prev.customer.inn,
    ogrn: s(ext.ogrn) || prev.customer.ogrn,
    address: s(ext.address) || prev.customer.address,
    email: s(r.email) || s(ext.email) || prev.customer.email,
    bankDetails: s(ext.bankDetails) || prev.customer.bankDetails,
    passportSeriesNumber: s(ext.passportSeriesNumber) || prev.customer.passportSeriesNumber,
    passportIssuedBy: s(ext.passportIssuedBy) || prev.customer.passportIssuedBy,
    passportIssueDate: s(ext.passportIssueDate) || prev.customer.passportIssueDate,
  };
  if (phonesForBlock) {
    customerPatch.phones = phonesForBlock;
    customerPatch.phone = primaryFromRow || phonesForBlock.find((p) => p.trim()) || '';
  } else if (primaryFromRow) {
    customerPatch.phone = primaryFromRow;
  }

  const objectAddresses = parseObjectAddresses(ext);
  const firstObjectAddress = objectAddresses[0] ?? '';

  return {
    ...prev,
    customer: normalizeRepairCustomerBlock({
      ...prev.customer,
      ...customerPatch,
    }),
    object: {
      ...prev.object,
      objectAddress: firstObjectAddress || prev.object.objectAddress,
    },
  };
}
