import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { buildEstimateSnapshot } from '../../../platform/estimates/contractDocumentsEstimateSnapshot';
import {
  type LinkedCopySplitTarget,
  resolveLinkedCopySplitBundleId,
  shouldAnchorSourceOnNewLinkedBundle,
} from '../../../platform/estimates/estimateSplitBundle';
import {
  calculatorDraftStorageKey,
  clampWithEllipsis,
  computeInGroupListOrderAfterPreset,
  countCalculatorSelectedLines,
  encodePrimaryDraftWithMultiMeta,
  normalizeUniqueCategorySlugs,
} from './estimateWorkspaceUtils';

export type EstimateWorkspaceSaveFieldErrors = {
  error?: string;
  estimateNameError?: string;
  estimateCustomerError?: string;
  estimateObjectAddressError?: string;
  estimateCalculatorError?: string;
};

export type ValidateEstimateWorkspaceSaveParams = {
  estimateNameDraft: string;
  crmCustomerId: string | null;
  customerName: string;
  objectAddress: string;
  estimateCategorySlugs: string[];
  isEditingExisting: boolean;
};

export function validateEstimateWorkspaceSave(
  params: ValidateEstimateWorkspaceSaveParams
):
  | { draftsByCategory: Record<string, string>; draftSlugs: string[] }
  | EstimateWorkspaceSaveFieldErrors {
  const nameTrimmed = params.estimateNameDraft.trim();
  if (!nameTrimmed) {
    const msg = 'Укажите название расчёта — без него сохранить нельзя.';
    return { error: msg, estimateNameError: msg };
  }
  if (!params.crmCustomerId?.trim()) {
    return { estimateCustomerError: 'Выберите заказчика в базе через поиск.' };
  }
  if (!params.customerName.trim()) {
    return { estimateCustomerError: 'В карточке заказчика не указано имя.' };
  }
  if (!params.objectAddress.trim()) {
    return {
      estimateObjectAddressError:
        'Укажите адрес объекта в карточке заказчика или выберите строку с адресом в поиске.',
    };
  }
  const selectedSlugs = normalizeUniqueCategorySlugs(params.estimateCategorySlugs);
  if (selectedSlugs.length === 0) {
    return { error: 'Выберите хотя бы одну категорию работ.' };
  }
  const draftsByCategory: Record<string, string> = {};
  for (const slug of selectedSlugs) {
    const draft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
    if (!draft) continue;
    draftsByCategory[slug] = draft;
  }
  const draftSlugs = Object.keys(draftsByCategory);
  if (draftSlugs.length === 0) {
    return { error: 'Нет данных калькулятора по выбранным категориям.' };
  }
  if (!params.isEditingExisting && countCalculatorSelectedLines(draftsByCategory) === 0) {
    return { estimateCalculatorError: 'Вы забыли посчитать работы в калькуляторе' };
  }
  return { draftsByCategory, draftSlugs };
}

export type BuildEstimateWorkspaceSaveBatchParams = {
  items: ContractEstimatePreset[];
  selectedEstimateId: string;
  estimateNameDraft: string;
  crmCustomerId: string;
  customerName: string;
  objectAddress: string;
  estimateCategories: Array<{ slug: string; name: string }>;
  draftsByCategory: Record<string, string>;
  draftSlugs: string[];
  copyFromId: string | null;
  splitInstanceFromUrl: boolean;
  newSplitBundleFromUrl: boolean;
  joinSplitBundleIdFromUrl: string;
  fromMeasurementId: string | null;
};

