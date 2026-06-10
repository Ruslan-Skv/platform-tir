import fs from 'fs';
import path from 'path';

const ROOT = 'frontend/src/views/admin/ContractDocuments';

const replacements = [
  ['../../../../repair/repairExecutorBankFields', '../form/repairExecutorBankFields'],
  ['../../../../repair/repairInvoiceTemplateFields', '../form/repairInvoiceTemplateFields'],
  ['../../../repair/repairExecutorBankFields', '../../directions/repair/form/repairExecutorBankFields'],
  ['../../../repair/repairContractWorkPeriod', '../../directions/repair/form/repairContractWorkPeriod'],
  ['../../../repair/repairPackageJournalSchedule', '../../shared/repairPackageJournalSchedule'],
  ['../../../repair/packageContractDisplay', '../../directions/repair/form/packageContractDisplay'],
  ['../../../repair/repairContractPlaceholders', '../../directions/repair/form/repairContractPlaceholders'],
  ['../../repair/repairExecutorBankFields', '../directions/repair/form/repairExecutorBankFields'],
  ['../../repair/repairContractWorkPeriod', '../directions/repair/form/repairContractWorkPeriod'],
  ['../../repair/repairPackageJournalSchedule', '../shared/repairPackageJournalSchedule'],
  ['../../repair/packageContractDisplay', '../directions/repair/form/packageContractDisplay'],
  ['../../repair/repairContractPlaceholders', '../directions/repair/form/repairContractPlaceholders'],
  ['../../repair/cloneRepairPackageFormDataForCopy', '../directions/repair/form/cloneRepairPackageFormDataForCopy'],
  ['../../repair/repairContractDateFieldHelp', '../directions/repair/form/repairContractDateFieldHelp'],
  ['../../repair/repairWorkPeriodFieldHelp', '../directions/repair/form/repairWorkPeriodFieldHelp'],
  ['./repair/repairExecutorBankFields', './packages/directions/repair/form/repairExecutorBankFields'],
  ['./repair/repairContractWorkPeriod', './packages/directions/repair/form/repairContractWorkPeriod'],
  ['./repair/packageContractDisplay', './packages/directions/repair/form/packageContractDisplay'],
  ['@/views/admin/ContractDocuments/repair/repairExecutorBankFields', '@/views/admin/ContractDocuments/packages/directions/repair/form/repairExecutorBankFields'],
  ['@/views/admin/ContractDocuments/repair/repairContractPlaceholders', '@/views/admin/ContractDocuments/packages/directions/repair/form/repairContractPlaceholders'],
  ['@/views/admin/ContractDocuments/repair/templateEditorHistory', '@/views/admin/ContractDocuments/packages/shared/templateEditorHistory'],
  ['@/views/admin/ContractDocuments/repair/wordHtmlImport', '@/views/admin/ContractDocuments/packages/shared/wordHtmlImport'],
];

const stubs = [
  ['repairExecutorBankFields.ts', '../packages/directions/repair/form/repairExecutorBankFields'],
  ['repairExecutorBankFields.test.ts', '../packages/directions/repair/form/repairExecutorBankFields.test'],
  ['repairCustomerTemplateFields.ts', '../packages/directions/repair/form/repairCustomerTemplateFields'],
  ['repairInvoiceTemplateFields.ts', '../packages/directions/repair/form/repairInvoiceTemplateFields'],
  ['repairContractWorkPeriod.ts', '../packages/directions/repair/form/repairContractWorkPeriod'],
  ['repairContractWorkPeriod.test.ts', '../packages/directions/repair/form/repairContractWorkPeriod.test'],
  ['repairContractPlaceholders.ts', '../packages/directions/repair/form/repairContractPlaceholders'],
  ['cloneRepairPackageFormDataForCopy.ts', '../packages/directions/repair/form/cloneRepairPackageFormDataForCopy'],
  ['repairContractDateFieldHelp.ts', '../packages/directions/repair/form/repairContractDateFieldHelp'],
  ['repairWorkPeriodFieldHelp.ts', '../packages/directions/repair/form/repairWorkPeriodFieldHelp'],
  ['packageContractDisplay.ts', '../packages/directions/repair/form/packageContractDisplay'],
  ['repairPackageJournalSchedule.ts', '../packages/shared/repairPackageJournalSchedule'],
  ['templateEditorHistory.ts', '../packages/shared/templateEditorHistory'],
  ['wordHtmlImport.ts', '../packages/shared/wordHtmlImport'],
  ['excelToDocPrintHtml.ts', '../packages/shared/excelToDocPrintHtml'],
];

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walk(p, fn);
      continue;
    }
    if (/\.tsx?$/.test(ent.name)) fn(p);
  }
}

const roots = [
  path.join(ROOT, 'packages'),
  ROOT,
  'frontend/src/views/admin/Accounting',
];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  walk(root, (p) => {
    let c = fs.readFileSync(p, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
      if (c.includes(from)) {
        c = c.split(from).join(to);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(p, c);
  });
}

for (const [name, target] of stubs) {
  fs.writeFileSync(path.join(ROOT, 'repair', name), `export * from '${target}';\n`);
}

console.log('Phase 13 imports fixed and stubs created.');
