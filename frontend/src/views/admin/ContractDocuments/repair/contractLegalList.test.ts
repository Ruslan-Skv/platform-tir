/**
 * @jest-environment jsdom
 */
import {
  CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER,
  changeContractLegalListLevel,
  getContractLegalLiDirectText,
  getContractLegalListContext,
  handleContractLegalListBackspace,
  handleContractLegalListEnter,
  handleContractLegalListShiftEnter,
  isContractLegalLiEffectivelyEmpty,
  normalizeContractLegalListInHtml,
} from './contractLegalList';
import { CONTRACT_LEGAL_LIST_CLASS } from './contractLegalList';

function buildNestedListHtml(withEmptySubItem = false): string {
  const emptySub = withEmptySubItem ? '<li data-section="1"></li>' : '';
  return `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Пункт 1
    <ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
      <li data-section="1">Подпункт 1.1.1</li>
      ${emptySub}
    </ol>
  </li>
  <li data-section="1">Пункт 2</li>
</ol>
</div>`;
}

function placeCaretIn(node: Node, offset = 0): void {
  const range = document.createRange();
  if (node.nodeType === Node.TEXT_NODE) {
    range.setStart(node, Math.min(offset, node.textContent?.length ?? 0));
  } else if (node instanceof HTMLElement) {
    range.selectNodeContents(node);
    range.collapse(true);
  }
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('contractLegalList', () => {
  it('getContractLegalLiDirectText ignores nested list text', () => {
    document.body.innerHTML = buildNestedListHtml(true);
    const outer = document.querySelector('ol > li') as HTMLLIElement;
    expect(getContractLegalLiDirectText(outer)).toBe('Пункт 1');
    const inner = document.querySelector('ol ol > li') as HTMLLIElement;
    expect(getContractLegalLiDirectText(inner)).toBe('Подпункт 1.1.1');
    const emptyInner = document.querySelector('ol ol > li:last-child') as HTMLLIElement;
    expect(isContractLegalLiEffectivelyEmpty(emptyInner)).toBe(true);
  });

  it('outdent promotes sub-item to root level', () => {
    document.body.innerHTML = buildNestedListHtml(false);
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const subLi = document.querySelector('ol ol > li:first-child') as HTMLLIElement;
    placeCaretIn(subLi.firstChild ?? subLi);

    const ctx = getContractLegalListContext(editor, subLi);
    expect(ctx?.depth).toBe(2);

    expect(changeContractLegalListLevel(editor, 'outdent')).toBe(true);

    const rootOl = editor.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`) as HTMLOListElement;
    const rootItems = Array.from(rootOl.children).filter((n) => n.tagName === 'LI');
    expect(rootItems.length).toBe(3);
    expect((rootItems[1] as HTMLLIElement).textContent).toContain('Подпункт 1.1.1');
  });

  it('Enter in empty last sub-item exits to paragraph after root list', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
  <li data-section="1">Раздел 3
    <ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
      <li data-section="1">Подпункт 3.3</li>
      <li data-section="1"></li>
    </ol>
  </li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const emptySub = document.querySelector('ol ol > li:last-child') as HTMLLIElement;
    placeCaretIn(emptySub);

    expect(handleContractLegalListEnter(editor)).toBe(true);
    expect(editor.querySelectorAll('ol ol > li').length).toBe(1);

    const p = editor.querySelector('ol + p') as HTMLParagraphElement;
    expect(p).not.toBeNull();
    const sel = window.getSelection();
    expect(p.contains(sel?.anchorNode ?? null)).toBe(true);
  });

  it('Enter in empty middle sub-item focuses previous sub-item', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
  <li data-section="1">Пункт 1
    <ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
      <li data-section="1">Подпункт 1.1</li>
      <li data-section="1"></li>
      <li data-section="1">Подпункт 1.3</li>
    </ol>
  </li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const emptySub = document.querySelector('ol ol > li:nth-child(2)') as HTMLLIElement;
    placeCaretIn(emptySub);

    expect(handleContractLegalListEnter(editor)).toBe(true);
    expect(editor.querySelectorAll('ol ol > li').length).toBe(2);

    const sel = window.getSelection();
    const anchorLi =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('li')
        : sel?.anchorNode?.parentElement?.closest('li');
    expect(anchorLi?.textContent).toContain('Подпункт 1.1');
  });

  it('Enter after root item creates empty li without placeholder', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Строка 1.2</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    const textNode = li.firstChild as Text;
    placeCaretIn(textNode, textNode.length);

    expect(handleContractLegalListEnter(editor)).toBe(true);

    const items = editor.querySelectorAll('ol > li');
    expect(items.length).toBe(2);
    expect(getContractLegalLiDirectText(items[1] as HTMLLIElement)).toBe('');
  });

  it('outdent on empty root item 1.3 removes it and focuses previous', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Пункт 1.2</li>
  <li data-section="1">${CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER}</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const emptyItem = editor.querySelector('ol > li:last-child') as HTMLLIElement;
    placeCaretIn(emptyItem);

    expect(changeContractLegalListLevel(editor, 'outdent')).toBe(true);
    expect(editor.querySelectorAll('ol > li').length).toBe(1);

    const sel = window.getSelection();
    const anchorLi =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('li')
        : sel?.anchorNode?.parentElement?.closest('li');
    expect(anchorLi?.textContent).toContain('Пункт 1.2');
  });

  it('Backspace at end of subclause deletes text and does not jump to parent item', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
  <li data-section="1">Раздел 2
    <ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
      <li data-section="1">Подпункт 2.3 с текстом</li>
    </ol>
  </li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const subLi = document.querySelector('ol ol > li') as HTMLLIElement;
    const textNode = subLi.firstChild as Text;
    placeCaretIn(textNode, textNode.length);

    expect(handleContractLegalListBackspace(editor)).toBe(false);

    const sel = window.getSelection();
    const anchorLi =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('li')
        : sel?.anchorNode?.parentElement?.closest('li');
    expect(anchorLi).toBe(subLi);
  });

  it('Backspace at start of non-empty subclause does not outdent to parent', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
  <li data-section="1">Раздел 2
    <ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
      <li data-section="1">АБВ</li>
    </ol>
  </li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const subLi = document.querySelector('ol ol > li') as HTMLLIElement;
    const textNode = subLi.firstChild as Text;
    placeCaretIn(textNode, 1);

    const rootOl = editor.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`) as HTMLOListElement;
    expect(handleContractLegalListBackspace(editor)).toBe(false);
    expect(Array.from(rootOl.children).filter((n) => n.tagName === 'LI').length).toBe(1);
    expect(editor.querySelectorAll('ol ol > li').length).toBe(1);
    expect(subLi.textContent).toBe('АБВ');
  });

  it('Backspace on placeholder root item removes it without merging text', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Пункт 1.2</li>
  <li data-section="1">${CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER}</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const placeholderItem = editor.querySelector('ol > li:last-child') as HTMLLIElement;
    placeCaretIn(placeholderItem);

    expect(handleContractLegalListBackspace(editor)).toBe(true);
    expect(editor.querySelectorAll('ol > li').length).toBe(1);
    expect(editor.querySelector('ol > li')?.textContent).toBe('Пункт 1.2');
  });

  it('Enter at end of multiline item places caret in new empty sibling', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Строка 1<br>Строка 2</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    const lastText = li.lastChild;
    expect(lastText?.nodeType).toBe(Node.TEXT_NODE);
    placeCaretIn(lastText as Text, (lastText as Text).length);

    expect(handleContractLegalListEnter(editor)).toBe(true);

    const items = editor.querySelectorAll('ol > li');
    expect(items.length).toBe(2);
    const sel = window.getSelection();
    expect(sel?.anchorNode).not.toBeNull();
    expect(items[1]?.contains(sel?.anchorNode ?? null)).toBe(true);
  });

  it('Enter inside sign table creates empty sibling li without moving table', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Исполнитель передал:
    <table class="signTable"><tr>
      <td>Подрядчик:</td><td>Заказчик</td>
    </tr></table>
  </li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    const cell = li.querySelector('td') as HTMLTableCellElement;
    placeCaretIn(cell.firstChild as Text, (cell.firstChild as Text).length);

    expect(handleContractLegalListEnter(editor)).toBe(true);

    const rootItems = editor.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS} > li`);
    expect(rootItems.length).toBe(2);
    expect(rootItems[0]?.querySelector('table')).not.toBeNull();
    expect(rootItems[1]?.querySelector('table')).toBeNull();
    const sel = window.getSelection();
    expect(rootItems[1]?.contains(sel?.anchorNode ?? null)).toBe(true);
  });

  it('Enter before sign table does not move table into new item', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Строка перед таблицей<table class="signTable"><tr><td>x</td></tr></table></li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    const textNode = li.firstChild as Text;
    placeCaretIn(textNode, textNode.length);

    expect(handleContractLegalListEnter(editor)).toBe(true);

    const items = editor.querySelectorAll('ol > li');
    expect(items.length).toBe(2);
    expect(items[0]?.querySelector('table')).not.toBeNull();
    expect(items[1]?.querySelector('table')).toBeNull();
  });

  it('normalize unwraps nested decimal ol around contractLegalList and drops empty li', () => {
    const source = `<p>Мы, нижеподписавшиеся…</p>
