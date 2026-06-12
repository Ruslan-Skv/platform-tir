import { useCallback, useEffect, useRef } from 'react';

import type { PackageManagerQuestionnaire1Block } from '../../form/packageForm';
import { persistManagerQuestionnaire1ToCrmCustomer } from '../../questionnaires/crmManagerQuestionnaire1';

export type UsePackageManagerQuestionnaire1CrmSyncOptions = {
  linkedCrmCustomerIdRef: React.MutableRefObject<string | null>;
  setError: (message: string | null) => void;
};

export function usePackageManagerQuestionnaire1CrmSync({
  linkedCrmCustomerIdRef,
  setError,
}: UsePackageManagerQuestionnaire1CrmSyncOptions) {
  const mq1CrmSyncDebounceRef = useRef<number | null>(null);

  const scheduleManagerQuestionnaire1CrmSync = useCallback(
    (block: PackageManagerQuestionnaire1Block) => {
      const customerId = linkedCrmCustomerIdRef.current?.trim();
      if (!customerId) return;
      if (mq1CrmSyncDebounceRef.current !== null) {
        window.clearTimeout(mq1CrmSyncDebounceRef.current);
      }
      mq1CrmSyncDebounceRef.current = window.setTimeout(() => {
        mq1CrmSyncDebounceRef.current = null;
        void persistManagerQuestionnaire1ToCrmCustomer(customerId, block).catch((e) => {
          setError(
            e instanceof Error ? e.message : 'Не удалось сохранить анкету в карточке клиента'
          );
        });
      }, 400);
    },
    [linkedCrmCustomerIdRef, setError]
  );

  useEffect(() => {
    return () => {
      if (mq1CrmSyncDebounceRef.current !== null) {
        window.clearTimeout(mq1CrmSyncDebounceRef.current);
      }
    };
  }, []);

  return { scheduleManagerQuestionnaire1CrmSync };
}
