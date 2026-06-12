import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getCrmCustomer, getMeasurement } from '@/shared/api/admin-crm';
import { crmDetailWithPreferredObjectAddress } from '@/views/admin/CRM/Customers/shared/crmCustomerExtendedProfile';

import {
  type EstimateCrmCustomerFields,
  emptyEstimateCrmCustomerFields,
  estimateFieldsFromCrmCustomerDetail,
} from '../../../platform/estimates/estimateCrmCustomer';
import {
  API_URL,
  type WorkspaceBaseline,
  applyDraftToLocalCalculator,
  buildDraftsFromMeasurement,
  calculatorDraftStorageKey,
  clearStoredCalculatorStateForNewEstimate,
  extractMultiCategoryMetaFromDraft,
  normalizeUniqueCategorySlugs,
  parseMeasurementRooms,
  resolveEstimateCustomerFieldsFromPreset,
} from './estimateWorkspaceUtils';

export type EstimateWorkspaceLoadParams = {
  estimateIdFromUrl: string | null;
  copyFromId: string | null;
  splitInstanceFromUrl: boolean;
  fromMeasurementId: string | null;
};

export type EstimateWorkspaceLoadResult = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  categories: Array<{ slug: string; name: string }>;
  estimateCategorySlugs: string[];
  activeCategorySlug: string;
  estimateNameDraft: string;
  selectedEstimateId: string;
  copySessionPendingSave: boolean;
  baseline: WorkspaceBaseline | null;
  error: string | null;
};

