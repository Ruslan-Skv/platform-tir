'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton/AdminListRefreshButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import { AttributeFormModal } from './AttributeFormModal';
import styles from './AttributesPage.module.css';
import {
  attributeTypeBadgeClass,
  buildDeleteMessage,
  formatAttributesWord,
  formatCategoriesToggleLabel,
  getTypeLabel,
} from './attributes-page.utils';
import type { AttributesPageModel } from './hooks/useAttributesPage';

type AttributesPageViewProps = {
  model: AttributesPageModel;
};

export function AttributesPageView({ model }: AttributesPageViewProps) {
  const {
    attributes,
    total,
    loading,
    searchInput,
    setSearchInput,
    saving,
    toast,
    showCreateModal,
    setShowCreateModal,
    editingAttribute,
    setEditingAttribute,
    deleteModal,
    deleting,
    deleteError,
    fetchAttributes,
    handleCreate,
    handleUpdate,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = model;

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());

  const toggleCategories = (attributeId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(attributeId)) next.delete(attributeId);
      else next.add(attributeId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingOverlay}>Загрузка характеристик…</div>
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

      <AttributeFormModal
        open={showCreateModal}
        mode="create"
        saving={saving}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      <AttributeFormModal
        open={Boolean(editingAttribute)}
        mode="edit"
        saving={saving}
        initial={editingAttribute}
        onClose={() => setEditingAttribute(null)}
        onSubmit={handleUpdate}
      />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Характеристики</h1>
          <AdminListRefreshButton
            onClick={() => void fetchAttributes()}
            busy={loading}
            title="Обновить список характеристик"
            aria-label="Обновить список характеристик"
          />
          <span className={styles.count}>
            {total} {formatAttributesWord(total)}
          </span>
        </div>
        <Link href="/admin/catalog/categories" className={styles.secondaryButton}>
          К категориям
        </Link>
      </div>

      <p className={styles.hint}>
        Справочник определений характеристик каталога. Привязка к категориям и порядок — на странице
        атрибутов категории. Здесь можно создать, отредактировать или полностью удалить определение.
      </p>

      <div className={styles.toolbar}>
        <button
          type="button"
          data-admin-mutation
          className={styles.addButton}
          onClick={() => setShowCreateModal(true)}
        >
          + Добавить характеристику
        </button>
        <input
          className={styles.searchInput}
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Поиск по названию или slug…"
          aria-label="Поиск характеристик"
        />
      </div>

      {attributes.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Slug</th>
                <th>Тип</th>
                <th>Ед.</th>
                <th>Фильтр</th>
                <th>Категории</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr) => {
                const usage = attr._count?.categories ?? attr.categories?.length ?? 0;
                const isExpanded = expandedCategories.has(attr.id);
                return (
                  <tr key={attr.id}>
                    <td className={styles.nameCell}>{attr.name}</td>
                    <td className={styles.slugCell}>{attr.slug}</td>
                    <td>
                      <span className={attributeTypeBadgeClass(attr.type)}>
                        {getTypeLabel(attr.type)}
                      </span>
                    </td>
                    <td className={styles.unitCell}>{attr.unit || '—'}</td>
                    <td>
                      {attr.isFilterable ? (
                        <span className={styles.filterYes}>Да</span>
                      ) : (
                        <span className={styles.filterNo}>Нет</span>
                      )}
                    </td>
                    <td className={styles.categoriesCell}>
                      {usage === 0 ? (
                        <span className={styles.usageZero}>Нет привязок</span>
                      ) : (
                        <div className={styles.categoriesDisclosure}>
                          <button
                            type="button"
                            className={styles.categoriesToggle}
                            aria-expanded={isExpanded}
                            onClick={() => toggleCategories(attr.id)}
                          >
                            <span className={styles.categoriesToggleChevron} aria-hidden>
                              {isExpanded ? '▾' : '▸'}
                            </span>
                            <span>{formatCategoriesToggleLabel(usage)}</span>
                          </button>
                          {isExpanded ? (
                            <ul className={styles.categoryLinks}>
                              {(attr.categories ?? []).map((link) => (
                                <li key={link.categoryId}>
                                  <Link
                                    href={`/admin/catalog/categories/${link.category.id}/attributes`}
                                    className={styles.categoryLink}
                                    title={`Атрибуты категории «${link.category.name}»`}
                                  >
                                    {link.category.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <AdminTableIconButton
                          title="Редактировать характеристику"
                          onClick={() => setEditingAttribute(attr)}
                        >
                          <EditIcon />
                        </AdminTableIconButton>
                        <AdminTableIconButton
                          title="Удалить характеристику из каталога"
                          onClick={() => openDeleteModal(attr)}
                        >
                          <DeleteIcon />
                        </AdminTableIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>
          {searchInput.trim()
            ? 'Ничего не найдено по запросу.'
            : 'Характеристик пока нет. Создайте первую.'}
        </p>
      )}

      {deleteModal.isOpen && deleteModal.attribute ? (
        <ConfirmModal
          isOpen
          title="Удалить характеристику?"
          message={
            deleteError
              ? `${buildDeleteMessage(deleteModal.attribute)} ${deleteError}`
              : buildDeleteMessage(deleteModal.attribute)
          }
          confirmText={deleting ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          closeOnConfirm={false}
          onConfirm={() => {
            if (!deleting) void handleDelete();
          }}
          onClose={() => {
            if (!deleting) closeDeleteModal();
          }}
        />
      ) : null}
    </div>
  );
}
