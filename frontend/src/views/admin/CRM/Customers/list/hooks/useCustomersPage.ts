'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import {
  type ClientDirectoryRow,
  type ClientDirectorySortBy,
  type CrmUser,
  getClientDirectory,
  getCrmCustomerTrash,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { ADMIN_MOBILE_PAGE_LIMIT, useAdminNarrowViewport } from '@/shared/lib/hooks';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import { formatCrmUserOptionLabel } from '../../shared/crmCustomerDisplay';
import {
  CUSTOMERS_PAGE_LIMIT_OPTIONS,
  type CustomerTypeFilter,
  type CustomersPageLimit,
  type DirectorySortOrder,
  loadCustomersDirectoryListState,
  parseClientDirectorySortBy,
  persistCustomersDirectoryListState,
  reloadCustomersDirectoryListStateFromStorage,
} from '../../shared/customersDirectoryListState';
import {
  type CustomersListScope,
  getCustomersListRoleDefaults,
} from '../../shared/customersListScope';

const EMPTY_SCOPE_COUNTS = { mine: 0, all: 0 };

export function useCustomersPage() {
  const { user } = useAuth();
  const initialListStateRef = useRef(loadCustomersDirectoryListState());
  const initialListState = initialListStateRef.current;
  const listStateHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);
  const roleDefaultsAppliedRef = useRef(false);
  const isNarrowViewport = useAdminNarrowViewport();

  const [searchInput, setSearchInput] = useState(initialListState.search);
  const [searchQuery, setSearchQuery] = useState(initialListState.search);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilterState] = useState<CustomerTypeFilter>(
    initialListState.typeFilter
  );
  const [authorFilter, setAuthorFilter] = useState(initialListState.authorFilter);
  const [listScope, setListScopeState] = useState<CustomersListScope>(initialListState.listScope);
  const [scopeTouched, setScopeTouched] = useState(initialListState.scopeTouched);
  const [scopeCounts, setScopeCounts] = useState(EMPTY_SCOPE_COUNTS);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);

  const [directoryRows, setDirectoryRows] = useState<ClientDirectoryRow[]>([]);
  const [directoryPage, setDirectoryPage] = useState(initialListState.page);
  const [directoryPageLimit, setDirectoryPageLimit] = useState<CustomersPageLimit>(
    initialListState.pageLimit
  );
  const effectiveDirectoryPageLimit = (
    isNarrowViewport ? ADMIN_MOBILE_PAGE_LIMIT : directoryPageLimit
  ) as CustomersPageLimit;
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

  const setListScope = useCallback((scope: CustomersListScope) => {
    setListScopeState(scope);
    setScopeTouched(true);
    setDirectoryPage(1);
  }, []);

  const setTypeFilter = useCallback((next: CustomerTypeFilter) => {
    setTypeFilterState(next);
    setDirectoryPage(1);
  }, []);

  useEffect(() => {
    const saved = reloadCustomersDirectoryListStateFromStorage();
    setSearchInput(saved.search);
    setSearchQuery(saved.search);
    setTypeFilterState(saved.typeFilter);
    setAuthorFilter(saved.authorFilter);
    setDirectorySortBy(saved.sortBy);
    setDirectorySortOrder(saved.sortOrder);
    setDirectoryPage(saved.page);
    setDirectoryPageLimit(saved.pageLimit);
    setListScopeState(saved.listScope);
    setScopeTouched(saved.scopeTouched);
    listStateHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (scopeTouched || roleDefaultsAppliedRef.current) return;
    if (!user?.role) return;
    const defaults = getCustomersListRoleDefaults(user.role);
    setListScopeState(defaults.listScope);
    roleDefaultsAppliedRef.current = true;
  }, [user?.role, scopeTouched]);

  useEffect(() => {
    if (!listStateHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistCustomersDirectoryListState({
      search: searchInput,
      typeFilter,
      authorFilter,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
      page: directoryPage,
      pageLimit: directoryPageLimit,
      listScope,
      scopeTouched,
    });
  }, [
    searchInput,
    typeFilter,
    authorFilter,
    directorySortBy,
    directorySortOrder,
    directoryPage,
    directoryPageLimit,
    listScope,
    scopeTouched,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(directoryTotal / effectiveDirectoryPageLimit));
    if (directoryPage > totalPages) setDirectoryPage(totalPages);
  }, [directoryTotal, effectiveDirectoryPageLimit, directoryPage]);

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

  const resolveCreatedById = useCallback((): string | undefined => {
    if (listScope === 'mine') {
      const id = user?.id?.trim();
      return id || undefined;
    }
    return authorFilter || undefined;
  }, [listScope, user?.id, authorFilter]);

  useEffect(() => {
    let cancelled = false;

    if (listScope === 'mine' && !user?.id?.trim()) {
      setDirectoryRows([]);
      setDirectoryTotal(0);
      setScopeCounts(EMPTY_SCOPE_COUNTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const entityType = typeFilter === 'all' ? undefined : typeFilter;
    const createdById = resolveCreatedById();
    const countBase = {
      search: searchQuery || undefined,
      entityType,
      page: 1,
      limit: 1 as const,
    };

    const mainPromise = getClientDirectory({
      search: searchQuery || undefined,
      page: directoryPage,
      limit: effectiveDirectoryPageLimit,
      entityType,
      createdById,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
    });

    const mineUserId = user?.id?.trim();
    const countsPromise = Promise.all([
      mineUserId
        ? getClientDirectory({ ...countBase, createdById: mineUserId })
        : Promise.resolve({ total: 0 }),
      getClientDirectory(countBase),
    ]);

    Promise.all([mainPromise, countsPromise])
      .then(([res, [mineRes, allRes]]) => {
        if (cancelled) return;
        setDirectoryRows(res.data ?? []);
        setDirectoryTotal(res.total ?? 0);
        setScopeCounts({
          mine: mineRes.total ?? 0,
          all: allRes.total ?? 0,
        });
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
    listScope,
    user?.id,
    resolveCreatedById,
    directorySortBy,
    directorySortOrder,
    effectiveDirectoryPageLimit,
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
    listScope,
    setListScope,
    scopeCounts,
    directoryRows,
    directoryPage,
    setDirectoryPage,
    directoryPageLimit: effectiveDirectoryPageLimit,
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
