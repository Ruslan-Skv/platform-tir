const packageUserSelect = { id: true, email: true, firstName: true, lastName: true } as const;

export const contractDocumentPackageInclude = {
  documentObject: {
    select: { id: true, name: true, address: true, customerName: true },
  },
  createdBy: { select: packageUserSelect },
  responsibleManager: { select: packageUserSelect },
  deletedBy: { select: packageUserSelect },
  /**
   * Для списков пакетов: журнал оплат (суммы + тип/дата) — нужен для точного pipeline-статуса
   * (70% / Д/с / дата предоплаты окон).
   */
  payments: {
    select: {
      amount: true,
      paymentType: true,
      addendumNumber: true,
      paymentDate: true,
    },
  },
};
