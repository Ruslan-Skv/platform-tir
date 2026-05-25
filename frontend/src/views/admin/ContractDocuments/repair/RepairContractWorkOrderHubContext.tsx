'use client';

import { type ReactNode, createContext, useContext } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';

import type { RepairDocumentTabId } from './repairDocumentTabs';
import type { RepairPackageFormData } from './repairPackageForm';
import type { RepairWorkOrderHubTabId } from './repairWorkOrderHubTabs';

export type RepairContractPerInstallerWorkOrder = {
  installer: InstallerMaster;
  total: number;
  categories: Array<{
    categoryName: string;
    rooms: Array<{
      name: string;
      adjustedTotal: number;
      lines: Array<{
        key: string;
        workName: string;
        quantity: number;
        unit: string;
        adjustedAmount: number;
      }>;
    }>;
  }>;
};

export type RepairContractWorkOrderHubContextValue = {
  form: RepairPackageFormData;
  formMergedForTemplate: RepairPackageFormData;
  updateWorkOrder: <K extends keyof RepairPackageFormData['workOrder']>(
    key: K,
    value: RepairPackageFormData['workOrder'][K]
  ) => void;
  getTemplatePreviewHtml: (tab: RepairDocumentTabId) => string;
  repairInstallers: InstallerMaster[];
  selectedRepairInstallers: InstallerMaster[];
  selectedRepairInstallersById: Map<string, InstallerMaster>;
  activeRepairInstallerId: string;
  addRepairInstallerToContract: (installerId: string) => void;
  removeRepairInstallerFromContract: (installerId: string) => void;
  setActiveRepairInstallerId: (installerId: string) => void;
  activateOrToggleRepairInstaller: (installerId: string) => void;
  assignInstallerToFinalEstimateRow: (rowKey: string, installerId: string) => void;
  assignInstallerToFinalEstimateRows: (rowKeys: string[], installerId: string) => void;
  interactiveFinalEstimateSections: Array<{
    categoryName: string;
    rooms: Array<{
      name: string;
      lines: Array<{
        key: string;
        workName: string;
        quantity: number;
        installerId: string;
      }>;
    }>;
  }>;
  unassignedInteractiveRowsCount: number;
  activeFinalWorkOrderDocId: string;
  setActiveFinalWorkOrderDocId: (id: string) => void;
  finalWorkOrderComputed: {
    rooms: Array<{ name: string; adjustedTotal: number; lines: unknown[] }>;
    total: number;
    installerTotals: Array<{
      installer: InstallerMaster;
      total: number;
      lineCount: number;
    }>;
  };
  finalWorkOrderCategorySections: Array<{
    categoryName: string;
    rooms: Array<{
      name: string;
      adjustedTotal: number;
      lines: Array<{
        workName: string;
        quantity: number;
        unit: string;
        adjustedAmount: number;
      }>;
    }>;
  }>;
  perInstallerWorkOrders: RepairContractPerInstallerWorkOrder[];
  activeInstallerWorkOrder: RepairContractPerInstallerWorkOrder | null;
  estimateAppendixContractRef: { num: string; date: string };
  formatMoneyValue: (n: number) => string;
  formatMoneyRubShort: (n: number) => string;
  formatInstallerNameShort: (name: string) => string;
  formatInstallerGradeShort: (grade: string | null | undefined) => string;
};

const RepairContractWorkOrderHubContext =
  createContext<RepairContractWorkOrderHubContextValue | null>(null);

export function RepairContractWorkOrderHubProvider({
  value,
  children,
}: {
  value: RepairContractWorkOrderHubContextValue;
  children: ReactNode;
}) {
  return (
    <RepairContractWorkOrderHubContext.Provider value={value}>
      {children}
    </RepairContractWorkOrderHubContext.Provider>
  );
}

export function useRepairContractWorkOrderHub(): RepairContractWorkOrderHubContextValue {
  const ctx = useContext(RepairContractWorkOrderHubContext);
  if (!ctx) {
    throw new Error('useRepairContractWorkOrderHub requires RepairContractWorkOrderHubProvider');
  }
  return ctx;
}

export type { RepairWorkOrderHubTabId };
