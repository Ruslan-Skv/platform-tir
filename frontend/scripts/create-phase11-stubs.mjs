import fs from 'fs';
import path from 'path';

const REPAIR = 'frontend/src/views/admin/ContractDocuments/repair';
const BASE = '../packages/directions/repair';

const stubs = [
  ['workOrders/RepairContractWorkOrdersPanels.tsx'],
  ['workOrders/RepairInteractiveInstallerPicker.tsx'],
  ['workOrders/RepairWorkOrderGradeButtons.tsx'],
  ['workOrders/repairWorkOrderHubTabs.ts'],
  ['workOrders/repairWorkOrderHubTabs.test.ts'],
  ['workOrders/repairWorkOrderHubPrint.ts'],
  ['workOrders/repairWorkOrderPrintEmbedHtml.ts'],
  ['documents/repairDocumentTabs.ts'],
  ['documents/repairDocumentTemplates.ts'],
  ['documents/resolveRepairTemplateHtml.ts'],
  ['documents/repairTemplatePresetTab.ts'],
  ['documents/repairLibraryTemplateSelection.ts'],
  ['documents/repairLibraryTemplateSelection.test.ts'],
  ['documents/repairLibraryTemplateTabs.ts'],
  ['documents/repairLibraryTemplateTabs.test.ts'],
  ['estimates/RepairAddendumEstimateBlock.tsx'],
  ['estimates/repairApplyEstimatePresetIds.ts'],
  ['estimates/repairEstimateDocPrintEmbedHtml.ts'],
  ['estimates/estimateWorkScopeTree.ts'],
  ['estimates/estimateSplitBundle.ts'],
  ['estimates/estimatePipelineStage.ts'],
  ['estimates/estimateCrmCustomer.ts'],
  ['estimates/estimatePresetsCatalogKind.ts'],
  ['estimates/estimateObjectGroupSync.ts'],
  ['estimates/repairDetachEstimatePresetFromPackages.ts'],
];

for (const [rel] of stubs) {
  const name = path.basename(rel);
  const target = path.join(REPAIR, name);
  const content = `export * from '${BASE}/${rel.replace(/\.(tsx?|test\.ts)$/, (m) => m)}';\n`;
  const exportPath = `${BASE}/${rel}`.replace(/\.tsx$/, '').replace(/\.ts$/, '');
  fs.writeFileSync(target, `export * from '${exportPath}';\n`);
  console.log('stub:', name);
}
