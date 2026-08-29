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
import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';

import { buildDocumentPdfBlob, downloadDocumentPdf } from '../../../core/printDocument';
import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import { pickWindowsPackagePrintDocumentOptions } from '../../families/product-like/print/productPackagePrint';
import {
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  normalizeWindowsWorkOrderMarkupPercent,
} from '../../families/product-like/print/productWorkOrder';
import { packageDocumentTemplateFallbackHtml } from '../../templates';
import { libraryTemplateFallbackHtml } from '../../templates';
import { packageTemplatePresetsKind } from '../catalogKinds';
import { buildPackageTemplatePreviewHtml } from '../editor/template/buildPackageTemplatePreviewHtml';
import { PACKAGE_TEMPLATE_TAB_IDS } from '../editor/template/packageTemplateTabUtils';
import { applyEstimatePresetIdsToPackageForm } from '../estimates/applyEstimatePresetIds';
import { estimatePresetsCatalogKind } from '../estimates/estimatePresetsCatalogKind';
import {
  type PackageDocumentTemplateTabId,
  mergeFormDataFromStorage,
} from '../form/formDataTemplateStorage';
import { isPackageLibraryTemplateTabId } from '../tabs/packageLibraryTemplateTabs';
import { packageTemplatePresetEditorTabId } from '../tabs/packageTemplatePresetTab';
import { buildWorkOrderInstallationMetaLines } from './workOrderInstallationMeta';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildInstallationMetaHtml(schedule: InstallationSchedule): string {
  const meta = buildWorkOrderInstallationMetaLines(schedule);
  const lines: string[] = [
    `<p style="margin:0 0 6pt;"><strong>Дата и время монтажа:</strong> ${escapeHtml(meta.dateTime)}</p>`,
  ];
  if (meta.installer) {
    lines.push(
      `<p style="margin:0 0 6pt;"><strong>Монтажник:</strong> ${escapeHtml(meta.installer)}</p>`
    );
  }
  for (const contact of meta.contacts) {
    const sep = contact.indexOf(':');
    if (sep > 0) {
      lines.push(
        `<p style="margin:0 0 6pt;"><strong>${escapeHtml(contact.slice(0, sep + 1))}</strong>${escapeHtml(contact.slice(sep + 1))}</p>`
      );
    } else {
      lines.push(`<p style="margin:0 0 6pt;">${escapeHtml(contact)}</p>`);
    }
  }
  return lines.join('\n');
}

/** Вставляет блок монтажа в шапку заказ-наряда (перед секцией работ). */
export function injectInstallationMetaIntoWorkOrderHtml(
  html: string,
  schedule: InstallationSchedule
): string {
  const block = buildInstallationMetaHtml(schedule);
  const sectionMatch = /<section[\s>]/i.exec(html);
  if (sectionMatch?.index != null) {
    return `${html.slice(0, sectionMatch.index)}${block}\n${html.slice(sectionMatch.index)}`;
  }
  return `${html}\n${block}`;
}

function sanitizeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^\dA-Za-zА-Яа-яЁё_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'bez_nomera'
  );
}

export function buildWorkOrderPdfFileName(schedule: InstallationSchedule): string {
  const contract = sanitizeFilePart(schedule.contractNumber || 'dogovor');
  const date = sanitizeFilePart(schedule.date.slice(0, 10));
  return `Zakaz-naryad_${contract}_${date}.pdf`;
}

export type WorkOrderPdfBuildResult = {
  html: string;
  fileName: string;
  documentTitle: string;
  printOptions: ReturnType<typeof pickWindowsPackagePrintDocumentOptions> | undefined;
};

/** Готовит HTML заказ-наряда по пакету + метаданные монтажа. */
export async function buildWorkOrderHtmlForInstallationSchedule(
  schedule: InstallationSchedule
): Promise<WorkOrderPdfBuildResult> {
  const packageId = schedule.packageId?.trim();
  if (!packageId) {
    throw new Error('К монтажу не привязан заказ — PDF заказ-наряда недоступен');
  }

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

  let html = buildPackageTemplatePreviewHtml('workOrder', {
    form,
    packageKind,
    windowsWorkOrderMarkupPercent,
    estimatePresets,
    estimateGroups,
    templateOverrides,
    resolveTemplateHtml,
  }).trim();

  if (!html) {
    throw new Error('Нет данных для заказ-наряда по этому договору');
  }

  html = injectInstallationMetaIntoWorkOrderHtml(html, schedule);

  const isWindows = isProductDirectionPackageKind(packageKind);
  return {
    html,
    fileName: buildWorkOrderPdfFileName(schedule),
    documentTitle: 'Заказ-наряд',
    printOptions: isWindows ? pickWindowsPackagePrintDocumentOptions('estimate', form) : undefined,
  };
}

export async function downloadWorkOrderPdfForInstallationSchedule(
  schedule: InstallationSchedule
): Promise<void> {
  const built = await buildWorkOrderHtmlForInstallationSchedule(schedule);
  await downloadDocumentPdf(built.html, built.documentTitle, built.fileName, built.printOptions);
}

export async function buildWorkOrderPdfFileForInstallationSchedule(
  schedule: InstallationSchedule
): Promise<File> {
  const built = await buildWorkOrderHtmlForInstallationSchedule(schedule);
  const { blob, fileName } = await buildDocumentPdfBlob(
    built.html,
    built.documentTitle,
    built.fileName,
    built.printOptions
  );
  return new File([blob], fileName, { type: 'application/pdf' });
}

export function canShareWorkOrderPdfFile(file: File): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}
