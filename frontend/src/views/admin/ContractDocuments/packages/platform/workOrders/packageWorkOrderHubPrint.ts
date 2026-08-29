import {
  buildDocumentPdfBlob,
  downloadDocumentPdf,
  printDocumentHtml,
} from '../../../core/printDocument';
import { pickWindowsPackagePrintDocumentOptions } from '../../families/product-like/print/productPackagePrint';
import type {
  PackagePerInstallerWorkOrder,
  PackageWorkOrderHubContextValue,
} from '../hub/workOrders/PackageWorkOrderHubContext';
import {
  PACKAGE_WORK_ORDER_HUB_MODAL_TITLE,
  type PackageWorkOrderHubTabId,
  packageWorkOrderHubTabLabel,
  packageWorkOrderHubTabsForPackage,
} from '../hub/workOrders/packageWorkOrderHubTabs';
import { isPackageWorkOrderAddendumTab } from '../tabs/packageDocumentTabs';
import {
  type FinalWorkOrderPrintEmbedInput,
  buildAllFinalWorkOrdersPrintHtml,
  buildFinalWorkOrderPrintEmbedHtml,
} from './packageWorkOrderPrintEmbedHtml';
import { buildWorkOrderInstallationMetaLines } from './workOrderInstallationMeta';

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

export function isPackageWorkOrderShareableHubTab(tab: PackageWorkOrderHubTabId): boolean {
  return isPackageWorkOrderTemplateHubTab(tab) || tab === 'finalWorkOrder';
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
  const installation = ctx.linkedInstallationSchedule
    ? buildWorkOrderInstallationMetaLines(ctx.linkedInstallationSchedule)
    : null;
  return {
    contractNum: ctx.estimateAppendixContractRef.num,
    contractDate: ctx.estimateAppendixContractRef.date,
    objectAddress: ctx.form.object.objectAddress,
    customerFullName: ctx.form.customer.fullName,
    customerPhone: ctx.form.customer.phone,
    installationDateTime: installation?.dateTime ?? null,
    installationInstaller: installation?.installer ?? null,
    installationContacts: installation?.contacts ?? [],
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

function resolveFinalWorkOrderVariant(
  ctx: PackageWorkOrderHubContextValue
): 'common' | PackagePerInstallerWorkOrder {
  if (ctx.activeFinalWorkOrderDocId === 'common') return 'common';
  return (
    ctx.perInstallerWorkOrders.find((d) => d.installer.id === ctx.activeFinalWorkOrderDocId) ??
    'common'
  );
}

function sanitizeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^\dA-Za-zА-Яа-яЁё_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'doc'
  );
}

export type PackageWorkOrderHubSharePayload = {
  html: string;
  documentTitle: string;
  fileName: string;
  message: string;
  /** Телефон конкретного мастера (если отправляется его лист). */
  installerPhone: string;
  installerLabel: string | null;
};

function installerPrimaryPhone(installer: {
  phone?: string | null;
  phones?: string[] | null;
}): string {
  const fromList = installer.phones?.map((p) => p.trim()).find(Boolean);
  if (fromList) return fromList;
  return installer.phone?.trim() || '';
}

function buildHubShareMessage(
  ctx: PackageWorkOrderHubContextValue,
  documentTitle: string,
  installerFullName: string | null
): string {
  const lines: string[] = [documentTitle];
  if (installerFullName) {
    lines.push(`Монтажник: ${installerFullName}`);
  }
  lines.push(
    `Договор: № ${ctx.estimateAppendixContractRef.num} от ${ctx.estimateAppendixContractRef.date}`
  );
  if (ctx.form.object.objectAddress?.trim()) {
    lines.push(`Адрес: ${ctx.form.object.objectAddress.trim()}`);
  }
  if (ctx.form.customer.fullName?.trim()) {
    lines.push(`Заказчик: ${ctx.form.customer.fullName.trim()}`);
  }
  if (ctx.form.customer.phone?.trim()) {
    lines.push(`Телефон заказчика: ${ctx.form.customer.phone.trim()}`);
  }
  if (ctx.linkedInstallationSchedule) {
    const meta = buildWorkOrderInstallationMetaLines(ctx.linkedInstallationSchedule);
    lines.push(`Дата и время монтажа: ${meta.dateTime}`);
    if (meta.installer) lines.push(`Монтажник (график): ${meta.installer}`);
    for (const contact of meta.contacts) lines.push(contact);
  }
  lines.push('', 'Во вложении — PDF заказ-наряда.');
  return lines.join('\n');
}

