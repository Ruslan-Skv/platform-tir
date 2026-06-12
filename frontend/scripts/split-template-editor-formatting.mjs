import fs from 'node:fs';
import path from 'node:path';

const editorDir = path.resolve(
  'src/views/admin/ContractDocuments/packages/pages/templates/library/editor'
);
const srcPath = path.join(editorDir, 'templateEditorFormatting.ts');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const typoHeader = `import {
  collectVisualBlocksInRange,
  parseExplicitTextAlign,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateParagraphAlign';

import type { ParagraphTextAlign } from './templateEditorFormatToolbar';

`;

const inlineBody = [...lines.slice(7, 340), '', ...lines.slice(760)].join('\n');
const typoBody = lines.slice(341, 759).join('\n');

fs.writeFileSync(
  path.join(editorDir, 'templateEditorFormattingInline.ts'),
  inlineBody + '\n'
);
fs.writeFileSync(
  path.join(editorDir, 'templateEditorFormattingTypography.ts'),
  typoHeader + typoBody + '\n'
);
fs.unlinkSync(srcPath);
console.log('split complete');
