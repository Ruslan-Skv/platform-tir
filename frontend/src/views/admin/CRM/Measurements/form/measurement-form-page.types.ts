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
