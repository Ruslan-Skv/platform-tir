'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogGroup,
  COMPONENT_KIND_LABELS,
  createAdminComponentCatalogGroup,
  deleteAdminComponentCatalogGroup,
  fetchAdminComponentCatalogGroupsList,
  fetchAdminComponentCatalogList,
  formatCatalogItemLabel,
  slugifyComponentCatalog,
  updateAdminComponentCatalogGroup,
} from '@/shared/api/admin-component-catalog';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import modalStyles from './ComponentCatalogModal.module.css';
import styles from './ComponentCatalogPage.module.css';
import {
  COMPONENT_CATALOG_GROUPS_KEY,
  COMPONENT_CATALOG_LIST_KEY,
} from './hooks/useComponentCatalogPage';

type ComponentCatalogGroupsPanelProps = {
  onToast: (text: string, type: 'ok' | 'err') => void;
  onSelectGroupFilter?: (groupId: string) => void;
  onCreateItemInGroup?: (group: AdminComponentCatalogGroup) => void;
};

export function ComponentCatalogGroupsPanel({
  onToast,
  onSelectGroupFilter,
  onCreateItemInGroup,
}: ComponentCatalogGroupsPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AdminComponentCatalogGroup | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [COMPONENT_CATALOG_GROUPS_KEY, debouncedSearch, page, limit],
    queryFn: () =>
      fetchAdminComponentCatalogGroupsList({
        search: debouncedSearch || undefined,
        page,
        limit,
      }),
    placeholderData: keepPreviousData,
  });

  const groups = data?.data ?? [];
  const total = data?.total ?? 0;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
  }, [queryClient]);

  const handleDelete = useCallback(
    async (group: AdminComponentCatalogGroup) => {
      if (!confirm(`Удалить группу «${group.name}»? Позиции справочника останутся.`)) return;
      try {
        await deleteAdminComponentCatalogGroup(group.id);
        invalidate();
        onToast('Группа удалена', 'ok');
      } catch (e) {
        onToast(e instanceof Error ? e.message : 'Ошибка', 'err');
      }
    },
    [invalidate, onToast]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Группа / цвет',
        sortable: false,
        render: (g: AdminComponentCatalogGroup) => (
          <div style={{ minWidth: 280, maxWidth: 520 }}>
            <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{g.name}</div>
            {g.series && (
              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                {g.series}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'items',
        title: 'Позиций',
        width: '90px',
        render: (g: AdminComponentCatalogGroup) => g._count?.items ?? g.items.length,
      },
      {
        key: 'isActive',
        title: 'Статус',
        width: '100px',
        render: (g: AdminComponentCatalogGroup) => (
          <span
            className={`${styles.badge} ${g.isActive ? styles.badgeActive : styles.badgeInactive}`}
          >
            {g.isActive ? 'Активна' : 'Скрыта'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '',
        width: '140px',
        render: (g: AdminComponentCatalogGroup) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <AdminTableIconButton
              title="Состав группы"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId((prev) => (prev === g.id ? null : g.id));
              }}
            >
              ≡
            </AdminTableIconButton>
            <AdminTableIconButton
              title="Редактировать"
              onClick={(e) => {
                e.stopPropagation();
                setEditGroup(g);
                setModalOpen(true);
              }}
            >
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              title="Удалить"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete(g);
              }}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        ),
      },
    ],
    [handleDelete]
  );

  return (
    <>
      <ComponentCatalogGroupModal
        open={modalOpen}
        group={editGroup}
        onClose={() => {
          setModalOpen(false);
          setEditGroup(null);
        }}
        onCreateItemInGroup={
          onCreateItemInGroup
            ? (group) => {
                setModalOpen(false);
                setEditGroup(null);
                onCreateItemInGroup(group);
              }
            : undefined
        }
        onSaved={() => {
          invalidate();
          setModalOpen(false);
          setEditGroup(null);
          onToast('Группа сохранена', 'ok');
        }}
        onError={(msg) => onToast(msg, 'err')}
      />

      <div className={styles.filters}>
        <div className={styles.searchField}>
          <label className={styles.filterLabel}>Поиск по группе или серии</label>
          <input
            type="search"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ЛОФТ, Бетон, телескопический…"
          />
        </div>
        <div>
          <label className={styles.filterLabel}>На странице</label>
          <select
            className={styles.select}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.filterLabel}>&nbsp;</label>
          <button type="button" className={styles.refreshButton} onClick={() => void refetch()}>
            {isFetching ? '…' : '↻'}
          </button>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <label className={styles.filterLabel}>&nbsp;</label>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => {
              setEditGroup(null);
              setModalOpen(true);
            }}
          >
            + Новая группа
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingOverlay}>Загрузка групп…</div>
      ) : (
        <>
          <DataTable
            paginationClassName={styles.pagination}
            paginationActiveClassName={styles.paginationPageActive}
            data={groups}
            columns={columns}
            keyExtractor={(g) => g.id}
            serverSidePagination
            pagination={{ page, limit, total, onPageChange: setPage }}
            onRowClick={(g) => setExpandedId((prev) => (prev === g.id ? null : g.id))}
          />

          {expandedId && groups.find((g) => g.id === expandedId) && (
            <GroupItemsDetail
              group={groups.find((g) => g.id === expandedId)!}
              onSelectGroupFilter={onSelectGroupFilter}
              onCreateItemInGroup={onCreateItemInGroup}
            />
          )}
        </>
      )}
    </>
  );
}

