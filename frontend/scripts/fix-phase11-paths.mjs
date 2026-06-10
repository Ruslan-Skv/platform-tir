import fs from 'fs';
import path from 'path';

const base = 'frontend/src/views/admin/ContractDocuments/packages/directions/repair';

for (const sub of ['workOrders', 'documents', 'estimates']) {
  const dir = path.join(base, sub);
  for (const f of fs.readdirSync(dir)) {
    if (!/\.tsx?$/.test(f)) continue;
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf8');
    const o = c;
    c = c.replaceAll('../../../repair/', '../../../../repair/');
    if (sub === 'documents') {
      c = c.replaceAll("from '../../templates'", "from '../../../templates'");
    }
    if (sub === 'workOrders') {
      c = c.replaceAll('../../shared/hub/', '../../../shared/hub/');
    }
    if (c !== o) {
      fs.writeFileSync(p, c);
      console.log('fixed', p);
    }
  }
}

const pages = 'frontend/src/views/admin/ContractDocuments/packages/pages';
for (const f of fs.readdirSync(pages)) {
  if (!/\.tsx?$/.test(f)) continue;
  const p = path.join(pages, f);
  let c = fs.readFileSync(p, 'utf8');
  const o = c;
  c = c.replaceAll('../estimates/', '../directions/repair/estimates/');
  c = c.replaceAll('../workOrders/', '../directions/repair/workOrders/');
  if (c !== o) {
    fs.writeFileSync(p, c);
    console.log('fixed', p);
  }
}

const cfg = 'frontend/src/views/admin/ContractDocuments/packages/config';
for (const f of fs.readdirSync(cfg)) {
  if (!/\.tsx?$/.test(f)) continue;
  const p = path.join(cfg, f);
  let c = fs.readFileSync(p, 'utf8');
  const o = c;
  c = c.replaceAll(
    '../documents/repairDocumentTabs',
    '../directions/repair/documents/repairDocumentTabs'
  );
  if (c !== o) {
    fs.writeFileSync(p, c);
    console.log('fixed', p);
  }
}

console.log('Done.');
