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
};
