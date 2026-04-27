export const repairTemplateWorkOrder = `
<div class="docPrint">
  <h1>Заказ-наряд</h1>
  <p>Заказчик: {{customer.fullName}}, {{customer.phone}}. Объект: {{object.objectAddress}}.</p>
  <p>Договор № {{contract.number}} от {{contract.date}}, сумма {{contract.totalAmount}}.</p>
</div>
`.trim();
