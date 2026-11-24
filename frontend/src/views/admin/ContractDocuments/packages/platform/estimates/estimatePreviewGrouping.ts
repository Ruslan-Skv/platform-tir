import type { EstimateSnapshotRoom } from './applyEstimatePresetIds';
import type { EstimateEmbedSection } from './packageEstimateDocPrintEmbedHtml';

/** Вариант отображения сметы: сначала помещения (по умолчанию) или сначала категории. */
export type EstimatePreviewGroupMode = 'byRooms' | 'byCategories';

const ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY = 'admin_estimates_preview_group_mode_v1';

const ESTIMATE_PREVIEW_GROUP_MODE_CHANGE_EVENT = 'estimate-preview-group-mode-change';

export const DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE: EstimatePreviewGroupMode = 'byRooms';

/** Категория внутри помещения: исходное помещение снимка одной категории. */
export type EstimateRoomCategoryBlock = {
  categoryName: string;
  room: EstimateSnapshotRoom;
};

/** Помещение с работами, разложенными по категориям («Кухня» из демонтажа и сантехники — одно помещение). */
export type EstimateRoomSection = {
  roomName: string;
  total: number;
  categories: EstimateRoomCategoryBlock[];
};

/**
 * Перегруппировка секций сметы «категория → помещения» в «помещение → категории»:
 * помещения разных категорий с одинаковым названием склеиваются в одно, внутри —
 * блоки по категориям в порядке исходных секций. Итог помещения — сумма по категориям.
 */
export function buildEstimateRoomSections(sections: EstimateEmbedSection[]): EstimateRoomSection[] {
  const order: string[] = [];
  const byKey = new Map<string, EstimateRoomSection>();
  for (const section of sections) {
    for (const room of section.rooms) {
      const roomName = room.name.trim() || 'Помещение';
      const key = roomName.toLowerCase();
      let target = byKey.get(key);
      if (!target) {
        target = { roomName, total: 0, categories: [] };
        byKey.set(key, target);
        order.push(key);
      }
      target.total += room.total;
      target.categories.push({ categoryName: section.categoryName, room });
    }
  }
  return order.map((key) => byKey.get(key)!);
}

function normalizeEstimatePreviewGroupMode(raw: string | null): EstimatePreviewGroupMode | null {
  return raw === 'byRooms' || raw === 'byCategories' ? raw : null;
}

/**
 * Смена варианта отображения: `scope: null` — общая настройка (раздел «Расчёты»),
 * `scope: '<packageId>'` — настройка конкретного договора.
 */
type EstimatePreviewGroupModeChangeDetail = {
  scope: string | null;
  mode: EstimatePreviewGroupMode;
};

function packageScopeStorageKey(packageId: string): string {
  return `${ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY}.pkg:${packageId}`;
}

/** Выбранный менеджером вариант отображения (по умолчанию — первично по помещениям). */
export function readStoredEstimatePreviewGroupMode(): EstimatePreviewGroupMode {
  if (typeof window === 'undefined') return DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE;
  try {
    const stored = normalizeEstimatePreviewGroupMode(
      window.localStorage.getItem(ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY)
    );
    return stored ?? DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE;
  } catch {
    return DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE;
  }
}

export function storeEstimatePreviewGroupMode(mode: EstimatePreviewGroupMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY, mode);
  } catch {
    // квота / приватный режим
  }
  dispatchGroupModeChange({ scope: null, mode });
}

/**
 * Вариант отображения конкретного договора: своя настройка пакета, иначе общая (раздел «Расчёты»).
 * Переключение в одном договоре не меняет вид в других договорах и предпросмотрах расчётов.
 */
export function readStoredPackageEstimatePreviewGroupMode(
  packageId: string
): EstimatePreviewGroupMode {
  if (typeof window === 'undefined') return readStoredEstimatePreviewGroupMode();
  try {
    const scoped = normalizeEstimatePreviewGroupMode(
      window.localStorage.getItem(packageScopeStorageKey(packageId))
    );
    return scoped ?? readStoredEstimatePreviewGroupMode();
  } catch {
    return readStoredEstimatePreviewGroupMode();
  }
}

