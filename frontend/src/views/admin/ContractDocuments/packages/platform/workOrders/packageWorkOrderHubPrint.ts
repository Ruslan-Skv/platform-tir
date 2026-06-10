import { printDocumentHtml } from '../../../core/printDocument';
import { pickWindowsPackagePrintDocumentOptions } from '../../families/product-like/print/productPackagePrint';
import type { PackageWorkOrderHubContextValue } from '../hub/PackageWorkOrderHubContext';
import {
  PACKAGE_WORK_ORDER_HUB_MODAL_TITLE,
  type PackageWorkOrderHubTabId,
  packageWorkOrderHubTabLabel,
  packageWorkOrderHubTabsForPackage,
} from '../hub/packageWorkOrderHubTabs';
import { isPackageWorkOrderAddendumTab } from '../tabs/packageDocumentTabs';
import {
  type FinalWorkOrderPrintEmbedInput,
  buildAllFinalWorkOrdersPrintHtml,
  buildFinalWorkOrderPrintEmbedHtml,
} from './packageWorkOrderPrintEmbedHtml';

export const BODY_PRINT_ESTIMATE_CLASS = 'body-print-estimate-sheet';

const HUB_PRINT_PAGE_BREAK_CSS = `<style>
.packageWorkOrderHubPrintChunk + .packageWorkOrderHubPrintChunk {
  page-break-before: always;
  break-before: page;
}
.packageWorkOrderHubPrintHeading {
  font-family: "Times New Roman", Times, serif;
  font-size: 14pt;
  font-weight: 700;
  text-align: center;
  margin: 0 0 12pt;
}
</style>`;

function isPackageWorkOrderTemplateHubTab(tab: PackageWorkOrderHubTabId): boolean {
  return tab === 'workOrder' || isPackageWorkOrderAddendumTab(tab);
}

/** Вкладки заказ-нарядов для пакетной печати (без интерактивной сметы). */
export function packageWorkOrderHubTabsForBatchPrint(
  addendumSlotCount: number,
  packageKind: PackageWorkOrderHubContextValue['packageKind'] = 'REPAIR'
): PackageWorkOrderHubTabId[] {
  return packageWorkOrderHubTabsForPackage(addendumSlotCount, packageKind).filter(
    (id) => isPackageWorkOrderTemplateHubTab(id) || id === 'finalWorkOrder'
  );
}

function buildFinalWorkOrderPrintInput(
  ctx: PackageWorkOrderHubContextValue
): FinalWorkOrderPrintEmbedInput {
  return {
    contractNum: ctx.estimateAppendixContractRef.num,
    contractDate: ctx.estimateAppendixContractRef.date,
    objectAddress: ctx.form.object.objectAddress,
    customerFullName: ctx.form.customer.fullName,
    customerPhone: ctx.form.customer.phone,
    showInstallerGrades: !ctx.isWindowsPackage,
    showLineAmounts: ctx.form.workOrder.showLineAmounts,
    formatMoneyValue: ctx.formatMoneyValue,
    formatMoneyRubShort: ctx.formatMoneyRubShort,
    formatInstallerNameShort: ctx.formatInstallerNameShort,
    formatInstallerGradeShort: ctx.formatInstallerGradeShort,
    finalWorkOrderComputed: ctx.finalWorkOrderComputed,
    finalWorkOrderCategorySections: ctx.finalWorkOrderCategorySections,
    perInstallerWorkOrders: ctx.perInstallerWorkOrders,
  };
}

function wrapTemplateWorkOrderHtml(html: string, windowsPackage: boolean): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  const rootClass = windowsPackage ? 'docPrint windowsPackageUnifiedPrint' : 'docPrint';
  return `<div class="${rootClass}">${trimmed}</div>`;
}

function workOrderHubPrintOptions(
  ctx: PackageWorkOrderHubContextValue
): ReturnType<typeof pickWindowsPackagePrintDocumentOptions> | undefined {
  return ctx.isWindowsPackage
    ? pickWindowsPackagePrintDocumentOptions('estimate', ctx.form)
    : undefined;
}

function printTemplateWorkOrderTab(
  tab: PackageWorkOrderHubTabId,
  ctx: PackageWorkOrderHubContextValue
): void {
  const html = ctx.getTemplatePreviewHtml(tab);
  if (!html.trim()) {
    window.alert('Нет данных для печати этого заказ-наряда.');
    return;
  }
  printDocumentHtml(
    wrapTemplateWorkOrderHtml(html, ctx.isWindowsPackage),
    packageWorkOrderHubTabLabel(tab, false, ctx.packageKind),
    workOrderHubPrintOptions(ctx)
  );
}

