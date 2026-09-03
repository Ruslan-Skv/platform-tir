/** Заказ-наряд к договорам изготовления и монтажа (Excel «З-Н»). */
export const furnitureTemplateWorkOrder = `
<div class="docPrint">
  <h1 style="text-align:center;font-size:13pt;margin:0 0 10pt;">
    Заказ-наряд к договорам № {{furniture.manufactureNumber}} и {{furniture.montageNumber}}
  </h1>
  <p style="margin:0 0 6pt;">Заказчик: {{customer.fullName|plain}}</p>
  <p style="margin:0 0 6pt;">Адрес: {{object.objectAddress}}</p>
  <p style="margin:0 0 6pt;">Телефон: {{customer.phone}}</p>
  <p style="margin:0 0 12pt;">Менеджер: {{executor.directorName}} · Офис: {{executor.salesOffice}}</p>
  <p style="margin:0 0 8pt;"><strong>Состав работ</strong> — заполняется на вкладке «Заказ-наряд» редактора пакета.</p>
  <p style="margin:0;">Полный печатный лист формируется из позиций изготовления и монтажа.</p>
</div>
`.trim();
