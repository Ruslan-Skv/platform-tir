/**
 * @jest-environment jsdom
 */
import { normalizeContractHeaderCustomerTypography } from './contractTemplateHeader';

describe('contractTemplateHeader', () => {
  it('removes bold/italic from customer data in preamble, keeps party role labels', () => {
    const html = `<div class="docPrint">
      <h1>ДОГОВОР</h1>
      <p style="text-align: center;">г. Мурманск</p>
      <p>
        <strong>ООО Исполнитель</strong>, «<strong>Подрядчик</strong>», с одной стороны, и
        <strong><em>Иванов Иван Иванович</em></strong>, «<strong>Заказчик</strong>», с другой стороны.
      </p>
      <h2>1. ПРЕДМЕТ</h2>
    </div>`;

    const out = normalizeContractHeaderCustomerTypography(html);
    expect(out).toContain('<strong>ООО Исполнитель</strong>');
    expect(out).toContain('<strong>Подрядчик</strong>');
    expect(out).toContain('<strong>Заказчик</strong>');
    expect(out).not.toContain('<strong><em>Иванов');
    expect(out).not.toContain('<em>Иванов');
    expect(out).toContain('Иванов Иван Иванович');
  });
});
