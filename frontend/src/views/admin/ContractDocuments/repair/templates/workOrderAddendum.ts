export const repairTemplateWorkOrderAddendum = `
<div class="docPrint">
  <h1>Заказ-наряд</h1>
  <p>к дополнительному соглашению к договору № {{contract.number}} от {{contract.date}}.</p>
  <p>Заказчик: {{customer.fullName}}. Объект: {{object.objectAddress}}.</p>
</div>
`.trim();
