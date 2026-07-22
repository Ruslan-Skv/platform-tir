/** Шаблон вкладки «Договор» (направление «Натяжные потолки»). */
export const ceilingsTemplateContract = `
<div class="docPrint docPrintContractCompact">
  <h1 style="text-align: center; font-size: 14pt; margin: 0 0 12pt;">
    Договор подряда (с элементами купли-продажи) № {{contract.number}}
  </h1>
  <p style="text-align: center; margin: 0 0 10pt;">
    г. Мурманск &nbsp;&nbsp;&nbsp;&nbsp; «{{contract.date}}»
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    <strong>{{executor.companyName}}</strong>, в лице менеджера по продажам
    {{executor.directorName}}, действующей на основании {{executor.basis}}, именуемый в дальнейшем
    «<strong>Исполнитель</strong>», с одной стороны, и гражданин(ка)
    {{customer.fullName|plain}} (паспорт {{customer.passportSeriesNumber|plain}}, выдан
    {{customer.passportIssuedBy|plain}}, {{customer.passportIssueDate|plain}}), именуемый(ая) в дальнейшем
    «<strong>Заказчик</strong>», с другой стороны, заключили настоящий договор о нижеследующем:
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.1. Исполнитель обязуется:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Изготовить и передать в собственность Заказчика полотно для натяжного потолка, а также необходимые
    комплектующие (багеты, профили, вставки, крепёж) и, при наличии заказа, световые приборы (светильники,
    лампочки, световые линии, трансформаторы, драйверы и пр.) согласно Спецификации (Приложение №1) с указанием
    размеров, цвета, фактуры, типа светильников и их количества;
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Выполнить монтажные работы по установке натяжного потолка, включая установку всех комплектующих и световых
    приборов, на объекте Заказчика по адресу: <strong>{{object.objectAddress}}</strong>, согласно Счет-заказу
    (Приложение №2);
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Сдать результат работы Заказчику по Акту (Приложение №3).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.2. Заказчик обязуется принять натяжной потолок и выполненные работы, оплатить их в порядке и сроки,
    установленные договором.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    1.3. Момент перехода права собственности на полотно и комплектующие от Исполнителя к Заказчику – в момент
    подписания Акта сдачи-приемки (Приложение №3). До этого момента все изделия являются собственностью
    Исполнителя.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.1. Общая стоимость договора составляет: <strong>{{contract.totalAmount}}</strong>
    ({{contract.totalAmountWords}}) рублей, в том числе:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Стоимость полотна, комплектующих и световых приборов (товарная часть) –
    <strong>{{contract.productsCost}}</strong> руб.;
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Стоимость монтажных работ – <strong>{{contract.worksCost}}</strong> руб.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.2. Предоплата (аванс) – 70% от общей стоимости договора
    (<strong>{{contract.prepaymentAmount}}</strong> руб.) вносится при подписании договора. Данная предоплата
    является оплатой изготовления полотна и комплектующих (товарной части) и части работ.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.3. Окончательный расчет – 30% (______ руб.) выплачиваются до начала монтажных работ, после уведомления
    Заказчика о готовности полотна и комплектующих к монтажу.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    2.4. Если Заказчик после уведомления о готовности отказывается от монтажа, он обязан выкупить изготовленное
    полотно и комплектующие по их стоимости (п.2.1) и забрать их самостоятельно со склада Исполнителя. Неоплаченный
    монтаж аннулируется.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">3. СРОКИ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.1. Срок изготовления полотна и комплектующих (включая доставку на объект) – 10 рабочих дней с момента
    получения предоплаты (п.2.2) и проведения всех необходимых замеров (если замер производится Исполнителем).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    3.2. Срок монтажа – в течение 3 рабочих дней после получения окончательной оплаты (п.2.3) и согласования даты
    выезда бригады.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.1. Заказчик обязан:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Обеспечить беспрепятственный доступ на объект для снятия замеров (до подписания договора, либо в день
    подписания) и для монтажной бригады.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    В течение 2 рабочих дней после уведомления о готовности подтвердить дату монтажа и произвести доплату 30%.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    При подписании Акта лично проверить: соответствие цвета, фактуры, размера полотна; количество и
    работоспособность всех установленных светильников и лампочек; отсутствие видимых дефектов (морщин, провисаний,
    повреждений). После подписания Акта претензии к внешнему виду полотна и работоспособности светильников не
    принимаются (за исключением скрытых дефектов, о которых Заказчик не мог знать при приёмке).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.2. Исполнитель обязан:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Изготовить и передать полотно и комплектующие надлежащего качества, соответствующие Спецификации.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Выполнить монтаж в соответствии с техническими требованиями производителя полотна и строительными нормами,
    обеспечив ровное натяжение, качественную тепловую обработку, надёжное крепление багетов.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Установить все заказанные светильники, лампочки, световые линии, обеспечив их корректное подключение к
    электропроводке Заказчика (при наличии подготовленного вывода проводов).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Убрать строительный мусор после монтажа (крупные фрагменты).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    4.3. Исполнитель имеет право:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Приостановить монтаж, если Заказчик не обеспечил условия (отсутствие электричества, доступ к месту установки,
    наличие подготовленных выводов под светильники, если они не были оговорены заранее).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Изменить стоимость договора при изменении спецификации (добавление/замена светильников, изменение размера/цвета
    полотна) по инициативе Заказчика.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">5. ПРИЕМКА РАБОТ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    5.1. По окончании монтажа стороны подписывают Акт сдачи-приемки (Приложение №3).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    5.2. При обнаружении недостатков (видимых дефектов полотна, неработающих светильников, неправильной установки)
    Заказчик указывает их в Акте. Исполнитель устраняет их в течение 7 рабочих дней (если требуется замена
    светильника – срок может быть увеличен до 14 дней при необходимости поставки нового).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    5.3. Если Заказчик не подписывает Акт и не предъявляет мотивированных претензий в течение 3 дней после
    уведомления о готовности, работы считаются принятыми в одностороннем порядке.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">6. ГАРАНТИИ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    6.1. Гарантийный срок на полотно натяжного потолка и выполненные монтажные работы (включая багеты и профили) –
    2 (два) года с даты подписания Акта.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    6.2. Гарантийный срок на светильники, лампочки, световые линии, трансформаторы, драйверы и прочие
    электроустановочные изделия – 6 месяцев с даты подписания Акта (если иное не указано производителем). Лампочки
    накаливания и галогенные лампы считаются расходными материалами и гарантией не покрываются, если их срок службы
    не превышает заявленного производителем.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    6.3. Исполнитель освобождается от гарантийных обязательств в случаях:
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    механических повреждений полотна (проколы, порезы, разрывы), вызванных Заказчиком или третьими лицами;
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    нарушения правил эксплуатации (подробно – в Памятке по эксплуатации натяжных потолков);
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    самостоятельного демонтажа, замены светильников или иного вмешательства в конструкцию без письменного согласия
    Исполнителя;
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    воздействия агрессивных сред, перепадов температуры и влажности, не предусмотренных нормальными условиями
    эксплуатации (для жилых помещений);
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    выхода из строя лампочек и драйверов по истечении гарантийного срока или при скачках напряжения в электросети, не
    обеспеченных стабилизатором со стороны Заказчика.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">7. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    7.1. За просрочку монтажа (но не изготовления) Исполнитель уплачивает пеню в размере 0,1% от стоимости монтажных
    работ за каждый день просрочки, но не более 10% от стоимости работ.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    7.2. За просрочку оплаты Заказчиком – пеня 0,5% от неуплаченной суммы за каждый день, но не более 30% от этой
    суммы.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    7.3. При отказе Заказчика от договора после изготовления полотна и комплектующих (но до монтажа):
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Заказчик обязан оплатить 100% стоимости полотна, комплектующих и световых приборов, поскольку они изготовлены
    (приобретены) индивидуально под его замеры.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    Исполнитель передаёт полотно и комплектующие Заказчику на склад самовывозом. Предоплата засчитывается в эту сумму,
    при необходимости производится доплата или возврат переплаты (за вычетом фактических расходов на доставку).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    7.4. При отказе после начала монтажа – Заказчик оплачивает полную стоимость товарной части + 50% стоимости
    монтажных работ (возмещение убытков).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    8.1. Задержка изготовления на срок до 5 рабочих дней по вине поставщика материалов (полотна, комплектующих) не
    является просрочкой, но Исполнитель обязан предупредить Заказчика.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    8.2. Все изменения спецификации оформляются письменно и могут повлиять на стоимость и сроки.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    8.3. Переписка в мессенджерах (WhatsApp, Telegram) по номерам телефонов, указанным в договоре, имеет юридическую
    силу для уведомлений и согласований.
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 14pt 0 8pt;">9. ПРИЛОЖЕНИЯ (неотъемлемая часть договора)</h2>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.1. Приложение №1 – Спецификация (размеры, цвет, фактура полотна; тип, количество, мощность светильников и
    лампочек; наличие световых линий; перечень комплектующих).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.2. Приложение №2 – Счет-заказ (детальный перечень работ: замер, монтаж багетов, натяжка полотна, установка
    светильников, подключение, уборка).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.3. Приложение №3 – Акт сдачи-приемки товара и выполненных работ.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
    9.4. Приложение №4 – Накладная на передачу полотна и комплектующих (подписывается при доставке на объект).
  </p>

  <h2 style="text-align: center; font-size: 12pt; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
  <table class="contractRequisitesBlock" style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 6pt;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 10px 12px 10px 0; border-right: 1px solid #bbb;">
        <p style="text-align: center; margin: 0 0 10pt;">ИСПОЛНИТЕЛЬ</p>
        <p style="margin: 0 0 6pt;">{{executor.companyName}}</p>
        <p style="margin: 0 0 4pt;">Юридический адрес: {{executor.legalAddress}}</p>
        <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
        <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
        <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
        <p style="margin: 0 0 4pt;">Тел.: {{executor.officePhone}}</p>
        <p style="margin: 0 0 4pt;">Банковские реквизиты:</p>
        <p style="margin: 0 0 12pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
        <p style="margin: 16pt 0 0;">_________________/{{executor.directorName|plain}}</p>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 10px 0 10px 12px;">
        <p style="text-align: center; margin: 0 0 10pt;">ЗАКАЗЧИК</p>
        <p style="margin: 0 0 6pt;">{{customer.fullName|plain}}</p>
        <p style="margin: 0 0 4pt;">Адрес: {{customer.address|plain}}</p>
        <p style="margin: 0 0 4pt;">Тел.: {{customer.phone|plain}}</p>
        <p style="margin: 0 0 4pt;">E-mail: {{customer.email|plain}}</p>
        <p style="margin: 0 0 4pt;">Паспорт: {{customer.passportSeriesNumber|plain}}</p>
        <p style="margin: 0 0 4pt;">Выдан: {{customer.passportIssuedBy|plain}}, {{customer.passportIssueDate|plain}}</p>
        <p style="margin: 16pt 0 0;">_________________/{{customer.signatureName|plain}}</p>
      </td>
    </tr>
  </table>
</div>
`.trim();