function printFinalWorkOrderTab(ctx: PackageWorkOrderHubContextValue): void {
  const input = buildFinalWorkOrderPrintInput(ctx);
  if (input.finalWorkOrderComputed.rooms.length === 0) {
    window.alert('Нет данных для печати итогового заказ-наряда.');
    return;
  }

  const variant =
    ctx.activeFinalWorkOrderDocId === 'common'
      ? 'common'
      : (ctx.perInstallerWorkOrders.find((d) => d.installer.id === ctx.activeFinalWorkOrderDocId) ??
        'common');

  printDocumentHtml(
    buildFinalWorkOrderPrintEmbedHtml(input, variant, ctx.isWindowsPackage),
    packageWorkOrderHubTabLabel('finalWorkOrder', false, ctx.packageKind),
    workOrderHubPrintOptions(ctx)
  );
}

/** Печать листа итогового заказ-наряда с текущей страницы (как на вкладке редактора). */
export function printPackageWorkOrderSheetFromPage(): void {
  const target = document.querySelector(`[data-print-target='work-order-sheet']`);
  if (!target) {
    window.alert('Откройте вкладку «Итог. заказ-наряд» для печати.');
    return;
  }
  document.body.classList.add(BODY_PRINT_ESTIMATE_CLASS);
  const cleanup = (): void => {
    document.body.classList.remove(BODY_PRINT_ESTIMATE_CLASS);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 120_000);
  window.print();
}

/** Печать активной вкладки модалки заказ-нарядов. */
export function printPackageWorkOrderHubTab(
  panelTab: PackageWorkOrderHubTabId,
  ctx: PackageWorkOrderHubContextValue
): void {
  if (panelTab === 'interactiveFinalEstimate') {
    window.alert(
      ctx.isWindowsPackage
        ? 'Печать интерактивного счёт-заказа из этого окна недоступна.'
        : 'Печать интерактивной итоговой сметы из этого окна недоступна.'
    );
    return;
  }
  if (isPackageWorkOrderTemplateHubTab(panelTab)) {
    printTemplateWorkOrderTab(panelTab, ctx);
    return;
  }
  if (panelTab === 'finalWorkOrder') {
    printFinalWorkOrderTab(ctx);
    return;
  }
}

/** Печать всех заказ-нарядов пакета: шаблонные + общий итоговый + по мастерам. */
export function printAllPackageWorkOrdersFromHub(
  ctx: PackageWorkOrderHubContextValue,
  addendumSlotCount: number
): void {
  const tabs = packageWorkOrderHubTabsForBatchPrint(addendumSlotCount, ctx.packageKind);
  const chunks: string[] = [];

  for (const tab of tabs) {
    if (tab === 'finalWorkOrder') continue;
    const html = ctx.getTemplatePreviewHtml(tab);
    if (!html.trim()) continue;
    chunks.push(
      `<div class="packageWorkOrderHubPrintChunk">
  <p class="packageWorkOrderHubPrintHeading">${packageWorkOrderHubTabLabel(tab, false, ctx.packageKind)}</p>
  ${wrapTemplateWorkOrderHtml(html, ctx.isWindowsPackage)}
</div>`
    );
  }

  const finalHtml = buildAllFinalWorkOrdersPrintHtml(
    buildFinalWorkOrderPrintInput(ctx),
    ctx.isWindowsPackage
  );
  if (finalHtml.trim()) {
    chunks.push(
      `<div class="packageWorkOrderHubPrintChunk">
  <p class="packageWorkOrderHubPrintHeading">${packageWorkOrderHubTabLabel('finalWorkOrder', false, ctx.packageKind)}</p>
  ${finalHtml}
</div>`
    );
  }

  if (chunks.length === 0) {
    window.alert('Нет данных для печати заказ-нарядов.');
    return;
  }

  printDocumentHtml(
    `${HUB_PRINT_PAGE_BREAK_CSS}\n${chunks.join('\n')}`,
    PACKAGE_WORK_ORDER_HUB_MODAL_TITLE,
    workOrderHubPrintOptions(ctx)
  );
}
