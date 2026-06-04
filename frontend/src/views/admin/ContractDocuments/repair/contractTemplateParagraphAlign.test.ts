import {
  applyHtmlParagraphAlign,
  patchHtmlOpenTagTextAlign,
  repairParagraphTextAlignInDom,
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

  it('repairParagraphTextAlignInDom hoists justify from nested span', () => {
    document.body.innerHTML = `
      <div class="docPrint docPrintContractCompact">
        <p style="text-align: center;">
          <span style="text-align: justify;">Мы, нижеподписавшиеся</span>
        </p>
      </div>
    `;
    repairParagraphTextAlignInDom(document.body);
    const p = document.querySelector('.docPrint p') as HTMLParagraphElement;
    expect(p.style.textAlign).toBe('justify');
    expect(p.style.textIndent).toBe('1.25cm');
    const span = p.querySelector('span');
    expect(span?.getAttribute('style') ?? '').not.toMatch(/text-align/i);
  });
});
