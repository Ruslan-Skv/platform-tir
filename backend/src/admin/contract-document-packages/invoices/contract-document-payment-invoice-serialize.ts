import type { Prisma } from '@prisma/client';

/** Срок хранения удалённых счетов в корзине (по аналогии с корзиной журнала ДП). */
export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

export const INVOICE_INCLUDE = {
  issuedBy: { select: USER_SELECT },
  signedBy: { select: USER_SELECT },
  deletedBy: { select: USER_SELECT },
  package: { select: { id: true, title: true, kind: true, formData: true } },
} satisfies Prisma.ContractDocumentPaymentInvoiceInclude;

export type ContractDocumentPaymentInvoiceRow = Prisma.ContractDocumentPaymentInvoiceGetPayload<{
  include: typeof INVOICE_INCLUDE;
}>;

export type StoredPaymentInvoiceLineItem = {
  lineKind: 'GOODS' | 'SERVICE';
  name: string;
  quantity: string;
  unit: string;
  vatLabel: string;
  unitPrice: number;
  amount: number;
};

function normalizeStoredLineKind(raw: unknown): 'GOODS' | 'SERVICE' {
  return raw === 'GOODS' ? 'GOODS' : 'SERVICE';
}

export function parseStoredLineItems(value: unknown): StoredPaymentInvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      lineKind: normalizeStoredLineKind(row.lineKind),
      name: typeof row.name === 'string' ? row.name : '',
      quantity: typeof row.quantity === 'string' ? row.quantity : '1',
      unit: typeof row.unit === 'string' ? row.unit : 'шт.',
      vatLabel: typeof row.vatLabel === 'string' ? row.vatLabel : 'Без НДС',
      unitPrice: Number(row.unitPrice) || 0,
      amount: Number(row.amount) || 0,
    }))
    .filter((row) => row.name.trim() && row.amount > 0);
}

function contractNumberFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const contract = (formData as Record<string, unknown>).contract;
  if (!contract || typeof contract !== 'object') return '';
  const num = (contract as Record<string, unknown>).number;
  return typeof num === 'string' ? num.trim() : '';
}

function customerNameFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const customer = (formData as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return '';
  const fullName = (customer as Record<string, unknown>).fullName;
  return typeof fullName === 'string' ? fullName.trim() : '';
}

function serializeUser(
  user:
    | ContractDocumentPaymentInvoiceRow['issuedBy']
    | ContractDocumentPaymentInvoiceRow['signedBy'],
) {
  return user
    ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    : null;
}

export function serializeInvoice(row: ContractDocumentPaymentInvoiceRow) {
  // Свободный счёт (без пакета): № договора и заказчик — из снимка в записи счёта.
  const pkg = row.package;
  return {
    id: row.id,
    packageId: row.packageId,
    sequenceNumber: row.sequenceNumber,
    invoiceNumber: String(row.sequenceNumber),
    invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
    amount: row.amount.toString(),
    paymentType: row.paymentType,
    addendumNumber: row.addendumNumber,
    basis: row.basis,
    lineItems: parseStoredLineItems(row.lineItems),
    legacyFormId: row.legacyFormId,
    contractDate: row.contractDate ? row.contractDate.toISOString().slice(0, 10) : null,
    customerId: row.customerId,
    executorProfile: (row.executorProfile ?? null) as unknown,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    issuedById: row.issuedById,
    issuedBy: serializeUser(row.issuedBy),
    signedAt: row.signedAt ? row.signedAt.toISOString() : null,
    signedById: row.signedById,
    signedBy: serializeUser(row.signedBy),
    signedFileUrl: row.signedFileUrl,
    signedSha256: row.signedSha256,
    packageTitle: pkg?.title ?? null,
    packageKind: pkg?.kind ?? null,
    contractNumber: pkg ? contractNumberFromFormData(pkg.formData) : (row.contractNumber ?? ''),
    customerName: pkg ? customerNameFromFormData(pkg.formData) : (row.customerName ?? ''),
  };
}

/** Строка корзины: обычная сериализация + кто/когда удалил и момент безвозвратного удаления. */
export function serializeInvoiceTrash(row: ContractDocumentPaymentInvoiceRow) {
  return {
    ...serializeInvoice(row),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedById: row.deletedById,
    deletedBy: serializeUser(row.deletedBy),
    /** Момент безвозвратного удаления — deletedAt + срок хранения корзины (30 дней). */
    permanentDeleteAt: row.deletedAt
      ? new Date(row.deletedAt.getTime() + TRASH_RETENTION_MS).toISOString()
      : null,
  };
}
