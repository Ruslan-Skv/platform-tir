import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from './amountToRussianWords';
import { todayContractDateDdMmYyyy } from './contractDateFormat';

/** ЮЛ — ОГРН и КПП; ИП — ОГРНИП (КПП в форме обычно пустой). */
export type RepairExecutorKind = 'COMPANY' | 'ENTREPRENEUR';

/** Структура вкладки «Данные» для направления «Ремонт» (расширяйте по мере переноса полей из Excel). */
export interface RepairCustomerBlock {
  type: 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';
  fullName: string;
  representativeFullNameNominative: string;
  representativeFullNameGenitive: string;
  organizationName: string;
  representativePositionNominative: string;
  representativePositionGenitive: string;
  inn: string;
  ogrn: string;
  address: string;
  phone: string;
  email: string;
  bankDetails: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
}

export interface RepairExecutorBlock {
  selectedProfileTitle: string;
  executorKind: RepairExecutorKind;
  companyName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  ogrnip: string;
  legalAddress: string;
  actualAddress: string;
  bankDetails: string;
  email: string;
  /** Карточка из справочника «Подписанты». */
  selectedSignatoryProfileTitle: string;
  /** Id пользователя CRM из карточки подписанта (для связи с «Менеджерами»). */
  signatoryCrmUserId: string;
  directorNameNominative: string;
  directorNameGenitive: string;
  directorName: string;
  basis: string;
  salesOffice: string;
  officePhone: string;
}

export interface RepairObjectBlock {
  objectAddress: string;
  objectFloor: string;
  objectDescription: string;
}

export interface RepairContractBlock {
  number: string;
  date: string;
  totalAmount: string;
  recommendedPrepayment: string;
  totalAmountWords: string;
  prepaymentAmount: string;
  /** Та же сумма, что «Аванс / предоплата», прописью (для ПКО и т.п.). */
  prepaymentAmountWords: string;
  /** Основание платежа / перечисления (текст для подстановки в документы). */
  paymentBasis: string;
  /** Срок договора в календарных днях (число строкой, напр. «60»); в шаблоне `{{contract.workPeriod}}`. */
  workPeriod: string;
}

export interface RepairEstimateBlock {
  /** ID сохранённого серверного расчёта из раздела «Расчёты». */
  selectedPresetId: string;
  /** IDs прикреплённых расчётов (для объединения нескольких смет в один договор). */
  selectedPresetIds: string[];
  /** Снимок расчёта для договора: сумма и строки по помещениям. */
  snapshot: {
    total: number;
    rooms: Array<{
      name: string;
      total: number;
      lines: Array<{
        name: string;
        unit: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
    }>;
  } | null;
  /** Свободный текст комментария к выбранному расчёту. */
  notes: string;
}

export interface RepairPackageFormData {
  customer: RepairCustomerBlock;
  executor: RepairExecutorBlock;
  object: RepairObjectBlock;
  contract: RepairContractBlock;
  estimate: RepairEstimateBlock;
}

export function defaultRepairPackageFormData(): RepairPackageFormData {
  return {
    customer: {
      type: 'PERSON',
      fullName: '',
      representativeFullNameNominative: '',
      representativeFullNameGenitive: '',
      organizationName: '',
      representativePositionNominative: '',
      representativePositionGenitive: '',
      inn: '',
      ogrn: '',
      address: '',
      phone: '',
      email: '',
      bankDetails: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssueDate: '',
    },
    executor: {
      selectedProfileTitle: '',
      executorKind: 'COMPANY',
      companyName: '',
      inn: '',
      kpp: '',
      ogrn: '',
      ogrnip: '',
      legalAddress: '',
      actualAddress: '',
      bankDetails: '',
      email: '',
      selectedSignatoryProfileTitle: '',
      signatoryCrmUserId: '',
      directorNameNominative: '',
      directorNameGenitive: '',
      directorName: '',
      basis: '',
      salesOffice: '',
      officePhone: '',
    },
    object: {
      objectAddress: '',
      objectFloor: '',
      objectDescription: '',
    },
    contract: {
      number: '',
      date: '',
      totalAmount: '',
      recommendedPrepayment: '',
      totalAmountWords: '',
      prepaymentAmount: '',
      prepaymentAmountWords: '',
      paymentBasis: '',
      workPeriod: '',
    },
    estimate: {
      selectedPresetId: '',
      selectedPresetIds: [],
      snapshot: null,
      notes: '',
    },
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = mergeDeep(bv as Record<string, unknown>, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  }
  return out as T;
}

export function mergeRepairPackageFormData(raw: unknown): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  if (!isPlainObject(raw)) return base;
  return mergeDeep(
    base as unknown as Record<string, unknown>,
    raw
  ) as unknown as RepairPackageFormData;
}

function pickStr(formVal: string, fallbackVal: string): string {
  return formVal.trim() !== '' ? formVal : fallbackVal;
}

/**
 * Те же примерные данные, что в превью библиотеки шаблонов (плюс реквизиты из карточек).
 * Используется, чтобы пустые поля пакета не давали «пустой» договор при тех же {{…}} в HTML.
 */
export function buildRepairTemplatePreviewFallbackData(
  executorProfile: ExecutorRequisiteProfile | null | undefined,
  signatoryProfile: ContractSignatoryProfile | null | undefined
): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  const executorKind = executorProfile?.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  const directorName =
    signatoryProfile?.directorNameNominative ||
    signatoryProfile?.directorNameGenitive ||
    'Петров Петр Петрович';

