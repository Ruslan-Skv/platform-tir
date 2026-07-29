import { useCallback } from 'react';

import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEditorHubCallbacksOptions = {
  formRef: React.MutableRefObject<PackageFormData>;
  linkedCrmCustomerIdRef: React.MutableRefObject<string | null>;
  flushPersistDebounced: () => Promise<void>;
  load: (options: { mode: 'refresh' }) => Promise<void>;
  setError: (message: string | null) => void;
  setPackageHubOpen: (open: boolean) => void;
  workOrdersHubListSurface: boolean;
  onWorkOrdersHubListClose?: () => void;
  setWorkOrdersHubOpen: (open: boolean) => void;
};

export function usePackageEditorHubCallbacks({
  formRef,
  linkedCrmCustomerIdRef,
  flushPersistDebounced,
  load,
  setError,
  setPackageHubOpen,
  workOrdersHubListSurface,
  onWorkOrdersHubListClose,
  setWorkOrdersHubOpen,
}: UsePackageEditorHubCallbacksOptions) {
  const getLiveFormForHub = useCallback(() => formRef.current, [formRef]);

  const getLivePersistOptionsForHub = useCallback(
    () => ({ linkedCrmCustomerId: linkedCrmCustomerIdRef.current }),
    [linkedCrmCustomerIdRef]
  );

  const openPackageHub = useCallback(() => {
    setPackageHubOpen(true);
    void flushPersistDebounced().catch((e) => {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить данные пакета');
    });
  }, [flushPersistDebounced, setError, setPackageHubOpen]);

  const handlePackageHubUpdated = useCallback(() => {
    void flushPersistDebounced()
      .then(() => load({ mode: 'refresh' }))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось обновить данные пакета');
      });
  }, [flushPersistDebounced, load, setError]);

  const closeWorkOrdersHub = useCallback(() => {
    if (workOrdersHubListSurface) {
      onWorkOrdersHubListClose?.();
      return;
    }
    setWorkOrdersHubOpen(false);
  }, [workOrdersHubListSurface, onWorkOrdersHubListClose, setWorkOrdersHubOpen]);

  return {
    getLiveFormForHub,
    getLivePersistOptionsForHub,
    openPackageHub,
    handlePackageHubUpdated,
    closeWorkOrdersHub,
  };
}
