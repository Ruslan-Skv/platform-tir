export const packageTemplateCashOrder = `
<div class="docPrint">
  <h1>Приходный кассовый ордер</h1>
  <p>От {{customer.fullName|plain}}</p>
  <p>Дата оплаты: {{contract.prepaymentDate}}</p>
  <p>Основание: {{contract.paymentBasis}}</p>
  <p>Способ оплаты: {{contract.paymentFormLabel}}</p>
  <p>Сумма: {{contract.prepaymentAmount}} ({{contract.prepaymentAmountWords}})</p>
</div>
`.trim();
