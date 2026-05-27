import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from './amountToRussianWords';
import { todayContractDateDdMmYyyy } from './contractDateFormat';
import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';
import {
  enrichRepairCustomerForTemplate,
  repairCustomerTemplateContextFromTab,
} from './repairCustomerTemplateFields';
import {
  type EstimateEmbedSection,
  buildEstimateDiscountTotalsBlockHtml,
  buildEstimateDocPrintEmbedHtml,
  buildEstimateDocPrintFooterHtml,
  buildEstimateSectionsFromPresetIds,
} from './repairEstimateDocPrintEmbedHtml';
import { computeRepairPackagePayableBreakdown } from './repairPackagePaymentTotals';

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
  /** Основной телефон (первый непустой из `phones`); для шаблонов `{{customer.phone}}`. */
  phone: string;
  /** Номера по порядку; пустая последняя строка допускается при вводе следующего номера. */
  phones: string[];
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
  /** Карточка из справочника «Менеджеры». */
  selectedSignatoryProfileTitle: string;
  /** Id пользователя CRM в пакете договора (если был задан ранее); в справочнике карточек не хранится. */
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
  /** Дата последней/текущей оплаты для ПКО (дд.мм.гггг). */
  prepaymentDate: string;
  /** Способ оплаты текстом (для ПКО). */
  paymentFormLabel: string;
  /** Срок договора в календарных днях (число строкой, напр. «60»); в шаблоне `{{contract.workPeriod}}`. */
  workPeriod: string;
  /** Скидка на стоимость по договору, % (применяется к смете, Д/с, заказ-нарядам и сводке оплат). */
  discountPercent: string;
}

/** Анкета на вкладке «Анкета 1»: заполняет менеджер по телефонному разговору с клиентом. */
export interface RepairManagerQuestionnaire1Block {
  /** Уточнения к контактам / объекту со слов клиента (основные поля — вкладка «Данные»). */
  contactNotesFromCall: string;
  /** Что нужно сделать (объём, задачи). */
  orderInfo: string;
  /** Отмеченные источники трафика — id из `MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS`. */
  trafficSourceCheckedIds: string[];
  /** К «Рекомендация друзей/знакомых»: кто именно порекомендовал. */
  trafficSourceRecommendationWho: string;
  /** К «Уже обращался ранее»: № предыдущего договора. */
  trafficSourcePreviousContractNumber: string;
  /** К «Другое»: пояснение. */
  trafficSourceOtherText: string;
  /** Пожелания по мастеру и контролю качества. */
  masterAndQualityPreferences: string;
  /** Отмеченные причины выбора — id из `MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS`. */
  whyChosenCheckedIds: string[];
  /** К «Посоветовали знакомые / родственники»: чьи. */
  whyChosenRelativesWho: string;
  /** К «Мастер уже работал у нас»: № договора / адрес. */
  whyChosenMasterContractOrAddress: string;
  /** К «Посоветовал менеджер»: ФИО менеджера. */
  whyChosenManagerAdvisedName: string;
  /** К «Отзыв о мастере»: какой сайт. */
  whyChosenReviewSite: string;
  /** К «Другая причина». */
  whyChosenOtherReason: string;
  /** Дополнительные услуги (кросс-продажи). */
  crossSellServices: string;
  /** Отмеченные пункты «что ещё может понадобиться» — id из списка в UI. */
  clientNeedsCheckedIds: string[];
  /** Пояснение к пункту «Другое». */
  clientNeedsOtherDetails: string;
}

/** Оценка 1–5 по анкете после работ; `null` — не выбрано. */
export type PostWorkSatisfactionRating = 1 | 2 | 3 | 4 | 5 | null;

export interface RepairPostWorkQuestionnaire2TradeRatings {
  electrical: PostWorkSatisfactionRating;
  tile: PostWorkSatisfactionRating;
  plumbing: PostWorkSatisfactionRating;
  painting: PostWorkSatisfactionRating;
  floors: PostWorkSatisfactionRating;
  stretchCeilings: PostWorkSatisfactionRating;
  windows: PostWorkSatisfactionRating;
  doors: PostWorkSatisfactionRating;
  generalConstruction: PostWorkSatisfactionRating;
}

export const POST_WORK_QUESTIONNAIRE2_TRADE_ROWS: ReadonlyArray<{
  key: keyof RepairPostWorkQuestionnaire2TradeRatings;
  label: string;
}> = [
  { key: 'electrical', label: 'Электрика' },
  { key: 'tile', label: 'Кафель' },
  { key: 'plumbing', label: 'Сантехника' },
  { key: 'painting', label: 'Малярные работы' },
  { key: 'floors', label: 'Полы' },
  { key: 'stretchCeilings', label: 'Натяжные потолки' },
  { key: 'windows', label: 'Окна' },
  { key: 'doors', label: 'Двери' },
  { key: 'generalConstruction', label: 'Общестроительные работы' },
];

/** Анкета 2 — оценки заказчика после выполнения работ по договору. */
export interface RepairPostWorkQuestionnaire2Block {
  ratingCompany: PostWorkSatisfactionRating;
  ratingManager: PostWorkSatisfactionRating;
  ratingForeman: PostWorkSatisfactionRating;
  ratingTrades: RepairPostWorkQuestionnaire2TradeRatings;
  wishes: string;
  /** Дата заполнения (дд.мм.гггг). */
  filledDate: string;
  /** Подпись / ФИО заказчика. */
  customerSignatory: string;
}

export function defaultRepairPostWorkQuestionnaire2TradeRatings(): RepairPostWorkQuestionnaire2TradeRatings {
  return {
    electrical: null,
    tile: null,
    plumbing: null,
    painting: null,
    floors: null,
    stretchCeilings: null,
    windows: null,
    doors: null,
    generalConstruction: null,
  };
}

export function defaultRepairPostWorkQuestionnaire2Block(): RepairPostWorkQuestionnaire2Block {
  return {
    ratingCompany: null,
    ratingManager: null,
    ratingForeman: null,
    ratingTrades: defaultRepairPostWorkQuestionnaire2TradeRatings(),
    wishes: '',
    filledDate: '',
    customerSignatory: '',
  };
}