  return {
    ...base,
    customer: {
      ...base.customer,
      fullName: 'Иванов Иван Иванович',
      address: 'г. Краснодар, ул. Примерная, д. 1',
      phone: '+7 900 000-00-00',
    },
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
  };
}

/** Непустые значения из `form` сохраняются; пустые строки берутся из `fallback` (превью библиотеки). */
export function mergeRepairPackageFormWithPreviewFallback(
  form: RepairPackageFormData,
  fallback: RepairPackageFormData
): RepairPackageFormData {
  return {
    customer: {
      ...form.customer,
      type: form.customer.type,
      fullName: pickStr(form.customer.fullName, fallback.customer.fullName),
      representativeFullNameNominative: pickStr(
        form.customer.representativeFullNameNominative,
        fallback.customer.representativeFullNameNominative
      ),
      representativeFullNameGenitive: pickStr(
        form.customer.representativeFullNameGenitive,
        fallback.customer.representativeFullNameGenitive
      ),
      organizationName: pickStr(form.customer.organizationName, fallback.customer.organizationName),
      representativePositionNominative: pickStr(
        form.customer.representativePositionNominative,
        fallback.customer.representativePositionNominative
      ),
      representativePositionGenitive: pickStr(
        form.customer.representativePositionGenitive,
        fallback.customer.representativePositionGenitive
      ),
      inn: pickStr(form.customer.inn, fallback.customer.inn),
      ogrn: pickStr(form.customer.ogrn, fallback.customer.ogrn),
      address: pickStr(form.customer.address, fallback.customer.address),
      phone: pickStr(form.customer.phone, fallback.customer.phone),
      email: pickStr(form.customer.email, fallback.customer.email),
      bankDetails: pickStr(form.customer.bankDetails, fallback.customer.bankDetails),
      passportSeriesNumber: pickStr(
        form.customer.passportSeriesNumber,
        fallback.customer.passportSeriesNumber
      ),
      passportIssuedBy: pickStr(form.customer.passportIssuedBy, fallback.customer.passportIssuedBy),
      passportIssueDate: pickStr(
        form.customer.passportIssueDate,
        fallback.customer.passportIssueDate
      ),
    },
    executor: {
      ...form.executor,
      executorKind: form.executor.executorKind,
      selectedProfileTitle: pickStr(
        form.executor.selectedProfileTitle,
        fallback.executor.selectedProfileTitle
      ),
      companyName: pickStr(form.executor.companyName, fallback.executor.companyName),
      inn: pickStr(form.executor.inn, fallback.executor.inn),
      kpp: pickStr(form.executor.kpp, fallback.executor.kpp),
      ogrn: pickStr(form.executor.ogrn, fallback.executor.ogrn),
      ogrnip: pickStr(form.executor.ogrnip, fallback.executor.ogrnip),
      legalAddress: pickStr(form.executor.legalAddress, fallback.executor.legalAddress),
      actualAddress: pickStr(form.executor.actualAddress, fallback.executor.actualAddress),
      bankDetails: pickStr(form.executor.bankDetails, fallback.executor.bankDetails),
      email: pickStr(form.executor.email, fallback.executor.email),
      selectedSignatoryProfileTitle: pickStr(
        form.executor.selectedSignatoryProfileTitle,
        fallback.executor.selectedSignatoryProfileTitle
      ),
      signatoryCrmUserId: pickStr(
        form.executor.signatoryCrmUserId,
        fallback.executor.signatoryCrmUserId
      ),
      directorNameNominative: pickStr(
        form.executor.directorNameNominative,
        fallback.executor.directorNameNominative
      ),
      directorNameGenitive: pickStr(
        form.executor.directorNameGenitive,
        fallback.executor.directorNameGenitive
      ),
      directorName: pickStr(form.executor.directorName, fallback.executor.directorName),
      basis: pickStr(form.executor.basis, fallback.executor.basis),
      salesOffice: pickStr(form.executor.salesOffice, fallback.executor.salesOffice),
      officePhone: pickStr(form.executor.officePhone, fallback.executor.officePhone),
    },
    object: {
      objectAddress: pickStr(form.object.objectAddress, fallback.object.objectAddress),
      objectFloor: pickStr(form.object.objectFloor, fallback.object.objectFloor),
      objectDescription: pickStr(form.object.objectDescription, fallback.object.objectDescription),
    },
    contract: {
      number: pickStr(form.contract.number, fallback.contract.number),
      date: pickStr(form.contract.date, fallback.contract.date),
      totalAmount: pickStr(form.contract.totalAmount, fallback.contract.totalAmount),
      recommendedPrepayment: pickStr(
        form.contract.recommendedPrepayment,
        fallback.contract.recommendedPrepayment
      ),
      totalAmountWords: pickStr(form.contract.totalAmountWords, fallback.contract.totalAmountWords),
      prepaymentAmount: pickStr(form.contract.prepaymentAmount, fallback.contract.prepaymentAmount),
      prepaymentAmountWords: pickStr(
        form.contract.prepaymentAmountWords,
        fallback.contract.prepaymentAmountWords
      ),
      paymentBasis: pickStr(form.contract.paymentBasis, fallback.contract.paymentBasis),
      workPeriod: pickStr(form.contract.workPeriod, fallback.contract.workPeriod),
    },
    estimate: {
      ...form.estimate,
      notes: pickStr(form.estimate.notes, fallback.estimate.notes),
    },
  };
}

