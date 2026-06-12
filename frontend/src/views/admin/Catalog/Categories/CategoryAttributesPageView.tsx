'use client';

import {
  AttributeOptionRowsEditor,
  type AttributeOptionRowsEditorMod,
} from './AttributeOptionRowsEditor';
import styles from './CategoryAttributesPage.module.css';
import type { Attribute } from './category-attributes-page.types';
import {
  attributeTypeBadgeClass,
  generateSlug,
  getTypeLabel,
  isListAttributeType,
} from './category-attributes-page.utils';
import type { CategoryAttributesPageModel } from './hooks/useCategoryAttributesPage';

type CategoryAttributesPageViewProps = {
  model: CategoryAttributesPageModel;
};

export function CategoryAttributesPageView({ model }: CategoryAttributesPageViewProps) {
  const {
    router,
    category,
    categoryAttributes,
    loading,
    saving,
    noticeModal,
    reordering,
    showAddModal,
    setShowAddModal,
    showCreateModal,
    setShowCreateModal,
    selectedAttributeIds,
    setSelectedAttributeIds,
    bulkAddAsRequired,
    setBulkAddAsRequired,
    createLinkAsRequired,
    setCreateLinkAsRequired,
    newAttribute,
    setNewAttribute,
    showEditModal,
    setShowEditModal,
    editingAttribute,
    editForm,
    setEditForm,
    applyingToProducts,
    selectedForApply,
    defaultValues,
    setDefaultValues,
    inheriting,
    clearNoticeModal,
    availableAttributes,
    normalizeCategoryAttributesOrder,
    moveCategoryAttribute,
    handleAddAttributes,
    handleRemoveAttribute,
    handleToggleRequired,
    handleCreateAttribute,
    handleApplyToProducts,
    toggleSelectForApply,
    handleInheritFromParent,
    openEditModal,
    handleEditAttribute,
    handleDeleteAttribute,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/admin/catalog/categories')}
        >
          ← Назад к категориям
        </button>
        <h1 className={styles.title}>Атрибуты категории: {category?.name}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Атрибуты категории ({categoryAttributes.length})</h2>
            <div className={styles.sectionActions}>
              {categoryAttributes.length > 1 && (
                <button
                  className={styles.normalizeOrderButton}
                  onClick={normalizeCategoryAttributesOrder}
                  disabled={reordering}
                  title="Пронумеровать атрибуты по текущему списку и сохранить. Полезно, если после добавления у нескольких атрибутов одинаковый order."
                >
                  {reordering ? '⏳ Сохранение порядка...' : '↕ Сохранить порядок'}
                </button>
              )}
              {category?.parentId && (
                <button
                  className={styles.inheritButton}
                  onClick={handleInheritFromParent}
                  disabled={inheriting}
                  title={`Скопировать атрибуты из родительской категории "${category.parent?.name || ''}"`}
                >
                  {inheriting
                    ? '⏳ Наследование...'
                    : `📥 Унаследовать от "${category.parent?.name || 'родителя'}"`}
                </button>
              )}
              <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
                + Добавить существующий
              </button>
              <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                + Создать новый
              </button>
            </div>
          </div>

          {categoryAttributes.length > 0 ? (
            <div className={styles.attributesList}>
              {categoryAttributes.map((ca, idx) => (
                <div key={ca.id} className={styles.attributeCard}>
                  <div className={styles.attributeHeader}>
                    <input
                      type="checkbox"
                      checked={selectedForApply.includes(ca.attributeId)}
                      onChange={() => toggleSelectForApply(ca.attributeId)}
                      className={styles.applyCheckbox}
                      title="Выбрать для применения к товарам"
                    />
                    <div className={styles.orderControls} aria-label="Порядок атрибутов">
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveCategoryAttribute(ca.attributeId, 'up')}
                        disabled={reordering || idx === 0}
                        title="Выше"
                        aria-label="Переместить выше"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveCategoryAttribute(ca.attributeId, 'down')}
                        disabled={reordering || idx === categoryAttributes.length - 1}
                        title="Ниже"
                        aria-label="Переместить ниже"
                      >
                        ↓
                      </button>
                    </div>
                    <div className={styles.attributeInfo}>
                      <span className={styles.attributeName}>{ca.attribute.name}</span>
                      <span className={styles.attributeSlug}>{ca.attribute.slug}</span>
                    </div>
                    <span className={attributeTypeBadgeClass(ca.attribute.type)}>
                      {getTypeLabel(ca.attribute.type)}
                      {ca.attribute.unit && ` (${ca.attribute.unit})`}
                    </span>
                  </div>

                  {ca.attribute.values.length > 0 && (
                    <div className={styles.attributeValues}>
                      {ca.attribute.values.slice(0, 5).map((v) => (
                        <span key={v.id} className={styles.valueTag}>
                          {v.colorHex && (
                            <span className={styles.colorDot} style={{ background: v.colorHex }} />
                          )}
                          {v.value}
                        </span>
                      ))}
                      {ca.attribute.values.length > 5 && (
                        <span className={styles.moreValues}>+{ca.attribute.values.length - 5}</span>
                      )}
                    </div>
                  )}

                  {selectedForApply.includes(ca.attributeId) && (
                    <div className={styles.defaultValueInput}>
                      <label>Значение по умолчанию:</label>
                      <input
                        type="text"
                        value={defaultValues[ca.attributeId] || ''}
                        onChange={(e) =>
                          setDefaultValues((prev) => ({
                            ...prev,
                            [ca.attributeId]: e.target.value,
                          }))
                        }
                        placeholder="Оставьте пустым, если не нужно"
                        className={styles.input}
                      />
                    </div>
                  )}

                  <div className={styles.attributeFooter}>
                    <label
                      className={styles.requiredToggle}
                      title="На карточке товара поле подсвечивается и сохранение без значения блокируется."
                    >
                      <input
                        type="checkbox"
                        checked={ca.isRequired}
                        onChange={() => handleToggleRequired(ca.attributeId, ca.isRequired)}
                      />
                      <span>Обязательный для товара</span>
                    </label>
                    <div className={styles.attributeActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditModal(ca.attribute)}
                        title="Редактировать атрибут"
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveAttribute(ca.attributeId)}
                        title="Убрать из категории"
                      >
                        Убрать
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteAttribute(ca.attributeId, ca.attribute.name)}
                        title="Удалить атрибут полностью"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Атрибуты не добавлены</p>
              <p className={styles.hint}>
                Добавьте атрибуты, чтобы задать характеристики товарам этой категории
              </p>
            </div>
          )}

          {selectedForApply.length > 0 && (
            <div className={styles.applySection}>
              <button
                className={styles.applyButton}
                onClick={handleApplyToProducts}
                disabled={applyingToProducts}
              >
                {applyingToProducts
                  ? 'Применение...'
                  : `Применить ${selectedForApply.length} атрибут(ов) ко всем товарам категории`}
              </button>
              <p className={styles.applyHint}>
                Атрибуты будут добавлены к товарам, которые их ещё не имеют
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowAddModal(false);
            setBulkAddAsRequired(false);
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Добавить атрибуты</h3>
            <p className={styles.hint}>
              Отметьте «Обязательный для товара», чтобы на карточке товара поле подсвечивалось и не
              давало сохранить товар без значения (в категориях с этим атрибутом).
            </p>
            <label className={styles.checkboxLabel} style={{ marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={bulkAddAsRequired}
                onChange={(e) => setBulkAddAsRequired(e.target.checked)}
              />
              <span>Обязательный для товара (все выбранные ниже)</span>
            </label>

            {availableAttributes.length > 0 ? (
              <>
                <div className={styles.attributeSelectList}>
                  {availableAttributes.map((attr) => (
                    <label key={attr.id} className={styles.attributeSelectItem}>
                      <input
                        type="checkbox"
                        checked={selectedAttributeIds.includes(attr.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttributeIds((prev) => [...prev, attr.id]);
                          } else {
                            setSelectedAttributeIds((prev) => prev.filter((id) => id !== attr.id));
                          }
                        }}
                      />
                      <span className={styles.attrName}>{attr.name}</span>
                      <span className={attributeTypeBadgeClass(attr.type)}>
                        {getTypeLabel(attr.type)}
                      </span>
                    </label>
                  ))}
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowAddModal(false);
                      setBulkAddAsRequired(false);
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    className={styles.saveButton}
                    onClick={handleAddAttributes}
                    disabled={saving || selectedAttributeIds.length === 0}
                  >
                    {saving ? 'Добавление...' : `Добавить (${selectedAttributeIds.length})`}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyModal}>
                <p>Все атрибуты уже добавлены к категории</p>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowAddModal(false);
                    setBulkAddAsRequired(false);
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowCreateModal(false);
            setCreateLinkAsRequired(false);
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Создать новый атрибут</h3>

            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                value={newAttribute.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewAttribute((prev) => ({
                    ...prev,
                    name,
                    slug: generateSlug(name),
                  }));
                }}
                className={styles.input}
                placeholder="Например: Материал"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={newAttribute.slug}
                onChange={(e) =>
                  setNewAttribute((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                className={styles.input}
                placeholder="material"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Тип</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) => {
                    const type = e.target.value as Attribute['type'];
                    setNewAttribute((prev) => ({
                      ...prev,
                      type,
                      ...(!isListAttributeType(type) ? { optionRows: [] } : {}),
                    }));
                  }}
                  className={styles.select}
                >
                  <option value="TEXT">Текст</option>
                  <option value="NUMBER">Число</option>
                  <option value="BOOLEAN">Да/Нет</option>
                  <option value="SELECT">Выбор из списка</option>
                  <option value="MULTI_SELECT">Множественный выбор</option>
                  <option value="COLOR">Цвет</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Единица измерения</label>
                <input
                  type="text"
                  value={newAttribute.unit}
                  onChange={(e) => setNewAttribute((prev) => ({ ...prev, unit: e.target.value }))}
                  className={styles.input}
                  placeholder="мм, кг, шт"
                />
              </div>
            </div>

            {isListAttributeType(newAttribute.type) && (
              <div className={styles.formGroup}>
                <AttributeOptionRowsEditor
                  rows={newAttribute.optionRows}
                  onChange={(optionRows) => setNewAttribute((prev) => ({ ...prev, optionRows }))}
                  mod={styles as AttributeOptionRowsEditorMod}
                />
              </div>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newAttribute.isFilterable}
                onChange={(e) =>
                  setNewAttribute((prev) => ({ ...prev, isFilterable: e.target.checked }))
                }
              />
              <span>Использовать для фильтрации</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={createLinkAsRequired}
                onChange={(e) => setCreateLinkAsRequired(e.target.checked)}
              />
              <span>Обязательный при заполнении карточек товаров в этой категории</span>
            </label>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateLinkAsRequired(false);
                }}
              >
                Отмена
              </button>
              <button
                className={styles.saveButton}
                onClick={handleCreateAttribute}
                disabled={saving}
              >
                {saving ? 'Создание...' : 'Создать и добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingAttribute && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Редактировать атрибут</h3>

            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEditForm((prev) => ({
                    ...prev,
                    name,
                    slug: generateSlug(name),
                  }));
                }}
                className={styles.input}
                placeholder="Например: Материал"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={editForm.slug}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                className={styles.input}
                placeholder="material"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Тип</label>
                <select
                  value={editForm.type}
                  onChange={(e) => {
                    const type = e.target.value as Attribute['type'];
                    setEditForm((prev) => ({
                      ...prev,
                      type,
                      ...(!isListAttributeType(type) ? { optionRows: [] } : {}),
                    }));
                  }}
                  className={styles.select}
                >
                  <option value="TEXT">Текст</option>
                  <option value="NUMBER">Число</option>
                  <option value="BOOLEAN">Да/Нет</option>
                  <option value="SELECT">Выбор из списка</option>
                  <option value="MULTI_SELECT">Множественный выбор</option>
                  <option value="COLOR">Цвет</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Единица измерения</label>
                <input
                  type="text"
                  value={editForm.unit}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className={styles.input}
                  placeholder="мм, кг, шт"
                />
              </div>
            </div>

            {isListAttributeType(editForm.type) && (
              <div className={styles.formGroup}>
                <AttributeOptionRowsEditor
                  rows={editForm.optionRows}
                  onChange={(optionRows) => setEditForm((prev) => ({ ...prev, optionRows }))}
                  mod={styles as AttributeOptionRowsEditorMod}
                />
              </div>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={editForm.isFilterable}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isFilterable: e.target.checked }))
                }
              />
              <span>Использовать для фильтрации</span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowEditModal(false)}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleEditAttribute} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeModal && (
        <div
          className={styles.noticeOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="category-attributes-notice-title"
          onClick={clearNoticeModal}
        >
          <div
            className={`${styles.noticeModal} ${
              noticeModal.type === 'success' ? styles.noticeModalSuccess : styles.noticeModalError
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="category-attributes-notice-title">
              {noticeModal.type === 'success' ? 'Готово' : 'Ошибка'}
            </h3>
            <p className={styles.noticeModalText}>{noticeModal.text}</p>
            <div className={styles.noticeModalActions}>
              <button type="button" className={styles.noticeModalButton} onClick={clearNoticeModal}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
