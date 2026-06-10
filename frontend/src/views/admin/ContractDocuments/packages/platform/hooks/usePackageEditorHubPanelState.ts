import { useState } from 'react';

import type { PackageQuestionnaireHubTabId } from '../hub/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '../hub/packageWorkOrderHubTabs';

export type UsePackageEditorHubPanelStateOptions = {
  workOrdersHubListSurface?: boolean;
};

export function usePackageEditorHubPanelState({
  workOrdersHubListSurface = false,
}: UsePackageEditorHubPanelStateOptions = {}) {
  const [packageHubOpen, setPackageHubOpen] = useState(false);
  const [invoicesHubOpen, setInvoicesHubOpen] = useState(false);
  const [paymentInvoiceCount, setPaymentInvoiceCount] = useState(0);
  const [workOrdersHubOpen, setWorkOrdersHubOpen] = useState(workOrdersHubListSurface);
  const [workOrdersHubPanelTab, setWorkOrdersHubPanelTab] =
    useState<PackageWorkOrderHubTabId>('workOrder');
  const [questionnairesHubOpen, setQuestionnairesHubOpen] = useState(false);
  const [questionnairesHubPanelTab, setQuestionnairesHubPanelTab] =
    useState<PackageQuestionnaireHubTabId>('questionnaire1');

  return {
    packageHubOpen,
    setPackageHubOpen,
    invoicesHubOpen,
    setInvoicesHubOpen,
    paymentInvoiceCount,
    setPaymentInvoiceCount,
    workOrdersHubOpen,
    setWorkOrdersHubOpen,
    workOrdersHubPanelTab,
    setWorkOrdersHubPanelTab,
    questionnairesHubOpen,
    setQuestionnairesHubOpen,
    questionnairesHubPanelTab,
    setQuestionnairesHubPanelTab,
  };
}
