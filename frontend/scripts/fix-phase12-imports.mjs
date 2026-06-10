import fs from 'fs';
import path from 'path';

const ROOT = 'frontend/src/views/admin/ContractDocuments';

const replacements = [
  ['../../../../repair/contractDocumentsEstimateSnapshot', './contractDocumentsEstimateSnapshot'],
  ['../../../../repair/estimateCustomWorkItems', './estimateCustomWorkItems'],
  ['../../../../repair/repairContractDiscount', './repairContractDiscount'],
  ['../../../repair/contractDocumentsEstimateSnapshot', '../../directions/repair/estimates/contractDocumentsEstimateSnapshot'],
  ['../../../repair/estimateCustomWorkItems', '../../directions/repair/estimates/estimateCustomWorkItems'],
  ['../../../repair/repairContractDiscount', '../../directions/repair/estimates/repairContractDiscount'],
  ['../../../repair/repairActTwinCopiesOnOnePageHtml', '../../directions/repair/documents/repairActTwinCopiesOnOnePageHtml'],
  ['../../../repair/productDirectionPackageKind', '../../config/productDirectionPackageKind'],
  ['../../../repair/repairDiscountFieldHelp', '../../directions/repair/estimates/repairDiscountFieldHelp'],
  ['../../repair/contractDocumentsEstimateSnapshot', '../directions/repair/estimates/contractDocumentsEstimateSnapshot'],
  ['../../repair/estimateCustomWorkItems', '../directions/repair/estimates/estimateCustomWorkItems'],
  ['../../repair/repairContractDiscount', '../directions/repair/estimates/repairContractDiscount'],
  ['../../repair/repairActTwinCopiesOnOnePageHtml', '../directions/repair/documents/repairActTwinCopiesOnOnePageHtml'],
  ['../../repair/productDirectionPackageKind', '../config/productDirectionPackageKind'],
  ['../../repair/repairDiscountFieldHelp', '../directions/repair/estimates/repairDiscountFieldHelp'],
  ['../../repair/repairContractsListFilters', './repairContractsListFilters'],
  ['../../repair/repairContractsListSort', './repairContractsListSort'],
  ['./repair/contractDocumentsEstimateSnapshot', './packages/directions/repair/estimates/contractDocumentsEstimateSnapshot'],
  ['./repair/estimateCustomWorkItems', './packages/directions/repair/estimates/estimateCustomWorkItems'],
  ['./repair/repairContractsListFilters', './packages/pages/repairContractsListFilters'],
  ['@/views/admin/ContractDocuments/repair/repairActTwinCopiesOnOnePageHtml', '@/views/admin/ContractDocuments/packages/directions/repair/documents/repairActTwinCopiesOnOnePageHtml'],
  ['@/views/admin/ContractDocuments/repair/productDirectionPackageKind', '@/views/admin/ContractDocuments/packages/config/productDirectionPackageKind'],
  ['@/views/admin/ContractDocuments/repair/estimateCustomWorkItems', '@/views/admin/ContractDocuments/packages/directions/repair/estimates/estimateCustomWorkItems'],
];

const skipDirs = new Set(['node_modules']);

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (skipDirs.has(ent.name)) continue;
      walk(p, fn);
      continue;
    }
    if (/\.tsx?$/.test(ent.name)) fn(p);
  }
}

walk(path.join(ROOT, 'packages'), (p) => {
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

walk(ROOT, (p) => {
  if (p.includes('/packages/')) return;
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

walk('frontend/src/views/admin/Accounting', (p) => {
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

walk('frontend/src/views/services', (p) => {
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

const stubs = [
  ['contractDocumentsEstimateSnapshot.ts', '../packages/directions/repair/estimates/contractDocumentsEstimateSnapshot'],
  ['estimateCustomWorkItems.ts', '../packages/directions/repair/estimates/estimateCustomWorkItems'],
  ['repairContractDiscount.ts', '../packages/directions/repair/estimates/repairContractDiscount'],
  ['repairDiscountFieldHelp.ts', '../packages/directions/repair/estimates/repairDiscountFieldHelp'],
  ['repairActTwinCopiesOnOnePageHtml.ts', '../packages/directions/repair/documents/repairActTwinCopiesOnOnePageHtml'],
  ['repairActTwinCopiesOnOnePageHtml.test.ts', '../packages/directions/repair/documents/repairActTwinCopiesOnOnePageHtml.test'],
  ['productDirectionPackageKind.ts', '../packages/config/productDirectionPackageKind'],
  ['repairContractsListFilters.ts', '../packages/pages/repairContractsListFilters'],
  ['repairContractsListSort.ts', '../packages/pages/repairContractsListSort'],
];

for (const [name, target] of stubs) {
  fs.writeFileSync(
    path.join(ROOT, 'repair', name),
    `export * from '${target}';\n`
  );
}

console.log('Phase 12 imports fixed and stubs created.');
