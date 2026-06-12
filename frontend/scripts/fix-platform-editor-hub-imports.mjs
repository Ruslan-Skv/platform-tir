import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/views/admin/ContractDocuments/packages/platform');
const EDITOR = path.join(ROOT, 'editor');
const HUB = path.join(ROOT, 'hub');

const EDITOR_MOVES = {
  PackageDocumentEditorChrome.tsx: 'chrome/PackageDocumentEditorChrome.tsx',
  PackageDocumentEditorHeader.tsx: 'chrome/PackageDocumentEditorHeader.tsx',
  PackageDocumentEditorTabBar.tsx: 'chrome/PackageDocumentEditorTabBar.tsx',
  PackageDocumentEditorTabContent.tsx: 'chrome/PackageDocumentEditorTabContent.tsx',
  PackageDocumentEditorModals.tsx: 'chrome/PackageDocumentEditorModals.tsx',
  PackageDocumentEditorRefusedBanner.tsx: 'chrome/PackageDocumentEditorRefusedBanner.tsx',
  PackageDocumentEditorWorkOrdersListSurface.tsx: 'chrome/PackageDocumentEditorWorkOrdersListSurface.tsx',
  formatContractConcludedDateForHeader.ts: 'chrome/formatContractConcludedDateForHeader.ts',
  executePackageDocumentPrint.ts: 'chrome/executePackageDocumentPrint.ts',
  PackageDataTab.tsx: 'dataTab/PackageDataTab.tsx',
  PackageDataTabView.tsx: 'dataTab/PackageDataTabView.tsx',
  'PackageDataTab.module.css': 'dataTab/PackageDataTab.module.css',
  packageDataTabStyles.ts: 'dataTab/packageDataTabStyles.ts',
  packageDataTabUi.tsx: 'dataTab/packageDataTabUi.tsx',
  packageDataTabCompletion.ts: 'dataTab/packageDataTabCompletion.ts',
  PackageDataContractObjectSection.tsx: 'dataTab/PackageDataContractObjectSection.tsx',
  PackageDataCustomerSearchColumn.tsx: 'dataTab/PackageDataCustomerSearchColumn.tsx',
  PackageDataCustomerPartySection.tsx: 'dataTab/PackageDataCustomerPartySection.tsx',
  PackageDataExecutorPartySection.tsx: 'dataTab/PackageDataExecutorPartySection.tsx',
  PackageDataManagerPartySection.tsx: 'dataTab/PackageDataManagerPartySection.tsx',
  PackageEstimateTab.tsx: 'estimateTab/PackageEstimateTab.tsx',
  PackageEstimateTabView.tsx: 'estimateTab/PackageEstimateTabView.tsx',
  PackageEstimateAttachPanel.tsx: 'estimateTab/PackageEstimateAttachPanel.tsx',
  PackageEstimateMergedSheet.tsx: 'estimateTab/PackageEstimateMergedSheet.tsx',
  'PackageEstimateAttach.module.css': 'estimateTab/PackageEstimateAttach.module.css',
  packageEstimateTabStyles.ts: 'estimateTab/packageEstimateTabStyles.ts',
  estimateTabUi.tsx: 'estimateTab/estimateTabUi.tsx',
  PackageAddendumEditorPane.tsx: 'addendum/PackageAddendumEditorPane.tsx',
  PackageAddendumTabBarActions.tsx: 'addendum/PackageAddendumTabBarActions.tsx',
  PackageAddendumEstimateBlock.tsx: 'addendum/PackageAddendumEstimateBlock.tsx',
  PackageAddendumEstimateBlockView.tsx: 'addendum/PackageAddendumEstimateBlockView.tsx',
  PackageAddendumEstimateBlockProps.ts: 'addendum/PackageAddendumEstimateBlockProps.ts',
  packageAddendumEstimateBlockStyles.ts: 'addendum/packageAddendumEstimateBlockStyles.ts',
  PackageAddendumAdditionalWorksSection.tsx: 'addendum/PackageAddendumAdditionalWorksSection.tsx',
  PackageAddendumExcludedWorksSection.tsx: 'addendum/PackageAddendumExcludedWorksSection.tsx',
  PackageTemplateEditorPane.tsx: 'template/PackageTemplateEditorPane.tsx',
  PackageContractTemplateEditorPane.tsx: 'template/PackageContractTemplateEditorPane.tsx',
  PackageTemplateDocumentPreview.tsx: 'template/PackageTemplateDocumentPreview.tsx',
  buildPackageTemplatePreviewHtml.ts: 'template/buildPackageTemplatePreviewHtml.ts',
  packageTemplateTabUtils.ts: 'template/packageTemplateTabUtils.ts',
  PackageFinalEstimateTab.tsx: 'tabs/PackageFinalEstimateTab.tsx',
  ProductSpecificationTab.tsx: 'tabs/ProductSpecificationTab.tsx',
  packageContractObjectBlock.ts: 'shared/packageContractObjectBlock.ts',
  packageLockNoticeUi.tsx: 'shared/packageLockNoticeUi.tsx',
  finalEstimateSummary.ts: 'shared/finalEstimateSummary.ts',
};

