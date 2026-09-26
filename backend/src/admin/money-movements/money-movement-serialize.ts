import { PaymentType, Prisma } from '@prisma/client';

/** Строка журнала ДП с менеджером — как её отдают списки и ручные записи. */
export type MoneyMovementRowWithManager = Prisma.MoneyMovementGetPayload<{
  include: { manager: { select: { id: true; email: true; firstName: true; lastName: true } } };
}>;

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

export type MoneyMovementRowWithUsers = Prisma.MoneyMovementGetPayload<{
  include: {
    manager: { select: typeof USER_SELECT };
    createdBy: { select: typeof USER_SELECT };
    deletedBy: { select: typeof USER_SELECT };
  };
}>;

function serializeMovementUser(user: MoneyMovementRowWithUsers['manager']) {
  return user
    ? {
        id: user.id,
        name: [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email,
      }
    : null;
}

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
    /** Исполнитель ручной записи «Мебели» — название набора из справочника реквизитов. */
    executorName: row.executorName,
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
    /** Автор ручной записи — по нему сотрудник определяет «свои» записи для удаления. */
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Запись корзины ДП: все поля записи + кто и когда создал/удалил. */
export function serializeMoneyMovementTrash(row: MoneyMovementRowWithUsers) {
  return {
    ...serializeMoneyMovement(row),
    createdBy: serializeMovementUser(row.createdBy),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedBy: serializeMovementUser(row.deletedBy),
  };
}
