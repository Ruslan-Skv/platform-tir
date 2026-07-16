'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AttributeColorDot } from '@/shared/ui/AttributeColorDot/AttributeColorDot';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import {
  AttributeOptionRowsEditor,
  type AttributeOptionRowsEditorMod,
} from './AttributeOptionRowsEditor';
import styles from './CategoryAttributesPage.module.css';
import type { Attribute, CategoryAttribute } from './category-attributes-page.types';
import {
  type AttributeTreeSeriesKey,
  attributeTypeBadgeClass,
  generateSlug,
  getTypeLabel,
  isListAttributeType,
  loadAttributeTreeExpanded,
  saveAttributeTreeExpanded,
} from './category-attributes-page.utils';
import type { CategoryAttributesPageModel } from './hooks/useCategoryAttributesPage';

type CategoryAttributesPageViewProps = {
  model: CategoryAttributesPageModel;
};

export function CategoryAttributesPageView({ model }: CategoryAttributesPageViewProps) {
  const {
    categoryId,
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
    handleDeleteAttributeFromCategory,
    handleToggleRequired,
    handleCreateAttribute,
    handleApplyToProducts,
    toggleSelectForApply,
    handleInheritFromParent,
    openEditModal,
    handleEditAttribute,
  } = model;

  const [treeExpanded, setTreeExpanded] = useState(() => loadAttributeTreeExpanded(categoryId));

  useEffect(() => {
    setTreeExpanded(loadAttributeTreeExpanded(categoryId));
  }, [categoryId]);

  const persistTreeExpanded = useCallback(
    (next: typeof treeExpanded) => {
      setTreeExpanded(next);
      if (categoryId) saveAttributeTreeExpanded(categoryId, next);
    },
    [categoryId]
  );

  const ownAttributes = useMemo(
    () => categoryAttributes.filter((ca) => !ca.isInherited),
    [categoryAttributes]
  );
  const inheritedAttributes = useMemo(
    () => categoryAttributes.filter((ca) => ca.isInherited),
    [categoryAttributes]
  );

  const toggleSeries = (key: AttributeTreeSeriesKey) => {
    persistTreeExpanded({
      ...treeExpanded,
      series: treeExpanded.series.includes(key)
        ? treeExpanded.series.filter((id) => id !== key)
        : [...treeExpanded.series, key],
    });
  };

  const toggleAttribute = (attributeId: string) => {
    persistTreeExpanded({
      ...treeExpanded,
      attributes: treeExpanded.attributes.includes(attributeId)
        ? treeExpanded.attributes.filter((id) => id !== attributeId)
        : [...treeExpanded.attributes, attributeId],
    });
  };

  const expandAllAttributes = () => {
    persistTreeExpanded({
      series: ['own', 'inherited'],
      attributes: categoryAttributes.map((ca) => ca.attributeId),
    });
  };

  const collapseAllAttributes = () => {
    persistTreeExpanded({
      series: treeExpanded.series,
      attributes: [],
    });
  };

  const renderAttributeSubgroup = (ca: CategoryAttribute) => {
    const idx = categoryAttributes.findIndex((item) => item.attributeId === ca.attributeId);
    const isOpen = treeExpanded.attributes.includes(ca.attributeId);
    const valueCount = ca.attribute.values.length;

    return (
      <div key={ca.id} className={styles.treeSubgroupBlock}>
        <div className={styles.treeSubgroupRow}>
          <button
            type="button"
            className={styles.treeToggle}
            onClick={() => toggleAttribute(ca.attributeId)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
          >
            {isOpen ? '▼' : '▶'}
          </button>
          <input
            type="checkbox"
            checked={selectedForApply.includes(ca.attributeId)}
            onChange={() => toggleSelectForApply(ca.attributeId)}
            className={styles.applyCheckbox}
            title="Выбрать для применения к товарам"
          />
          <div className={styles.treeSubgroupMain}>
            <span className={styles.treeSubgroupTitle}>{ca.attribute.name}</span>
            <span className={styles.treeSubgroupMeta}>{ca.attribute.slug}</span>
            <span className={attributeTypeBadgeClass(ca.attribute.type)}>
              {getTypeLabel(ca.attribute.type)}
              {ca.attribute.unit ? ` (${ca.attribute.unit})` : ''}
            </span>
            {ca.isInherited ? (
              <span
                className={styles.inheritedBadge}
                title="Атрибут задан у родительской категории"
              >
                из родителя
              </span>
            ) : null}
            {ca.isRequired ? <span className={styles.requiredBadge}>обязательный</span> : null}
            {valueCount > 0 ? (
              <span className={styles.treeSubgroupMeta}>{valueCount} знач.</span>
            ) : null}
          </div>
          <div className={styles.treeRowActions}>
            <div className={styles.treeReorderButtons}>
              <button
                type="button"
                className={styles.treeReorderButton}
                onClick={() => moveCategoryAttribute(ca.attributeId, 'up')}
                disabled={reordering || idx === 0}
                title="Выше"
                aria-label="Переместить выше"
              >
                <ChevronUp className={styles.treeReorderIconSubgroup} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.treeReorderButton}
                onClick={() => moveCategoryAttribute(ca.attributeId, 'down')}
                disabled={reordering || idx === categoryAttributes.length - 1}
                title="Ниже"
                aria-label="Переместить ниже"
              >
                <ChevronDown className={styles.treeReorderIconSubgroup} aria-hidden />
              </button>
            </div>
            <AdminTableIconButton
              title="Редактировать атрибут (изменения затронут все категории)"
              onClick={() => openEditModal(ca.attribute)}
            >
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              title={
                ca.isInherited
                  ? 'Атрибут задан у родительской категории. Удалите его там или сначала добавьте в эту категорию явно.'
                  : 'Удалить атрибут только из этой категории'
              }
              onClick={() => handleDeleteAttributeFromCategory(ca.attributeId, ca.attribute.name)}
              disabled={Boolean(ca.isInherited)}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        </div>

        {isOpen ? (
          <div className={styles.attrTreeBody}>
            {ca.attribute.values.length > 0 ? (
              <div className={styles.attributeValues}>
                {ca.attribute.values.map((v) => (
                  <span key={v.id} className={styles.valueTag}>
                    {v.colorHex ? (
                      <AttributeColorDot color={v.colorHex} className={styles.colorDot} />
                    ) : null}
                    {v.value}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.attrTreeEmpty}>Нет предустановленных значений</p>
            )}

            {selectedForApply.includes(ca.attributeId) ? (
              <div className={styles.defaultValueInput}>
                <label>Значение по умолчанию для товаров:</label>
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
            ) : null}

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
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderAttributeSeries = (
    seriesKey: AttributeTreeSeriesKey,
    title: string,
    subtitle: string,
    items: CategoryAttribute[]
  ) => {
    if (items.length === 0) return null;
    const seriesOpen = treeExpanded.series.includes(seriesKey);

    return (
      <div className={styles.treeSeriesBlock}>
        <div className={styles.treeSeriesRow}>
          <button
            type="button"
            className={styles.treeToggle}
            onClick={() => toggleSeries(seriesKey)}
            aria-expanded={seriesOpen}
            aria-label={seriesOpen ? 'Свернуть группу' : 'Развернуть группу'}
          >
            {seriesOpen ? '▼' : '▶'}
          </button>
          <div className={styles.treeSeriesMain}>
            <span className={styles.treeSeriesTitle}>{title}</span>
            <span className={styles.treeSeriesMeta}>{subtitle}</span>
            <span className={styles.treeSeriesMeta}>
              {items.length}{' '}
              {items.length === 1 ? 'атрибут' : items.length < 5 ? 'атрибута' : 'атрибутов'}
            </span>
          </div>
        </div>

        {seriesOpen ? (
          <div className={styles.treeSubgroups}>
            {items.map((ca) => renderAttributeSubgroup(ca))}
          </div>
        ) : null}
      </div>
    );
  };

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
        <div className={styles.sectionHeader}>
          <h2>Атрибуты ({categoryAttributes.length})</h2>
        </div>

        <div className={styles.treeToolbar}>
          {categoryAttributes.length > 1 ? (
            <button
              data-admin-mutation
              type="button"
              className={styles.secondaryButton}
              onClick={normalizeCategoryAttributesOrder}
              disabled={reordering}
              title="Пронумеровать атрибуты по текущему списку и сохранить"
            >
              {reordering ? 'Сохранение порядка…' : '↕ Сохранить порядок'}
            </button>
          ) : null}
          {category?.parentId ? (
            <button
              data-admin-mutation
              type="button"
              className={styles.secondaryButton}
              onClick={handleInheritFromParent}
              disabled={inheriting}
              title={`Скопировать атрибуты из родительской категории «${category.parent?.name || ''}»`}
            >
              {inheriting
                ? 'Наследование…'
                : `Унаследовать от «${category.parent?.name || 'родителя'}»`}
            </button>
          ) : null}
          <button
            data-admin-mutation
            type="button"
            className={styles.secondaryButton}
            onClick={() => setShowAddModal(true)}
          >
            + Добавить существующий
          </button>
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            onClick={() => setShowCreateModal(true)}
          >
            + Создать новый
          </button>
          {categoryAttributes.length > 0 ? (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={expandAllAttributes}
              >
                Развернуть все
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={collapseAllAttributes}
              >
                Свернуть все
              </button>
            </>
          ) : null}
        </div>

        <div className={styles.infoBanner} role="note">
          <p>
            Атрибут — общее определение в каталоге; к категории привязывается ссылка. «Удалить»
            снимает привязку только здесь. «Редактировать» меняет определение везде, где атрибут
            используется. «Создать новый» создаёт глобальный атрибут и сразу привязывает к этой
            категории.
          </p>
        </div>

        {categoryAttributes.length > 0 ? (
          <div className={styles.catalogTree}>
            {renderAttributeSeries(
              'own',
              'Собственные атрибуты',
              'Привязаны напрямую к этой категории',
              ownAttributes
            )}
            {renderAttributeSeries(
              'inherited',
              `Унаследованные${category?.parent?.name ? ` · ${category.parent.name}` : ''}`,
              'Заданы у родительской категории — удалить можно только там',
              inheritedAttributes
            )}
          </div>
        ) : (
          <div className={styles.treeEmpty}>
            <p>Атрибуты не добавлены</p>
            <p className={styles.hint}>
              Добавьте атрибуты, чтобы задать характеристики товарам этой категории
            </p>
          </div>
        )}

        {selectedForApply.length > 0 ? (
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
        ) : null}
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
            <label className={`${styles.checkboxLabel} ${styles.checkboxLabelTight}`}>
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
                    data-admin-mutation
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
                data-admin-mutation
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

            <div className={styles.editSharedWarning} role="note">
              Правки имени, slug, типа и значений затронут все категории, где используется этот
              атрибут.
            </div>

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
              <button
                data-admin-mutation
                className={styles.saveButton}
                onClick={handleEditAttribute}
                disabled={saving}
              >
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