export async function buildEstimateWorkspaceSaveBatch({
  items,
  selectedEstimateId,
  estimateNameDraft,
  crmCustomerId,
  customerName,
  objectAddress,
  estimateCategories,
  draftsByCategory,
  draftSlugs,
  copyFromId,
  splitInstanceFromUrl,
  newSplitBundleFromUrl,
  joinSplitBundleIdFromUrl,
  fromMeasurementId,
}: BuildEstimateWorkspaceSaveBatchParams): Promise<{
  nextItem: ContractEstimatePreset;
  nextItems: ContractEstimatePreset[];
}> {
  const categoryNames = draftSlugs.map(
    (slug) => estimateCategories.find((c) => c.slug === slug)?.name ?? slug
  );
  const primarySlug = draftSlugs[0];
  const primaryDraft = draftsByCategory[primarySlug];
  const isMultiCategory = draftSlugs.length > 1;
  const categoryNameRaw = isMultiCategory
    ? `Комплексный расчёт: ${categoryNames.join(', ')}`
    : categoryNames[0];
  const categoryName = clampWithEllipsis(categoryNameRaw, 200);
  const title = clampWithEllipsis(estimateNameDraft.trim(), 160);

  const existing = selectedEstimateId
    ? items.find((it) => it.id === selectedEstimateId)
    : undefined;

  const snapshots = await Promise.all(
    draftSlugs.map((slug) => buildEstimateSnapshot(draftsByCategory[slug]))
  );
  const mergedRooms = snapshots.flatMap((s) => s?.rooms ?? []);
  const mergedSnapshot =
    mergedRooms.length > 0
      ? {
          rooms: mergedRooms,
          total: snapshots.reduce((sum, s) => sum + (s?.total ?? 0), 0),
        }
      : null;

  const categorySummaries = draftSlugs.map((slug, idx) => {
    const snap = snapshots[idx];
    return {
      slug,
      name: estimateCategories.find((c) => c.slug === slug)?.name ?? slug,
      roomCount: snap?.rooms.length ?? 0,
      total: snap?.total ?? 0,
    };
  });
  const primaryDraftWithMeta = encodePrimaryDraftWithMultiMeta(
    primaryDraft,
    isMultiCategory ? { slugs: draftSlugs, draftsByCategory, categories: categorySummaries } : null
  );
  const copyFromSource =
    !existing && copyFromId ? items.find((it) => it.id === copyFromId) : undefined;
  const markupSource = existing ?? copyFromSource;
  const copyLinkedSplitInstance = Boolean(copyFromSource) && splitInstanceFromUrl;
  const linkedCopyTarget: LinkedCopySplitTarget | null = copyLinkedSplitInstance
    ? joinSplitBundleIdFromUrl
      ? { mode: 'join', bundleId: joinSplitBundleIdFromUrl }
      : newSplitBundleFromUrl
        ? { mode: 'new' }
        : { mode: 'same' }
    : null;
  const linkedSplitBundleId =
    copyFromSource && linkedCopyTarget
      ? resolveLinkedCopySplitBundleId(copyFromSource, linkedCopyTarget, items)
      : undefined;
  const anchorSourceToNewBundle =
    copyFromSource &&
    linkedCopyTarget &&
    shouldAnchorSourceOnNewLinkedBundle(copyFromSource, linkedCopyTarget, items);

  const createdAt =
    existing != null
      ? (existing.createdAt ?? existing.updatedAt ?? new Date().toISOString())
      : new Date().toISOString();

  const nextItem: ContractEstimatePreset = {
    id: existing?.id ?? `est_${Date.now()}`,
    title,
    categorySlug: primarySlug,
    categoryName,
    calculatorDraft: primaryDraftWithMeta,
    calculatorDraftByCategory: draftsByCategory,
    multiCategorySlugs: draftSlugs,
    snapshot: mergedSnapshot,
    createdAt,
    updatedAt: new Date().toISOString(),
    crmCustomerId: crmCustomerId.trim(),
    customerName: clampWithEllipsis(customerName.trim(), 200),
    objectAddress: clampWithEllipsis(objectAddress.trim(), 500),
    ...(existing?.groupId
      ? { groupId: existing.groupId }
      : copyFromSource?.groupId
        ? { groupId: copyFromSource.groupId }
        : {}),
    ...(existing?.archived ? { archived: true } : {}),
    ...(existing?.sourceMeasurementId
      ? { sourceMeasurementId: existing.sourceMeasurementId }
      : fromMeasurementId
        ? { sourceMeasurementId: fromMeasurementId }
        : {}),
    ...(typeof markupSource?.additionalMarkupPercent === 'number'
      ? { additionalMarkupPercent: markupSource.additionalMarkupPercent }
      : {}),
    ...(existing?.groupId && existing.inGroupListOrder != null
      ? { inGroupListOrder: existing.inGroupListOrder }
      : !existing && copyFromSource?.groupId && copyFromId
        ? {
            inGroupListOrder: computeInGroupListOrderAfterPreset(
              items,
              copyFromSource.groupId,
              copyFromId
            ),
          }
        : {}),
    ...(existing && !existing.groupId && existing.mergeListOrder != null
      ? { mergeListOrder: existing.mergeListOrder }
      : {}),
    ...(existing?.splitBundleId ? { splitBundleId: existing.splitBundleId } : {}),
    ...(typeof existing?.estimateWorkScopeKeys !== 'undefined'
      ? { estimateWorkScopeKeys: [...existing.estimateWorkScopeKeys] }
      : {}),
    ...(copyLinkedSplitInstance && linkedSplitBundleId
      ? {
          splitBundleId: linkedSplitBundleId,
          estimateWorkScopeKeys: [] as string[],
        }
      : {}),
  };

  let nextItems = existing
    ? items.map((it) => (it.id === existing.id ? nextItem : it))
    : [nextItem, ...items].slice(0, 200);
  if (anchorSourceToNewBundle && copyFromSource && linkedSplitBundleId) {
    nextItems = nextItems.map((it) =>
      it.id === copyFromSource.id ? { ...it, splitBundleId: linkedSplitBundleId } : it
    );
  }

  return { nextItem, nextItems };
}
