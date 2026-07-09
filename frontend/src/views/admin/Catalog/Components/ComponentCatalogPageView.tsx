'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { getCatalogKindLabel } from '@/shared/api/admin-component-catalog';
import type { AdminComponentCatalogItem } from '@/shared/api/admin-component-catalog';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton/AdminListRefreshButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { CopyIcon } from '@/shared/ui/icons';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import { ComponentCatalogGroupsPanel } from './ComponentCatalogGroupsPanel';
import { ComponentCatalogItemModal } from './ComponentCatalogItemModal';
import styles from './ComponentCatalogPage.module.css';
import { ComponentCatalogRulesInfoTip } from './ComponentCatalogRulesInfoTip';
import type { ComponentCatalogPageModel } from './hooks/useComponentCatalogPage';
import { ComponentCatalogKindSettingsPanel } from './shared/ComponentCatalogKindSettingsPanel';

type ComponentCatalogPageViewProps = {
  model: ComponentCatalogPageModel;
};

export function ComponentCatalogPageView({ model }: ComponentCatalogPageViewProps) {
  const {
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
  } = model;

  const selectedGroup = groupFilter
    ? (groupFilterOptions.find((g) => g.id === groupFilter) ?? null)
    : null;

  const columns = useMemo(
    () => [
      {
        key: 'kind',
        title: 'Вид',
        sortable: true,
        sortKey: 'kind',
        width: '130px',
        render: (row: AdminComponentCatalogItem) =>
          getCatalogKindLabel(row.kindId, kindOptions, row.kindRef),
      },
      {
        key: 'name',
        title: 'Название',
        sortable: true,
        sortKey: 'name',
        render: (row: AdminComponentCatalogItem) => (
          <div>
            <div className={styles.itemNameStrong}>{row.name}</div>
            {row.groupItems && row.groupItems.length > 0 && (
              <div className={`${styles.groupTags} ${styles.groupTagsUnderName}`}>
                {row.groupItems.map((gi) => (
                  <span
                    key={gi.group.id}
                    className={styles.groupTag}
                    title={
                      gi.group.seriesRef?.name
                        ? `${gi.group.seriesRef.name}${gi.group.series ? ` · ${gi.group.series}` : ''}`
                        : (gi.group.series ?? undefined)
                    }
                  >
                    {gi.group.seriesRef?.name ? `${gi.group.seriesRef.name}: ` : ''}
                    {gi.group.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'size',
        title: 'Размер',
        sortable: true,
        sortKey: 'size',
        width: '120px',
        render: (row: AdminComponentCatalogItem) => row.size || '—',
      },
      {
        key: 'color',
        title: 'Цвет',
        sortable: true,
        sortKey: 'color',
        width: '120px',
        render: (row: AdminComponentCatalogItem) => row.color || '—',
      },
      {
        key: 'material',
        title: 'Материал',
        sortable: true,
        sortKey: 'material',
        width: '130px',
        render: (row: AdminComponentCatalogItem) => row.material || '—',
      },
      {
        key: 'price',
        title: 'Цена',
        sortable: true,
        sortKey: 'price',
        width: '110px',
        render: (row: AdminComponentCatalogItem) => (
          <span className={styles.priceCell}>
            {parseFloat(row.price).toLocaleString('ru-RU')} ₽
          </span>
        ),
      },
      {
        key: 'stock',
        title: 'Остаток',
        sortable: true,
        sortKey: 'stock',
        width: '90px',
        render: (row: AdminComponentCatalogItem) => (
          <span className={row.stock <= 0 ? styles.stockEmpty : undefined}>
            {row.stock.toLocaleString('ru-RU')}
          </span>
        ),
      },
      {
        key: 'products',
        title: 'Товаров',
        width: '80px',
        render: (row: AdminComponentCatalogItem) => row._count?.productComponents ?? 0,
      },
      {
        key: 'isActive',
        title: 'Статус',
        width: '100px',
        render: (row: AdminComponentCatalogItem) => (
          <span
            className={`${styles.badge} ${row.isActive ? styles.badgeActive : styles.badgeInactive}`}
          >
            {row.isActive ? 'Активна' : 'Скрыта'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '',
        width: '120px',
        render: (row: AdminComponentCatalogItem) => (
          <div className={styles.tableRowActions}>
            <AdminTableIconButton title="Редактировать" onClick={() => openEditItem(row)}>
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton title="Копировать как новую" onClick={() => openCopyItem(row)}>
              <CopyIcon />
            </AdminTableIconButton>
            <AdminTableIconButton title="Удалить" onClick={() => handleDeleteItem(row)}>
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        ),
      },
    ],
    [openEditItem, openCopyItem, handleDeleteItem, kindOptions]
  );

  const countLabel =
    tab === 'items'
      ? `${totalItems} ${pluralize(totalItems, 'позиция', 'позиции', 'позиций')}`
      : tab === 'kinds'
        ? 'параметры видов'
        : 'группы';

  return (
    <div className={styles.page}>
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'ok' ? styles.toastOk : styles.toastErr}`}
        >
          {toast.text}
        </div>
      )}

      <ComponentCatalogItemModal
        open={itemModalOpen}
        item={editItem}
        copyFrom={copyFromItem}
        assignToGroup={assignToGroup}
        kindOptions={kindOptions}
        onClose={closeItemModal}
        onSaved={handleItemSaved}
        onError={(msg) => showToast(msg, 'err')}
      />

      {itemDeleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить позицию?"
          message={itemDeleteMessage}
          confirmText={deletingItem ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => void confirmDeleteItem()}
          onClose={() => {
            if (!deletingItem) setItemDeleteTarget(null);
          }}
        />
      ) : null}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Комплектующие</h1>
          <AdminListRefreshButton
            onClick={invalidateAll}
            busy={isRefreshing}
            title="Обновить данные справочника"
            aria-label="Обновить данные справочника"
          />
          <ComponentCatalogRulesInfoTip />
          <span className={styles.count}>{countLabel}</span>
        </div>
        <div className={styles.headerActions}>
          {tab === 'items' && (
            <>
              {selectedGroup ? (
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => openCreateItemInGroup(selectedGroup)}
                >
                  + Позиция в группе
                </button>
              ) : null}
              <button type="button" className={styles.addButton} onClick={openCreateItem}>
                + Новая позиция
              </button>
            </>
          )}
          <Link href="/admin/catalog/products" className={styles.secondaryButton}>
            К товарам
          </Link>
        </div>
      </div>

      <p className={styles.hint}>
        Единый справочник погонажа и комплектующих для дверей. Группы моделей объединяют подгруппы
        по цвету (стойка, наличник, добор) — подгруппу можно скопировать и изменить цвет или цену.
      </p>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'items' ? styles.tabActive : ''}`}
          onClick={() => setTab('items')}
        >
          Позиции справочника
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'groups' ? styles.tabActive : ''}`}
          onClick={() => setTab('groups')}
        >
          Группы и подгруппы
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'kinds' ? styles.tabActive : ''}`}
          onClick={() => setTab('kinds')}
        >
          Параметры видов
        </button>
      </div>

      {tab === 'groups' ? (
        <ComponentCatalogGroupsPanel
          onToast={showToast}
          onSelectGroupFilter={(groupId) => {
            setGroupFilter(groupId);
            setTab('items');
          }}
          onCreateItemInGroup={(group) => openCreateItemInGroup(group)}
        />
      ) : tab === 'kinds' ? (
        <ComponentCatalogKindSettingsPanel onToast={showToast} />
      ) : (
        <>
          {selectedGroup ? (
            <div className={styles.groupFilterBanner}>
              <span>
                Фильтр по подгруппе: <strong>{selectedGroup.name}</strong>
                {selectedGroup.seriesRef?.name ? (
                  <span className={styles.groupFilterSeriesHint}>
                    {' '}
                    ({selectedGroup.seriesRef.name})
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => openCreateItemInGroup(selectedGroup)}
              >
                + Добавить позицию в эту группу
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setGroupFilter('')}
              >
                Сбросить фильтр
              </button>
            </div>
          ) : null}

          <div className={styles.filters}>
            <div className={styles.searchField}>
              <label className={styles.filterLabel}>Поиск</label>
              <input
                type="search"
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Название, размер, цвет, материал…"
              />
            </div>
            <div>
              <label className={styles.filterLabel}>Вид</label>
              <select
                className={styles.select}
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
              >
                <option value="">Все виды</option>
                {kindOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.groupFilterField}>
              <label className={styles.filterLabel}>Группа моделей</label>
              <select
                className={`${styles.select} ${styles.groupFilterSelect}`}
                value={seriesFilter}
                onChange={(e) => {
                  setSeriesFilter(e.target.value);
                  setGroupFilter('');
                }}
              >
                <option value="">Все группы моделей</option>
                {seriesFilterOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.groupFilterField}>
              <label className={styles.filterLabel}>Подгруппа</label>
              <select
                className={`${styles.select} ${styles.groupFilterSelect}`}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="">Все подгруппы</option>
                {groupFilterOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.filterLabel}>Статус</label>
              <select
                className={styles.select}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
              >
                <option value="">Все</option>
                <option value="true">Активные</option>
                <option value="false">Скрытые</option>
              </select>
            </div>
            <div>
              <label className={styles.filterLabel}>На странице</label>
              <select
                className={styles.select}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[20, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {itemsLoading ? (
            <div className={styles.loadingOverlay}>Загрузка…</div>
          ) : (
            <DataTable
              paginationClassName={styles.pagination}
              paginationActiveClassName={styles.paginationPageActive}
              data={items}
              columns={columns}
              keyExtractor={(row) => row.id}
              serverSideSort
              serverSidePagination
              controlledSortBy={sortBy}
              controlledSortOrder={sortOrder}
              onSortChange={handleSortChange}
              pagination={{ page, limit, total: totalItems, onPageChange: setPage }}
            />
          )}
        </>
      )}
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
