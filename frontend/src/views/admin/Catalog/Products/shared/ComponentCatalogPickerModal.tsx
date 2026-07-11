'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  type AdminComponentCatalogTreeResponse,
  type AdminComponentCatalogTreeSeries,
  type AdminComponentCatalogTreeSubgroup,
  fetchAdminComponentCatalogKinds,
  fetchAdminComponentCatalogTree,
  formatCatalogItemLabel,
  getCatalogKindLabel,
} from '@/shared/api/admin-component-catalog';
import { Modal } from '@/shared/ui/Modal';

import styles from './ComponentCatalogPickerModal.module.css';

type PickerMode = 'items' | 'groups';

interface ComponentCatalogPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: AdminComponentCatalogItem[]) => void | Promise<void>;
  onSelectGroup?: (group: AdminComponentCatalogGroup) => void | Promise<void>;
  excludeCatalogIds?: string[];
  saving?: boolean;
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

function filterSeriesForGroupSearch(
  series: AdminComponentCatalogTreeSeries[],
  query: string
): AdminComponentCatalogTreeSeries[] {
  const q = query.trim().toLowerCase();
  if (!q) return series;

  return series
    .map((s) => {
      const seriesMatches =
        s.name.toLowerCase().includes(q) || (s.description?.toLowerCase().includes(q) ?? false);
      const subgroups = seriesMatches
        ? s.subgroups
        : s.subgroups.filter(
            (g) =>
              g.name.toLowerCase().includes(q) ||
              (g.series?.toLowerCase().includes(q) ?? false) ||
              s.name.toLowerCase().includes(q)
          );
      return { ...s, subgroups };
    })
    .filter((s) => s.subgroups.length > 0);
}

