export type EstimateDocPrintExecutorPartyLabel = 'Подрядчик' | 'Исполнитель';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildEstimateDocPrintSignaturesHtml(
  directorName: string,
  customerFullName: string,
  executorPartyLabel: EstimateDocPrintExecutorPartyLabel = 'Подрядчик'
): string {
  const d = escapeHtml(directorName.trim() || '____________');
  const c = escapeHtml(customerFullName.trim() || '____________');
  const executor = escapeHtml(executorPartyLabel);
  return `<div class="estimateA4Signatures">
  <table class="estimateA4SignaturesTable">
    <tbody>
      <tr>
        <td class="estimateA4SignaturesCellLeft">
          <p class="estimateA4SignaturePartyLine">${executor} _____________________ / ${d}</p>
          <p class="estimateA4SignNote">м.п.</p>
        </td>
        <td class="estimateA4SignaturesCellRight">
          <p class="estimateA4SignaturePartyLine">Заказчик _____________________ / ${c}</p>
          <p class="estimateA4SignNote">подпись</p>
        </td>
      </tr>
    </tbody>
  </table>
</div>`;
}

function buildHandwritingNoteHtml(): string {
  return `<div class="estimateA4HandwritingNote">
  <p class="estimateA4HandwritingNoteLabel">Примечание:</p>
  <div class="estimateA4HandwritingLines" aria-hidden="true">
    <div class="estimateA4HandwritingLine"></div>
    <div class="estimateA4HandwritingLine"></div>
    <div class="estimateA4HandwritingLine"></div>
  </div>
</div>`;
}

export function buildEstimateDocPrintFooterHtml(options: {
  directorName: string;
  customerFullName: string;
  /** В договорах «Окна» / «Двери» в подписи — «Исполнитель», в «Ремонт» — «Подрядчик». */
  executorPartyLabel?: EstimateDocPrintExecutorPartyLabel;
  /** Блок «Примечание» с линиями для рукописного текста (как на вкладке «Смета»). */
  includeHandwritingNote?: boolean;
  /** Повтор блока подписей после примечания. */
  repeatSignatures?: boolean;
}): string {
  const {
    directorName,
    customerFullName,
    executorPartyLabel = 'Подрядчик',
    includeHandwritingNote = true,
    repeatSignatures = true,
  } = options;
  const signatures = buildEstimateDocPrintSignaturesHtml(
    directorName,
    customerFullName,
    executorPartyLabel
  );
  const handwriting = includeHandwritingNote ? buildHandwritingNoteHtml() : '';
  const signaturesRepeat = repeatSignatures ? signatures : '';
  return `<div class="estimateA4DocPrintEmbed estimateRoomsEmbed">
${signatures}
${handwriting}
${signaturesRepeat}
</div>`;
}

/** Подписи сторон для «Окна» / «Двери»: один блок без примечания (спецификация и т.п.). */
export function buildProductPackageSignaturesFooterHtml(options: {
  directorName: string;
  customerFullName: string;
}): string {
  return buildEstimateDocPrintFooterHtml({
    directorName: options.directorName,
    customerFullName: options.customerFullName,
    executorPartyLabel: 'Исполнитель',
    includeHandwritingNote: false,
    repeatSignatures: false,
  });
}
