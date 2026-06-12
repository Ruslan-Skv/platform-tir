/**
 * Groups flat files in packages/platform/editor and packages/platform/hub into subfolders.
 * Run from frontend/: node scripts/reorganize-platform-editor-hub.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/views/admin/ContractDocuments');
const EDITOR = path.join(ROOT, 'packages/platform/editor');
const HUB = path.join(ROOT, 'packages/platform/hub');

const EDITOR_MOVES = Object.fromEntries([
  ['PackageDocumentEditorChrome.tsx', 'chrome/PackageDocumentEditorChrome.tsx'],
  ['PackageDocumentEditorHeader.tsx', 'chrome/PackageDocumentEditorHeader.tsx'],
  ['PackageDocumentEditorTabBar.tsx', 'chrome/PackageDocumentEditorTabBar.tsx'],
  ['PackageDocumentEditorTabContent.tsx', 'chrome/PackageDocumentEditorTabContent.tsx'],
  ['PackageDocumentEditorModals.tsx', 'chrome/PackageDocumentEditorModals.tsx'],
  ['PackageDocumentEditorRefusedBanner.tsx', 'chrome/PackageDocumentEditorRefusedBanner.tsx'],
  ['PackageDocumentEditorWorkOrdersListSurface.tsx', 'chrome/PackageDocumentEditorWorkOrdersListSurface.tsx'],
  ['formatContractConcludedDateForHeader.ts', 'chrome/formatContractConcludedDateForHeader.ts'],
  ['executePackageDocumentPrint.ts', 'chrome/executePackageDocumentPrint.ts'],
  ['PackageDataTab.tsx', 'dataTab/PackageDataTab.tsx'],
  ['PackageDataTabView.tsx', 'dataTab/PackageDataTabView.tsx'],
  ['PackageDataTab.module.css', 'dataTab/PackageDataTab.module.css'],
  ['packageDataTabStyles.ts', 'dataTab/packageDataTabStyles.ts'],
  ['packageDataTabUi.tsx', 'dataTab/packageDataTabUi.tsx'],
  ['packageDataTabCompletion.ts', 'dataTab/packageDataTabCompletion.ts'],
  ['PackageDataContractObjectSection.tsx', 'dataTab/PackageDataContractObjectSection.tsx'],
  ['PackageDataCustomerSearchColumn.tsx', 'dataTab/PackageDataCustomerSearchColumn.tsx'],
  ['PackageDataCustomerPartySection.tsx', 'dataTab/PackageDataCustomerPartySection.tsx'],
  ['PackageDataExecutorPartySection.tsx', 'dataTab/PackageDataExecutorPartySection.tsx'],
  ['PackageDataManagerPartySection.tsx', 'dataTab/PackageDataManagerPartySection.tsx'],
  ['PackageEstimateTab.tsx', 'estimateTab/PackageEstimateTab.tsx'],
  ['PackageEstimateTabView.tsx', 'estimateTab/PackageEstimateTabView.tsx'],
  ['PackageEstimateAttachPanel.tsx', 'estimateTab/PackageEstimateAttachPanel.tsx'],
  ['PackageEstimateMergedSheet.tsx', 'estimateTab/PackageEstimateMergedSheet.tsx'],
  ['PackageEstimateAttach.module.css', 'estimateTab/PackageEstimateAttach.module.css'],
  ['packageEstimateTabStyles.ts', 'estimateTab/packageEstimateTabStyles.ts'],
  ['estimateTabUi.tsx', 'estimateTab/estimateTabUi.tsx'],
  ['PackageAddendumEditorPane.tsx', 'addendum/PackageAddendumEditorPane.tsx'],
  ['PackageAddendumTabBarActions.tsx', 'addendum/PackageAddendumTabBarActions.tsx'],
  ['PackageAddendumEstimateBlock.tsx', 'addendum/PackageAddendumEstimateBlock.tsx'],
  ['PackageAddendumEstimateBlockView.tsx', 'addendum/PackageAddendumEstimateBlockView.tsx'],
  ['PackageAddendumEstimateBlockProps.ts', 'addendum/PackageAddendumEstimateBlockProps.ts'],
  ['packageAddendumEstimateBlockStyles.ts', 'addendum/packageAddendumEstimateBlockStyles.ts'],
  ['PackageAddendumAdditionalWorksSection.tsx', 'addendum/PackageAddendumAdditionalWorksSection.tsx'],
  ['PackageAddendumExcludedWorksSection.tsx', 'addendum/PackageAddendumExcludedWorksSection.tsx'],
  ['PackageTemplateEditorPane.tsx', 'template/PackageTemplateEditorPane.tsx'],
  ['PackageContractTemplateEditorPane.tsx', 'template/PackageContractTemplateEditorPane.tsx'],
  ['PackageTemplateDocumentPreview.tsx', 'template/PackageTemplateDocumentPreview.tsx'],
  ['buildPackageTemplatePreviewHtml.ts', 'template/buildPackageTemplatePreviewHtml.ts'],
  ['packageTemplateTabUtils.ts', 'template/packageTemplateTabUtils.ts'],
  ['PackageFinalEstimateTab.tsx', 'tabs/PackageFinalEstimateTab.tsx'],
  ['ProductSpecificationTab.tsx', 'tabs/ProductSpecificationTab.tsx'],
  ['packageContractObjectBlock.ts', 'shared/packageContractObjectBlock.ts'],
  ['packageLockNoticeUi.tsx', 'shared/packageLockNoticeUi.tsx'],
  ['finalEstimateSummary.ts', 'shared/finalEstimateSummary.ts'],
]);

const HUB_MOVES = Object.fromEntries([
  ['PackageHubModal.tsx', 'hubModal/PackageHubModal.tsx'],
  ['PackageHubModalView.tsx', 'hubModal/PackageHubModalView.tsx'],
  ['usePackageHubModal.tsx', 'hubModal/usePackageHubModal.tsx'],
  ['PackageHubModal.module.css', 'hubModal/PackageHubModal.module.css'],
  ['usePackageHub.ts', 'hubModal/usePackageHub.ts'],
  ['packageHubConstants.ts', 'hubModal/packageHubConstants.ts'],
  ['packageHubUtils.ts', 'hubModal/packageHubUtils.ts'],
  ['PackageHubIcon.tsx', 'hubModal/PackageHubIcon.tsx'],
  ['PackageHubPayTitleAside.tsx', 'hubModal/PackageHubPayTitleAside.tsx'],
  ['PackageHubWorkStartModal.tsx', 'hubModal/PackageHubWorkStartModal.tsx'],
  ['PackageHubContractCloseModal.tsx', 'hubModal/PackageHubContractCloseModal.tsx'],
  ['PackageHubRefusalModal.tsx', 'hubModal/PackageHubRefusalModal.tsx'],
  ['PackageHubActPhotosModal.tsx', 'hubModal/PackageHubActPhotosModal.tsx'],
  ['PackageDocumentEditorMainView.tsx', 'hubModal/PackageDocumentEditorMainView.tsx'],
  ['packageAddendumTabState.ts', 'hubModal/packageAddendumTabState.ts'],
  ['PackagePipelineSection.tsx', 'pipeline/PackagePipelineSection.tsx'],
  ['PackagePipelineTimeline.tsx', 'pipeline/PackagePipelineTimeline.tsx'],
  ['PackagePipelineStepCard.tsx', 'pipeline/PackagePipelineStepCard.tsx'],
  ['PackagePipelineRefusalPanel.tsx', 'pipeline/PackagePipelineRefusalPanel.tsx'],
  ['packagePipelineTimelineUtils.ts', 'pipeline/packagePipelineTimelineUtils.ts'],
  ['packagePipeline.ts', 'pipeline/packagePipeline.ts'],
  ['packagePipeline.windows.test.ts', 'pipeline/packagePipeline.windows.test.ts'],
  ['PackageContractPaymentsTab.tsx', 'payments/PackageContractPaymentsTab.tsx'],
  ['PackageContractPaymentsTabView.tsx', 'payments/PackageContractPaymentsTabView.tsx'],
  ['usePackageContractPaymentsTab.ts', 'payments/usePackageContractPaymentsTab.ts'],
  ['usePackagePaymentsJournal.ts', 'payments/usePackagePaymentsJournal.ts'],
  ['usePackagePaymentsSummaryBreakdown.ts', 'payments/usePackagePaymentsSummaryBreakdown.ts'],
  ['usePackagePaymentsConduct.ts', 'payments/usePackagePaymentsConduct.ts'],
  ['PackageContractPaymentsHubSummarySection.tsx', 'payments/PackageContractPaymentsHubSummarySection.tsx'],
  ['PackageContractPaymentsConductFormSection.tsx', 'payments/PackageContractPaymentsConductFormSection.tsx'],
  ['PackageContractPaymentsJournalSection.tsx', 'payments/PackageContractPaymentsJournalSection.tsx'],
  ['PackageContractPaymentsJournalModal.tsx', 'payments/PackageContractPaymentsJournalModal.tsx'],
  ['packageContractPaymentsFormat.ts', 'payments/packageContractPaymentsFormat.ts'],
  ['PackageIssueInvoicePanel.tsx', 'invoices/PackageIssueInvoicePanel.tsx'],
  ['PackageIssueInvoicePanelView.tsx', 'invoices/PackageIssueInvoicePanelView.tsx'],
  ['usePackageIssueInvoicePanel.ts', 'invoices/usePackageIssueInvoicePanel.ts'],
  ['PackageIssueInvoiceIssueFormSection.tsx', 'invoices/PackageIssueInvoiceIssueFormSection.tsx'],
  ['PackageIssueInvoiceIssuedTableSection.tsx', 'invoices/PackageIssueInvoiceIssuedTableSection.tsx'],
  ['PackageIssueInvoiceLineRow.tsx', 'invoices/PackageIssueInvoiceLineRow.tsx'],
  ['packageIssueInvoicePanelUtils.ts', 'invoices/packageIssueInvoicePanelUtils.ts'],
  ['PackageInvoicesModal.tsx', 'invoices/PackageInvoicesModal.tsx'],
  ['PackageInvoicesHubIcon.tsx', 'invoices/PackageInvoicesHubIcon.tsx'],
  ['PackageWorkOrdersHubModal.tsx', 'workOrders/PackageWorkOrdersHubModal.tsx'],
  ['PackageWorkOrdersHubModal.module.css', 'workOrders/PackageWorkOrdersHubModal.module.css'],
  ['PackageWorkOrdersHubPanels.tsx', 'workOrders/PackageWorkOrdersHubPanels.tsx'],
  ['PackageWorkOrdersHubInteractiveEstimatePanel.tsx', 'workOrders/PackageWorkOrdersHubInteractiveEstimatePanel.tsx'],
  ['PackageWorkOrdersHubFinalWorkOrderPanel.tsx', 'workOrders/PackageWorkOrdersHubFinalWorkOrderPanel.tsx'],
  ['PackageWorkOrdersHubTemplatePreviewPanel.tsx', 'workOrders/PackageWorkOrdersHubTemplatePreviewPanel.tsx'],
  ['packageWorkOrdersHubPanelStyles.ts', 'workOrders/packageWorkOrdersHubPanelStyles.ts'],
  ['PackageWorkOrdersHubListModal.tsx', 'workOrders/PackageWorkOrdersHubListModal.tsx'],
  ['PackageWorkOrdersHubIcon.tsx', 'workOrders/PackageWorkOrdersHubIcon.tsx'],
  ['PackageWorkOrderHubContext.tsx', 'workOrders/PackageWorkOrderHubContext.tsx'],
  ['PackageWorkOrderGradeButtons.tsx', 'workOrders/PackageWorkOrderGradeButtons.tsx'],
  ['PackageInteractiveInstallerPicker.tsx', 'workOrders/PackageInteractiveInstallerPicker.tsx'],
  ['packageWorkOrderHubTabs.ts', 'workOrders/packageWorkOrderHubTabs.ts'],
  ['packageWorkOrderHubTabs.test.ts', 'workOrders/packageWorkOrderHubTabs.test.ts'],
  ['PackageQuestionnairesHubModal.tsx', 'questionnaires/PackageQuestionnairesHubModal.tsx'],
  ['PackageQuestionnairesHubPanels.tsx', 'questionnaires/PackageQuestionnairesHubPanels.tsx'],
  ['PackageQuestionnairesHubIcon.tsx', 'questionnaires/PackageQuestionnairesHubIcon.tsx'],
  ['packageQuestionnaireHubTabs.ts', 'questionnaires/packageQuestionnaireHubTabs.ts'],
  ['PackageManagerQuestionnaire1Tab.tsx', 'questionnaires/PackageManagerQuestionnaire1Tab.tsx'],
  ['PackageManagerQuestionnaire1TabView.tsx', 'questionnaires/PackageManagerQuestionnaire1TabView.tsx'],
  ['ManagerQuestionnaireIntroSection.tsx', 'questionnaires/ManagerQuestionnaireIntroSection.tsx'],
  ['ManagerQuestionnaireCustomerObjectSection.tsx', 'questionnaires/ManagerQuestionnaireCustomerObjectSection.tsx'],
  ['ManagerQuestionnaireOrderInfoSection.tsx', 'questionnaires/ManagerQuestionnaireOrderInfoSection.tsx'],
  ['ManagerQuestionnaireTrafficSection.tsx', 'questionnaires/ManagerQuestionnaireTrafficSection.tsx'],
  ['ManagerQuestionnaireMasterPreferencesSection.tsx', 'questionnaires/ManagerQuestionnaireMasterPreferencesSection.tsx'],
  ['ManagerQuestionnaireWhyChosenSection.tsx', 'questionnaires/ManagerQuestionnaireWhyChosenSection.tsx'],
  ['ManagerQuestionnaireCrossSellSection.tsx', 'questionnaires/ManagerQuestionnaireCrossSellSection.tsx'],
  ['ManagerQuestionnaireClientNeedsSection.tsx', 'questionnaires/ManagerQuestionnaireClientNeedsSection.tsx'],
  ['PackagePostWorkQuestionnaire2Tab.tsx', 'questionnaires/PackagePostWorkQuestionnaire2Tab.tsx'],
  ['PackageEventsJournalModal.tsx', 'events/PackageEventsJournalModal.tsx'],
  ['PackageEventsJournalModal.module.css', 'events/PackageEventsJournalModal.module.css'],
]);

function buildSuffixMap(moves, folderName) {
  const map = new Map();
  for (const [name, dest] of Object.entries(moves)) {
    map.set(`packages/platform/${folderName}/${name}`, `packages/platform/${folderName}/${dest}`);
  }
  return map;
}

const allSuffixMaps = [buildSuffixMap(EDITOR_MOVES, 'editor'), buildSuffixMap(HUB_MOVES, 'hub')];

function importStem(filePath) {
  return path
    .basename(filePath)
    .replace(/\.module\.css$/, '')
    .replace(/\.tsx?$/, '')
    .replace(/\.ts$/, '');
}

function buildBasenameTargets(moves, baseDir) {
  const map = new Map();
  for (const [, dest] of Object.entries(moves)) {
    map.set(importStem(dest), path.join(baseDir, dest));
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

function moveFiles(baseDir, moves) {
  for (const [name, dest] of Object.entries(moves)) {
    const src = path.join(baseDir, name);
    const target = path.join(baseDir, dest);
    if (!fs.existsSync(src)) {
      console.warn(`skip missing: ${src}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(src, target);
    console.log(`moved ${name} -> ${dest}`);
  }
}

const DEPTH_PREFIXES = [
  "from '../../../styles/",
  "from '../../../core/",
  "from '../../families/",
  "from '../../config/",
  "from '../form/",
  "from '../ui/",
  "from '../payments/",
  "from '../estimates/",
  "from '../tabs/",
  "from '../questionnaires/",
  "from '../workOrders/",
  "from '../editor/",
  "from '../hub/",
  "from '../hooks/",
];

const DEPTH_REPLACEMENTS = [
  "from '../../../../styles/",
  "from '../../../../core/",
  "from '../../../families/",
  "from '../../../config/",
  "from '../../form/",
  "from '../../ui/",
  "from '../../payments/",
  "from '../../estimates/",
  "from '../../tabs/",
  "from '../../questionnaires/",
  "from '../../workOrders/",
  "from '../../editor/",
  "from '../../hub/",
  "from '../../hooks/",
];

function bumpRelativeDepth(content) {
  let next = content;
  for (let i = 0; i < DEPTH_PREFIXES.length; i++) {
    next = next.split(DEPTH_PREFIXES[i]).join(DEPTH_REPLACEMENTS[i]);
  }
  return next;
}

const IMPORT_RE = /from\s+(['"])(\.[^'"]+)\1/g;

function fixRelativeImportsInFile(filePath, basenameMap) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(IMPORT_RE, (full, quote, importPath) => {
    const target = basenameMap.get(importStem(importPath));
    if (!target) return full;
    if (target.endsWith('.module.css') && !importPath.includes('.module.css')) return full;
    const resolved = relImport(filePath, target);
    if (resolved === importPath) return full;
    return `from ${quote}${resolved}${quote}`;
  });
  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    console.log(`fixed rel: ${path.relative(process.cwd(), filePath)}`);
  }
}

function fixExtensionlessPaths(content) {
  let next = content;
  for (const [name, dest] of Object.entries({ ...EDITOR_MOVES, ...HUB_MOVES })) {
    const stem = importStem(name);
    const destStem = dest
      .replace(/\.tsx?$/, '')
      .replace(/\.ts$/, '')
      .replace(/\.module\.css$/, '');
    next = next.split(`platform/editor/${stem}`).join(`platform/editor/${destStem}`);
    next = next.split(`platform/hub/${stem}`).join(`platform/hub/${destStem}`);
    next = next.split(`../editor/${stem}`).join(`../editor/${destStem}`);
    next = next.split(`../hub/${stem}`).join(`../hub/${destStem}`);
  }
  return next;
}

function fixMovedFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = bumpRelativeDepth(content);
  if (updated !== content) fs.writeFileSync(filePath, updated);
}

function walkTsFiles(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue;
      walkTsFiles(full, files);
    } else if (/\.(tsx?|css|md)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, files);
    else if (/\.tsx?$/.test(ent.name)) files.push(full);
  }
  return files;
}

function replaceSuffixPaths(content) {
  let next = fixExtensionlessPaths(content);
  for (const map of allSuffixMaps) {
    for (const [oldPath, newPath] of map) {
      next = next.split(oldPath).join(newPath);
    }
  }
  return next;
}

function updateAllSuffixImports(frontendSrc) {
  for (const file of walkTsFiles(frontendSrc)) {
    const content = fs.readFileSync(file, 'utf8');
    const updated = replaceSuffixPaths(content);
    if (updated !== content) {
      fs.writeFileSync(file, updated);
      console.log(`updated imports: ${path.relative(frontendSrc, file)}`);
    }
  }
}

function updateIndex(indexPath, moves) {
  let content = fs.readFileSync(indexPath, 'utf8');
  for (const [name, dest] of Object.entries(moves)) {
    const destNoExt = dest.replace(/\.tsx?$/, '');
    content = content.replaceAll(`'./${name}'`, `'./${dest}'`);
    content = content.replaceAll(`"./${name}"`, `"./${dest}"`);
    content = content.replaceAll(`'./${name.replace(/\.tsx?$/, '')}'`, `'./${destNoExt}'`);
    content = content.replaceAll(`"./${name.replace(/\.tsx?$/, '')}"`, `"./${destNoExt}"`);
  }
  fs.writeFileSync(indexPath, content);
}

const FIX_IMPORTS_ONLY = process.argv.includes('--fix-imports-only');

if (!FIX_IMPORTS_ONLY) {
  console.log('Moving editor files...');
  moveFiles(EDITOR, EDITOR_MOVES);
  console.log('Moving hub files...');
  moveFiles(HUB, HUB_MOVES);

  for (const dest of Object.values(EDITOR_MOVES)) fixMovedFile(path.join(EDITOR, dest));
  for (const dest of Object.values(HUB_MOVES)) fixMovedFile(path.join(HUB, dest));

  updateIndex(path.join(EDITOR, 'index.ts'), EDITOR_MOVES);
  updateIndex(path.join(HUB, 'index.ts'), HUB_MOVES);
}

console.log('Updating imports across src/...');
updateAllSuffixImports(path.resolve('src'));

console.log('Fixing relative imports in editor/ and hub/...');
for (const file of walkDir(EDITOR)) fixRelativeImportsInFile(file, editorBasenames);
for (const file of walkDir(HUB)) fixRelativeImportsInFile(file, hubBasenames);

console.log('Done.');