export function ComponentCatalogPickerModal({
  open,
  onClose,
  onSelect,
  onSelectGroup,
  excludeCatalogIds = [],
  saving = false,
}: ComponentCatalogPickerModalProps) {
  const [mode, setMode] = useState<PickerMode>('groups');
  const [tree, setTree] = useState<AdminComponentCatalogTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kindId, setKindId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());

  const [kindOptions, setKindOptions] = useState<AdminComponentCatalogKind[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    void fetchAdminComponentCatalogKinds()
      .then((res) => setKindOptions(res.data))
      .catch(() => setKindOptions([]));
  }, [open]);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminComponentCatalogTree({
        search: mode === 'items' ? debouncedSearch || undefined : undefined,
        kindId: mode === 'items' && kindId ? kindId : undefined,
        isActive: true,
      });
      setTree(res);
    } catch {
      setTree({ series: [], ungroupedItems: [] });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, kindId, mode]);

  useEffect(() => {
    if (!open) return;
    void loadTree();
  }, [open, loadTree]);

  const displaySeries = useMemo(() => {
    const series = tree?.series ?? [];
    if (mode === 'groups' && debouncedSearch) {
      return filterSeriesForGroupSearch(series, debouncedSearch);
    }
    return series;
  }, [tree?.series, mode, debouncedSearch]);

  const hasSearch = Boolean(debouncedSearch || (mode === 'items' && kindId));

  useEffect(() => {
    if (!open || !hasSearch) return;
    setExpandedSeries(new Set(displaySeries.map((s) => s.id)));
    setExpandedSubgroups(new Set(displaySeries.flatMap((s) => s.subgroups.map((g) => g.id))));
  }, [open, hasSearch, displaySeries]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSelectedGroupId(null);
      setSearch('');
      setKindId('');
      setMode('groups');
      setTree(null);
      setExpandedSeries(new Set());
      setExpandedSubgroups(new Set());
    }
  }, [open]);

  const excluded = useMemo(() => new Set(excludeCatalogIds), [excludeCatalogIds]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId || !tree) return null;
    for (const series of tree.series) {
      const subgroup = series.subgroups.find((g) => g.id === selectedGroupId);
      if (subgroup) return subgroupToGroup(subgroup, series);
    }
    return null;
  }, [selectedGroupId, tree]);

  const toggleSeries = (id: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubgroup = (id: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (mode === 'groups' && onSelectGroup && selectedGroup) {
      await onSelectGroup(selectedGroup);
      return;
    }

    const picked: AdminComponentCatalogItem[] = [];
    for (const series of tree?.series ?? []) {
      for (const subgroup of series.subgroups) {
        for (const row of subgroup.items) {
          const item = row.catalogItem;
          if (selected.has(item.id) && !excluded.has(item.id)) {
            picked.push(item);
          }
        }
      }
    }
    for (const item of tree?.ungroupedItems ?? []) {
      if (selected.has(item.id) && !excluded.has(item.id)) {
        picked.push(item);
      }
    }
    if (picked.length === 0) return;
    await onSelect(picked);
  };

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const confirmDisabled = saving || (mode === 'groups' ? !selectedGroupId : selected.size === 0);

  const ungroupedVisible = (tree?.ungroupedItems ?? []).filter((item) => !excluded.has(item.id));

  const hasGroupResults = displaySeries.some((s) => s.subgroups.length > 0);
  const hasItemResults =
    displaySeries.some((s) =>
      s.subgroups.some((g) => g.items.some((row) => !excluded.has(row.catalogItem.id)))
    ) || ungroupedVisible.length > 0;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Добавить комплектующие"
      size="lg"
      alignTop
      className={styles.panel}
      contentClassName={styles.content}
    >
      <div className={styles.body}>
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'groups' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('groups')}
          >
            Группа целиком
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'items' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('items')}
          >
            Отдельные позиции
          </button>
        </div>

        <div
          className={styles.filters}
          style={{ gridTemplateColumns: mode === 'items' ? '1fr 180px' : '1fr' }}
        >
          <input
            className={styles.input}
            placeholder={mode === 'groups' ? 'Поиск группы или подгруппы…' : 'Поиск позиции…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {mode === 'items' && (
            <select
              className={styles.select}
              value={kindId}
              onChange={(e) => setKindId(e.target.value)}
            >
              <option value="">Все виды</option>
              {kindOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className={styles.hint}>
          <Link href="/admin/catalog/components" target="_blank" rel="noopener noreferrer">
            Справочник комплектующих
          </Link>
        </p>

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Загрузка…</p>
          ) : mode === 'groups' ? (
            !hasGroupResults ? (
              <p className={styles.empty}>Подгруппы не найдены</p>
            ) : (
              <div className={styles.tree}>
                {displaySeries.map((series) => {
                  const seriesOpen = expandedSeries.has(series.id);
                  return (
                    <div key={series.id} className={styles.seriesBlock}>
                      <button
                        type="button"
                        className={styles.seriesRow}
                        onClick={() => toggleSeries(series.id)}
                        aria-expanded={seriesOpen}
                      >
                        <span className={styles.treeToggle}>{seriesOpen ? '▼' : '▶'}</span>
                        <span className={styles.seriesTitle}>{series.name}</span>
                        <span className={styles.seriesMeta}>{series.subgroups.length} подгр.</span>
                      </button>
                      {seriesOpen ? (
                        <div className={styles.subgroupsWrap}>
                          {series.subgroups.length === 0 ? (
                            <p className={styles.subgroupEmpty}>Подгрупп нет</p>
                          ) : (
                            series.subgroups.map((group) => (
                              <label key={group.id} className={styles.subgroupRow}>
                                <input
                                  type="radio"
                                  name="component-group"
                                  checked={selectedGroupId === group.id}
                                  onChange={() => setSelectedGroupId(group.id)}
                                />
                                <span className={styles.rowMain}>
                                  <span className={styles.rowTitle}>{group.name}</span>
                                  <span className={styles.rowMeta}>
                                    {group.series || 'Без примечания'} · {group.itemCount} поз.
                                  </span>
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : !hasItemResults ? (
            <p className={styles.empty}>Ничего не найдено</p>
          ) : (
            <div className={styles.tree}>
              {displaySeries.map((series) => {
                const visibleSubgroups = series.subgroups.filter((g) =>
                  g.items.some((row) => !excluded.has(row.catalogItem.id))
                );
                if (visibleSubgroups.length === 0) return null;

                const seriesOpen = expandedSeries.has(series.id);
                return (
                  <div key={series.id} className={styles.seriesBlock}>
                    <button
                      type="button"
                      className={styles.seriesRow}
                      onClick={() => toggleSeries(series.id)}
                      aria-expanded={seriesOpen}
                    >
                      <span className={styles.treeToggle}>{seriesOpen ? '▼' : '▶'}</span>
                      <span className={styles.seriesTitle}>{series.name}</span>
                      <span className={styles.seriesMeta}>{visibleSubgroups.length} подгр.</span>
                    </button>
                    {seriesOpen ? (
                      <div className={styles.subgroupsWrap}>
                        {visibleSubgroups.map((group) => {
                          const subgroupOpen = expandedSubgroups.has(group.id);
                          const visibleItems = group.items.filter(
                            (row) => !excluded.has(row.catalogItem.id)
                          );
                          if (visibleItems.length === 0) return null;

                          return (
                            <div key={group.id} className={styles.subgroupBlock}>
                              <button
                                type="button"
                                className={styles.subgroupHeader}
                                onClick={() => toggleSubgroup(group.id)}
                                aria-expanded={subgroupOpen}
                              >
                                <span className={styles.treeToggle}>
                                  {subgroupOpen ? '▼' : '▶'}
                                </span>
                                <span className={styles.subgroupTitle}>{group.name}</span>
                                <span className={styles.subgroupMeta}>
                                  {visibleItems.length} поз.
                                </span>
                              </button>
                              {subgroupOpen ? (
                                <div className={styles.itemsWrap}>
                                  {visibleItems.map((row) => {
                                    const item = row.catalogItem;
                                    return (
                                      <label key={item.id} className={styles.itemRow}>
                                        <input
                                          type="checkbox"
                                          checked={selected.has(item.id)}
                                          onChange={() => toggleItem(item.id)}
                                        />
                                        <span className={styles.rowMain}>
                                          <span className={styles.rowTitle}>
                                            {formatCatalogItemLabel(item)}
                                          </span>
                                          <span className={styles.rowMeta}>
                                            {getCatalogKindLabel(
                                              item.kindId,
                                              kindOptions,
                                              item.kindRef
                                            )}{' '}
                                            · {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                                            {item.material ? ` · ${item.material}` : ''}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {ungroupedVisible.length > 0 ? (
                <div className={styles.ungroupedBlock}>
                  <div className={styles.ungroupedHeader}>Позиции без подгруппы</div>
                  <div className={styles.itemsWrap}>
                    {ungroupedVisible.map((item) => (
                      <label key={item.id} className={styles.itemRow}>
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className={styles.rowMain}>
                          <span className={styles.rowTitle}>{formatCatalogItemLabel(item)}</span>
                          <span className={styles.rowMeta}>
                            {getCatalogKindLabel(item.kindId, kindOptions, item.kindRef)} ·{' '}
                            {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                            {item.material ? ` · ${item.material}` : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div data-modal-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            data-modal-btn="primary"
            onClick={() => void handleConfirm()}
            disabled={confirmDisabled}
          >
            {saving
              ? 'Добавление…'
              : mode === 'groups'
                ? 'Добавить подгруппу'
                : `Добавить (${selected.size})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
