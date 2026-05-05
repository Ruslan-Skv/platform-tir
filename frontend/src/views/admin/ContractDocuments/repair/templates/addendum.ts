export const repairTemplateAddendum = `
<div class="docPrint">
  <div class="repairAddendumHeaderBlock">
    <h1 class="repairAddendumHeaderTitle">{{addendum.headerMain|plain}}</h1>
    <p class="repairAddendumHeaderSub">{{addendum.headerSub|plain}}</p>
  </div>
  <div class="repairAddendumMetaRow">
    <span class="repairAddendumMetaDate">{{addendum.documentDate|plain}}</span>
    <span class="repairAddendumMetaCity">г. Мурманск</span>
  </div>
  <div class="repairAddendumEstimateBody">{{addendum.roomsHtml}}</div>
</div>
`.trim();
