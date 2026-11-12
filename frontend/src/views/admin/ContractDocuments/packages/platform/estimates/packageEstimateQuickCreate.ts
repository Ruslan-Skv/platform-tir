/**
 * Сборка небольшого расчёта прямо из вкладки «Счёт-заказ»/«Смета» договора —
 * без рабочей области раздела «Расчёты». Пресет получается полноценным:
 * тот же формат черновика/снимка, редактируется в воркспейсе как обычно.
 */
import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  clampWithEllipsis,
  encodePrimaryDraftWithMultiMeta,
  extractMultiCategoryMetaFromDraft,
} from '@/views/admin/ContractDocuments/packages/pages/estimates/workspace/estimateWorkspaceUtils';

import { buildEstimateSnapshot } from './contractDocumentsEstimateSnapshot';
import {
  type EstimateCalculatorDraftCustomItems,
  parseCustomItemsNoMarkupFromDraft,
  parseEstimateCustomItemsFromDraft,
} from './estimateCustomWorkItems';
import { normalizeAddressMatchKey } from './estimateObjectGroupSync';

/** Название блока позиций в снимке сметы (аналог «Помещение 1» в воркспейсе). */
export const QUICK_ESTIMATE_CALC_NAME = 'Работы';

/** Работы одной категории небольшого расчёта: позиции каталога + кастомные (`est-custom:*`). */
export type QuickEstimateCategoryInput = {
  slug: string;
  name: string;
  /** Имя блока позиций (сохраняется имя исходного помещения при правке существующего расчёта). */
  calcName?: string;
  lines: Array<{ itemId: string; quantity: number }>;
  customItems: EstimateCalculatorDraftCustomItems;
  /** Наценка расчёта не применяется к кастомным позициям этой категории. */
  customItemsNoMarkup: boolean;
};

export type BuildQuickEstimatePresetParams = {
  title: string;
  crmCustomerId: string;
  customerName: string;
  objectAddress: string;
  direction: ContractDocumentPackageKind;
  /** Текущий пользователь — для createdById нового расчёта. */
  actorUserId?: string | null;
  /** Наценка расчёта, %; undefined — наценка объекта (поле не сохраняется). */
  additionalMarkupPercent?: number;
  /** Новый расчёт живёт только в договоре (скрыт из раздела «Расчёты»); при правке берётся из existing. */
  embeddedInPackage?: boolean;
  categories: QuickEstimateCategoryInput[];
  /** Правка существующего расчёта: сохраняет id/даты/группу/заказчика/адрес и прочие служебные поля. */
  existing?: ContractEstimatePreset;
};

export type QuickEstimateValidationField =
  | 'title'
  | 'customer'
  | 'address'
  | 'categories'
  | 'lines';

export type QuickEstimateValidationError = {
  field: QuickEstimateValidationField;
  message: string;
};

export function quickEstimateCategoryHasLines(category: QuickEstimateCategoryInput): boolean {
  return category.lines.some(
    (l) => l.itemId.trim() && Number.isFinite(l.quantity) && l.quantity > 0
  );
}

/**
 * Сдвиг категории в списке выбранных (стрелки в модалке): порядок категорий панели
 * создания = порядок категорий в смете/счёт-заказе. Границы списка — без изменений.
 */
export function moveQuickEstimateCategory(
  slugs: string[],
  slug: string,
  direction: -1 | 1
): string[] {
  const from = slugs.indexOf(slug);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= slugs.length) return slugs;
  const next = [...slugs];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * Проверка полей быстрого расчёта из договора. Заказчик — по блоку «Заказчик» на вкладке
 * «Данные» (карточка CRM в «Поиске заказчика в базе» не обязательна: блок может быть
 * заполнен и без неё, например договором из анкеты). Остальное — как в воркспейсе расчёта.
 */
export function validateQuickEstimateInput(params: {
  title: string;
  /** Заполнен ли блок «Заказчик» на вкладке «Данные» договора. */
  customerBlockFilled: boolean;
  objectAddress: string;
  categories: QuickEstimateCategoryInput[];
  /** Правка существующего: позиции можно очистить (как в воркспейсе). */
  isEditingExisting?: boolean;
}): QuickEstimateValidationError | null {
  if (!params.title.trim()) {
    return { field: 'title', message: 'Укажите название расчёта — без него сохранить нельзя.' };
  }
  if (!params.customerBlockFilled) {
    return {
      field: 'customer',
      message: 'Сначала укажите заказчика в блоке «Заказчик» на вкладке «Данные».',
    };
  }
  if (!params.objectAddress.trim()) {
    return {
      field: 'address',
      message: 'Укажите адрес объекта в карточке заказчика или на вкладке «Данные».',
    };
  }
  if (params.categories.length === 0) {
    return { field: 'categories', message: 'Выберите хотя бы одну категорию работ.' };
  }
  const filled = params.categories.filter(quickEstimateCategoryHasLines);
  if (filled.length === 0 && !params.isEditingExisting) {
    return {
      field: 'lines',
      message: 'Выберите работы и укажите количество хотя бы в одной позиции.',
    };
  }
  return null;
}

