import type { WindowsAddendumSpecificationLine } from '../../windows/windowsAddendumSpecification';

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
  /** Сводная строка для договоров (из справочника или из отдельных полей). */
  bankDetails: string;
  bankName: string;
  bankBik: string;
  bankCorrAccount: string;
  bankSettlementAccount: string;
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
  /** Номер счёта на оплату (для печати / шаблона). */
  invoiceNumber: string;
  /** Срок договора в рабочих днях (число строкой, напр. «60»); в шаблоне `{{contract.workPeriod}}`. */
  workPeriod: string;
  /** Суперадмин задал срок в карточке договора — не перезаписывать из «Сроки договоров». */
  workPeriodIsManual?: boolean;
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
  /** «Окна»: единая оценка мастеров (п. 4). */
  ratingMasters: PostWorkSatisfactionRating;
  ratingTrades: RepairPostWorkQuestionnaire2TradeRatings;
  wishes: string;
  /** Дата заполнения (дд.мм.гггг). */
  filledDate: string;
  /** Подпись / ФИО заказчика. */
  customerSignatory: string;
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
  /** Д/с по «Окна»: дополнительные изделия в спецификации. */
  specificationAddedLines: WindowsAddendumSpecificationLine[];
  /** Д/с по «Окна»: исключённые / уменьшенные изделия в спецификации. */
  specificationExcludedLines: WindowsAddendumSpecificationLine[];
}

/** Выставленный счёт на оплату (без проводки в журнале до фактической оплаты). */
export interface RepairIssuedInvoice {
  id: string;
  number: string;
  /** Дата счёта (YYYY-MM-DD). */
  date: string;
  amountRub: number;
  basis: string;
  paymentType: 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT';
  addendumNumber?: number;
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
  /** Стоимость спецификации ПВХ-изделий (пакет «Окна»), ввод менеджера. */
  windowsSpecificationAmount: string;
  /** Файл спецификации (эскиз, расчёт из внешней программы) — относительный URL на сервере. */
  windowsSpecificationFileUrl: string;
  /** Исходное имя прикреплённого файла для отображения. */
  windowsSpecificationFileName: string;
  /**
   * Номер договора на момент создания копии пакета (из поля «Номер договора»).
   * Пока совпадает с `contract.number`, к отображаемому номеру добавляется слово «копия».
   */
  _repairCopyContractNumberBaseline?: string;
  /** Журнал выставленных счетов на оплату по этому договору. */
  issuedInvoices: RepairIssuedInvoice[];
}
