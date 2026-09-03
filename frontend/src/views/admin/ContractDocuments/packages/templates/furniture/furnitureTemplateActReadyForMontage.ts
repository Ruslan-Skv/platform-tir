/** Акт готовности к монтажу (Excel «Акт ГкМ») — вкладка actStart для мебели. */
export const furnitureTemplateActReadyForMontage = `
<div class="docPrint">
  <p style="margin:0 0 6pt;">Приложение №2</p>
  <h1 style="text-align:center;font-size:13pt;margin:0 0 10pt;">АКТ готовности к монтажу</h1>
  <p style="text-align:center;margin:0 0 12pt;">по договору № {{contract.number}} от {{contract.date}}</p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Мы, нижеподписавшиеся от Исполнителя {{executor.companyName}} в лице менеджера по продажам
    {{executor.directorName}}, и Заказчик {{customer.fullName|plain}}, составили настоящий акт о нижеследующем:
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Заказчик предоставляет помещение по адресу <strong>{{object.objectAddress}}</strong>, подготовленное для
    проведения работ согласно Счёт-заказу (приложение №1 к договору монтажа).
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Срок работ: начало __________________ , окончание __________________.
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
