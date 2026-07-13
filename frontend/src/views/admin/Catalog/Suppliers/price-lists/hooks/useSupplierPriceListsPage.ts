'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PRICE_LIST_CATEGORY_LABELS,
  type PriceListCompareResponse,
  type PriceListDiffStatus,
  type SupplierPriceListCategory,
  type SupplierPriceListSnapshot,
  applySupplierPriceListChanges,
  autoMapSupplierPriceListRows,
  compareSupplierPriceLists,
  fetchSupplierPriceListSnapshots,
  uploadSupplierPriceListAll,
} from '@/shared/api/admin-supplier-price-lists';
import { apiFetch } from '@/shared/lib/api-fetch';

import type {
  PriceListPageMessage,
  SupplierInfo,
  SupplierPriceListsPageModel,
} from '../supplier-price-lists-page.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type UseSupplierPriceListsPageOptions = {
  supplierId: string;
};

export function useSupplierPriceListsPage({
  supplierId,
}: UseSupplierPriceListsPageOptions): SupplierPriceListsPageModel {
  const [category, setCategory] = useState<SupplierPriceListCategory>('TRIM');
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [snapshots, setSnapshots] = useState<SupplierPriceListSnapshot[]>([]);
  const [comparison, setComparison] = useState<PriceListCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = useState('');
  const [previousSnapshotId, setPreviousSnapshotId] = useState('');
  const [statusFilter, setStatusFilter] = useState<PriceListDiffStatus | 'all'>('changed');
  const [message, setMessage] = useState<PriceListPageMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
          : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [supplierRes, snapshotsData] = await Promise.all([
        apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
          headers,
          cache: 'no-store',
        }),
        fetchSupplierPriceListSnapshots(supplierId, category),
      ]);

      if (!supplierRes.ok) throw new Error('Поставщик не найден');
      const supplierData = (await supplierRes.json()) as SupplierInfo;
      setSupplier(supplierData);
      setSnapshots(snapshotsData);

      if (snapshotsData.length > 0) {
        setCurrentSnapshotId(snapshotsData[0].id);
        setPreviousSnapshotId(snapshotsData[1]?.id ?? '');
      } else {
        setCurrentSnapshotId('');
        setPreviousSnapshotId('');
        setComparison(null);
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка загрузки',
      });
    } finally {
      setLoading(false);
    }
  }, [supplierId, category]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runCompare = useCallback(
    async (currentId: string, previousId?: string) => {
      if (!currentId) return;
      setComparing(true);
      setMessage(null);
      try {
        const result = await compareSupplierPriceLists(
          supplierId,
          currentId,
          category,
          previousId || undefined
        );
        setComparison(result);
      } catch (e) {
        setMessage({
          type: 'err',
          text: e instanceof Error ? e.message : 'Ошибка сравнения',
        });
      } finally {
        setComparing(false);
      }
    },
    [supplierId, category]
  );

  useEffect(() => {
    if (currentSnapshotId) {
      void runCompare(currentSnapshotId, previousSnapshotId || undefined);
    }
  }, [currentSnapshotId, previousSnapshotId, runCompare]);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setMessage({ type: 'err', text: 'Выберите файл прайс-листа' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const result = await uploadSupplierPriceListAll(supplierId, selectedFile);
      clearSelectedFile();

      const totalRows = result.snapshots.reduce((sum, snapshot) => sum + snapshot.rowCount, 0);
      const breakdown = result.snapshots
        .map(
          (snapshot) => `${PRICE_LIST_CATEGORY_LABELS[snapshot.category]} (${snapshot.rowCount})`
        )
        .join(', ');
      const skippedNote =
        result.skipped.length > 0
          ? ` Пропущено: ${result.skipped.map((item) => PRICE_LIST_CATEGORY_LABELS[item.category]).join(', ')}.`
          : '';

      setMessage({
        type: 'ok',
        text: `Прайс загружен: ${result.snapshots.length} категорий, ${totalRows} строк — ${breakdown}.${skippedNote}`,
      });

      await loadData();

      const categorySnapshot = result.snapshots.find((snapshot) => snapshot.category === category);
      if (categorySnapshot) {
        setCurrentSnapshotId(categorySnapshot.id);
        const refreshed = await fetchSupplierPriceListSnapshots(supplierId, category);
        const previous = refreshed.find((snapshot) => snapshot.id !== categorySnapshot.id);
        setPreviousSnapshotId(previous?.id ?? '');
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка загрузки',
      });
    } finally {
      setUploading(false);
    }
  }, [selectedFile, supplierId, clearSelectedFile, loadData, category]);

  const handleAutoMap = useCallback(async () => {
    setMapping(true);
    setMessage(null);
    try {
      const result = await autoMapSupplierPriceListRows(
        supplierId,
        currentSnapshotId || undefined,
        category
      );
      setMessage({
        type: 'ok',
        text: `Привязано: ${result.mapped}, пропущено: ${result.skipped}`,
      });
      if (currentSnapshotId) {
        await runCompare(currentSnapshotId, previousSnapshotId || undefined);
      }
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка автопривязки',
      });
    } finally {
      setMapping(false);
    }
  }, [supplierId, currentSnapshotId, category, previousSnapshotId, runCompare]);

  const handleApply = useCallback(async () => {
    if (!comparison?.currentSnapshot.id) return;
    const changedMapped = comparison.rows.filter(
      (row) => row.status === 'changed' && row.catalogItemId
    );
    if (changedMapped.length === 0) {
      setMessage({
        type: 'err',
        text: 'Нет привязанных позиций с изменившейся ценой',
      });
      return;
    }

    const confirmed = window.confirm(
      `Обновить цены для ${changedMapped.length} позиций в справочнике комплектующих?`
    );
    if (!confirmed) return;

    setApplying(true);
    setMessage(null);
    try {
      const result = await applySupplierPriceListChanges(supplierId, {
        currentSnapshotId: comparison.currentSnapshot.id,
        previousSnapshotId: comparison.previousSnapshot?.id,
        rowKeys: changedMapped.map((row) => row.rowKey),
        category,
      });
      setMessage({
        type: 'ok',
        text: `Обновлено цен: ${result.updated}`,
      });
      await runCompare(comparison.currentSnapshot.id, comparison.previousSnapshot?.id);
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Ошибка применения цен',
      });
    } finally {
      setApplying(false);
    }
  }, [comparison, supplierId, category, runCompare]);

  const handleCategoryChange = useCallback((nextCategory: SupplierPriceListCategory) => {
    setCategory(nextCategory);
    setComparison(null);
    setMessage(null);
  }, []);

  const filteredRows = useMemo(() => {
    const rows = comparison?.rows ?? [];
    if (statusFilter === 'all') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [comparison?.rows, statusFilter]);

  const supplierLabel = supplier?.commercialName || supplier?.legalName || 'Поставщик';

  return {
    supplierId,
    category,
    supplierLabel,
    isTrimCategory: category === 'TRIM',
    snapshots,
    comparison,
    filteredRows,
    loading,
    uploading,
    comparing,
    mapping,
    applying,
    selectedFile,
    fileInputRef,
    currentSnapshotId,
    previousSnapshotId,
    statusFilter,
    message,
    setCategory: handleCategoryChange,
    setSelectedFile,
    setCurrentSnapshotId,
    setPreviousSnapshotId,
    setStatusFilter,
    clearSelectedFile,
    handleUpload,
    handleAutoMap,
    handleApply,
    runCompare,
  };
}
