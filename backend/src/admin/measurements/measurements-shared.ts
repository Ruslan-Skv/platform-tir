import { Prisma } from '@prisma/client';

export const MEASUREMENT_SNAPSHOT_FIELDS = {
  managerId: true,
  receptionDate: true,
  executionDate: true,
  surveyorId: true,
  directionId: true,
  customerName: true,
  customerAddress: true,
  customerPhone: true,
  comments: true,
  status: true,
  customerId: true,
} as const;

export const MEASUREMENT_RELATIONS_INCLUDE = {
  manager: { select: { id: true, firstName: true, lastName: true } },
  surveyor: { select: { id: true, firstName: true, lastName: true } },
  direction: { select: { id: true, name: true, slug: true } },
  additionalDirections: {
    orderBy: { sortOrder: 'asc' as const },
    include: { direction: { select: { id: true, name: true, slug: true } } },
  },
} as const;

export type MeasurementWithRelations = Prisma.MeasurementGetPayload<{
  include: typeof MEASUREMENT_RELATIONS_INCLUDE;
}>;

const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';
const MEASUREMENT_SAVED_TABS_MARKER = '[MEASUREMENT_SAVED_TABS_V1]';

type ParsedMeasurementData = {
  rooms: Array<{
    id?: string;
    name?: string;
    ceilingHeight?: string;
    wallThickness?: string;
    slopeThickness?: string;
    floorArea?: string;
    wallSegments?: string[];
    doors?: Array<{ width?: string; height?: string }>;
    windows?: Array<{ width?: string; height?: string }>;
    selectedWorkItemIds?: string[];
    workItemQuantities?: Record<string, string>;
    notes?: string;
  }>;
};

export function normalizeAdditionalDirectionIds(
  primaryDirectionId: string | null | undefined,
  ids?: string[],
): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed || trimmed === primaryDirectionId || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function additionalDirectionIdsFromLinks(links: { directionId: string }[]): string[] {
  return links.map((x) => x.directionId);
}

export function formatMeasurementResponse(m: MeasurementWithRelations) {
  const additionalDirectionIds = additionalDirectionIdsFromLinks(m.additionalDirections);
  const additionalDirections = m.additionalDirections.map((x) => x.direction);
  return { ...m, additionalDirectionIds, additionalDirections };
}

export function buildSnapshot(
  row: Prisma.MeasurementGetPayload<{
    select: typeof MEASUREMENT_SNAPSHOT_FIELDS;
  }> & { additionalDirections?: { directionId: string }[] },
) {
  return {
    ...row,
    receptionDate: row.receptionDate.toISOString().slice(0, 10),
    executionDate: row.executionDate ? row.executionDate.toISOString().slice(0, 10) : null,
    additionalDirectionIds: additionalDirectionIdsFromLinks(row.additionalDirections ?? []),
  };
}

