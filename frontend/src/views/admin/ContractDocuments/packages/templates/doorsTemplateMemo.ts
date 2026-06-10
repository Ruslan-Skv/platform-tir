import { buildContractAppendixRefParagraphHtml } from '../../core/typography/contractTemplateAppendixRef';

/** Шаблон «Памятка по эксплуатации дверей» (направление «Двери», приложение №4). */
export const doorsTemplateMemo = `
<div class="docPrint docPrintContractCompact">
  ${buildContractAppendixRefParagraphHtml(4)}
  <h3 style="text-align: center; font-weight: normal; margin: 11pt 0 5pt; line-height: 1.32;">Памятка по эксплуатации межкомнатных и входных дверей</h3>
  <p style="text-align: justify; text-indent: 1.25cm;">Уважаемый Заказчик! Чтобы двери служили долго и без поломок, соблюдайте рекомендации производителя и правила ухода за фурнитурой и полотном.</p>
  <p style="text-align: justify; text-indent: 1.25cm;">Настройте полный текст памятки в разделе «Библиотека шаблонов договоров» (направление «Двери», тип документа «Памятка»).</p>
</div>
`.trim();
