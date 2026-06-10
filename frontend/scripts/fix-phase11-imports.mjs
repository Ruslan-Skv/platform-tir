import fs from 'fs';
import path from 'path';

const ROOT = 'frontend/src/views/admin/ContractDocuments';
const REPAIR_DIR = `${ROOT}/repair`;
const WO = `${ROOT}/packages/directions/repair/workOrders`;
const DOC = `${ROOT}/packages/directions/repair/documents`;
const EST = `${ROOT}/packages/directions/repair/estimates`;

function stems(dir) {
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => f.replace(/\.(tsx?|test\.ts)$/, '').replace(/\.test$/, ''))
  );
}

const woStems = stems(WO);
const docStems = stems(DOC);
const estStems = stems(EST);

function stemFrom(spec) {
  return spec.replace(/^\.\//, '').split('/')[0].replace(/\.(tsx?)$/, '');
}

function fixDir(dir, localStems, extra = {}) {
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    const p = path.join(dir, file);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/from '(\.\.?\/[^']+)'/g, (match, spec) => {
      if (spec === '../ContractDocuments.module.css') {
        return "from '../../../../ContractDocuments.module.css'";
      }
      if (extra[spec]) return `from '${extra[spec]}'`;
      if (!spec.startsWith('./')) return match;
      const stem = stemFrom(spec);
      if (localStems.has(stem)) return match;
      if (stem === 'repairPackageForm' || stem === 'formDataTemplateStorage') {
        return `from '../${stem}'`;
      }
      if (stem === 'printDocument' || stem === 'applyTemplate') {
        return `from '../../../../shared/${stem}'`;
      }
      if (stem === 'templates') return "from '../../templates'";
      if (stem === 'RepairContractWorkOrderHubContext') {
        return "from '../../shared/hub/RepairContractWorkOrderHubContext'";
      }
      if (stem === 'repairWindowsPackagePrint') {
        return "from '../../windows/repairWindowsPackagePrint'";
      }
      if (stem === 'repairDocumentTabs' && dir === WO) {
        return "from '../documents/repairDocumentTabs'";
      }
      return `from '../../../repair/${spec.slice(2)}'`;
    });
    fs.writeFileSync(p, c);
  }
}

fixDir(WO, woStems);
fixDir(DOC, docStems);
fixDir(EST, estStems);

