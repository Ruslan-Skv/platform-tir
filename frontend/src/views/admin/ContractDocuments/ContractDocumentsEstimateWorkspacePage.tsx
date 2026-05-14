'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getMeasurement } from '@/shared/api/admin-crm';
import { ApprovedOrderGuardProvider } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { ServiceCategoryPage } from '@/views/services/ui/ServiceCategoryPage/ServiceCategoryPage';

import styles from './ContractDocuments.module.css';
import { buildEstimateSnapshot } from './repair/contractDocumentsEstimateSnapshot';
import { clampEstimateAdditionalMarkupPercent } from './repair/repairApplyEstimatePresetIds';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';

function applyDraftToLocalCalculator(categorySlug: string, draft: string) {
  const key = calculatorDraftStorageKey(categorySlug);
  window.localStorage.setItem(key, draft);
}

function calculatorDraftStorageKey(categorySlug: string) {
  return `public.service-catalog.category.calculator-draft.${encodeURIComponent(categorySlug)}`;
}

/** Как в `ServiceCategoryPage`: свёрнутые группы видов работ по категории. */
function calculatorWorkGroupsStorageKey(categorySlug: string) {
  return `public.service-catalog.category.work-groups.${encodeURIComponent(categorySlug)}`;
}

/** Новый расчёт: не подтягивать черновики с публичного каталога / прошлых сессий. */
function clearStoredCalculatorStateForNewEstimate(categorySlugs: string[]) {
  if (typeof window === 'undefined') return;
  for (const slug of categorySlugs) {
    if (!slug) continue;
    try {
      window.localStorage.removeItem(calculatorDraftStorageKey(slug));
      window.localStorage.removeItem(calculatorWorkGroupsStorageKey(slug));
    } catch {
      // квота / приватный режим
    }
  }
}

type WorkspaceBaseline = {
  categorySlugs: string[];
  name: string;
  draftsByCategory: Record<string, string | null>;
};

type AdminMultiCategoryMeta = {
  slugs: string[];
  draftsByCategory: Record<string, string>;
  categories?: Array<{ slug: string; name: string; roomCount: number; total: number }>;
};

type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
  __adminMultiCategory?: unknown;
};

type MeasurementRoomDraft = {
  name?: string;
  ceilingHeight?: string;
  floorArea?: string;
  wallSegments?: string[];
  doors?: Array<{ width?: string; height?: string }>;
  windows?: Array<{ width?: string; height?: string }>;
  selectedWorkItemIds?: string[];
  workItemQuantities?: Record<string, string>;
};

