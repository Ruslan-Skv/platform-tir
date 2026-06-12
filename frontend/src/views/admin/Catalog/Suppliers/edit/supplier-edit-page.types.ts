export type SupplierEditFormData = {
  legalName: string;
  commercialName: string;
  website: string;
  legalAddress: string;
  inn: string;
  bankName: string;
  bankAccount: string;
  bankBik: string;
  email: string;
  phones: string[];
  isActive: boolean;
};

export type SupplierEditPageMessage = {
  type: 'success' | 'error';
  text: string;
};