export async function loadEstimateWorkspaceSession(
  params: EstimateWorkspaceLoadParams,
  applyCustomerFromLoader: (fields: EstimateCrmCustomerFields) => void
): Promise<EstimateWorkspaceLoadResult> {
  const { estimateIdFromUrl, copyFromId, splitInstanceFromUrl, fromMeasurementId } = params;

  applyCustomerFromLoader(emptyEstimateCrmCustomerFields());

  const [presetsRes, categoriesRes] = await Promise.all([
    getContractDocumentEstimatePresets('REPAIR'),
    fetch(`${API_URL}/service-catalog`),
  ]);
  const loadedItems = presetsRes.items ?? [];
  const groups = presetsRes.groups ?? [];

  let cats: Array<{ slug: string; name: string }> = [];
  if (categoriesRes.ok) {
    const data = (await categoriesRes.json()) as {
      categories?: Array<{ slug: string; name: string }>;
    };
    cats = (data.categories ?? [])
      .map((c) => ({ slug: c.slug, name: c.name }))
      .filter((c) => c.slug);
  }

  let error: string | null = null;
  let baselineSlugs: string[] = [];
  let baselineName = '';
  let baselineCustomer = emptyEstimateCrmCustomerFields();
  let estimateCategorySlugs: string[] = [];
  let activeCategorySlug = '';
  let estimateNameDraft = '';
  let selectedEstimateId = '';
  let copySessionPendingSave = false;

  const resetToDefaultCategory = () => {
    selectedEstimateId = '';
    estimateNameDraft = '';
    if (cats[0]) estimateCategorySlugs = [cats[0].slug];
    activeCategorySlug = cats[0]?.slug ?? '';
    baselineSlugs = cats[0] ? [cats[0].slug] : [];
    baselineName = '';
  };

  if (copyFromId) {
    const source = loadedItems.find((item) => item.id === copyFromId);
    if (source) {
      clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
      const sourceMeta = extractMultiCategoryMetaFromDraft(source.calculatorDraft);
      const sourceSlugs = normalizeUniqueCategorySlugs(
        sourceMeta?.slugs?.length ? sourceMeta.slugs : [source.categorySlug]
      );
      for (const slug of sourceSlugs) {
        const draftByCategory = sourceMeta?.draftsByCategory?.[slug] ?? source.calculatorDraft;
        if (draftByCategory) applyDraftToLocalCalculator(slug, draftByCategory);
      }
      estimateCategorySlugs = sourceSlugs;
      activeCategorySlug = sourceSlugs[0] ?? '';
      const copyLabel = splitInstanceFromUrl ? '(экземпляр)' : '(копия)';
      const copyTitle = `${source.title.trim() || 'Расчёт'} ${copyLabel}`;
      estimateNameDraft = copyTitle;
      selectedEstimateId = '';
      baselineSlugs = sourceSlugs;
      baselineName = copyTitle;
      baselineCustomer = await resolveEstimateCustomerFieldsFromPreset(source);
      applyCustomerFromLoader(baselineCustomer);
      copySessionPendingSave = true;
    } else {
      error = 'Исходный расчёт не найден. Вернитесь к списку и обновите страницу.';
      clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
      resetToDefaultCategory();
    }
  } else if (estimateIdFromUrl) {
    const preset = loadedItems.find((it) => it.id === estimateIdFromUrl);
    if (preset) {
      const presetMeta = extractMultiCategoryMetaFromDraft(preset.calculatorDraft);
      const presetSlugs = normalizeUniqueCategorySlugs(
        presetMeta?.slugs?.length ? presetMeta.slugs : [preset.categorySlug]
      );
      for (const slug of presetSlugs) {
        const draftByCategory = presetMeta?.draftsByCategory?.[slug] ?? preset.calculatorDraft;
        if (draftByCategory) applyDraftToLocalCalculator(slug, draftByCategory);
      }
      estimateCategorySlugs = presetSlugs;
      activeCategorySlug = presetSlugs[0] ?? '';
      estimateNameDraft = preset.title;
      selectedEstimateId = preset.id;
      baselineSlugs = presetSlugs;
      baselineName = preset.title;
      baselineCustomer = await resolveEstimateCustomerFieldsFromPreset(preset);
      applyCustomerFromLoader(baselineCustomer);
    } else {
      error = 'Расчёт не найден. Вернитесь к списку и обновите страницу.';
      resetToDefaultCategory();
    }
  } else if (fromMeasurementId) {
    try {
      const measurement = await getMeasurement(fromMeasurementId);
      let measurementCustomer = emptyEstimateCrmCustomerFields();
      if (measurement.customerId?.trim()) {
        try {
          const detail = await getCrmCustomer(measurement.customerId.trim());
          measurementCustomer = estimateFieldsFromCrmCustomerDetail(
            crmDetailWithPreferredObjectAddress(detail, measurement.customerAddress)
          );
        } catch {
          measurementCustomer = {
            crmCustomerId: measurement.customerId.trim(),
            customerName: (measurement.customerName ?? '').trim(),
            objectAddress: (measurement.customerAddress ?? '').trim(),
          };
        }
      } else if ((measurement.customerName ?? '').trim()) {
        measurementCustomer = {
          crmCustomerId: null,
          customerName: measurement.customerName.trim(),
          objectAddress: (measurement.customerAddress ?? '').trim(),
        };
      }
      applyCustomerFromLoader(measurementCustomer);
      const rooms = parseMeasurementRooms(measurement.comments);
      if (rooms.length === 0) {
        error = 'В выбранном замере нет данных для автогенерации расчёта.';
        clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
        resetToDefaultCategory();
        baselineCustomer = measurementCustomer;
      } else {
        clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
        const { draftSlugs, draftsByCategory } = await buildDraftsFromMeasurement(
          rooms,
          cats.map((c) => c.slug)
        );
        if (draftSlugs.length === 0) {
          error = 'В замере нет выбранных работ для автогенерации расчёта.';
          if (cats[0]) estimateCategorySlugs = [cats[0].slug];
          activeCategorySlug = cats[0]?.slug ?? '';
          baselineSlugs = cats[0] ? [cats[0].slug] : [];
          baselineName = '';
          baselineCustomer = measurementCustomer;
        } else {
          for (const slug of draftSlugs) {
            applyDraftToLocalCalculator(slug, draftsByCategory[slug]);
          }
          estimateCategorySlugs = draftSlugs;
          activeCategorySlug = draftSlugs[0] ?? '';
          const autoTitle = `Расчёт по замеру: ${measurement.customerName || measurement.id.slice(0, 8)}`;
          estimateNameDraft = autoTitle;
          selectedEstimateId = '';
          baselineSlugs = draftSlugs;
          baselineName = autoTitle;
          baselineCustomer = measurementCustomer;
          copySessionPendingSave = true;
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Не удалось создать расчёт из замера';
      clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
      resetToDefaultCategory();
    }
  } else {
    clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
    resetToDefaultCategory();
  }

  const baselineDraftsByCategory: Record<string, string | null> = {};
  for (const slug of baselineSlugs) {
    baselineDraftsByCategory[slug] = window.localStorage.getItem(calculatorDraftStorageKey(slug));
  }

  const baseline: WorkspaceBaseline | null =
    baselineSlugs.length > 0
      ? {
          categorySlugs: baselineSlugs,
          name: baselineName,
          draftsByCategory: baselineDraftsByCategory,
          customer: baselineCustomer,
        }
      : null;

  return {
    items: loadedItems,
    groups,
    categories: cats,
    estimateCategorySlugs,
    activeCategorySlug,
    estimateNameDraft,
    selectedEstimateId,
    copySessionPendingSave,
    baseline,
    error,
  };
}
