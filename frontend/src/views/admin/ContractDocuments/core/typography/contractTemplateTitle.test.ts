import {
  packageContractTemplateStructureInHtml,
  packageContractTitleBlock,
} from './contractTemplateStructure';
import {
  CONTRACT_DOC_TITLE_CLASS,
  isLikelyContractTitleElement,
  isLikelyContractTitleText,
  normalizeContractTitleInDom,
} from './contractTemplateTitle';

const WINDOWS_CONTRACT_TITLE_CELL = `<div class="docPrint docPrintContractCompact"><table><tbody><tr><td colspan="11"><h1 style="text-align: center"><span class=""><h3 style="text-align: center">Договор подряда (с элементами купли-продажи) № {{contract.number}}</h3></span></h1></td></tr></tbody></table></div>`;

describe('contract title bold / structure', () => {
  it('does not treat addendum body paragraphs as contract title', () => {
    const intro = document.createElement('p');
    intro.textContent =
      'Стороны согласовали изменение объема и/или стоимости работ по договору № 888 от 03.06.2026 по объекту: г. Мурманск ул. Пол. Зори д.8 кв.55.';
    expect(isLikelyContractTitleElement(intro)).toBe(false);
    expect(isLikelyContractTitleText(intro.textContent ?? '')).toBe(false);

    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="docPrint docPrintContractCompact windowsAddendumPrintCompactDoc">
<div class="packageAddendumHeaderBlock">
<h1 class="packageAddendumHeaderTitle">Дополнительное соглашение №1</h1>
</div>
<p>${intro.textContent}</p>
</div>`;
    normalizeContractTitleInDom(wrap);
    expect(wrap.querySelector('p')?.classList.contains(CONTRACT_DOC_TITLE_CLASS)).toBe(false);
    expect(wrap.querySelectorAll('h1').length).toBe(1);
  });

  it('does not treat addendum header sub as contract title', () => {
    const sub = document.createElement('p');
    sub.className = 'packageAddendumHeaderSub';
    sub.textContent = 'к Договору подряда (с элементами купли-продажи) № 888 от 03.06.2026';
    expect(isLikelyContractTitleElement(sub)).toBe(false);
    expect(isLikelyContractTitleText(sub.textContent ?? '')).toBe(false);

    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="docPrint docPrintContractCompact windowsAddendumPrintCompactDoc">
<div class="packageAddendumHeaderBlock">
<h1 class="packageAddendumHeaderTitle">Дополнительное соглашение №1</h1>
<p class="packageAddendumHeaderSub">${sub.textContent}</p>
</div></div>`;
    normalizeContractTitleInDom(wrap);
    const subAfter = wrap.querySelector('.packageAddendumHeaderSub');
    expect(subAfter?.tagName).toBe('P');
    expect(subAfter?.classList.contains(CONTRACT_DOC_TITLE_CLASS)).toBe(false);
  });

  it('detects windows contract title text', () => {
    expect(
      isLikelyContractTitleText(
        'Договор подряда (с элементами купли-продажи) № {{contract.number}}'
      )
    ).toBe(true);
    expect(isLikelyContractTitleText('10. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН')).toBe(false);
  });

  it('packageContractTitleBlock flattens nested title in table cell', () => {
    const c = document.createElement('div');
    c.innerHTML = WINDOWS_CONTRACT_TITLE_CELL;
    const docPrint = c.querySelector('.docPrint')!;
    packageContractTitleBlock(docPrint);
    const title = c.querySelector(`h1.${CONTRACT_DOC_TITLE_CLASS}`);
    expect(title).not.toBeNull();
    expect(c.querySelector('td h3')).toBeNull();
  });

  it('flattens nested h1>h3 contract title and keeps contractDocTitle', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = packageContractTemplateStructureInHtml(WINDOWS_CONTRACT_TITLE_CELL);
    const title = doc.body.querySelector(`h1.${CONTRACT_DOC_TITLE_CLASS}`);
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain('Договор подряда');
    expect(doc.body.querySelector('td h3')).toBeNull();
    expect(doc.body.querySelector('td h1 h3')).toBeNull();
  });
});
