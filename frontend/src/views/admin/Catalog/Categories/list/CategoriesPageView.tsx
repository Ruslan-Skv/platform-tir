'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton/AdminListRefreshButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import type { Category } from '../shared/categories-page.types';
import { countCategories, formatCategoryProductCount } from '../shared/categories-page.utils';
import styles from './CategoriesPage.module.css';
import { CategoryCreateModal } from './CategoryCreateModal';
import { CategoryEditModal } from './CategoryEditModal';
import type { CategoriesPageModel } from './hooks/useCategoriesPage';

type CategoriesPageViewProps = {
  model: CategoriesPageModel;
};

function buildDeleteMessage(category: Category): string {
  const parts = [`Удалить категорию «${category.name}»?`];
  if (category.children && category.children.length > 0) {
    parts.push(`Вместе с ${category.children.length} подкатегориями.`);
  }
  if (category._count && category._count.products > 0) {
    parts.push(
      `В этой категории ${formatCategoryProductCount(category._count.products)} — они останутся без категории.`
    );
  }
  parts.push('Действие нельзя отменить.');
  return parts.join(' ');
}

export function CategoriesPageView({ model }: CategoriesPageViewProps) {
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
    handleManageAttributes,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
  } = model;

  const totalCount = countCategories(categories);

  const renderCategoryVisual = (category: Category) => {
    if (category.image) {
      return <img src={category.image} alt="" className={styles.categoryThumb} />;
    }
    if (category.icon) {
      return <span className={styles.categoryIcon}>{category.icon}</span>;
    }
    return <span className={styles.categoryIconPlaceholder}>📁</span>;
  };

  const renderCategoryMeta = (category: Category) => {
    const total = category._count?.totalProducts ?? category._count?.products;
    const own = category._count?.products;
    const childCount = category.children?.length ?? 0;

    return (
      <>
        <span className={styles.treeMeta}>{category.slug}</span>
        {childCount > 0 ? <span className={styles.treeMeta}>{childCount} подкат.</span> : null}
        {typeof total === 'number' ? (
          <span className={styles.treeMeta}>{formatCategoryProductCount(total)}</span>
        ) : null}
        {typeof own === 'number' && typeof total === 'number' && total !== own ? (
          <span className={styles.treeMeta}>своих: {own}</span>
        ) : null}
        {!category.isActive ? <span className={styles.badgeInactive}>Скрыта</span> : null}
      </>
    );
  };

  const renderCategoryActions = (category: Category) => (
    <div className={styles.treeRowActions}>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => handleManageAttributes(category.id)}
        title="Управление атрибутами"
      >
        Атрибуты
      </button>
      <AdminTableIconButton title="Редактировать категорию" onClick={() => openEditModal(category)}>
        <EditIcon />
      </AdminTableIconButton>
      <AdminTableIconButton title="Удалить категорию" onClick={() => openDeleteModal(category)}>
        <DeleteIcon />
      </AdminTableIconButton>
    </div>
  );

  const renderCategory = (category: Category, depth: 0 | 1) => {
    const hasChildren = Boolean(category.children && category.children.length > 0);
    const isExpanded = expandedCategories.has(category.id);
    const isRoot = depth === 0;

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
            {renderCategoryActions(category)}
          </div>
          {hasChildren && isExpanded ? (
            <div className={styles.treeChildren}>
              {category.children!.map((child) => renderCategory(child, 1))}
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
          {renderCategoryActions(category)}
        </div>
        {hasChildren && isExpanded ? (
          <div className={styles.treeNestedChildren}>
            {category.children!.map((child) => renderCategory(child, 1))}
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

      <CategoryCreateModal
        open={showCreateModal}
        flatCategories={flatCategories}
        onClose={closeCreateModal}
        onCreated={handleCategoryCreated}
      />

      <CategoryEditModal
        open={Boolean(editCategoryId)}
        categoryId={editCategoryId}
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
          <Link href="/admin/catalog/products" className={styles.secondaryButton}>
            К товарам
          </Link>
        </div>
      </div>

      <p className={styles.hint}>
        Дерево категорий каталога: корневые разделы сворачиваются как группы, подкатегории — как
        подгруппы. Разверните нужную ветку, чтобы увидеть дочерние категории и перейти к атрибутам.
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
          {categories.map((category) => renderCategory(category, 0))}
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
