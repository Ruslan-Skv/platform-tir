'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type Measurement,
  getCrmDirections,
  getMeasurements,
} from '@/shared/api/admin-crm';

import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  parseMeasurementListSortBy,
} from '../../shared/measurementListSort';
import {
  type MeasurementsPageLimit,
  loadMeasurementsListFilters,
  persistMeasurementsListFilters,
  reloadMeasurementsListFiltersFromStorage,
} from '../../shared/measurementsListFilters';
import type { MeasurementLinksInfo } from '../measurements-page.types';
import {
  chooseLatestByUpdatedAt,
  extractEstimatePresetIdsFromPackageForm,
} from '../measurements-page.utils';

export function useMeasurementsPage() {
  const searchParams = useSearchParams();
  const initialListStateRef = useRef(loadMeasurementsListFilters());
  const initialListState = initialListStateRef.current;
  const listStateHydratedRef = useRef(false);

  const [data, setData] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialListState.page);
  const [limit, setLimit] = useState<MeasurementsPageLimit>(initialListState.pageLimit);
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialListState.statusFilter);
  const [managerFilter, setManagerFilter] = useState(initialListState.managerFilter);
  const [directionFilter, setDirectionFilter] = useState(initialListState.directionFilter);
  const [search, setSearch] = useState(initialListState.search);
  const [dateFrom, setDateFrom] = useState(initialListState.dateFrom);
  const [dateTo, setDateTo] = useState(initialListState.dateTo);
  const [measurementSortBy, setMeasurementSortBy] = useState<MeasurementListSortBy>(
    initialListState.sortBy
  );
  const [measurementSortOrder, setMeasurementSortOrder] = useState<MeasurementListSortOrder>(
    initialListState.sortOrder
  );
  const [linksByMeasurementId, setLinksByMeasurementId] = useState<
    Record<string, MeasurementLinksInfo>
  >({});

  useEffect(() => {
    const saved = reloadMeasurementsListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setStatusFilter(saved.statusFilter);
    setDirectionFilter(saved.directionFilter);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setMeasurementSortBy(saved.sortBy);
    setMeasurementSortOrder(saved.sortOrder);
    setPage(saved.page);
    setLimit(saved.pageLimit);
    listStateHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listStateHydratedRef.current) return;
    persistMeasurementsListFilters({
      search,
      managerFilter,
      statusFilter,
      directionFilter,
      dateFrom,
      dateTo,
      sortBy: measurementSortBy,
      sortOrder: measurementSortOrder,
      page,
      pageLimit: limit,
    });
  }, [
    search,
    managerFilter,
    statusFilter,
    directionFilter,
    dateFrom,
    dateTo,
    measurementSortBy,
    measurementSortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) setPage(totalPages);
  }, [total, limit, page]);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q && q.trim()) setSearch(q.trim());
  }, [searchParams]);

  const loadMeasurementLinks = useCallback(async (measurements: Measurement[]) => {
    const measurementIds = new Set(measurements.map((m) => m.id));
    if (measurementIds.size === 0) {
      setLinksByMeasurementId({});
      return;
    }
    try {
      const [{ items: estimates }, packages] = await Promise.all([
        getContractDocumentEstimatePresets('REPAIR'),
        getContractDocumentPackages('REPAIR'),
      ]);
      const estimatesByMeasurement = new Map<string, ContractEstimatePreset[]>();
      for (const estimate of estimates) {
        const sourceMeasurementId = estimate.sourceMeasurementId?.trim();
        if (!sourceMeasurementId || !measurementIds.has(sourceMeasurementId)) continue;
        const bucket = estimatesByMeasurement.get(sourceMeasurementId) ?? [];
        bucket.push(estimate);
        estimatesByMeasurement.set(sourceMeasurementId, bucket);
      }

      const packagesByEstimateId = new Map<string, ContractDocumentPackage[]>();
      for (const pkg of packages) {
        const estimateIds = extractEstimatePresetIdsFromPackageForm(pkg.formData);
        for (const estimateId of estimateIds) {
          const bucket = packagesByEstimateId.get(estimateId) ?? [];
          bucket.push(pkg);
          packagesByEstimateId.set(estimateId, bucket);
        }
      }

      const nextMap: Record<string, MeasurementLinksInfo> = {};
      for (const measurement of measurements) {
        const relatedEstimates = estimatesByMeasurement.get(measurement.id) ?? [];
        const latestEstimate = chooseLatestByUpdatedAt(relatedEstimates);
        if (!latestEstimate) continue;
        const relatedPackages = packagesByEstimateId.get(latestEstimate.id) ?? [];
        const latestPackage = chooseLatestByUpdatedAt(relatedPackages);
        nextMap[measurement.id] = {
          estimateId: latestEstimate.id,
          estimateTitle: latestEstimate.title || 'Расчёт',
          ...(latestPackage
            ? {
                packageId: latestPackage.id,
                packageTitle: latestPackage.title || 'Пакет документов',
              }
            : {}),
        };
      }
      setLinksByMeasurementId(nextMap);
    } catch {
      setLinksByMeasurementId({});
    }
  }, []);

  const handleMeasurementSortChange = useCallback(
    (sortBy: string, sortOrder: MeasurementListSortOrder) => {
      setMeasurementSortBy(parseMeasurementListSortBy(sortBy));
      setMeasurementSortOrder(sortOrder);
      setPage(1);
    },
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMeasurements({
        page,
        limit,
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: measurementSortBy,
        sortOrder: measurementSortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      await loadMeasurementLinks(res.data);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
      setLinksByMeasurementId({});
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    statusFilter,
    managerFilter,
    directionFilter,
    search,
    dateFrom,
    dateTo,
    measurementSortBy,
    measurementSortOrder,
    loadMeasurementLinks,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getContractDocumentSignatoryProfiles('REPAIR')
      .then((res) => {
        const items = (res.items ?? [])
          .filter((p) => Boolean(p.crmUserId?.trim()))
          .sort((a, b) =>
            (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' })
          );
        setManagerOptions(items);
      })
      .catch(() => setManagerOptions([]));
  }, []);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerOptions]);

  useEffect(() => {
    if (!directionFilter) return;
    if (!directions.some((d) => d.id === directionFilter)) {
      setDirectionFilter('');
    }
  }, [directionFilter, directions]);

  return {
    data,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    directions,
    managerOptions,
    statusFilter,
    setStatusFilter,
    managerFilter,
    setManagerFilter,
    directionFilter,
    setDirectionFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    measurementSortBy,
    measurementSortOrder,
    linksByMeasurementId,
    fetchData,
    handleMeasurementSortChange,
  };
}

export type MeasurementsPageModel = ReturnType<typeof useMeasurementsPage>;
