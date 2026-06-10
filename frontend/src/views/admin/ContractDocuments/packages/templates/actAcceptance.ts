export const packageTemplateActAcceptance = `
<div class="docPrint">
  <h1>Акт сдачи-приёмки выполненных работ</h1>
  <p>к договору подряда № {{contract.number}} от {{contract.date}}</p>
  <p>Исполнитель сдал, а Заказчик принял результат работ по объекту: {{object.objectAddress}}.</p>
  <p>Объём и стоимость работ соответствуют договору на сумму {{contract.totalAmount}} ({{contract.totalAmountWords}}).</p>
  <p>Претензий по объёму, качеству и срокам у Заказчика не имеется.</p>
  <table class="signTable"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
  <tr><td>_________________/{{executor.directorName|plain}}</td><td>_________________/{{customer.signatureName|plain}}</td></tr></table>
</div>
`.trim();
