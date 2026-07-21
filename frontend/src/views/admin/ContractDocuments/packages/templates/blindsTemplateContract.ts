/** Шаблон вкладки «Договор» (направление «Жалюзи»). Плейсхолдеры: {{customer.*}}, {{executor.*}}, {{object.*}}, {{contract.*}}. */
export const blindsTemplateContract = `
<div class="docPrint docPrintContractCompact">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 12pt;">
    Договор подряда (с элементами купли-продажи) № {{contract.number}}<br />
    <span style="font-weight: normal; font-size: 11pt;">на поставку и установку жалюзи</span>
  </h1>
  <p style="text-align: center; margin: 0 0 8pt;">
    г. __________ &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, именуемое в дальнейшем «<strong>Исполнитель</strong>», в лице
    {{executor.directorName}}, действующего на основании {{executor.basis}}, с одной стороны, и
    {{customer.fullName|plain}}, именуемый(ая) в дальнейшем «<strong>Заказчик</strong>», с другой стороны,
    совместно именуемые «Стороны», заключили настоящий договор (далее — Договор) о нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. Исполнитель обязуется изготовить (поставить) и установить жалюзи по объекту, расположенному по адресу:
    <strong>{{object.objectAddress}}</strong>, в соответствии со спецификацией (приложение к Договору) и счётом-заказом,
    а Заказчик обязуется принять и оплатить изделия и работы.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.2. Состав, характеристики и количество жалюзи определяются спецификацией и счётом-заказом, являющимися
    неотъемлемой частью Договора.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">2. СТОИМОСТЬ И ПОРЯДОК РАСЧЁТОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Общая стоимость по Договору составляет <strong>{{contract.totalAmount}}</strong> руб.
    ({{contract.totalAmountWords}}), в том числе: стоимость изделий — {{contract.productsCost}} руб.;
    стоимость работ — {{contract.worksCost}} руб.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. Предоплата: <strong>{{contract.prepaymentAmount}}</strong> ({{contract.prepaymentAmountWords}});
    основание: {{contract.paymentBasis}}.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">3. СРОКИ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.1. Срок выполнения обязательств по Договору: <strong>{{contract.workPeriod}}</strong> рабочих дней с даты
    поступления предоплаты на расчётный счёт Исполнителя, если иное не согласовано дополнительным соглашением.
  </p>

  <p style="margin-top: 24pt; text-align: justify; text-indent: 1.25cm;">
    Настройте полный текст договора в разделе «Библиотека шаблонов договоров» (направление «Жалюзи», тип документа «Договор»).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
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
