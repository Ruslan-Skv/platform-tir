'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  type AdminComponentCatalogSeries,
  type AdminComponentCatalogTreeResponse,
  type AdminComponentCatalogTreeSeries,
  type AdminComponentCatalogTreeSubgroup,
  deleteAdminComponentCatalogGroup,
  deleteAdminComponentCatalogSeries,
  fetchAdminComponentCatalogTree,
  reorderAdminComponentCatalogGroups,
  reorderAdminComponentCatalogSeries,
} from '@/shared/api/admin-component-catalog';
import { getCatalogKindLabel } from '@/shared/api/admin-component-catalog';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon } from '@/shared/ui/icons';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import styles from '../list/ComponentCatalogPage.module.css';
import {
  COMPONENT_CATALOG_GROUPS_KEY,
  COMPONENT_CATALOG_LIST_KEY,
  COMPONENT_CATALOG_SERIES_KEY,
  COMPONENT_CATALOG_TREE_KEY,
} from '../list/hooks/useComponentCatalogPage';
import {
  ComponentCatalogSeriesModal,
  ComponentCatalogSubgroupModal,
} from './ComponentCatalogGroupsPanel';
import { ComponentCatalogSubgroupCopyModal } from './ComponentCatalogSubgroupCopyModal';

const EXPANDED_STORAGE_KEY = 'admin_component_catalog_tree_expanded';

type ExpandedState = {
  series: string[];
  subgroups: string[];
};

type ComponentCatalogTreePanelProps = {
  kindOptions: AdminComponentCatalogKind[];
  search: string;
  kindFilter: string;
  activeFilter: '' | 'true' | 'false';
  onToast: (text: string, type: 'ok' | 'err') => void;
  onEditItem: (item: AdminComponentCatalogItem) => void;
  onCopyItem: (item: AdminComponentCatalogItem) => void;
  onDeleteItem: (item: AdminComponentCatalogItem) => void;
  onCreateItemInGroup: (group: AdminComponentCatalogGroup) => void;
};

function loadExpanded(): ExpandedState {
  if (typeof window === 'undefined') return { series: [], subgroups: [] };
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return { series: [], subgroups: [] };
    const parsed = JSON.parse(raw) as ExpandedState;
    return {
      series: Array.isArray(parsed.series) ? parsed.series : [],
      subgroups: Array.isArray(parsed.subgroups) ? parsed.subgroups : [],
    };
  } catch {
    return { series: [], subgroups: [] };
  }
}

function saveExpanded(state: ExpandedState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(state));
}

function subgroupToGroup(
  subgroup: AdminComponentCatalogTreeSubgroup,
  series: AdminComponentCatalogTreeSeries
): AdminComponentCatalogGroup {
  return {
    id: subgroup.id,
    seriesId: subgroup.seriesId,
    name: subgroup.name,
    series: subgroup.series,
    categoryId: null,
    slug: subgroup.slug,
    isActive: subgroup.isActive,
    sortOrder: subgroup.sortOrder,
    seriesRef: { id: series.id, name: series.name, slug: series.slug },
    items: subgroup.items.map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      catalogItem: row.catalogItem,
    })),
    _count: { items: subgroup.itemCount },
  };
}

function seriesToAdminSeries(series: AdminComponentCatalogTreeSeries): AdminComponentCatalogSeries {
  return {
    id: series.id,
    name: series.name,
    description: series.description,
    categoryId: null,
    slug: series.slug,
    isActive: series.isActive,
    sortOrder: series.sortOrder,
    _count: { subgroups: series.subgroupCount },
  };
}

function sortByOrder<T extends { id: string; sortOrder: number; name?: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      (a.name ?? '').localeCompare(b.name ?? '', 'ru') ||
      a.id.localeCompare(b.id)
  );
}

function swapSiblingsInOrder<T extends { id: string; sortOrder: number; name?: string }>(
  siblings: T[],
  idx: number,
  j: number
): T[] {
  const sorted = sortByOrder(siblings);
  const reordered = [...sorted];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  return reordered.map((item, i) => ({ ...item, sortOrder: i }));
}

