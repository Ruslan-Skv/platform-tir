import { buildContractAppendixRefParagraphHtml } from '../../../core/typography/contractTemplateAppendixRef';

/** Инструкция по эксплуатации корпусной мебели (Excel «Инстр»). */
export const furnitureTemplateMemo = `
<div class="docPrint docPrintContractCompact">
  ${buildContractAppendixRefParagraphHtml(4)}
  <h3 style="text-align: center; font-weight: normal; margin: 11pt 0 8pt; line-height: 1.32;">
    ИНСТРУКЦИЯ<br />по эксплуатации корпусной мебели
  </h3>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Мебель должна храниться и эксплуатироваться в сухих и тёплых помещениях, имеющих отопление и вентиляцию.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Не рекомендуется допускать прямое затекание воды и горячих напитков под кромку и стыки соединений.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Зеркальные, глянцевые, акриловые и металлические поверхности следует очищать средствами, рекомендованными
    производителем; абразивы и агрессивная химия запрещены.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Полный текст инструкции настройте в «Библиотеке шаблонов» (направление «Мебель», тип «Памятка» / инструкция).
  </p>
</div>
`.trim();
