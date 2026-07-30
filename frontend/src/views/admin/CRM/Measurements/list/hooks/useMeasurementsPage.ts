'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';
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
  type MeasurementsListCounts,
  getCrmDirections,
  getMeasurements,
  getMyCrmDirectionIds,
} from '@/shared/api/admin-crm';
import { ADMIN_MOBILE_PAGE_LIMIT, useAdminNarrowViewport } from '@/shared/lib/hooks';

import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  parseMeasurementListSortBy,
} from '../../shared/measurementListSort';
import {
  type MeasurementsListScope,
  type MeasurementsPageLimit,
  loadMeasurementsListFilters,
  persistMeasurementsListFilters,
  reloadMeasurementsListFiltersFromStorage,
} from '../../shared/measurementsListFilters';
import { getMeasurementsListRoleDefaults } from '../../shared/measurementsListScope';
import type { MeasurementLinksInfo } from '../measurements-page.types';
import {
  chooseLatestByUpdatedAt,
  extractEstimatePresetIdsFromPackageForm,
} from '../measurements-page.utils';

const EMPTY_SCOPE_COUNTS = { mine: 0, my_directions: 0, all: 0 };

export function useMeasurementsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialListStateRef = useRef(loadMeasurementsListFilters());
  const initialListState = initialListStateRef.current;
  const listStateHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);
  const roleDefaultsAppliedRef = useRef(false);
  const isMobileViewport = useAdminNarrowViewport();

  const [data, setData] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialListState.page);
  const [limit, setLimit] = useState<MeasurementsPageLimit>(initialListState.pageLimit);
  const effectiveLimit = (
    isMobileViewport ? ADMIN_MOBILE_PAGE_LIMIT : limit
  ) as MeasurementsPageLimit;
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [myDirectionIds, setMyDirectionIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialListState.statusFilter);
  const [managerFilter, setManagerFilter] = useState(initialListState.managerFilter);
  const [directionFilter, setDirectionFilter] = useState(initialListState.directionFilter);
  const [search, setSearch] = useState(initialListState.search);
  const [dateFrom, setDateFrom] = useState(initialListState.dateFrom);
  const [dateTo, setDateTo] = useState(initialListState.dateTo);
  const [listScope, setListScopeState] = useState<MeasurementsListScope>(
    initialListState.listScope
  );
  const [scopeTouched, setScopeTouched] = useState(initialListState.scopeTouched);
  const [measurementSortBy, setMeasurementSortBy] = useState<MeasurementListSortBy>(
    initialListState.sortBy
  );
  const [measurementSortOrder, setMeasurementSortOrder] = useState<MeasurementListSortOrder>(
    initialListState.sortOrder
  );
  const [scopeCounts, setScopeCounts] = useState(EMPTY_SCOPE_COUNTS);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [linksByMeasurementId, setLinksByMeasurementId] = useState<
    Record<string, MeasurementLinksInfo>
  >({});

  const setListScope = useCallback((scope: MeasurementsListScope) => {
    setListScopeState(scope);
    setScopeTouched(true);
    setPage(1);
  }, []);

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
    setListScopeState(saved.listScope);
    setScopeTouched(saved.scopeTouched);
    listStateHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (scopeTouched || roleDefaultsAppliedRef.current) return;
    if (!user?.role) return;
    const defaults = getMeasurementsListRoleDefaults(user.role);
    setListScopeState(defaults.listScope);
    roleDefaultsAppliedRef.current = true;
  }, [user?.role, scopeTouched]);

  useEffect(() => {
    if (!listStateHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
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
      listScope,
      scopeTouched,
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
    listScope,
    scopeTouched,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
    if (page > totalPages) setPage(totalPages);
  }, [total, effectiveLimit, page]);

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

  const applyCounts = useCallback((counts: MeasurementsListCounts | undefined) => {
    if (!counts) {
      setScopeCounts(EMPTY_SCOPE_COUNTS);
      setStatusCounts({});
      return;
    }
    setScopeCounts({
      mine: counts.scope?.mine ?? 0,
      my_directions: counts.scope?.my_directions ?? 0,
      all: counts.scope?.all ?? 0,
    });
    setStatusCounts(counts.status ?? {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMeasurements({
        page,
        limit: effectiveLimit,
        status: statusFilter || undefined,
        managerId: listScope === 'mine' ? undefined : managerFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        scope: listScope,
        myDirectionIds: listScope === 'my_directions' ? myDirectionIds : undefined,
        includeCounts: true,
        countsMyDirectionIds: myDirectionIds,
        sortBy: measurementSortBy,
        sortOrder: measurementSortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      applyCounts(res.counts);
      await loadMeasurementLinks(res.data);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
      applyCounts(undefined);
      setLinksByMeasurementId({});
    } finally {
      setLoading(false);
    }
  }, [
    page,
    effectiveLimit,
    statusFilter,
    managerFilter,
    directionFilter,
    search,
    dateFrom,
    dateTo,
    listScope,
    myDirectionIds,
    measurementSortBy,
    measurementSortOrder,
    applyCounts,
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
    getMyCrmDirectionIds()
      .then(setMyDirectionIds)
      .catch(() => setMyDirectionIds([]));
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
    limit: effectiveLimit,
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
    listScope,
    setListScope,
    scopeCounts,
    statusCounts,
    measurementSortBy,
    measurementSortOrder,
    linksByMeasurementId,
    fetchData,
    handleMeasurementSortChange,
  };
}

export type MeasurementsPageModel = ReturnType<typeof useMeasurementsPage>;