const HUB_MOVES = {
  PackageHubModal.tsx: 'hubModal/PackageHubModal.tsx',
  PackageHubModalView.tsx: 'hubModal/PackageHubModalView.tsx',
  usePackageHubModal.tsx: 'hubModal/usePackageHubModal.tsx',
  'PackageHubModal.module.css': 'hubModal/PackageHubModal.module.css',
  usePackageHub.ts: 'hubModal/usePackageHub.ts',
  packageHubConstants.ts: 'hubModal/packageHubConstants.ts',
  packageHubUtils.ts: 'hubModal/packageHubUtils.ts',
  PackageHubIcon.tsx: 'hubModal/PackageHubIcon.tsx',
  PackageHubPayTitleAside.tsx: 'hubModal/PackageHubPayTitleAside.tsx',
  PackageHubWorkStartModal.tsx: 'hubModal/PackageHubWorkStartModal.tsx',
  PackageHubContractCloseModal.tsx: 'hubModal/PackageHubContractCloseModal.tsx',
  PackageHubRefusalModal.tsx: 'hubModal/PackageHubRefusalModal.tsx',
  PackageHubActPhotosModal.tsx: 'hubModal/PackageHubActPhotosModal.tsx',
  PackageDocumentEditorMainView.tsx: 'hubModal/PackageDocumentEditorMainView.tsx',
  packageAddendumTabState.ts: 'hubModal/packageAddendumTabState.ts',
  PackagePipelineSection.tsx: 'pipeline/PackagePipelineSection.tsx',
  PackagePipelineTimeline.tsx: 'pipeline/PackagePipelineTimeline.tsx',
  PackagePipelineStepCard.tsx: 'pipeline/PackagePipelineStepCard.tsx',
  PackagePipelineRefusalPanel.tsx: 'pipeline/PackagePipelineRefusalPanel.tsx',
  packagePipelineTimelineUtils.ts: 'pipeline/packagePipelineTimelineUtils.ts',
  'packagePipeline.ts': 'pipeline/packagePipeline.ts',
  'packagePipeline.windows.test.ts': 'pipeline/packagePipeline.windows.test.ts',
  PackageContractPaymentsTab.tsx: 'payments/PackageContractPaymentsTab.tsx',
  PackageContractPaymentsTabView.tsx: 'payments/PackageContractPaymentsTabView.tsx',
  usePackageContractPaymentsTab.ts: 'payments/usePackageContractPaymentsTab.ts',
  usePackagePaymentsJournal.ts: 'payments/usePackagePaymentsJournal.ts',
  usePackagePaymentsSummaryBreakdown.ts: 'payments/usePackagePaymentsSummaryBreakdown.ts',
  usePackagePaymentsConduct.ts: 'payments/usePackagePaymentsConduct.ts',
  PackageContractPaymentsHubSummarySection.tsx: 'payments/PackageContractPaymentsHubSummarySection.tsx',
  PackageContractPaymentsConductFormSection.tsx: 'payments/PackageContractPaymentsConductFormSection.tsx',
  PackageContractPaymentsJournalSection.tsx: 'payments/PackageContractPaymentsJournalSection.tsx',
  PackageContractPaymentsJournalModal.tsx: 'payments/PackageContractPaymentsJournalModal.tsx',
  packageContractPaymentsFormat.ts: 'payments/packageContractPaymentsFormat.ts',
  PackageIssueInvoicePanel.tsx: 'invoices/PackageIssueInvoicePanel.tsx',
  PackageIssueInvoicePanelView.tsx: 'invoices/PackageIssueInvoicePanelView.tsx',
  usePackageIssueInvoicePanel.ts: 'invoices/usePackageIssueInvoicePanel.ts',
  PackageIssueInvoiceIssueFormSection.tsx: 'invoices/PackageIssueInvoiceIssueFormSection.tsx',
  PackageIssueInvoiceIssuedTableSection.tsx: 'invoices/PackageIssueInvoiceIssuedTableSection.tsx',
  PackageIssueInvoiceLineRow.tsx: 'invoices/PackageIssueInvoiceLineRow.tsx',
  packageIssueInvoicePanelUtils.ts: 'invoices/packageIssueInvoicePanelUtils.ts',
  PackageInvoicesModal.tsx: 'invoices/PackageInvoicesModal.tsx',
  PackageInvoicesHubIcon.tsx: 'invoices/PackageInvoicesHubIcon.tsx',
  PackageWorkOrdersHubModal.tsx: 'workOrders/PackageWorkOrdersHubModal.tsx',
  'PackageWorkOrdersHubModal.module.css': 'workOrders/PackageWorkOrdersHubModal.module.css',
  PackageWorkOrdersHubPanels.tsx: 'workOrders/PackageWorkOrdersHubPanels.tsx',
  PackageWorkOrdersHubInteractiveEstimatePanel.tsx: 'workOrders/PackageWorkOrdersHubInteractiveEstimatePanel.tsx',
  PackageWorkOrdersHubFinalWorkOrderPanel.tsx: 'workOrders/PackageWorkOrdersHubFinalWorkOrderPanel.tsx',
  PackageWorkOrdersHubTemplatePreviewPanel.tsx: 'workOrders/PackageWorkOrdersHubTemplatePreviewPanel.tsx',
  packageWorkOrdersHubPanelStyles.ts: 'workOrders/packageWorkOrdersHubPanelStyles.ts',
  PackageWorkOrdersHubListModal.tsx: 'workOrders/PackageWorkOrdersHubListModal.tsx',
  PackageWorkOrdersHubIcon.tsx: 'workOrders/PackageWorkOrdersHubIcon.tsx',
  PackageWorkOrderHubContext.tsx: 'workOrders/PackageWorkOrderHubContext.tsx',
  PackageWorkOrderGradeButtons.tsx: 'workOrders/PackageWorkOrderGradeButtons.tsx',
  PackageInteractiveInstallerPicker.tsx: 'workOrders/PackageInteractiveInstallerPicker.tsx',
  packageWorkOrderHubTabs.ts: 'workOrders/packageWorkOrderHubTabs.ts',
  'packageWorkOrderHubTabs.test.ts': 'workOrders/packageWorkOrderHubTabs.test.ts',
  PackageQuestionnairesHubModal.tsx: 'questionnaires/PackageQuestionnairesHubModal.tsx',
  PackageQuestionnairesHubPanels.tsx: 'questionnaires/PackageQuestionnairesHubPanels.tsx',
  PackageQuestionnairesHubIcon.tsx: 'questionnaires/PackageQuestionnairesHubIcon.tsx',
  packageQuestionnaireHubTabs.ts: 'questionnaires/packageQuestionnaireHubTabs.ts',
  PackageManagerQuestionnaire1Tab.tsx: 'questionnaires/PackageManagerQuestionnaire1Tab.tsx',
  PackageManagerQuestionnaire1TabView.tsx: 'questionnaires/PackageManagerQuestionnaire1TabView.tsx',
  ManagerQuestionnaireIntroSection.tsx: 'questionnaires/ManagerQuestionnaireIntroSection.tsx',
  ManagerQuestionnaireCustomerObjectSection.tsx: 'questionnaires/ManagerQuestionnaireCustomerObjectSection.tsx',
  ManagerQuestionnaireOrderInfoSection.tsx: 'questionnaires/ManagerQuestionnaireOrderInfoSection.tsx',
  ManagerQuestionnaireTrafficSection.tsx: 'questionnaires/ManagerQuestionnaireTrafficSection.tsx',
  ManagerQuestionnaireMasterPreferencesSection.tsx: 'questionnaires/ManagerQuestionnaireMasterPreferencesSection.tsx',
  ManagerQuestionnaireWhyChosenSection.tsx: 'questionnaires/ManagerQuestionnaireWhyChosenSection.tsx',
  ManagerQuestionnaireCrossSellSection.tsx: 'questionnaires/ManagerQuestionnaireCrossSellSection.tsx',
  ManagerQuestionnaireClientNeedsSection.tsx: 'questionnaires/ManagerQuestionnaireClientNeedsSection.tsx',
  PackagePostWorkQuestionnaire2Tab.tsx: 'questionnaires/PackagePostWorkQuestionnaire2Tab.tsx',
  PackageEventsJournalModal.tsx: 'events/PackageEventsJournalModal.tsx',
  'PackageEventsJournalModal.module.css': 'events/PackageEventsJournalModal.module.css',
};

