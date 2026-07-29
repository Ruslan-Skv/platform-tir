import { useEffect, useState } from 'react';

import type { PackageQuestionnaireHubTabId } from '../../hub/questionnaires/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '../../hub/workOrders/packageWorkOrderHubTabs';

export type UsePackageEditorHubPanelStateOptions = {
  workOrdersHubListSurface?: boolean;
  workOrdersHubListSurfaceOpen?: boolean;
  invoicesHubListSurface?: boolean;
  invoicesHubListSurfaceOpen?: boolean;
};

export function usePackageEditorHubPanelState({
  workOrdersHubListSurface = false,
  workOrdersHubListSurfaceOpen = false,
  invoicesHubListSurface = false,
  invoicesHubListSurfaceOpen = false,
}: UsePackageEditorHubPanelStateOptions = {}) {
  const [packageHubOpen, setPackageHubOpen] = useState(false);
  const [invoicesHubOpen, setInvoicesHubOpen] = useState(
    invoicesHubListSurface ? invoicesHubListSurfaceOpen : false
  );
  const [paymentInvoiceCount, setPaymentInvoiceCount] = useState(0);
  const [workOrdersHubOpen, setWorkOrdersHubOpen] = useState(
    workOrdersHubListSurface ? workOrdersHubListSurfaceOpen : false
  );
  const [workOrdersHubPanelTab, setWorkOrdersHubPanelTab] =
    useState<PackageWorkOrderHubTabId>('workOrder');
  const [questionnairesHubOpen, setQuestionnairesHubOpen] = useState(false);
  const [questionnairesHubPanelTab, setQuestionnairesHubPanelTab] =
    useState<PackageQuestionnaireHubTabId>('questionnaire1');

  useEffect(() => {
    if (!invoicesHubListSurface) return;
    setInvoicesHubOpen(invoicesHubListSurfaceOpen);
  }, [invoicesHubListSurface, invoicesHubListSurfaceOpen]);

  useEffect(() => {
    if (!workOrdersHubListSurface) return;
    setWorkOrdersHubOpen(workOrdersHubListSurfaceOpen);
  }, [workOrdersHubListSurface, workOrdersHubListSurfaceOpen]);

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
