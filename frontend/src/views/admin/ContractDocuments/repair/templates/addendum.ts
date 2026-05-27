/** Универсальный шаблон для вкладок «Дополнительное соглашение №1..№5». */
export const repairTemplateAddendum = `
<div class="docPrint">
  <div class="repairAddendumHeaderBlock">
    <h1 class="repairAddendumHeaderTitle">{{addendum.headerMain}}</h1>
    <p class="repairAddendumHeaderSub">{{addendum.headerSub}}</p>
    <div class="repairAddendumMetaRow">
      <span class="repairAddendumMetaDate">{{addendum.documentDate}}</span>
      <span class="repairAddendumMetaCity">г. Мурманск</span>
    </div>
  </div>

  <p style="margin: 0 0 10pt; text-align: justify;">
    Стороны согласовали изменение объема и/или стоимости работ по договору
    № {{contract.number}} от {{contract.date}} по объекту: {{object.objectAddress}}.
  </p>

  <section>
    {{addendum.roomsHtml}}
  </section>

  <p style="margin: 10pt 0 0;">{{addendum.workPeriodIncreaseSentence}}</p>
  <p style="margin: 6pt 0 0;">
    Настоящее дополнительное соглашение является неотъемлемой частью договора.
  </p>
</div>
`.trim();
