import { readFileSync } from 'fs';
import { resolve } from 'path';

import { applyTemplate } from '@/views/admin/ContractDocuments/core/applyTemplate';
import { buildPrintableHtmlDocument } from '@/views/admin/ContractDocuments/core/printDocument';

const seed = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../backend/prisma/seed-data/windows-library-templates.seed.json'),
    'utf8'
  )
) as { items: Array<{ tabId: string; content: string }> };

const template = seed.items.find((i) => i.tabId === 'contract')!.html;

const data = {
  contract: {
    number: '3742о-2',
    date: '08.10.2026',
    contractCost: '139263',
    productsCost: '104636',
    worksCost: '34627',
    workPeriod: '10',
    totalAmount: '139263',
    prepaymentAmount: '97484',
  },
  customer: { fullName: 'Богданова Елена Геннадьевна' },
  object: { objectAddress: 'г. Мурманск, ул. Каплина 13-34' },
  executor: { companyName: 'ИП Сквиря Руслан Васильевич' },
  estimate: { total: '34627' },
};

function htmlToText(html: string): string {
  const container = window.document.createElement('div');
  container.innerHTML = html;
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('windows contract PDF text integrity (bug: пропадает текст пунктов)', () => {
  it('buildPrintableHtmlDocument не теряет текст шаблона', () => {
    const filled = applyTemplate(template, data);
    const before = htmlToText(filled);

    const printable = buildPrintableHtmlDocument(filled, 'Договор', {
      contractCompact: true,
    });
    const after = htmlToText(printable);

    const fragments = [
      'принять изделия и работы, оплатить их',
      'в порядке и сроки, установленные договором',
      'переходит от Исполнителя к Заказчику',
      'приема-передачи товара и выполненных работ',
      'Данная предоплата является оплатой материалов (ПВХ-изделий) и части работ',
      'после уведомления Заказчика о готовности изделий к монтажу',
    ];
    for (const fragment of fragments) {
      // Сверяем нормализованные строки: NBSP и пробелы эквивалентны.
      const norm = (s: string) => s.replace(/\u00A0/g, ' ');
      expect(norm(after)).toContain(fragment);
    }
    // Итоговое количество символов не должно уменьшиться заметно.
    expect(after.length).toBeGreaterThanOrEqual(before.length - 5);
  });
});
