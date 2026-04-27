export const repairTemplateProductionLog = `
<div class="docPrint">
  <h1>Производственный журнал</h1>
  <p>Объект: {{object.objectAddress}}. Заказчик: {{customer.fullName}}.</p>
  <p>Договор № {{contract.number}} от {{contract.date}}.</p>
  <p>Таблица визитов/этапов — заполняется на объекте.</p>
</div>
`.trim();
