/** Шаблон вкладки «Договор» (ремонт). Плейсхолдеры: {{customer.fullName}}, {{contract.number}}, … */
export const repairTemplateContract = `
<div class="docPrint">
  <h1>Договор подряда № {{contract.number}}</h1>
  <p>г. __________ &nbsp;&nbsp; «{{contract.date}}»</p>
  <p><strong>{{executor.companyName}}</strong>, именуемое в дальнейшем «Исполнитель», в лице {{executor.directorName}}, действующего на основании {{executor.basis}}, с одной стороны, и</p>
  <p>гражданин(ка) <strong>{{customer.fullName}}</strong>, именуемый(ая) в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:</p>
  <h2>1. Предмет договора</h2>
  <p>Исполнитель обязуется своими силами и средствами выполнить работы по адресу: <strong>{{object.objectAddress}}</strong>, а Заказчик обязуется принять результат работ и оплатить его.</p>
  <p><strong>Описание работ/объекта:</strong> {{object.objectDescription}}</p>
  <h2>2. Стоимость и порядок расчётов</h2>
  <p>Общая стоимость работ по настоящему договору составляет <strong>{{contract.totalAmount}}</strong> ({{contract.totalAmountWords}}), в т.ч. НДС — по применимому режиму.</p>
  <p>Аванс: {{contract.prepaymentAmount}}. Сроки выполнения работ: {{contract.workPeriod}}.</p>
  <h2>3. Реквизиты сторон</h2>
  <p><strong>Заказчик:</strong> {{customer.fullName}}, адрес: {{customer.address}}, тел.: {{customer.phone}}, e-mail: {{customer.email}}.</p>
  <p><strong>Исполнитель:</strong> {{executor.companyName}}, ИНН {{executor.inn}}, КПП {{executor.kpp}}, ОГРН {{executor.ogrn}}, юр. адрес: {{executor.legalAddress}}, банковские реквизиты: {{executor.bankDetails}}.</p>
</div>
`.trim();
