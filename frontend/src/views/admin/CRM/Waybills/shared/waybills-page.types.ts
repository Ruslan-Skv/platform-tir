export type WaybillFormValues = {
  date: string;
  timeFrom: string;
  timeTo: string;
  direction: string;
  taskText: string;
  customerName: string;
  customerAddress: string;
  customerPhones: string[];
  contractId: string;
  contractSearch: string;
  deliveryCost: string;
  deliveryPayer: string;
  moversCost: string;
  moversPayer: string;
  responsibleUserId: string;
  driverUserId: string;
};

export type WaybillsPageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type WaybillStatusFilter = 'ALL' | 'PLANNED' | 'DONE' | 'FAILED';

export type WaybillsViewMode = 'table' | 'calendar';

export const WAYBILLS_VIEW_MODE_STORAGE_KEY = 'admin_waybills_view_mode';
