export const repairTemplateActStart = `
<div class="docPrint">
  <h1>Акт начала работ</h1>
  <p>к договору подряда № {{contract.number}} от {{contract.date}}</p>
  <p>Мы, нижеподписавшиеся: <strong>{{executor.companyName}}</strong>, с одной стороны, и <strong>{{customer.fullName}}</strong>, с другой стороны, составили настоящий акт о том, что работы по адресу {{object.objectAddress}} признаны начатыми.</p>
  <p>Дата начала: __________________</p>
  <table class="signTable"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
  <tr><td>_________________/{{executor.directorName}}</td><td>_________________/{{customer.fullName}}</td></tr></table>
</div>
`.trim();