export function defaultRepairManagerQuestionnaire1Block(): RepairManagerQuestionnaire1Block {
  return {
    contactNotesFromCall: '',
    orderInfo: '',
    trafficSourceCheckedIds: [],
    trafficSourceRecommendationWho: '',
    trafficSourcePreviousContractNumber: '',
    trafficSourceOtherText: '',
    masterAndQualityPreferences: '',
    whyChosenCheckedIds: [],
    whyChosenRelativesWho: '',
    whyChosenMasterContractOrAddress: '',
    whyChosenManagerAdvisedName: '',
    whyChosenReviewSite: '',
    whyChosenOtherReason: '',
    crossSellServices: '',
    clientNeedsCheckedIds: [],
    clientNeedsOtherDetails: '',
  };
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

export interface RepairWorkOrderBlock {
  /** Ставка налога в процентах, применяемая к каждой позиции сметы. */
  taxPercent: string;
  /** Наценка в процентах, вычитаемая из каждой позиции сметы. */
  markupPercent: string;
  /** Показывать ли стоимость по каждой строке работ. */
  showLineAmounts: boolean;
  /** Разряд для повышения стоимости после налогов/наценки: 0 / 5 / 10. */
  gradeIncreasePercent: 0 | 5 | 10;
}

export interface RepairInstallerAssignment {
  installerId: string;
}

/** Статус доп. соглашения: после «подписано/оплачено» расчёты к этому Д/с не меняются. */
export type RepairAddendumSlotStatus = 'OPEN' | 'SIGNED' | 'PAID';

/** Расчёты, прикреплённые к конкретному Д/с (№1…№5). */
export interface RepairAddendumSlotEstimateBlock {
  status: RepairAddendumSlotStatus;
  /** Время установки статуса SIGNED (ISO), нужно для окна отмены 24 часа. */
  signedAt: string;
  /** Время установки статуса PAID (ISO). */
  paidAt: string;
  /**
   * На сколько рабочих дней увеличивается срок договора при подписании этого Д/с.
   * Храним строкой (как и большинство полей формы) — менеджер может оставить пустым.
   */
  workPeriodIncreaseDays: string;
  selectedPresetIds: string[];
  snapshot: RepairEstimateBlock['snapshot'];
  excludedSelectedPresetIds: string[];
  excludedSnapshot: RepairEstimateBlock['snapshot'];
  notes: string;
  excludedNotes: string;
}

export type RepairAddendumSlotsTuple = [
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotEstimateBlock,
];

export interface RepairPackageFormData {
  customer: RepairCustomerBlock;
  executor: RepairExecutorBlock;
  object: RepairObjectBlock;
  contract: RepairContractBlock;
  estimate: RepairEstimateBlock;
  workOrder: RepairWorkOrderBlock;
  /** Мастера направления «Ремонт», прикрепленные к договору. */
  selectedRepairInstallerIds: string[];
  /**
   * Назначение мастера на строки из итоговой сметы.
   * Ключ: `${roomName}::${workName}::${unit}`.
   */
  finalEstimateInstallerAssignments: Record<string, RepairInstallerAssignment>;
  /**
   * Объект (группа расчётов) для сметы договора и всех Д/с: `''` — не выбран, `__ungrouped__` — вне объекта, иначе id группы.
   * При непустой смете фактически совпадает с объектом первого прикреплённого расчёта.
   */
  estimateObjectGroupKey: string;
  managerQuestionnaire1: RepairManagerQuestionnaire1Block;
  postWorkQuestionnaire2: RepairPostWorkQuestionnaire2Block;
  /** Сколько вкладок «Д/с №…» показывать в редакторе пакета (0–5). */
  addendumSlotCount: number;
  /**
   * Дата в шапке доп. соглашения (слева, под заголовком); индекс 0 = «Д/с №1», …, 4 = «Д/с №5».
   * Формат на усмотрение менеджера (часто дд.мм.гггг).
   */
  addendumDocumentDates: [string, string, string, string, string];
  /** По одному слоту на «Д/с №1»…«Д/с №5»: расчёты и статус подписания. */
  addendumSlots: RepairAddendumSlotsTuple;
  /** Время установки статуса «Договор подписан» (ISO), окно отмены — 24 часа. */
  contractConcludedAt: string;
  /** Текст причины отказа (при статусе пакета REFUSED). */
  contractRefusalReason: string;
  /** Время фиксации отказа (ISO). */
  contractRefusedAt: string;
  /** Время установки статуса «Договор оплачен» (ISO). */
  contractPaidAt: string;
  /**
   * Дата начала работ по подписанному акту начала работ (формат YYYY-MM-DD), вместе с фото акта —
   * для отображения этапа «В работе» в списке договоров.
   */
  repairWorkStartActSignedAt: string;
  /** URL фото акта начала работ (относительный путь после загрузки на сервер). */
  repairWorkStartActPhotoUrl: string;
  /**
   * Дата подписания акта сдачи-приёмки (YYYY-MM-DD) и фото акта — этап «Закрыт» в списке договоров.
   */
  repairContractCloseActSignedAt: string;
  /** URL фото акта сдачи-приёмки. */
  repairContractCloseActPhotoUrl: string;
  /**
   * Номер договора на момент создания копии пакета (из поля «Номер договора»).
   * Пока совпадает с `contract.number`, к отображаемому номеру добавляется слово «копия».
   */
  _repairCopyContractNumberBaseline?: string;
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
      phones: [''],
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
      prepaymentDate: '',
      paymentFormLabel: '',
      workPeriod: '',
      discountPercent: '',
    },
    estimate: {
      selectedPresetId: '',
      selectedPresetIds: [],
      snapshot: null,
      notes: '',
    },
    workOrder: {
      taxPercent: '',
      markupPercent: '',
      showLineAmounts: true,
      gradeIncreasePercent: 0,
    },
    selectedRepairInstallerIds: [],
    finalEstimateInstallerAssignments: {},
    estimateObjectGroupKey: '',
    managerQuestionnaire1: defaultRepairManagerQuestionnaire1Block(),
    postWorkQuestionnaire2: defaultRepairPostWorkQuestionnaire2Block(),
    addendumSlotCount: 0,
    addendumDocumentDates: ['', '', '', '', ''],
    addendumSlots: defaultAddendumSlots(),
    contractConcludedAt: '',
    contractRefusalReason: '',
    contractRefusedAt: '',
    contractPaidAt: '',
    repairWorkStartActSignedAt: '',
    repairWorkStartActPhotoUrl: '',
    repairContractCloseActSignedAt: '',
    repairContractCloseActPhotoUrl: '',
  };
}

