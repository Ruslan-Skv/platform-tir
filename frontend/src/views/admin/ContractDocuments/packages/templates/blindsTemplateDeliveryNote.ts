import { buildContractAppendixRefParagraphHtml } from '../../core/typography/contractTemplateAppendixRef';

/** Шаблон «Накладная на передачу жалюзи» (направление «Жалюзи»). */
export const blindsTemplateDeliveryNote = `
<div class="docPrint docPrintContractCompact">
  ${buildContractAppendixRefParagraphHtml(3)}
  <h3 style="text-align: center; font-weight: normal; margin: 11pt 0 5pt; line-height: 1.32;">Накладная на передачу жалюзи</h3>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Исполнитель передал, а Заказчик принял жалюзи по договору № {{contract.number}} от {{contract.date}}
    для объекта: {{object.objectAddress}}.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm;">
    Состав, количество и характеристики изделий соответствуют спецификации (приложение к договору) и счёту-заказу.
    Претензий по комплектности и внешнему виду изделий на момент передачи у Заказчика не имеется.
  </p>
  {{deliveryNote.productsHtml}}
  <table class="signTable"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
  <tr><td>_________________/{{executor.directorName|plain}}</td><td>_________________/{{customer.signatureName|plain}}</td></tr></table>
</div>
`.trim();
