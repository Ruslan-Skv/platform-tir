import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import { measurementFieldsFromCrmCustomerDetail } from '@/views/admin/CRM/Measurements/measurementCrmCustomer';

export type EstimateCrmCustomerFields = {
  crmCustomerId: string | null;
  customerName: string;
  objectAddress: string;
};

export function estimateFieldsFromCrmCustomerDetail(
  detail: CrmCustomerDetail
): EstimateCrmCustomerFields {
  const fields = measurementFieldsFromCrmCustomerDetail(detail);
  return {
    crmCustomerId: fields.customerId,
    customerName: fields.customerName,
    objectAddress: fields.customerAddress,
  };
}

export const emptyEstimateCrmCustomerFields = (): EstimateCrmCustomerFields => ({
  crmCustomerId: null,
  customerName: '',
  objectAddress: '',
});
