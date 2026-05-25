import type { RepairContractPerInstallerWorkOrder } from './RepairContractWorkOrderHubContext';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type FinalWorkOrderLineRow = {
  workName: string;
  quantity: number;
  unit: string;
  adjustedAmount: number;
};

export type FinalWorkOrderCategorySection = {
  categoryName: string;
  rooms: Array<{
    name: string;
    adjustedTotal: number;
    lines: FinalWorkOrderLineRow[];
  }>;
};

export type FinalWorkOrderPrintEmbedInput = {
  contractNum: string;
  contractDate: string;
  objectAddress: string;
  customerFullName: string;
  customerPhone: string;
  showLineAmounts: boolean;
  formatMoneyValue: (n: number) => string;
  formatMoneyRubShort: (n: number) => string;
  formatInstallerNameShort: (name: string) => string;
  formatInstallerGradeShort: (grade: string | null | undefined) => string;
  finalWorkOrderComputed: {
    rooms: unknown[];
    total: number;
    installerTotals: Array<{
      installer: { id: string; fullName: string; grade: string | null };
      total: number;
      lineCount: number;
    }>;
  };
  finalWorkOrderCategorySections: FinalWorkOrderCategorySection[];
  perInstallerWorkOrders: RepairContractPerInstallerWorkOrder[];
};

function buildMetaBlock(input: FinalWorkOrderPrintEmbedInput): string {
  return `<div class="estimateA4Meta repairFinalWorkOrderPrintMeta">
  <p><strong>Договор:</strong> № ${escapeHtml(input.contractNum)} от ${escapeHtml(input.contractDate)}</p>
  <p><strong>Адрес:</strong> ${escapeHtml(input.objectAddress || '—')}</p>
  <p><strong>Заказчик:</strong> ${escapeHtml(input.customerFullName || '—')}</p>
  <p><strong>Телефон заказчика:</strong> ${escapeHtml(input.customerPhone || '—')}</p>
</div>`;
}

function buildRoomTableHtml(
  rooms: FinalWorkOrderCategorySection['rooms'],
  showLineAmounts: boolean,
  formatMoneyValue: (n: number) => string
): string {
  return rooms
    .map(
      (room, roomIndex) => `<section class="estimateA4Room">
  <div class="estimateA4RoomHeader">
    <span>${roomIndex + 1}. ${escapeHtml(room.name)}</span>
    <strong>${formatMoneyValue(room.adjustedTotal)} руб.</strong>
  </div>
  <table class="estimateA4Table estimateA4TableWorkOrder">
    <thead>
      <tr>
        <th>№</th>
        <th>Вид работ</th>
        <th>Кол-во</th>
        ${showLineAmounts ? '<th>Стоимость</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${room.lines
        .map(
          (line, lineIndex) => `<tr>
        <td>${lineIndex + 1}</td>
        <td>${escapeHtml(line.workName)}</td>
        <td>${formatMoneyValue(line.quantity)} ${escapeHtml(line.unit || '')}</td>
        ${showLineAmounts ? `<td>${formatMoneyValue(line.adjustedAmount)}</td>` : ''}
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</section>`
    )
    .join('');
}

function buildCategorySectionsHtml(
  sections: FinalWorkOrderCategorySection[],
  showLineAmounts: boolean,
  formatMoneyValue: (n: number) => string
): string {
  return sections
    .map(
      (section) => `<section class="estimateA4CategorySection">
  <p class="estimateA4Meta">Категория работ: <strong>${escapeHtml(section.categoryName)}</strong></p>
  ${buildRoomTableHtml(section.rooms, showLineAmounts, formatMoneyValue)}
</section>`
    )
    .join('');
}

function buildCommonFinalWorkOrderBodyHtml(input: FinalWorkOrderPrintEmbedInput): string {
  const { finalWorkOrderComputed, finalWorkOrderCategorySections } = input;
  if (finalWorkOrderComputed.rooms.length === 0) {
    return '<p class="estimateA4Empty">Нет данных для итогового заказ-наряда.</p>';
  }

  const categoriesHtml = buildCategorySectionsHtml(
    finalWorkOrderCategorySections,
    input.showLineAmounts,
    input.formatMoneyValue
  );

  const installerTotalsHtml =
    finalWorkOrderComputed.installerTotals.length > 0
      ? `<section class="estimateA4Room">
  <div class="estimateA4RoomHeader"><span>Итоги по мастерам</span></div>
  <div class="estimateA4Meta">
    ${finalWorkOrderComputed.installerTotals
      .map(
        (row) =>
          `<p style="margin:0 0 4pt;">${escapeHtml(input.formatInstallerNameShort(row.installer.fullName))} (${escapeHtml(input.formatInstallerGradeShort(row.installer.grade))}, ${row.lineCount} шт.) - ${input.formatMoneyRubShort(row.total)}руб.</p>`
      )
      .join('')}
  </div>
</section>`
      : '';

  return `<h4 class="estimateA4Title">Итоговый заказ-наряд</h4>
${categoriesHtml}
<p class="estimateA4Total">Итого по итоговому заказ-наряду: <strong>${input.formatMoneyValue(finalWorkOrderComputed.total)} руб.</strong></p>
${installerTotalsHtml}`;
}

function buildInstallerFinalWorkOrderBodyHtml(
  doc: RepairContractPerInstallerWorkOrder,
  input: FinalWorkOrderPrintEmbedInput
): string {
  const categoriesHtml = buildCategorySectionsHtml(
    doc.categories,
    input.showLineAmounts,
    input.formatMoneyValue
  );
  return `<h4 class="estimateA4Title">Заказ-наряд мастера: ${escapeHtml(doc.installer.fullName)} (${escapeHtml(input.formatInstallerGradeShort(doc.installer.grade))})</h4>
${categoriesHtml}
<p class="estimateA4Total">Итого по мастеру: <strong>${input.formatMoneyValue(doc.total)} руб.</strong></p>`;
}

/** HTML итогового заказ-наряда для печати в отдельном окне (`.docPrint` + стили из `printDocument`). */
export function buildFinalWorkOrderPrintEmbedHtml(
  input: FinalWorkOrderPrintEmbedInput,
  variant: 'common' | RepairContractPerInstallerWorkOrder
): string {
  const body =
    variant === 'common'
      ? buildCommonFinalWorkOrderBodyHtml(input)
      : buildInstallerFinalWorkOrderBodyHtml(variant, input);

  return `<div class="docPrint"><div class="estimateA4DocPrintEmbed estimateRoomsEmbed repairFinalWorkOrderPrint">
${buildMetaBlock(input)}
${body}
</div></div>`;
}

/** Общий + заказ-наряды по каждому мастеру (разрывы страниц между блоками). */
export function buildAllFinalWorkOrdersPrintHtml(input: FinalWorkOrderPrintEmbedInput): string {
  if (input.finalWorkOrderComputed.rooms.length === 0) return '';

  const chunks: string[] = [buildFinalWorkOrderPrintEmbedHtml(input, 'common')];
  for (const doc of input.perInstallerWorkOrders) {
    chunks.push(buildFinalWorkOrderPrintEmbedHtml(input, doc));
  }
  return chunks
    .map(
      (html, index) =>
        `<div class="repairWorkOrderHubPrintChunk"${index > 0 ? ' style="page-break-before:always;break-before:page;"' : ''}>${html}</div>`
    )
    .join('\n');
}
