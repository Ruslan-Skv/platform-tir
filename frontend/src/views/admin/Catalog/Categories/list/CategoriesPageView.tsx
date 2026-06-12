'use client';

import { CATEGORY_ICONS } from '../shared/categories-page.constants';
import type { Category } from '../shared/categories-page.types';
import { generateSlug } from '../shared/categories-page.utils';
import styles from './CategoriesPage.module.css';
import type { CategoriesPageModel } from './hooks/useCategoriesPage';

type CategoriesPageViewProps = {
  model: CategoriesPageModel;
};

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
    newCategory,
    setNewCategory,
    creating,
    createMessage,
    showIconPicker,
    setShowIconPicker,
    imagePreview,
    fileInputRef,
    flatCategories,
    handleImageSelect,
    clearImage,
    handleCreateCategory,
    toggleExpand,
    handleManageAttributes,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
    router,
  } = model;

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className={styles.categoryItem}>
        <div className={styles.categoryRow} style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className={styles.categoryInfo}>
            {hasChildren ? (
              <button className={styles.expandButton} onClick={() => toggleExpand(category.id)}>
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className={styles.expandPlaceholder} />
            )}
            {category.image ? (
              <img src={category.image} alt="" className={styles.categoryImage} />
            ) : category.icon ? (
              <span className={styles.categoryIcon}>{category.icon}</span>
            ) : null}
            <span className={styles.categoryName}>{category.name}</span>
            <span className={styles.categorySlug}>{category.slug}</span>
            {!category.isActive && <span className={styles.inactiveBadge}>Скрыта</span>}
            {category._count && (
              <span className={styles.productCount}>
                {category._count.totalProducts ?? category._count.products} товаров
                {category._count.totalProducts !== undefined &&
                  category._count.totalProducts !== category._count.products && (
                    <span className={styles.ownProductCount}>
                      (своих: {category._count.products})
                    </span>
                  )}
              </span>
            )}
          </div>
          <div className={styles.categoryActions}>
            <button
              className={styles.attributesButton}
              onClick={() => handleManageAttributes(category.id)}
              title="Управление атрибутами"
            >
              ⚙️ Атрибуты
            </button>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/admin/catalog/categories/${category.id}/edit`)}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => openDeleteModal(category)}
              title="Удалить категорию"
            >
              🗑️
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Категории</h1>
        <button className={styles.addButton} onClick={() => setShowCreateModal(true)}>
          + Добавить категорию
        </button>
      </div>

      <div className={styles.categoriesTree}>
        {categories.length > 0 ? (
          categories.map((category) => renderCategory(category))
        ) : (
          <div className={styles.empty}>
            <p>Категории не найдены</p>
          </div>
        )}
      </div>

      {deleteModal.isOpen && deleteModal.category && (
        <div className={styles.modalOverlay} onClick={closeDeleteModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Удаление категории</h2>
              <button className={styles.modalClose} onClick={closeDeleteModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <p className={styles.warningText}>
                  <strong>Внимание!</strong> Вы собираетесь удалить категорию:
                </p>
                <p className={styles.categoryToDelete}>&quot;{deleteModal.category.name}&quot;</p>

                {deleteModal.category.children && deleteModal.category.children.length > 0 && (
                  <p className={styles.warningSubtext}>
                    ⚠️ Эта категория содержит {deleteModal.category.children.length} подкатегорий,
                    которые также будут удалены!
                  </p>
                )}

                {deleteModal.category._count && deleteModal.category._count.products > 0 && (
                  <p className={styles.warningSubtext}>
                    ⚠️ В этой категории {deleteModal.category._count.products} товаров. Товары
                    станут без категории!
                  </p>
                )}

                <p className={styles.dangerText}>🚫 Это действие невозможно отменить!</p>
              </div>

              {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.dangerButton}
                onClick={handleDeleteCategory}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить безвозвратно'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Создать категорию</h2>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {createMessage && (
                <div className={`${styles.messageBox} ${styles[createMessage.type]}`}>
                  {createMessage.text}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Название *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: generateSlug(name),
                    }));
                  }}
                  placeholder="Например: Входные двери Гардиан"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Slug (URL) *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                  }
                  placeholder="entrance-doors-guardian"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Родительская категория</label>
                <select
                  value={newCategory.parentId}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                  className={styles.select}
                >
                  <option value="">Без родителя (корневая)</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Описание</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Краткое описание категории"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Иконка или изображение</label>
                <div className={styles.iconImageSection}>
                  <div className={styles.iconPickerWrapper}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                      {newCategory.icon || '📁'} Выбрать иконку
                    </button>
                    {showIconPicker && (
                      <div className={styles.iconPicker}>
                        <div className={styles.iconGrid}>
                          {CATEGORY_ICONS.map((icon, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`${styles.iconOption} ${newCategory.icon === icon ? styles.iconSelected : ''}`}
                              onClick={() => {
                                setNewCategory((prev) => ({ ...prev, icon }));
                                setShowIconPicker(false);
                              }}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                        {newCategory.icon && (
                          <button
                            type="button"
                            className={styles.clearIconButton}
                            onClick={() => {
                              setNewCategory((prev) => ({ ...prev, icon: '' }));
                              setShowIconPicker(false);
                            }}
                          >
                            Очистить иконку
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span className={styles.orDivider}>или</span>

                  <div className={styles.imageUploadWrapper}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      className={styles.fileInput}
                      id="category-image"
                    />
                    <label htmlFor="category-image" className={styles.uploadButton}>
                      📷 Загрузить картинку
                    </label>
                  </div>
                </div>

                {(newCategory.icon || imagePreview) && (
                  <div className={styles.previewSection}>
                    <span className={styles.previewLabel}>Предпросмотр:</span>
                    <div className={styles.preview}>
                      {imagePreview ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            onClick={clearImage}
                          >
                            ✕
                          </button>
                        </div>
                      ) : newCategory.icon ? (
                        <span className={styles.iconPreview}>{newCategory.icon}</span>
                      ) : null}
                      <span className={styles.previewName}>
                        {newCategory.name || 'Название категории'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Отмена
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleCreateCategory}
                disabled={creating || !newCategory.name || !newCategory.slug}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
