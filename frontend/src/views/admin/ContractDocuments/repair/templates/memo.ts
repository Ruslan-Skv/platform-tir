/** Шаблон «Памятка по эксплуатации ПВХ-изделий» (направление «Окна»). */
export const windowsTemplateMemo = `
<div class="docPrint docPrintContractCompact">
  <h3 style="text-align: center;">Памятка по эксплуатации ПВХ-изделий</h3>
  <p style="text-align: justify; text-indent: 1.25cm;">Договор № {{contract.number}} от {{contract.date}}. Заказчик: {{customer.fullName|plain}}.</p>
  <p style="text-align: justify; text-indent: 1.25cm;">Настройте текст памятки в разделе «Библиотека шаблонов договоров» (направление «Окна», тип документа «Памятка»).</p>
</div>
`.trim();
