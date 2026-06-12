import type { MeasurementResultTabId } from './measurementResultTabs';

export interface OpeningDimensions {
  id: string;
  width: string;
  height: string;
}

export interface RepairMeasurementRoom {
  id: string;
  name: string;
  ceilingHeight: string;
  wallThickness: string;
  slopeThickness: string;
  floorArea: string;
  wallSegments: string[];
  doors: OpeningDimensions[];
  windows: OpeningDimensions[];
  selectedWorkItemIds: string[];
  workItemQuantities: Record<string, string>;
  notes: string;
}

export interface RepairMeasurementData {
  rooms: RepairMeasurementRoom[];
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
}

export interface ServiceCatalogCategory {
  id: string;
  name: string;
  items?: ServiceCatalogItem[];
  children?: ServiceCatalogCategory[];
}

export interface WorkCategoryGroup {
  id: string;
  name: string;
  items: ServiceCatalogItem[];
}

export type AutoQuantityMetrics = {
  floorArea: number;
  perimeter: number;
  baseboardPerimeter: number;
  grossWallArea: number;
  netWallArea: number;
  doorsArea: number;
  windowsArea: number;
};

function resolveAutoQuantity(itemName: string, metrics: AutoQuantityMetrics): number | null {
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

export type FieldKey =
  | 'managerId'
  | 'receptionDate'
  | 'executionDate'
  | 'directionId'
  | 'customerName'
  | 'customerPhone'
  | 'customerAddress';

export interface MeasurementFormPageProps {
  measurementId?: string | null;
}
