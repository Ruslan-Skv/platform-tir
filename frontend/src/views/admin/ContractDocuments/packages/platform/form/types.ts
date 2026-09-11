import type { FurniturePackageBlock } from '../../directions/furniture/furnitureLegs';
import type { ProductAddendumSpecificationLine } from '../../families/product-like/addendum/addendumSpecification';
import type { CeilingsSpecification } from '../../families/product-like/ceilings/ceilingsSpecification';
import type { DoorsSpecificationLine } from '../../families/product-like/specification/doorsSpecification';

export type { ProductAddendumSpecificationLine, DoorsSpecificationLine };
export type { FurniturePackageBlock };

/** ЮЛ — ОГРН и КПП; ИП — ОГРНИП (КПП в форме обычно пустой). */
export type PackageExecutorKind = 'COMPANY' | 'ENTREPRENEUR';

/** Структура блока «Заказчик» в форме пакета документов. */
export interface PackageCustomerBlock {
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

/** Структура блока «Исполнитель» в форме пакета документов. */
export interface PackageExecutorBlock {
  selectedProfileTitle: string;
  executorKind: PackageExecutorKind;
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

export interface PackageObjectBlock {
  objectAddress: string;
  objectFloor: string;
  objectDescription: string;
}

export interface PackageContractBlock {
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
  /** Офис заключения (для нумерации); обычно из открытого рабочего дня. */
  officeId: string;
  /** Замерщик (код в номере договора). */
  surveyorUserId: string;
}

/** Анкета на вкладке «Анкета 1»: заполняет менеджер по телефонному разговору с клиентом. */
export interface PackageManagerQuestionnaire1Block {
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

export interface PackagePostWorkQuestionnaire2TradeRatings {
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
  key: keyof PackagePostWorkQuestionnaire2TradeRatings;
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
export interface PackagePostWorkQuestionnaire2Block {
  ratingCompany: PostWorkSatisfactionRating;
  ratingManager: PostWorkSatisfactionRating;
  ratingForeman: PostWorkSatisfactionRating;
  /** «Окна»: единая оценка мастеров (п. 4). */
  ratingMasters: PostWorkSatisfactionRating;
  ratingTrades: PackagePostWorkQuestionnaire2TradeRatings;
  wishes: string;
  /** Дата заполнения (дд.мм.гггг). */
  filledDate: string;
  /** Подпись / ФИО заказчика. */
  customerSignatory: string;
}

export interface PackageEstimateBlock {
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

export interface PackageWorkOrderBlock {
  /** Ставка налога в процентах, применяемая к каждой позиции сметы. */
  taxPercent: string;
  /** Наценка в процентах, вычитаемая из каждой позиции сметы. */
  markupPercent: string;
  /** Показывать ли стоимость по каждой строке работ. */
  showLineAmounts: boolean;
  /** Разряд для повышения стоимости после налогов/наценки: 0 / 5 / 10. */
  gradeIncreasePercent: 0 | 5 | 10;
}

export interface PackageInstallerAssignment {
  installerId: string;
}

/** Статус доп. соглашения: после «подписано/оплачено» расчёты к этому Д/с не меняются. */
export type PackageAddendumSlotStatus = 'OPEN' | 'SIGNED' | 'PAID';

/** Расчёты, прикреплённые к конкретному Д/с (№1…№5). */
export interface PackageAddendumSlotEstimateBlock {
  status: PackageAddendumSlotStatus;
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
  snapshot: PackageEstimateBlock['snapshot'];
  excludedSelectedPresetIds: string[];
  excludedSnapshot: PackageEstimateBlock['snapshot'];
  notes: string;
  excludedNotes: string;
  /** Д/с по «Окна»: дополнительные изделия в спецификации. */
  specificationAddedLines: ProductAddendumSpecificationLine[];
  /** Д/с по «Окна»: исключённые / уменьшенные изделия в спецификации. */
  specificationExcludedLines: ProductAddendumSpecificationLine[];
}

/** Выставленный счёт на оплату (без проводки в журнале до фактической оплаты). */
export interface PackageIssuedInvoice {
  id: string;
  number: string;
  /** Дата счёта (YYYY-MM-DD). */
  date: string;
  amountRub: number;
  basis: string;
  paymentType: 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT';
  addendumNumber?: number;
}

export type PackageAddendumSlotsTuple = [
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotEstimateBlock,
];

export interface PackageFormData {
  customer: PackageCustomerBlock;
  executor: PackageExecutorBlock;
  object: PackageObjectBlock;
  contract: PackageContractBlock;
  estimate: PackageEstimateBlock;
  workOrder: PackageWorkOrderBlock;
  /** Мастера направления «Ремонт», прикрепленные к договору. */
  selectedRepairInstallerIds: string[];
  /**
   * Назначение мастера на строки из итоговой сметы.
   * Ключ: `${roomName}::${workName}::${unit}`.
   */
  finalEstimateInstallerAssignments: Record<string, PackageInstallerAssignment>;
  /**
   * Объект (группа расчётов) для сметы договора и всех Д/с: `''` — не выбран, `__ungrouped__` — вне объекта, иначе id группы.
   * При непустой смете фактически совпадает с объектом первого прикреплённого расчёта.
   */
  estimateObjectGroupKey: string;
  managerQuestionnaire1: PackageManagerQuestionnaire1Block;
  postWorkQuestionnaire2: PackagePostWorkQuestionnaire2Block;
  /** Сколько вкладок «Д/с №…» показывать в редакторе пакета (0–5). */
  addendumSlotCount: number;
  /**
   * Дата в шапке доп. соглашения (слева, под заголовком); индекс 0 = «Д/с №1», …, 4 = «Д/с №5».
   * Формат на усмотрение менеджера (часто дд.мм.гггг).
   */
  addendumDocumentDates: [string, string, string, string, string];
  /** По одному слоту на «Д/с №1»…«Д/с №5»: расчёты и статус подписания. */
  addendumSlots: PackageAddendumSlotsTuple;
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
   * Фото результатов замера (вкладка «Замер») — относительные URL после загрузки на сервер.
   * Порядок = порядок прикрепления; максимум 5 шт.
   */
  measurementPhotoUrls: string[];
  /** Стоимость спецификации товарного пакета (Окна, Двери, …), ввод менеджера. */
  productSpecificationAmount: string;
  /** Файл спецификации (эскиз, расчёт из внешней программы) — относительный URL на сервере. */
  productSpecificationFileUrl: string;
  /** Исходное имя прикреплённого файла для отображения. */
  productSpecificationFileName: string;
  /** Позиции спецификации дверей (направление «Двери»). */
  doorsSpecificationLines: DoorsSpecificationLine[];
  /** Скидка на спецификацию дверей, % (только направление «Двери»). */
  doorsSpecificationDiscountPercent: string;
  /** Спецификация натяжных потолков (карточки потолков объекта). */
  ceilingsSpecification: CeilingsSpecification;
  /**
   * Пакет «Мебель»: до трёх договоров (изготовление / монтаж / техника) с отдельными исполнителями.
   * `contract` / `executor` шапки синхронизируются с ногой «Изготовление» для списков и шаблонов.
   */
  furniture: FurniturePackageBlock;
  /**
   * Номер договора на момент создания копии пакета (из поля «Номер договора»).
   * Пока совпадает с `contract.number`, к отображаемому номеру добавляется слово «копия».
   */
  _repairCopyContractNumberBaseline?: string;
  /** Журнал выставленных счетов на оплату по этому договору. */
  issuedInvoices: PackageIssuedInvoice[];
}
