/** Шаблон договора на изготовление мебели (Excel «Дог И»). */
export const furnitureTemplateContract = `
<div class="docPrint docPrintContractCompact">
  <h1 style="text-align: center; font-size: 13pt; margin: 0 0 10pt;">
    Договор розничной купли-продажи товара,<br />
    имеющего индивидуально-определённые свойства<br />
    <span style="font-weight: normal; font-size: 11pt;">(посредством дистанционного способа продажи товаров)</span>
  </h1>
  <p style="text-align: center; margin: 0 0 12pt;">
    № {{contract.number}} &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, именуемое в дальнейшем «<strong>Изготовитель</strong>», в лице
    менеджера по продажам {{executor.directorName}}, действующего(ей) на основании {{executor.basis}}, с одной стороны, и
    {{customer.fullName|plain}}, далее «<strong>Заказчик</strong>», с другой стороны, заключили настоящий Договор о нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. Изготовитель принимает на себя обязательства по изготовлению мебели, имеющей индивидуально-определённые
    свойства, по адресу объекта: <strong>{{object.objectAddress}}</strong>, в соответствии со спецификацией, эскизом и
    замером (приложения к Договору).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.2. Заказчик обязуется принять изделие и оплатить определённую договором денежную сумму (цену).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">2. ЦЕНА И ПОРЯДОК РАСЧЁТОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Цена Договора составляет <strong>{{contract.totalAmount}}</strong> руб. ({{contract.totalAmountWords}}).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. Предоплата при подписании Договора: <strong>{{contract.prepaymentAmount}}</strong>
    ({{contract.prepaymentAmountWords}}); основание: {{contract.paymentBasis}}.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">3. СРОКИ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.1. Срок изготовления составляет <strong>{{contract.workPeriod}}</strong> рабочих дней с момента поступления
    предоплаты, если иное не согласовано дополнительным соглашением.
  </p>

  <p style="margin-top: 18pt; text-align: justify; text-indent: 1.25cm;">
    Полный текст договора настройте в «Библиотеке шаблонов» (направление «Мебель», тип «Договор»).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Изготовитель:<br/>{{executor.companyName}}<br/>{{executor.innKppRegLine}}</td>
      <td style="width: 50%; vertical-align: top; padding: 8pt;">Заказчик:<br/>{{customer.fullName|plain}}</td>
    </tr>
    <tr>
      <td style="padding-top: 16pt;">_________________/{{executor.directorName|plain}}</td>
      <td style="padding-top: 16pt;">_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
