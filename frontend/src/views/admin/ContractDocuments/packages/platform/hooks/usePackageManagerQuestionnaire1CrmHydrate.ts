import { useEffect } from 'react';

import type { PackageFormData } from '../form/packageForm';
import { hydrateManagerQuestionnaire1FromLinkedCrmCustomer } from '../questionnaires/crmManagerQuestionnaire1';

export type UsePackageManagerQuestionnaire1CrmHydrateOptions = {
  questionnairesHubOpen: boolean;
  linkedCrmCustomerId: string | null;
  formRef: React.MutableRefObject<PackageFormData>;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
};

/** Refreshes manager questionnaire 1 from CRM when the questionnaires hub opens. */
export function usePackageManagerQuestionnaire1CrmHydrate({
  questionnairesHubOpen,
  linkedCrmCustomerId,
  formRef,
  setForm,
}: UsePackageManagerQuestionnaire1CrmHydrateOptions): void {
  useEffect(() => {
    if (!questionnairesHubOpen || !linkedCrmCustomerId) return;
    void (async () => {
      try {
        const hydrated = await hydrateManagerQuestionnaire1FromLinkedCrmCustomer(
          linkedCrmCustomerId,
          formRef.current
        );
        setForm((prev) => {
          if (
            JSON.stringify(prev.managerQuestionnaire1) ===
            JSON.stringify(hydrated.form.managerQuestionnaire1)
          ) {
            return prev;
          }
          const next = { ...prev, managerQuestionnaire1: hydrated.form.managerQuestionnaire1 };
          formRef.current = next;
          return next;
        });
      } catch {
        /* keep local copy */
      }
    })();
  }, [questionnairesHubOpen, linkedCrmCustomerId, formRef, setForm]);
}
