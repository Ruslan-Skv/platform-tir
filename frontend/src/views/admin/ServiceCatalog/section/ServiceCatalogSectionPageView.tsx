'use client';

import React from 'react';

import Link from 'next/link';

import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { IndentedBlock } from '@/shared/ui/IndentedBlock/IndentedBlock';

import { SERVICE_ICON_OPTIONS } from '../shared/SERVICE_ICON_OPTIONS';
import styles from './ServiceCatalogSectionPage.module.css';
import type { ServiceCatalogSectionPageModel } from './hooks/useServiceCatalogSectionPage';
import {
  buildDeleteCategoryModalMessage,
  countNestedCategories,
  flattenVisible,
  slugify,
} from './service-catalog-section-page.utils';

type ServiceCatalogSectionPageViewProps = {
  model: ServiceCatalogSectionPageModel;
};

export function ServiceCatalogSectionPageView({ model }: ServiceCatalogSectionPageViewProps) {
  const {
    categories,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    showCreateModal,
    creating,
    createMessage,
    newCategory,
    setNewCategory,
    expandedCategoryIds,
    showNewIconPicker,
    setShowNewIconPicker,
    newCategoryFileInputRef,
    newCategoryCardBgFileInputRef,
    editingCategory,
    setEditingCategory,
    showEditIconPicker,
    setShowEditIconPicker,
    editCategoryData,
    setEditCategoryData,
    editCategoryFileInputRef,
    editCategoryCardBgFileInputRef,
    flatForParentSelect,
    editExcludedParentIds,
    toggleCategoryExpand,
    openCreateModal,
    closeCreateModal,
    handleNewCategoryImageSelect,
    clearNewCategoryImage,
    handleEditCategoryImageSelect,
    clearEditCategoryImage,
    handleNewCategoryCardBgSelect,
    clearNewCategoryCardBg,
    handleEditCategoryCardBgSelect,
    clearEditCategoryCardBg,
    handleAddCategory,
    handleUpdateCategory,
    handleDelete,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Категории ремонта квартир</h1>
        <button type="button" className={styles.addButton} onClick={openCreateModal}>
          + Добавить категорию
        </button>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Категории</h2>
        <div className={styles.categoriesTree}>
          {categories.length > 0 ? (
            <ul className={styles.categoriesList}>
              {flattenVisible(categories, 0, expandedCategoryIds).map(({ cat, level }) => {
                const hasChildNodes = (cat.children?.length ?? 0) > 0;
                return (
                  <li key={cat.id} className={styles.categoryItem}>
                    {editingCategory === cat.id && editCategoryData ? (
                      <div className={styles.categoryEditRow}>
                        <input
                          type="text"
                          value={editCategoryData.name}
                          onChange={(e) =>
                            setEditCategoryData((p) =>
                              p ? { ...p, name: e.target.value, slug: slugify(e.target.value) } : p
                            )
                          }
                          className={styles.input}
                          placeholder="Название"
                        />
                        <input
                          type="text"
                          value={editCategoryData.slug}
                          onChange={(e) =>
                            setEditCategoryData((p) => (p ? { ...p, slug: e.target.value } : p))
                          }
                          className={styles.input}
                          placeholder="Slug"
                        />
                        <label className={styles.formGroup}>
                          <span className={styles.parentFieldLabel}>Родительская категория</span>
                          <select
                            className={styles.select}
                            value={editCategoryData.parentId ?? ''}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p ? { ...p, parentId: e.target.value || null } : p
                              )
                            }
                          >
                            <option value="">Корень (верхний уровень)</option>
                            {flatForParentSelect
                              .filter((o) => !editExcludedParentIds.has(o.id))
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <span className={styles.fieldHint}>
                          Иконка из набора или своя картинка («Картинка» справа).
                        </span>
                        <div className={styles.iconPickerWrapper}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                          >
                            {editCategoryData.icon &&
                            serviceCatalogIconMap[editCategoryData.icon] ? (
                              React.createElement(serviceCatalogIconMap[editCategoryData.icon], {
                                className: styles.iconButtonSvg,
                              })
                            ) : (
                              <span className={styles.iconButtonPlaceholder}>📁</span>
                            )}
                            {' Выбрать иконку'}
                          </button>
                          {showEditIconPicker && (
                            <div className={styles.iconPicker}>
                              <div className={styles.iconGrid}>
                                {SERVICE_ICON_OPTIONS.map((opt) => {
                                  const IconC = serviceCatalogIconMap[opt.value];
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      className={`${styles.iconOption} ${editCategoryData.icon === opt.value ? styles.iconSelected : ''}`}
                                      onClick={() => {
                                        setEditCategoryData((p) =>
                                          p ? { ...p, icon: opt.value } : p
                                        );
                                        setShowEditIconPicker(false);
                                      }}
                                      title={opt.label}
                                    >
                                      {IconC && <IconC className={styles.iconOptionSvg} />}
                                    </button>
                                  );
                                })}
                              </div>
                              {editCategoryData.icon && (
                                <button
                                  type="button"
                                  className={styles.clearIconButton}
                                  onClick={() => {
                                    setEditCategoryData((p) => (p ? { ...p, icon: '' } : p));
                                    setShowEditIconPicker(false);
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
                            ref={editCategoryFileInputRef}
                            accept="image/*"
                            onChange={handleEditCategoryImageSelect}
                            className={styles.fileInput}
                            id="edit-category-image"
                          />
                          <label htmlFor="edit-category-image" className={styles.uploadButton}>
                            📷 Картинка
                          </label>
                        </div>
                        {(editCategoryData.image || editCategoryData.icon) && (
                          <div className={styles.iconImagePreview}>
                            {editCategoryData.image ? (
                              <div className={styles.imagePreviewWrapper}>
                                <img
                                  src={editCategoryData.image}
                                  alt=""
                                  className={styles.imagePreview}
                                />
                                <button
                                  type="button"
                                  className={styles.removeImageButton}
                                  onClick={clearEditCategoryImage}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : editCategoryData.icon &&
                              serviceCatalogIconMap[editCategoryData.icon] ? (
                              <span className={styles.iconPreview}>
                                {React.createElement(serviceCatalogIconMap[editCategoryData.icon], {
                                  className: styles.iconPreviewSvg,
                                })}
                              </span>
                            ) : null}
                          </div>
                        )}
                        <div className={styles.cardBgField}>
                          <span className={styles.parentFieldLabel}>
                            Фон карточки на странице «Ремонт квартир»
                          </span>
                          <div className={styles.cardBgRow}>
                            <input
                              type="file"
                              ref={editCategoryCardBgFileInputRef}
                              accept="image/*"
                              onChange={handleEditCategoryCardBgSelect}
                              className={styles.fileInput}
                              id="edit-category-card-bg"
                            />
                            <label htmlFor="edit-category-card-bg" className={styles.uploadButton}>
                              🖼 Фон карточки
                            </label>
                            {editCategoryData.cardBackgroundImage ? (
                              <button
                                type="button"
                                className={styles.clearCardBgButton}
                                onClick={clearEditCategoryCardBg}
                              >
                                Сбросить фон
                              </button>
                            ) : null}
                          </div>
                          {editCategoryData.cardBackgroundImage ? (
                            <img
                              src={editCategoryData.cardBackgroundImage}
                              alt=""
                              className={styles.cardBgPreviewImg}
                            />
                          ) : null}
                        </div>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={editCategoryData.cardBackgroundTransparent}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p ? { ...p, cardBackgroundTransparent: e.target.checked } : p
                              )
                            }
                          />
                          Прозрачный фон карточки на «Ремонт квартир»
                        </label>
                        <span className={styles.fieldHint}>
                          Без белой/тёмной заливки плитки — виден фон страницы. Если задан
                          фон-картинка, затемнение для текста слабее.
                        </span>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={editCategoryData.showPricesInPublic}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p ? { ...p, showPricesInPublic: e.target.checked } : p
                              )
                            }
                          />
                          Показывать цены на сайте
                        </label>
                        <label className={styles.formGroup}>
                          <span className={styles.parentFieldLabel}>
                            Наценка на группу, % (к базовой цене; может быть отрицательной)
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            className={styles.input}
                            value={editCategoryData.priceMarkupPercent}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p
                                  ? {
                                      ...p,
                                      priceMarkupPercent: parseFloat(e.target.value) || 0,
                                    }
                                  : p
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.saveButton}
                          onClick={() => handleUpdateCategory(cat.id)}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className={styles.cancelButton}
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryData(null);
                            setShowEditIconPicker(false);
                            if (editCategoryCardBgFileInputRef.current) {
                              editCategoryCardBgFileInputRef.current.value = '';
                            }
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <IndentedBlock paddingLeft={12 + level * 18} className={styles.categoryRow}>
                        <div className={styles.categoryInfo}>
                          {hasChildNodes ? (
                            <button
                              type="button"
                              className={styles.treeExpandButton}
                              onClick={() => toggleCategoryExpand(cat.id)}
                              title={expandedCategoryIds.has(cat.id) ? 'Свернуть' : 'Развернуть'}
                              aria-expanded={expandedCategoryIds.has(cat.id)}
                            >
                              {expandedCategoryIds.has(cat.id) ? '▼' : '▶'}
                            </button>
                          ) : (
                            <span className={styles.expandPlaceholder} />
                          )}
                          {cat.image ? (
                            <img src={cat.image} alt="" className={styles.categoryImage} />
                          ) : cat.icon && serviceCatalogIconMap[cat.icon] ? (
                            <span className={styles.categoryIcon}>
                              {React.createElement(serviceCatalogIconMap[cat.icon], {
                                className: styles.categoryIconSvg,
                              })}
                            </span>
                          ) : null}
                          <Link
                            href={`/catalog/services/${cat.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.categoryName}
                          >
                            {cat.name}
                          </Link>
                          <span className={styles.categorySlug}>{cat.slug}</span>
                          <span className={styles.itemsCount}>
                            {cat.items?.length ?? cat._count?.items ?? 0} видов работ
                          </span>
                        </div>
                        <div className={styles.categoryActions}>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => {
                              setEditingCategory(cat.id);
                              setEditCategoryData({
                                name: cat.name,
                                slug: cat.slug,
                                icon: cat.icon || '',
                                image: cat.image || '',
                                cardBackgroundImage: cat.cardBackgroundImage || '',
                                cardBackgroundTransparent: Boolean(cat.cardBackgroundTransparent),
                                showPricesInPublic: cat.showPricesInPublic ?? true,
                                priceMarkupPercent: Number(cat.priceMarkupPercent ?? 0),
                                parentId: cat.parentId ?? null,
                              });
                            }}
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() =>
                              setDeleteTarget({
                                type: 'category',
                                id: cat.id,
                                name: cat.name,
                                nestedCategoryCount: countNestedCategories(cat),
                              })
                            }
                            title="Удалить категорию"
                          >
                            🗑️
                          </button>
                        </div>
                      </IndentedBlock>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyList}>Категории не найдены</div>
          )}
        </div>
      </section>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => !creating && closeCreateModal()}>
          <div className={styles.createModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Создать категорию</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {createMessage && (
                <div className={`${styles.messageBox} ${styles[createMessage.type]}`}>
                  {createMessage.text}
                </div>
              )}

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Название *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: slugify(name),
                    }));
                  }}
                  placeholder="Например: Малярные работы"
                  className={styles.createInput}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Slug (URL) *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="malyarnye-raboty"
                  className={styles.createInput}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Родительская категория</label>
                <select
                  className={styles.createSelect}
                  value={newCategory.parentId}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                >
                  <option value="">Без родителя (корневая)</option>
                  {flatForParentSelect.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Описание</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Краткое описание категории"
                  className={styles.createTextarea}
                  rows={3}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Иконка или изображение</label>
                <span className={styles.fieldHint}>
                  Значок из набора ниже или своё изображение — кнопка «Загрузить картинку» справа
                  (на сайте показывается картинка, если она задана).
                </span>
                <div className={styles.createIconImageRow}>
                  <div className={styles.iconPickerWrapper}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                    >
                      {newCategory.icon && serviceCatalogIconMap[newCategory.icon] ? (
                        React.createElement(serviceCatalogIconMap[newCategory.icon], {
                          className: styles.iconButtonSvg,
                        })
                      ) : (
                        <span className={styles.iconButtonPlaceholder}>📁</span>
                      )}
                      {' Выбрать иконку'}
                    </button>
                    {showNewIconPicker && (
                      <div className={styles.iconPicker}>
                        <div className={styles.iconGrid}>
                          {SERVICE_ICON_OPTIONS.map((opt) => {
                            const IconC = serviceCatalogIconMap[opt.value];
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                className={`${styles.iconOption} ${newCategory.icon === opt.value ? styles.iconSelected : ''}`}
                                onClick={() => {
                                  setNewCategory((prev) => ({ ...prev, icon: opt.value }));
                                  setShowNewIconPicker(false);
                                }}
                                title={opt.label}
                              >
                                {IconC && <IconC className={styles.iconOptionSvg} />}
                              </button>
                            );
                          })}
                        </div>
                        {newCategory.icon ? (
                          <button
                            type="button"
                            className={styles.clearIconButton}
                            onClick={() => {
                              setNewCategory((prev) => ({ ...prev, icon: '' }));
                              setShowNewIconPicker(false);
                            }}
                          >
                            Очистить иконку
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <span className={styles.orDivider}>или</span>
                  <div className={styles.imageUploadWrapper}>
                    <input
                      type="file"
                      ref={newCategoryFileInputRef}
                      accept="image/*"
                      onChange={handleNewCategoryImageSelect}
                      className={styles.fileInput}
                      id="new-category-image-modal"
                    />
                    <label htmlFor="new-category-image-modal" className={styles.uploadButton}>
                      📷 Загрузить картинку
                    </label>
                  </div>
                </div>

                {(newCategory.icon || newCategory.image) && (
                  <div className={styles.createPreviewSection}>
                    <span className={styles.previewLabel}>Предпросмотр:</span>
                    <div className={styles.createPreview}>
                      {newCategory.image ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img src={newCategory.image} alt="" className={styles.imagePreview} />
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            onClick={clearNewCategoryImage}
                          >
                            ✕
                          </button>
                        </div>
                      ) : newCategory.icon && serviceCatalogIconMap[newCategory.icon] ? (
                        <span className={styles.iconPreview}>
                          {React.createElement(serviceCatalogIconMap[newCategory.icon], {
                            className: styles.iconPreviewSvg,
                          })}
                        </span>
                      ) : null}
                      <span className={styles.previewName}>
                        {newCategory.name || 'Название категории'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Фон карточки на странице «Ремонт квартир»</label>
                <span className={styles.fieldHint}>
                  Необязательно. Широкая фотография для фона плитки категории в общем списке (иконка
                  и название остаются поверх затемнённого слоя).
                </span>
                <div className={styles.cardBgRow}>
                  <input
                    type="file"
                    ref={newCategoryCardBgFileInputRef}
                    accept="image/*"
                    onChange={handleNewCategoryCardBgSelect}
                    className={styles.fileInput}
                    id="new-category-card-bg-modal"
                  />
                  <label htmlFor="new-category-card-bg-modal" className={styles.uploadButton}>
                    🖼 Загрузить фон
                  </label>
                  {newCategory.cardBackgroundImage ? (
                    <button
                      type="button"
                      className={styles.clearCardBgButton}
                      onClick={clearNewCategoryCardBg}
                    >
                      Сбросить фон
                    </button>
                  ) : null}
                </div>
                {newCategory.cardBackgroundImage ? (
                  <img
                    src={newCategory.cardBackgroundImage}
                    alt=""
                    className={styles.cardBgPreviewImg}
                  />
                ) : null}
              </div>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={newCategory.cardBackgroundTransparent}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      cardBackgroundTransparent: e.target.checked,
                    }))
                  }
                />
                Прозрачный фон карточки на «Ремонт квартир»
              </label>
              <span className={styles.fieldHint}>
                Без заливки плитки на сайте; при фоновой картинке — более лёгкий слой под текстом.
              </span>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={newCategory.showPricesInPublic}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      showPricesInPublic: e.target.checked,
                    }))
                  }
                />
                Показывать цены на сайте
              </label>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>
                  Наценка на группу, % (к базовой цене видов работ; может быть отрицательной)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={newCategory.priceMarkupPercent}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      priceMarkupPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalFooterCancel}
                onClick={closeCreateModal}
                disabled={creating}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleAddCategory()}
                disabled={creating || !newCategory.name.trim() || !newCategory.slug.trim()}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={
          deleteTarget && deleteTarget.nestedCategoryCount > 0
            ? 'Удаление категории и подкатегорий'
            : 'Подтверждение удаления'
        }
        message={
          deleteTarget
            ? buildDeleteCategoryModalMessage(deleteTarget.name, deleteTarget.nestedCategoryCount)
            : ''
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
