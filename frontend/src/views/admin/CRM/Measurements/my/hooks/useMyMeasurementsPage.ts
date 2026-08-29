'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type Measurement,
  getCrmDirections,
  getMyMeasurements,
} from '@/shared/api/admin-crm';
import { ADMIN_MOBILE_PAGE_LIMIT, useAdminNarrowViewport } from '@/shared/lib/hooks';

import type { MeasurementLinksInfo } from '../../list/measurements-page.types';
import {
  chooseLatestByUpdatedAt,
  extractEstimatePresetIdsFromPackageForm,
} from '../../list/measurements-page.utils';
import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  parseMeasurementListSortBy,
} from '../../shared/measurementListSort';
import {
  MEASUREMENTS_PAGE_LIMIT_OPTIONS,
  type MeasurementsPageLimit,
} from '../../shared/measurementsListFilters';

export function useMyMeasurementsPage() {
  const router = useRouter();
  const isMobileViewport = useAdminNarrowViewport();

  const [data, setData] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<MeasurementsPageLimit>(20);
  const effectiveLimit = (
    isMobileViewport ? ADMIN_MOBILE_PAGE_LIMIT : limit
  ) as MeasurementsPageLimit;
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<MeasurementListSortBy>('executionDate');
  const [sortOrder, setSortOrder] = useState<MeasurementListSortOrder>('asc');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [linksByMeasurementId, setLinksByMeasurementId] = useState<
    Record<string, MeasurementLinksInfo>
  >({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
    if (page > totalPages) setPage(totalPages);
  }, [total, effectiveLimit, page]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getMyMeasurements({
        page,
        limit: effectiveLimit,
        status: statusFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        includeCounts: true,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      setStatusCounts(res.counts?.status ?? {});
      await loadMeasurementLinks(res.data);
    } catch (err) {
      setData([]);
      setTotal(0);
      setStatusCounts({});
      setLinksByMeasurementId({});
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить мои замеры');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    effectiveLimit,
    statusFilter,
    directionFilter,
    search,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    loadMeasurementLinks,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSortChange = useCallback(
    (nextSortBy: string, nextSortOrder: MeasurementListSortOrder) => {
      setSortBy(parseMeasurementListSortBy(nextSortBy));
      setSortOrder(nextSortOrder);
      setPage(1);
    },
    []
  );

  const openMeasurement = useCallback(
    (m: Measurement) => {
      router.push(`/admin/measurements/${m.id}`);
    },
    [router]
  );

  return {
    data,
    total,
    page,
    setPage,
    limit,
    setLimit,
    pageLimitOptions: MEASUREMENTS_PAGE_LIMIT_OPTIONS,
    loading,
    directions,
    statusFilter,
    setStatusFilter: (value: string) => {
      setStatusFilter(value);
      setPage(1);
    },
    directionFilter,
    setDirectionFilter: (value: string) => {
      setDirectionFilter(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    dateFrom,
    setDateFrom: (value: string) => {
      setDateFrom(value);
      setPage(1);
    },
    dateTo,
    setDateTo: (value: string) => {
      setDateTo(value);
      setPage(1);
    },
    sortBy,
    sortOrder,
    statusCounts,
    linksByMeasurementId,
    message,
    fetchData,
    handleSortChange,
    openMeasurement,
  };
}

export type MyMeasurementsPageModel = ReturnType<typeof useMyMeasurementsPage>;
