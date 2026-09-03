/** Акт сдачи-приёмки изделий по договору изготовления (Excel «Акт С-П И»). */
export const furnitureTemplateActAcceptance = `
<div class="docPrint">
  <p style="margin:0 0 6pt;">Приложение №5</p>
  <h1 style="text-align:center;font-size:13pt;margin:0 0 10pt;">Акт сдачи-приёмки изделий</h1>
  <p style="text-align:center;margin:0 0 12pt;">по договору № {{contract.number}} от {{contract.date}}</p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Мы, нижеподписавшиеся, от Изготовителя {{executor.companyName}} в лице менеджера по продажам
    {{executor.directorName}}, и Заказчик {{customer.fullName|plain}}, составили настоящий акт о том, что
    Изготовитель передал, а Заказчик принял изделия мебели в соответствии со спецификацией к договору.
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Объект: {{object.objectAddress}}. Стоимость по договору: {{contract.totalAmount}} руб.
    ({{contract.totalAmountWords}}).
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Претензий по комплектности, качеству изделий и срокам у Заказчика не имеется.
  </p>
  <table class="signTable" style="width:100%;margin-top:24pt;">
    <tr><td>Изготовитель</td><td>Заказчик</td></tr>
    <tr>
      <td>_________________/{{executor.directorName|plain}}</td>
      <td>_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
