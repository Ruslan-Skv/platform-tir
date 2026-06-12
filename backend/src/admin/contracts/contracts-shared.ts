export const CONTRACT_SNAPSHOT_FIELDS = {
  contractNumber: true,
  contractDate: true,
  status: true,
  directionId: true,
  managerId: true,
  deliveryId: true,
  surveyorId: true,
  officeId: true,
  complexObjectId: true,
  validityStart: true,
  validityEnd: true,
  contractDurationDays: true,
  contractDurationType: true,
  installationDate: true,
  installationDurationDays: true,
  deliveryDate: true,
  customerName: true,
  customerAddress: true,
  customerPhone: true,
  customerId: true,
  discount: true,
  totalAmount: true,
  advanceAmount: true,
  notes: true,
  source: true,
  preferredExecutorId: true,
  measurementId: true,
  actWorkStartDate: true,
  actWorkEndDate: true,
  goodsTransferDate: true,
  installers: true,
  actWorkStartImages: true,
  actWorkEndImages: true,
} as const;

export const MAX_AMENDMENTS_PER_CONTRACT = 5;

export function contractInclude() {
  return {
    manager: { select: { id: true, firstName: true, lastName: true } },
    surveyor: { select: { id: true, firstName: true, lastName: true } },
    direction: { select: { id: true, name: true, slug: true } },
    office: { select: { id: true, name: true, address: true } },
    complexObject: { select: { id: true, name: true, customerName: true, address: true } },
    measurement: { select: { id: true, customerName: true, receptionDate: true } },
    advances: true,
    amendments: {
      orderBy: { number: { sort: 'asc' as const, nulls: 'first' as const } },
    },
    payments: {
      select: { id: true, amount: true, paymentDate: true },
      orderBy: { paymentDate: 'asc' as const },
    },
  };
}

export function serializeContractSnapshot(c: {
  contractDate?: Date | null;
  validityStart?: Date | null;
  validityEnd?: Date | null;
  installationDate?: Date | null;
  deliveryDate?: Date | null;
  actWorkStartDate?: Date | null;
  actWorkEndDate?: Date | null;
  goodsTransferDate?: Date | null;
  discount?: unknown;
  totalAmount?: unknown;
  advanceAmount?: unknown;
  [key: string]: unknown;
}): Record<string, unknown> {
  const obj = { ...c } as Record<string, unknown>;
  const dateFields = [
    'contractDate',
    'validityStart',
    'validityEnd',
    'installationDate',
    'deliveryDate',
    'actWorkStartDate',
    'actWorkEndDate',
    'goodsTransferDate',
  ];
  for (const f of dateFields) {
    const v = obj[f];
    if (v instanceof Date) obj[f] = v.toISOString().slice(0, 10);
  }
  for (const f of ['discount', 'totalAmount', 'advanceAmount']) {
    const v = obj[f];
    if (v != null && typeof v === 'object' && 'toNumber' in v) {
      obj[f] = Number(v);
    }
  }
  return obj;
}

export interface SerializedDocumentCustomer {
  type: string;
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
