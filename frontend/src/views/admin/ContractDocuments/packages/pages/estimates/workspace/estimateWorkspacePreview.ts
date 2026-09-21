import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateSnapshot,
  clampEstimateAdditionalMarkupPercent,
  getSnapshotForEstimateAttach,
} from '../../../platform/estimates/applyEstimatePresetIds';
import { buildEstimateSnapshot } from '../../../platform/estimates/contractDocumentsEstimateSnapshot';
import {
  type EstimateEmbedSection,
  buildEstimateSectionsFromPresetIds,
} from '../../../platform/estimates/packageEstimateDocPrintEmbedHtml';
import { parseOptionalPercentInput } from '../list/estimatesListUtils';
import {
  calculatorDraftStorageKey,
  clampWithEllipsis,
  encodePrimaryDraftWithMultiMeta,
  uniqueCategorySlugsInOrder,
} from './estimateWorkspaceUtils';

export type EstimateWorkspacePreviewModel = {
  /** Помещения по категориям — как на вкладке «Смета» договора после прикрепления. */
  sections: EstimateEmbedSection[];
  /** Снимок с наценкой (и границами работ, если редактируется экземпляр связки). */
  snapshot: EstimateSnapshot;
};

export type EstimateWorkspacePreviewParams = {
  estimateCategorySlugs: string[];
  estimateCategories: Array<{ slug: string; name: string }>;
  estimateGroups: ContractEstimateGroup[];
  /** Поле «Наценка, %» ('' — наценка объекта). */
  additionalMarkupRaw: string;
  /** Редактируемый расчёт: объект и границы работ влияют на вид сметы в договоре. */
  existingPreset: ContractEstimatePreset | undefined;
};

export type EstimateWorkspacePreviewResult =
  | { model: EstimateWorkspacePreviewModel }
  | { error: string };

const PREVIEW_PRESET_ID = '__estimateWorkspacePreviewPreset__';

/**
 * Модель предпросмотра «как в договоре»: собирается из текущих черновиков калькулятора
 * по тем же правилам, что и пресет при сохранении (снимки по категориям → объединённый снимок),
 * затем режется на секции и получает наценку как при прикреплении к пакету.
 */
export async function buildEstimateWorkspacePreview(
  params: EstimateWorkspacePreviewParams
): Promise<EstimateWorkspacePreviewResult> {
  // Сбрасываем актуальное состояние активного калькулятора в localStorage (обработчик синхронный).
  window.dispatchEvent(new Event('estimate-calculator-flush-draft'));

  const draftsByCategory: Record<string, string> = {};
  for (const slug of uniqueCategorySlugsInOrder(params.estimateCategorySlugs)) {
    const draft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
    if (draft) draftsByCategory[slug] = draft;
  }
  const draftSlugs = Object.keys(draftsByCategory);
  if (draftSlugs.length === 0) {
    return { error: 'Нет данных калькулятора по выбранным категориям.' };
  }

  const snapshots = await Promise.all(
    draftSlugs.map((slug) => buildEstimateSnapshot(draftsByCategory[slug]!))
  );
  const mergedRooms = snapshots.flatMap((s) => s?.rooms ?? []);
  if (mergedRooms.length === 0) {
    return { error: 'В расчёте нет выбранных работ — предпросмотр пуст.' };
  }
  const mergedSnapshot: EstimateSnapshot = {
    rooms: mergedRooms,
    total: snapshots.reduce((sum, s) => sum + (s?.total ?? 0), 0),
  };

  const categoryNames = draftSlugs.map(
    (slug) => params.estimateCategories.find((c) => c.slug === slug)?.name ?? slug
  );
  const isMultiCategory = draftSlugs.length > 1;
  const categorySummaries = draftSlugs.map((slug, idx) => ({
    slug,
    name: categoryNames[idx]!,
    roomCount: snapshots[idx]?.rooms.length ?? 0,
    total: snapshots[idx]?.total ?? 0,
  }));

  const parsedMarkup = parseOptionalPercentInput(params.additionalMarkupRaw);
  const previewPreset: ContractEstimatePreset = {
    id: PREVIEW_PRESET_ID,
    title: 'Предпросмотр',
    categorySlug: draftSlugs[0]!,
    categoryName: clampWithEllipsis(
      isMultiCategory ? `Комплексный расчёт: ${categoryNames.join(', ')}` : categoryNames[0]!,
      200
    ),
    calculatorDraft: encodePrimaryDraftWithMultiMeta(
      draftsByCategory[draftSlugs[0]!]!,
      isMultiCategory
        ? { slugs: draftSlugs, draftsByCategory, categories: categorySummaries }
        : null
    ),
    calculatorDraftByCategory: draftsByCategory,
    multiCategorySlugs: draftSlugs,
    snapshot: mergedSnapshot,
    ...(params.existingPreset?.groupId ? { groupId: params.existingPreset.groupId } : {}),
    ...(parsedMarkup === undefined
      ? {}
      : { additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsedMarkup) }),
    ...(params.existingPreset?.estimateWorkScopeKeys
      ? { estimateWorkScopeKeys: [...params.existingPreset.estimateWorkScopeKeys] }
      : {}),
  };

  const sections = buildEstimateSectionsFromPresetIds(
    [PREVIEW_PRESET_ID],
    [previewPreset],
    params.estimateGroups
  );
  return {
    model: {
      sections,
      snapshot:
        getSnapshotForEstimateAttach(previewPreset, params.estimateGroups) ?? mergedSnapshot,
    },
  };
}

/** Модель предпросмотра сохранённого расчёта (список расчётов): снимок пресета с наценкой и границами работ. */
export function buildEstimatePresetPreviewModel(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): EstimateWorkspacePreviewResult {
  const snapshot = getSnapshotForEstimateAttach(preset, groups);
  if (!snapshot?.rooms.length) {
    return { error: 'В расчёте нет сохранённых работ — предпросмотр пуст.' };
  }
  return {
    model: {
      sections: buildEstimateSectionsFromPresetIds([preset.id], [preset], groups),
      snapshot,
    },
  };
}

let directorNamePromise: Promise<string> | null = null;

/**
 * Имя директора из карточек подписантов «Ремонт» — для блока подписей предпросмотра.
 * Кэшируется на время сессии; при ошибке — пустая строка (в подписи будет «—»).
 */
export function loadEstimatePreviewDirectorName(): Promise<string> {
  if (!directorNamePromise) {
    directorNamePromise = getContractDocumentSignatoryProfiles('REPAIR')
      .then(
        (res) =>
          (res.items ?? [])
            .find((it) => it.directorNameNominative?.trim())
            ?.directorNameNominative?.trim() ?? ''
      )
      .catch(() => '');
  }
  return directorNamePromise;
}
