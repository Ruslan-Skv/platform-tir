import {
  CONTRACT_APPENDIX_REF_CLASS,
  isLikelyContractAppendixRefText,
  packageContractAppendixRefInHtml,
} from './contractTemplateAppendixRef';
import { packageContractTemplateStructureInHtml } from './contractTemplateStructure';
import { unifyContractDocumentTypographyInHtml } from './contractTemplateTypography';

const NESTED_ACT_HEADER_HTML = `<div class="docPrint docPrintContractCompact"><h2 style="text-align:center;font-weight:700"><span class=""><h3 style="text-align: center; margin: 11pt 0 5pt; line-height: 1.32"><span style="text-align: left">Приложение №3</span><span style="text-align: left">&nbsp;к договору №&nbsp;&nbsp;</span><span style="font-weight: 400">{{contract.number}} от&nbsp;{{contract.date}}</span></h3><h3 style="text-align: center; margin: 11pt 0 5pt; line-height: 1.32">Акт приема-передачи товара и выполненных работ</h3></span></h2><p>body</p></div>`;

function normalizeLikeTemplateLibrary(raw: string): string {
  return unifyContractDocumentTypographyInHtml(packageContractTemplateStructureInHtml(raw));
}

describe('contractTemplateAppendixRef', () => {
  it('detects appendix reference line', () => {
    expect(
      isLikelyContractAppendixRefText(
        'Приложение №3 к договору № {{contract.number}} от {{contract.date}}'
      )
    ).toBe(true);
    expect(isLikelyContractAppendixRefText('Акт приема-передачи товара')).toBe(false);
  });

  it('converts nested heading markup to left-aligned appendix paragraph', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = packageContractTemplateStructureInHtml(NESTED_ACT_HEADER_HTML);
    const docPrint = doc.body.querySelector('.docPrint')!;
    const appendix = docPrint.querySelector(`p.${CONTRACT_APPENDIX_REF_CLASS}`);
    expect(appendix).not.toBeNull();
    expect(appendix?.textContent).toContain('Приложение №3');
    expect(appendix?.textContent).toContain('{{contract.number}}');
    const actTitle = docPrint.querySelector('h2.contractDocTitle');
    expect(actTitle?.textContent).toContain('Акт приема-передачи');
    expect(docPrint.querySelector('h3')).toBeNull();
  });

  it('packageContractAppendixRefInHtml converts act subheading to h2 title', () => {
    const out = packageContractAppendixRefInHtml(NESTED_ACT_HEADER_HTML);
    expect(out).toContain('contractDocTitle');
    expect(out).not.toMatch(/<h3[^>]*>[\s\S]*?Акт\s+прием/i);
  });

  it('packageContractTemplateStructureInHtml converts appendix line', () => {
    const out = packageContractTemplateStructureInHtml(NESTED_ACT_HEADER_HTML);
    expect(out).toContain(CONTRACT_APPENDIX_REF_CLASS);
    expect(out).not.toMatch(/<h3[^>]*>[\s\S]*?Приложение\s*№/i);
  });

  it('normalizes through library template pipeline', () => {
    const out = normalizeLikeTemplateLibrary(NESTED_ACT_HEADER_HTML);
    expect(out).toContain(CONTRACT_APPENDIX_REF_CLASS);
    expect(out).not.toMatch(/<h3[^>]*>[\s\S]*?Приложение\s*№/i);
    expect(out).toContain('Акт приема-передачи');
  });
});
