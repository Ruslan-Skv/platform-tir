/** Универсальный шаблон для вкладок «Дополнительное соглашение №1..№5». */
export const packageTemplateAddendum = `
<div class="docPrint{{addendum.printDocClass}}">
  <div class="packageAddendumHeaderBlock">
    <h1 class="packageAddendumHeaderTitle">{{addendum.headerMain}}</h1>
    <p class="packageAddendumHeaderSub">{{addendum.headerSub}}</p>
    <div class="packageAddendumMetaRow">
      <span class="packageAddendumMetaDate">{{addendum.documentDate}}</span>
      <span class="packageAddendumMetaCity">г. Мурманск</span>
    </div>
  </div>

  <p style="margin: 0 0 10pt; text-align: justify;">
    Стороны согласовали изменение объема и/или стоимости работ по договору
    № {{contract.number}} от {{contract.date}} по объекту: {{object.objectAddress}}.
  </p>

  <section>
    {{addendum.roomsHtml}}
  </section>

  {{addendum.workPeriodIncreaseHtml}}
  <p style="margin: 6pt 0 0;">
    Настоящее дополнительное соглашение является неотъемлемой частью договора.
  </p>
</div>
`.trim();