/** Готовит HTML/метаданные для отправки текущего заказ-наряда из hub. */
export function buildPackageWorkOrderHubSharePayload(
  panelTab: PackageWorkOrderHubTabId,
  ctx: PackageWorkOrderHubContextValue
): PackageWorkOrderHubSharePayload {
  const contractPart = sanitizeFilePart(ctx.estimateAppendixContractRef.num);
  const datePart = sanitizeFilePart(ctx.estimateAppendixContractRef.date);

  if (isPackageWorkOrderTemplateHubTab(panelTab)) {
    const html = ctx.getTemplatePreviewHtml(panelTab).trim();
    if (!html) {
      throw new Error('Нет данных для этого заказ-наряда');
    }
    const documentTitle = packageWorkOrderHubTabLabel(panelTab, false, ctx.packageKind);
    return {
      html: wrapTemplateWorkOrderHtml(html, ctx.isWindowsPackage),
      documentTitle,
      fileName: `Zakaz-naryad_${contractPart}_${datePart}.pdf`,
      message: buildHubShareMessage(ctx, documentTitle, null),
      installerPhone: '',
      installerLabel: null,
    };
  }

  if (panelTab !== 'finalWorkOrder') {
    throw new Error('Отправка для этой вкладки недоступна');
  }

  const input = buildFinalWorkOrderPrintInput(ctx);
  if (input.finalWorkOrderComputed.rooms.length === 0) {
    throw new Error('Нет данных для итогового заказ-наряда');
  }

  const variant = resolveFinalWorkOrderVariant(ctx);
  const html = buildFinalWorkOrderPrintEmbedHtml(input, variant, ctx.isWindowsPackage);
  const isInstallerSheet = variant !== 'common';
  const installerFullName = isInstallerSheet ? variant.installer.fullName : null;
  const documentTitle = isInstallerSheet
    ? `Заказ-наряд мастера: ${ctx.formatInstallerNameShort(variant.installer.fullName)}`
    : 'Общий итоговый заказ-наряд';
  const installerPart = isInstallerSheet
    ? sanitizeFilePart(ctx.formatInstallerNameShort(variant.installer.fullName))
    : 'obshiy';

  return {
    html,
    documentTitle,
    fileName: `Zakaz-naryad_${installerPart}_${contractPart}_${datePart}.pdf`,
    message: buildHubShareMessage(ctx, documentTitle, installerFullName),
    installerPhone: isInstallerSheet ? installerPrimaryPhone(variant.installer) : '',
    installerLabel: installerFullName,
  };
}

export async function downloadPackageWorkOrderHubTabPdf(
  panelTab: PackageWorkOrderHubTabId,
  ctx: PackageWorkOrderHubContextValue
): Promise<void> {
  const payload = buildPackageWorkOrderHubSharePayload(panelTab, ctx);
  await downloadDocumentPdf(
    payload.html,
    payload.documentTitle,
    payload.fileName,
    workOrderHubPrintOptions(ctx)
  );
}

export async function buildPackageWorkOrderHubTabPdfFile(
  panelTab: PackageWorkOrderHubTabId,
  ctx: PackageWorkOrderHubContextValue
): Promise<{ file: File; payload: PackageWorkOrderHubSharePayload }> {
  const payload = buildPackageWorkOrderHubSharePayload(panelTab, ctx);
  const { blob, fileName } = await buildDocumentPdfBlob(
    payload.html,
    payload.documentTitle,
    payload.fileName,
    workOrderHubPrintOptions(ctx)
  );
  return {
    file: new File([blob], fileName, { type: 'application/pdf' }),
    payload,
  };
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

  const variant = resolveFinalWorkOrderVariant(ctx);

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
