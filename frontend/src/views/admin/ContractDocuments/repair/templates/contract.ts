/** Шаблон вкладки «Договор» (ремонт). Плейсхолдеры: {{customer.*}}, {{executor.*}}, {{object.*}}, {{contract.*}}. Для реквизитов Исполнителя удобно {{executor.innKppRegLine}} (ЮЛ: ИНН, КПП, ОГРН; ИП: ИНН, ОГРНИП). */
export const repairTemplateContract = `
<div class="docPrint">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 12pt;">
    ДОГОВОР № {{contract.number}}<br />
    <span style="font-weight: normal; font-size: 11pt;">на выполнение работ</span>
  </h1>
  <p style="text-align: center; margin: 0 0 8pt;">
    г. __________ &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, именуемое в дальнейшем «<strong>Подрядчик</strong>», в лице
    {{executor.directorName}}, действующего на основании {{executor.basis}}, с одной стороны, и
    {{customer.fullName|plain}}, именуемый(ая) в дальнейшем «<strong>Заказчик</strong>», с другой стороны,
    совместно именуемые «Стороны», а по отдельности «Сторона», заключили настоящий договор (далее — Договор) о
    нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. Заказчик поручает, а Подрядчик принимает на себя обязательство выполнить работы по объекту, расположенному
    по адресу: <strong>{{object.objectAddress}}</strong>, в объёме и на условиях, предусмотренных настоящим Договором,
    проектной и иной документацией (при наличии), а также локальными сметами и актами.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1.1. Этаж: {{object.objectFloor}}.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.2. Наименование, состав и описание работ: {{object.objectDescription}}
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.3. Работы выполняются Подрядчиком своими силами и средствами, если иное не согласовано Сторонами письменно.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">2. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Общая (предельная) цена работ по Договору составляет <strong>{{contract.totalAmount}}</strong> руб.
    ({{contract.totalAmountWords}}), в т.ч. НДС — в соответствии с применимым налоговым режимом Подрядчика, если
    обязанность по НДС предусмотрена законодательством РФ.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. Порядок и сроки оплаты: аванс / предоплата — <strong>{{contract.prepaymentAmount}}</strong>
    ({{contract.prepaymentAmountWords}}); основание перечисления: {{contract.paymentBasis}}; окончательный
    расчёт — по факту подписания акта приёма выполненных работ (или иной порядок, согласованный Сторонами).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.3. Оплата производится безналичным перечислением на расчётный счёт Подрядчика, указанный в разделе 11 настоящего
    Договора, либо иным способом по согласованию Сторон.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">3. СРОКИ ВЫПОЛНЕНИЯ РАБОТ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.1. Срок выполнения работ по Договору: <strong>{{contract.workPeriod}}</strong> календарных дней (если иное не
    согласовано дополнительным соглашением).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.2. Сроки могут быть изменены по соглашению Сторон оформленным дополнительным соглашением либо актом фиксации
    простоя по вине Заказчика / форс-мажорных обстоятельств при наличии подтверждающих документов.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.1. <strong>Заказчик</strong> обязуется: своевременно принять выполненные работы при отсутствии замечаний к их
    качеству; обеспечить доступ Подрядчика на объект; произвести оплату в сроки и порядке, установленные Договором;
    уведомлять о необходимости приостановки работ не менее чем за срок, достаточный для безопасной консервации
    производства.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.2. <strong>Подрядчик</strong> обязуется: выполнить работы качественно, в срок и в соответствии с условиями
    Договора; соблюдать требования охраны труда, пожарной и промышленной безопасности; устранять выявленные недостатки
    в гарантийный срок за свой счёт, если они вызваны виной Подрядчика.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">5. ПОРЯДОК СДАЧИ-ПРИЁМКИ ВЫПОЛНЕННЫХ РАБОТ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    5.1. По завершении работ (этапа работ) Подрядчик уведомляет Заказчика и передаёт акт сдачи-приёмки. Заказчик в
    течение срока, установленного актом или Договором (при отсутствии — разумного срока), подписывает акт либо
    направляет мотивированный отказ.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">6. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    6.1. Подрядчик предоставляет гарантию на выполненные работы и использованные материалы — в пределах сроков и
    условий, установленных законодательством РФ, технической документацией и/или гарантийными обязательствами
    производителей материалов.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">7. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    7.1. За неисполнение или ненадлежащее исполнение обязательств Стороны несут ответственность в соответствии с
    законодательством РФ и условиями Договора. Неустойка (пени) может устанавливаться дополнительным соглашением.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">8. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    8.1. Споры и разногласия разрешаются путём переговоров; при недостижении согласия — в суде по месту нахождения
    ответчика, если иное не предусмотлено императивными нормами РФ.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">9. ПРОЧИЕ УСЛОВИЯ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.1. Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами обязательств, если
    иное не указано в Договоре.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.2. Все изменения и дополнения действительны при условии их письменного оформления и подписания уполномоченными
    представителями Сторон.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">10. ПРИЛОЖЕНИЯ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    10.1. Неотъемлемой частью Договора являются: локальная смета / калькуляция (при наличии), иные приложения по
    согласованию Сторон.
  </p>
  <p style="text-align: justify; margin: 0 0 8pt;">
    Итоговая сумма сметы: <strong>{{estimate.total}}</strong>
  </p>
  <div class="estimateRoomsEmbed" style="margin: 0 0 10pt;">
    {{estimate.roomsHtml}}
  </div>
  <p style="text-align: justify; margin: 0 0 8pt;">
    Примечание к смете: <em>{{estimate.notes}}</em>
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">11. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
  <table class="contractRequisitesBlock" style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 6pt; page-break-inside: auto;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 10px 12px 10px 0; border-right: 1px solid #bbb;">
        <p style="text-align: center; margin: 0 0 10pt;">ПОДРЯДЧИК</p>
        <p style="margin: 0 0 6pt;">{{executor.companyName}}</p>
        <p style="margin: 0 0 4pt;">Юридический адрес: {{executor.legalAddress}}</p>
        <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
        <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
        <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
        <p style="margin: 0 0 4pt;">Банковские реквизиты:</p>
        <p style="margin: 0 0 12pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 10px 0 10px 12px;">
        <p style="text-align: center; margin: 0 0 10pt;">ЗАКАЗЧИК</p>
        <p style="margin: 0 0 6pt;">{{customer.fullName|plain}}</p>
        <p style="margin: 0 0 4pt;">Адрес: {{customer.address|plain}}</p>
        <p style="margin: 0 0 4pt;">Тел.: {{customer.phone|plain}}</p>
        <p style="margin: 0 0 4pt;">E-mail: {{customer.email|plain}}</p>
        <p style="margin: 0 0 4pt;">Банковские реквизиты:</p>
        <p style="margin: 0 0 4pt; white-space: pre-wrap;">{{customer.bankDetails|plain}}</p>
        <p style="margin: 0 0 4pt;">Паспорт: {{customer.passportSeriesNumber|plain}}</p>
        <p style="margin: 0 0 4pt;">Выдан: {{customer.passportIssuedBy|plain}}, {{customer.passportIssueDate|plain}}</p>
      </td>
    </tr>
  </table>
</div>
`.trim();
