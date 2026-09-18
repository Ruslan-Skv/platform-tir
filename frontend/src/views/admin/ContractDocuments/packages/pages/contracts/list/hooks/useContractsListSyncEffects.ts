import { useEffect, useRef } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import type { ContractsListScope, ContractsListViewMode } from '../contractsListFilters';

export type UseContractsListSyncEffectsParams = {
  searchNorm: string;
  managerFilter: string;
  statusFilters: string[];
  directionFilters: string[];
  listScope: ContractsListScope;
  dateFrom: string;
  dateTo: string;
  listViewMode: ContractsListViewMode;
  /** Пока данные не загружены, не трогаем восстановленные из localStorage page/фильтры. */
  loading: boolean;
  setPage: (page: number) => void;
  setExpandedObjectId: (id: string | null) => void;
  totalVisible: number;
  limit: number;
  page: number;
  managerOptions: ContractSignatoryProfile[];
  setManagerFilter: (value: string) => void;
  directions: CrmDirection[];
  setDirectionFilters: (value: string[] | ((prev: string[]) => string[])) => void;
};

export function useContractsListSyncEffects({
  searchNorm,
  managerFilter,
  statusFilters,
  directionFilters,
  listScope,
  dateFrom,
  dateTo,
  listViewMode,
  loading,
  setPage,
  setExpandedObjectId,
  totalVisible,
  limit,
  page,
  managerOptions,
  setManagerFilter,
  directions,
  setDirectionFilters,
}: UseContractsListSyncEffectsParams) {
  // Сброс page/expandedObjectId — только при реальном изменении фильтров после монтирования:
  // при возврате на страницу восстановленные значения не должны затираться.
  const prevFiltersSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = JSON.stringify([
      searchNorm,
      managerFilter,
      statusFilters,
      directionFilters,
      listScope,
      dateFrom,
      dateTo,
      listViewMode,
    ]);
    const isFirstRun = prevFiltersSignatureRef.current === null;
    const changed = prevFiltersSignatureRef.current !== signature;
    prevFiltersSignatureRef.current = signature;
    if (isFirstRun || !changed) return;
    setPage(1);
    setExpandedObjectId(null);
  }, [
    searchNorm,
    managerFilter,
    statusFilters,
    directionFilters,
    listScope,
    dateFrom,
    dateTo,
    listViewMode,
    setPage,
    setExpandedObjectId,
  ]);

  useEffect(() => {
    // До первой загрузки totalVisible = 0 — не клампим восстановленную страницу.
    if (loading) return;
    const totalPages = Math.max(1, Math.ceil(totalVisible / limit));
    if (page > totalPages) setPage(totalPages);
  }, [loading, totalVisible, limit, page, setPage]);

  // Справочники (менеджеры, направления) грузятся асинхронно и до загрузки пусты:
  // валидируем сохранённые фильтры только против загруженных данных, иначе затрём их.
  useEffect(() => {
    if (loading || !managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [loading, managerFilter, managerOptions, setManagerFilter]);

  useEffect(() => {
    if (loading || directionFilters.length === 0) return;
    const valid = new Set(directions.map((d) => d.id));
    const next = directionFilters.filter((id) => valid.has(id));
    if (next.length !== directionFilters.length) {
      setDirectionFilters(next);
    }
  }, [loading, directionFilters, directions, setDirectionFilters]);
}
