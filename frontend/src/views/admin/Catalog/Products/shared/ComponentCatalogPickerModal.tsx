'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  fetchAdminComponentCatalogGroupsList,
  fetchAdminComponentCatalogKinds,
  fetchAdminComponentCatalogList,
  formatCatalogItemLabel,
  getCatalogKindLabel,
} from '@/shared/api/admin-component-catalog';

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

export function ComponentCatalogPickerModal({
  open,
  onClose,
  onSelect,
  onSelectGroup,
  excludeCatalogIds = [],
  saving = false,
}: ComponentCatalogPickerModalProps) {
  const [mode, setMode] = useState<PickerMode>('groups');
  const [rows, setRows] = useState<AdminComponentCatalogItem[]>([]);
  const [groups, setGroups] = useState<AdminComponentCatalogGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kindId, setKindId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminComponentCatalogList({
        search: debouncedSearch || undefined,
        kindId: kindId || undefined,
        isActive: true,
        limit: 100,
      });
      setRows(res.data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, kindId]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminComponentCatalogGroupsList({
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setGroups(res.data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'items') void loadItems();
    else void loadGroups();
  }, [open, mode, loadItems, loadGroups]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSelectedGroupId(null);
      setSearch('');
      setKindId('');
      setMode('groups');
    }
  }, [open]);

  if (!open) return null;

  const excluded = new Set(excludeCatalogIds);
  const visible = rows.filter((r) => !excluded.has(r.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (mode === 'groups' && onSelectGroup && selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) await onSelectGroup(group);
      return;
    }
    const picked = visible.filter((r) => selected.has(r.id));
    if (picked.length === 0) return;
    await onSelect(picked);
  };

  const confirmDisabled = saving || (mode === 'groups' ? !selectedGroupId : selected.size === 0);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Добавить комплектующие</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

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

        <div className={styles.filters}>
          <input
            className={styles.input}
            placeholder={mode === 'groups' ? 'Поиск подгруппы…' : 'Поиск позиции…'}
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
            groups.length === 0 ? (
              <p className={styles.empty}>Подгруппы не найдены</p>
            ) : (
              groups.map((group) => (
                <label key={group.id} className={styles.row}>
                  <input
                    type="radio"
                    name="component-group"
                    checked={selectedGroupId === group.id}
                    onChange={() => setSelectedGroupId(group.id)}
                  />
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {group.seriesRef?.name ? `${group.seriesRef.name} · ` : ''}
                      {group.name}
                    </span>
                    <span className={styles.rowMeta}>
                      {group.series || group.seriesRef?.name || 'Без примечания'} ·{' '}
                      {group._count?.items ?? group.items.length} поз.
                    </span>
                  </span>
                </label>
              ))
            )
          ) : visible.length === 0 ? (
            <p className={styles.empty}>Ничего не найдено</p>
          ) : (
            visible.map((row) => (
              <label key={row.id} className={styles.row}>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                />
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{formatCatalogItemLabel(row)}</span>
                  <span className={styles.rowMeta}>
                    {getCatalogKindLabel(row.kindId, kindOptions, row.kindRef)} ·{' '}
                    {parseFloat(row.price).toLocaleString('ru-RU')} ₽
                    {row.material ? ` · ${row.material}` : ''}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
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
    </div>
  );
}
