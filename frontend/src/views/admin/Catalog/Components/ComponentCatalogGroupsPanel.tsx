'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogKind,
  type AdminComponentCatalogSeries,
  createAdminComponentCatalogGroup,
  createAdminComponentCatalogSeries,
  deleteAdminComponentCatalogGroup,
  deleteAdminComponentCatalogSeries,
  fetchAdminComponentCatalogGroupsList,
  fetchAdminComponentCatalogKinds,
  fetchAdminComponentCatalogList,
  fetchAdminComponentCatalogSeriesList,
  formatCatalogItemLabel,
  getCatalogKindLabel,
  slugifyComponentCatalog,
  updateAdminComponentCatalogGroup,
  updateAdminComponentCatalogSeries,
} from '@/shared/api/admin-component-catalog';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { CopyIcon } from '@/shared/ui/icons';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import modalStyles from './ComponentCatalogModal.module.css';
import styles from './ComponentCatalogPage.module.css';
import { ComponentCatalogSubgroupCopyModal } from './ComponentCatalogSubgroupCopyModal';
import {
  COMPONENT_CATALOG_GROUPS_KEY,
  COMPONENT_CATALOG_KINDS_KEY,
  COMPONENT_CATALOG_LIST_KEY,
  COMPONENT_CATALOG_SERIES_KEY,
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
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [subgroupPage, setSubgroupPage] = useState(1);
  const [subgroupLimit, setSubgroupLimit] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const { data: kindsData } = useQuery({
    queryKey: [COMPONENT_CATALOG_KINDS_KEY],
    queryFn: fetchAdminComponentCatalogKinds,
  });
  const kindOptions = kindsData?.data ?? [];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: [COMPONENT_CATALOG_SERIES_KEY, debouncedSearch],
    queryFn: () =>
      fetchAdminComponentCatalogSeriesList({
        search: debouncedSearch || undefined,
        limit: 200,
      }),
    placeholderData: keepPreviousData,
  });

  const seriesList = seriesData?.data ?? [];

  useEffect(() => {
    if (!selectedSeriesId && seriesList.length > 0) {
      setSelectedSeriesId(seriesList[0].id);
    }
  }, [seriesList, selectedSeriesId]);

  const { data: subgroupsData, isLoading: subgroupsLoading } = useQuery({
    queryKey: [
      COMPONENT_CATALOG_GROUPS_KEY,
      'subgroups',
      selectedSeriesId,
      debouncedSearch,
      subgroupPage,
      subgroupLimit,
    ],
    queryFn: () =>
      fetchAdminComponentCatalogGroupsList({
        seriesId: selectedSeriesId || undefined,
        search: debouncedSearch || undefined,
        page: subgroupPage,
        limit: subgroupLimit,
      }),
    enabled: Boolean(selectedSeriesId),
    placeholderData: keepPreviousData,
  });

  const subgroups = subgroupsData?.data ?? [];
  const subgroupsTotal = subgroupsData?.total ?? 0;
  const selectedSeries = seriesList.find((s) => s.id === selectedSeriesId) ?? null;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_SERIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_GROUPS_KEY] });
    void queryClient.invalidateQueries({ queryKey: [COMPONENT_CATALOG_LIST_KEY] });
  }, [queryClient]);

  const confirmDeleteSeries = useCallback(async () => {
    if (!seriesDeleteTarget) return;
    const series = seriesDeleteTarget;
    setDeletingSeries(true);
    try {
      await deleteAdminComponentCatalogSeries(series.id);
      if (selectedSeriesId === series.id) setSelectedSeriesId(null);
      invalidate();
      onToast('Группа моделей удалена', 'ok');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setDeletingSeries(false);
      setSeriesDeleteTarget(null);
    }
  }, [invalidate, onToast, selectedSeriesId, seriesDeleteTarget]);

  const seriesDeleteMessage = useMemo(() => {
    if (!seriesDeleteTarget) return '';
    const count = seriesDeleteTarget._count?.subgroups ?? seriesDeleteTarget.subgroups?.length ?? 0;
    if (count > 0) {
      return `Удалить группу моделей «${seriesDeleteTarget.name}» вместе с ${count} подгруппами? Позиции справочника останутся.`;
    }
    return `Удалить группу моделей «${seriesDeleteTarget.name}»?`;
  }, [seriesDeleteTarget]);

  const confirmDeleteSubgroup = useCallback(async () => {
    if (!subgroupDeleteTarget) return;
    const group = subgroupDeleteTarget;
    setDeletingSubgroup(true);
    try {
      await deleteAdminComponentCatalogGroup(group.id);
      if (expandedId === group.id) setExpandedId(null);
      invalidate();
      onToast('Подгруппа удалена', 'ok');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setDeletingSubgroup(false);
      setSubgroupDeleteTarget(null);
    }
  }, [expandedId, invalidate, onToast, subgroupDeleteTarget]);

  const subgroupDeleteMessage = useMemo(() => {
    if (!subgroupDeleteTarget) return '';
    const itemCount = subgroupDeleteTarget._count?.items ?? subgroupDeleteTarget.items?.length ?? 0;
    if (itemCount === 0) {
      return `Удалить подгруппу «${subgroupDeleteTarget.name}»? Она пуста, позиции справочника не затрагиваются.`;
    }
    return `Удалить подгруппу «${subgroupDeleteTarget.name}»? Позиции справочника (${itemCount}) останутся в каталоге.`;
  }, [subgroupDeleteTarget]);

  const seriesColumns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Группа моделей',
        sortable: false,
        render: (s: AdminComponentCatalogSeries) => (
          <div className={styles.hierarchyNameCell}>
            <div className={styles.hierarchyTitle}>{s.name}</div>
            {s.description ? <div className={styles.hierarchySubtitle}>{s.description}</div> : null}
          </div>
        ),
      },
      {
        key: 'subgroups',
        title: 'Подгрупп',
        width: '100px',
        render: (s: AdminComponentCatalogSeries) => s._count?.subgroups ?? s.subgroups?.length ?? 0,
      },
      {
        key: 'isActive',
        title: 'Статус',
        width: '100px',
        render: (s: AdminComponentCatalogSeries) => (
          <span
            className={`${styles.badge} ${s.isActive ? styles.badgeActive : styles.badgeInactive}`}
          >
            {s.isActive ? 'Активна' : 'Скрыта'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '',
        width: '100px',
        render: (s: AdminComponentCatalogSeries) => (
          <div className={styles.tableRowActions}>
            <AdminTableIconButton
              title="Редактировать"
              onClick={(e) => {
                e.stopPropagation();
                setEditSeries(s);
                setSeriesModalOpen(true);
              }}
            >
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              title="Удалить"
              onClick={(e) => {
                e.stopPropagation();
                setSeriesDeleteTarget(s);
              }}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        ),
      },
    ],
    [setSeriesDeleteTarget]
  );

  const subgroupColumns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Подгруппа / цвет',
        sortable: false,
        render: (g: AdminComponentCatalogGroup) => (
          <div className={styles.hierarchyNameCell}>
            <div className={styles.hierarchyTitle}>{g.name}</div>
            {g.series ? <div className={styles.hierarchySubtitle}>{g.series}</div> : null}
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
        width: '180px',
        render: (g: AdminComponentCatalogGroup) => (
          <div className={styles.tableRowActions}>
            <AdminTableIconButton
              title="Копировать подгруппу"
              onClick={(e) => {
                e.stopPropagation();
                setCopySource(g);
                setCopyModalOpen(true);
              }}
            >
              <CopyIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              title="Состав подгруппы"
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
                setEditSubgroup(g);
                setCreateSubgroupSeriesId(null);
                setSubgroupModalOpen(true);
              }}
            >
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              title="Удалить"
              onClick={(e) => {
                e.stopPropagation();
                setSubgroupDeleteTarget(g);
              }}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        ),
      },
    ],
    [setSubgroupDeleteTarget]
  );

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
        seriesId={editSubgroup?.seriesId ?? createSubgroupSeriesId ?? selectedSeriesId}
        seriesList={seriesList}
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

      <div className={styles.filters}>
        <div className={styles.searchField}>
          <label className={styles.filterLabel}>Поиск</label>
          <input
            type="search"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ЛОФТ, Бетон, телескопический…"
          />
        </div>
        <div className={styles.hierarchyToolbar}>
          <label className={styles.filterLabel}>&nbsp;</label>
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
        </div>
      </div>

      <h2 className={styles.hierarchySectionTitle}>Группы моделей дверей</h2>
      {seriesLoading ? (
        <div className={styles.loadingOverlay}>Загрузка…</div>
      ) : (
        <DataTable
          paginationClassName={styles.pagination}
          paginationActiveClassName={styles.paginationPageActive}
          data={seriesList}
          columns={seriesColumns}
          keyExtractor={(s) => s.id}
          onRowClick={(s) => setSelectedSeriesId(s.id)}
        />
      )}

      {selectedSeries ? (
        <>
          <div className={styles.hierarchySubsectionHeader}>
            <h2 className={styles.hierarchySectionTitle}>Подгруппы: {selectedSeries.name}</h2>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => {
                setEditSubgroup(null);
                setCreateSubgroupSeriesId(selectedSeries.id);
                setSubgroupModalOpen(true);
              }}
            >
              + Подгруппа
            </button>
          </div>

          <div className={styles.filters}>
            <div>
              <label className={styles.filterLabel}>На странице</label>
              <select
                className={styles.select}
                value={subgroupLimit}
                onChange={(e) => setSubgroupLimit(Number(e.target.value))}
              >
                {[20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {subgroupsLoading ? (
            <div className={styles.loadingOverlay}>Загрузка подгрупп…</div>
          ) : (
            <>
              <DataTable
                paginationClassName={styles.pagination}
                paginationActiveClassName={styles.paginationPageActive}
                data={subgroups}
                columns={subgroupColumns}
                keyExtractor={(g) => g.id}
                serverSidePagination
                pagination={{
                  page: subgroupPage,
                  limit: subgroupLimit,
                  total: subgroupsTotal,
                  onPageChange: setSubgroupPage,
                }}
                onRowClick={(g) => setExpandedId((prev) => (prev === g.id ? null : g.id))}
              />

              {expandedId && subgroups.find((g) => g.id === expandedId) ? (
                <SubgroupItemsDetail
                  group={subgroups.find((g) => g.id === expandedId)!}
                  kindOptions={kindOptions}
                  onSelectGroupFilter={onSelectGroupFilter}
                  onCreateItemInGroup={onCreateItemInGroup}
                  onCopy={() => {
                    const g = subgroups.find((x) => x.id === expandedId);
                    if (g) {
                      setCopySource(g);
                      setCopyModalOpen(true);
                    }
                  }}
                />
              ) : null}
            </>
          )}
        </>
      ) : null}
    </>
  );
}

