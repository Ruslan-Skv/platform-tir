export const repairTemplateAddendum = `
<div class="docPrint">
  <h1>Дополнительное соглашение №___</h1>
  <p>к договору подряда № {{contract.number}} от {{contract.date}}</p>
  <p>между {{executor.companyName}} и {{customer.fullName}}.</p>
  <p>Стороны согласовали изменения к объёму/срокам/стоимости работ по объекту {{object.objectAddress}}.</p>
</div>
`.trim();
