import { describe, expect, it } from 'vitest';

import { unifyContractDocumentTypographyInHtml } from './contractTemplateTypography';

const MIXED_ACT_HTML = `<p style="font-size: 12px; line-height: 1.3;">к договору</p>
<p style="line-height: 1.3; margin-bottom: 6pt;"><span style="font-size: 10pt;">Мы, нижеподписавшиеся</span></p>
<ol class="contractLegalList"><li style="line-height: 1.3; margin-bottom: 6pt;">Пункт</li></ol>
<table class="signTable signTableActHandwritten"><tr><td style="line-height: 1.3; margin-bottom: 6pt;">Исполнитель</td></tr></table>`;

const hasDom = typeof window !== 'undefined' && typeof DOMParser !== 'undefined';

describe.skipIf(!hasDom)('unifyContractDocumentTypographyInHtml', () => {
  it('wraps content in docPrint, removes mixed font-size and aligns line-height', () => {
    const normalized = unifyContractDocumentTypographyInHtml(MIXED_ACT_HTML);
    expect(normalized).toContain('docPrint');
    expect(normalized).toContain('docPrintContractCompact');
    expect(normalized).not.toMatch(/font-size:\s*12px/i);
    expect(normalized).not.toMatch(/font-size:\s*10pt/i);
    expect(normalized).toContain('line-height: 1.32');
    expect(normalized).not.toContain('line-height: 1.3');
    expect(normalized).not.toMatch(/signTableActHandwritten[\s\S]*line-height:\s*1\.3/i);
  });
});