export function storePackageEstimatePreviewGroupMode(
  packageId: string,
  mode: EstimatePreviewGroupMode
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(packageScopeStorageKey(packageId), mode);
  } catch {
    // квота / приватный режим
  }
  dispatchGroupModeChange({ scope: packageId, mode });
}

/**
 * Зафиксировать вариант отображения подписанного договора: если своей настройки нет,
 * текущий вариант (в т.ч. унаследованный от общей) записывается как настройка договора —
 * смета/счёт-заказ, их печать и документы перестают следить за общей настройкой раздела
 * «Расчёты». Своя настройка договора не перезаписывается. События не рассылает: вариант не меняется.
 */
export function pinPackageEstimatePreviewGroupMode(packageId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = packageScopeStorageKey(packageId);
    if (normalizeEstimatePreviewGroupMode(window.localStorage.getItem(key))) return;
    window.localStorage.setItem(key, readStoredEstimatePreviewGroupMode());
  } catch {
    // квота / приватный режим
  }
}

function dispatchGroupModeChange(detail: EstimatePreviewGroupModeChangeDetail): void {
  window.dispatchEvent(
    new CustomEvent<EstimatePreviewGroupModeChangeDetail>(
      ESTIMATE_PREVIEW_GROUP_MODE_CHANGE_EVENT,
      { detail }
    )
  );
}

function isOwnStorageKey(key: string | null): boolean {
  return (
    key === ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY ||
    (key != null && key.startsWith(`${ESTIMATE_PREVIEW_GROUP_MODE_STORAGE_KEY}.pkg:`))
  );
}

/**
 * Подписка на смену варианта отображения (общая настройка — раздел «Расчёты»):
 * локальное событие (тот же экран) и «storage» (другая вкладка браузера).
 * Смены в конкретных договорах игнорируются. Возвращает функцию отписки.
 */
export function subscribeEstimatePreviewGroupMode(
  listener: (mode: EstimatePreviewGroupMode) => void
): () => void {
  return subscribeGroupModeChanges(null, listener);
}

/**
 * Подписка на смену варианта отображения конкретного договора: реагирует на свою настройку
 * и на общую (договор без своей настройки наследует её). Возвращает функцию отписки.
 */
export function subscribePackageEstimatePreviewGroupMode(
  packageId: string,
  listener: (mode: EstimatePreviewGroupMode) => void
): () => void {
  return subscribeGroupModeChanges(packageId, listener);
}

function subscribeGroupModeChanges(
  scope: string | null,
  listener: (mode: EstimatePreviewGroupMode) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const readOwn = (): EstimatePreviewGroupMode =>
    scope == null
      ? readStoredEstimatePreviewGroupMode()
      : readStoredPackageEstimatePreviewGroupMode(scope);
  // Повторные значения (например, глобальная смена при своей настройке договора) не проходят.
  let last = readOwn();
  const emit = (mode: EstimatePreviewGroupMode): void => {
    if (mode === last) return;
    last = mode;
    listener(mode);
  };
  const onLocalChange = (e: Event): void => {
    const detail = (e as CustomEvent<EstimatePreviewGroupModeChangeDetail>).detail;
    if (!detail) {
      emit(readOwn());
      return;
    }
    if (detail.scope === scope) {
      emit(detail.mode);
      return;
    }
    // Общая смена (scope null) меняет договор только без собственной настройки.
    if (scope != null && detail.scope === null) emit(readOwn());
  };
  const onStorageChange = (e: StorageEvent): void => {
    if (e.key === null || isOwnStorageKey(e.key)) emit(readOwn());
  };
  window.addEventListener(ESTIMATE_PREVIEW_GROUP_MODE_CHANGE_EVENT, onLocalChange);
  window.addEventListener('storage', onStorageChange);
  return () => {
    window.removeEventListener(ESTIMATE_PREVIEW_GROUP_MODE_CHANGE_EVENT, onLocalChange);
    window.removeEventListener('storage', onStorageChange);
  };
}
