import { useCallback, useMemo } from 'react';

import type { PackageQuestionnaireHubTabId } from '../../hub/questionnaires/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '../../hub/workOrders/packageWorkOrderHubTabs';

export type UsePackageEditorHeaderHubActionsOptions = {
  setWorkOrdersHubPanelTab: React.Dispatch<React.SetStateAction<PackageWorkOrderHubTabId>>;
  setWorkOrdersHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionnairesHubPanelTab: React.Dispatch<React.SetStateAction<PackageQuestionnaireHubTabId>>;
  setQuestionnairesHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInvoicesHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsVersionsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export function usePackageEditorHeaderHubActions({
  setWorkOrdersHubPanelTab,
  setWorkOrdersHubOpen,
  setQuestionnairesHubPanelTab,
  setQuestionnairesHubOpen,
  setInvoicesHubOpen,
  setIsVersionsHistoryOpen,
}: UsePackageEditorHeaderHubActionsOptions) {
  const onOpenInvoicesHub = useCallback(() => {
    setInvoicesHubOpen(true);
  }, [setInvoicesHubOpen]);

  const onOpenWorkOrdersHub = useCallback(
    (defaultTab: PackageWorkOrderHubTabId) => {
      setWorkOrdersHubPanelTab(defaultTab);
      setWorkOrdersHubOpen(true);
    },
    [setWorkOrdersHubPanelTab, setWorkOrdersHubOpen]
  );

  const onOpenQuestionnairesHub = useCallback(
    (defaultTab: PackageQuestionnaireHubTabId) => {
      setQuestionnairesHubPanelTab(defaultTab);
      setQuestionnairesHubOpen(true);
    },
    [setQuestionnairesHubPanelTab, setQuestionnairesHubOpen]
  );

  const onOpenVersionsHistory = useCallback(() => {
    setIsVersionsHistoryOpen(true);
  }, [setIsVersionsHistoryOpen]);

  return useMemo(
    () => ({
      onOpenInvoicesHub,
      onOpenWorkOrdersHub,
      onOpenQuestionnairesHub,
      onOpenVersionsHistory,
    }),
    [onOpenInvoicesHub, onOpenWorkOrdersHub, onOpenQuestionnairesHub, onOpenVersionsHistory]
  );
}
