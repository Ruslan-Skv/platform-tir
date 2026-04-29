export const repairTemplateEstimate = `
<div class="docPrint">
  <h1>Смета (расчёт заказа)</h1>
  <p>Итоговая сумма: <strong>{{estimate.total}}</strong></p>
  <p>Помещений: {{estimate.roomsCount}}, позиций: {{estimate.linesCount}}</p>
  <p>Комментарий/сводка:</p>
  <pre class="estimatePre">{{estimate.notes}}</pre>
  <p>Состав сметы по помещениям:</p>
  <pre class="estimatePre">{{estimate.rooms}}</pre>
</div>
`.trim();
