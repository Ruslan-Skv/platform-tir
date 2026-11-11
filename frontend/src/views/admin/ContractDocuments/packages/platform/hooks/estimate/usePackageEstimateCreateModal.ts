'use client';

import { useCallback, useMemo, useState } from 'react';

import { useQueries } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { getServiceCatalogCategory } from '@/shared/api/service-catalog';
import {
  serviceCatalogCategoryQueryKey,
  useServiceCatalog,
} from '@/shared/lib/hooks/useServiceCatalog';
import { persistEstimateWorkspacePresets } from '@/views/admin/ContractDocuments/packages/pages/estimates/workspace/estimateWorkspacePersist';

import {
  clampEstimateAdditionalMarkupPercent,
  parseOptionalPercentInput,
} from '../../estimates/applyEstimatePresetIds';
import {
  type EstimateCalculatorDraftCustomItems,
  createEstimateCustomItemId,
  parseCustomWorkFormInput,
} from '../../estimates/estimateCustomWorkItems';
import {
  type QuickEstimateCategoryInput,
  buildQuickEstimatePreset,
  moveQuickEstimateCategory,
  parseQuickEstimateDraft,
  quickEstimateDraftsByCategory,
  quickEstimateEditBlockReason,
  quickEstimateResultingGroupKey,
  resolveQuickEstimateObjectAddress,
  validateQuickEstimateInput,
} from '../../estimates/packageEstimateQuickCreate';
import { buildPackageCustomerTemplateFields } from '../../form/customerTemplateFields';
import type { PackageFormData } from '../../form/packageForm';
import { packageCustomerBlockHasContent } from '../../questionnaires/applyCrmContractToForm';

/** Черновик строки «Дополнительные виды работ» по категории (поля ввода). */
export type QuickEstimateCustomDraft = { name: string; unit: string; price: string };

function parsePositiveQuantity(raw: string): number {
  const n = Number(raw.replace(',', '.').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function emptyCustomDraft(): QuickEstimateCustomDraft {
  return { name: '', unit: 'шт', price: '' };
}

export type QuickEstimateFormStateKeyInput = {
  title: string;
  /** Наценка, % (undefined — «наценка объекта»). */
  markup?: number;
  slugs: string[];
  linesBySlug: Record<string, Array<{ itemId: string; quantity: number }>>;
  customItemsBySlug: Record<string, EstimateCalculatorDraftCustomItems>;
  noMarkupBySlug: Record<string, boolean>;
};

/**
 * Канонический ключ состояния формы правки: для «Сохранить» неактивна без изменений.
 * Позиции и кастомные работы сортируются по itemId — порядок не влияет на «грязь».
 */
export function quickEstimateFormStateKey(input: QuickEstimateFormStateKeyInput): string {
  const sortedLines = Object.fromEntries(
    Object.entries(input.linesBySlug).map(([slug, lines]) => [
      slug,
      [...lines].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    ])
  );
  const sortedCustom = Object.fromEntries(
    Object.entries(input.customItemsBySlug).map(([slug, defs]) => [
      slug,
      Object.fromEntries(
        Object.entries(defs)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, def]) => [id, [def.name, def.unit, def.price]])
      ),
    ])
  );
  const sortedNoMarkup = Object.fromEntries(
    Object.entries(input.noMarkupBySlug)
      .filter(([, v]) => v)
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify({
    title: input.title.trim(),
    markup: input.markup ?? null,
    slugs: input.slugs,
    lines: sortedLines,
    custom: sortedCustom,
    noMarkup: sortedNoMarkup,
  });
}

export type UsePackageEstimateCreateModalOptions = {
  packageKind: ContractDocumentPackageKind;
  signedDocsLocked: boolean;
  form: PackageFormData;
  linkedCrmCustomerId: string | null;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  contractEstimateObjectKey: string;
  /** Расчёты, прикреплённые к подписанным договорам/Д/с — правка закрыта (как в «Расчётах»). */
  lockedEstimatePresetIds: Set<string>;
  setEstimatePresets: React.Dispatch<React.SetStateAction<ContractEstimatePreset[]>>;
  setEstimateGroups: React.Dispatch<React.SetStateAction<ContractEstimateGroup[]>>;
  /** Прикрепление свежесозданного расчёта к форме пакета (со свежим списком пресетов). */
  attachCreatedPreset: (
    presetId: string,
    presets: ContractEstimatePreset[],
    groups: ContractEstimateGroup[]
  ) => void;
  /** Сохранение отредактированного здесь расчёта: пересчёт сметы пакета + отложенное сохранение. */
  presetUpdated: (
    presetId: string,
    presets: ContractEstimatePreset[],
    groups: ContractEstimateGroup[]
  ) => void;
};

