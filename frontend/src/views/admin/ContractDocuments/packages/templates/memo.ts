import { buildContractAppendixRefParagraphHtml } from '../../shared/typography/contractTemplateAppendixRef';

/** Шаблон «Памятка по эксплуатации ПВХ-окон» (направление «Окна», приложение №4). */
export const windowsTemplateMemo = `
<div class="docPrint docPrintContractCompact">
  ${buildContractAppendixRefParagraphHtml(4)}
  <h3 style="text-align: center; font-weight: normal; margin: 11pt 0 5pt; line-height: 1.32;">Памятка по эксплуатации ПВХ-окон, дверей и балконных конструкций</h3>
  <p style="text-align: justify; text-indent: 1.25cm;">Уважаемый Заказчик! Чтобы Ваши окна и двери служили долго и без поломок, пожалуйста, соблюдайте простые правила.</p>
  <p style="text-align: justify; text-indent: 1.25cm;">Настройте полный текст памятки в разделе «Библиотека шаблонов договоров» (направление «Окна», тип документа «Памятка»).</p>
</div>
`.trim();
