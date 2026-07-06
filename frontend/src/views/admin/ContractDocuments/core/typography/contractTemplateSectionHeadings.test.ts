/**
 * @jest-environment jsdom
 */
import {
  isLikelyContractSectionHeadingText,
  normalizeContractSectionHeadingsInHtml,
} from './contractTemplateSectionHeadings';
import { packageContractTemplateStructureInHtml } from './contractTemplateStructure';

describe('contractTemplateSectionHeadings', () => {
  it('detects numbered section headings', () => {
    expect(isLikelyContractSectionHeadingText('3. СРОКИ')).toBe(true);
    expect(isLikelyContractSectionHeadingText('10. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН')).toBe(true);
    expect(isLikelyContractSectionHeadingText('3.1. Срок поставки')).toBe(false);
    expect(isLikelyContractSectionHeadingText('Договор подряда № 1')).toBe(false);
  });

  it('normalizes h3 requisites heading to p>b like other sections', () => {
    const html = `<div class="docPrint docPrintContractCompact">
      <p style="text-align: center; margin: 0 0 6pt; line-height: 1.32"><b>9. ПРИЛОЖЕНИЯ</b></p>
      <h3 style="font-weight: 600; margin: 11pt 0 5pt;">
        <span><span style="font-size: 9pt;"><span style="font-size: 10pt;">10. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</span></span></span>
      </h3>
      <table class="contractRequisitesBlock"><tr><td><p>ИСПОЛНИТЕЛЬ</p></td></tr></table>
    </div>`;
    const out = normalizeContractSectionHeadingsInHtml(html);
    expect(out).not.toContain('<h3');
    expect(out).toMatch(
      /<p[^>]*text-align:\s*center[^>]*><b>\s*10\. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН\s*<\/b><\/p>/i
    );
    expect(out).toMatch(/<p[^>]*text-align:\s*center[^>]*><b>\s*9\. ПРИЛОЖЕНИЯ\s*<\/b><\/p>/i);
  });

  it('runs during package contract structure pipeline', () => {
    const html = `<div class="docPrint docPrintContractCompact">
      <h3><span style="font-size: 10pt;">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</span></h3>
      <p>Текст</p>
    </div>`;
    const out = packageContractTemplateStructureInHtml(html);
    expect(out).not.toContain('<h3');
    expect(out).toContain('<b>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</b>');
  });
});