function parseMeasurementDataFromComments(
  value: string | null | undefined,
): ParsedMeasurementData | null {
  if (!value) return null;
  const idx = value.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (idx < 0) return null;
  const raw = value.slice(idx + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(raw) as ParsedMeasurementData;
    if (!parsed || !Array.isArray(parsed.rooms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hasRoomGeometry(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  if ((room.ceilingHeight ?? '').trim() !== '') return true;
  if ((room.wallThickness ?? '').trim() !== '') return true;
  if ((room.slopeThickness ?? '').trim() !== '') return true;
  if ((room.floorArea ?? '').trim() !== '') return true;
  if ((room.wallSegments ?? []).some((x) => (x ?? '').trim() !== '')) return true;
  if (
    (room.doors ?? []).some((d) => (d.width ?? '').trim() !== '' || (d.height ?? '').trim() !== '')
  )
    return true;
  if (
    (room.windows ?? []).some(
      (w) => (w.width ?? '').trim() !== '' || (w.height ?? '').trim() !== '',
    )
  )
    return true;
  return false;
}

function hasRoomWorks(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  return (room.selectedWorkItemIds?.length ?? 0) > 0;
}

function hasRoomWorkQuantities(room: NonNullable<ParsedMeasurementData>['rooms'][number]): boolean {
  return Object.values(room.workItemQuantities ?? {}).some((x) => (x ?? '').trim() !== '');
}

function extractSavedTabsFromComments(value: string | null | undefined): Record<string, boolean> {
  if (!value) return {};
  const idx = value.indexOf(MEASUREMENT_SAVED_TABS_MARKER);
  if (idx < 0) return {};
  const after = value.slice(idx + MEASUREMENT_SAVED_TABS_MARKER.length).trimStart();
  if (!after.startsWith('{')) return {};
  let depth = 0;
  let end = 0;
  for (let i = 0; i < after.length; i += 1) {
    const char = after[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end <= 0) return {};
  try {
    const parsed = JSON.parse(after.slice(0, end)) as Record<string, boolean>;
    return Object.fromEntries(Object.entries(parsed).filter(([, flag]) => Boolean(flag)));
  } catch {
    return {};
  }
}

function buildSavedTabsMoments(
  previousComments: string | null,
  nextComments: string | null,
): string[] {
  const prev = extractSavedTabsFromComments(previousComments);
  const next = extractSavedTabsFromComments(nextComments);
  const moments: string[] = [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (next[key] && !prev[key]) moments.push(`measurementTabSaved:${key}`);
    if (!next[key] && prev[key]) moments.push(`measurementTabUnsaved:${key}`);
  }
  return moments;
}

function stripMeasurementMarkers(comments: string | null | undefined): string {
  if (!comments) return '';
  let text = comments;
  for (const marker of [MEASUREMENT_SAVED_TABS_MARKER, REPAIR_MEASUREMENT_DATA_MARKER]) {
    const idx = text.indexOf(marker);
    if (idx >= 0) text = text.slice(0, idx);
  }
  return text.trim();
}

export function buildMeasurementKeyMoments(
  previousComments: string | null,
  nextComments: string | null,
): string[] {
  const prev = parseMeasurementDataFromComments(previousComments);
  const next = parseMeasurementDataFromComments(nextComments);
  const moments: string[] = [];

  moments.push(...buildSavedTabsMoments(previousComments, nextComments));

  if (stripMeasurementMarkers(previousComments) !== stripMeasurementMarkers(nextComments)) {
    moments.push('measurementNoteUpdated');
  }

  if (!next) return moments;

  const prevRooms = prev?.rooms ?? [];
  const nextRooms = next.rooms ?? [];
  if (nextRooms.length !== prevRooms.length) moments.push('measurementRoomsUpdated');

  let geometryChanged = false;
  let worksChanged = false;
  let quantitiesChanged = false;

  for (let i = 0; i < Math.max(prevRooms.length, nextRooms.length); i++) {
    const a = prevRooms[i];
    const b = nextRooms[i];
    if (!b) continue;
    if (!a) {
      if (hasRoomGeometry(b)) geometryChanged = true;
      if (hasRoomWorks(b)) worksChanged = true;
      if (hasRoomWorkQuantities(b)) quantitiesChanged = true;
      continue;
    }

    const prevGeometry = JSON.stringify({
      ceilingHeight: a.ceilingHeight ?? '',
      wallThickness: a.wallThickness ?? '',
      slopeThickness: a.slopeThickness ?? '',
      floorArea: a.floorArea ?? '',
      wallSegments: a.wallSegments ?? [],
      doors: a.doors ?? [],
      windows: a.windows ?? [],
    });
    const nextGeometry = JSON.stringify({
      ceilingHeight: b.ceilingHeight ?? '',
      wallThickness: b.wallThickness ?? '',
      slopeThickness: b.slopeThickness ?? '',
      floorArea: b.floorArea ?? '',
      wallSegments: b.wallSegments ?? [],
      doors: b.doors ?? [],
      windows: b.windows ?? [],
    });
    if (prevGeometry !== nextGeometry) geometryChanged = true;

    const prevWorks = JSON.stringify([...(a.selectedWorkItemIds ?? [])].sort());
    const nextWorks = JSON.stringify([...(b.selectedWorkItemIds ?? [])].sort());
    if (prevWorks !== nextWorks) worksChanged = true;

    const prevQty = JSON.stringify(a.workItemQuantities ?? {});
    const nextQty = JSON.stringify(b.workItemQuantities ?? {});
    if (prevQty !== nextQty) quantitiesChanged = true;
  }

  if (geometryChanged) moments.push('measurementGeometryUpdated');
  if (worksChanged) moments.push('measurementWorksUpdated');
  if (quantitiesChanged) moments.push('measurementWorkQuantitiesUpdated');
  return moments;
}
