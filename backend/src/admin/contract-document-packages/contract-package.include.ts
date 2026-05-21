const packageUserSelect = { id: true, email: true, firstName: true, lastName: true } as const;

export const contractDocumentPackageInclude = {
  documentObject: {
    select: { id: true, name: true, address: true, customerName: true },
  },
  createdBy: { select: packageUserSelect },
  deletedBy: { select: packageUserSelect },
  crmContract: {
    select: {
      id: true,
      contractNumber: true,
      contractDate: true,
      customerName: true,
      customerAddress: true,
      customerPhone: true,
      totalAmount: true,
    },
  },
  /** Для списков пакетов: сумма оплат по журналу без полной выгрузки платежей. */
  payments: { select: { amount: true } },
};
