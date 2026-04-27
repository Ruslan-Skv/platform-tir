export const repairTemplateCashOrder = `
<div class="docPrint">
  <h1>Приходный кассовый ордер</h1>
  <p>От <strong>{{customer.fullName}}</strong></p>
  <p>Основание: договор № {{contract.number}} от {{contract.date}}</p>
  <p>Сумма: {{contract.prepaymentAmount}} (или иная указанная кассиром)</p>
</div>
`.trim();
