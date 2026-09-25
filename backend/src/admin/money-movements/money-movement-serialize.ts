import { PaymentType, Prisma } from '@prisma/client';

/** Строка журнала ДП с менеджером — как её отдают списки и ручные записи. */
export type MoneyMovementRowWithManager = Prisma.MoneyMovementGetPayload<{
  include: { manager: { select: { id: true; email: true; firstName: true; lastName: true } } };
}>;

/** Форма записи журнала ДП для клиента (журнал, ручные записи, инкассации). */
export function serializeMoneyMovement(row: MoneyMovementRowWithManager) {
  return {
    id: row.id,
    sourceId: row.sourceId,
    packageId: row.packageId,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    performedAt: row.performedAt.toISOString(),
    amount: row.amount.toString(),
    paymentForm: row.paymentForm,
    paymentType: row.paymentType,
    /** Ручная проводка (модалка «Ручная запись в журнале ДП») — не связана с оплатой договора. */
    isManual: row.paymentType === PaymentType.OTHER && row.sourceId === null,
    addendumNumber: row.addendumNumber,
    basis: row.basis,
    notes: row.notes,
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    direction: row.direction,
    office: row.office,
    /** Первоначальные значения правленных супер-админом полей (значок «было …»). */
    originalValues: (row.originalValues as Record<string, string | null> | null) ?? null,
    manager: row.manager
      ? {
          id: row.manager.id,
          name:
            [row.manager.lastName, row.manager.firstName].filter(Boolean).join(' ').trim() ||
            row.manager.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