function parsePositive(raw: string | undefined): number {
  const parsed = Number((raw ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseMeasurementRooms(comments: string | null | undefined): MeasurementRoomDraft[] {
  const source = comments ?? '';
  const markerIndex = source.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (markerIndex < 0) return [];
  const jsonRaw = source.slice(markerIndex + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(jsonRaw) as { rooms?: MeasurementRoomDraft[] };
    return Array.isArray(parsed.rooms) ? parsed.rooms : [];
  } catch {
    return [];
  }
}

function buildRoomMetrics(room: MeasurementRoomDraft) {
  const floorArea = parsePositive(room.floorArea);
  const perimeter = (room.wallSegments ?? []).reduce((sum, seg) => sum + parsePositive(seg), 0);
  const ceilingHeight = parsePositive(room.ceilingHeight);
  const doors = room.doors ?? [];
  const windows = room.windows ?? [];
  const doorsArea = doors.reduce(
    (sum, d) => sum + parsePositive(d.width) * parsePositive(d.height),
    0
  );
  const windowsArea = windows.reduce(
    (sum, w) => sum + parsePositive(w.width) * parsePositive(w.height),
    0
  );
  const grossWallArea = perimeter * ceilingHeight;
  const netWallArea = Math.max(0, grossWallArea - doorsArea - windowsArea);
  const baseboardPerimeter = Math.max(
    0,
    perimeter - doors.reduce((sum, d) => sum + parsePositive(d.width), 0)
  );
  return { floorArea, perimeter, netWallArea, baseboardPerimeter, doorsArea, windowsArea };
}

function resolveAutoQuantityByName(
  itemName: string,
  metrics: ReturnType<typeof buildRoomMetrics>
): number {
  const name = itemName.toLowerCase();
  if (name.includes('плинтус')) return metrics.baseboardPerimeter;
  if (name.includes('пол')) return metrics.floorArea;
  if (name.includes('откос')) return metrics.doorsArea + metrics.windowsArea;
  if (name.includes('стен')) return metrics.netWallArea;
  return 0;
}

async function buildDraftsFromMeasurement(
  rooms: MeasurementRoomDraft[],
  categorySlugs: string[]
): Promise<{ draftSlugs: string[]; draftsByCategory: Record<string, string> }> {
  const itemIdToSlug = new Map<string, string>();
  const itemIdToName = new Map<string, string>();
  await Promise.all(
    categorySlugs.map(async (slug) => {
      try {
        const res = await fetch(`${API_URL}/service-catalog/categories/${slug}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Array<{ id: string; name: string }> };
        for (const item of data.items ?? []) {
          itemIdToSlug.set(item.id, slug);
          itemIdToName.set(item.id, item.name);
        }
      } catch {
        // ignore category fetch errors
      }
    })
  );

  const bySlug = new Map<string, PersistedCalculatorDraftV1>();
  for (const room of rooms) {
    const roomName = (room.name ?? '').trim() || 'Помещение';
    const selectedIds = Array.isArray(room.selectedWorkItemIds) ? room.selectedWorkItemIds : [];
    const quantities = room.workItemQuantities ?? {};
    const metrics = buildRoomMetrics(room);
    for (const itemId of selectedIds) {
      const slug = itemIdToSlug.get(itemId);
      if (!slug) continue;
      const manualQuantity = parsePositive(quantities[itemId]);
      const autoQuantity = resolveAutoQuantityByName(itemIdToName.get(itemId) ?? '', metrics);
      const quantity = manualQuantity > 0 ? manualQuantity : autoQuantity > 0 ? autoQuantity : 1;
      if (!bySlug.has(slug)) bySlug.set(slug, { v: 1, activeCalcId: '', calcs: [] });
      const draft = bySlug.get(slug)!;
      let calc = draft.calcs.find((c) => c.name === roomName);
      if (!calc) {
        calc = {
          id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: roomName,
          collapsed: false,
          lines: [],
        };
        draft.calcs.push(calc);
      }
      const existingLine = calc.lines.find((line) => line.itemId === itemId);
      if (existingLine) existingLine.quantity += quantity;
      else calc.lines.push({ itemId, quantity });
      if (!draft.activeCalcId) draft.activeCalcId = calc.id;
    }
  }

  const draftsByCategory = Object.fromEntries(
    [...bySlug.entries()].map(([slug, draft]) => [slug, JSON.stringify(draft)])
  ) as Record<string, string>;
  return {
    draftSlugs: normalizeUniqueCategorySlugs(Object.keys(draftsByCategory)),
    draftsByCategory,
  };
}

function normalizeUniqueCategorySlugs(slugs: string[]): string[] {
  return [...new Set(slugs.map((x) => x.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );
}

function parsePersistedCalculatorDraft(draft: string | null): PersistedCalculatorDraftV1 | null {
  if (!draft) return null;
  try {
    const parsed = JSON.parse(draft) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractRoomNamesFromDraft(draft: string | null): string[] {
  const parsed = parsePersistedCalculatorDraft(draft);
  if (!parsed) return [];
  return parsed.calcs.map((c) => (typeof c.name === 'string' ? c.name.trim() : '')).filter(Boolean);
}

function shouldAutofillTargetRooms(targetDraft: string | null): boolean {
  const parsed = parsePersistedCalculatorDraft(targetDraft);
  if (!parsed) return true;
  if (parsed.calcs.length === 0) return true;
  // Не трогаем категорию, если уже есть введённые позиции.
  if (parsed.calcs.some((c) => Array.isArray(c.lines) && c.lines.length > 0)) return false;
  // Один дефолтный пустой calc можно заменить.
  if (parsed.calcs.length === 1) {
    const name = (parsed.calcs[0].name || '').trim().toLowerCase();
    return !name || name === 'помещение' || name === 'помещение 1';
  }
  // Несколько пустых помещений считаем уже осознанной структурой — не перезаписываем.
  return false;
}

function buildDraftWithRoomNames(roomNames: string[]): string {
  const ts = Date.now();
  const calcs = roomNames.map((name, idx) => ({
    id: `calc_${ts}_${idx + 1}`,
    name,
    collapsed: false,
    lines: [] as Array<{ itemId: string; quantity: number }>,
  }));
  const payload: PersistedCalculatorDraftV1 = {
    v: 1,
    activeCalcId: calcs[0]?.id ?? '',
    calcs,
  };
  return JSON.stringify(payload);
}

function mergeRoomStructureIntoDraft(
  targetDraft: string | null,
  sourceRoomNames: string[]
): string | null {
  const parsed = parsePersistedCalculatorDraft(targetDraft);
  if (!parsed) {
    return buildDraftWithRoomNames(sourceRoomNames);
  }
  if (sourceRoomNames.length === 0) return targetDraft;

  const nextCalcs = [...parsed.calcs];
  let changed = false;
  const ts = Date.now();

  for (let i = 0; i < sourceRoomNames.length; i++) {
    const sourceName = sourceRoomNames[i];
    const cur = nextCalcs[i];
    if (!cur) {
      nextCalcs.push({
        id: `calc_${ts}_${i + 1}`,
        name: sourceName,
        collapsed: false,
        lines: [],
      });
      changed = true;
      continue;
    }
    if ((cur.name || '') !== sourceName) {
      nextCalcs[i] = { ...cur, name: sourceName };
      changed = true;
    }
  }

  if (!changed) return targetDraft;
  const nextPayload: PersistedCalculatorDraftV1 = {
    ...parsed,
    calcs: nextCalcs,
    activeCalcId:
      parsed.activeCalcId && nextCalcs.some((c) => c.id === parsed.activeCalcId)
        ? parsed.activeCalcId
        : (nextCalcs[0]?.id ?? ''),
  };
  return JSON.stringify(nextPayload);
}

function extractMultiCategoryMetaFromDraft(draft: string): AdminMultiCategoryMeta | null {
  try {
    const parsed = JSON.parse(draft) as Record<string, unknown>;
    const raw = parsed.__adminMultiCategory;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const m = raw as { slugs?: unknown; draftsByCategory?: unknown };
    if (!Array.isArray(m.slugs) || !m.draftsByCategory || typeof m.draftsByCategory !== 'object') {
      return null;
    }
    const slugs = normalizeUniqueCategorySlugs(
      m.slugs.filter((x): x is string => typeof x === 'string')
    );
    const draftsByCategory: Record<string, string> = {};
    for (const slug of slugs) {
      const v = (m.draftsByCategory as Record<string, unknown>)[slug];
      if (typeof v === 'string' && v.trim()) draftsByCategory[slug] = v;
    }
    return Object.keys(draftsByCategory).length > 0 ? { slugs, draftsByCategory } : null;
  } catch {
    return null;
  }
}

function encodePrimaryDraftWithMultiMeta(
  primaryDraft: string,
  meta: AdminMultiCategoryMeta | null
): string {
  if (!meta || meta.slugs.length <= 1) return primaryDraft;
  try {
    const parsed = JSON.parse(primaryDraft) as Record<string, unknown>;
    parsed.__adminMultiCategory = meta;
    return JSON.stringify(parsed);
  } catch {
    return primaryDraft;
  }
}

function clampWithEllipsis(value: string, max: number): string {
  const normalized = value.trim();
  if (normalized.length <= max) return normalized;
  if (max <= 1) return normalized.slice(0, max);
  return `${normalized.slice(0, max - 1)}…`;
}

function sanitizeEstimatePresetForApi(input: ContractEstimatePreset): ContractEstimatePreset {
  const { additionalMarkupPercent: rawMarkup, ...restIn } = input;
  const base: ContractEstimatePreset = {
    ...restIn,
    id: clampWithEllipsis(input.id || `est_${Date.now()}`, 80),
    title: clampWithEllipsis(input.title || 'Расчёт', 160),
    categorySlug: clampWithEllipsis(input.categorySlug || 'repair', 120),
    categoryName: clampWithEllipsis(input.categoryName || 'Расчёт', 200),
    groupId: input.groupId ? clampWithEllipsis(input.groupId, 48) : undefined,
  };
  if (typeof rawMarkup === 'number' && Number.isFinite(rawMarkup)) {
    return {
      ...base,
      additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(rawMarkup),
    };
  }
  return base;
}

const ESTIMATES_LIST_HREF = '/admin/contract-documents/estimates';

function ContractDocumentsEstimateWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estimateIdFromUrl = searchParams.get('id');
  const copyFromId = searchParams.get('copyFrom');
  const fromMeasurementId = searchParams.get('fromMeasurement');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  const [estimateCategories, setEstimateCategories] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [estimateCategorySlugs, setEstimateCategorySlugs] = useState<string[]>([]);
  const [activeCategorySlug, setActiveCategorySlug] = useState('');
  const [estimateNameDraft, setEstimateNameDraft] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState('');
  const [baseline, setBaseline] = useState<WorkspaceBaseline | null>(null);
  const [draftPollTick, setDraftPollTick] = useState(0);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  /** Пока true — считаем черновик несохранённым (режим «копия»), чтобы была кнопка «Сохранить». */
  const [copySessionPendingSave, setCopySessionPendingSave] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      setOk(null);
      setBaseline(null);
      setCopySessionPendingSave(false);
      try {
        const [presetsRes, categoriesRes] = await Promise.all([
          getContractDocumentEstimatePresets('REPAIR'),
          fetch(`${API_URL}/service-catalog`),
        ]);
        const loadedItems = presetsRes.items ?? [];
        setItems(loadedItems);
        setEstimateGroups(presetsRes.groups ?? []);

        let cats: Array<{ slug: string; name: string }> = [];
        if (categoriesRes.ok) {
          const data = (await categoriesRes.json()) as {
            categories?: Array<{ slug: string; name: string }>;
          };
          cats = (data.categories ?? [])
            .map((c) => ({ slug: c.slug, name: c.name }))
            .filter((c) => c.slug);
          setEstimateCategories(cats);
        }

        let baselineSlugs: string[] = [];
        let baselineName = '';

        if (copyFromId) {
          const source = loadedItems.find((item) => item.id === copyFromId);
          if (source) {
            clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
            const sourceMeta = extractMultiCategoryMetaFromDraft(source.calculatorDraft);
            const sourceSlugs = normalizeUniqueCategorySlugs(
              sourceMeta?.slugs?.length ? sourceMeta.slugs : [source.categorySlug]
            );
            for (const slug of sourceSlugs) {
              const draftByCategory =
                sourceMeta?.draftsByCategory?.[slug] ?? source.calculatorDraft;
              if (draftByCategory) applyDraftToLocalCalculator(slug, draftByCategory);
            }
            setEstimateCategorySlugs(sourceSlugs);
            setActiveCategorySlug(sourceSlugs[0] ?? '');
            const copyTitle = `${source.title.trim() || 'Расчёт'} (копия)`;
            setEstimateNameDraft(copyTitle);
            setSelectedEstimateId('');
            baselineSlugs = sourceSlugs;
            baselineName = copyTitle;
            setCopySessionPendingSave(true);
          } else {
            setError('Исходный расчёт не найден. Вернитесь к списку и обновите страницу.');
            clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
            setSelectedEstimateId('');
            setEstimateNameDraft('');
            if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
            setActiveCategorySlug(cats[0]?.slug ?? '');
            baselineSlugs = cats[0] ? [cats[0].slug] : [];
            baselineName = '';
          }
        } else if (estimateIdFromUrl) {
          const preset = loadedItems.find((it) => it.id === estimateIdFromUrl);
          if (preset) {
            const presetMeta = extractMultiCategoryMetaFromDraft(preset.calculatorDraft);
            const presetSlugs = normalizeUniqueCategorySlugs(
              presetMeta?.slugs?.length ? presetMeta.slugs : [preset.categorySlug]
            );
            for (const slug of presetSlugs) {
              const draftByCategory =
                presetMeta?.draftsByCategory?.[slug] ?? preset.calculatorDraft;
              if (draftByCategory) applyDraftToLocalCalculator(slug, draftByCategory);
            }
            setEstimateCategorySlugs(presetSlugs);
            setActiveCategorySlug(presetSlugs[0] ?? '');
            setEstimateNameDraft(preset.title);
            setSelectedEstimateId(preset.id);
            baselineSlugs = presetSlugs;
            baselineName = preset.title;
          } else {
            setError('Расчёт не найден. Вернитесь к списку и обновите страницу.');
            setSelectedEstimateId('');
            setEstimateNameDraft('');
            if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
            setActiveCategorySlug(cats[0]?.slug ?? '');
            baselineSlugs = cats[0] ? [cats[0].slug] : [];
            baselineName = '';
          }
        } else if (fromMeasurementId) {
          try {
            const measurement = await getMeasurement(fromMeasurementId);
            const rooms = parseMeasurementRooms(measurement.comments);
            if (rooms.length === 0) {
              setError('В выбранном замере нет данных для автогенерации расчёта.');
              clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
              setSelectedEstimateId('');
              setEstimateNameDraft('');
              if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
              setActiveCategorySlug(cats[0]?.slug ?? '');
              baselineSlugs = cats[0] ? [cats[0].slug] : [];
              baselineName = '';
            } else {
              clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
              const { draftSlugs, draftsByCategory } = await buildDraftsFromMeasurement(
                rooms,
                cats.map((c) => c.slug)
              );
              if (draftSlugs.length === 0) {
                setError('В замере нет выбранных работ для автогенерации расчёта.');
                if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
                setActiveCategorySlug(cats[0]?.slug ?? '');
                baselineSlugs = cats[0] ? [cats[0].slug] : [];
                baselineName = '';
              } else {
                for (const slug of draftSlugs) {
                  applyDraftToLocalCalculator(slug, draftsByCategory[slug]);
                }
                setEstimateCategorySlugs(draftSlugs);
                setActiveCategorySlug(draftSlugs[0] ?? '');
                const autoTitle = `Расчёт по замеру: ${measurement.customerName || measurement.id.slice(0, 8)}`;
                setEstimateNameDraft(autoTitle);
                setSelectedEstimateId('');
                baselineSlugs = draftSlugs;
                baselineName = autoTitle;
                setCopySessionPendingSave(true);
              }
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось создать расчёт из замера');
            clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
            setSelectedEstimateId('');
            setEstimateNameDraft('');
            if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
            setActiveCategorySlug(cats[0]?.slug ?? '');
            baselineSlugs = cats[0] ? [cats[0].slug] : [];
            baselineName = '';
          }
        } else {
          clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
          setSelectedEstimateId('');
          setEstimateNameDraft('');
          if (cats[0]) setEstimateCategorySlugs([cats[0].slug]);
          setActiveCategorySlug(cats[0]?.slug ?? '');
          baselineSlugs = cats[0] ? [cats[0].slug] : [];
          baselineName = '';
        }
        const baselineDraftsByCategory: Record<string, string | null> = {};
        for (const slug of baselineSlugs) {
          const baselineKey = calculatorDraftStorageKey(slug);
          baselineDraftsByCategory[slug] = window.localStorage.getItem(baselineKey);
        }
        setBaseline({
          categorySlugs: baselineSlugs,
          name: baselineName,
          draftsByCategory: baselineDraftsByCategory,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, [estimateIdFromUrl, copyFromId, fromMeasurementId]);

  useEffect(() => {
    if (estimateCategorySlugs.length === 0) {
      if (activeCategorySlug) setActiveCategorySlug('');
      return;
    }
    if (!estimateCategorySlugs.includes(activeCategorySlug)) {
      setActiveCategorySlug(estimateCategorySlugs[0]);
    }
  }, [estimateCategorySlugs, activeCategorySlug]);

  useEffect(() => {
    const id = window.setInterval(() => setDraftPollTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!baseline && !copySessionPendingSave) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (copySessionPendingSave) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      if (!baseline) return;
      const selectedSlugs = normalizeUniqueCategorySlugs(estimateCategorySlugs);
      const baselineSlugs = normalizeUniqueCategorySlugs(baseline.categorySlugs);
      const sameSlugs =
        selectedSlugs.length === baselineSlugs.length &&
        selectedSlugs.every((slug, idx) => slug === baselineSlugs[idx]);
      let draftsDirty = false;
      for (const slug of selectedSlugs) {
        const currentDraft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
        const baselineDraft = baseline.draftsByCategory[slug] ?? null;
        if ((currentDraft ?? '') !== (baselineDraft ?? '')) {
          draftsDirty = true;
          break;
        }
      }
      const isDirty = !sameSlugs || estimateNameDraft !== baseline.name || draftsDirty;
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [baseline, copySessionPendingSave, estimateCategorySlugs, estimateNameDraft]);

  const dirty = useMemo(() => {
    if (copySessionPendingSave) return true;
    if (!baseline) return false;
    const selectedSlugs = normalizeUniqueCategorySlugs(estimateCategorySlugs);
    const baselineSlugs = normalizeUniqueCategorySlugs(baseline.categorySlugs);
    const sameSlugs =
      selectedSlugs.length === baselineSlugs.length &&
      selectedSlugs.every((slug, idx) => slug === baselineSlugs[idx]);
    if (!sameSlugs) return true;
    if (estimateNameDraft !== baseline.name) return true;
    for (const slug of selectedSlugs) {
      const currentDraft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
      const baselineDraft = baseline.draftsByCategory[slug] ?? null;
      if ((currentDraft ?? '') !== (baselineDraft ?? '')) return true;
    }
    return false;
  }, [copySessionPendingSave, baseline, estimateCategorySlugs, estimateNameDraft, draftPollTick]);

  const isEditingExisting =
    Boolean(selectedEstimateId) && items.some((it) => it.id === selectedEstimateId);

  const prepareRoomsForCategorySwitch = (fromSlug: string, toSlug: string) => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return;
    const sourceDraft = window.localStorage.getItem(calculatorDraftStorageKey(fromSlug));
    const roomNames = extractRoomNamesFromDraft(sourceDraft);
    if (roomNames.length === 0) return;
    // Синхронизируем структуру помещений во все выбранные категории:
    // новые помещения и переименования должны появляться везде, но строки расчёта не теряем.
    for (const slug of estimateCategorySlugs) {
      if (!slug || slug === fromSlug) continue;
      const key = calculatorDraftStorageKey(slug);
      const curDraft = window.localStorage.getItem(key);
      if (shouldAutofillTargetRooms(curDraft)) {
        window.localStorage.setItem(key, buildDraftWithRoomNames(roomNames));
        continue;
      }
      const merged = mergeRoomStructureIntoDraft(curDraft, roomNames);
      if (merged && merged !== curDraft) {
        window.localStorage.setItem(key, merged);
      }
    }
  };

  const abandonChangesAndLeave = () => {
    if (baseline) {
      for (const slug of baseline.categorySlugs) {
        const k = calculatorDraftStorageKey(slug);
        const d = baseline.draftsByCategory[slug] ?? null;
        if (d !== null) window.localStorage.setItem(k, d);
        else window.localStorage.removeItem(k);
      }
    }
    setExitConfirmOpen(false);
    router.push(ESTIMATES_LIST_HREF);
  };

  const persistItems = async (next: ContractEstimatePreset[]): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payloadItems = next.map((it) => {
        const {
          calculatorDraftByCategory: _draftByCategory,
          multiCategorySlugs: _multiCategorySlugs,
          ...rest
        } = it as ContractEstimatePreset & {
          calculatorDraftByCategory?: Record<string, string>;
          multiCategorySlugs?: string[];
        };
        return sanitizeEstimatePresetForApi(rest as ContractEstimatePreset);
      });
      const payloadGroups = estimateGroups.map((g) => {
        const id = clampWithEllipsis(g.id || `grp_${Date.now()}`, 48);
        const title = clampWithEllipsis(g.title || 'Объект', 200);
        if (
          typeof g.additionalMarkupPercent === 'number' &&
          Number.isFinite(g.additionalMarkupPercent)
        ) {
          return {
            ...g,
            id,
            title,
            additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(
              g.additionalMarkupPercent
            ),
          };
        }
        const { additionalMarkupPercent: _m, ...rest } = g;
        return { ...rest, id, title } as ContractEstimateGroup;
      });
      await putContractDocumentEstimatePresets({
        kind: 'REPAIR',
        items: payloadItems,
        groups: payloadGroups,
      });
      setItems(next);
      setOk('Сохранено.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentEstimate = async () => {
    const selectedSlugs = normalizeUniqueCategorySlugs(estimateCategorySlugs);
    if (selectedSlugs.length === 0) {
      setError('Выберите хотя бы одну категорию работ.');
      return;
    }
    const draftsByCategory: Record<string, string> = {};
    for (const slug of selectedSlugs) {
      const draft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
      if (!draft) continue;
      draftsByCategory[slug] = draft;
    }
    const draftSlugs = Object.keys(draftsByCategory);
    if (draftSlugs.length === 0) {
      setError('Нет данных калькулятора по выбранным категориям.');
      return;
    }
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
    const title = clampWithEllipsis(
      estimateNameDraft.trim() || `Расчёт ${new Date().toLocaleString('ru-RU')}`,
      160
    );

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
      isMultiCategory
        ? { slugs: draftSlugs, draftsByCategory, categories: categorySummaries }
        : null
    );
    const copySourceForMarkup =
      !existing && copyFromId ? items.find((it) => it.id === copyFromId) : undefined;
    const markupSource = existing ?? copySourceForMarkup;
    const copyInSplitFamily =
      !existing &&
      Boolean(copySourceForMarkup) &&
      (Boolean(copySourceForMarkup!.splitBundleId) ||
        Array.isArray(copySourceForMarkup!.estimateWorkScopeKeys));

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
      ...(existing?.groupId ? { groupId: existing.groupId } : {}),
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
        : {}),
      ...(existing && !existing.groupId && existing.mergeListOrder != null
        ? { mergeListOrder: existing.mergeListOrder }
        : {}),
      ...(existing?.splitBundleId ? { splitBundleId: existing.splitBundleId } : {}),
      ...(typeof existing?.estimateWorkScopeKeys !== 'undefined'
        ? { estimateWorkScopeKeys: [...existing.estimateWorkScopeKeys] }
        : {}),
      ...(copyInSplitFamily && copySourceForMarkup
        ? {
            splitBundleId: copySourceForMarkup.splitBundleId ?? copySourceForMarkup.id,
            estimateWorkScopeKeys: [] as string[],
          }
        : {}),
    };

    const next = existing
      ? items.map((it) => (it.id === existing.id ? nextItem : it))
      : [nextItem, ...items].slice(0, 200);

    setSelectedEstimateId(nextItem.id);
    const saved = await persistItems(next);
    if (saved) {
      setCopySessionPendingSave(false);
      router.push('/admin/contract-documents/estimates');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.pageWide} ${styles.estimateWorkspacePage}`}>
      <div className={styles.editorHeader}>
        <div>
          <Link
            className={styles.backLink}
            href={ESTIMATES_LIST_HREF}
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setExitConfirmOpen(true);
              }
            }}
          >
            ← К списку расчётов
          </Link>
          <h1 className={`${styles.title} ${styles.estimateWorkspaceTitle}`}>
            {estimateIdFromUrl
              ? 'Редактирование расчёта'
              : copyFromId
                ? 'Новый расчёт по копии'
                : fromMeasurementId
                  ? 'Новый расчёт по выполненному замеру'
                  : 'Новый расчёт'}
          </h1>
          <p className={`${styles.subtitle} ${styles.estimateWorkspaceSubtitle}`}>
            Калькулятор сметы. Сохранение появляется только при изменениях в названии, категории или
            смете; затем вы вернётесь к списку общих расчётов.
          </p>
        </div>
        <div className={styles.estimateWorkspaceHeaderControls}>
          <label className={`${styles.field} ${styles.estimateWorkspaceHeaderNameField}`}>
            <span>Название расчёта</span>
            <input
              value={estimateNameDraft}
              onChange={(e) => setEstimateNameDraft(e.target.value)}
              placeholder="Например: ЖК Парк, кв. 54"
            />
          </label>
          {dirty ? (
            <div className={styles.estimateWorkspaceActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving}
                onClick={() => void saveCurrentEstimate()}
              >
                {saving
                  ? 'Сохранение…'
                  : isEditingExisting
                    ? 'Сохранить изменения'
                    : 'Сохранить расчёт'}
              </button>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimateWorkspaceExitBtn}`}
                disabled={saving}
                onClick={() => setExitConfirmOpen(true)}
              >
                Выйти без сохранения
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div
        className={`${styles.docToolbar} ${styles.blockImport} ${styles.estimateWorkspaceToolbar}`}
      >
        <label className={`${styles.field} ${styles.estimateWorkspaceFieldWide}`}>
          <span>Категории работ (можно выбрать несколько)</span>
          <div className={styles.estimateWorkspaceCategoryChips}>
            {estimateCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={`${styles.estimateWorkspaceCategoryChip} ${
                  estimateCategorySlugs.includes(c.slug)
                    ? styles.estimateWorkspaceCategoryChipActive
                    : ''
                }`}
                onClick={() => {
                  setEstimateCategorySlugs((prev) => {
                    if (prev.includes(c.slug)) return prev.filter((x) => x !== c.slug);
                    return normalizeUniqueCategorySlugs([...prev, c.slug]);
                  });
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className={styles.docPane}>
        {estimateCategorySlugs.length > 0 ? (
          <CartProvider>
            <div className={`${styles.tabBar} ${styles.estimateWorkspaceTabBar}`}>
              {estimateCategorySlugs.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  className={
                    slug === activeCategorySlug ? `${styles.tab} ${styles.tabActive}` : styles.tab
                  }
                  onClick={() => {
                    prepareRoomsForCategorySwitch(activeCategorySlug, slug);
                    setActiveCategorySlug(slug);
                  }}
                >
                  {estimateCategories.find((c) => c.slug === slug)?.name ?? slug}
                </button>
              ))}
            </div>
            {activeCategorySlug ? (
              <div>
                <ApprovedOrderGuardProvider>
                  <ServiceCategoryPage
                    key={activeCategorySlug}
                    slug={activeCategorySlug}
                    hideAddToCart
                    hideBreadcrumbs
                    hideTitleBlock
                  />
                </ApprovedOrderGuardProvider>
              </div>
            ) : null}
          </CartProvider>
        ) : (
          <p className={styles.hint}>Выберите минимум одну категорию для работы с калькулятором.</p>
        )}
      </div>

      {exitConfirmOpen ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="estimate-exit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExitConfirmOpen(false);
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="estimate-exit-title" className={styles.saveModalTitle}>
              Выйти без сохранения?
            </h3>
            <p className={styles.saveModalText}>
              Несохранённые изменения в расчёте будут отменены. Для расчёта, открытого из списка,
              черновик калькулятора вернётся к состоянию на момент открытия страницы.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setExitConfirmOpen(false)}
              >
                Отмена
              </button>
              <button type="button" className={styles.primaryBtn} onClick={abandonChangesAndLeave}>
                Выйти без сохранения
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ContractDocumentsEstimateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p className={styles.hint}>Загрузка…</p>
        </div>
      }
    >
      <ContractDocumentsEstimateWorkspaceInner />
    </Suspense>
  );
}
