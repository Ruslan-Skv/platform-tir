/**
 * @jest-environment jsdom
 */
import { normalizeContractLegalListInHtml } from './contractLegalList';
import { CONTRACT_LEGAL_LIST_CLASS } from './contractLegalList';
import {
  CONTRACT_REMARK_BLANK_LINES_CLASS,
  insertContractRemarkBlankLinesInVisualEditor,
} from './contractTemplateRemarkBlankLines';

describe('contractTemplateRemarkBlankLines', () => {
  it('inserts blank lines after current list item without breaking ol', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
  <li data-section="1">Пункт 2.3</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    const text = li.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, text.length);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    expect(insertContractRemarkBlankLinesInVisualEditor(editor)).toBe(true);
    expect(editor.querySelectorAll(`li.${CONTRACT_REMARK_BLANK_LINES_CLASS}`).length).toBe(1);
    expect(editor.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).length).toBe(1);
    expect(editor.querySelectorAll('ol > li').length).toBe(2);
  });

  it('normalize keeps remark blank lines in list', () => {
    const source = `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">До</li>
<li class="${CONTRACT_REMARK_BLANK_LINES_CLASS}" data-section="1" data-blank-lines="2">
<p class="contractRemarkBlankLine"><br></p><p class="contractRemarkBlankLine"><br></p></li>
<li data-section="1">После</li>
</ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    expect(normalized).toContain(CONTRACT_REMARK_BLANK_LINES_CLASS);
    expect(normalized).toContain('До');
    expect(normalized).toContain('После');
  });
});
