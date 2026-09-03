import {
  buildDraftWithRoomNames,
  calculatorDraftStorageKey,
  extractRoomNamesFromDraft,
  mergeRoomStructureIntoDraft,
  shouldAutofillTargetRooms,
} from './estimateWorkspaceUtils';

function roomNamesQuality(names: string[]): number {
  if (names.length === 0) return 0;
  let score = names.length * 10;
  for (const name of names) {
    const n = name.trim().toLowerCase();
    if (!n || n === 'помещение' || /^помещение\s*\d*$/i.test(n)) {
      score -= 5;
    } else {
      score += 2;
    }
  }
  return score;
}

/** Лучший набор имён помещений среди черновиков выбранных категорий. */
function resolveSharedRoomNames(preferredSlug: string, categorySlugs: string[]): string[] {
  let bestNames: string[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  const consider = (slug: string) => {
    if (!slug) return;
    const draft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
    const names = extractRoomNamesFromDraft(draft);
    const score = roomNamesQuality(names) + (slug === preferredSlug ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestNames = names;
    }
  };

  consider(preferredSlug);
  for (const slug of categorySlugs) {
    if (slug === preferredSlug) continue;
    consider(slug);
  }

  return bestNames.filter((n) => n.trim().length > 0);
}

/**
 * Перед переключением вкладки категории копирует структуру помещений
 * во все остальные выбранные категории (пустые — заполняет, остальные — дополняет).
 */
export function syncRoomsForCategorySwitch(
  fromSlug: string,
  toSlug: string,
  categorySlugs: string[]
): void {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return;
  const roomNames = resolveSharedRoomNames(fromSlug, categorySlugs);
  if (roomNames.length === 0) return;

  const targets = new Set(categorySlugs.filter((slug) => slug && slug !== fromSlug));
  targets.add(toSlug);

  for (const slug of targets) {
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
}
