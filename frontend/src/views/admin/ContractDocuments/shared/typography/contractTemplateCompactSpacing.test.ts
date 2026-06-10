/**
 * @jest-environment jsdom
 */
import {
  CONTRACT_DENSE_SPACING_CLASS,
  applyContractDenseSpacingToHtml,
  htmlHasContractDenseSpacing,
  toggleContractParagraphSpacingInHtmlRange,
  toggleContractParagraphSpacingInHtmlWhole,
} from './contractTemplateCompactSpacing';

describe('contractTemplateCompactSpacing', () => {
  it('adds dense class and reduces paragraph margins', () => {
    const html = `<div class="docPrint">
      <p style="text-align: justify; margin: 0 0 10pt;">Абзац 1</p>
      <h2 style="margin: 16pt 0 8pt;">1. РАЗДЕЛ</h2>
      <p style="margin: 0 0 8pt;">Абзац 2</p>
    </div>`;

    const out = applyContractDenseSpacingToHtml(html);
    expect(htmlHasContractDenseSpacing(out)).toBe(true);
    expect(out).toContain(CONTRACT_DENSE_SPACING_CLASS);
    expect(out).toMatch(/margin:\s*0\s+0\s+4pt/i);
    expect(out).toMatch(/margin:\s*8pt\s+0\s+3pt/i);
  });

  it('toggles whole document dense off on second call', () => {
    const html = `<div class="docPrint"><p style="margin: 0 0 10pt;">A</p></div>`;
    const first = toggleContractParagraphSpacingInHtmlWhole(html);
    expect(first.dense).toBe(true);
    expect(htmlHasContractDenseSpacing(first.html)).toBe(true);

    const second = toggleContractParagraphSpacingInHtmlWhole(first.html);
    expect(second.dense).toBe(false);
    expect(htmlHasContractDenseSpacing(second.html)).toBe(false);
    expect(second.html).toMatch(/margin:\s*0\s+0\s+6pt/i);
  });

  it('toggles only selected paragraphs in html range', () => {
    const html = `<div class="docPrint">
      <p style="margin: 0 0 10pt;">Первый</p>
      <p style="margin: 0 0 10pt;">Второй</p>
      <p style="margin: 0 0 10pt;">Третий</p>
    </div>`;
    const selectionRange = (source: string) => {
      const wordStart = source.indexOf('Второй');
      const wordEnd = wordStart + 'Второй'.length;
      return { start: wordStart, end: wordEnd };
    };

    const first = toggleContractParagraphSpacingInHtmlRange(
      html,
      ...Object.values(selectionRange(html))
    );
    expect(first.dense).toBe(true);
    expect(first.blockCount).toBe(1);
    expect(first.html).toContain('data-contract-paragraph-spacing="dense"');
    expect(first.html).toMatch(/margin:\s*0\s+0\s+4pt/);
    expect(first.html).toContain('margin: 0 0 10pt');

    const secondRange = selectionRange(first.html);
    const second = toggleContractParagraphSpacingInHtmlRange(
      first.html,
      secondRange.start,
      secondRange.end
    );
    expect(second.dense).toBe(false);
    expect(second.html).toMatch(/margin:\s*0\s+0\s+6pt/);
  });
});