function defaultAddendumSlot(): RepairAddendumSlotEstimateBlock {
  return {
    status: 'OPEN',
    signedAt: '',
    paidAt: '',
    workPeriodIncreaseDays: '',
    selectedPresetIds: [],
    snapshot: null,
    excludedSelectedPresetIds: [],
    excludedSnapshot: null,
    notes: '',
    excludedNotes: '',
  };
}

function defaultAddendumSlots(): RepairAddendumSlotsTuple {
  return [
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
  ];
}

/** Приводит телефоны заказчика к виду для формы и шаблонов: `phone` = первый непустой из `phones`. */
export function normalizeRepairCustomerBlock(
  raw: Partial<RepairCustomerBlock> | RepairCustomerBlock | undefined | null
): RepairCustomerBlock {
  const base = defaultRepairPackageFormData().customer;
  if (!raw || typeof raw !== 'object') return base;
  const o = { ...base, ...raw } as RepairCustomerBlock & { phones?: unknown };

  let slots: string[] = [];
  if (Array.isArray(o.phones) && o.phones.length > 0) {
    slots = o.phones.map((x) => (typeof x === 'string' ? x : ''));
  } else if ((o.phone ?? '').trim()) {
    slots = [String(o.phone)];
  } else {
    slots = [''];
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    const t = s.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      ordered.push(t);
    }
  }
  const hadTrailingBlank = slots.length > 0 && String(slots[slots.length - 1] ?? '').trim() === '';
  const phonesOut = ordered.length === 0 ? [''] : hadTrailingBlank ? [...ordered, ''] : ordered;
  const phoneOut = ordered[0] ?? '';

  return {
    ...o,
    phones: phonesOut,
    phone: phoneOut,
  };
}

function normalizeAddendumSlotStatus(raw: unknown): RepairAddendumSlotStatus {
  if (raw === 'PAID') return 'PAID';
  if (raw === 'SIGNED') return 'SIGNED';
  return 'OPEN';
}

function normalizeAddendumSlots(raw: unknown): RepairAddendumSlotsTuple {
  const base = defaultAddendumSlots();
  if (!Array.isArray(raw)) return base;
  const out = [...base] as RepairAddendumSlotEstimateBlock[];
  for (let i = 0; i < 5; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const ids = Array.isArray(o.selectedPresetIds)
      ? o.selectedPresetIds
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      : [];
    const excludedIds = Array.isArray(o.excludedSelectedPresetIds)
      ? o.excludedSelectedPresetIds
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      : [];
    let snapshot: RepairEstimateBlock['snapshot'] = null;
    if (o.snapshot && typeof o.snapshot === 'object' && !Array.isArray(o.snapshot)) {
      const s = o.snapshot as { total?: unknown; rooms?: unknown };
      if (typeof s.total === 'number' && Number.isFinite(s.total) && Array.isArray(s.rooms)) {
        snapshot = {
          total: s.total,
          rooms: s.rooms as NonNullable<RepairEstimateBlock['snapshot']>['rooms'],
        };
      }
    }
    let excludedSnapshot: RepairEstimateBlock['snapshot'] = null;
    if (
      o.excludedSnapshot &&
      typeof o.excludedSnapshot === 'object' &&
      !Array.isArray(o.excludedSnapshot)
    ) {
      const s = o.excludedSnapshot as { total?: unknown; rooms?: unknown };
      if (typeof s.total === 'number' && Number.isFinite(s.total) && Array.isArray(s.rooms)) {
        excludedSnapshot = {
          total: s.total,
          rooms: s.rooms as NonNullable<RepairEstimateBlock['snapshot']>['rooms'],
        };
      }
    }
    out[i] = {
      status: normalizeAddendumSlotStatus(o.status),
      signedAt: typeof o.signedAt === 'string' ? o.signedAt : '',
      paidAt: typeof o.paidAt === 'string' ? o.paidAt : '',
      workPeriodIncreaseDays:
        typeof o.workPeriodIncreaseDays === 'string' ? o.workPeriodIncreaseDays : '',
      selectedPresetIds: ids,
      snapshot,
      excludedSelectedPresetIds: excludedIds,
      excludedSnapshot,
      notes: typeof o.notes === 'string' ? o.notes : '',
      excludedNotes: typeof o.excludedNotes === 'string' ? o.excludedNotes : '',
    };
  }
  return out as RepairAddendumSlotsTuple;
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

function normalizeManagerQuestionnaire1AfterLoad(
  mq: RepairManagerQuestionnaire1Block & { trafficSource?: string; whyChosenUs?: string }
): RepairManagerQuestionnaire1Block {
  const { trafficSource: legacyTrafficRaw, whyChosenUs: legacyWhyRaw, ...restUnknown } = mq;
  const legacyTraffic = typeof legacyTrafficRaw === 'string' ? legacyTrafficRaw.trim() : '';
  const legacyWhy = typeof legacyWhyRaw === 'string' ? legacyWhyRaw.trim() : '';

  const merged: RepairManagerQuestionnaire1Block = {
    ...defaultRepairManagerQuestionnaire1Block(),
    ...restUnknown,
    trafficSourceCheckedIds: Array.isArray(mq.trafficSourceCheckedIds)
      ? [...mq.trafficSourceCheckedIds]
      : [],
    trafficSourceRecommendationWho: mq.trafficSourceRecommendationWho ?? '',
    trafficSourcePreviousContractNumber: mq.trafficSourcePreviousContractNumber ?? '',
    trafficSourceOtherText: mq.trafficSourceOtherText ?? '',
    whyChosenCheckedIds: Array.isArray(mq.whyChosenCheckedIds) ? [...mq.whyChosenCheckedIds] : [],
    whyChosenRelativesWho: mq.whyChosenRelativesWho ?? '',
    whyChosenMasterContractOrAddress: mq.whyChosenMasterContractOrAddress ?? '',
    whyChosenManagerAdvisedName: mq.whyChosenManagerAdvisedName ?? '',
    whyChosenReviewSite: mq.whyChosenReviewSite ?? '',
    whyChosenOtherReason: mq.whyChosenOtherReason ?? '',
  };

  const hasNewTraffic =
    merged.trafficSourceCheckedIds.length > 0 ||
    merged.trafficSourceRecommendationWho.trim() !== '' ||
    merged.trafficSourcePreviousContractNumber.trim() !== '' ||
    merged.trafficSourceOtherText.trim() !== '';

  const hasNewWhy =
    merged.whyChosenCheckedIds.length > 0 ||
    merged.whyChosenRelativesWho.trim() !== '' ||
    merged.whyChosenMasterContractOrAddress.trim() !== '' ||
    merged.whyChosenManagerAdvisedName.trim() !== '' ||
    merged.whyChosenReviewSite.trim() !== '' ||
    merged.whyChosenOtherReason.trim() !== '';

  let out = merged;
  if (legacyTraffic && !hasNewTraffic) {
    out = {
      ...out,
      trafficSourceCheckedIds: ['traffic_other'],
      trafficSourceOtherText: legacyTraffic,
    };
  }
  if (legacyWhy && !hasNewWhy) {
    out = {
      ...out,
      whyChosenCheckedIds: ['why_other'],
      whyChosenOtherReason: legacyWhy,
    };
  }
  return out;
}

const ADDENDUM_DATE_SLOT_COUNT = 5;

function normalizeAddendumDocumentDates(raw: unknown): [string, string, string, string, string] {
  const empty: [string, string, string, string, string] = ['', '', '', '', ''];
  if (!Array.isArray(raw)) return empty;
  const out: string[] = [...empty];
  for (let i = 0; i < ADDENDUM_DATE_SLOT_COUNT; i++) {
    const v = raw[i];
    out[i] = typeof v === 'string' ? v : '';
  }
  return out as [string, string, string, string, string];
}

/** Сколько вкладок Д/с №1…№5 показано в редакторе пакета (0…5). */
export function clampRepairAddendumSlotCount(raw: unknown): number {
  const x =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(String(raw).trim(), 10)
        : NaN;
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 5) return 5;
  return Math.trunc(x);
}

