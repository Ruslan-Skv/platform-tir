/** Акт сдачи-приёмки работ монтажа (Excel «Акт С-П Р»). */
export const furnitureTemplateMontageActAcceptance = `
<div class="docPrint">
  <p style="margin:0 0 6pt;">Приложение №3</p>
  <h1 style="text-align:center;font-size:13pt;margin:0 0 10pt;">АКТ сдачи-приёмки работ</h1>
  <p style="text-align:center;margin:0 0 12pt;">по договору № {{contract.number}} от {{contract.date}}</p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Мы, нижеподписавшиеся от Исполнителя {{executor.companyName}} в лице менеджера по продажам
    {{executor.directorName}}, и Заказчик {{customer.fullName|plain}}, составили настоящий акт о том, что
    Исполнитель выполнил, а Заказчик принял работы по монтажу мебели по адресу {{object.objectAddress}}.
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Стоимость работ по договору: {{contract.totalAmount}} руб. ({{contract.totalAmountWords}}).
    Претензий по объёму и качеству работ у Заказчика не имеется.
  </p>
  <table class="signTable" style="width:100%;margin-top:24pt;">
    <tr><td>Исполнитель</td><td>Заказчик</td></tr>
    <tr>
      <td>_________________/{{executor.directorName|plain}}</td>
      <td>_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
