export type OfficeFormData = {
  name: string;
  prefix: string;
  address: string;
  phone: string;
  isActive: boolean;
  sortOrder: number;
};

export type OfficesPageMessage = {
  type: 'success' | 'error';
  text: string;
};
