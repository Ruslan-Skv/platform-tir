export const repairTemplateWorkOrderAddendum = `
<div class="docPrint">
  <h1>Заказ-наряд к дополнительному соглашению №{{workOrderAddendum.slotNumber}}</h1>
  <p style="margin:0 0 2pt;"><strong>Договор:</strong> № {{contract.number}} от {{contract.date}}</p>
  <p style="margin:0 0 2pt;"><strong>Адрес:</strong> {{object.objectAddress}}</p>
  <p style="margin:0 0 2pt;"><strong>Заказчик:</strong> {{customer.fullName}}</p>
  <p style="margin:0 0 6pt;"><strong>Телефон заказчика:</strong> {{customer.phone}}</p>

  {{workOrderAddendum.roomsHtml}}
  {{workOrderAddendum.categoryTotalsHtml}}

  <h2>Итоги</h2>
  <p>Итого к оплате: <strong>{{workOrderAddendum.totalAfterDeductions}}</strong> руб.</p>
</div>
`.trim();
