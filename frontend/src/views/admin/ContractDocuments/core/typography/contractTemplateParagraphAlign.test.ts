import {
  applyHtmlParagraphAlign,
  applyVisualParagraphAlign,
  collectVisualBlocksInRange,
  fixParagraphTextAlignInDom,
  patchHtmlOpenTagTextAlign,
} from './contractTemplateParagraphAlign';

describe('contractTemplateParagraphAlign', () => {
  it('patchHtmlOpenTagTextAlign sets justify and indent on preamble p', () => {
    const open = '<p style="text-align: center; margin: 0 0 6pt;">';
    const out = patchHtmlOpenTagTextAlign(open, 'justify');
    expect(out).toMatch(/text-align:\s*justify/i);
    expect(out).toMatch(/text-indent:\s*1\.25cm/i);
    expect(out).not.toMatch(/text-align:\s*center/i);
  });

  it('applyHtmlParagraphAlign patches selected block', () => {
    const html = '<div class="docPrint"><p style="text-align: center;">Абзац</p></div>';
    const start = html.indexOf('Абзац');
    const end = start + 'Абзац'.length;
    const out = applyHtmlParagraphAlign(html, start, end, 'justify');
    expect(out).toContain('text-align: justify');
    expect(out).toContain('text-indent: 1.25cm');
  });

  it('fixParagraphTextAlignInDom hoists justify from nested span', () => {
    document.body.innerHTML = `
      <div class="docPrint docPrintContractCompact">
        <p style="text-align: center;">
          <span style="text-align: justify;">Мы, нижеподписавшиеся</span>
        </p>
      </div>
    `;
    fixParagraphTextAlignInDom(document.body);
    const p = document.querySelector('.docPrint p') as HTMLParagraphElement;
    expect(p.style.textAlign).toBe('justify');
    expect(p.style.textIndent).toBe('1.25cm');
    const span = p.querySelector('span');
    expect(span?.getAttribute('style') ?? '').not.toMatch(/text-align/i);
  });

  it('collectVisualBlocksInRange keeps inner paragraph inside table cell', () => {
    document.body.innerHTML = `
      <div id="editor">
        <div class="docPrint">
          <table><tbody><tr><td>
            <p>3. СРОКИ</p>
            <p>Текст раздела</p>
          </td></tr></tbody></table>
        </div>
      </div>
    `;
    const editor = document.getElementById('editor') as HTMLElement;
    const heading = editor.querySelector('p') as HTMLParagraphElement;
    const range = document.createRange();
    range.selectNodeContents(heading);
    const blocks = collectVisualBlocksInRange(editor, range);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.tagName).toBe('P');
    expect(blocks[0]?.textContent).toContain('3. СРОКИ');
  });

  it('applyVisualParagraphAlign centers only selected heading inside table cell', () => {
    document.body.innerHTML = `
      <div id="editor">
        <div class="docPrint">
          <table><tbody><tr><td>
            <p>3. СРОКИ</p>
            <p style="text-align: justify;">Текст раздела</p>
          </td></tr></tbody></table>
        </div>
      </div>
    `;
    const editor = document.getElementById('editor') as HTMLElement;
    const heading = editor.querySelector('p') as HTMLParagraphElement;
    const range = document.createRange();
    range.selectNodeContents(heading);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    applyVisualParagraphAlign(editor, 'center');
    const paragraphs = editor.querySelectorAll('p');
    expect((paragraphs[0] as HTMLParagraphElement).style.textAlign).toBe('center');
    expect((paragraphs[1] as HTMLParagraphElement).style.textAlign).toBe('justify');
    expect((editor.querySelector('td') as HTMLTableCellElement).style.textAlign).not.toBe('center');
  });

  it('applyHtmlParagraphAlign patches inner p inside td, not the cell', () => {
    const html =
      '<div class="docPrint"><table><tr><td><p>3. СРОКИ</p><p>Текст</p></td></tr></table></div>';
    const start = html.indexOf('3. СРОКИ');
    const end = start + '3. СРОКИ'.length;
    const out = applyHtmlParagraphAlign(html, start, end, 'center');
    expect(out).toMatch(/<p[^>]*text-align:\s*center[^>]*>3\. СРОКИ<\/p>/i);
    expect(out).not.toMatch(/<td[^>]*text-align:\s*center/i);
  });
});