function normalizeAddendumSlotCount(raw: unknown): number {
  return clampRepairAddendumSlotCount(raw);
}

function isRepairAddendumSlotUnused(
  slot: RepairAddendumSlotEstimateBlock | undefined,
  documentDate: string | undefined
): boolean {
  if ((documentDate ?? '').trim() !== '') return false;
  if (!slot) return true;
  if ((slot.workPeriodIncreaseDays ?? '').trim() !== '') return false;
  const hasSelected = (slot.selectedPresetIds?.length ?? 0) > 0;
  const hasExcluded = (slot.excludedSelectedPresetIds?.length ?? 0) > 0;
  const snapshotTotal = slot.snapshot?.total;
  const hasSnapshotTotal = typeof snapshotTotal === 'number' && Number.isFinite(snapshotTotal);
  const hasSnapshot = Boolean(slot.snapshot?.rooms?.length) || hasSnapshotTotal;
  const excludedTotal = slot.excludedSnapshot?.total;
  const hasExcludedSnapshotTotal =
    typeof excludedTotal === 'number' && Number.isFinite(excludedTotal);
  const hasExcludedSnapshot =
    Boolean(slot.excludedSnapshot?.rooms?.length) || hasExcludedSnapshotTotal;
  const hasNotes = (slot.notes ?? '').trim() !== '' || (slot.excludedNotes ?? '').trim() !== '';
  const isSigned =
    slot.status === 'SIGNED' || slot.status === 'PAID' || (slot.signedAt ?? '').trim() !== '';
  const isPaid = (slot.paidAt ?? '').trim() !== '';
  return !(
    hasSelected ||
    hasExcluded ||
    hasSnapshot ||
    hasExcludedSnapshot ||
    hasNotes ||
    isSigned ||
    isPaid
  );
}

/** После загрузки: не показывать пустой хвост; не скрывать слот с данными. */
function resolveRepairAddendumSlotCountAfterLoad(
  storedCount: unknown,
  slots: RepairAddendumSlotsTuple,
  dates: [string, string, string, string, string]
): number {
  let count = clampRepairAddendumSlotCount(storedCount);

  let minFromData = 0;
  for (let i = 4; i >= 0; i--) {
    if (!isRepairAddendumSlotUnused(slots[i], dates[i])) {
      minFromData = i + 1;
      break;
    }
  }
  if (minFromData > count) count = minFromData;

  return count;
}

function normalizePostWorkQuestionnaire2AfterLoad(
  q: RepairPostWorkQuestionnaire2Block | undefined | null
): RepairPostWorkQuestionnaire2Block {
  const base = defaultRepairPostWorkQuestionnaire2Block();
  if (!q || typeof q !== 'object') return base;
  const rt = q.ratingTrades && typeof q.ratingTrades === 'object' ? q.ratingTrades : {};
  return {
    ...base,
    ...q,
    ratingTrades: {
      ...base.ratingTrades,
      ...rt,
    },
  };
}

