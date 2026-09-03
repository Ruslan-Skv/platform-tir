/** Договор купли-продажи техники (Excel «Дог Тех»). */
export const furnitureTemplateAppliancesContract = `
<div class="docPrint docPrintContractCompact">
  <h1 style="text-align: center; font-size: 13pt; margin: 0 0 6pt;">Договор</h1>
  <h2 style="text-align: center; font-size: 12pt; font-weight: normal; margin: 0 0 10pt;">
    купли-продажи товара
  </h2>
  <p style="text-align: center; margin: 0 0 12pt;">
    № {{contract.number}} &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, в лице менеджера по продажам {{executor.directorName}},
    действующего(ей) на основании {{executor.basis}}, именуемое далее «Продавец», с одной стороны, и
    {{customer.fullName|plain}}, далее «Покупатель», с другой стороны, заключили настоящий Договор о нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. По настоящему Договору Продавец обязуется передать в собственность Покупателя Товар в количестве,
    ассортименте и по ценам, указанным в Перечне товара (приложение №1), а Покупатель обязуется принять
    Товар и уплатить за него цену.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">2. ЦЕНА ДОГОВОРА И ПОРЯДОК РАСЧЁТОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Цена Договора составляет <strong>{{contract.totalAmount}}</strong> руб.
    ({{contract.totalAmountWords}}).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. При заключении договора Покупатель производит оплату в размере 100% от общей стоимости Товара
    ({{contract.prepaymentAmount}} руб.; {{contract.paymentBasis}}).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">3. СРОКИ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.1. Срок передачи Товара Покупателю составляет <strong>{{contract.workPeriod}}</strong> рабочих дней
    с момента поступления оплаты согласно п. 2.2.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">4. ПЕРЕДАЧА И ПРИНЯТИЕ ТОВАРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.1. Товар доставляется Покупателю по адресу: <strong>{{object.objectAddress}}</strong>.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.2. Принятие Товара подтверждается подписанием акта приёма-передачи (приложение №2).
  </p>

  <p style="margin-top: 18pt; text-align: justify; text-indent: 1.25cm;">
    Полный текст договора настройте в «Библиотеке шаблонов» (направление «Мебель»).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Продавец:<br/>{{executor.companyName}}<br/>{{executor.innKppRegLine}}</td>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Покупатель:<br/>{{customer.fullName|plain}}</td>
    </tr>
    <tr>
      <td style="padding-top: 16pt;">_________________/{{executor.directorName|plain}}</td>
      <td style="padding-top: 16pt;">_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
