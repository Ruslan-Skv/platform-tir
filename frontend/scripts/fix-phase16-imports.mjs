import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'frontend/src');

const REPLACEMENTS = [
  // app routes → pages
  [
    '@/views/admin/ContractDocuments/ContractDocumentsHubPage',
    '@/views/admin/ContractDocuments/packages/pages/hub/ContractDocumentsHubPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsInstructionPage',
    '@/views/admin/ContractDocuments/packages/pages/instruction/ContractDocumentsInstructionPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsExecutorProfilesPage',
    '@/views/admin/ContractDocuments/packages/pages/requisites/ContractDocumentsExecutorProfilesPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsSignatoriesPage',
    '@/views/admin/ContractDocuments/packages/pages/signatories/ContractDocumentsSignatoriesPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsRepairSettingsPage',
    '@/views/admin/ContractDocuments/packages/pages/settings/ContractDocumentsRepairSettingsPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsMarkupSettingsPage',
    '@/views/admin/ContractDocuments/packages/pages/settings/ContractDocumentsMarkupSettingsPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsEstimatesPage',
    '@/views/admin/ContractDocuments/packages/pages/estimates/ContractDocumentsEstimatesPage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsEstimateWorkspacePage',
    '@/views/admin/ContractDocuments/packages/pages/estimates/ContractDocumentsEstimateWorkspacePage',
  ],
  [
    '@/views/admin/ContractDocuments/ContractDocumentsTemplatesLibraryPage',
    '@/views/admin/ContractDocuments/packages/pages/templates/ContractDocumentsTemplatesLibraryPage',
  ],
  [
    '@/views/admin/ContractDocuments/TemplateTrashModal',
    '@/views/admin/ContractDocuments/packages/pages/templates/TemplateTrashModal',
  ],
  // config
  [
    '@/views/admin/ContractDocuments/contractDocumentsContractsRoutes',
    '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes',
  ],
  [
    '@/views/admin/ContractDocuments/contractDocumentsListKinds',
    '@/views/admin/ContractDocuments/packages/config/contractDocumentsListKinds',
  ],
  // CSS — absolute alias (stable from any depth)
  [
    '@/views/admin/ContractDocuments/ContractDocuments.module.css',
    '@/views/admin/ContractDocuments/styles/ContractDocuments.module.css',
  ],
  // HelpTooltip
  [
    '@/views/admin/ContractDocuments/ContractDocumentsHelpTooltip',
    '@/views/admin/ContractDocuments/packages/shared/ui/ContractDocumentsHelpTooltip',
  ],
  // relative CSS in packages/pages (2 levels up was wrong path to root)
  ["from '../../ContractDocuments.module.css'", "from '../../styles/ContractDocuments.module.css'"],
  ["from '../../../ContractDocuments.module.css'", "from '../../../styles/ContractDocuments.module.css'"],
  [
    "from '../../../../ContractDocuments.module.css'",
    "from '../../../../styles/ContractDocuments.module.css'",
  ],
  // moved pages local CSS
  ["from './ContractDocuments.module.css'", "from '../../../styles/ContractDocuments.module.css'"],
  // listKinds relative in ContractsListPage
  ["from '../../contractDocumentsListKinds'", "from '../../config/contractDocumentsListKinds'"],
  // HelpTooltip relative in PackageDataTab
  ["from '../../../ContractDocumentsHelpTooltip'", "from '../ui/ContractDocumentsHelpTooltip'"],
  // estimatesListFilters path fix after move
  [
    "from './packages/pages/repairContractsListFilters'",
    "from '../repairContractsListFilters'",
  ],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;
  for (const [from, to] of REPLACEMENTS) {
    src = src.split(from).join(to);
  }
  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed++;
    console.log('updated:', path.relative(process.cwd(), file));
  }
}

console.log(`\nDone. ${changed} files updated.`);
