export const contractDocumentPackageInclude = {
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
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