<ol style="list-style-type: decimal;">
<li>Исполнитель передал, Заказчик принял:
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
<li data-section="1">ПВХ-изделия согласно Спецификации;</li>
<li data-section="1">Результат выполненных монтажных работ;</li>
<li data-section="1"></li>
</ol>
</li>
</ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    expect(normalized).not.toMatch(/<ol[^>]*style="[^"]*decimal/i);
    expect(normalized.match(/contractLegalList/g)?.length).toBe(2);
    expect(normalized).not.toMatch(/<li[^>]*data-section="1"[^>]*>\s*<\/li>/);
    expect(normalized).toContain('Исполнитель передал, Заказчик принял:');
    expect(normalized).toContain('ПВХ-изделия');
    const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
    const legalOl = doc.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    const firstLi = legalOl?.firstElementChild;
    expect(firstLi?.textContent).toContain('Исполнитель передал');
    expect(firstLi?.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS} > li`)).not.toBeNull();
    expect(legalOl?.children.length).toBe(1);
  });

  it('moves intro paragraph before legal list into parent item with nested subclauses', () => {
    const source = `<p>Мы, нижеподписавшиеся…</p>
<p>Исполнитель передал, Заказчик принял:</p>
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
<li data-section="1">ПВХ-изделия;</li>
<li data-section="1">Результат работ;</li>
</ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
    const rootOl = doc.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    expect(rootOl?.children.length).toBe(1);
    const parentLi = rootOl?.firstElementChild;
    expect(parentLi?.textContent).toContain('Исполнитель передал');
    expect(parentLi?.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS} > li`)).not.toBeNull();
    expect(normalized).not.toMatch(/<p[^>]*>[^<]*Исполнитель передал[^<]*<\/p>/);
  });

  it('restructures flat act list into item 1 with nested 1.1 and 1.2', () => {
    const source = `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
