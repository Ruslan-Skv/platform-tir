'use client';

import { useCallback, useEffect, useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageContractInstallersOptions = {
  packageKind: ContractDocumentPackageKind;
  contractInstallers: InstallerMaster[];
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  activeInstallerId: string;
  setActiveInstallerId: (installerId: string) => void;
  touchPackageData: () => void;
};

export function usePackageContractInstallers({
  packageKind,
  contractInstallers,
  form,
  setForm,
  activeInstallerId,
  setActiveInstallerId,
  touchPackageData,
}: UsePackageContractInstallersOptions) {
  const installersForContract = useMemo(() => {
    const direction = isProductDirectionPackageKind(packageKind) ? packageKind : 'REPAIR';
    return contractInstallers.filter((installer) => installer.directions?.includes(direction));
  }, [contractInstallers, packageKind]);

  const selectedInstallers = useMemo(() => {
    const selectedIds = new Set(form.selectedRepairInstallerIds ?? []);
    return installersForContract.filter((installer) => selectedIds.has(installer.id));
  }, [installersForContract, form.selectedRepairInstallerIds]);

  const selectedInstallersById = useMemo(
    () => new Map(selectedInstallers.map((installer) => [installer.id, installer])),
    [selectedInstallers]
  );

  useEffect(() => {
    const selected = form.selectedRepairInstallerIds ?? [];
    if (selected.length === 0) {
      if (activeInstallerId) setActiveInstallerId('');
      return;
    }
    if (!selected.includes(activeInstallerId)) {
      setActiveInstallerId(selected[0] ?? '');
    }
  }, [form.selectedRepairInstallerIds, activeInstallerId, setActiveInstallerId]);

  useEffect(() => {
    const allowedIds = new Set(installersForContract.map((installer) => installer.id));
    setForm((p) => {
      const selected = (p.selectedRepairInstallerIds ?? []).filter((id) => allowedIds.has(id));
      const selectedSet = new Set(selected);
      const assignments = Object.fromEntries(
        Object.entries(p.finalEstimateInstallerAssignments ?? {}).filter(([, assignment]) =>
          selectedSet.has(assignment.installerId)
        )
      );
      if (
        selected.length === (p.selectedRepairInstallerIds ?? []).length &&
        Object.keys(assignments).length ===
          Object.keys(p.finalEstimateInstallerAssignments ?? {}).length
      ) {
        return p;
      }
      return {
        ...p,
        selectedRepairInstallerIds: selected,
        finalEstimateInstallerAssignments: assignments,
      };
    });
  }, [installersForContract, setForm]);

  const toggleInstallerForContract = useCallback(
    (installerId: string, checked: boolean) => {
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        if (checked) selected.add(installerId);
        else selected.delete(installerId);

        const nextAssignments: PackageFormData['finalEstimateInstallerAssignments'] = {};
        for (const [rowKey, assignment] of Object.entries(
          p.finalEstimateInstallerAssignments ?? {}
        )) {
          if (!selected.has(assignment.installerId)) continue;
          nextAssignments[rowKey] = assignment;
        }
        return {
          ...p,
          selectedRepairInstallerIds: [...selected],
          finalEstimateInstallerAssignments: nextAssignments,
        };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const addInstallerToContract = useCallback(
    (installerId: string) => {
      toggleInstallerForContract(installerId, true);
      setActiveInstallerId(installerId);
    },
    [toggleInstallerForContract, setActiveInstallerId]
  );

  const removeInstallerFromContract = useCallback(
    (installerId: string) => {
      toggleInstallerForContract(installerId, false);
    },
    [toggleInstallerForContract]
  );

  const activateOrToggleInstaller = useCallback(
    (installerId: string) => {
      const isSelected = (form.selectedRepairInstallerIds ?? []).includes(installerId);
      if (!isSelected) {
        addInstallerToContract(installerId);
        return;
      }
      if (activeInstallerId === installerId) {
        removeInstallerFromContract(installerId);
        return;
      }
      setActiveInstallerId(installerId);
    },
    [
      activeInstallerId,
      form.selectedRepairInstallerIds,
      addInstallerToContract,
      removeInstallerFromContract,
      setActiveInstallerId,
    ]
  );

  const assignInstallerToFinalEstimateRow = useCallback(
    (rowKey: string, installerId: string) => {
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        const nextAssignments = { ...(p.finalEstimateInstallerAssignments ?? {}) };
        if (!installerId || !selected.has(installerId)) {
          delete nextAssignments[rowKey];
        } else {
          nextAssignments[rowKey] = { installerId };
        }
        return { ...p, finalEstimateInstallerAssignments: nextAssignments };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const assignInstallerToFinalEstimateRows = useCallback(
    (rowKeys: string[], installerId: string) => {
      if (!installerId) return;
      if (rowKeys.length === 0) return;
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        if (!selected.has(installerId)) return p;
        const nextAssignments = { ...(p.finalEstimateInstallerAssignments ?? {}) };
        const allAssignedToActive = rowKeys.every(
          (rowKey) => nextAssignments[rowKey]?.installerId === installerId
        );
        if (allAssignedToActive) {
          for (const rowKey of rowKeys) {
            delete nextAssignments[rowKey];
          }
        } else {
          for (const rowKey of rowKeys) {
            nextAssignments[rowKey] = { installerId };
          }
        }
        return { ...p, finalEstimateInstallerAssignments: nextAssignments };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  return {
    installersForContract,
    selectedInstallers,
    selectedInstallersById,
    addInstallerToContract,
    removeInstallerFromContract,
    activateOrToggleInstaller,
    assignInstallerToFinalEstimateRow,
    assignInstallerToFinalEstimateRows,
  };
}
