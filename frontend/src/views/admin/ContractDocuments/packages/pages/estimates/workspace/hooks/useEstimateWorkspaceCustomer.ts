import { useCallback, useRef } from 'react';

import { type CrmCustomerDetail } from '@/shared/api/admin-crm';
import type { CrmCustomerAppliedContext } from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';

import {
  type EstimateCrmCustomerFields,
  emptyEstimateCrmCustomerFields,
  estimateFieldsFromCrmCustomerDetail,
} from '../../../../platform/estimates/estimateCrmCustomer';

export type UseEstimateWorkspaceCustomerParams = {
  setCrmCustomerId: (id: string | null) => void;
  setCustomerName: (name: string) => void;
  setObjectAddress: (address: string) => void;
  setEstimateCustomerError: (msg: string | null) => void;
  setEstimateObjectAddressError: (msg: string | null) => void;
};

export function useEstimateWorkspaceCustomer({
  setCrmCustomerId,
  setCustomerName,
  setObjectAddress,
  setEstimateCustomerError,
  setEstimateObjectAddressError,
}: UseEstimateWorkspaceCustomerParams) {
  const customerChosenDuringLoadRef = useRef(false);

  const applyEstimateCustomerFields = useCallback(
    (fields: EstimateCrmCustomerFields) => {
      setCrmCustomerId(fields.crmCustomerId);
      setCustomerName(fields.customerName);
      setObjectAddress(fields.objectAddress);
    },
    [setCrmCustomerId, setCustomerName, setObjectAddress]
  );

  const applyCustomerFromLoader = useCallback(
    (fields: EstimateCrmCustomerFields) => {
      if (customerChosenDuringLoadRef.current) return;
      applyEstimateCustomerFields(fields);
    },
    [applyEstimateCustomerFields]
  );

  const resetCustomerLoadGuard = useCallback(() => {
    customerChosenDuringLoadRef.current = false;
  }, []);

  const handleEstimateCrmCustomerApplied = useCallback(
    (detail: CrmCustomerDetail, context?: CrmCustomerAppliedContext) => {
      customerChosenDuringLoadRef.current = true;
      const fields = estimateFieldsFromCrmCustomerDetail(detail);
      const displayName = context?.displayName?.trim();
      applyEstimateCustomerFields({
        ...fields,
        customerName: displayName || fields.customerName,
      });
      setEstimateCustomerError(null);
      setEstimateObjectAddressError(null);
    },
    [applyEstimateCustomerFields, setEstimateCustomerError, setEstimateObjectAddressError]
  );

  const handleEstimateCrmCustomerClear = useCallback(() => {
    customerChosenDuringLoadRef.current = true;
    applyEstimateCustomerFields(emptyEstimateCrmCustomerFields());
    setEstimateCustomerError(null);
    setEstimateObjectAddressError(null);
  }, [applyEstimateCustomerFields, setEstimateCustomerError, setEstimateObjectAddressError]);

  return {
    applyEstimateCustomerFields,
    applyCustomerFromLoader,
    resetCustomerLoadGuard,
    handleEstimateCrmCustomerApplied,
    handleEstimateCrmCustomerClear,
  };
}