function buildBasenameTargets(moves, baseDir) {
  const map = new Map();
  for (const [, dest] of Object.entries(moves)) {
    map.set(path.basename(dest), path.join(baseDir, dest));
  }
  return map;
}

const editorBasenames = buildBasenameTargets(EDITOR_MOVES, EDITOR);
const hubBasenames = buildBasenameTargets(HUB_MOVES, HUB);

function relImport(fromFile, targetAbs) {
  let rel = path.relative(path.dirname(fromFile), targetAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  if (/\.tsx?$/.test(rel)) rel = rel.replace(/\.tsx?$/, '');
  return rel;
}

const IMPORT_RE = /from\s+(['"])(\.[^'"]+)\1/g;

function fixRelativeImportsInFile(filePath, basenameMap) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(IMPORT_RE, (full, quote, importPath) => {
    const base = path.basename(importPath);
    const target = basenameMap.get(base);
    if (!target) return full;
    const resolved = relImport(filePath, target);
    if (resolved === importPath) return full;
    return `from ${quote}${resolved}${quote}`;
  });
  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    console.log('fixed rel:', path.relative(process.cwd(), filePath));
  }
}

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, files);
    else if (/\.tsx?$/.test(ent.name)) files.push(full);
  }
  return files;
}

function walkAll(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue;
      walkAll(full, files);
    } else if (/\.(tsx?|md)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function fixExtensionless(content) {
  let next = content;
  for (const [name, dest] of Object.entries(EDITOR_MOVES)) {
    const stem = name.replace(/\.(tsx?|module\.css)$/, '').replace(/\.ts$/, '');
    next = next.split(`platform/editor/${stem}`).join(`platform/editor/${dest.replace(/\.(tsx?)$/, '').replace(/\.ts$/, '').replace(/\.module\.css$/, '')}`);
    next = next.split(`../editor/${stem}`).join(`../editor/${dest.replace(/\.(tsx?)$/, '').replace(/\.ts$/, '').replace(/\.module\.css$/, '')}`);
  }
  for (const [name, dest] of Object.entries(HUB_MOVES)) {
    const stem = name.replace(/\.(tsx?|module\.css)$/, '').replace(/\.ts$/, '');
    next = next.split(`platform/hub/${stem}`).join(`platform/hub/${dest.replace(/\.(tsx?)$/, '').replace(/\.ts$/, '').replace(/\.module\.css$/, '')}`);
    next = next.split(`../hub/${stem}`).join(`../hub/${dest.replace(/\.(tsx?)$/, '').replace(/\.ts$/, '').replace(/\.module\.css$/, '')}`);
  }
  return next;
}

for (const file of walkDir(EDITOR)) fixRelativeImportsInFile(file, editorBasenames);
for (const file of walkDir(HUB)) fixRelativeImportsInFile(file, hubBasenames);

for (const file of walkAll(path.resolve('src'))) {
  const content = fs.readFileSync(file, 'utf8');
  const updated = fixExtensionless(content);
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log('fixed ext:', path.relative(process.cwd(), file));
  }
}

console.log('Done.');
