'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { keepPreviousData, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  deleteAdminComponentCatalogItem,
  fetchAdminComponentCatalogGroupsList,
  fetchAdminComponentCatalogKinds,
  fetchAdminComponentCatalogList,
  fetchAdminComponentCatalogSeriesList,
} from '@/shared/api/admin-component-catalog';

export const COMPONENT_CATALOG_LIST_KEY = 'admin-component-catalog-list';
export const COMPONENT_CATALOG_GROUPS_KEY = 'admin-component-catalog-groups';
export const COMPONENT_CATALOG_SERIES_KEY = 'admin-component-catalog-series';
export const COMPONENT_CATALOG_KINDS_KEY = 'admin-component-catalog-kinds';

const LIMIT_STORAGE_KEY = 'admin_component_catalog_page_limit';

export type ComponentCatalogTab = 'items' | 'groups' | 'kinds';

export function useComponentCatalogPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ComponentCatalogTab>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    if (typeof window === 'undefined') return 50;
    const stored = localStorage.getItem(LIMIT_STORAGE_KEY);
    const n = stored ? parseInt(stored, 10) : 50;
    return [20, 50, 100, 200].includes(n) ? n : 50;
  });
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<AdminComponentCatalogItem | null>(null);
  const [copyFromItem, setCopyFromItem] = useState<AdminComponentCatalogItem | null>(null);
  const [assignToGroup, setAssignToGroup] = useState<{ id: string; name: string } | null>(null);
  const [itemDeleteTarget, setItemDeleteTarget] = useState<AdminComponentCatalogItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kindFilter, seriesFilter, groupFilter, activeFilter, limit, tab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LIMIT_STORAGE_KEY, String(limit));
    }
  }, [limit]);

  const showToast = useCallback((text: string, type: 'ok' | 'err') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const listQueryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      kindId: kindFilter || undefined,
      seriesId: seriesFilter || undefined,
      groupId: groupFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      debouncedSearch,
      kindFilter,
      seriesFilter,
      groupFilter,
      activeFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    ]
  );

  const {
    data: listResponse,
    isLoading: itemsLoading,
    isFetching: itemsFetching,
    refetch: refetchItems,
  } = useQuery({
    queryKey: [COMPONENT_CATALOG_LIST_KEY, listQueryParams],
    queryFn: () => fetchAdminComponentCatalogList(listQueryParams),
    placeholderData: keepPreviousData,
    enabled: tab === 'items',
  });

  const { data: seriesForFilter } = useQuery({
    queryKey: [COMPONENT_CATALOG_SERIES_KEY, 'filter-options'],
    queryFn: () => fetchAdminComponentCatalogSeriesList({ limit: 500 }),
  });

  const { data: kindsResponse } = useQuery({
    queryKey: [COMPONENT_CATALOG_KINDS_KEY],
    queryFn: fetchAdminComponentCatalogKinds,
  });

  const kindOptions: AdminComponentCatalogKind[] = kindsResponse?.data ?? [];

  const { data: groupsForFilter } = useQuery({
    queryKey: [COMPONENT_CATALOG_GROUPS_KEY, 'filter-options', seriesFilter],
    queryFn: () =>
      fetchAdminComponentCatalogGroupsList({
        limit: 500,
        seriesId: seriesFilter || undefined,
      }),
  });

  const seriesFilterOptions = useMemo(() => seriesForFilter?.data ?? [], [seriesForFilter?.data]);
  const groupFilterOptions = useMemo(() => groupsForFilter?.data ?? [], [groupsForFilter?.data]);

  useEffect(() => {
    if (groupFilter && !groupFilterOptions.some((g) => g.id === groupFilter)) {
      setGroupFilter('');
    }
  }, [groupFilter, groupFilterOptions]);

  const items = listResponse?.data ?? [];
  const totalItems = listResponse?.total ?? 0;

  const handleSortChange = useCallback((nextSortBy: string, nextSortOrder: 'asc' | 'desc') => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  }, []);

  const openCreateItem = useCallback(() => {
    setEditItem(null);
    setCopyFromItem(null);
    setAssignToGroup(null);
    setItemModalOpen(true);
  }, []);

  const openCreateItemInGroup = useCallback(
    (groupId: string, groupName?: string) => {
      const name =
        groupName?.trim() ||
        groupFilterOptions.find((g) => g.id === groupId)?.name ||
        'выбранная группа';
      setEditItem(null);
      setCopyFromItem(null);
      setAssignToGroup({ id: groupId, name });
      setGroupFilter(groupId);
      setTab('items');
      setItemModalOpen(true);
    },
    [groupFilterOptions]
  );

  const openEditItem = useCallback((item: AdminComponentCatalogItem) => {
    setEditItem(item);
    setCopyFromItem(null);
    setAssignToGroup(null);
    setItemModalOpen(true);
  }, []);

  const openCopyItem = useCallback((item: AdminComponentCatalogItem) => {
    setEditItem(null);
    setCopyFromItem(item);
    setAssignToGroup(null);
    setItemModalOpen(true);
  }, []);

  const closeItemModal = useCallback(() => {
    setItemModalOpen(false);
    setEditItem(null);
    setCopyFromItem(null);
    setAssignToGroup(null);
  }, []);

  const handleItemSaved = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_SERIES_KEY] });
  }, [queryClient]);

  const handleDeleteItem = useCallback((item: AdminComponentCatalogItem) => {
    setItemDeleteTarget(item);
  }, []);

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return;
    const item = itemDeleteTarget;
    setDeletingItem(true);
    try {
      await deleteAdminComponentCatalogItem(item.id);
      void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
      void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
      showToast('Удалено', 'ok');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка удаления', 'err');
    } finally {
      setDeletingItem(false);
      setItemDeleteTarget(null);
    }
  }, [itemDeleteTarget, queryClient, showToast]);

  const itemDeleteMessage = useMemo(() => {
    if (!itemDeleteTarget) return '';
    const usage = itemDeleteTarget._count?.productComponents ?? 0;
    const label = [itemDeleteTarget.name, itemDeleteTarget.size, itemDeleteTarget.color]
      .filter(Boolean)
      .join(', ');
    if (usage > 0) {
      return `Удалить «${label}»? Привязки у ${usage} товаров будут отвязаны.`;
    }
    return `Удалить «${label}»?`;
  }, [itemDeleteTarget]);

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_SERIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_KINDS_KEY] });
  }, [queryClient]);

  const isRefreshing =
    useIsFetching({
      predicate: (query) => {
        const key = query.queryKey[0];
        return (
          key === COMPONENT_CATALOG_LIST_KEY ||
          key === COMPONENT_CATALOG_GROUPS_KEY ||
          key === COMPONENT_CATALOG_SERIES_KEY ||
          key === COMPONENT_CATALOG_KINDS_KEY
        );
      },
    }) > 0;

  return {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    kindFilter,
    setKindFilter,
    seriesFilter,
    setSeriesFilter,
    groupFilter,
    setGroupFilter,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    limit,
    setLimit,
    sortBy,
    sortOrder,
    handleSortChange,
    items,
    totalItems,
    itemsLoading,
    itemsFetching,
    refetchItems,
    kindOptions,
    groupFilterOptions,
    seriesFilterOptions,
    itemModalOpen,
    editItem,
    copyFromItem,
    assignToGroup,
    openCreateItem,
    openCreateItemInGroup,
    openEditItem,
    openCopyItem,
    closeItemModal,
    handleItemSaved,
    handleDeleteItem,
    itemDeleteTarget,
    setItemDeleteTarget,
    confirmDeleteItem,
    deletingItem,
    itemDeleteMessage,
    toast,
    showToast,
    invalidateAll,
    isRefreshing,
  };
}

export type ComponentCatalogPageModel = ReturnType<typeof useComponentCatalogPage>;
