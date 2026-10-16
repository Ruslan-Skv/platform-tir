import {
  ContractDocumentPackageKind,
  InstallerAdvanceSheetItemStatus,
  Prisma,
} from '@prisma/client';

import { PACKAGE_DIRECTION_REGISTRY } from '../../common/config/package-direction-registry.config';

const KIND_TO_DIRECTION_NAME = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

/** Include ведомости для списка: агрегаты по строкам без тяжёлых связей. */
export const SHEET_INCLUDE = {
  installer: { select: { id: true, fullName: true, grade: true } },
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
  items: { select: { amount: true, status: true } },
} as const satisfies Prisma.InstallerAdvanceSheetInclude;

/** Include ведомости для карточки: строки с договорами, выплатами и перепиской. */
export const DETAIL_INCLUDE = {
  installer: { select: { id: true, fullName: true, grade: true } },
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
  items: {
    include: {
      paidBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      comments: {
        include: {
          author: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      package: {
        select: { id: true, kind: true, status: true, formData: true },
      },
      advance: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const satisfies Prisma.InstallerAdvanceSheetInclude;

export type SheetWithItems = Prisma.InstallerAdvanceSheetGetPayload<{
  include: typeof SHEET_INCLUDE;
}>;
export type SheetDetail = Prisma.InstallerAdvanceSheetGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function userLabel(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || '—';
}

/** Номер договора / заказчик / адрес — из formData пакета (как в «Расчёте мастеров»). */
function packageSummaryFromFormData(formData: Prisma.JsonValue) {
  const data = (formData ?? {}) as {
    contract?: { number?: unknown };
    customer?: { fullName?: unknown };
    object?: { objectAddress?: unknown };
  };
  const asText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  return {
    contractNumber: asText(data.contract?.number),
    customerName: asText(data.customer?.fullName),
    objectAddress: asText(data.object?.objectAddress),
  };
}

/** Статус ведомости по строкам: всё выдано → PAID; есть вопрос → QUESTION; иначе PENDING. */
function deriveSheetStatus(items: Array<{ status: string }>): 'PENDING' | 'QUESTION' | 'PAID' {
  if (
    items.length > 0 &&
    items.every((item) => item.status === InstallerAdvanceSheetItemStatus.PAID)
  ) {
    return 'PAID';
  }
  if (items.some((item) => item.status === InstallerAdvanceSheetItemStatus.QUESTION)) {
    return 'QUESTION';
  }
  return 'PENDING';
}

/** Ведомость для списка: агрегаты по строкам (количества, суммы, статус). */
export function serializeSummary(sheet: SheetWithItems) {
  const items = sheet.items;
  return {
    id: sheet.id,
    number: sheet.number,
    createdAt: sheet.createdAt.toISOString(),
    note: sheet.note,
    installer: {
      id: sheet.installer.id,
      name: sheet.installer.fullName,
      grade: sheet.installer.grade,
    },
    createdBy: sheet.createdBy
      ? { id: sheet.createdBy.id, name: userLabel(sheet.createdBy) }
      : null,
    status: deriveSheetStatus(items),
    itemsCount: items.length,
    paidCount: items.filter((i) => i.status === InstallerAdvanceSheetItemStatus.PAID).length,
    questionCount: items.filter((i) => i.status === InstallerAdvanceSheetItemStatus.QUESTION)
      .length,
    totalAmount: round2(items.reduce((sum, i) => sum + i.amount.toNumber(), 0)),
    paidAmount: round2(
      items
        .filter((i) => i.status === InstallerAdvanceSheetItemStatus.PAID)
        .reduce((sum, i) => sum + i.amount.toNumber(), 0),
    ),
  };
}

/** Ведомость для карточки: строки с реквизитами договоров, выплатами и перепиской. */
export function serializeDetail(sheet: SheetDetail) {
  const items = sheet.items.map((item) => ({
    id: item.id,
    packageId: item.packageId,
    amount: item.amount.toString(),
    status: item.status,
    paidAt: item.paidAt ? isoDate(item.paidAt) : null,
    paymentMethod: item.paymentMethod,
    paidBy: item.paidBy ? { id: item.paidBy.id, name: userLabel(item.paidBy) } : null,
    packageKind: String(item.package.kind),
    direction: KIND_TO_DIRECTION_NAME[item.package.kind] ?? String(item.package.kind),
    packageStatus: String(item.package.status),
    ...packageSummaryFromFormData(item.package.formData),
    /** Запись журнала авансов, созданная выплатой этой строки. */
    advanceId: item.advance?.id ?? null,
    comments: item.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author
        ? {
            id: comment.author.id,
            name: userLabel(comment.author),
            role: comment.author.role,
          }
        : null,
    })),
  }));

  const numericItems = sheet.items.map((item) => ({ status: item.status, amount: item.amount }));

  return {
    id: sheet.id,
    number: sheet.number,
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
    note: sheet.note,
    installer: {
      id: sheet.installer.id,
      name: sheet.installer.fullName,
      grade: sheet.installer.grade,
    },
    createdBy: sheet.createdBy
      ? { id: sheet.createdBy.id, name: userLabel(sheet.createdBy) }
      : null,
    status: deriveSheetStatus(numericItems),
    itemsCount: numericItems.length,
    paidCount: numericItems.filter((i) => i.status === InstallerAdvanceSheetItemStatus.PAID).length,
    questionCount: numericItems.filter((i) => i.status === InstallerAdvanceSheetItemStatus.QUESTION)
      .length,
    totalAmount: round2(numericItems.reduce((sum, i) => sum + i.amount.toNumber(), 0)),
    paidAmount: round2(
      numericItems
        .filter((i) => i.status === InstallerAdvanceSheetItemStatus.PAID)
        .reduce((sum, i) => sum + i.amount.toNumber(), 0),
    ),
    items,
  };
}