const consumerReplacements = [
  ['../../../repair/repairDocumentTabs', '../../directions/repair/documents/repairDocumentTabs'],
  ['../../../repair/repairDocumentTemplates', '../../directions/repair/documents/repairDocumentTemplates'],
  ['../../../repair/resolveRepairTemplateHtml', '../../directions/repair/documents/resolveRepairTemplateHtml'],
  ['../../../repair/repairLibraryTemplateTabs', '../../directions/repair/documents/repairLibraryTemplateTabs'],
  ['../../../repair/repairTemplatePresetTab', '../../directions/repair/documents/repairTemplatePresetTab'],
  ['../../../repair/repairLibraryTemplateSelection', '../../directions/repair/documents/repairLibraryTemplateSelection'],
  ['../../../repair/RepairContractWorkOrdersPanels', '../../directions/repair/workOrders/RepairContractWorkOrdersPanels'],
  ['../../../repair/repairWorkOrderHubPrint', '../../directions/repair/workOrders/repairWorkOrderHubPrint'],
  ['../../../repair/repairWorkOrderHubTabs', '../../directions/repair/workOrders/repairWorkOrderHubTabs'],
  ['../../../repair/repairWorkOrderPrintEmbedHtml', '../../directions/repair/workOrders/repairWorkOrderPrintEmbedHtml'],
  ['../../../repair/repairApplyEstimatePresetIds', '../../directions/repair/estimates/repairApplyEstimatePresetIds'],
  ['../../../repair/repairEstimateDocPrintEmbedHtml', '../../directions/repair/estimates/repairEstimateDocPrintEmbedHtml'],
  ['../../../repair/RepairAddendumEstimateBlock', '../../directions/repair/estimates/RepairAddendumEstimateBlock'],
  ['../../../repair/estimatePresetsCatalogKind', '../../directions/repair/estimates/estimatePresetsCatalogKind'],
  ['../../../repair/estimateObjectGroupSync', '../../directions/repair/estimates/estimateObjectGroupSync'],
  ['../../../repair/estimatePipelineStage', '../../directions/repair/estimates/estimatePipelineStage'],
  ['../../../repair/estimateSplitBundle', '../../directions/repair/estimates/estimateSplitBundle'],
  ['../../../repair/estimateWorkScopeTree', '../../directions/repair/estimates/estimateWorkScopeTree'],
  ['../../../repair/repairDetachEstimatePresetFromPackages', '../../directions/repair/estimates/repairDetachEstimatePresetFromPackages'],
  ['../../repair/repairDocumentTabs', '../documents/repairDocumentTabs'],
  ['../../repair/repairWorkOrderHubTabs', '../workOrders/repairWorkOrderHubTabs'],
  ['../../repair/resolveRepairTemplateHtml', '../documents/resolveRepairTemplateHtml'],
  ['../../repair/repairApplyEstimatePresetIds', '../estimates/repairApplyEstimatePresetIds'],
  ['../../repair/repairEstimateDocPrintEmbedHtml', '../estimates/repairEstimateDocPrintEmbedHtml'],
  ['../../../../repair/repairEstimateDocPrintEmbedHtml', '../../estimates/repairEstimateDocPrintEmbedHtml'],
  ['../../repair/repairLibraryTemplateTabs', '../directions/repair/documents/repairLibraryTemplateTabs'],
  ['../../repair/repairDocumentTabs', '../directions/repair/documents/repairDocumentTabs'],
  ['./repair/repairDocumentTabs', './packages/directions/repair/documents/repairDocumentTabs'],
  ['./repair/estimateObjectGroupSync', './packages/directions/repair/estimates/estimateObjectGroupSync'],
  ['./repair/estimatePipelineStage', './packages/directions/repair/estimates/estimatePipelineStage'],
  ['./repair/estimateSplitBundle', './packages/directions/repair/estimates/estimateSplitBundle'],
  ['./repair/estimateWorkScopeTree', './packages/directions/repair/estimates/estimateWorkScopeTree'],
  ['./repair/repairApplyEstimatePresetIds', './packages/directions/repair/estimates/repairApplyEstimatePresetIds'],
  ['./repair/repairDetachEstimatePresetFromPackages', './packages/directions/repair/estimates/repairDetachEstimatePresetFromPackages'],
  ['@/views/admin/ContractDocuments/repair/repairLibraryTemplateSelection', '@/views/admin/ContractDocuments/packages/directions/repair/documents/repairLibraryTemplateSelection'],
];

function patchConsumers() {
  const dirs = [
    `${ROOT}/packages`,
    `${ROOT}`,
    'frontend/src/views/admin/Accounting',
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    walk(dir);
  }
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        walk(p);
        continue;
      }
      if (!/\.(tsx?)$/.test(ent.name)) continue;
      if (p.includes('/workOrders/') || p.includes('/documents/') || p.includes('/estimates/')) continue;
      let c = fs.readFileSync(p, 'utf8');
      let changed = false;
      for (const [from, to] of consumerReplacements) {
        if (c.includes(from)) {
          c = c.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(p, c);
    }
  }
}

patchConsumers();

// formDataTemplateStorage in directions/repair
const fds = `${ROOT}/packages/directions/repair/formDataTemplateStorage.ts`;
let fdsC = fs.readFileSync(fds, 'utf8');
fdsC = fdsC.replace(
  '../../../repair/repairDocumentTabs',
  './documents/repairDocumentTabs'
);
fs.writeFileSync(fds, fdsC);

// packages/templates index
const tpl = `${ROOT}/packages/templates/index.ts`;
let tplC = fs.readFileSync(tpl, 'utf8');
tplC = tplC.replace(
  '../../repair/repairLibraryTemplateTabs',
  '../directions/repair/documents/repairLibraryTemplateTabs'
);
fs.writeFileSync(tpl, tplC);

// packages/config/types.ts
const cfg = `${ROOT}/packages/config/types.ts`;
let cfgC = fs.readFileSync(cfg, 'utf8');
cfgC = cfgC
  .replace('../../repair/repairDocumentTabs', '../directions/repair/documents/repairDocumentTabs')
  .replace(
    '../../repair/repairLibraryTemplateTabs',
    '../directions/repair/documents/repairLibraryTemplateTabs'
  );
fs.writeFileSync(cfg, cfgC);

console.log('Phase 11 imports fixed.');
