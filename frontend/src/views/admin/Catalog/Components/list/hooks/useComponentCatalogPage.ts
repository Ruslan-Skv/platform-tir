'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  type ComponentCatalogAssignToGroup,
  deleteAdminComponentCatalogItem,
  fetchAdminComponentCatalogKinds,
} from '@/shared/api/admin-component-catalog';

export const COMPONENT_CATALOG_TREE_KEY = 'admin-component-catalog-tree';
export const COMPONENT_CATALOG_LIST_KEY = 'admin-component-catalog-list';
export const COMPONENT_CATALOG_GROUPS_KEY = 'admin-component-catalog-groups';
export const COMPONENT_CATALOG_SERIES_KEY = 'admin-component-catalog-series';
export const COMPONENT_CATALOG_KINDS_KEY = 'admin-component-catalog-kinds';

export type ComponentCatalogTab = 'catalog' | 'kinds';

export function useComponentCatalogPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ComponentCatalogTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<AdminComponentCatalogItem | null>(null);
  const [copyFromItem, setCopyFromItem] = useState<AdminComponentCatalogItem | null>(null);
  const [assignToGroup, setAssignToGroup] = useState<ComponentCatalogAssignToGroup | null>(null);
  const [itemDeleteTarget, setItemDeleteTarget] = useState<AdminComponentCatalogItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const showToast = useCallback((text: string, type: 'ok' | 'err') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const { data: kindsResponse } = useQuery({
    queryKey: [COMPONENT_CATALOG_KINDS_KEY],
    queryFn: fetchAdminComponentCatalogKinds,
  });

  const kindOptions: AdminComponentCatalogKind[] = kindsResponse?.data ?? [];

  const openCreateItem = useCallback(() => {
    setEditItem(null);
    setCopyFromItem(null);
    setAssignToGroup(null);
    setItemModalOpen(true);
  }, []);

  const openCreateItemInGroup = useCallback(
    (group: Pick<AdminComponentCatalogGroup, 'id' | 'name' | 'seriesRef'>) => {
      setEditItem(null);
      setCopyFromItem(null);
      setAssignToGroup({
        id: group.id,
        name: group.name,
        seriesSlug: group.seriesRef?.slug,
        seriesName: group.seriesRef?.name,
      });
      setTab('catalog');
      setItemModalOpen(true);
    },
    []
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
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
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
      void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
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
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
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
          key === COMPONENT_CATALOG_TREE_KEY ||
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
    activeFilter,
    setActiveFilter,
    debouncedSearch,
    kindOptions,
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
