'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ClientDirectoryRow,
  type ClientDirectorySortBy,
  type CrmUser,
  getClientDirectory,
  getCrmCustomerTrash,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import { formatCrmUserOptionLabel } from '../crmCustomerDisplay';
import {
  CUSTOMERS_PAGE_LIMIT_OPTIONS,
  type CustomerTypeFilter,
  type CustomersPageLimit,
  type DirectorySortOrder,
  loadCustomersDirectoryListState,
  parseClientDirectorySortBy,
  persistCustomersDirectoryListState,
  reloadCustomersDirectoryListStateFromStorage,
} from '../customersDirectoryListState';

export function useCustomersPage() {
  const initialListStateRef = useRef(loadCustomersDirectoryListState());
  const initialListState = initialListStateRef.current;
  const listStateHydratedRef = useRef(false);

  const [searchInput, setSearchInput] = useState(initialListState.search);
  const [searchQuery, setSearchQuery] = useState(initialListState.search);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>(initialListState.typeFilter);
  const [authorFilter, setAuthorFilter] = useState(initialListState.authorFilter);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);

  const [directoryRows, setDirectoryRows] = useState<ClientDirectoryRow[]>([]);
  const [directoryPage, setDirectoryPage] = useState(initialListState.page);
  const [directoryPageLimit, setDirectoryPageLimit] = useState<CustomersPageLimit>(
    initialListState.pageLimit
  );
  const [directoryTotal, setDirectoryTotal] = useState(0);

  const [selectedDirectoryRowId, setSelectedDirectoryRowId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const fetchCustomerTrashTotal = useCallback(() => getCrmCustomerTrash({ page: 1, limit: 1 }), []);
  const { trashCount, refreshTrashCount } = useAdminTrashCount(
    fetchCustomerTrashTotal,
    listRefreshKey
  );

  const [directorySortBy, setDirectorySortBy] = useState<ClientDirectorySortBy>(
    initialListState.sortBy
  );
  const [directorySortOrder, setDirectorySortOrder] = useState<DirectorySortOrder>(
    initialListState.sortOrder
  );

  useEffect(() => {
    const saved = reloadCustomersDirectoryListStateFromStorage();
    setSearchInput(saved.search);
    setSearchQuery(saved.search);
    setTypeFilter(saved.typeFilter);
    setAuthorFilter(saved.authorFilter);
    setDirectorySortBy(saved.sortBy);
    setDirectorySortOrder(saved.sortOrder);
    setDirectoryPage(saved.page);
    setDirectoryPageLimit(saved.pageLimit);
    listStateHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listStateHydratedRef.current) return;
    persistCustomersDirectoryListState({
      search: searchInput,
      typeFilter,
      authorFilter,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
      page: directoryPage,
      pageLimit: directoryPageLimit,
    });
  }, [
    searchInput,
    typeFilter,
    authorFilter,
    directorySortBy,
    directorySortOrder,
    directoryPage,
    directoryPageLimit,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(directoryTotal / directoryPageLimit));
    if (directoryPage > totalPages) setDirectoryPage(totalPages);
  }, [directoryTotal, directoryPageLimit, directoryPage]);

  useEffect(() => {
    getCrmUsers()
      .then(setCrmUsers)
      .catch(() => setCrmUsers([]));
  }, []);

  useEffect(() => {
    if (!authorFilter || authorFilter === '_none') return;
    if (!crmUsers.some((u) => u.id === authorFilter)) {
      setAuthorFilter('');
    }
  }, [authorFilter, crmUsers]);

  const authorSelectOptions = useMemo(
    () =>
      [...crmUsers].sort((a, b) =>
        formatCrmUserOptionLabel(a).localeCompare(formatCrmUserOptionLabel(b), 'ru')
      ),
    [crmUsers]
  );

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      if (searchQueryRef.current !== next) {
        setDirectoryPage(1);
      }
      setSearchQuery(next);
    }, 380);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const handleDirectorySortChange = useCallback((sortBy: string, sortOrder: DirectorySortOrder) => {
    setDirectorySortBy(parseClientDirectorySortBy(sortBy));
    setDirectorySortOrder(sortOrder);
    setDirectoryPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClientDirectory({
      search: searchQuery || undefined,
      page: directoryPage,
      limit: directoryPageLimit,
      entityType: typeFilter === 'all' ? undefined : typeFilter,
      createdById: authorFilter || undefined,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
    })
      .then((res) => {
        if (cancelled) return;
        setDirectoryRows(res.data ?? []);
        setDirectoryTotal(res.total ?? 0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки справочника');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    searchQuery,
    directoryPage,
    listRefreshKey,
    typeFilter,
    authorFilter,
    directorySortBy,
    directorySortOrder,
    directoryPageLimit,
  ]);

  const selectedDirectoryRow = useMemo(
    () => directoryRows.find((r) => r.id === selectedDirectoryRowId) ?? null,
    [directoryRows, selectedDirectoryRowId]
  );

  useEffect(() => {
    if (!selectedDirectoryRowId) return;
    if (!directoryRows.some((r) => r.id === selectedDirectoryRowId))
      setSelectedDirectoryRowId(null);
  }, [directoryRows, selectedDirectoryRowId]);

  const clearDirectorySelection = useCallback(() => {
    setSelectedDirectoryRowId(null);
  }, []);

  const crmDetailCustomerId =
    selectedDirectoryRow?.rowSource === 'customer' ? selectedDirectoryRow.id : null;

  const bumpListRefresh = useCallback(() => setListRefreshKey((k) => k + 1), []);

  return {
    searchInput,
    setSearchInput,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    authorFilter,
    setAuthorFilter,
    directoryRows,
    directoryPage,
    setDirectoryPage,
    directoryPageLimit,
    setDirectoryPageLimit,
    directoryTotal,
    selectedDirectoryRowId,
    setSelectedDirectoryRowId,
    addCustomerOpen,
    setAddCustomerOpen,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    directorySortBy,
    directorySortOrder,
    authorSelectOptions,
    handleDirectorySortChange,
    selectedDirectoryRow,
    clearDirectorySelection,
    crmDetailCustomerId,
    bumpListRefresh,
    pageLimitOptions: CUSTOMERS_PAGE_LIMIT_OPTIONS,
  };
}

export type CustomersPageModel = ReturnType<typeof useCustomersPage>;
