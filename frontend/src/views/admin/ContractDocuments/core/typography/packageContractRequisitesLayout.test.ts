/**
 * @jest-environment jsdom
 */
import {
  alignContractRequisitesBlockSignatures,
  buildPackageContractRequisitesInsertHtmlForToolbar,
  isPackageRequisitesSignaturesTableHtml,
  normalizeRequisitesBlockTypography,
} from './packageContractRequisitesLayout';

describe('packageContractRequisitesLayout', () => {
  it('detects requisites table with ИСПОЛНИТЕЛЬ and signatures', () => {
    const table = `<table>
      <tr><td><p>ИСПОЛНИТЕЛЬ</p></td><td><p>ЗАКАЗЧИК</p></td></tr>
      <tr>
        <td><p>ИП Тест</p><p>_____________ / Иванов</p><p>м.п.</p></td>
        <td><p>Пупкин</p><p>_____________/ Пупкин</p></td>
      </tr>
    </table>`;
    expect(isPackageRequisitesSignaturesTableHtml(table)).toBe(true);
  });

  it('merges header row with data row and aligns signatures', () => {
    const html = `<div class="docPrint">${`<table>
      <tr><td><p>ИСПОЛНИТЕЛЬ</p></td><td><p>ЗАКАЗЧИК</p></td></tr>
      <tr>
        <td>
          <p>ИП Сквиря</p><p>ИНН 123</p><p>Банк</p>
          <p>_____________ / Петрова</p><p>м.п.</p>
        </td>
        <td>
          <p>Пупкин Иван</p><p>Тел. 123</p>
          <p>_____________/ Пупкин</p>
        </td>
      </tr>
    </table>`}</div>`;

    const out = alignContractRequisitesBlockSignatures(html);
    expect(out).toContain('contractRequisitesSignaturesRow');
    expect(out).toMatch(/_____________\s*\/\s*Петрова/);
    expect(out).toMatch(/_____________\/\s*Пупкин/);
    const sigRow = out.match(/<tr[^>]*contractRequisitesSignaturesRow[\s\S]*?<\/tr>/i)?.[0] ?? '';
    expect(sigRow).toContain('Петрова');
    expect(sigRow).toContain('Пупкин');
  });

  it('centers requisites body paragraphs and removes contract indent', () => {
    const html = `<table class="contractRequisitesBlock">
      <tr class="contractRequisitesRequisitesRow">
        <td><div class="contractRequisitesColBody">
          <p style="text-align: center;">ИСПОЛНИТЕЛЬ</p>
          <p style="text-align: justify; text-indent: 1.25cm;">{{executor.companyName}}</p>
          <p style="text-align: justify; text-indent: 1.25cm;">ИНН 123</p>
        </div></td>
        <td><div class="contractRequisitesColBody">
          <p style="text-align: center;">ЗАКАЗЧИК</p>
          <p style="text-align: justify; text-indent: 1.25cm;">Пупкин</p>
        </div></td>
      </tr>
    </table>`;
    const out = normalizeRequisitesBlockTypography(html);
    expect(out).toContain('{{executor.companyName}}');
    expect(out).not.toMatch(/text-align:\s*justify/i);
    expect(out).toMatch(/text-align:\s*center/i);
  });

  it('strips bold markup inside requisites block (customer column)', () => {
    const html = `<p>Договор</p><strong><em><table class="contractRequisitesBlock">
      <tr class="contractRequisitesRequisitesRow">
        <td><div class="contractRequisitesColBody"><p>ИСПОЛНИТЕЛЬ</p></div></td>
        <td><div class="contractRequisitesColBody"><p>ЗАКАЗЧИК</p><strong>Жирный заказчик</strong></div></td>
      </tr>
    </table></em></strong>`;

    const out = normalizeRequisitesBlockTypography(html);
    expect(out).not.toContain('<strong>Жирный заказчик</strong>');
    expect(out).toContain('Жирный заказчик');
  });

  it('toolbar insert block has aligned signatures and embedded flag', () => {
    const html = buildPackageContractRequisitesInsertHtmlForToolbar();
    expect(html).toContain('data-contract-signatures-embedded="1"');
    expect(html).toContain('contractRequisitesSignaturesRow');
    expect(html).toContain('ИСПОЛНИТЕЛЬ');
    expect(html).toContain('{{customer.requisitesHtml|plain}}');
  });

  it('aligns signatures in single-row two-column layout via flex', () => {
    const html = `<table>
      <tr>
        <td>
          <p>ИСПОЛНИТЕЛЬ</p>
          <p>Длинные реквизиты исполнителя</p><p>ещё строка</p><p>ещё</p>
          <p>_____________ / Петрова</p><p>м.п.</p>
        </td>
        <td>
          <p>ЗАКАЗЧИК</p>
          <p>Коротко</p>
          <p>_____________/ Пупкин</p>
        </td>
      </tr>
    </table>`;

    const out = alignContractRequisitesBlockSignatures(html);
    expect(
      out.includes('contractRequisitesColInner') || out.includes('contractRequisitesSignaturesRow')
    ).toBe(true);
  });
});
