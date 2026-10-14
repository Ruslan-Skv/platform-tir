'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractDocumentPackageInstallerAdvance,
  type ContractDocumentPackageInstallerAdvanceInput,
  type ContractDocumentPackageInstallerAdvancePatch,
  createContractDocumentPackageInstallerAdvance,
  deleteContractDocumentPackageInstallerAdvance,
  getContractDocumentPackageInstallerAdvances,
  updateContractDocumentPackageInstallerAdvance,
} from '@/shared/api/admin-contract-document-packages';

export type UsePackageInstallerAdvancesParams = {
  packageId: string;
  onError: (message: string) => void;
};

/** Журнал авансов мастеров по договору: загрузка, выдача, правка и удаление записей. */
export function usePackageInstallerAdvances({
  packageId,
  onError,
}: UsePackageInstallerAdvancesParams) {
  const [rows, setRows] = useState<ContractDocumentPackageInstallerAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // У нового несохранённого пакета id нет — журнала авансов быть не может.
    if (!packageId.trim()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getContractDocumentPackageInstallerAdvances(packageId);
      setRows(list);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить авансы');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [packageId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const createAdvance = useCallback(
    async (input: ContractDocumentPackageInstallerAdvanceInput): Promise<boolean> => {
      setCreating(true);
      try {
        await createContractDocumentPackageInstallerAdvance(packageId, input);
        await load();
        return true;
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось выдать аванс');
        return false;
      } finally {
        setCreating(false);
      }
    },
    [packageId, load, onError]
  );

  /** Правка записи — только админ и супер-админ (роль проверяется и на бэкенде). */
  const updateAdvance = useCallback(
    async (
      advanceId: string,
      patch: ContractDocumentPackageInstallerAdvancePatch
    ): Promise<boolean> => {
      setUpdatingId(advanceId);
      try {
        await updateContractDocumentPackageInstallerAdvance(packageId, advanceId, patch);
        await load();
        return true;
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось сохранить изменения аванса');
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [packageId, load, onError]
  );

  const deleteAdvance = useCallback(
    async (advanceId: string): Promise<boolean> => {
      setDeletingId(advanceId);
      try {
        await deleteContractDocumentPackageInstallerAdvance(packageId, advanceId);
        await load();
        return true;
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось удалить запись аванса');
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [packageId, load, onError]
  );

  /** Выдано по каждому мастеру: сумма и число выплат. */
  const paidByInstallerId = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      if (!r.installerId) continue;
      const n = Number.parseFloat(r.amount);
      if (!Number.isFinite(n)) continue;
      const prev = map.get(r.installerId) ?? { total: 0, count: 0 };
      prev.total += n;
      prev.count += 1;
      map.set(r.installerId, prev);
    }
    return map;
  }, [rows]);

  const totalPaid = useMemo(
    () => [...paidByInstallerId.values()].reduce((sum, x) => sum + x.total, 0),
    [paidByInstallerId]
  );

  return {
    rows,
    loading,
    creating,
    updatingId,
    deletingId,
    load,
    createAdvance,
    updateAdvance,
    deleteAdvance,
    paidByInstallerId,
    totalPaid,
  };
}
