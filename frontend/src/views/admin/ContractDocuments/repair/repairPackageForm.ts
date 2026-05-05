import type {
  ContractEstimatePreset,
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from './amountToRussianWords';
import { todayContractDateDdMmYyyy } from './contractDateFormat';
import {
  buildEstimateDocPrintEmbedHtml,
  buildEstimateDocPrintFooterHtml,
  buildEstimateSectionsFromPresetIds,
} from './repairEstimateDocPrintEmbedHtml';

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

/** Статус доп. соглашения: после «подписано» расчёты к этому Д/с не меняются. */
export type RepairAddendumSlotStatus = 'OPEN' | 'SIGNED';

/** Расчёты, прикреплённые к конкретному Д/с (№1…№5). */
export interface RepairAddendumSlotEstimateBlock {
  status: RepairAddendumSlotStatus;
  /** Время установки статуса SIGNED (ISO), нужно для окна отмены 24 часа. */
  signedAt: string;
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
  /**
   * Объект (группа расчётов) для сметы договора и всех Д/с: `''` — не выбран, `__ungrouped__` — вне объекта, иначе id группы.
   * При непустой смете фактически совпадает с объектом первого прикреплённого расчёта.
   */
  estimateObjectGroupKey: string;
  managerQuestionnaire1: RepairManagerQuestionnaire1Block;
  postWorkQuestionnaire2: RepairPostWorkQuestionnaire2Block;
  /** Сколько вкладок «Д/с №…» показывать (1–5). */
  addendumSlotCount: number;
  /**
   * Дата в шапке доп. соглашения (слева, под заголовком); индекс 0 = «Д/с №1», …, 4 = «Д/с №5».
   * Формат на усмотрение менеджера (часто дд.мм.гггг).
   */
  addendumDocumentDates: [string, string, string, string, string];
  /** По одному слоту на «Д/с №1»…«Д/с №5»: расчёты и статус подписания. */
  addendumSlots: RepairAddendumSlotsTuple;
  /** Время установки статуса «Договор заключен» (ISO), окно отмены — 24 часа. */
  contractConcludedAt: string;
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
    estimateObjectGroupKey: '',
    managerQuestionnaire1: defaultRepairManagerQuestionnaire1Block(),
    postWorkQuestionnaire2: defaultRepairPostWorkQuestionnaire2Block(),
    addendumSlotCount: 1,
    addendumDocumentDates: ['', '', '', '', ''],
    addendumSlots: defaultAddendumSlots(),
    contractConcludedAt: '',
  };
}