/** Данные для подстановки в HTML: добавляет вычисляемое поле `executor.innKppRegLine`. */
export function repairPackageFormForTemplate(form: RepairPackageFormData): RepairPackageFormData & {
  executor: RepairExecutorBlock & { innKppRegLine: string };
  estimate: RepairEstimateBlock & {
    total: string;
    rooms: string;
    roomsHtml: string;
    roomsCount: string;
    linesCount: string;
  };
} {
  const { executor } = form;
  const { estimate } = form;
  const isIp = executor.executorKind === 'ENTREPRENEUR';
  const innKppRegLine = isIp
    ? [
        executor.inn ? `ИНН ${executor.inn}` : '',
        executor.ogrnip ? `ОГРНИП ${executor.ogrnip}` : '',
      ]
        .filter(Boolean)
        .join(', ')
    : [
        executor.inn ? `ИНН ${executor.inn}` : '',
        executor.kpp ? `КПП ${executor.kpp}` : '',
        executor.ogrn ? `ОГРН ${executor.ogrn}` : '',
      ]
        .filter(Boolean)
        .join(', ');

  const snapshot = estimate.snapshot;
  const totalValue = snapshot?.total ?? 0;
  const total = totalValue > 0 ? totalValue.toFixed(2).replace('.', ',') : '';
  const roomsCount = String(snapshot?.rooms.length ?? 0);
  const linesCount = String(snapshot?.rooms.reduce((sum, room) => sum + room.lines.length, 0) ?? 0);
  const rooms = snapshot
    ? snapshot.rooms
        .map((room, roomIndex) => {
          const roomHeader = `${roomIndex + 1}. ${room.name} — ${room.total
            .toFixed(2)
            .replace('.', ',')}`;
          const roomLines = room.lines.map(
            (line) =>
              `- ${line.name}: ${line.quantity} ${line.unit} × ${line.price
                .toFixed(2)
                .replace('.', ',')} = ${line.amount.toFixed(2).replace('.', ',')}`
          );
          return [roomHeader, ...roomLines].join('\n');
        })
        .join('\n\n')
    : '';

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const roomsHtml = snapshot
    ? `<table style="width:100%;border-collapse:collapse;margin:8pt 0;page-break-inside:auto;break-inside:auto;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Помещение / позиция</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Кол-во</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Цена</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Сумма</th>
    </tr>
  </thead>
  <tbody>
    ${snapshot.rooms
      .map((room) => {
        const roomHeader = `<tr>
      <td colspan="4" style="border:1px solid #cbd5e1; padding:6px; font-weight:700; background:#f8fafc;">${escapeHtml(
        room.name
      )} — ${room.total.toFixed(2).replace('.', ',')}</td>
    </tr>`;
        const roomLines = room.lines
          .map(
            (line) => `<tr>
      <td style="border:1px solid #cbd5e1; padding:6px;">${escapeHtml(line.name)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.quantity} ${escapeHtml(line.unit)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.price.toFixed(2).replace('.', ',')}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.amount.toFixed(2).replace('.', ',')}</td>
    </tr>`
          )
          .join('');
        return `${roomHeader}${roomLines}`;
      })
      .join('')}
    <tr>
      <td colspan="3" style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">Итого</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">${snapshot.total
        .toFixed(2)
        .replace('.', ',')}</td>
    </tr>
  </tbody>
</table>`
    : '';

  const prepaymentRaw = form.contract.prepaymentAmount.trim();
  const prepaymentAmountWords = prepaymentRaw
    ? amountToRussianWords(form.contract.prepaymentAmount)
    : '';

  return {
    ...form,
    meta: {
      /** Текущая календарная дата в формате дд.мм.гггг (момент предпросмотра/печати). Шаблон: `{{meta.currentDate}}`. */
      currentDate: todayContractDateDdMmYyyy(),
    },
    contract: {
      ...form.contract,
      prepaymentAmountWords,
    },
    executor: {
      ...executor,
      innKppRegLine,
    },
    estimate: {
      ...estimate,
      total,
      rooms,
      roomsHtml,
      roomsCount,
      linesCount,
    },
  };
}
