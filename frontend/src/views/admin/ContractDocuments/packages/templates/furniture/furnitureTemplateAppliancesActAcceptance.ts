/** Акт приёма-передачи товара по договору техники (Excel «Акт П-П Т»). */
export const furnitureTemplateAppliancesActAcceptance = `
<div class="docPrint">
  <p style="margin:0 0 6pt;">Приложение №2</p>
  <h1 style="text-align:center;font-size:13pt;margin:0 0 10pt;">АКТ приёма-передачи товара</h1>
  <p style="text-align:center;margin:0 0 12pt;">по договору № {{contract.number}} от {{contract.date}}</p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Мы, нижеподписавшиеся, от Продавца {{executor.companyName}} в лице менеджера по продажам
    {{executor.directorName}}, действующего(ей) на основании {{executor.basis}}, с одной стороны, и
    Покупатель {{customer.fullName|plain}}, с другой стороны, составили настоящий акт приёма-передачи
    товара по договору.
  </p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Покупатель, в соответствии с договором, внимательно осмотрел товар, претензий к качеству
    и комплектации не имеет, за исключением:
  </p>
  <p style="margin:0 0 4pt;">1.______________________________________________________________________________________</p>
  <p style="margin:0 0 4pt;">2.______________________________________________________________________________________</p>
  <p style="margin:0 0 4pt;">3.______________________________________________________________________________________</p>
  <p style="margin:0 0 8pt;">4.______________________________________________________________________________________</p>
  <p style="text-align:justify;text-indent:1.25cm;margin:0 0 8pt;">
    Настоящий акт составлен в двух экземплярах, по одному для каждой из сторон.
  </p>
  <table class="signTable" style="width:100%;margin-top:24pt;">
    <tr><td>Продавец</td><td>Покупатель</td></tr>
    <tr>
      <td>_________________/{{executor.directorName|plain}}</td>
      <td>_________________/{{customer.signatureName|plain}}</td>
    </tr>
  </table>
</div>
`.trim();
