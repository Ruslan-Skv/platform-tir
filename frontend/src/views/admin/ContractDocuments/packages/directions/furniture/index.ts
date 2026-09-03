/** Направление «Мебель» — семейство FURNITURE_LIKE (до трёх договоров в одном пакете). */
export {
  FURNITURE_LEG_LABEL,
  FURNITURE_LEG_NUMBER_LETTER,
  defaultFurniturePackageBlock,
  furnitureEnabledContractNumbers,
  normalizeFurniturePackageBlock,
  type FurnitureActiveDocLeg,
  type FurnitureAppliancesDocs,
  type FurnitureAppliancesLine,
  type FurnitureLegContractBlock,
  type FurnitureLegExecutorBlock,
  type FurnitureManufactureDocs,
  type FurnitureMaterialLine,
  type FurnitureMontageDocs,
  type FurniturePackageBlock,
  type FurniturePackageLeg,
  type FurniturePackageLegId,
  type FurnitureSpecificationLine,
} from './furnitureLegs';

export { PackageDataFurnitureLegsSection } from './PackageDataFurnitureLegsSection';
export { FurnitureSpecificationTabContent } from './FurnitureSpecificationTabContent';
export { FurnitureMontageEstimateTabContent } from './FurnitureMontageEstimateTabContent';
export { FurnitureAppliancesListTabContent } from './FurnitureAppliancesListTabContent';
export { FurnitureWorkOrderTabContent } from './FurnitureWorkOrderTabContent';
export { FurnitureDocLegSwitcher } from './FurnitureDocLegSwitcher';