function SubgroupItemsDetail({
  group,
  kindOptions,
  onSelectGroupFilter,
  onCreateItemInGroup,
  onCopy,
}: {
  group: AdminComponentCatalogGroup;
  kindOptions: AdminComponentCatalogKind[];
  onSelectGroupFilter?: (groupId: string) => void;
  onCreateItemInGroup?: (group: AdminComponentCatalogGroup) => void;
  onCopy: () => void;
}) {
  return (
    <div className={styles.subgroupDetail}>
      <div className={styles.subgroupDetailHeader}>
        <strong className={styles.subgroupDetailTitle}>Состав: {group.name}</strong>
        <div className={styles.groupDetailActions}>
          <button type="button" className={styles.secondaryButton} onClick={onCopy}>
            Копировать подгруппу
          </button>
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
              Показать позиции подгруппы
            </button>
          ) : null}
        </div>
      </div>
      {group.items.length === 0 ? (
        <p className={styles.groupCompositionHint}>
          В подгруппе пока нет позиций. Создайте стойку, наличник и добор с нужным цветом или
          скопируйте другую подгруппу и измените цвет.
        </p>
      ) : (
        <table className={styles.subgroupItemsTable}>
          <thead>
            <tr>
              <th>Вид</th>
              <th>Наименование</th>
              <th>Размер</th>
              <th>Цвет</th>
              <th>Материал</th>
              <th>Цена</th>
              <th>Остаток</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((row) => (
              <tr key={row.id}>
                <td>
                  {getCatalogKindLabel(
                    row.catalogItem.kindId,
                    kindOptions,
                    row.catalogItem.kindRef
                  )}
                </td>
                <td>{row.catalogItem.name}</td>
                <td>{row.catalogItem.size || '—'}</td>
                <td>{row.catalogItem.color || '—'}</td>
                <td>{row.catalogItem.material || '—'}</td>
                <td className={styles.subgroupPriceCell}>
                  {parseFloat(row.catalogItem.price).toLocaleString('ru-RU')} ₽
                </td>
                <td
                  className={
                    row.catalogItem.stock <= 0
                      ? styles.subgroupStockEmpty
                      : styles.subgroupStockCell
                  }
                >
                  {row.catalogItem.stock.toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ComponentCatalogSeriesModal({
  open,
  series,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  series: AdminComponentCatalogSeries | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (series) {
      setName(series.name);
      setDescription(series.description ?? '');
      setSlug(series.slug);
      setAutoSlug(false);
    } else {
      setName('');
      setDescription('');
      setSlug('');
      setAutoSlug(true);
    }
  }, [open, series]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const s = (slug.trim() || slugifyComponentCatalog(n)).trim();
    if (!n || !s) {
      onError('Укажите название группы моделей');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: n,
        description: description.trim() || undefined,
        slug: s,
      };
      if (series) {
        await updateAdminComponentCatalogSeries(series.id, body);
      } else {
        await createAdminComponentCatalogSeries(body);
      }
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={series ? 'Редактировать группу моделей' : 'Новая группа моделей'}
      size="lg"
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
          Группа моделей объединяет подгруппы комплектующих для одной серии дверей (например, ЛОФТ,
          Классика). Внутри — подгруппы по цвету с набором стойки, наличника и добора.
        </p>
        <div data-modal-form-grid className={styles.groupFormGrid}>
          <div data-modal-form-group className={styles.groupNameField}>
            <label htmlFor="catalog-series-name">Название *</label>
            <input
              id="catalog-series-name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (autoSlug) setSlug(slugifyComponentCatalog(v));
              }}
              placeholder="ЛОФТ, Классика Экошпон…"
            />
          </div>
          <div data-modal-form-group className={styles.groupSeriesField}>
            <label htmlFor="catalog-series-desc">Описание</label>
            <input
              id="catalog-series-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Погонаж для дверей серии ЛОФТ"
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="catalog-series-slug">Slug *</label>
            <input
              id="catalog-series-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
            />
          </div>
        </div>
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ComponentCatalogSubgroupModal({
  open,
  subgroup,
  seriesId,
  seriesList,
  onClose,
  onSaved,
  onError,
  onCreateItemInGroup,
}: {
  open: boolean;
  subgroup: AdminComponentCatalogGroup | null;
  seriesId: string | null;
  seriesList: AdminComponentCatalogSeries[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  onCreateItemInGroup?: (group: AdminComponentCatalogGroup) => void;
}) {
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [name, setName] = useState('');
  const [variantNote, setVariantNote] = useState('');
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

  const { data: kindsData } = useQuery({
    queryKey: [COMPONENT_CATALOG_KINDS_KEY],
    queryFn: fetchAdminComponentCatalogKinds,
    enabled: open,
  });
  const kindOptions = kindsData?.data ?? [];

  const pickerItems = catalogSearch?.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (subgroup) {
      setSelectedSeriesId(subgroup.seriesId);
      setName(subgroup.name);
      setVariantNote(subgroup.series ?? '');
      setSlug(subgroup.slug);
      setSelectedIds(subgroup.items.map((i) => i.catalogItem.id));
      setAutoSlug(false);
    } else {
      setSelectedSeriesId(seriesId ?? seriesList[0]?.id ?? '');
      setName('');
      setVariantNote('');
      setSlug('');
      setSelectedIds([]);
      setAutoSlug(true);
    }
    setItemSearch('');
  }, [open, subgroup, seriesId, seriesList]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = selectedSeriesId.trim();
    const n = name.trim();
    const s = (slug.trim() || slugifyComponentCatalog(n)).trim();
    if (!sid) {
      onError('Выберите группу моделей');
      return;
    }
    if (!n || !s) {
      onError('Укажите название подгруппы');
      return;
    }
    setSaving(true);
    try {
      const body = {
        seriesId: sid,
        name: n,
        series: variantNote.trim() || undefined,
        slug: s,
        catalogItemIds: selectedIds,
      };
      if (subgroup) {
        await updateAdminComponentCatalogGroup(subgroup.id, body);
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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={subgroup ? 'Редактировать подгруппу' : 'Новая подгруппа комплектующих'}
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
          Подгруппа объединяет стойку, наличник, добор и планку одного цвета. Её можно привязать к
          карточке двери целиком. Для нового цвета удобнее скопировать существующую подгруппу.
        </p>

        <div data-modal-form-grid className={styles.groupFormGrid}>
          <div data-modal-form-group>
            <label htmlFor="catalog-subgroup-series">Группа моделей *</label>
            <select
              id="catalog-subgroup-series"
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              disabled={Boolean(subgroup)}
            >
              <option value="">— выберите —</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group className={styles.groupNameField}>
            <label htmlFor="catalog-subgroup-name">Название подгруппы / цвет *</label>
            <input
              id="catalog-subgroup-name"
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
            <label htmlFor="catalog-subgroup-note">Примечание к варианту</label>
            <input
              id="catalog-subgroup-note"
              value={variantNote}
              onChange={(e) => setVariantNote(e.target.value)}
              placeholder="Телескопический погонаж"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-subgroup-slug">Slug *</label>
            <input
              id="catalog-subgroup-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="catalog-subgroup-picker-search">
            Состав подгруппы ({selectedIds.length})
          </label>
          {subgroup && onCreateItemInGroup ? (
            <div className={styles.groupCompositionToolbar}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onCreateItemInGroup(subgroup)}
              >
                + Создать позицию для подгруппы
              </button>
            </div>
          ) : null}
          <input
            id="catalog-subgroup-picker-search"
            className={styles.searchInput}
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Поиск позиций для добавления…"
          />
          <div className={styles.groupPickerList}>
            {pickerItems.map((item) => (
              <label key={item.id} className={styles.groupPickerRow}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                />
                <span>
                  <strong>{formatCatalogItemLabel(item)}</strong>
                  <span className={styles.groupPickerMeta}>
                    {getCatalogKindLabel(item.kindId, kindOptions, item.kindRef)} ·{' '}
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
            {saving ? 'Сохранение…' : 'Сохранить подгруппу'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
