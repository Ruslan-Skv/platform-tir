'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import Link from 'next/link';

import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton/AdminListRefreshButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import { ServiceCatalogCategoryCreateModal } from './ServiceCatalogCategoryCreateModal';
import { ServiceCatalogCategoryEditModal } from './ServiceCatalogCategoryEditModal';
import styles from './ServiceCatalogSectionPage.module.css';
import type { ServiceCatalogSectionPageModel } from './hooks/useServiceCatalogSectionPage';
import type { ServiceCatalogCategory } from './service-catalog-section-page.types';
import {
  buildDeleteCategoryModalMessage,
  countCategories,
  countNestedCategories,
  formatCategoryItemsCount,
} from './service-catalog-section-page.utils';

type ServiceCatalogSectionPageViewProps = {
  model: ServiceCatalogSectionPageModel;
};

function buildDeleteMessage(category: ServiceCatalogCategory): string {
  return buildDeleteCategoryModalMessage(category.name, countNestedCategories(category));
}

export function ServiceCatalogSectionPageView({ model }: ServiceCatalogSectionPageViewProps) {
  const {
    categories,
    loading,
    expandedCategories,
    deleteModal,
    deleting,
    deleteError,
    showCreateModal,
    setShowCreateModal,
    closeCreateModal,
    handleCategoryCreated,
    editCategoryId,
    openEditModal,
    closeEditModal,
    handleCategoryUpdated,
    flatCategories,
    fetchCategories,
    toast,
    toggleExpand,
    expandAllCategories,
    collapseAllCategories,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
    reorderCategory,
    reorderInProgress,
  } = model;

  const totalCount = countCategories(categories);

  const renderCategoryVisual = (category: ServiceCatalogCategory) => {
    if (category.image) {
      return <img src={category.image} alt="" className={styles.categoryThumb} />;
    }
    if (category.icon && serviceCatalogIconMap[category.icon]) {
      const IconC = serviceCatalogIconMap[category.icon];
      return (
        <span className={styles.categoryIcon}>
          <IconC className={styles.categoryIconSvg} />
        </span>
      );
    }
    return <span className={styles.categoryIconPlaceholder}>📁</span>;
  };

  const renderCategoryMeta = (category: ServiceCatalogCategory) => {
    const itemsCount = category.items?.length ?? category._count?.items ?? 0;
    const childCount = category.children?.length ?? 0;

    return (
      <>
        <span className={styles.treeMeta}>{category.slug}</span>
        {childCount > 0 ? <span className={styles.treeMeta}>{childCount} подкат.</span> : null}
        <span className={styles.treeMeta}>{formatCategoryItemsCount(itemsCount)}</span>
        {!category.isActive ? <span className={styles.badgeInactive}>Скрыта</span> : null}
      </>
    );
  };

  const renderCategoryActions = (
    category: ServiceCatalogCategory,
    siblings: ServiceCatalogCategory[],
    depth: 0 | 1
  ) => {
    const idx = siblings.findIndex((s) => s.id === category.id);
    const canMoveUp = idx > 0;
    const canMoveDown = idx >= 0 && idx < siblings.length - 1;
    const showReorder = siblings.length > 1;

    return (
      <div className={styles.treeRowActions}>
        {showReorder ? (
          <div
            className={styles.reorderButtons}
            role="group"
            aria-label={
              depth === 0 ? 'Порядок категории в списке' : 'Порядок подкатегории в списке'
            }
          >
            <button
              type="button"
              className={styles.reorderIconButton}
              disabled={!canMoveUp || reorderInProgress}
              title="Переместить выше"
              aria-label="Переместить выше"
              onClick={() => void reorderCategory(category, siblings, 'up')}
            >
              <ChevronUp className={styles.reorderIcon} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.reorderIconButton}
              disabled={!canMoveDown || reorderInProgress}
              title="Переместить ниже"
              aria-label="Переместить ниже"
              onClick={() => void reorderCategory(category, siblings, 'down')}
            >
              <ChevronDown className={styles.reorderIcon} aria-hidden />
            </button>
          </div>
        ) : null}
        <Link
          href={`/catalog/services/${category.slug}`}
          target="_blank"
          rel="noreferrer"
          className={styles.secondaryButton}
          title="Открыть на сайте"
        >
          На сайте
        </Link>
        <AdminTableIconButton
          title="Редактировать категорию"
          onClick={() => openEditModal(category)}
        >
          <EditIcon />
        </AdminTableIconButton>
        <AdminTableIconButton title="Удалить категорию" onClick={() => openDeleteModal(category)}>
          <DeleteIcon />
        </AdminTableIconButton>
      </div>
    );
  };

  const renderCategory = (
    category: ServiceCatalogCategory,
    depth: 0 | 1,
    siblings: ServiceCatalogCategory[]
  ) => {
    const hasChildren = Boolean(category.children && category.children.length > 0);
    const isExpanded = expandedCategories.has(category.id);
    const isRoot = depth === 0;
    const childSiblings = category.children ?? [];

    if (isRoot) {
      return (
        <div key={category.id} className={styles.treeRootBlock}>
          <div className={styles.treeRootRow}>
            {hasChildren ? (
              <button
                type="button"
                className={styles.treeToggle}
                onClick={() => toggleExpand(category.id)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className={styles.treeTogglePlaceholder} />
            )}
            {renderCategoryVisual(category)}
            <div className={styles.treeMain}>
              <span className={styles.treeRootTitle}>{category.name}</span>
              <div className={styles.treeMetaRow}>{renderCategoryMeta(category)}</div>
            </div>
            {renderCategoryActions(category, siblings, depth)}
          </div>
          {hasChildren && isExpanded ? (
            <div className={styles.treeChildren}>
              {childSiblings.map((child) => renderCategory(child, 1, childSiblings))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div key={category.id} className={styles.treeChildBlock}>
        <div className={styles.treeChildRow}>
          {hasChildren ? (
            <button
              type="button"
              className={styles.treeToggle}
              onClick={() => toggleExpand(category.id)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className={styles.treeTogglePlaceholder} />
          )}
          {renderCategoryVisual(category)}
          <div className={styles.treeMain}>
            <span className={styles.treeChildTitle}>{category.name}</span>
            <div className={styles.treeMetaRow}>{renderCategoryMeta(category)}</div>
          </div>
          {renderCategoryActions(category, siblings, depth)}
        </div>
        {hasChildren && isExpanded ? (
          <div className={styles.treeNestedChildren}>
            {childSiblings.map((child) => renderCategory(child, 1, childSiblings))}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingOverlay}>Загрузка категорий…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toast ? (
        <div
          className={`${styles.toast} ${toast.type === 'ok' ? styles.toastOk : styles.toastErr}`}
        >
          {toast.text}
        </div>
      ) : null}

      <ServiceCatalogCategoryCreateModal
        open={showCreateModal}
        flatCategories={flatCategories}
        onClose={closeCreateModal}
        onCreated={handleCategoryCreated}
      />

      <ServiceCatalogCategoryEditModal
        open={Boolean(editCategoryId)}
        categoryId={editCategoryId}
        categories={categories}
        flatCategories={flatCategories}
        onClose={closeEditModal}
        onSaved={handleCategoryUpdated}
      />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Категории</h1>
          <AdminListRefreshButton
            onClick={() => void fetchCategories()}
            busy={loading}
            title="Обновить список категорий"
            aria-label="Обновить список категорий"
          />
          <span className={styles.count}>
            {totalCount}{' '}
            {totalCount === 1 ? 'категория' : totalCount < 5 ? 'категории' : 'категорий'}
          </span>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/service-catalog/items" className={styles.secondaryButton}>
            К видам работ
          </Link>
        </div>
      </div>

      <p className={styles.hint}>
        Дерево категорий ремонта квартир: корневые разделы сворачиваются как группы, подкатегории —
        как подгруппы. Стрелками ↑↓ можно менять порядок категорий и подкатегорий среди соседей.
      </p>

      <div className={styles.treeToolbar}>
        <button
          type="button"
          data-admin-mutation
          className={styles.addButton}
          onClick={() => setShowCreateModal(true)}
        >
          + Добавить категорию
        </button>
        <button type="button" className={styles.secondaryButton} onClick={expandAllCategories}>
          Развернуть все
        </button>
        <button type="button" className={styles.secondaryButton} onClick={collapseAllCategories}>
          Свернуть все
        </button>
      </div>

      {categories.length > 0 ? (
        <div className={styles.catalogTree}>
          {categories.map((category) => renderCategory(category, 0, categories))}
        </div>
      ) : (
        <p className={styles.treeEmpty}>
          Категории не найдены. Создайте первую корневую категорию.
        </p>
      )}

      {deleteModal.isOpen && deleteModal.category ? (
        <ConfirmModal
          isOpen
          title="Удалить категорию?"
          message={
            deleteError
              ? `${buildDeleteMessage(deleteModal.category)} ${deleteError}`
              : buildDeleteMessage(deleteModal.category)
          }
          confirmText={deleting ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          closeOnConfirm={false}
          onConfirm={() => void handleDeleteCategory()}
          onClose={() => {
            if (!deleting) closeDeleteModal();
          }}
        />
      ) : null}
    </div>
  );
}
