/** Шаблон «Акт сдачи-приёмки» для направления «Окна» (изделия + монтаж). */
export const windowsTemplateActAcceptance = `
<div class="docPrint">
  <h1>Акт сдачи-приёмки</h1>
  <p>к договору № {{contract.number}} от {{contract.date}}</p>
  <p>
    Исполнитель передал, а Заказчик принял изделия (окна, двери и иные ПВХ-изделия) в соответствии со
    спецификацией (приложение к договору), а также результат работ по монтажу (при наличии) по объекту:
    {{object.objectAddress}}.
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
