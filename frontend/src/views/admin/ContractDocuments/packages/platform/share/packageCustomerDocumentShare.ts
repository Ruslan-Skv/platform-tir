import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentEstimatePresets,
  getContractDocumentPackage,
  getContractDocumentTemplatePresets,
  getContractDocumentWindowsSettings,
} from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import type { MessengerShareChannel } from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';
import { buildMessengerShareUrl } from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';
import { contractDateToDdMmYyyy } from '@/views/admin/ContractDocuments/core/contractDateFormat';
import {
  type PrintDocumentOptions,
  buildDocumentPdfBlob,
  pickPrintMarginFooterNames,
} from '@/views/admin/ContractDocuments/core/printDocument';
import {
  isProductDirectionPackageKind,
  packageUsesLineSpecification,
} from '@/views/admin/ContractDocuments/packages/config';
import { buildFurnitureAppliancesSheetHtml } from '@/views/admin/ContractDocuments/packages/directions/furniture/furnitureAppliancesDocs';
import { buildCeilingsSpecificationSheetHtml } from '@/views/admin/ContractDocuments/packages/families/product-like/ceilings/ceilingsSpecification';
import {
  WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS,
  pickWindowsPackagePrintDocumentOptions,
  resolvePackageEditorPrintOptions,
} from '@/views/admin/ContractDocuments/packages/families/product-like/print/productPackagePrint';
import {
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  normalizeWindowsWorkOrderMarkupPercent,
} from '@/views/admin/ContractDocuments/packages/families/product-like/print/productWorkOrder';
import {
  buildDoorsSpecificationSheetHtml,
  normalizeDoorsSpecificationLines,
} from '@/views/admin/ContractDocuments/packages/families/product-like/specification/doorsSpecification';
import { packageTemplatePresetsKind } from '@/views/admin/ContractDocuments/packages/platform/catalogKinds';
import { formatPackageMoneyValue } from '@/views/admin/ContractDocuments/packages/platform/editor/estimateTab/estimateTabUi';
import { buildFinalEstimateSummary } from '@/views/admin/ContractDocuments/packages/platform/editor/shared/finalEstimateSummary';
import { buildPackageTemplatePreviewHtml } from '@/views/admin/ContractDocuments/packages/platform/editor/template/buildPackageTemplatePreviewHtml';
import { PACKAGE_TEMPLATE_TAB_IDS } from '@/views/admin/ContractDocuments/packages/platform/editor/template/packageTemplateTabUtils';
import { applyEstimatePresetIdsToPackageForm } from '@/views/admin/ContractDocuments/packages/platform/estimates/applyEstimatePresetIds';
import { estimatePresetsCatalogKind } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimatePresetsCatalogKind';
import {
  buildEstimateSectionsFromPresetIds,
  buildEstimateSheetPrintHtml,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/packageEstimateDocPrintEmbedHtml';
import {
  type PackageDocumentTemplateTabId,
  mergeFormDataFromStorage,
} from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDiscount';
import { getPackageContractNumberDisplayForForm } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import type { PackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  isPackageActTwinOneSheetTab,
  wrapPackageActTwinCopiesOnOnePageHtml,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';
import {
  PACKAGE_DOCUMENT_TAB_IDS,
  type PackageDocumentTabId,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';
import { isPackageLibraryTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { packageEditorTabLabel } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageTabLabel';
import { packageTemplatePresetEditorTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageTemplatePresetTab';
import { resolvePackageEditorVisibleTabs } from '@/views/admin/ContractDocuments/packages/platform/tabs/resolvePackageEditorTabs';
import {
  libraryTemplateFallbackHtml,
  packageDocumentTemplateFallbackHtml,
} from '@/views/admin/ContractDocuments/packages/templates';

/** Документы пакета, которые обычно отправляют заказчику (не монтажникам / не внутренние). */
const CUSTOMER_SHAREABLE_TAB_IDS = new Set<PackageDocumentTabId>([
  'contract',
  'consent',
  'drawings',
  'estimate',
  'specification',
  'finalEstimate',
  'actStart',
  'actAcceptance',
  'deliveryNote',
  'memo',
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
]);

const PAGE_BREAK_CSS = `<style>
.packageCustomerSharePrintChunk + .packageCustomerSharePrintChunk {
  page-break-before: always;
  break-before: page;
}
.packageCustomerSharePrintHeading {
  font-family: "Times New Roman", Times, serif;
  font-size: 14pt;
  font-weight: 700;
  text-align: center;
  margin: 0 0 12pt;
}
</style>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^\dA-Za-zА-Яа-яЁё_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'doc'
  );
}

function resolveTemplateHtmlStandalone(
  packageKind: ContractDocumentPackageKind,
  contractTemplatePresets: ContractTemplatePreset[],
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>,
  tab: PackageDocumentTemplateTabId
): string {
  const byTab = new Map<PackageDocumentTemplateTabId, ContractTemplatePreset[]>();
  for (const id of PACKAGE_TEMPLATE_TAB_IDS) byTab.set(id, []);
  for (const item of contractTemplatePresets) {
    if (item.archived) continue;
    const tabId = packageTemplatePresetEditorTabId(item);
    if (!tabId) continue;
    byTab.set(tabId, [...(byTab.get(tabId) ?? []), { ...item, tabId }]);
  }
  const list = byTab.get(tab) ?? [];
  const selectedId = selectedTemplateIds[tab] ?? '';
  const selected = list.find((it) => it.id === selectedId);
  if (selected?.html?.trim()) return selected.html;
  const fallback = list.find((it) => it.isDefault) ?? list[0];
  if (fallback?.html?.trim()) return fallback.html;
  if (isPackageLibraryTemplateTabId(tab)) {
    return libraryTemplateFallbackHtml(packageKind, tab);
  }
  return packageDocumentTemplateFallbackHtml(packageKind, tab);
}

export type PackageCustomerShareableDocument = {
  tabId: PackageDocumentTabId;
  label: string;
  /** Файл спецификации (Окна) — не PDF из шаблона. */
  isExternalFile?: boolean;
  externalFileName?: string;
  /** Несколько прикреплённых файлов (чертежи потолков) — относительные URL загрузок. */
  externalFileUrls?: string[];
};

export type PackageCustomerShareContext = {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  windowsWorkOrderMarkupPercent: number;
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
  shareableDocuments: PackageCustomerShareableDocument[];
  customerPhone: string;
  customerEmail: string;
  contractNumberLabel: string;
  contractDateLabel: string;
};

function buildFinalEstimateSheetHtml(ctx: PackageCustomerShareContext): string {
  const summary = buildFinalEstimateSummary(ctx.form);
  const discount = parsePackageContractDiscountPercent(ctx.form.contract.discountPercent);
  const totalAfterDiscount = applyPackageContractDiscountToAmount(summary.totalAmount, discount);

  const roomMap = new Map<
    string,
    {
      name: string;
      total: number;
      lines: Array<{
        name: string;
        unit: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
    }
  >();
  for (const row of summary.rows) {
    const room = roomMap.get(row.roomName) ?? { name: row.roomName, total: 0, lines: [] };
    const price = row.quantity > 0 ? row.amount / row.quantity : 0;
    room.lines.push({
      name: row.workName,
      unit: row.unit,
      quantity: row.quantity,
      price,
      amount: row.amount,
    });
    room.total += row.amount;
    roomMap.set(row.roomName, room);
  }
  const rooms = [...roomMap.values()];

  if (rooms.length === 0) {
    return `<div class="docPrint"><div class="estimateA4DocPrintEmbed estimateA4Sheet"><p class="estimateA4Empty">Нет данных для итоговой сметы.</p></div></div>`;
  }

  const roomsHtml = rooms
    .map((room, roomIndex) => {
      const linesHtml = room.lines
        .map(
          (line, lineIndex) => `<tr>
  <td>${lineIndex + 1}</td>
  <td>${escapeHtml(line.name)}</td>
  <td>${escapeHtml(line.unit || '—')}</td>
  <td style="text-align:right;">${escapeHtml(formatPackageMoneyValue(line.quantity))}</td>
  <td style="text-align:right;">${escapeHtml(formatPackageMoneyValue(line.price))}</td>
  <td style="text-align:right;">${escapeHtml(formatPackageMoneyValue(line.amount))}</td>
</tr>`
        )
        .join('');
      return `<section class="estimateA4Room">
  <div class="estimateA4RoomHeader">
    <span>${roomIndex + 1}. ${escapeHtml(room.name)}</span>
    <strong>${escapeHtml(formatPackageMoneyValue(room.total))} руб.</strong>
  </div>
  <table class="estimateA4Table">
    <thead>
      <tr>
        <th>№</th>
        <th>Наименование</th>
        <th>Ед.</th>
        <th>Кол-во</th>
        <th>Цена</th>
        <th>Сумма</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>
</section>`;
    })
    .join('\n');

  const discountBlock =
    discount > 0
      ? `<p class="estimateA4DiscountMeta">Скидка по договору: ${escapeHtml(String(discount))}%</p>
<p class="estimateA4Total"><strong>Итого со скидкой: ${escapeHtml(formatPackageMoneyValue(totalAfterDiscount))} руб.</strong></p>`
      : '';

  return `<div class="docPrint"><div class="estimateA4DocPrintEmbed estimateA4Sheet estimateRoomsEmbed">
<p class="estimateA4AppendixRef">Приложение №1 к договору № ${escapeHtml(ctx.contractNumberLabel)} от ${escapeHtml(ctx.contractDateLabel)}</p>
<h4 class="estimateA4Title">Итоговая смета работ</h4>
<p class="estimateA4Meta">Помещений: ${rooms.length}</p>
${roomsHtml}
<p class="estimateA4Total"><strong>Итого: ${escapeHtml(formatPackageMoneyValue(summary.totalAmount))} руб.</strong></p>
${discountBlock}
</div></div>`;
}

function buildSpecificationSheetHtml(ctx: PackageCustomerShareContext): string {
  if (ctx.packageKind === 'CEILINGS') {
    const inner = buildCeilingsSpecificationSheetHtml({
      contractNumberLabel: ctx.contractNumberLabel,
      contractDateLabel: ctx.contractDateLabel,
      directorName: ctx.form.executor.directorName,
      customerFullName: ctx.form.customer.fullName,
      spec: ctx.form.ceilingsSpecification,
    });
    return `<div class="docPrint ${WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS}"><div class="estimateA4DocPrintEmbed estimateA4Sheet">${inner}</div></div>`;
  }

  if (packageUsesLineSpecification(ctx.packageKind)) {
    const lines = normalizeDoorsSpecificationLines(ctx.form.doorsSpecificationLines);
    const inner = buildDoorsSpecificationSheetHtml({
      contractNumberLabel: ctx.contractNumberLabel,
      contractDateLabel: ctx.contractDateLabel,
      lines,
      directorName: ctx.form.executor.directorName,
      customerFullName: ctx.form.customer.fullName,
      discountPercent:
        ctx.form.doorsSpecificationDiscountPercent || ctx.form.contract.discountPercent,
      packageKind: ctx.packageKind,
    });
    return `<div class="docPrint ${WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS}"><div class="estimateA4DocPrintEmbed estimateA4Sheet">${inner}</div></div>`;
  }

  return '';
}

function buildEstimateHtml(ctx: PackageCustomerShareContext): string {
  const sections = buildEstimateSectionsFromPresetIds(
    ctx.form.estimate.selectedPresetIds,
    ctx.estimatePresets,
    ctx.estimateGroups
  );
  const isProduct = isProductDirectionPackageKind(ctx.packageKind);
  return buildEstimateSheetPrintHtml({
    variant: isProduct ? 'windows' : 'repair',
    appendixNumber: 2,
    contractNum: ctx.contractNumberLabel,
    contractDate: ctx.contractDateLabel,
    sections,
    snapshot: ctx.form.estimate.snapshot,
    directorName: ctx.form.executor.directorName,
    customerFullName: ctx.form.customer.fullName,
    contractDiscountPercent: ctx.form.contract.discountPercent,
    docPrintRootClass: isProduct ? WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS : undefined,
  });
}

function wrapTemplateDocHtml(
  html: string,
  tab: PackageDocumentTabId,
  packageKind: ContractDocumentPackageKind
): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  const body = isPackageActTwinOneSheetTab(tab, packageKind)
    ? wrapPackageActTwinCopiesOnOnePageHtml(trimmed)
    : trimmed;
  if (/class=["'][^"']*docPrint/.test(body)) return body;
  const rootClass = isProductDirectionPackageKind(packageKind)
    ? `docPrint ${WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS}`
    : 'docPrint';
  return `<div class="${rootClass}">${body}</div>`;
}

/** HTML одного выбранного документа; пустая строка — нет данных / внешний файл. */
export function buildPackageCustomerDocumentHtml(
  ctx: PackageCustomerShareContext,
  tab: PackageDocumentTabId
): string {
  if (tab === 'estimate') return buildEstimateHtml(ctx);
  if (tab === 'finalEstimate') return buildFinalEstimateSheetHtml(ctx);
  if (tab === 'specification') return buildSpecificationSheetHtml(ctx);
  if (tab === 'deliveryNote' && ctx.packageKind === 'FURNITURE') {
    const furniture = ctx.form.furniture;
    if (!furniture?.appliances?.enabled) return '';
    return buildFurnitureAppliancesSheetHtml(furniture.appliancesDocs, {
      contractNumber: furniture.appliances.contract.number || ctx.form.contract.number,
      contractDate: ctx.form.contract.date,
    });
  }

  const html = buildPackageTemplatePreviewHtml(tab, {
    form: ctx.form,
    packageKind: ctx.packageKind,
    windowsWorkOrderMarkupPercent: ctx.windowsWorkOrderMarkupPercent,
    estimatePresets: ctx.estimatePresets,
    estimateGroups: ctx.estimateGroups,
    templateOverrides: ctx.templateOverrides,
    resolveTemplateHtml: ctx.resolveTemplateHtml,
  });
  return wrapTemplateDocHtml(html, tab, ctx.packageKind);
}

function printOptionsForTab(
  ctx: PackageCustomerShareContext,
  tab: PackageDocumentTabId
): PrintDocumentOptions | undefined {
  const windowsOpts = resolvePackageEditorPrintOptions(ctx.packageKind, tab, ctx.form);
  if (windowsOpts) return windowsOpts;
  if (tab === 'contract') {
    return { marginFooter: pickPrintMarginFooterNames(ctx.form), contractCompact: true };
  }
  if (
    tab === 'consent' ||
    tab === 'actStart' ||
    tab === 'actAcceptance' ||
    tab === 'memo' ||
    tab === 'deliveryNote' ||
    tab === 'finalEstimate' ||
    tab === 'estimate' ||
    tab === 'specification'
  ) {
    return { contractCompact: true };
  }
  return isProductDirectionPackageKind(ctx.packageKind)
    ? pickWindowsPackagePrintDocumentOptions(tab, ctx.form)
    : { contractCompact: true };
}

export function listPackageCustomerShareableDocuments(
  packageKind: ContractDocumentPackageKind,
  form: PackageFormData
): PackageCustomerShareableDocument[] {
  const visible = resolvePackageEditorVisibleTabs({
    tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
    packageKind,
    addendumSlotCount: form.addendumSlotCount,
    furnitureMontageEnabled: form.furniture?.montage?.enabled === true,
    furnitureAppliancesEnabled: form.furniture?.appliances?.enabled === true,
  });

  const out: PackageCustomerShareableDocument[] = [];
  for (const tabId of visible) {
    if (!CUSTOMER_SHAREABLE_TAB_IDS.has(tabId)) continue;
    const label = packageEditorTabLabel(packageKind, tabId);
    if (tabId === 'drawings') {
      /** Чертежи потолков: отправляются как отдельные файлы-картинки. */
      const urls = form.drawingPhotoUrls.filter((u) => u.trim().length > 0);
      if (urls.length === 0) continue;
      out.push({ tabId, label, isExternalFile: true, externalFileUrls: urls });
      continue;
    }
    if (
      tabId === 'specification' &&
      isProductDirectionPackageKind(packageKind) &&
      !packageUsesLineSpecification(packageKind) &&
      packageKind !== 'CEILINGS'
    ) {
      const fileUrl = form.productSpecificationFileUrl?.trim();
      out.push({
        tabId,
        label,
        isExternalFile: Boolean(fileUrl),
        externalFileName: form.productSpecificationFileName?.trim() || 'Спецификация',
      });
      continue;
    }
    out.push({ tabId, label });
  }
  return out;
}

export function defaultSelectedCustomerDocumentTabs(
  docs: PackageCustomerShareableDocument[]
): PackageDocumentTabId[] {
  const preferred: PackageDocumentTabId[] = ['contract', 'estimate'];
  const ids = new Set(docs.map((d) => d.tabId));
  const selected = preferred.filter((id) => ids.has(id));
  return selected.length > 0 ? selected : docs[0] ? [docs[0].tabId] : [];
}

function customerPrimaryPhone(form: PackageFormData): string {
  const phones = [
    ...(form.customer.phones ?? []),
    ...(form.customer.phone ? [form.customer.phone] : []),
  ]
    .map((p) => p.trim())
    .filter(Boolean);
  return phones[0] ?? '';
}

function buildContextFromParts(input: {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  windowsWorkOrderMarkupPercent: number;
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
}): PackageCustomerShareContext {
  const contractNumberLabel = getPackageContractNumberDisplayForForm(input.form);
  const rawDate = input.form.contract.date.trim();
  const contractDateLabel = !rawDate ? '—' : contractDateToDdMmYyyy(rawDate) || rawDate;

  return {
    packageId: input.packageId,
    packageKind: input.packageKind,
    form: input.form,
    estimatePresets: input.estimatePresets,
    estimateGroups: input.estimateGroups,
    windowsWorkOrderMarkupPercent: input.windowsWorkOrderMarkupPercent,
    templateOverrides: input.templateOverrides,
    resolveTemplateHtml: input.resolveTemplateHtml,
    shareableDocuments: listPackageCustomerShareableDocuments(input.packageKind, input.form),
    customerPhone: customerPrimaryPhone(input.form),
    customerEmail: input.form.customer.email?.trim() ?? '',
    contractNumberLabel,
    contractDateLabel,
  };
}

/** Загрузка пакета и справочников для отправки документов заказчику. */
export async function loadPackageCustomerShareContext(
  packageId: string
): Promise<PackageCustomerShareContext> {
  const row = await getContractDocumentPackage(packageId);
  const packageKind = row.kind;
  const {
    form: mergedForm,
    templateOverrides,
    templatePresetIds,
  } = mergeFormDataFromStorage(row.formData);

  const estimatePresetsKind = estimatePresetsCatalogKind(packageKind);
  const templatePresetsKind = packageTemplatePresetsKind(packageKind);

  const [estimateCatalog, templatePresetsRes, windowsSettings] = await Promise.all([
    getContractDocumentEstimatePresets(estimatePresetsKind).catch(() => ({
      items: [] as ContractEstimatePreset[],
      groups: [] as ContractEstimateGroup[],
      updatedAt: null as string | null,
    })),
    getContractDocumentTemplatePresets(templatePresetsKind).catch(() => ({
      items: [] as ContractTemplatePreset[],
      updatedAt: null as string | null,
    })),
    isProductDirectionPackageKind(packageKind)
      ? getContractDocumentWindowsSettings().catch(() => ({
          windowsWorkOrderMarkupPercent: DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
        }))
      : Promise.resolve({
          windowsWorkOrderMarkupPercent: DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
        }),
  ]);

  const estimatePresets = estimateCatalog.items ?? [];
  const estimateGroups = estimateCatalog.groups ?? [];
  const normalizedEstimateIds = [
    ...new Set([
      ...(Array.isArray(mergedForm.estimate.selectedPresetIds)
        ? mergedForm.estimate.selectedPresetIds.filter(
            (x): x is string => typeof x === 'string' && x.trim().length > 0
          )
        : []),
      ...(mergedForm.estimate.selectedPresetId?.trim()
        ? [mergedForm.estimate.selectedPresetId.trim()]
        : []),
    ]),
  ];
  const form = applyEstimatePresetIdsToPackageForm(
    mergedForm,
    normalizedEstimateIds,
    estimatePresets,
    estimateGroups
  );

  const windowsWorkOrderMarkupPercent = normalizeWindowsWorkOrderMarkupPercent(
    windowsSettings.windowsWorkOrderMarkupPercent
  );

  const resolveTemplateHtml = (tab: PackageDocumentTemplateTabId) =>
    resolveTemplateHtmlStandalone(
      packageKind,
      templatePresetsRes.items ?? [],
      templatePresetIds,
      tab
    );

  return buildContextFromParts({
    packageId,
    packageKind,
    form,
    estimatePresets,
    estimateGroups,
    windowsWorkOrderMarkupPercent,
    templateOverrides,
    resolveTemplateHtml,
  });
}

/** Контекст из уже открытого редактора (актуальная форма без повторной загрузки). */
export function buildPackageCustomerShareContextFromEditor(input: {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  windowsWorkOrderMarkupPercent: number;
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
}): PackageCustomerShareContext {
  return buildContextFromParts(input);
}

export function buildPackageCustomerShareMessage(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[]
): string {
  const labels = ctx.shareableDocuments
    .filter((d) => selectedTabs.includes(d.tabId))
    .map((d) => d.label);

  const lines: string[] = ['Документы по договору'];
  lines.push(`Договор: № ${ctx.contractNumberLabel} от ${ctx.contractDateLabel}`);
  if (ctx.form.customer.fullName?.trim()) {
    lines.push(`Заказчик: ${ctx.form.customer.fullName.trim()}`);
  }
  if (ctx.form.object.objectAddress?.trim()) {
    lines.push(`Объект: ${ctx.form.object.objectAddress.trim()}`);
  }
  if (labels.length) {
    lines.push(`Документы: ${labels.join(', ')}`);
  }
  lines.push('Файлы PDF прилагаются / будут отправлены отдельно.');
  return lines.join('\n');
}

export function buildPackageCustomerShareMailtoUrl(
  email: string,
  subject: string,
  body: string
): string {
  const to = email.trim();
  if (!to) return '';
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openPackageCustomerMessenger(
  channel: MessengerShareChannel,
  message: string,
  phone?: string
): void {
  window.open(buildMessengerShareUrl(channel, message, phone), '_blank', 'noopener,noreferrer');
}

function mergeSelectedDocumentsHtml(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[]
): { html: string; skippedLabels: string[]; externalFiles: PackageCustomerShareableDocument[] } {
  const chunks: string[] = [];
  const skippedLabels: string[] = [];
  const externalFiles: PackageCustomerShareableDocument[] = [];

  for (const tab of selectedTabs) {
    const meta = ctx.shareableDocuments.find((d) => d.tabId === tab);
    const label = meta?.label ?? packageEditorTabLabel(ctx.packageKind, tab);
    if (meta?.isExternalFile) {
      externalFiles.push(meta);
      continue;
    }
    const html = buildPackageCustomerDocumentHtml(ctx, tab).trim();
    if (!html) {
      skippedLabels.push(label);
      continue;
    }
    chunks.push(
      `<div class="packageCustomerSharePrintChunk">
  <p class="packageCustomerSharePrintHeading">${escapeHtml(label)}</p>
  ${html}
</div>`
    );
  }

  return {
    html: chunks.length > 0 ? `${PAGE_BREAK_CSS}\n${chunks.join('\n')}` : '',
    skippedLabels,
    externalFiles,
  };
}

function buildCombinedPdfFileName(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[]
): string {
  const contract = sanitizeFilePart(ctx.contractNumberLabel);
  const count = selectedTabs.length;
  return count === 1
    ? `Dogovor_${contract}_${sanitizeFilePart(packageEditorTabLabel(ctx.packageKind, selectedTabs[0]!))}.pdf`
    : `Dogovor_${contract}_dokumenty_${count}.pdf`;
}

export async function fetchExternalSpecificationFile(
  ctx: PackageCustomerShareContext,
  meta: PackageCustomerShareableDocument
): Promise<File | null> {
  const url = publicUploadUrl(ctx.form.productSpecificationFileUrl);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const name =
      meta.externalFileName?.trim() ||
      ctx.form.productSpecificationFileName?.trim() ||
      'specification';
    const type = blob.type || 'application/octet-stream';
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}

function fileExtensionFromUrl(url: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(url.trim().split('?')[0] ?? '');
  return match ? `.${match[1]!.toLowerCase()}` : '';
}

/**
 * Все файлы внешнего документа: файл спецификации («Окна») либо картинки-чертежи («Потолки»).
 * Чертежи именуются Chertezh_N по порядку прикрепления.
 */
export async function fetchPackageShareExternalFiles(
  ctx: PackageCustomerShareContext,
  meta: PackageCustomerShareableDocument
): Promise<File[]> {
  const urls = (meta.externalFileUrls ?? []).filter((u) => u.trim().length > 0);
  if (urls.length > 0) {
    const out: File[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = publicUploadUrl(urls[i]!);
      if (!url) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const ext = fileExtensionFromUrl(urls[i]!) || '.jpg';
        const type = blob.type || 'application/octet-stream';
        out.push(new File([blob], `Chertezh_${i + 1}${ext}`, { type }));
      } catch {
        /* пропускаем недоступный файл */
      }
    }
    return out;
  }
  const single = await fetchExternalSpecificationFile(ctx, meta);
  return single ? [single] : [];
}

export type PackageCustomerSharePdfResult = {
  file: File | null;
  extraFiles: File[];
  skippedLabels: string[];
  documentTitle: string;
};

export async function buildPackageCustomerSharePdfResult(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[]
): Promise<PackageCustomerSharePdfResult> {
  if (selectedTabs.length === 0) {
    throw new Error('Выберите хотя бы один документ');
  }

  const merged = mergeSelectedDocumentsHtml(ctx, selectedTabs);
  const documentTitle =
    selectedTabs.length === 1
      ? packageEditorTabLabel(ctx.packageKind, selectedTabs[0]!)
      : `Документы договора № ${ctx.contractNumberLabel}`;

  let file: File | null = null;
  if (merged.html) {
    const primaryTab = selectedTabs.find(
      (tab) => !ctx.shareableDocuments.find((d) => d.tabId === tab)?.isExternalFile
    );
    const options = primaryTab ? printOptionsForTab(ctx, primaryTab) : { contractCompact: true };
    const fileName = buildCombinedPdfFileName(ctx, selectedTabs);
    const { blob, fileName: safeName } = await buildDocumentPdfBlob(
      merged.html,
      documentTitle,
      fileName,
      options
    );
    file = new File([blob], safeName, { type: 'application/pdf' });
  }

  const extraFiles: File[] = [];
  for (const meta of merged.externalFiles) {
    const files = await fetchPackageShareExternalFiles(ctx, meta);
    if (files.length > 0) extraFiles.push(...files);
    else merged.skippedLabels.push(meta.label);
  }

  if (!file && extraFiles.length === 0) {
    throw new Error(
      merged.skippedLabels.length
        ? `Не удалось подготовить файлы: ${merged.skippedLabels.join(', ')}`
        : 'Нет данных для выбранных документов'
    );
  }

  return {
    file,
    extraFiles,
    skippedLabels: merged.skippedLabels,
    documentTitle,
  };
}

export async function downloadPackageCustomerSharePdf(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[]
): Promise<{ skippedLabels: string[] }> {
  const result = await buildPackageCustomerSharePdfResult(ctx, selectedTabs);
  if (result.file) {
    const url = URL.createObjectURL(result.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.file.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  for (const extra of result.extraFiles) {
    const url = URL.createObjectURL(extra);
    const link = document.createElement('a');
    link.href = url;
    link.download = extra.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return { skippedLabels: result.skippedLabels };
}

/** Совместимо с canShare для заказ-нарядов. */
export function canShareCustomerDocumentFiles(files: File[]): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  if (files.length === 0) return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

export async function sharePackageCustomerDocumentsNative(
  ctx: PackageCustomerShareContext,
  selectedTabs: PackageDocumentTabId[],
  message: string
): Promise<{ skippedLabels: string[]; usedDownloadFallback: boolean }> {
  const result = await buildPackageCustomerSharePdfResult(ctx, selectedTabs);
  const files = [...(result.file ? [result.file] : []), ...result.extraFiles];
  if (!canShareCustomerDocumentFiles(files)) {
    await downloadPackageCustomerSharePdf(ctx, selectedTabs);
    return { skippedLabels: result.skippedLabels, usedDownloadFallback: true };
  }
  await navigator.share({
    title: result.documentTitle,
    text: message,
    files,
  });
  return { skippedLabels: result.skippedLabels, usedDownloadFallback: false };
}
