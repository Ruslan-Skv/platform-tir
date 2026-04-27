export function repairTemplateQuestionnaire(sheetNumber: string): string {
  return `
<div class="docPrint">
  <h1>Анкета ${sheetNumber}</h1>
  <p>Заказчик: {{customer.fullName}}, тел. {{customer.phone}}, адрес: {{customer.address}}.</p>
  <p>Объект: {{object.objectAddress}}. {{object.objectDescription}}</p>
</div>
`.trim();
}