function defaultAddendumSlot(): RepairAddendumSlotEstimateBlock {
  return {
    status: 'OPEN',
    signedAt: '',
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

function normalizeAddendumSlotStatus(raw: unknown): RepairAddendumSlotStatus {
  return raw === 'SIGNED' ? 'SIGNED' : 'OPEN';
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

function normalizeAddendumSlotCount(raw: unknown): number {
  const x =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(String(raw).trim(), 10)
        : NaN;
  if (!Number.isFinite(x) || x < 1) return 1;
  if (x > 5) return 5;
  return Math.trunc(x);
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
  return {
    ...merged,
    managerQuestionnaire1: normalizeManagerQuestionnaire1AfterLoad(
      merged.managerQuestionnaire1 as RepairManagerQuestionnaire1Block & {
        trafficSource?: string;
        whyChosenUs?: string;
      }
    ),
    postWorkQuestionnaire2: normalizePostWorkQuestionnaire2AfterLoad(merged.postWorkQuestionnaire2),
    addendumSlotCount: normalizeAddendumSlotCount(
      (merged as unknown as Record<string, unknown>).addendumSlotCount
    ),
    addendumDocumentDates: normalizeAddendumDocumentDates(
      (merged as unknown as Record<string, unknown>).addendumDocumentDates
    ),
    addendumSlots: normalizeAddendumSlots(
      (merged as unknown as Record<string, unknown>).addendumSlots
    ),
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
    addendumDocumentDates: ['15.05.2026', '16.05.2026', '17.05.2026', '', ''],
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
    estimateObjectGroupKey: pickStr(form.estimateObjectGroupKey, fallback.estimateObjectGroupKey),
    managerQuestionnaire1: {
      ...fallback.managerQuestionnaire1,
      ...form.managerQuestionnaire1,
      trafficSourceCheckedIds:
        form.managerQuestionnaire1.trafficSourceCheckedIds.length > 0
          ? form.managerQuestionnaire1.trafficSourceCheckedIds
          : fallback.managerQuestionnaire1.trafficSourceCheckedIds,
      whyChosenCheckedIds:
        form.managerQuestionnaire1.whyChosenCheckedIds.length > 0
          ? form.managerQuestionnaire1.whyChosenCheckedIds
          : fallback.managerQuestionnaire1.whyChosenCheckedIds,
      clientNeedsCheckedIds:
        form.managerQuestionnaire1.clientNeedsCheckedIds.length > 0
          ? form.managerQuestionnaire1.clientNeedsCheckedIds
          : fallback.managerQuestionnaire1.clientNeedsCheckedIds,
    },
    postWorkQuestionnaire2: {
      ...fallback.postWorkQuestionnaire2,
      ...form.postWorkQuestionnaire2,
      ratingCompany:
        form.postWorkQuestionnaire2.ratingCompany ?? fallback.postWorkQuestionnaire2.ratingCompany,
      ratingManager:
        form.postWorkQuestionnaire2.ratingManager ?? fallback.postWorkQuestionnaire2.ratingManager,
      ratingForeman:
        form.postWorkQuestionnaire2.ratingForeman ?? fallback.postWorkQuestionnaire2.ratingForeman,
      ratingTrades: {
        ...fallback.postWorkQuestionnaire2.ratingTrades,
        ...form.postWorkQuestionnaire2.ratingTrades,
      },
      wishes: pickStr(form.postWorkQuestionnaire2.wishes, fallback.postWorkQuestionnaire2.wishes),
      filledDate: pickStr(
        form.postWorkQuestionnaire2.filledDate,
        fallback.postWorkQuestionnaire2.filledDate
      ),
      customerSignatory: pickStr(
        form.postWorkQuestionnaire2.customerSignatory,
        fallback.postWorkQuestionnaire2.customerSignatory
      ),
    },
    addendumSlotCount: normalizeAddendumSlotCount(form.addendumSlotCount),
    addendumDocumentDates: [
      pickStr(form.addendumDocumentDates[0], fallback.addendumDocumentDates[0]),
      pickStr(form.addendumDocumentDates[1], fallback.addendumDocumentDates[1]),
      pickStr(form.addendumDocumentDates[2], fallback.addendumDocumentDates[2]),
      pickStr(form.addendumDocumentDates[3], fallback.addendumDocumentDates[3]),
      pickStr(form.addendumDocumentDates[4], fallback.addendumDocumentDates[4]),
    ],
    addendumSlots: [0, 1, 2, 3, 4].map((i) => {
      const fb = fallback.addendumSlots[i];
      const fm = form.addendumSlots[i];
      const ids =
        (fm.selectedPresetIds?.length ?? 0) > 0 ? fm.selectedPresetIds : fb.selectedPresetIds;
      return {
        status: fm.status,
        signedAt: fm.status === 'SIGNED' ? pickStr(fm.signedAt, fb.signedAt) : '',
        selectedPresetIds: ids,
        snapshot: (fm.selectedPresetIds?.length ?? 0) > 0 ? fm.snapshot : fb.snapshot,
        excludedSelectedPresetIds:
          (fm.excludedSelectedPresetIds?.length ?? 0) > 0
            ? fm.excludedSelectedPresetIds
            : fb.excludedSelectedPresetIds,
        excludedSnapshot:
          (fm.excludedSelectedPresetIds?.length ?? 0) > 0
            ? fm.excludedSnapshot
            : fb.excludedSnapshot,
        notes: pickStr(fm.notes, fb.notes),
        excludedNotes: pickStr(fm.excludedNotes, fb.excludedNotes),
      };
    }) as RepairAddendumSlotsTuple,
    contractConcludedAt: pickStr(form.contractConcludedAt, fallback.contractConcludedAt),
  };
}

/** HTML-таблица объединённой сметы по снимку (как на вкладке «Смета» / в шаблоне). */
export function buildEstimateRoomsHtmlFromSnapshot(
  snapshot: RepairEstimateBlock['snapshot']
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
</table>`;
}

/** Данные для подстановки в HTML: добавляет вычисляемое поле `executor.innKppRegLine`. */
export function repairPackageFormForTemplate(
  form: RepairPackageFormData,
  options?: { templateTab?: string; estimatePresets?: ContractEstimatePreset[] }
): RepairPackageFormData & {
  executor: RepairExecutorBlock & { innKppRegLine: string };
  estimate: RepairEstimateBlock & {
    total: string;
    rooms: string;
    roomsHtml: string;
    roomsCount: string;
    linesCount: string;
  };
  addendum?: {
    headerMain: string;
    headerSub: string;
    /** Склейка для старых шаблонов с одним плейсхолдером. */
    headerTitle: string;
    documentDate: string;
    roomsHtml: string;
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

  const roomsHtml = buildEstimateRoomsHtmlFromSnapshot(snapshot);

  const prepaymentRaw = form.contract.prepaymentAmount.trim();
  const prepaymentAmountWords = prepaymentRaw
    ? amountToRussianWords(form.contract.prepaymentAmount)
    : '';

  const addendumTabMatch = options?.templateTab && /^addendum([1-5])$/.exec(options.templateTab);
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
    options?.estimatePresets ?? []
  );
  const addendumExcludedPresetIds =
    addendumSlotIdx !== null
      ? form.addendumSlots[addendumSlotIdx]?.excludedSelectedPresetIds
      : undefined;
  const addendumExcludedSections = buildEstimateSectionsFromPresetIds(
    addendumExcludedPresetIds,
    options?.estimatePresets ?? []
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
              })
            : '';
          const excludedHtml = addendumExcludedSnap
            ? buildEstimateDocPrintEmbedHtml({
                sections: addendumExcludedSections,
                snapshot: addendumExcludedSnap,
                directorName: form.executor.directorName,
                customerFullName: form.customer.fullName,
                includeFooter: false,
              })
            : '';
          const additionalTotal = addendumSlotSnap?.total ?? 0;
          const excludedTotal = addendumExcludedSnap?.total ?? 0;
          const summaryTotal = additionalTotal - excludedTotal;
          const formatMoney = (value: number) => value.toFixed(2).replace('.', ',');
          const sectionsHtml: string[] = [];
          if (additionalHtml) {
            sectionsHtml.push(
              `<section><h2 class="repairAddendumEstimateHeading">Смета дополнительных ремонтно-отделочных работ</h2>${additionalHtml}<p class="estimateA4Total">Итог по разделу: <strong>${formatMoney(additionalTotal)} руб.</strong></p></section>`
            );
          }
          if (excludedHtml) {
            sectionsHtml.push(
              `<section><h2 class="repairAddendumEstimateHeading">Непроводимые ремонтно-отделочные работы</h2>${excludedHtml}<p class="estimateA4Total">Итог по разделу: <strong>${formatMoney(excludedTotal)} руб.</strong></p></section>`
            );
          }
          if (sectionsHtml.length === 0) return '';
          return [
            ...sectionsHtml,
            `<p class="estimateA4Total"><strong>Общий итог по дополнительному соглашению: ${formatMoney(summaryTotal)} руб.</strong></p>`,
            buildEstimateDocPrintFooterHtml({
              directorName: form.executor.directorName,
              customerFullName: form.customer.fullName,
            }),
          ].join('');
        })()
      : '';
  const addendumForTemplate =
    addendumSlot !== null && Number.isFinite(addendumSlot) && addendumSlot >= 1 && addendumSlot <= 5
      ? (() => {
          const headerMain = `Дополнительное соглашение №${addendumSlot}`;
          const headerSub = `к договору на проведение ремонтно-отделочных работ с использованием материалов заказчика № ${form.contract.number.trim()} от ${form.contract.date.trim()}`;
          return {
            headerMain,
            headerSub,
            headerTitle: `${headerMain} ${headerSub}`,
            documentDate: form.addendumDocumentDates[addendumSlot - 1] ?? '',
            roomsHtml: addendumRoomsHtml,
          };
        })()
      : undefined;

  return {
    ...form,
    ...(addendumForTemplate ? { addendum: addendumForTemplate } : {}),
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
