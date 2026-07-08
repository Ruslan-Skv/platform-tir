'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogItem,
  type ComponentKind,
  deleteAdminComponentCatalogItem,
  fetchAdminComponentCatalogGroupsList,
  fetchAdminComponentCatalogList,
} from '@/shared/api/admin-component-catalog';

export const COMPONENT_CATALOG_LIST_KEY = 'admin-component-catalog-list';
export const COMPONENT_CATALOG_GROUPS_KEY = 'admin-component-catalog-groups';

const LIMIT_STORAGE_KEY = 'admin_component_catalog_page_limit';

export type ComponentCatalogTab = 'items' | 'groups';

export function useComponentCatalogPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ComponentCatalogTab>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<ComponentKind | ''>('');
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
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kindFilter, groupFilter, activeFilter, limit, tab]);

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
      kind: kindFilter || undefined,
      groupId: groupFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [debouncedSearch, kindFilter, groupFilter, activeFilter, page, limit, sortBy, sortOrder]
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

  const { data: groupsForFilter } = useQuery({
    queryKey: [COMPONENT_CATALOG_GROUPS_KEY, 'filter-options'],
    queryFn: () => fetchAdminComponentCatalogGroupsList({ limit: 500 }),
  });

  const groupFilterOptions = useMemo(() => groupsForFilter?.data ?? [], [groupsForFilter?.data]);

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
  }, [queryClient]);

  const handleDeleteItem = useCallback(
    async (item: AdminComponentCatalogItem) => {
      const usage = item._count?.productComponents ?? 0;
      const label = [item.name, item.size, item.color].filter(Boolean).join(', ');
      const msg =
        usage > 0
          ? `Удалить «${label}»? Привязки у ${usage} товаров будут отвязаны.`
          : `Удалить «${label}»?`;
      if (!confirm(msg)) return;
      try {
        await deleteAdminComponentCatalogItem(item.id);
        void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
        void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
        showToast('Удалено', 'ok');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка удаления', 'err');
      }
    },
    [queryClient, showToast]
  );

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
  }, [queryClient]);

  return {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    kindFilter,
    setKindFilter,
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
    groupFilterOptions,
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
    toast,
    showToast,
    invalidateAll,
  };
}

export type ComponentCatalogPageModel = ReturnType<typeof useComponentCatalogPage>;
