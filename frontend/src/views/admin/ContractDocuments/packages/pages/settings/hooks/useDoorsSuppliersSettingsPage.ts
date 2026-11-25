'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type DoorsSupplierOption,
  getContractDocumentDoorsSettings,
  getContractDocumentDoorsSupplierOptions,
  putContractDocumentDoorsSettings,
} from '@/shared/api/admin-contract-document-packages';

import {
  filterDoorsSupplierOptions,
  isSameSupplierIds,
  orderSupplierIdsByOptions,
  toggleSupplierId,
} from '../doorsSuppliersSettingsUtils';

/** Список поставщиков спецификации «Дверей»: выбор для супер-админа в «Настройках договоров». */
export function useDoorsSuppliersSettingsPage() {
  const [suppliers, setSuppliers] = useState<DoorsSupplierOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, options] = await Promise.all([
        getContractDocumentDoorsSettings(),
        getContractDocumentDoorsSupplierOptions(),
      ]);
      const ids = orderSupplierIdsByOptions(settings.specificationSupplierIds, options);
      setSuppliers(options);
      setSelectedIds(ids);
      setSavedIds(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить поставщиков');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Уведомление о сохранении гаснем таймером; при закрытии вкладки таймер снимаем.
  useEffect(() => {
    if (!successVisible) return;
    const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [successVisible]);

  const filteredSuppliers = useMemo(
    () => filterDoorsSupplierOptions(suppliers, search),
    [suppliers, search]
  );

  const dirty = !isSameSupplierIds(selectedIds, savedIds);

  const toggleSupplier = useCallback((id: string) => {
    setSelectedIds((prev) => toggleSupplierId(prev, id));
  }, []);

  /** Отметить поставщиков, найденных поиском (остальные отметки не трогаем). */
  const selectFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const supplier of filteredSuppliers) next.add(supplier.id);
      return orderSupplierIdsByOptions([...next], suppliers);
    });
  }, [filteredSuppliers, suppliers]);

  /** Снять отметки с поставщиков, найденных поиском. */
  const unselectFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const visible = new Set(filteredSuppliers.map((supplier) => supplier.id));
      return prev.filter((id) => !visible.has(id));
    });
  }, [filteredSuppliers]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // Сохраняем в порядке справочника — как список выглядит в договоре.
      const saved = await putContractDocumentDoorsSettings({
        specificationSupplierIds: orderSupplierIdsByOptions(selectedIds, suppliers),
      });
      setSelectedIds(saved.specificationSupplierIds);
      setSavedIds(saved.specificationSupplierIds);
      setSuccessVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить список поставщиков');
    } finally {
      setSaving(false);
    }
  }, [saving, selectedIds, suppliers]);

  return {
    dirty,
    error,
    filteredSuppliers,
    loading,
    refresh: load,
    save,
    saving,
    search,
    selectedIds,
    setSearch,
    successVisible,
    suppliers,
    selectFiltered,
    toggleSupplier,
    unselectFiltered,
  };
}

export type DoorsSuppliersSettingsPageModel = ReturnType<typeof useDoorsSuppliersSettingsPage>;
