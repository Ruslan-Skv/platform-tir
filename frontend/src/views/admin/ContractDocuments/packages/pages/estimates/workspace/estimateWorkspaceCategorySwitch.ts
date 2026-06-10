import {
  buildDraftWithRoomNames,
  calculatorDraftStorageKey,
  extractRoomNamesFromDraft,
  mergeRoomStructureIntoDraft,
  shouldAutofillTargetRooms,
} from './estimateWorkspaceUtils';

export function syncRoomsForCategorySwitch(
  fromSlug: string,
  toSlug: string,
  categorySlugs: string[]
): void {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return;
  const sourceDraft = window.localStorage.getItem(calculatorDraftStorageKey(fromSlug));
  const roomNames = extractRoomNamesFromDraft(sourceDraft);
  if (roomNames.length === 0) return;
  for (const slug of categorySlugs) {
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
