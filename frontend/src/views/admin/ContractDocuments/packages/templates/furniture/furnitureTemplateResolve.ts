import type { FurnitureActiveDocLeg } from '../../directions/furniture/furnitureLegs';
import type { PackageDocumentTemplateTabId } from '../../platform/form/formDataTemplateStorage';
import type { PackageLibraryTemplateTabId } from '../../platform/tabs/packageLibraryTemplateTabs';
import { packageTemplateCashOrder } from '../cashOrder';
import { furnitureTemplateActAcceptance } from './furnitureTemplateActAcceptance';
import { furnitureTemplateActReadyForMontage } from './furnitureTemplateActReadyForMontage';
import { furnitureTemplateAppliancesActAcceptance } from './furnitureTemplateAppliancesActAcceptance';
import { furnitureTemplateAppliancesContract } from './furnitureTemplateAppliancesContract';
import { furnitureTemplateContract } from './furnitureTemplateContract';
import { furnitureTemplateMemo } from './furnitureTemplateMemo';
import { furnitureTemplateMontageActAcceptance } from './furnitureTemplateMontageActAcceptance';
import { furnitureTemplateMontageContract } from './furnitureTemplateMontageContract';
import { furnitureTemplateWorkOrder } from './furnitureTemplateWorkOrder';

const FURNITURE_PKO_TITLE: Record<FurnitureActiveDocLeg, string> = {
  manufacture: 'ПКО',
  montage: 'ПКО-М',
  appliances: 'ПКО-Т',
};

function furnitureCashOrderHtml(activeDocLeg: FurnitureActiveDocLeg): string {
  const title = FURNITURE_PKO_TITLE[activeDocLeg];
  return packageTemplateCashOrder.replace(
    '<h1>Приходный кассовый ордер</h1>',
    `<h1>Приходный кассовый ордер (${title})</h1>`
  );
}

/** Выбор HTML шаблона «Мебель» с учётом активной ноги документов. */
export function furnitureDocumentTemplateHtml(
  tab: PackageDocumentTemplateTabId | PackageLibraryTemplateTabId,
  activeDocLeg: FurnitureActiveDocLeg = 'manufacture'
): string | null {
  if (tab === 'memo') return furnitureTemplateMemo;
  if (tab === 'actStart') return furnitureTemplateActReadyForMontage;
  if (tab === 'workOrder') return furnitureTemplateWorkOrder;
  if (tab === 'cashOrder') return furnitureCashOrderHtml(activeDocLeg);

  if (activeDocLeg === 'montage') {
    if (tab === 'contract') return furnitureTemplateMontageContract;
    if (tab === 'actAcceptance') return furnitureTemplateMontageActAcceptance;
  } else if (activeDocLeg === 'appliances') {
    if (tab === 'contract') return furnitureTemplateAppliancesContract;
    if (tab === 'actAcceptance') return furnitureTemplateAppliancesActAcceptance;
  } else {
    if (tab === 'contract') return furnitureTemplateContract;
    if (tab === 'actAcceptance') return furnitureTemplateActAcceptance;
  }
  return null;
}

export { furnitureTemplateActAcceptance, furnitureTemplateContract, furnitureTemplateMemo };