function GroupItemsDetail({
  group,
  onSelectGroupFilter,
  onCreateItemInGroup,
}: {
  group: AdminComponentCatalogGroup;
  onSelectGroupFilter?: (groupId: string) => void;
  onCreateItemInGroup?: (group: AdminComponentCatalogGroup) => void;
}) {
  if (!group) return null;
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        border: '1px solid var(--admin-border)',
        borderRadius: 8,
        background: 'var(--admin-surface-muted, #f9fafb)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ lineHeight: 1.4, maxWidth: 'min(100%, 720px)' }}>
          Состав: {group.name}
        </strong>
        <div className={styles.groupDetailActions}>
          {onCreateItemInGroup ? (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => onCreateItemInGroup(group)}
            >
              + Добавить позицию
            </button>
          ) : null}
          {onSelectGroupFilter ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onSelectGroupFilter(group.id)}
            >
              Показать позиции группы
            </button>
          ) : null}
        </div>
      </div>
      {group.items.length === 0 ? (
        <p className={styles.groupCompositionHint}>
          В группе пока нет позиций. Нажмите «Добавить позицию», чтобы создать стойку, наличник или
          добор с нужным цветом — карточка сразу попадёт в эту группу. Либо откройте редактирование
          группы и отметьте уже существующие позиции в справочнике.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ padding: '6px 8px' }}>Вид</th>
              <th style={{ padding: '6px 8px' }}>Наименование</th>
              <th style={{ padding: '6px 8px' }}>Размер</th>
              <th style={{ padding: '6px 8px' }}>Цвет</th>
              <th style={{ padding: '6px 8px' }}>Материал</th>
              <th style={{ padding: '6px 8px' }}>Цена</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td style={{ padding: '8px' }}>{COMPONENT_KIND_LABELS[row.catalogItem.kind]}</td>
                <td style={{ padding: '8px' }}>{row.catalogItem.name}</td>
                <td style={{ padding: '8px' }}>{row.catalogItem.size || '—'}</td>
                <td style={{ padding: '8px' }}>{row.catalogItem.color || '—'}</td>
                <td style={{ padding: '8px' }}>{row.catalogItem.material || '—'}</td>
                <td style={{ padding: '8px', fontWeight: 600 }}>
                  {parseFloat(row.catalogItem.price).toLocaleString('ru-RU')} ₽
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ComponentCatalogGroupModal({
  open,
  group,
  onClose,
  onSaved,
  onError,
  onCreateItemInGroup,
}: {
  open: boolean;
  group: AdminComponentCatalogGroup | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  onCreateItemInGroup?: (group: AdminComponentCatalogGroup) => void;
}) {
  const [name, setName] = useState('');
  const [series, setSeries] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: catalogSearch } = useQuery({
    queryKey: ['component-catalog-group-picker', itemSearch],
    queryFn: () => fetchAdminComponentCatalogList({ search: itemSearch || undefined, limit: 100 }),
    enabled: open,
  });

  const pickerItems = catalogSearch?.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (group) {
      setName(group.name);
      setSeries(group.series ?? '');
      setSlug(group.slug);
      setSelectedIds(group.items.map((i) => i.catalogItem.id));
      setAutoSlug(false);
    } else {
      setName('');
      setSeries('');
      setSlug('');
      setSelectedIds([]);
      setAutoSlug(true);
    }
    setItemSearch('');
  }, [open, group]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const s = (slug.trim() || slugifyComponentCatalog(n)).trim();
    if (!n || !s) {
      onError('Укажите название группы');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: n,
        series: series.trim() || undefined,
        slug: s,
        catalogItemIds: selectedIds,
      };
      if (group) {
        await updateAdminComponentCatalogGroup(group.id, body);
      } else {
        await createAdminComponentCatalogGroup(body);
      }
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const title = group ? 'Редактировать группу' : 'Новая группа комплектующих';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      size="xl"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Группа объединяет стойку, наличник, добор и планку одного цвета — её можно привязать к
          карточке двери целиком. Новые позиции удобнее создавать кнопкой «Создать позицию для
          группы» — они сразу попадут в состав; существующие отметьте в списке ниже.
        </p>

        <div data-modal-form-grid className={styles.groupFormGrid}>
          <div data-modal-form-group className={styles.groupNameField}>
            <label htmlFor="catalog-group-name">Название группы / цвет *</label>
            <input
              id="catalog-group-name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (autoSlug) setSlug(slugifyComponentCatalog(v));
              }}
              placeholder="ЛОФТ Белый (телескопический)"
            />
          </div>

          <div data-modal-form-group className={styles.groupSeriesField}>
            <label htmlFor="catalog-group-series">Серия / описание</label>
            <input
              id="catalog-group-series"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="Погонаж для дверей Экошпон, серии ЛОФТ"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-group-slug">Slug *</label>
            <input
              id="catalog-group-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="catalog-group-picker-search">Состав группы ({selectedIds.length})</label>
          {group && onCreateItemInGroup ? (
            <div className={styles.groupCompositionToolbar}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onCreateItemInGroup(group)}
              >
                + Создать позицию для группы
              </button>
              <p className={styles.groupCompositionHint}>
                Или найдите и отметьте уже существующие позиции справочника
              </p>
            </div>
          ) : null}
          <input
            id="catalog-group-picker-search"
            className={styles.searchInput}
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Поиск позиций для добавления…"
          />
          <div
            style={{
              maxHeight: 280,
              overflow: 'auto',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              background: 'var(--admin-surface, #fff)',
            }}
          >
            {pickerItems.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: '1px solid #f2f4f7',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                />
                <span>
                  <strong>{formatCatalogItemLabel(item)}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: '#667085' }}>
                    {COMPONENT_KIND_LABELS[item.kind]} ·{' '}
                    {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить группу'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
