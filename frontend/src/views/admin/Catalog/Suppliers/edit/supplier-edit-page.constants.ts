import type { SupplierEditFormData } from './supplier-edit-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const INITIAL_SUPPLIER_EDIT_FORM: SupplierEditFormData = {
  legalName: '',
  commercialName: '',
  website: '',
  legalAddress: '',
  inn: '',
  bankName: '',
  bankAccount: '',
  bankBik: '',
  email: '',
  phones: [],
  isActive: true,
};
