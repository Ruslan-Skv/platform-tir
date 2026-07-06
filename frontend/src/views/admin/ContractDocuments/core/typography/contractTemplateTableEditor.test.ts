/**
 * @jest-environment jsdom
 */
import {
  peelEmbeddedTrailingSectionHeaderHtml,
  repairOrphanAppendixListRowsInDom,
  tryInsertNumberedListItemInCell,
} from './contractTemplateTableEditor';

describe('peelEmbeddedTrailingSectionHeaderHtml', () => {
  it('peels trailing 3.2 header from 3.1.4 content cell', () => {
    const html =
      'В течение двух календарных дней после уведомления.<br><br>3.2. Заказчик имеет право:';
    const { keptHtml, headerText } = peelEmbeddedTrailingSectionHeaderHtml(html, '3.1.4');
    expect(headerText).toBe('3.2. Заказчик имеет право:');
    expect(keptHtml).toBe('В течение двух календарных дней после уведомления.');
  });

  it('does not peel when header number matches clause number', () => {
    const html = 'Текст пункта 3.1.4 без лишнего';
    const { keptHtml, headerText } = peelEmbeddedTrailingSectionHeaderHtml(html, '3.1.4');
    expect(headerText).toBeNull();
    expect(keptHtml).toBe(html);
  });
});

describe('repairOrphanAppendixListRowsInDom', () => {
  it('merges orphan appendix row into preceding ol', () => {
    const host = document.createElement('div');
    host.innerHTML = `<table>
      <tr><td>7.3</td><td colspan="10"><ol style="margin: 0 0 8pt 22px">
        <li style="margin: 0 0 5pt">Приложение № 1 «Смета»;</li>
        <li style="margin: 0 0 5pt">Приложение № 5 «Контрольный лист»;</li>
      </ol></td></tr>
      <tr><td>&nbsp;</td><td colspan="10">6. Приложение № 6 «Акт приема-передачи материалов».</td></tr>
    </table>`;

    repairOrphanAppendixListRowsInDom(host);

    const items = host.querySelectorAll('ol li');
    expect(items).toHaveLength(3);
    expect(items[2].textContent).toContain('Приложение № 6');
    expect(host.querySelectorAll('table tr')).toHaveLength(1);
  });
});

describe('tryInsertNumberedListItemInCell', () => {
  it('appends li when cursor is inside ol in table cell', () => {
    document.body.innerHTML = `<table><tr><td>7.3</td><td><ol><li>Приложение № 1;</li><li>Приложение № 5;</li></ol></td></tr></table>`;
    const cell = document.querySelector('td:last-child') as HTMLTableCellElement;
    const secondLi = cell.querySelector('li:last-child') as HTMLLIElement;

    const range = document.createRange();
    range.selectNodeContents(secondLi);
    range.collapse(false);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const newLi = tryInsertNumberedListItemInCell(cell, sel);
    expect(newLi).not.toBeNull();
    expect(cell.querySelectorAll('ol li')).toHaveLength(3);
  });
});
