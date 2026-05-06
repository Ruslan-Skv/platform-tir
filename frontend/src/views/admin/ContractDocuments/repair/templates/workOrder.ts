export const repairTemplateWorkOrder = `
<div class="docPrint">
  <h1>Заказ-наряд</h1>
  <p style="margin:0 0 2pt;"><strong>Договор:</strong> № {{contract.number}} от {{contract.date}}</p>
  <p style="margin:0 0 2pt;"><strong>Адрес:</strong> {{object.objectAddress}}</p>
  <p style="margin:0 0 2pt;"><strong>Заказчик:</strong> {{customer.fullName}}</p>
  <p style="margin:0 0 6pt;"><strong>Телефон заказчика:</strong> {{customer.phone}}</p>

  {{workOrder.roomsHtml}}
  {{workOrder.categoryTotalsHtml}}

  <h2>Итоги</h2>
  <p>Итого к оплате: <strong>{{workOrder.totalAfterDeductions}}</strong> руб.</p>
</div>
`.trim();
