import { defaultCeilingsSpecification } from '../../families/product-like/ceilings/ceilingsSpecification';
import { newDoorsSpecificationLine } from '../../families/product-like/specification/doorsSpecification';
import type {
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotsTuple,
  PackageFormData,
  PackageIssuedInvoice,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
  PackagePostWorkQuestionnaire2TradeRatings,
} from './types';

export function defaultPackagePostWorkQuestionnaire2TradeRatings(): PackagePostWorkQuestionnaire2TradeRatings {
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

export function defaultPackagePostWorkQuestionnaire2Block(): PackagePostWorkQuestionnaire2Block {
  return {
    ratingCompany: null,
    ratingManager: null,
    ratingForeman: null,
    ratingMasters: null,
    ratingTrades: defaultPackagePostWorkQuestionnaire2TradeRatings(),
    wishes: '',
    filledDate: '',
    customerSignatory: '',
  };
}

export function defaultPackageManagerQuestionnaire1Block(): PackageManagerQuestionnaire1Block {
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

export function defaultPackageFormData(): PackageFormData {
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
      bankName: '',
      bankBik: '',
      bankCorrAccount: '',
      bankSettlementAccount: '',
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
      invoiceNumber: '',
      workPeriod: '',
      workPeriodIsManual: false,
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
    managerQuestionnaire1: defaultPackageManagerQuestionnaire1Block(),
    postWorkQuestionnaire2: defaultPackagePostWorkQuestionnaire2Block(),
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
    productSpecificationAmount: '',
    productSpecificationFileUrl: '',
    productSpecificationFileName: '',
    doorsSpecificationLines: [newDoorsSpecificationLine()],
    doorsSpecificationDiscountPercent: '',
    ceilingsSpecification: defaultCeilingsSpecification(),
    issuedInvoices: [],
  };
}

function _normalizeIssuedInvoices(raw: unknown): PackageIssuedInvoice[] {
  if (!Array.isArray(raw)) return [];
  const out: PackageIssuedInvoice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const number = typeof o.number === 'string' ? o.number.trim() : '';
    const date = typeof o.date === 'string' ? o.date.trim() : '';
    const amountRub = Number(o.amountRub);
    const basis = typeof o.basis === 'string' ? o.basis.trim() : '';
    const paymentType = o.paymentType;
    if (!id || !number || !date || !basis || !Number.isFinite(amountRub) || amountRub <= 0) {
      continue;
    }
    if (
      paymentType !== 'PREPAYMENT' &&
      paymentType !== 'ADVANCE' &&
      paymentType !== 'FINAL' &&
      paymentType !== 'AMENDMENT'
    ) {
      continue;
    }
    const row: PackageIssuedInvoice = {
      id,
      number,
      date,
      amountRub,
      basis,
      paymentType,
    };
    const addendumNumber = Number(o.addendumNumber);
    if (Number.isFinite(addendumNumber) && addendumNumber >= 1 && addendumNumber <= 5) {
      row.addendumNumber = addendumNumber;
    }
    out.push(row);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
}

function defaultAddendumSlot(): PackageAddendumSlotEstimateBlock {
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
    specificationAddedLines: [],
    specificationExcludedLines: [],
  };
}

export function defaultAddendumSlots(): PackageAddendumSlotsTuple {
  return [
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
    defaultAddendumSlot(),
  ];
}