function buildRenumberedOrderAfterSwap<T extends { id: string; sortOrder: number; name?: string }>(
  siblings: T[],
  idx: number,
  j: number
): { id: string; sortOrder: number }[] {
  return swapSiblingsInOrder(siblings, idx, j).map((s) => ({ id: s.id, sortOrder: s.sortOrder }));
}

function formatProductCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} товара`;
  }
  return `${count} товаров`;
}

export function ComponentCatalogTreePanel({
  kindOptions,
  search,
  kindFilter,
  activeFilter,
  onToast,
  onEditItem,
  onCopyItem,
  onDeleteItem,
  onCreateItemInGroup,
}: ComponentCatalogTreePanelProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<ExpandedState>(loadExpanded);

  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [editSeries, setEditSeries] = useState<AdminComponentCatalogSeries | null>(null);

  const [subgroupModalOpen, setSubgroupModalOpen] = useState(false);
  const [editSubgroup, setEditSubgroup] = useState<AdminComponentCatalogGroup | null>(null);
  const [createSubgroupSeriesId, setCreateSubgroupSeriesId] = useState<string | null>(null);

  const [copySource, setCopySource] = useState<AdminComponentCatalogGroup | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const [subgroupDeleteTarget, setSubgroupDeleteTarget] =
    useState<AdminComponentCatalogGroup | null>(null);
  const [deletingSubgroup, setDeletingSubgroup] = useState(false);
  const [seriesDeleteTarget, setSeriesDeleteTarget] = useState<AdminComponentCatalogSeries | null>(
    null
  );
  const [deletingSeries, setDeletingSeries] = useState(false);
  const [reorderBusyKey, setReorderBusyKey] = useState<string | null>(null);

  const treeParams = useMemo(
    () => ({
      search: search || undefined,
      kindId: kindFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    }),
    [search, kindFilter, activeFilter]
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [COMPONENT_CATALOG_TREE_KEY, treeParams],
    queryFn: () => fetchAdminComponentCatalogTree(treeParams),
  });

  const hasFilter = Boolean(search || kindFilter || activeFilter);
  const reorderDisabled = hasFilter;
  const reorderInProgress = reorderBusyKey !== null;
  const reorderHint = reorderDisabled
    ? 'Сбросьте фильтры для изменения порядка'
    : 'Изменить порядок';

  useEffect(() => {
    if (!data || !hasFilter) return;
    const seriesIds = data.series.map((s) => s.id);
    const subgroupIds = data.series.flatMap((s) => s.subgroups.map((g) => g.id));
    setExpanded({ series: seriesIds, subgroups: subgroupIds });
  }, [data, hasFilter]);

  useEffect(() => {
    saveExpanded(expanded);
  }, [expanded]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_SERIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
  }, [queryClient]);

  const toggleSeries = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      series: prev.series.includes(id) ? prev.series.filter((x) => x !== id) : [...prev.series, id],
    }));
  };

  const toggleSubgroup = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      subgroups: prev.subgroups.includes(id)
        ? prev.subgroups.filter((x) => x !== id)
        : [...prev.subgroups, id],
    }));
  };

  const reorderSeries = useCallback(
    async (seriesId: string, direction: 'up' | 'down') => {
      if (reorderDisabled || !data) return;
      const siblings = sortByOrder(data.series);
      const idx = siblings.findIndex((s) => s.id === seriesId);
      if (idx < 0) return;
      const j = direction === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= siblings.length) return;

      const queryKey = [COMPONENT_CATALOG_TREE_KEY, treeParams] as const;
      const previousData = data;
      const newSeries = swapSiblingsInOrder(data.series, idx, j);

      queryClient.setQueryData<AdminComponentCatalogTreeResponse>(queryKey, {
        ...data,
        series: newSeries,
      });

      setReorderBusyKey(`series:${seriesId}`);
      try {
        await reorderAdminComponentCatalogSeries(buildRenumberedOrderAfterSwap(siblings, idx, j));
        await queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
        invalidate();
        onToast('Порядок групп моделей обновлён', 'ok');
      } catch (e) {
        queryClient.setQueryData(queryKey, previousData);
        onToast(e instanceof Error ? e.message : 'Ошибка изменения порядка', 'err');
      } finally {
        setReorderBusyKey(null);
      }
    },
    [data, invalidate, onToast, queryClient, reorderDisabled, treeParams]
  );

  const reorderSubgroup = useCallback(
    async (seriesId: string, subgroupId: string, direction: 'up' | 'down') => {
      if (reorderDisabled || !data) return;
      const parent = data.series.find((s) => s.id === seriesId);
      if (!parent) return;
      const siblings = sortByOrder(parent.subgroups);
      const idx = siblings.findIndex((g) => g.id === subgroupId);
      if (idx < 0) return;
      const j = direction === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= siblings.length) return;

      const queryKey = [COMPONENT_CATALOG_TREE_KEY, treeParams] as const;
      const previousData = data;
      const newSubgroups = swapSiblingsInOrder(parent.subgroups, idx, j);
      const newSeries = data.series.map((s) =>
        s.id === seriesId ? { ...s, subgroups: newSubgroups } : s
      );

      queryClient.setQueryData<AdminComponentCatalogTreeResponse>(queryKey, {
        ...data,
        series: newSeries,
      });

      setReorderBusyKey(`subgroup:${subgroupId}`);
      try {
        await reorderAdminComponentCatalogGroups(buildRenumberedOrderAfterSwap(siblings, idx, j));
        await queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_TREE_KEY] });
        invalidate();
        onToast('Порядок подгрупп обновлён', 'ok');
      } catch (e) {
        queryClient.setQueryData(queryKey, previousData);
        onToast(e instanceof Error ? e.message : 'Ошибка изменения порядка', 'err');
      } finally {
        setReorderBusyKey(null);
      }
    },
    [data, invalidate, onToast, queryClient, reorderDisabled, treeParams]
  );

  const confirmDeleteSeries = useCallback(async () => {
    if (!seriesDeleteTarget) return;
    setDeletingSeries(true);
    try {
      await deleteAdminComponentCatalogSeries(seriesDeleteTarget.id);
      invalidate();
      onToast('Группа моделей удалена', 'ok');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setDeletingSeries(false);
      setSeriesDeleteTarget(null);
    }
  }, [invalidate, onToast, seriesDeleteTarget]);

  const confirmDeleteSubgroup = useCallback(async () => {
    if (!subgroupDeleteTarget) return;
    setDeletingSubgroup(true);
    try {
      await deleteAdminComponentCatalogGroup(subgroupDeleteTarget.id);
      invalidate();
      onToast('Подгруппа удалена', 'ok');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setDeletingSubgroup(false);
      setSubgroupDeleteTarget(null);
    }
  }, [invalidate, onToast, subgroupDeleteTarget]);

  const seriesDeleteMessage = useMemo(() => {
    if (!seriesDeleteTarget) return '';
    const count = seriesDeleteTarget._count?.subgroups ?? 0;
    if (count > 0) {
      return `Удалить группу моделей «${seriesDeleteTarget.name}» вместе с ${count} подгруппами? Позиции справочника останутся.`;
    }
    return `Удалить группу моделей «${seriesDeleteTarget.name}»?`;
  }, [seriesDeleteTarget]);

  const subgroupDeleteMessage = useMemo(() => {
    if (!subgroupDeleteTarget) return '';
    const count = subgroupDeleteTarget._count?.items ?? subgroupDeleteTarget.items?.length ?? 0;
    if (count === 0) {
      return `Удалить подгруппу «${subgroupDeleteTarget.name}»? Она пуста, позиции справочника не затрагиваются.`;
    }
    return `Удалить подгруппу «${subgroupDeleteTarget.name}»? Позиции справочника (${count}) останутся в каталоге.`;
  }, [subgroupDeleteTarget]);

  const seriesListForModals = useMemo(
    () => (data?.series ?? []).map(seriesToAdminSeries),
    [data?.series]
  );

  const series = useMemo(
    () =>
      sortByOrder(data?.series ?? []).map((s) => {
        const subgroups = sortByOrder(s.subgroups);
        const productCount =
          s.productCount ?? subgroups.reduce((sum, g) => sum + (g.productCount ?? 0), 0);
        return { ...s, subgroups, productCount };
      }),
    [data?.series]
  );
  const ungrouped = data?.ungroupedItems ?? [];

  if (isLoading) {
    return <div className={styles.loadingOverlay}>Загрузка…</div>;
  }

  return (
    <>
      <ComponentCatalogSeriesModal
        open={seriesModalOpen}
        series={editSeries}
        onClose={() => {
          setSeriesModalOpen(false);
          setEditSeries(null);
        }}
        onSaved={() => {
          invalidate();
          setSeriesModalOpen(false);
          setEditSeries(null);
          onToast('Группа моделей сохранена', 'ok');
        }}
        onError={(msg) => onToast(msg, 'err')}
      />

      <ComponentCatalogSubgroupModal
        open={subgroupModalOpen}
        subgroup={editSubgroup}
        seriesId={editSubgroup?.seriesId ?? createSubgroupSeriesId}
        seriesList={seriesListForModals}
        onClose={() => {
          setSubgroupModalOpen(false);
          setEditSubgroup(null);
          setCreateSubgroupSeriesId(null);
        }}
        onCreateItemInGroup={
          onCreateItemInGroup
            ? (group) => {
                setSubgroupModalOpen(false);
                setEditSubgroup(null);
                setCreateSubgroupSeriesId(null);
                onCreateItemInGroup(group);
              }
            : undefined
        }
        onSaved={() => {
          invalidate();
          setSubgroupModalOpen(false);
          setEditSubgroup(null);
          setCreateSubgroupSeriesId(null);
          onToast('Подгруппа сохранена', 'ok');
        }}
        onError={(msg) => onToast(msg, 'err')}
      />

      <ComponentCatalogSubgroupCopyModal
        open={copyModalOpen}
        sourceGroup={copySource}
        onClose={() => {
          setCopyModalOpen(false);
          setCopySource(null);
        }}
        onCopied={() => {
          invalidate();
          setCopyModalOpen(false);
          setCopySource(null);
          onToast('Подгруппа скопирована', 'ok');
        }}
        onError={(msg) => onToast(msg, 'err')}
      />

      {seriesDeleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить группу моделей?"
          message={seriesDeleteMessage}
          confirmText={deletingSeries ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => void confirmDeleteSeries()}
          onClose={() => {
            if (!deletingSeries) setSeriesDeleteTarget(null);
          }}
        />
      ) : null}

      {subgroupDeleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить подгруппу?"
          message={subgroupDeleteMessage}
          confirmText={deletingSubgroup ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => void confirmDeleteSubgroup()}
          onClose={() => {
            if (!deletingSubgroup) setSubgroupDeleteTarget(null);
          }}
        />
      ) : null}

      <div className={styles.treeToolbar}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            setEditSeries(null);
            setSeriesModalOpen(true);
          }}
        >
          + Группа моделей
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Обновление…' : 'Обновить дерево'}
        </button>
      </div>

      {series.length === 0 && ungrouped.length === 0 ? (
        <p className={styles.treeEmpty}>
          {hasFilter
            ? 'Ничего не найдено. Сбросьте фильтры или создайте группу моделей.'
            : 'Справочник пуст. Создайте группу моделей, затем подгруппу по цвету и позиции комплектующих.'}
        </p>
      ) : (
        <div className={styles.catalogTree}>
          {series.map((s, seriesIndex) => {
            const seriesOpen = expanded.series.includes(s.id);
            const canMoveSeriesUp = seriesIndex > 0;
            const canMoveSeriesDown = seriesIndex < series.length - 1;
            return (
              <div key={s.id} className={styles.treeSeriesBlock}>
                <div className={styles.treeSeriesRow}>
                  <button
                    type="button"
                    className={styles.treeToggle}
                    onClick={() => toggleSeries(s.id)}
                    aria-expanded={seriesOpen}
                  >
                    {seriesOpen ? '▼' : '▶'}
                  </button>
                  <div className={styles.treeSeriesMain}>
                    <span className={styles.treeSeriesTitle}>{s.name}</span>
                    {s.description ? (
                      <span className={styles.treeSeriesMeta}>{s.description}</span>
                    ) : null}
                    <span className={styles.treeSeriesMeta}>
                      {s.subgroupCount} подгр. · {s.itemCount} поз. ·{' '}
                      {formatProductCountLabel(s.productCount ?? 0)}
                    </span>
                  </div>
                  <div className={styles.treeRowActions}>
                    <div className={styles.treeReorderButtons}>
                      <button
                        type="button"
                        className={styles.treeReorderButton}
                        disabled={!canMoveSeriesUp || reorderInProgress || reorderDisabled}
                        title={reorderHint}
                        aria-label="Переместить группу моделей вверх"
                        onClick={() => void reorderSeries(s.id, 'up')}
                      >
                        <ChevronUp className={styles.treeReorderIconSeries} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.treeReorderButton}
                        disabled={!canMoveSeriesDown || reorderInProgress || reorderDisabled}
                        title={reorderHint}
                        aria-label="Переместить группу моделей вниз"
                        onClick={() => void reorderSeries(s.id, 'down')}
                      >
                        <ChevronDown className={styles.treeReorderIconSeries} aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setCreateSubgroupSeriesId(s.id);
                        setEditSubgroup(null);
                        setSubgroupModalOpen(true);
                      }}
                    >
                      + Подгруппа
                    </button>
                    <AdminTableIconButton
                      title="Редактировать группу"
                      onClick={() => {
                        setEditSeries(seriesToAdminSeries(s));
                        setSeriesModalOpen(true);
                      }}
                    >
                      <EditIcon />
                    </AdminTableIconButton>
                    <AdminTableIconButton
                      title="Удалить группу"
                      onClick={() => setSeriesDeleteTarget(seriesToAdminSeries(s))}
                    >
                      <DeleteIcon />
                    </AdminTableIconButton>
                  </div>
                </div>

                {seriesOpen ? (
                  <div className={styles.treeSubgroups}>
                    {s.subgroups.length === 0 ? (
                      <p className={styles.treeSubgroupEmpty}>Подгрупп пока нет</p>
                    ) : (
                      s.subgroups.map((g, subgroupIndex) => {
                        const subgroupOpen = expanded.subgroups.includes(g.id);
                        const group = subgroupToGroup(g, s);
                        const canMoveSubgroupUp = subgroupIndex > 0;
                        const canMoveSubgroupDown = subgroupIndex < s.subgroups.length - 1;
                        return (
                          <div key={g.id} className={styles.treeSubgroupBlock}>
                            <div className={styles.treeSubgroupRow}>
                              <button
                                type="button"
                                className={styles.treeToggle}
                                onClick={() => toggleSubgroup(g.id)}
                                aria-expanded={subgroupOpen}
                              >
                                {subgroupOpen ? '▼' : '▶'}
                              </button>
                              <div className={styles.treeSubgroupMain}>
                                <span className={styles.treeSubgroupTitle}>{g.name}</span>
                                {g.series ? (
                                  <span className={styles.treeSubgroupMeta}>{g.series}</span>
                                ) : null}
                                <span className={styles.treeSubgroupMeta}>
                                  {g.items.length} поз. ·{' '}
                                  {formatProductCountLabel(g.productCount ?? 0)}
                                </span>
                              </div>
                              <div className={styles.treeRowActions}>
                                <div className={styles.treeReorderButtons}>
                                  <button
                                    type="button"
                                    className={styles.treeReorderButton}
                                    disabled={
                                      !canMoveSubgroupUp || reorderInProgress || reorderDisabled
                                    }
                                    title={reorderHint}
                                    aria-label="Переместить подгруппу вверх"
                                    onClick={() => void reorderSubgroup(s.id, g.id, 'up')}
                                  >
                                    <ChevronUp
                                      className={styles.treeReorderIconSubgroup}
                                      aria-hidden
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.treeReorderButton}
                                    disabled={
                                      !canMoveSubgroupDown || reorderInProgress || reorderDisabled
                                    }
                                    title={reorderHint}
                                    aria-label="Переместить подгруппу вниз"
                                    onClick={() => void reorderSubgroup(s.id, g.id, 'down')}
                                  >
                                    <ChevronDown
                                      className={styles.treeReorderIconSubgroup}
                                      aria-hidden
                                    />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className={styles.addButton}
                                  onClick={() => onCreateItemInGroup(group)}
                                >
                                  + Позиция
                                </button>
                                <AdminTableIconButton
                                  title="Копировать подгруппу"
                                  onClick={() => {
                                    setCopySource(group);
                                    setCopyModalOpen(true);
                                  }}
                                >
                                  <CopyIcon />
                                </AdminTableIconButton>
                                <AdminTableIconButton
                                  title="Редактировать подгруппу"
                                  onClick={() => {
                                    setEditSubgroup(group);
                                    setCreateSubgroupSeriesId(null);
                                    setSubgroupModalOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </AdminTableIconButton>
                                <AdminTableIconButton
                                  title="Удалить подгруппу"
                                  onClick={() => setSubgroupDeleteTarget(group)}
                                >
                                  <DeleteIcon />
                                </AdminTableIconButton>
                              </div>
                            </div>

                            {subgroupOpen ? (
                              <table className={styles.treeItemsTable}>
                                <thead>
                                  <tr>
                                    <th>Вид</th>
                                    <th>Название</th>
                                    <th>Размер</th>
                                    <th>Цвет</th>
                                    <th>Цена</th>
                                    <th>Остаток</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className={styles.treeItemsEmpty}>
                                        Нет позиций — нажмите «+ Позиция»
                                      </td>
                                    </tr>
                                  ) : (
                                    g.items.map((row) => {
                                      const item = row.catalogItem;
                                      return (
                                        <tr key={row.id}>
                                          <td>
                                            {getCatalogKindLabel(
                                              item.kindId,
                                              kindOptions,
                                              item.kindRef
                                            )}
                                          </td>
                                          <td>{item.name}</td>
                                          <td>{item.size || '—'}</td>
                                          <td>{item.color || '—'}</td>
                                          <td className={styles.subgroupPriceCell}>
                                            {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                                          </td>
                                          <td
                                            className={
                                              item.stock <= 0
                                                ? styles.subgroupStockEmpty
                                                : styles.subgroupStockCell
                                            }
                                          >
                                            {item.stock.toLocaleString('ru-RU')}
                                          </td>
                                          <td>
                                            <div className={styles.tableRowActions}>
                                              <AdminTableIconButton
                                                title="Редактировать"
                                                onClick={() => onEditItem(item)}
                                              >
                                                <EditIcon />
                                              </AdminTableIconButton>
                                              <AdminTableIconButton
                                                title="Копировать"
                                                onClick={() => onCopyItem(item)}
                                              >
                                                <CopyIcon />
                                              </AdminTableIconButton>
                                              <AdminTableIconButton
                                                title="Удалить"
                                                onClick={() => onDeleteItem(item)}
                                              >
                                                <DeleteIcon />
                                              </AdminTableIconButton>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {ungrouped.length > 0 ? (
            <div className={styles.treeUngroupedBlock}>
              <div className={styles.treeUngroupedHeader}>
                <strong>Позиции без подгруппы</strong>
                <span className={styles.treeSeriesMeta}>{ungrouped.length} поз.</span>
              </div>
              <table className={styles.treeItemsTable}>
                <thead>
                  <tr>
                    <th>Вид</th>
                    <th>Название</th>
                    <th>Размер</th>
                    <th>Цвет</th>
                    <th>Цена</th>
                    <th>Остаток</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ungrouped.map((item) => (
                    <tr key={item.id}>
                      <td>{getCatalogKindLabel(item.kindId, kindOptions, item.kindRef)}</td>
                      <td>{item.name}</td>
                      <td>{item.size || '—'}</td>
                      <td>{item.color || '—'}</td>
                      <td className={styles.subgroupPriceCell}>
                        {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                      </td>
                      <td
                        className={
                          item.stock <= 0 ? styles.subgroupStockEmpty : styles.subgroupStockCell
                        }
                      >
                        {item.stock.toLocaleString('ru-RU')}
                      </td>
                      <td>
                        <div className={styles.tableRowActions}>
                          <AdminTableIconButton
                            title="Редактировать"
                            onClick={() => onEditItem(item)}
                          >
                            <EditIcon />
                          </AdminTableIconButton>
                          <AdminTableIconButton title="Копировать" onClick={() => onCopyItem(item)}>
                            <CopyIcon />
                          </AdminTableIconButton>
                          <AdminTableIconButton title="Удалить" onClick={() => onDeleteItem(item)}>
                            <DeleteIcon />
                          </AdminTableIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
