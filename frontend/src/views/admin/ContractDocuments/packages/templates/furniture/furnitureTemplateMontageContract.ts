/** Договор оказания услуг на монтаж мебели (Excel «Дог М»). */
export const furnitureTemplateMontageContract = `
<div class="docPrint docPrintContractCompact">
  <h1 style="text-align: center; font-size: 13pt; margin: 0 0 10pt;">
    ДОГОВОР ОКАЗАНИЯ УСЛУГ № {{contract.number}}
  </h1>
  <p style="text-align: center; margin: 0 0 12pt;">г. __________ &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»</p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, в лице менеджера по продажам {{executor.directorName}},
    действующего(ей) на основании {{executor.basis}}, именуемая в дальнейшем «Исполнитель», и
    {{customer.fullName|plain}}, далее «Заказчик», заключили настоящий Договор о нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">1. Предмет договора</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. Исполнитель обязуется в установленный договором срок провести монтаж мебели по адресу:
    <strong>{{object.objectAddress}}</strong>.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.2. Заказчик обязуется проверить и принять работы Исполнителя и оплатить определённую договором цену.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">2. Цена. Порядок расчётов. Сроки</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Цена работ в соответствии со Счёт-заказом составляет:
    <strong>{{contract.totalAmount}}</strong> руб. ({{contract.totalAmountWords}}).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. Заказчик производит предварительную оплату работ в размере не менее 70% при подписании договора;
    остаток — в течение одного дня после завершения монтажа.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.4. Срок проведения работ составляет <strong>{{contract.workPeriod}}</strong> рабочих дней с момента
    подписания акта готовности к монтажу и наличия оплаты согласно п. 2.2.
  </p>

  <p style="margin-top: 18pt; text-align: justify; text-indent: 1.25cm;">
    Полный текст договора настройте в «Библиотеке шаблонов» (направление «Мебель»).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">ПОДПИСИ СТОРОН</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Исполнитель:<br/>{{executor.companyName}}<br/>{{executor.innKppRegLine}}</td>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Заказчик:<br/>{{customer.fullName|plain}}</td>
    </tr>
    <tr>
      <td style="padding-top: 16pt;">_________________/{{executor.directorName|plain}}</td>
      <td style="padding-top: 16pt;">_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
