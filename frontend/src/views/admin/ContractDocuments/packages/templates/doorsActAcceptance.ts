/** Шаблон «Акт приёма» для направления «Двери» (изделия + монтаж). */
export const doorsTemplateActAcceptance = `
<div class="docPrint">
  <h1>Акт приёма</h1>
  <p>к договору № {{contract.number}} от {{contract.date}}</p>
  <p>
    Исполнитель передал, а Заказчик принял двери в соответствии со спецификацией (приложение к договору),
    а также результат работ по установке (при наличии) по объекту: {{object.objectAddress}}.
  </p>
  <p>
    Стоимость изделий: {{contract.productsCost}} руб.; стоимость работ: {{contract.worksCost}} руб.; всего по
    договору: {{contract.totalAmount}} руб. ({{contract.totalAmountWords}}).
  </p>
  <p>
    Претензий по комплектности, качеству изделий, объёму и качеству монтажных работ, а также срокам у Заказчика
    не имеется.
  </p>
  <table class="signTable"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
  <tr><td>_________________/{{executor.directorName|plain}}</td><td>_________________/{{customer.signatureName|plain}}</td></tr></table>
</div>
`.trim();
