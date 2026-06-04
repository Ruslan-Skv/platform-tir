import { CONTRACT_APPENDIX_REF_CLASS } from './contractTemplateAppendixRef';
import { isLikelyMemoDocumentTitleText } from './contractTemplateMemoStructure';
import { repairContractTemplateStructureInHtml } from './contractTemplateStructure';

const NESTED_MEMO_HTML = `<div class="docPrint docPrintContractCompact"><h2 style="margin: 11pt 0 5pt"><span style="font-weight: 400">Приложение №3</span><span>&nbsp;к договору №&nbsp;&nbsp;</span><span>{{contract.number}} от&nbsp;{{contract.date}}</span><h2 style="margin: 11pt 0 5pt"><span>Памятка по эксплуатации ПВХ-окон, дверей и балконных конструкций</span><p class="ds-markdown-paragraph" style="margin: 0 0 6pt">Уважаемый Заказчик!</p><h3><span style="font-weight: normal">1. Проветривание</span></h3><ul><li><p>Пункт списка</p></li></ul></h2></h2></div>`;

/** Как в редакторе: внешний h2 > span > приложение + вложенный h2 с памяткой. */
const SPAN_WRAPPED_MEMO_HTML = `<div class="docPrint docPrintContractCompact"><h2 style="margin: 11pt 0 5pt"><span class=""><span style="font-weight: 400">Приложение №4</span><span>&nbsp;к договору №&nbsp;&nbsp;</span><span>{{contract.number}} от&nbsp;{{contract.date}}</span><h2 style="margin: 11pt 0 5pt"><span class="">Памятка по эксплуатации ПВХ-окон, дверей и балконных конструкций</span><p class="ds-markdown-paragraph" style="margin: 0 0 6pt">Уважаемый Заказчик!</p><h3><span style="font-weight: normal">1. Проветривание</span></h3><ul><li><p>Пункт</p></li></ul></h2></span></h2></div>`;

describe('contractTemplateMemoStructure', () => {
  it('detects memo document title', () => {
    expect(
      isLikelyMemoDocumentTitleText(
        'Памятка по эксплуатации ПВХ-окон, дверей и балконных конструкций'
      )
    ).toBe(true);
  });

  it('unwraps nested h2 memo shell into appendix paragraph and body blocks', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = repairContractTemplateStructureInHtml(NESTED_MEMO_HTML);
    const docPrint = doc.body.querySelector('.docPrint')!;
    const appendix = docPrint.querySelector(`p.${CONTRACT_APPENDIX_REF_CLASS}`);
    expect(appendix).not.toBeNull();
    expect(appendix?.textContent).toContain('Приложение №3');
    expect(docPrint.querySelectorAll('h2').length).toBe(0);
    const memoTitle = docPrint.querySelector('h3');
    expect(memoTitle?.textContent).toContain('Памятка по эксплуатации');
    expect(docPrint.querySelector('p.ds-markdown-paragraph')).not.toBeNull();
    expect(docPrint.querySelector('ul li')).not.toBeNull();
  });

  it('repairs span-wrapped appendix + memo (Приложение №4) like act layout', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = repairContractTemplateStructureInHtml(SPAN_WRAPPED_MEMO_HTML);
    const docPrint = doc.body.querySelector('.docPrint')!;
    const appendix = docPrint.querySelector(`p.${CONTRACT_APPENDIX_REF_CLASS}`);
    expect(appendix).not.toBeNull();
    expect(appendix?.textContent).toContain('Приложение №4');
    expect(appendix?.textContent).toContain('{{contract.number}}');
    expect(docPrint.querySelectorAll('h2').length).toBe(0);
    const titles = [...docPrint.querySelectorAll('h3')].map((el) => el.textContent ?? '');
    expect(titles.some((t) => t.includes('Памятка по эксплуатации'))).toBe(true);
    expect(titles.some((t) => t.includes('1. Проветривание'))).toBe(true);
    expect(docPrint.querySelector('p.ds-markdown-paragraph')?.textContent).toContain(
      'Уважаемый Заказчик'
    );
  });
});
