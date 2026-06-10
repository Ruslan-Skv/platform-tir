'use client';

import { useCallback, useEffect, useMemo } from 'react';

import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmCustomerDetail } from '@/shared/api/admin-crm';

import {
  type PackageExecutorRequisitesFields,
  type PackageSignatoryDirectoryFields,
  emptyExecutorRequisites,
  emptySignatoryDirectoryFields,
  executorRequisitesFromProfile,
  signatoryFieldsFromProfile,
} from '../form/packageEditorProfileFields';
import type { PackageFormData } from '../form/packageForm';
import {
  clearPackageFormCrmCustomerFields,
  mergePackageFormFromCrmCustomerDetail,
} from '../questionnaires/applyCrmContractToForm';

export type UsePackageProfileDirectoryHandlersOptions = {
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  formRef: React.MutableRefObject<PackageFormData>;
  contractAndEstimateLocked: boolean;
  touchPackageData: () => void;
  executorProfiles: ExecutorRequisiteProfile[];
  signatoryProfiles: ContractSignatoryProfile[];
  setLinkedCrmCustomerId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function usePackageProfileDirectoryHandlers({
  form,
  setForm,
  formRef,
  contractAndEstimateLocked,
  touchPackageData,
  executorProfiles,
  signatoryProfiles,
  setLinkedCrmCustomerId,
}: UsePackageProfileDirectoryHandlersOptions) {
  const customerPhonesReadonlyDisplay = useMemo(() => {
    const parts = (form.customer.phones ?? []).map((p) => p.trim()).filter(Boolean);
    const joined = parts.join(', ');
    if (joined) return joined;
    return (form.customer.phone ?? '').trim() || '—';
  }, [form.customer.phones, form.customer.phone]);

  const handleCrmCustomerApplied = useCallback(
    (detail: CrmCustomerDetail) => {
      if (contractAndEstimateLocked) return;
      const next = mergePackageFormFromCrmCustomerDetail(detail, formRef.current);
      setLinkedCrmCustomerId(detail.id);
      setForm(next);
      formRef.current = next;
      touchPackageData();
    },
    [contractAndEstimateLocked, formRef, setForm, setLinkedCrmCustomerId, touchPackageData]
  );

  const handleCrmCustomerClear = useCallback(() => {
    if (contractAndEstimateLocked) return;
    setLinkedCrmCustomerId(null);
    setForm((p) => clearPackageFormCrmCustomerFields(p));
    touchPackageData();
  }, [contractAndEstimateLocked, setForm, setLinkedCrmCustomerId, touchPackageData]);

  const applyExecutorProfile = useCallback(
    (title: string) => {
      if (contractAndEstimateLocked) return;
      setForm((p) => {
        const profile = executorProfiles.find((it) => it.title === title);
        if (!profile) {
          return {
            ...p,
            executor: {
              ...p.executor,
              selectedProfileTitle: '',
              ...emptyExecutorRequisites(),
            },
          };
        }
        return {
          ...p,
          executor: {
            ...p.executor,
            selectedProfileTitle: title,
            ...executorRequisitesFromProfile(profile),
          },
        };
      });
      touchPackageData();
    },
    [contractAndEstimateLocked, executorProfiles, setForm, touchPackageData]
  );

  useEffect(() => {
    const title = form.executor.selectedProfileTitle?.trim();
    if (!title || executorProfiles.length === 0) return;
    const profile = executorProfiles.find((it) => it.title === title);
    if (!profile) return;
    const fromProfile = executorRequisitesFromProfile(profile);
    setForm((prev) => {
      if (prev.executor.selectedProfileTitle?.trim() !== title) return prev;
      const keys = Object.keys(fromProfile) as (keyof PackageExecutorRequisitesFields)[];
      if (keys.every((k) => prev.executor[k] === fromProfile[k])) return prev;
      return {
        ...prev,
        executor: {
          ...prev.executor,
          selectedProfileTitle: title,
          ...fromProfile,
        },
      };
    });
  }, [executorProfiles, form.executor.selectedProfileTitle, setForm]);

  const applySignatoryProfile = useCallback(
    (title: string) => {
      if (contractAndEstimateLocked) return;
      setForm((p) => {
        const profile = signatoryProfiles.find((it) => it.title === title);
        if (!profile) {
          return {
            ...p,
            executor: {
              ...p.executor,
              selectedSignatoryProfileTitle: '',
              ...emptySignatoryDirectoryFields(),
            },
          };
        }
        return {
          ...p,
          executor: {
            ...p.executor,
            selectedSignatoryProfileTitle: title,
            ...signatoryFieldsFromProfile(profile),
          },
        };
      });
      touchPackageData();
    },
    [contractAndEstimateLocked, signatoryProfiles, setForm, touchPackageData]
  );

  useEffect(() => {
    const title = form.executor.selectedSignatoryProfileTitle?.trim();
    if (!title || signatoryProfiles.length === 0) return;
    const profile = signatoryProfiles.find((it) => it.title === title);
    if (!profile) return;
    const fromProfile = signatoryFieldsFromProfile(profile);
    setForm((prev) => {
      if (prev.executor.selectedSignatoryProfileTitle?.trim() !== title) return prev;
      const keys = Object.keys(fromProfile) as (keyof PackageSignatoryDirectoryFields)[];
      if (keys.every((k) => prev.executor[k] === fromProfile[k])) return prev;
      return {
        ...prev,
        executor: {
          ...prev.executor,
          selectedSignatoryProfileTitle: title,
          ...fromProfile,
        },
      };
    });
  }, [signatoryProfiles, form.executor.selectedSignatoryProfileTitle, setForm]);

  return {
    customerPhonesReadonlyDisplay,
    handleCrmCustomerApplied,
    handleCrmCustomerClear,
    applyExecutorProfile,
    applySignatoryProfile,
  };
}
