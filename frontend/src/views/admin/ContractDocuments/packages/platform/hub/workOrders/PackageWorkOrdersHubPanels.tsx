'use client';

import { PackageWorkOrdersHubFinalWorkOrderPanel } from './PackageWorkOrdersHubFinalWorkOrderPanel';
import { PackageWorkOrdersHubInstallerAdvancesPanel } from './PackageWorkOrdersHubInstallerAdvancesPanel';
import { PackageWorkOrdersHubInteractiveEstimatePanel } from './PackageWorkOrdersHubInteractiveEstimatePanel';
import { PackageWorkOrdersHubTemplatePreviewPanel } from './PackageWorkOrdersHubTemplatePreviewPanel';
import {
  type PackageWorkOrderHubTabId,
  isPackageWorkOrderTemplateHubTab,
} from './packageWorkOrderHubTabs';

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

  if (panelTab === 'installerAdvances') {
    return <PackageWorkOrdersHubInstallerAdvancesPanel />;
  }

  if (isPackageWorkOrderTemplateHubTab(panelTab)) {
    return <PackageWorkOrdersHubTemplatePreviewPanel panelTab={panelTab} />;
  }

  return null;
}