export function mergeRepairPackageFormData(raw: unknown): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  if (!isPlainObject(raw)) return base;
  const merged = mergeDeep(
    base as unknown as Record<string, unknown>,
    raw
  ) as unknown as RepairPackageFormData;
  const mergedCustomer = normalizeRepairCustomerBlock(merged.customer);
  const addendumDocumentDates = normalizeAddendumDocumentDates(
    (merged as unknown as Record<string, unknown>).addendumDocumentDates
  );
  const addendumSlots = normalizeAddendumSlots(
    (merged as unknown as Record<string, unknown>).addendumSlots
  );
  const addendumSlotCount = resolveRepairAddendumSlotCountAfterLoad(
    (merged as unknown as Record<string, unknown>).addendumSlotCount,
    addendumSlots,
    addendumDocumentDates
  );
  return {
    ...merged,
    customer: mergedCustomer,
    selectedRepairInstallerIds: Array.isArray(
      (merged as unknown as Record<string, unknown>).selectedRepairInstallerIds
    )
      ? (
          (merged as unknown as Record<string, unknown>).selectedRepairInstallerIds as unknown[]
        ).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [],
    finalEstimateInstallerAssignments: isPlainObject(
      (merged as unknown as Record<string, unknown>).finalEstimateInstallerAssignments
    )
      ? Object.fromEntries(
          Object.entries(
            (merged as unknown as Record<string, unknown>)
              .finalEstimateInstallerAssignments as Record<string, unknown>
          )
            .map(([key, value]) => [
              key.trim(),
              isPlainObject(value) ? String(value.installerId ?? '').trim() : '',
            ])
            .filter(([key, installerId]) => key.length > 0 && installerId.length > 0)
            .map(([key, installerId]) => [key, { installerId }])
        )
      : {},
    managerQuestionnaire1: normalizeManagerQuestionnaire1AfterLoad(
      merged.managerQuestionnaire1 as RepairManagerQuestionnaire1Block & {
        trafficSource?: string;
        whyChosenUs?: string;
      }
    ),
    postWorkQuestionnaire2: normalizePostWorkQuestionnaire2AfterLoad(merged.postWorkQuestionnaire2),
    addendumSlotCount,
    addendumDocumentDates,
    addendumSlots,
    contractPaidAt:
      typeof (merged as unknown as Record<string, unknown>).contractPaidAt === 'string'
        ? String((merged as unknown as Record<string, unknown>).contractPaidAt)
        : '',
    repairWorkStartActSignedAt:
      typeof (merged as unknown as Record<string, unknown>).repairWorkStartActSignedAt === 'string'
        ? String((merged as unknown as Record<string, unknown>).repairWorkStartActSignedAt)
        : '',
    repairWorkStartActPhotoUrl:
      typeof (merged as unknown as Record<string, unknown>).repairWorkStartActPhotoUrl === 'string'
        ? String((merged as unknown as Record<string, unknown>).repairWorkStartActPhotoUrl)
        : '',
    repairContractCloseActSignedAt:
      typeof (merged as unknown as Record<string, unknown>).repairContractCloseActSignedAt ===
      'string'
        ? String((merged as unknown as Record<string, unknown>).repairContractCloseActSignedAt)
        : '',
    repairContractCloseActPhotoUrl:
      typeof (merged as unknown as Record<string, unknown>).repairContractCloseActPhotoUrl ===
      'string'
        ? String((merged as unknown as Record<string, unknown>).repairContractCloseActPhotoUrl)
        : '',
    estimateObjectGroupKey:
      typeof (merged as unknown as Record<string, unknown>).estimateObjectGroupKey === 'string'
        ? String((merged as unknown as Record<string, unknown>).estimateObjectGroupKey)
        : '',
  };
}

function pickStr(formVal: string, fallbackVal: string): string {
  return formVal.trim() !== '' ? formVal : fallbackVal;
}

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

/** Подвал после таблицы сметы: скидка и итог со скидкой (не трогает суммы по строкам). */
function buildEstimateRoomsDiscountSuffixHtml(
  grossTotal: number,
  contractDiscountPercentRaw?: string
): string {
  const p = parseRepairContractDiscountPercent(contractDiscountPercentRaw ?? '');
  if (p <= 0 || !Number.isFinite(grossTotal) || grossTotal <= 0) return '';
  const net = applyRepairContractDiscountToAmount(grossTotal, p);
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  return `<p class="estimateA4DiscountMeta" style="margin:8px 0 0;text-align:right;">Скидка по договору: ${String(p).replace('.', ',')}%</p>
<p class="estimateA4Total" style="margin:4px 0 0;text-align:right;">Итого со скидкой: <strong>${fmt(net)} руб.</strong></p>`;
}

/** HTML-таблица объединённой сметы по снимку (как на вкладке «Смета» / в шаблоне). Строки — без договорной скидки; при необходимости скидка только в подвале через `buildEstimateRoomsDiscountSuffixHtml`. */
export function buildEstimateRoomsHtmlFromSnapshot(
  snapshot: RepairEstimateBlock['snapshot'],
  contractDiscountPercentRaw?: string
): string {
  if (!snapshot?.rooms?.length) return '';
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  return `<table style="width:100%;border-collapse:collapse;margin:8pt 0;page-break-inside:auto;break-inside:auto;">
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
</table>${buildEstimateRoomsDiscountSuffixHtml(snapshot.total, contractDiscountPercentRaw)}`;
}

type WorkOrderRoomLine = {
  name: string;
  unit: string;
  quantity: number;
  originalPrice: number;
  originalAmount: number;
  adjustedPrice: number;
  adjustedAmount: number;
};

type WorkOrderRoom = {
  name: string;
  originalTotal: number;
  adjustedTotal: number;
  lines: WorkOrderRoomLine[];
};

