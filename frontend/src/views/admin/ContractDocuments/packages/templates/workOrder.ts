/** Шаблон вкладки «Заказ-наряд» (ремонт). */
export const packageTemplateWorkOrder = `
<div class="docPrint">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 10pt;">ЗАКАЗ-НАРЯД</h1>
  <p style="margin: 0 0 6pt;">
    <strong>Договор:</strong> № {{contract.number}} от {{contract.date}}
  </p>
  <p style="margin: 0 0 6pt;">
    <strong>Объект:</strong> {{object.objectAddress}}
  </p>
  <p style="margin: 0 0 10pt;">
    <strong>Заказчик:</strong> {{customer.fullName|plain}} &nbsp;&nbsp; <strong>Тел.:</strong> {{customer.phone|plain}}
  </p>

  <section>
    {{workOrder.roomsHtml}}
  </section>

  <section style="margin-top: 10pt;">
    <p style="margin: 6pt 0 0;">
      <strong>Итого к оплате: {{workOrder.totalAfterDeductions}} руб.</strong>
    </p>
  </section>
</div>
`.trim();

/** Шаблон «Заказ-наряд по доп. соглашению» (используется для всех слотов). */
export const packageTemplateWorkOrderAddendum = `
<div class="docPrint">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 10pt;">
    ЗАКАЗ-НАРЯД ПО Д/С № {{workOrderAddendum.slotNumber}}
  </h1>
  <p style="margin: 0 0 6pt;">
    <strong>Договор:</strong> № {{contract.number}} от {{contract.date}}
  </p>
  <p style="margin: 0 0 6pt;">
    <strong>Объект:</strong> {{object.objectAddress}}
  </p>
  <p style="margin: 0 0 10pt;">
    <strong>Заказчик:</strong> {{customer.fullName|plain}} &nbsp;&nbsp; <strong>Тел.:</strong> {{customer.phone|plain}}
  </p>

  <section>
    {{workOrderAddendum.roomsHtml}}
  </section>

  <p style="margin: 10pt 0 0;">
    <strong>Итого к оплате: {{workOrderAddendum.totalAfterDeductions}} руб.</strong>
  </p>
</div>
`.trim();

/** Заказ-наряд по Д/с в пакете «Окна» (оформление как основной заказ-наряд). */
export const packageTemplateWindowsWorkOrderAddendum = `
<div class="docPrint">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 10pt;">
    ЗАКАЗ-НАРЯД ПО Д/С № {{workOrderAddendum.slotNumber}}
  </h1>
  <p style="margin: 0 0 6pt;">
    <strong>Договор:</strong> № {{contract.number}} от {{contract.date}}
  </p>
  <p style="margin: 0 0 6pt;">
    <strong>Объект:</strong> {{object.objectAddress}}
  </p>
  <p style="margin: 0 0 10pt;">
    <strong>Заказчик:</strong> {{customer.fullName|plain}} &nbsp;&nbsp; <strong>Тел.:</strong> {{customer.phone|plain}}
  </p>

  <section>
    {{workOrderAddendum.roomsHtml}}
  </section>

  <p style="margin: 10pt 0 0;">
    <strong>Итого к оплате: {{workOrderAddendum.totalAfterDeductions}} руб.</strong>
  </p>
</div>
`.trim();
