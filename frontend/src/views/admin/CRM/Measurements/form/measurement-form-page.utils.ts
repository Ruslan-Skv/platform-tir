import {
  MEASUREMENT_RESULT_TABS,
  type MeasurementResultTabId,
} from '../shared/measurementResultTabs';
import {
  MAX_ROOMS_COUNT,
  MEASUREMENT_SAVED_TABS_MARKER,
  REPAIR_MEASUREMENT_DATA_MARKER,
} from './measurement-form-page.constants';
import type {
  AutoQuantityMetrics,
  RepairMeasurementData,
  RepairMeasurementRoom,
  ServiceCatalogCategory,
  ServiceCatalogItem,
  WorkCategoryGroup,
} from './measurement-form-page.types';

export function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toISOString().slice(0, 10);
}

/** Проверка формата телефона: минимум 10 цифр (российский номер) */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

export function parseNumber(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formatMetric(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function buildDefaultRoom(index: number): RepairMeasurementRoom {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Помещение ${index + 1}`,
    ceilingHeight: '',
    wallThickness: '',
    slopeThickness: '',
    floorArea: '',
    wallSegments: [''],
    doors: [],
    windows: [],
    selectedWorkItemIds: [],
    workItemQuantities: {},
    notes: '',
  };
}

export function buildDefaultRepairMeasurementData(): RepairMeasurementData {
  return {
    rooms: [buildDefaultRoom(0)],
  };
}

export function commentsIncludeRepairResults(commentsValue: string | null | undefined): boolean {
  return (commentsValue ?? '').includes(REPAIR_MEASUREMENT_DATA_MARKER);
}

export function commentsIncludeSavedTabs(commentsValue: string | null | undefined): boolean {
  return (commentsValue ?? '').includes(MEASUREMENT_SAVED_TABS_MARKER);
}

export function extractSavedTabsFromComments(source: string): {
  textWithoutSavedMarker: string;
  savedTabs: Set<MeasurementResultTabId>;
} {
  const markerIndex = source.indexOf(MEASUREMENT_SAVED_TABS_MARKER);
  if (markerIndex < 0) {
    return { textWithoutSavedMarker: source, savedTabs: new Set() };
  }
  const before = source.slice(0, markerIndex).trimEnd();
  let after = source.slice(markerIndex + MEASUREMENT_SAVED_TABS_MARKER.length).trimStart();
  const savedTabs = new Set<MeasurementResultTabId>();
  if (after.startsWith('{')) {
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
    if (end > 0) {
      try {
        const parsed = JSON.parse(after.slice(0, end)) as Partial<
          Record<MeasurementResultTabId, boolean>
        >;
        for (const tab of MEASUREMENT_RESULT_TABS) {
          if (parsed[tab.id]) savedTabs.add(tab.id);
        }
      } catch {
        /* ignore malformed saved tabs payload */
      }
      after = after.slice(end).trimStart();
    }
  }
  const textWithoutSavedMarker = [before, after].filter(Boolean).join('\n\n').trim();
  return { textWithoutSavedMarker, savedTabs };
}

export function buildMeasurementComments(
  cleanComment: string,
  savedTabs: Set<MeasurementResultTabId>,
  repairData: RepairMeasurementData | null
): string {
  const blocks: string[] = [];
  const trimmedComment = cleanComment.trim();
  if (trimmedComment) blocks.push(trimmedComment);
  if (savedTabs.size > 0) {
    const payload = Object.fromEntries(
      MEASUREMENT_RESULT_TABS.map((tab) => [tab.id, savedTabs.has(tab.id)])
    );
    blocks.push(`${MEASUREMENT_SAVED_TABS_MARKER}${JSON.stringify(payload)}`);
  }
  if (repairData) {
    blocks.push(`${REPAIR_MEASUREMENT_DATA_MARKER}${JSON.stringify(repairData)}`);
  }
  return blocks.join('\n\n');
}

export function parseRepairMeasurementDataFromComments(commentsValue: string | null | undefined): {
  cleanComment: string;
  data: RepairMeasurementData;
} {
  const source = commentsValue ?? '';
  const markerIndex = source.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (markerIndex < 0) {
    return { cleanComment: source, data: buildDefaultRepairMeasurementData() };
  }
  const cleanComment = source.slice(0, markerIndex).trim();
  const jsonRaw = source.slice(markerIndex + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(jsonRaw) as Partial<RepairMeasurementData>;
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    const normalizedRooms = rooms
      .filter((room) => room && typeof room === 'object')
      .slice(0, MAX_ROOMS_COUNT)
      .map((room, index): RepairMeasurementRoom => {
        const r = room as Partial<RepairMeasurementRoom>;
        return {
          id: typeof r.id === 'string' && r.id.trim() ? r.id : buildDefaultRoom(index).id,
          name: typeof r.name === 'string' && r.name.trim() ? r.name : `Помещение ${index + 1}`,
          ceilingHeight: typeof r.ceilingHeight === 'string' ? r.ceilingHeight : '',
          wallThickness: typeof r.wallThickness === 'string' ? r.wallThickness : '',
          slopeThickness: typeof r.slopeThickness === 'string' ? r.slopeThickness : '',
          floorArea: typeof r.floorArea === 'string' ? r.floorArea : '',
          wallSegments: Array.isArray(r.wallSegments)
            ? r.wallSegments.filter((x): x is string => typeof x === 'string')
            : [''],
          doors: Array.isArray(r.doors)
            ? r.doors.map((d, dIndex) => ({
                id: typeof d?.id === 'string' && d.id.trim() ? d.id : `${index}-door-${dIndex}`,
                width: typeof d?.width === 'string' ? d.width : '',
                height: typeof d?.height === 'string' ? d.height : '',
              }))
            : [],
          windows: Array.isArray(r.windows)
            ? r.windows.map((w, wIndex) => ({
                id: typeof w?.id === 'string' && w.id.trim() ? w.id : `${index}-window-${wIndex}`,
                width: typeof w?.width === 'string' ? w.width : '',
                height: typeof w?.height === 'string' ? w.height : '',
              }))
            : [],
          selectedWorkItemIds: Array.isArray(r.selectedWorkItemIds)
            ? r.selectedWorkItemIds.filter((x): x is string => typeof x === 'string')
            : [],
          workItemQuantities:
            r.workItemQuantities && typeof r.workItemQuantities === 'object'
              ? Object.fromEntries(
                  Object.entries(r.workItemQuantities).filter(
                    ([k, v]) => typeof k === 'string' && typeof v === 'string'
                  )
                )
              : {},
          notes: typeof r.notes === 'string' ? r.notes : '',
        };
      });
    return {
      cleanComment,
      data: { rooms: normalizedRooms.length > 0 ? normalizedRooms : [buildDefaultRoom(0)] },
    };
  } catch {
    return { cleanComment: source, data: buildDefaultRepairMeasurementData() };
  }
}

export function collectWorkCategories(categories: ServiceCatalogCategory[]): WorkCategoryGroup[] {
  const grouped = new Map<string, { name: string; items: ServiceCatalogItem[] }>();
  const descendantIds = new Set<string>();
  const collectDescendantIds = (nodes: ServiceCatalogCategory[]) => {
    for (const node of nodes) {
      if (Array.isArray(node.children) && node.children.length > 0) {
        for (const child of node.children) {
          descendantIds.add(child.id);
        }
        collectDescendantIds(node.children);
      }
    }
  };
  collectDescendantIds(categories);

  const rootNodes = categories.filter((category) => !descendantIds.has(category.id));
  const walk = (
    nodes: ServiceCatalogCategory[],
    rootCategory: { id: string; name: string } | null
  ) => {
    for (const category of nodes) {
      const root = rootCategory ?? { id: category.id, name: category.name };
      const rawItems = Array.isArray(category.items) ? category.items : [];
      if (rawItems.length > 0) {
        const bucket = grouped.get(root.id) ?? { name: root.name, items: [] };
        bucket.items.push(...rawItems.map((item) => ({ id: item.id, name: item.name })));
        grouped.set(root.id, bucket);
      }
      if (Array.isArray(category.children) && category.children.length > 0) {
        walk(category.children, root);
      }
    }
  };
  walk(rootNodes, null);

  return [...grouped.entries()].map(([id, group]) => ({
    id,
    name: group.name,
    items: [...new Map(group.items.map((item) => [item.id, item])).values()],
  }));
}

export function isMeasurementResultTabFilled(
  tabId: MeasurementResultTabId,
  rooms: RepairMeasurementRoom[]
): boolean {
  if (tabId === 'repair') return rooms.some((room) => isRoomFilled(room));
  return false;
}

export function isRoomFilled(room: RepairMeasurementRoom): boolean {
  if (room.name.trim() !== '' && !/^Помещение\s+\d+$/i.test(room.name.trim())) return true;
  if (room.ceilingHeight.trim() !== '') return true;
  if (room.wallThickness.trim() !== '') return true;
  if (room.slopeThickness.trim() !== '') return true;
  if (room.floorArea.trim() !== '') return true;
  if (room.notes.trim() !== '') return true;
  if (room.selectedWorkItemIds.length > 0) return true;
  if (Object.keys(room.workItemQuantities).length > 0) return true;
  if (room.wallSegments.some((segment) => segment.trim() !== '')) return true;
  if (room.doors.some((door) => door.width.trim() !== '' || door.height.trim() !== '')) return true;
  if (room.windows.some((window) => window.width.trim() !== '' || window.height.trim() !== ''))
    return true;
  return false;
}

export function cloneRoomWithOnlyWorks(
  room: RepairMeasurementRoom,
  index: number
): RepairMeasurementRoom {
  const defaultRoom = buildDefaultRoom(index);
  return {
    ...defaultRoom,
    name: `${room.name.trim() || `Помещение ${index + 1}`} (копия)`,
    selectedWorkItemIds: [...room.selectedWorkItemIds],
    workItemQuantities: {},
  };
}
export function resolveAutoQuantity(itemName: string, metrics: AutoQuantityMetrics): number | null {
  const n = itemName.toLowerCase();
  if (n.includes('плинтус')) return metrics.baseboardPerimeter;
  if (n.includes('периметр')) return metrics.perimeter;
  if (n.includes('пол') || n.includes('стяжк') || n.includes('ламинат') || n.includes('плитк')) {
    return metrics.floorArea;
  }
  if (n.includes('потол')) return metrics.floorArea;
  if (n.includes('стен')) return metrics.netWallArea;
  if (n.includes('двер')) return metrics.doorsArea;
  if (n.includes('окн')) return metrics.windowsArea;
  return null;
}