function parsePercent(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function toPercentValue(value: string): string {
  const parsed = parsePercent(value);
  return parsed > 0 ? String(parsed).replace('.', ',') : '0';
}

function normalizeGradeIncreasePercent(v: unknown): 0 | 5 | 10 {
  return v === 5 || v === 10 ? v : 0;
}

/** Заказ-наряд: здесь и только здесь скидка доводится до суммы/цены каждой позиции (затем налог, наценка, разряд). */
function buildWorkOrderComputed(
  snapshot: RepairEstimateBlock['snapshot'],
  taxRaw: string,
  markupRaw: string,
  gradeIncreasePercentRaw: unknown,
  contractDiscountPercentRaw: string
) {
  const taxPercent = parsePercent(taxRaw);
  const markupPercent = parsePercent(markupRaw);
  const gradeIncreasePercent = normalizeGradeIncreasePercent(gradeIncreasePercentRaw);
  const gradeFactor = 1 + gradeIncreasePercent / 100;
  const contractDiscountPercent = parseRepairContractDiscountPercent(contractDiscountPercentRaw);
  const rooms: WorkOrderRoom[] = (snapshot?.rooms ?? []).map((room) => {
    const lines = room.lines.map((line) => {
      const afterDiscount = applyRepairContractDiscountToAmount(
        line.amount,
        contractDiscountPercent
      );
      const afterDiscountPrice = applyRepairContractDiscountToAmount(
        line.price,
        contractDiscountPercent
      );
      return {
        name: line.name,
        unit: line.unit,
        quantity: line.quantity,
        originalPrice: line.price,
        originalAmount: line.amount,
        /**
         * ВАЖНО: расчёт последовательный:
         * 0) скидка по договору от исходной суммы/цены
         * 1) сначала вычитаем налог из суммы после скидки
         * 2) затем вычитаем наценку из остатка
         * 3) после этого применяем надбавку разряда (5% или 10%)
         */
        adjustedPrice:
          afterDiscountPrice * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor,
        adjustedAmount:
          afterDiscount * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor,
      };
    });
    const adjustedTotal = lines.reduce((sum, line) => sum + line.adjustedAmount, 0);
    const originalTotal = lines.reduce((sum, line) => sum + line.originalAmount, 0);
    return {
      name: room.name,
      originalTotal,
      adjustedTotal,
      lines,
    };
  });
  const originalTotal = rooms.reduce((sum, room) => sum + room.originalTotal, 0);
  const adjustedTotal = rooms.reduce((sum, room) => sum + room.adjustedTotal, 0);
  const afterDiscountTotal = applyRepairContractDiscountToAmount(
    originalTotal,
    contractDiscountPercent
  );
  const taxAmount = afterDiscountTotal * (taxPercent / 100);
  const afterTax = afterDiscountTotal - taxAmount;
  const markupAmount = afterTax * (markupPercent / 100);
  const reductionAmount = taxAmount + markupAmount;
  return {
    taxPercent,
    markupPercent,
    gradeIncreasePercent,
    rooms,
    originalTotal,
    adjustedTotal,
    taxAmount,
    markupAmount,
    reductionAmount,
  };
}

function buildWorkOrderRoomsHtmlFromSnapshot(
  snapshot: RepairEstimateBlock['snapshot'],
  taxRaw: string,
  markupRaw: string,
  gradeIncreasePercentRaw: unknown,
  contractDiscountPercentRaw: string,
  sections?: EstimateEmbedSection[],
  showLineAmounts = true
): string {
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const computed = buildWorkOrderComputed(
    snapshot,
    taxRaw,
    markupRaw,
    gradeIncreasePercentRaw,
    contractDiscountPercentRaw
  );
  if (computed.rooms.length === 0) return '';
  const sectionRooms =
    sections && sections.length > 0
      ? sections
          .map((section) => ({
            categoryName: section.categoryName,
            rooms: section.rooms.map((room) => room.name),
          }))
          .filter((section) => section.rooms.length > 0)
      : [];

  let roomCursor = 0;
  const groupedRooms =
    sectionRooms.length > 0
      ? sectionRooms.map((section) => {
          const rows = computed.rooms.slice(roomCursor, roomCursor + section.rooms.length);
          roomCursor += section.rooms.length;
          return {
            categoryName: section.categoryName,
            rooms: rows,
          };
        })
      : [{ categoryName: '—', rooms: computed.rooms }];
  return `<table style="width:100%;border-collapse:collapse;margin:4pt 0;page-break-inside:auto;break-inside:auto;font-size:10px;line-height:1.2;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:center;">№</th>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:left;">Вид работ</th>
      <th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">Кол-во</th>
      ${
        showLineAmounts
          ? '<th style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">Стоимость</th>'
          : ''
      }
    </tr>
  </thead>
  <tbody>
    ${groupedRooms
      .map((section) => {
        const sectionHeader = `<tr>
      <td class="workOrderCategoryRow" colspan="${showLineAmounts ? 4 : 3}" style="border:1px solid #cbd5e1; padding:3px 4px; font-weight:700;">Категория работ: ${escapeHtml(
        section.categoryName
      )}</td>
    </tr>`;
        const sectionRoomsHtml = section.rooms
          .map((room) => {
            const roomHeader = `<tr>
      <td class="workOrderRoomRow" colspan="${showLineAmounts ? 4 : 3}" style="border:1px solid #cbd5e1; padding:3px 4px; font-weight:700;">
        ${escapeHtml(room.name)}
        <span style="float:right;">${formatMoney(room.adjustedTotal)} руб.</span>
      </td>
    </tr>`;
            const roomLines = room.lines
              .map(
                (line, index) => `<tr>
      <td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:center;">${index + 1}</td>
      <td style="border:1px solid #cbd5e1; padding:3px 4px;">${escapeHtml(line.name)}</td>
      <td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">${line.quantity} ${escapeHtml(line.unit)}</td>
      ${
        showLineAmounts
          ? `<td style="border:1px solid #cbd5e1; padding:3px 4px; text-align:right;">${formatMoney(line.adjustedAmount)}</td>`
          : ''
      }
    </tr>`
              )
              .join('');
            return `${roomHeader}${roomLines}`;
          })
          .join('');
        return `${sectionHeader}${sectionRoomsHtml}`;
      })
      .join('')}
  </tbody>
</table>`;
}

function buildWorkOrderCategoryTotalsHtml(options: {
  sections: EstimateEmbedSection[];
  roomTotals: number[];
}): string {
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const { sections, roomTotals } = options;
  if (sections.length === 0) return '';
  let cursor = 0;
  const rows = sections
    .map((section) => {
      const count = section.rooms.length;
      const total = roomTotals.slice(cursor, cursor + count).reduce((sum, x) => sum + x, 0);
      cursor += count;
      return `<li style="display:flex;justify-content:space-between;gap:8px;padding:1px 0;">
  <span>${escapeHtml(section.categoryName || '—')}</span>
  <strong>${formatMoney(total)} руб.</strong>
</li>`;
    })
    .join('');
  return `<section style="margin-top:6pt;">
  <h2 style="margin:0 0 3pt;">Итоги по категориям работ</h2>
  <ul style="list-style:none;margin:0;padding:0;">
    ${rows}
  </ul>
</section>`;
}

/** Данные для подстановки в HTML: добавляет вычисляемое поле `executor.innKppRegLine`. */
export function repairPackageFormForTemplate(
  form: RepairPackageFormData,
  options?: {
    templateTab?: string;
    estimatePresets?: ContractEstimatePreset[];
    estimateGroups?: ContractEstimateGroup[];
  }
): RepairPackageFormData & {
  meta: { currentDate: string };
  contract: RepairContractBlock & {
    grandTotalAmount: string;
    grandTotalAmountWords: string;
  };
  executor: RepairExecutorBlock & { innKppRegLine: string };
  estimate: RepairEstimateBlock & {
    total: string;
    rooms: string;
    roomsHtml: string;
    roomsCount: string;
    linesCount: string;
  };
  workOrder: RepairWorkOrderBlock & {
    showLineAmounts: boolean;
    roomsHtml: string;
    categoryTotalsHtml: string;
    totalBeforeDeductions: string;
    taxPercentNormalized: string;
    markupPercentNormalized: string;
    taxAmount: string;
    markupAmount: string;
    totalReduction: string;
    totalAfterDeductions: string;
    roomsCount: string;
    linesCount: string;
  };
  workOrderAddendum?: {
    slotNumber: string;
    roomsHtml: string;
    categoryTotalsHtml: string;
    totalAfterDeductions: string;
  };
  addendum?: {
    headerMain: string;
    headerSub: string;
    /** Склейка для старых шаблонов с одним плейсхолдером. */
    headerTitle: string;
    documentDate: string;
    roomsHtml: string;
    workPeriodIncreaseSentence: string;
  };
} {
  const estimateGroupsForTpl = options?.estimateGroups ?? [];
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

  const roomsHtml = buildEstimateRoomsHtmlFromSnapshot(snapshot, form.contract.discountPercent);

  const prepaymentRaw = form.contract.prepaymentAmount.trim();
  const prepaymentAmountWords = prepaymentRaw
    ? amountToRussianWords(form.contract.prepaymentAmount)
    : '';

  const { grandTotalRub } = computeRepairPackagePayableBreakdown(form);
  const grandTotalAmount =
    grandTotalRub != null && Number.isFinite(grandTotalRub) ? formatMoney(grandTotalRub) : '';
  const grandTotalAmountWords = grandTotalAmount ? amountToRussianWords(grandTotalAmount) : '';

  const addendumTabMatch =
    options?.templateTab && /^(?:addendum|workOrderAddendum)([1-5])$/.exec(options.templateTab);
  const addendumSlot = addendumTabMatch ? Number(addendumTabMatch[1]) : null;
  const addendumSlotSnap =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? (form.addendumSlots[addendumSlot - 1]?.snapshot ?? null)
      : null;
  const addendumSlotIdx =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5 ? addendumSlot - 1 : null;
  const addendumPresetIds =
    addendumSlotIdx !== null ? form.addendumSlots[addendumSlotIdx]?.selectedPresetIds : undefined;
  const addendumSections = buildEstimateSectionsFromPresetIds(
    addendumPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const addendumExcludedPresetIds =
    addendumSlotIdx !== null
      ? form.addendumSlots[addendumSlotIdx]?.excludedSelectedPresetIds
      : undefined;
  const addendumExcludedSections = buildEstimateSectionsFromPresetIds(
    addendumExcludedPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const addendumExcludedSnap =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? (form.addendumSlots[addendumSlot - 1]?.excludedSnapshot ?? null)
      : null;
  const addendumRoomsHtml =
    addendumSlot && (addendumSlotSnap || addendumExcludedSnap)
      ? (() => {
          const additionalHtml = addendumSlotSnap
            ? buildEstimateDocPrintEmbedHtml({
                sections: addendumSections,
                snapshot: addendumSlotSnap,
                directorName: form.executor.directorName,
                customerFullName: form.customer.fullName,
                includeFooter: false,
                includeTotals: false,
              })
            : '';
          const excludedHtml = addendumExcludedSnap
            ? buildEstimateDocPrintEmbedHtml({
                sections: addendumExcludedSections,
                snapshot: addendumExcludedSnap,
                directorName: form.executor.directorName,
                customerFullName: form.customer.fullName,
                includeFooter: false,
                includeTotals: false,
              })
            : '';
          const additionalTotal = addendumSlotSnap?.total ?? 0;
          const excludedTotal = addendumExcludedSnap?.total ?? 0;
          const summaryTotal = additionalTotal - excludedTotal;
          const sectionsHtml: string[] = [];
          if (additionalHtml) {
            sectionsHtml.push(
              `<section><h2 class="repairAddendumEstimateHeading">Смета дополнительных ремонтно-отделочных работ</h2>${additionalHtml}</section>`
            );
          }
          if (excludedHtml) {
            sectionsHtml.push(
              `<section><h2 class="repairAddendumEstimateHeading">Непроводимые ремонтно-отделочные работы</h2>${excludedHtml}</section>`
            );
          }
          if (sectionsHtml.length === 0) return '';
          const totalsAndFooterHtml = `<div class="estimateA4DocPrintEmbed">${buildEstimateDiscountTotalsBlockHtml(
            {
              grossTotal: summaryTotal,
              contractDiscountPercent: form.contract.discountPercent,
            }
          )}${buildEstimateDocPrintFooterHtml({
            directorName: form.executor.directorName,
            customerFullName: form.customer.fullName,
          })}</div>`;
          return [...sectionsHtml, totalsAndFooterHtml].join('');
        })()
      : '';
  const addendumForTemplate =
    addendumSlot !== null && Number.isFinite(addendumSlot) && addendumSlot >= 1 && addendumSlot <= 5
      ? (() => {
          const headerMain = `Дополнительное соглашение №${addendumSlot}`;
          const headerSub = `к договору на проведение ремонтно-отделочных работ с использованием материалов заказчика № ${form.contract.number.trim()} от ${form.contract.date.trim()}`;
          const increaseRaw =
            form.addendumSlots[addendumSlot - 1]?.workPeriodIncreaseDays?.trim() ?? '';
          const increaseDays = Number.parseInt(increaseRaw, 10);
          const workPeriodIncreaseSentence =
            Number.isFinite(increaseDays) && increaseDays > 0
              ? `В связи с увеличением объема работ, срок по договору увеличивается на ${increaseDays} рабочих дней.`
              : '';
          return {
            headerMain,
            headerSub,
            headerTitle: `${headerMain} ${headerSub}`,
            documentDate: form.addendumDocumentDates[addendumSlot - 1] ?? '',
            roomsHtml: addendumRoomsHtml,
            workPeriodIncreaseSentence,
          };
        })()
      : undefined;
  const workOrderComputed = buildWorkOrderComputed(
    form.estimate.snapshot,
    form.workOrder.taxPercent,
    form.workOrder.markupPercent,
    form.workOrder.gradeIncreasePercent,
    form.contract.discountPercent
  );
  const workOrderSections = buildEstimateSectionsFromPresetIds(
    form.estimate.selectedPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const workOrderCategoryTotalsHtml = buildWorkOrderCategoryTotalsHtml({
    sections: workOrderSections,
    roomTotals: workOrderComputed.rooms.map((room) => room.adjustedTotal),
  });
  const workOrderAddendumComputed =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? buildWorkOrderComputed(
          form.addendumSlots[addendumSlot - 1]?.snapshot ?? null,
          form.workOrder.taxPercent,
          form.workOrder.markupPercent,
          form.workOrder.gradeIncreasePercent,
          form.contract.discountPercent
        )
      : null;
  const workOrderAddendumSections =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? buildEstimateSectionsFromPresetIds(
          form.addendumSlots[addendumSlot - 1]?.selectedPresetIds ?? [],
          options?.estimatePresets ?? [],
          estimateGroupsForTpl
        )
      : [];
  const workOrderAddendumCategoryTotalsHtml = buildWorkOrderCategoryTotalsHtml({
    sections: workOrderAddendumSections,
    roomTotals: workOrderAddendumComputed?.rooms.map((room) => room.adjustedTotal) ?? [],
  });
  const workOrderAddendumRoomsHtml =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? buildWorkOrderRoomsHtmlFromSnapshot(
          form.addendumSlots[addendumSlot - 1]?.snapshot ?? null,
          form.workOrder.taxPercent,
          form.workOrder.markupPercent,
          form.workOrder.gradeIncreasePercent,
          form.contract.discountPercent,
          workOrderAddendumSections,
          form.workOrder.showLineAmounts
        )
      : '';
  const workOrderAddendumForTemplate =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? {
          slotNumber: String(addendumSlot),
          roomsHtml: workOrderAddendumRoomsHtml,
          categoryTotalsHtml: workOrderAddendumCategoryTotalsHtml,
          totalAfterDeductions: formatMoney(workOrderAddendumComputed?.adjustedTotal ?? 0),
        }
      : undefined;

  const customerContext = repairCustomerTemplateContextFromTab(options?.templateTab);
  const customerForTemplate = enrichRepairCustomerForTemplate(form.customer, customerContext);

  return {
    ...form,
    customer: customerForTemplate,
    ...(addendumForTemplate ? { addendum: addendumForTemplate } : {}),
    ...(workOrderAddendumForTemplate ? { workOrderAddendum: workOrderAddendumForTemplate } : {}),
    meta: {
      /** Текущая календарная дата в формате дд.мм.гггг (момент предпросмотра/печати). Шаблон: `{{meta.currentDate}}`. */
      currentDate: todayContractDateDdMmYyyy(),
    },
    contract: {
      ...form.contract,
      prepaymentAmountWords,
      grandTotalAmount,
      grandTotalAmountWords,
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
    workOrder: {
      ...form.workOrder,
      roomsHtml: buildWorkOrderRoomsHtmlFromSnapshot(
        form.estimate.snapshot,
        form.workOrder.taxPercent,
        form.workOrder.markupPercent,
        form.workOrder.gradeIncreasePercent,
        form.contract.discountPercent,
        workOrderSections,
        form.workOrder.showLineAmounts
      ),
      categoryTotalsHtml: workOrderCategoryTotalsHtml,
      showLineAmounts: form.workOrder.showLineAmounts,
      totalBeforeDeductions: formatMoney(workOrderComputed.originalTotal),
      taxPercentNormalized: toPercentValue(form.workOrder.taxPercent),
      markupPercentNormalized: toPercentValue(form.workOrder.markupPercent),
      taxAmount: formatMoney(workOrderComputed.taxAmount),
      markupAmount: formatMoney(workOrderComputed.markupAmount),
      totalReduction: formatMoney(workOrderComputed.reductionAmount),
      totalAfterDeductions: formatMoney(workOrderComputed.adjustedTotal),
      roomsCount: String(workOrderComputed.rooms.length),
      linesCount: String(workOrderComputed.rooms.reduce((sum, room) => sum + room.lines.length, 0)),
      gradeIncreasePercent: workOrderComputed.gradeIncreasePercent,
    },
  };
}
