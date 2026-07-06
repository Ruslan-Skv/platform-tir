import { normalizeTemplateHtmlWhitespace } from './templatesLibraryHtmlNormalize';

describe('normalizeTemplateHtmlWhitespace', () => {
  it('soft mode preserves spaces between adjacent inline spans', () => {
    const source =
      '<div class="docPrint"><p><span>Принять </span><span>двери</span> и <span>выполненные </span><span>работы</span></p></div>';
    const out = normalizeTemplateHtmlWhitespace(source, 'soft');
    expect(out).toContain('<span>Принять </span><span>двери</span>');
    expect(out).toContain('<span>выполненные </span><span>работы</span>');
    expect(out).not.toContain('<span>Принять</span><span>двери</span>');
    expect(out).not.toContain('<span>выполненные</span><span>работы</span>');
    const container = document.createElement('div');
    container.innerHTML = out;
    expect(container.textContent).toContain('Принять двери');
    expect(container.textContent).toContain('выполненные работы');
  });

  it('soft mode collapses internal runs without gluing words in one node', () => {
    const source = '<div class="docPrint"><p>Стоимость   дверных   изделий</p></div>';
    const out = normalizeTemplateHtmlWhitespace(source, 'soft');
    expect(out).toContain('Стоимость дверных изделий');
  });
});
