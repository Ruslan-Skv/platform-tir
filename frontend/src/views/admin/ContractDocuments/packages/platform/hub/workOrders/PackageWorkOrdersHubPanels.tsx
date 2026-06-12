'use client';

import { isPackageWorkOrderAddendumTab } from '../../tabs/packageDocumentTabs';
import { PackageWorkOrdersHubFinalWorkOrderPanel } from './PackageWorkOrdersHubFinalWorkOrderPanel';
import { PackageWorkOrdersHubInteractiveEstimatePanel } from './PackageWorkOrdersHubInteractiveEstimatePanel';
import { PackageWorkOrdersHubTemplatePreviewPanel } from './PackageWorkOrdersHubTemplatePreviewPanel';
import type { PackageWorkOrderHubTabId } from './packageWorkOrderHubTabs';

export type PackageWorkOrdersHubPanelsProps = {
  panelTab: PackageWorkOrderHubTabId;
};

export function PackageWorkOrdersHubPanels({ panelTab }: PackageWorkOrdersHubPanelsProps) {
  if (panelTab === 'interactiveFinalEstimate') {
    return <PackageWorkOrdersHubInteractiveEstimatePanel />;
  }

  if (panelTab === 'finalWorkOrder') {
    return <PackageWorkOrdersHubFinalWorkOrderPanel />;
  }

  if (panelTab === 'workOrder' || isPackageWorkOrderAddendumTab(panelTab)) {
    return <PackageWorkOrdersHubTemplatePreviewPanel panelTab={panelTab} />;
  }

  return null;
}