export function usePackageEstimateCreateModal({
  packageKind,
  signedDocsLocked,
  form,
  linkedCrmCustomerId,
  estimatePresets,
  estimateGroups,
  contractEstimateObjectKey,
  lockedEstimatePresetIds,
  setEstimatePresets,
  setEstimateGroups,
  attachCreatedPreset,
  presetUpdated,
}: UsePackageEstimateCreateModalOptions) {
  const { user } = useAuth();
  const catalog = useServiceCatalog();
  const [isOpen, setIsOpen] = useState(false);
  /** Правка существующего расчёта (иначе — создание нового). */
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [markupRaw, setMarkupRaw] = useState('');
  /** Количество по позиции: qtyBySlug[slug][itemId] — строки ввода (каталог и est-custom:*). */
  const [qtyBySlug, setQtyBySlug] = useState<Record<string, Record<string, string>>>({});
  const [customItemsBySlug, setCustomItemsBySlug] = useState<
    Record<string, EstimateCalculatorDraftCustomItems>
  >({});
  const [customDraftBySlug, setCustomDraftBySlug] = useState<
    Record<string, QuickEstimateCustomDraft>
  >({});
  const [customNoMarkupBySlug, setCustomNoMarkupBySlug] = useState<Record<string, boolean>>({});
  /** Имя блока позиций категории (сохраняется при правке: «Работы», «Помещение 1», …). */
  const [calcNameBySlug, setCalcNameBySlug] = useState<Record<string, string>>({});
  /** Ошибка формы «Дополнительные виды работ» по категории. */
  const [customErrorBySlug, setCustomErrorBySlug] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Состояние формы на момент открытия правки — «Сохранить» активна только при отличиях. */
  const [editBaselineKey, setEditBaselineKey] = useState<string | null>(null);

  const categories = useMemo(() => {
    const list = catalog.data?.categories ?? [];
    return list.map((c) => ({ slug: c.slug, name: c.name })).filter((c) => c.slug);
  }, [catalog.data]);

  const categoryDetails = useQueries({
    queries: selectedSlugs.map((slug) => ({
      queryKey: serviceCatalogCategoryQueryKey(slug),
      queryFn: () => getServiceCatalogCategory(slug),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    })),
  });

  const detailBySlug = useMemo(() => {
    const map: Record<
      string,
      { loading: boolean; items: Array<{ id: string; name: string; unit: string; price?: number }> }
    > = {};
    selectedSlugs.forEach((slug, idx) => {
      const q = categoryDetails[idx];
      map[slug] = {
        loading: q?.isLoading ?? false,
        items: (q?.data?.items ?? []).map((it) => ({
          id: it.id,
          name: it.name,
          unit: it.unit,
          ...(typeof it.price === 'number' ? { price: it.price } : {}),
        })),
      };
    });
    return map;
  }, [selectedSlugs, categoryDetails]);

  const resetForm = useCallback(() => {
    setEditingPresetId(null);
    setTitleDraft('');
    setSelectedSlugs([]);
    setMarkupRaw('');
    setQtyBySlug({});
    setCustomItemsBySlug({});
    setCustomDraftBySlug({});
    setCustomNoMarkupBySlug({});
    setCalcNameBySlug({});
    setCustomErrorBySlug({});
    setEditBaselineKey(null);
    setError(null);
  }, []);

  const open = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  /** Почему расчёт нельзя править в модалке вкладки (null — можно). */
  const editBlockReason = useCallback(
    (preset: ContractEstimatePreset): string | null => {
      if (lockedEstimatePresetIds.has(preset.id)) {
        return 'Расчёт закрыт для изменений: прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с.';
      }
      return quickEstimateEditBlockReason(preset);
    },
    [lockedEstimatePresetIds]
  );

  /** Правка прикреплённого расчёта прямо здесь: черновики по категориям → поля модалки. */
  const openEdit = useCallback(
    (preset: ContractEstimatePreset) => {
      const reason = editBlockReason(preset);
      if (reason) {
        setError(reason);
        return;
      }
      const drafts = quickEstimateDraftsByCategory(preset);
      const nextQty: Record<string, Record<string, string>> = {};
      const nextCustom: Record<string, EstimateCalculatorDraftCustomItems> = {};
      const nextNoMarkup: Record<string, boolean> = {};
      const nextCalcNames: Record<string, string> = {};
      const nextSlugs = Object.keys(drafts);
      const baselineLines: Record<string, Array<{ itemId: string; quantity: number }>> = {};
      for (const [slug, draftRaw] of Object.entries(drafts)) {
        const parsed = parseQuickEstimateDraft(draftRaw);
        if (!parsed) {
          setError('Расчёт с несколькими помещениями — редактируйте его в разделе «Расчёты».');
          return;
        }
        const qtyMap: Record<string, string> = {};
        for (const line of parsed.lines) qtyMap[line.itemId] = String(line.quantity);
        nextQty[slug] = qtyMap;
        baselineLines[slug] = parsed.lines;
        if (Object.keys(parsed.customItems).length > 0) nextCustom[slug] = parsed.customItems;
        if (parsed.customItemsNoMarkup) nextNoMarkup[slug] = true;
        nextCalcNames[slug] = parsed.calcName;
      }
      /** Точка отсчёта: с этим ключом сравнивается текущее состояние («Сохранить» без правок неактивна). */
      setEditBaselineKey(
        quickEstimateFormStateKey({
          title: preset.title,
          markup:
            typeof preset.additionalMarkupPercent === 'number'
              ? preset.additionalMarkupPercent
              : undefined,
          slugs: nextSlugs,
          linesBySlug: baselineLines,
          customItemsBySlug: nextCustom,
          noMarkupBySlug: nextNoMarkup,
        })
      );
      setEditingPresetId(preset.id);
      setTitleDraft(preset.title);
      setSelectedSlugs(Object.keys(drafts));
      setMarkupRaw(
        typeof preset.additionalMarkupPercent === 'number'
          ? String(preset.additionalMarkupPercent)
          : ''
      );
      setQtyBySlug(nextQty);
      setCustomItemsBySlug(nextCustom);
      setCustomDraftBySlug({});
      setCustomNoMarkupBySlug(nextNoMarkup);
      setCalcNameBySlug(nextCalcNames);
      setCustomErrorBySlug({});
      setError(null);
      setIsOpen(true);
    },
    [editBlockReason]
  );

  const close = useCallback(() => {
    if (saving) return;
    setIsOpen(false);
    resetForm();
  }, [saving, resetForm]);

  const toggleCategory = useCallback((slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  /** Сдвиг категории вверх/вниз: порядок панели = порядок категорий в смете/счёт-заказе. */
  const moveCategory = useCallback((slug: string, direction: -1 | 1) => {
    setSelectedSlugs((prev) => moveQuickEstimateCategory(prev, slug, direction));
  }, []);

  const setQuantity = useCallback((slug: string, itemId: string, raw: string) => {
    setQtyBySlug((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? {}), [itemId]: raw },
    }));
  }, []);

  const setCustomDraftField = useCallback(
    (slug: string, field: keyof QuickEstimateCustomDraft, value: string) => {
      setCustomDraftBySlug((prev) => ({
        ...prev,
        [slug]: { ...(prev[slug] ?? emptyCustomDraft()), [field]: value },
      }));
    },
    []
  );

  const addCustomItem = useCallback(
    (slug: string) => {
      const draft = customDraftBySlug[slug] ?? emptyCustomDraft();
      const def = parseCustomWorkFormInput(draft.name, draft.unit, draft.price);
      if (!def) {
        setCustomErrorBySlug((prev) => ({
          ...prev,
          [slug]: 'Укажите название, единицу измерения и цену за единицу (неотрицательное число).',
        }));
        return;
      }
      const itemId = createEstimateCustomItemId();
      setCustomItemsBySlug((prev) => ({
        ...prev,
        [slug]: { ...(prev[slug] ?? {}), [itemId]: def },
      }));
      setQuantity(slug, itemId, '1');
      setCustomDraftBySlug((prev) => ({ ...prev, [slug]: emptyCustomDraft() }));
      setCustomErrorBySlug((prev) => ({ ...prev, [slug]: null }));
    },
    [customDraftBySlug, setQuantity]
  );

  const removeCustomItem = useCallback((slug: string, itemId: string) => {
    setCustomItemsBySlug((prev) => {
      const next = { ...(prev[slug] ?? {}) };
      delete next[itemId];
      return { ...prev, [slug]: next };
    });
  }, []);

  const toggleCustomNoMarkup = useCallback((slug: string) => {
    setCustomNoMarkupBySlug((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }, []);

  /**
   * Позиции категории с количеством > 0: каталог + кастомные. Идут по введённым количествам
   * (а не по каталогу) — при правке сохраняются и позиции, которых уже нет в каталоге.
   */
  const buildCategoryLines = useCallback(
    (slug: string): Array<{ itemId: string; quantity: number }> => {
      const qtyMap = qtyBySlug[slug] ?? {};
      const customDefs = customItemsBySlug[slug] ?? {};
      return Object.entries(qtyMap)
        .map(([itemId, raw]) => ({ itemId, quantity: parsePositiveQuantity(raw) }))
        .filter(
          (l) =>
            l.itemId &&
            l.quantity > 0 &&
            (customDefs[l.itemId] || !l.itemId.startsWith('est-custom:'))
        );
    },
    [qtyBySlug, customItemsBySlug]
  );

  /** Есть ли отличия от состояния на момент открытия правки («Сохранить» без правок неактивна). */
  const isDirty = useMemo(() => {
    if (editBaselineKey === null) return false;
    const parsedMarkup = parseOptionalPercentInput(markupRaw);
    return (
      quickEstimateFormStateKey({
        title: titleDraft,
        markup: parsedMarkup,
        slugs: selectedSlugs,
        linesBySlug: Object.fromEntries(selectedSlugs.map((s) => [s, buildCategoryLines(s)])),
        customItemsBySlug,
        noMarkupBySlug: customNoMarkupBySlug,
      }) !== editBaselineKey
    );
  }, [
    editBaselineKey,
    markupRaw,
    titleDraft,
    selectedSlugs,
    buildCategoryLines,
    customItemsBySlug,
    customNoMarkupBySlug,
  ]);

  /** Предварительный итог по ценам каталога и кастомным позициям (снимок на сохранении — с сервера). */
  const previewTotal = useMemo(() => {
    let total = 0;
    let unknownPrice = false;
    for (const slug of selectedSlugs) {
      const qtyMap = qtyBySlug[slug] ?? {};
      const customDefs = customItemsBySlug[slug] ?? {};
      const priceById = new Map(
        (detailBySlug[slug]?.items ?? []).map((it) => [it.id, it.price] as const)
      );
      for (const [itemId, raw] of Object.entries(qtyMap)) {
        const qty = parsePositiveQuantity(raw);
        if (qty <= 0) continue;
        const custom = customDefs[itemId];
        if (custom) {
          total += custom.price * qty;
          continue;
        }
        const price = priceById.get(itemId);
        if (typeof price !== 'number') {
          unknownPrice = true;
          continue;
        }
        total += price * qty;
      }
    }
    return unknownPrice ? null : total;
  }, [selectedSlugs, qtyBySlug, customItemsBySlug, detailBySlug]);

  const objectAddress = useMemo(
    () =>
      resolveQuickEstimateObjectAddress({
        contractEstimateObjectKey,
        estimateGroups,
        packageObjectAddress: form.object?.objectAddress ?? '',
      }),
    [contractEstimateObjectKey, estimateGroups, form.object?.objectAddress]
  );

  const customerName = useMemo(
    () => buildPackageCustomerTemplateFields(form.customer).displayName,
    [form.customer]
  );

  const save = useCallback(async () => {
    if (saving) return;
    setError(null);

    const existing = editingPresetId
      ? estimatePresets.find((it) => it.id === editingPresetId)
      : undefined;
    if (editingPresetId && !existing) {
      setError('Расчёт не найден — обновите страницу и попробуйте ещё раз.');
      return;
    }

    const categoryInputs: QuickEstimateCategoryInput[] = selectedSlugs.map((slug) => ({
      slug,
      name: categories.find((c) => c.slug === slug)?.name ?? slug,
      calcName: calcNameBySlug[slug],
      lines: buildCategoryLines(slug),
      customItems: customItemsBySlug[slug] ?? {},
      customItemsNoMarkup: customNoMarkupBySlug[slug] ?? false,
    }));
    const validation = validateQuickEstimateInput({
      title: titleDraft,
      customerBlockFilled: packageCustomerBlockHasContent(form.customer),
      objectAddress,
      categories: categoryInputs,
      isEditingExisting: Boolean(existing),
    });
    if (validation) {
      setError(validation.message);
      return;
    }

    /**
     * Объект вкладки зафиксирован прикреплёнными расчётами: новый расчёт по адресу
     * попадёт в другой объект — прикрепление молча отбросит его. Блокируем заранее.
     */
    if (
      !existing &&
      (form.estimate.selectedPresetIds?.length ?? 0) > 0 &&
      contractEstimateObjectKey
    ) {
      const resultingKey = quickEstimateResultingGroupKey({ objectAddress, estimateGroups });
      if (resultingKey !== contractEstimateObjectKey) {
        setError(
          'Адрес создаваемого расчёта относится к другому объекту, а объект сметы/счёт-заказа уже зафиксирован. Создайте расчёт того же объекта (адрес — как у прикреплённых) в разделе «Расчёты».'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const parsedMarkup = parseOptionalPercentInput(markupRaw);
      const preset = await buildQuickEstimatePreset({
        title: titleDraft,
        crmCustomerId: linkedCrmCustomerId ?? '',
        customerName,
        objectAddress,
        direction: packageKind,
        actorUserId: user?.id ?? null,
        ...(parsedMarkup !== undefined
          ? { additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsedMarkup) }
          : {}),
        categories: categoryInputs,
        ...(existing ? { existing } : {}),
      });
      const nextItems = existing
        ? estimatePresets.map((it) => (it.id === existing.id ? preset : it))
        : [preset, ...estimatePresets].slice(0, 200);
      const synced = await persistEstimateWorkspacePresets(nextItems, estimateGroups);
      setEstimatePresets(synced.items);
      setEstimateGroups(synced.groups);
      if (existing) {
        presetUpdated(preset.id, synced.items, synced.groups);
      } else {
        attachCreatedPreset(preset.id, synced.items, synced.groups);
      }
      setIsOpen(false);
      resetForm();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : existing
            ? 'Не удалось сохранить расчёт. Попробуйте ещё раз.'
            : 'Не удалось создать расчёт. Попробуйте ещё раз.'
      );
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    editingPresetId,
    estimatePresets,
    selectedSlugs,
    categories,
    calcNameBySlug,
    buildCategoryLines,
    customItemsBySlug,
    customNoMarkupBySlug,
    titleDraft,
    linkedCrmCustomerId,
    form.customer,
    customerName,
    objectAddress,
    form.estimate.selectedPresetIds,
    contractEstimateObjectKey,
    estimateGroups,
    markupRaw,
    packageKind,
    user?.id,
    setEstimatePresets,
    setEstimateGroups,
    attachCreatedPreset,
    presetUpdated,
    resetForm,
  ]);

  /**
   * Кнопка «+ Создать расчёт»: после подписания или с пустым блоком «Заказчик» на вкладке
   * «Данные» — нельзя. Карточка CRM в «Поиске заказчика в базе» не обязательна: заказчик
   * может быть заполнен и без неё (например, договор из анкеты).
   */
  const createBlockedReason = signedDocsLocked
    ? 'Договор подписан: вкладка только для просмотра.'
    : !packageCustomerBlockHasContent(form.customer)
      ? 'Сначала укажите заказчика в блоке «Заказчик» на вкладке «Данные».'
      : null;

  return {
    isOpen,
    open,
    openEdit,
    editBlockReason,
    isEditing: editingPresetId != null,
    /** Правка: есть изменения относительно открытого расчёта. */
    isDirty,
    close,
    titleDraft,
    setTitleDraft,
    categories,
    categoriesLoading: catalog.isLoading,
    selectedSlugs,
    toggleCategory,
    moveCategory,
    detailBySlug,
    qtyBySlug,
    setQuantity,
    customItemsBySlug,
    customDraftBySlug,
    setCustomDraftField,
    addCustomItem,
    removeCustomItem,
    customErrorBySlug,
    customNoMarkupBySlug,
    toggleCustomNoMarkup,
    markupRaw,
    setMarkupRaw,
    objectAddress,
    customerName,
    previewTotal,
    error,
    saving,
    save,
    createBlockedReason,
  };
}

export type PackageEstimateCreateModalModel = ReturnType<typeof usePackageEstimateCreateModal>;
