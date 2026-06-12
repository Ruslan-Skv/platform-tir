'use client';

import { type ReactNode, createContext, useContext } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import type { PackageFormData } from '../../form/packageForm';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import type { PackageWorkOrderHubTabId } from './packageWorkOrderHubTabs';

export type PackagePerInstallerWorkOrder = {
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

export type PackageWorkOrderHubContextValue = {
  packageKind: ContractDocumentPackageKind;
  isWindowsPackage: boolean;
  windowsWorkOrderMarkupPercent: number;
  form: PackageFormData;
  updateWorkOrder: <K extends keyof PackageFormData['workOrder']>(
    key: K,
    value: PackageFormData['workOrder'][K]
  ) => void;
  getTemplatePreviewHtml: (tab: PackageDocumentTabId) => string;
  contractInstallers: InstallerMaster[];
  selectedInstallers: InstallerMaster[];
  selectedInstallersById: Map<string, InstallerMaster>;
  activeInstallerId: string;
  addInstallerToContract: (installerId: string) => void;
  removeInstallerFromContract: (installerId: string) => void;
  setActiveInstallerId: (installerId: string) => void;
  activateOrToggleInstaller: (installerId: string) => void;
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
  perInstallerWorkOrders: PackagePerInstallerWorkOrder[];
  activeInstallerWorkOrder: PackagePerInstallerWorkOrder | null;
  estimateAppendixContractRef: { num: string; date: string };
  formatMoneyValue: (n: number) => string;
  formatMoneyRubShort: (n: number) => string;
  formatInstallerNameShort: (name: string) => string;
  formatInstallerGradeShort: (grade: string | null | undefined) => string;
};

const PackageWorkOrderHubContext = createContext<PackageWorkOrderHubContextValue | null>(null);

export function PackageWorkOrderHubProvider({
  value,
  children,
}: {
  value: PackageWorkOrderHubContextValue;
  children: ReactNode;
}) {
  return (
    <PackageWorkOrderHubContext.Provider value={value}>
      {children}
    </PackageWorkOrderHubContext.Provider>
  );
}

export function usePackageWorkOrderHub(): PackageWorkOrderHubContextValue {
  const ctx = useContext(PackageWorkOrderHubContext);
  if (!ctx) {
    throw new Error('usePackageWorkOrderHub requires PackageWorkOrderHubProvider');
  }
  return ctx;
}

export type { PackageWorkOrderHubTabId };