<li data-section="1">Исполнитель передал, Заказчик принял:</li>
<li data-section="1">ПВХ-изделия;</li>
<li data-section="1">Результат работ;</li>
</ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
    const rootOl = doc.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    expect(rootOl?.children.length).toBe(1);
    expect(rootOl?.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS} ol > li`)).not.toBeNull();
  });

  it('does not merge two root sections on normalize', () => {
    const source = `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">Исполнитель передал:<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">ПВХ-изделия;</li><li data-section="1">Монтаж;</li></ol></li>
<li data-section="1">При приёмке установлено:<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">Претензии нет;</li></ol></li></ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
    const rootOl = doc.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    expect(rootOl?.children.length).toBe(2);
  });

  it('repairs section 2 wrongly nested under section 1', () => {
    const source = `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">Исполнитель передал:<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">При приёмке установлено:<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1" data-numbering="clause">
<li data-section="1">ПВХ-изделия;</li><li data-section="1">Монтаж;</li><li data-section="1">Претензии;</li>
</ol></li></ol></li></ol>`;
    const normalized = normalizeContractLegalListInHtml(source);
    const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
    const rootOl = doc.querySelector(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    expect(rootOl?.children.length).toBe(2);
    const sectionOne = rootOl?.children[0] as HTMLLIElement;
    const sectionTwo = rootOl?.children[1] as HTMLLIElement;
    expect(sectionOne.textContent).toContain('Исполнитель передал');
    expect(sectionTwo.textContent).toContain('При приёмке');
    expect(sectionOne.querySelectorAll('ol ol > li').length).toBe(2);
    expect(sectionTwo.querySelectorAll('ol > li').length).toBe(1);
  });

  it('Shift+Enter inserts next root-level clause in the same list', () => {
    document.body.innerHTML = `<div class="docPrint">
<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="1">
  <li data-section="1">Пункт 1.2</li>
</ol>
</div>`;
    const editor = document.querySelector('.docPrint') as HTMLElement;
    const li = editor.querySelector('ol > li') as HTMLLIElement;
    placeCaretIn(li.firstChild as Text, (li.firstChild as Text).length);

    expect(handleContractLegalListShiftEnter(editor)).toBe(true);

    const rootItems = editor.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS} > li`);
    expect(rootItems.length).toBe(2);
    expect(editor.querySelector('h2')).toBeNull();
    expect(getContractLegalLiDirectText(rootItems[1] as HTMLLIElement)).toBe('');
  });
});
