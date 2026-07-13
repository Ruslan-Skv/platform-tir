'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton/AdminListRefreshButton';

import { ComponentCatalogItemModal } from '../shared/ComponentCatalogItemModal';
import { ComponentCatalogKindSettingsPanel } from '../shared/ComponentCatalogKindSettingsPanel';
import { ComponentCatalogRulesInfoTip } from '../shared/ComponentCatalogRulesInfoTip';
import { ComponentCatalogTreePanel } from '../shared/ComponentCatalogTreePanel';
import styles from './ComponentCatalogPage.module.css';
import type { ComponentCatalogPageModel } from './hooks/useComponentCatalogPage';

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
    activeFilter,
    setActiveFilter,
    debouncedSearch,
    kindOptions,
    itemModalOpen,
    editItem,
    copyFromItem,
    assignToGroup,
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

  const countLabel = tab === 'kinds' ? 'параметры видов' : 'справочник';

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
          <Link href="/admin/catalog/suppliers" className={styles.secondaryButton}>
            Сверка прайсов
          </Link>
          <Link href="/admin/catalog/products" className={styles.secondaryButton}>
            К товарам
          </Link>
        </div>
      </div>

      <p className={styles.hint}>
        Справочник погонажа для дверей: группы моделей → подгруппы по цвету → позиции комплекта.
        Разверните нужную ветку, чтобы увидеть стойку, наличник и добор одного цвета рядом.
      </p>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'catalog' ? styles.tabActive : ''}`}
          onClick={() => setTab('catalog')}
        >
          Справочник
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'kinds' ? styles.tabActive : ''}`}
          onClick={() => setTab('kinds')}
        >
          Параметры видов
        </button>
      </div>

      {tab === 'kinds' ? (
        <ComponentCatalogKindSettingsPanel onToast={showToast} />
      ) : (
        <>
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
          </div>

          <ComponentCatalogTreePanel
            kindOptions={kindOptions}
            search={debouncedSearch}
            kindFilter={kindFilter}
            activeFilter={activeFilter}
            onToast={showToast}
            onEditItem={openEditItem}
            onCopyItem={openCopyItem}
            onDeleteItem={handleDeleteItem}
            onCreateItemInGroup={openCreateItemInGroup}
          />
        </>
      )}
    </div>
  );
}