/** Черновик калькулятора формата v1 с одним блоком позиций. */
export function buildQuickEstimateDraft(category: QuickEstimateCategoryInput): string {
  const calcId = `calc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const calcName = category.calcName?.trim() || QUICK_ESTIMATE_CALC_NAME;
  const lines = category.lines
    .map((l) => ({ itemId: l.itemId.trim(), quantity: Number(l.quantity) }))
    .filter((l) => l.itemId && Number.isFinite(l.quantity) && l.quantity > 0);
  const payload = {
    v: 1 as const,
    activeCalcId: calcId,
    ...(Object.keys(category.customItems).length > 0 ? { customItems: category.customItems } : {}),
    ...(category.customItemsNoMarkup ? { customItemsNoMarkup: true } : {}),
    calcs: [{ id: calcId, name: calcName, collapsed: false, lines }],
  };
  return JSON.stringify(payload);
}

/**
 * Черновики расчёта по категориям: мета мультикатегорий из `calculatorDraft`,
 * иначе одна категория `categorySlug` (как при загрузке воркспейса).
 */
export function quickEstimateDraftsByCategory(
  preset: Pick<ContractEstimatePreset, 'calculatorDraft' | 'categorySlug'>
): Record<string, string> {
  const meta = extractMultiCategoryMetaFromDraft(preset.calculatorDraft);
  if (meta && meta.slugs.length > 0) return meta.draftsByCategory;
  const slug = preset.categorySlug?.trim();
  return slug ? { [slug]: preset.calculatorDraft } : {};
}

export type QuickEstimateEditableDraft = {
  calcName: string;
  lines: Array<{ itemId: string; quantity: number }>;
  customItems: EstimateCalculatorDraftCustomItems;
  customItemsNoMarkup: boolean;
};

/**
 * Разбор черновика категории для правки в модалке: ожидается один блок позиций
 * (как создаёт модалка или «Помещение 1» воркспейса). Несколько непустых помещений —
 * `null`: такой расчёт оставляем воркспейсу раздела «Расчёты».
 */
export function parseQuickEstimateDraft(draftRaw: string): QuickEstimateEditableDraft | null {
  let parsed: {
    v?: unknown;
    calcs?: Array<{
      name?: unknown;
      lines?: Array<{ itemId?: unknown; quantity?: unknown }>;
    }>;
  };
  try {
    parsed = JSON.parse(draftRaw);
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return null;

  const withLines = parsed.calcs
    .map((calc) => ({
      name: typeof calc.name === 'string' ? calc.name.trim() : '',
      lines: (Array.isArray(calc.lines) ? calc.lines : []).filter(
        (l): l is { itemId: string; quantity: number } => {
          const itemId = typeof l?.itemId === 'string' ? l.itemId.trim() : '';
          const qty = Number(l?.quantity);
          return Boolean(itemId) && Number.isFinite(qty) && qty > 0;
        }
      ),
    }))
    .filter((calc) => calc.lines.length > 0);
  if (withLines.length > 1) return null;

  const source = withLines[0] ?? { name: '', lines: [] };
  const customItemsAll = parseEstimateCustomItemsFromDraft(draftRaw);
  const usedCustom: EstimateCalculatorDraftCustomItems = {};
  for (const line of source.lines) {
    const def = customItemsAll[line.itemId];
    if (def) usedCustom[line.itemId] = def;
  }
  return {
    calcName: source.name || QUICK_ESTIMATE_CALC_NAME,
    lines: source.lines,
    customItems: usedCustom,
    customItemsNoMarkup: parseCustomItemsNoMarkupFromDraft(draftRaw),
  };
}

/**
 * Почему расчёт нельзя править в модалке вкладки «Счёт-заказ»/«Смета»
 * (`null` — можно): связки экземпляров и многопомещенческие сметы — разделу «Расчёты».
 */
export function quickEstimateEditBlockReason(preset: ContractEstimatePreset): string | null {
  if (preset.splitBundleId || (preset.estimateWorkScopeKeys?.length ?? 0) > 0) {
    return 'Расчёт со связанными экземплярами — редактируйте его в разделе «Расчёты».';
  }
  const drafts = quickEstimateDraftsByCategory(preset);
  for (const draftRaw of Object.values(drafts)) {
    if (parseQuickEstimateDraft(draftRaw) === null) {
      return 'Расчёт с несколькими помещениями — редактируйте его в разделе «Расчёты».';
    }
  }
  return null;
}

/**
 * Адрес объекта нового расчёта: заголовок выбранного/зафиксированного объекта вкладки
 * (заголовок группы = адрес её расчётов), иначе — адрес объекта из вкладки «Данные».
 */
export function resolveQuickEstimateObjectAddress(params: {
  contractEstimateObjectKey: string;
  estimateGroups: ContractEstimateGroup[];
  packageObjectAddress: string;
}): string {
  const key = params.contractEstimateObjectKey.trim();
  if (key && key !== '__ungrouped__') {
    const group = params.estimateGroups.find((g) => g.id === key);
    const title = group?.title?.trim();
    if (title) return title;
  }
  return params.packageObjectAddress.trim();
}

/**
 * Ключ объекта, в который попадёт новый расчёт после адресной синхронизации
 * (`ensureEstimateObjectGroups`): id существующей группы с этим адресом,
 * `__ungrouped__` без адреса или `__new_group__` — будет создана новая группа.
 */
export function quickEstimateResultingGroupKey(params: {
  objectAddress: string;
  estimateGroups: ContractEstimateGroup[];
}): '__ungrouped__' | '__new_group__' | string {
  const key = normalizeAddressMatchKey(params.objectAddress);
  if (!key) return '__ungrouped__';
  const existing = params.estimateGroups.find((g) => normalizeAddressMatchKey(g.title) === key)?.id;
  return existing ?? '__new_group__';
}

/** Сборка пресета небольшого расчёта (снимок сметы — через расчёт каталога, как в воркспейсе). */
export async function buildQuickEstimatePreset(
  params: BuildQuickEstimatePresetParams
): Promise<ContractEstimatePreset> {
  const existing = params.existing;
  const categories = existing
    ? params.categories.filter((c) => c.slug.trim())
    : params.categories.filter(quickEstimateCategoryHasLines);
  if (categories.length === 0) {
    throw new Error('quick estimate: no categories with selected lines');
  }

  const draftsByCategory: Record<string, string> = {};
  for (const category of categories) {
    draftsByCategory[category.slug.trim()] = buildQuickEstimateDraft(category);
  }
  const draftSlugs = Object.keys(draftsByCategory);
  const snapshots = await Promise.all(
    draftSlugs.map((slug) => buildEstimateSnapshot(draftsByCategory[slug]!))
  );
  const mergedRooms = snapshots.flatMap((s) => s?.rooms ?? []);
  const mergedSnapshot =
    mergedRooms.length > 0
      ? {
          rooms: mergedRooms,
          total: snapshots.reduce((sum, s) => sum + (s?.total ?? 0), 0),
        }
      : null;

  const categoryNames = draftSlugs.map(
    (slug) => params.categories.find((c) => c.slug === slug)?.name ?? slug
  );
  const categoryNameRaw =
    draftSlugs.length > 1 ? `Комплексный расчёт: ${categoryNames.join(', ')}` : categoryNames[0]!;
  const categorySummaries = draftSlugs.map((slug, idx) => ({
    slug,
    name: categoryNames[idx] ?? slug,
    roomCount: snapshots[idx]?.rooms.length ?? 0,
    total: snapshots[idx]?.total ?? 0,
  }));
  const primaryDraft = draftsByCategory[draftSlugs[0]!]!;
  const calculatorDraft = encodePrimaryDraftWithMultiMeta(
    primaryDraft,
    draftSlugs.length > 1
      ? { slugs: draftSlugs, draftsByCategory, categories: categorySummaries }
      : null
  );

  const now = new Date().toISOString();
  const actorId = params.actorUserId?.trim();
  // Наценка: undefined — «наценка объекта»; прежнее значение пресета не переносим.
  const { additionalMarkupPercent: _existingMarkup, ...existingBase } = existing ?? {};
  return {
    ...existingBase,
    id: existing?.id ?? `est_${Date.now()}`,
    title: clampWithEllipsis(params.title.trim(), 160),
    categorySlug: draftSlugs[0]!,
    categoryName: clampWithEllipsis(categoryNameRaw, 200),
    calculatorDraft,
    calculatorDraftByCategory: draftsByCategory,
    multiCategorySlugs: draftSlugs,
    snapshot: mergedSnapshot,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdById: existing?.createdById?.trim() || (actorId ? actorId : undefined),
    crmCustomerId: clampWithEllipsis(
      existing?.crmCustomerId?.trim() || params.crmCustomerId.trim() || '',
      80
    ),
    customerName: clampWithEllipsis(
      existing?.customerName?.trim() || params.customerName.trim(),
      200
    ),
    objectAddress: clampWithEllipsis(
      existing?.objectAddress?.trim() || params.objectAddress.trim(),
      500
    ),
    ...(typeof params.additionalMarkupPercent === 'number'
      ? { additionalMarkupPercent: params.additionalMarkupPercent }
      : {}),
    direction: existing?.direction ?? params.direction,
    // «Только в договоре»: флаг сохраняется при правке, при создании — берётся из параметра.
    ...(existing?.embeddedInPackage || params.embeddedInPackage ? { embeddedInPackage: true } : {}),
  };
}
