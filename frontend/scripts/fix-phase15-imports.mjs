import fs from 'fs';
import path from 'path';

const ROOT = 'frontend/src/views/admin/ContractDocuments';

const globalReplacements = [
  ['@/views/admin/ContractDocuments/repair/repairPackageForm', '@/views/admin/ContractDocuments/packages/directions/repair/repairPackageForm'],
  ['@/views/admin/ContractDocuments/repair/formDataTemplateStorage', '@/views/admin/ContractDocuments/packages/directions/repair/formDataTemplateStorage'],
  ['@/views/admin/ContractDocuments/repair/RepairContractInvoicesModal', '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractInvoicesModal'],
  ['@/views/admin/ContractDocuments/repair/RepairContractInvoicesHubIcon', '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractInvoicesHubIcon'],
  ['@/views/admin/ContractDocuments/repair/RepairContractPackageHubIcon', '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractPackageHubIcon'],
  ['@/views/admin/ContractDocuments/repair/RepairContractQuestionnairesHubIcon', '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractQuestionnairesHubIcon'],
  ['@/views/admin/ContractDocuments/repair/RepairContractWorkOrdersHubIcon', '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractWorkOrdersHubIcon'],
  ['@/views/admin/ContractDocuments/repair/repairContractPackageHubConstants', '@/views/admin/ContractDocuments/packages/shared/hub/repairContractPackageHubConstants'],
  ['@/views/admin/ContractDocuments/repair/repairTemplatePresetTab', '@/views/admin/ContractDocuments/packages/directions/repair/documents/repairTemplatePresetTab'],
  ['@/views/admin/ContractDocuments/repair/templates', '@/views/admin/ContractDocuments/packages/templates'],
  ['./repair/repairPackageForm', './packages/directions/repair/repairPackageForm'],
  ['./repair/repairWindowsWorkOrder', './packages/directions/windows/repairWindowsWorkOrder'],
];

const packagesReplacements = [
  ['../../repair/repairPackageForm', '../directions/repair/repairPackageForm'],
  ['../../repair/formDataTemplateStorage', '../directions/repair/formDataTemplateStorage'],
  ['../../repair/repairContractPackageHubConstants', '../shared/hub/repairContractPackageHubConstants'],
  ['../../repair/repairContractPipeline', '../shared/hub/repairContractPipeline'],
  ['../../repair/repairTemplatePresetTab', '../directions/repair/documents/repairTemplatePresetTab'],
  ['../../repair/templates', '../templates'],
  ['../../../repair/repairPackageForm', '../../directions/repair/repairPackageForm'],
  ['../../../repair/formDataTemplateStorage', '../../directions/repair/formDataTemplateStorage'],
  ['../../../repair/repairContractPackageHubConstants', '../hub/repairContractPackageHubConstants'],
  ['../../../repair/repairContractPipeline', '../hub/repairContractPipeline'],
  ['../../../repair/repairPackageFormForTemplate', '../../directions/repair/form/repairPackageFormForTemplate'],
  ['../../../repair/repairTemplatePresetTab', '../../directions/repair/documents/repairTemplatePresetTab'],
  ['../../../repair/templates', '../../templates'],
];

const hubReplacements = [
  ['../../../repair/formDataTemplateStorage', '../../directions/repair/formDataTemplateStorage'],
  ['../../../repair/repairPackageForm', '../../directions/repair/repairPackageForm'],
  ['../../../repair/repairContractPackageHubConstants', './repairContractPackageHubConstants'],
  ['../../../repair/repairContractPipeline', './repairContractPipeline'],
];

function applyReplacements(filePath, replacements) {
  let c = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (c.includes(from)) {
      c = c.split(from).join(to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, c);
  return changed;
}

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'repair') continue;
      walk(p, fn);
      continue;
    }
    if (/\.tsx?$/.test(ent.name)) fn(p);
  }
}

// External consumers
for (const root of [
  'frontend/src/views/admin/Accounting',
  'frontend/src/views/admin/CRM',
  ROOT,
]) {
  if (!fs.existsSync(root)) continue;
  walk(root, (p) => {
    if (p.includes('/repair/')) return;
    applyReplacements(p, globalReplacements);
  });
}

// packages/ internal (except hub - handled separately)
walk(path.join(ROOT, 'packages'), (p) => {
  if (p.includes('/shared/hub/')) return;
  applyReplacements(p, [...globalReplacements, ...packagesReplacements]);
});

// hub folder
walk(path.join(ROOT, 'packages/shared/hub'), (p) => {
  applyReplacements(p, [...globalReplacements, ...hubReplacements]);
});

console.log('Phase 15 imports updated.');
