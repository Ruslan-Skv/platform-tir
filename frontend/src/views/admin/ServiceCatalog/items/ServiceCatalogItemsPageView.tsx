'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  FoldVertical,
  UnfoldVertical,
} from 'lucide-react';

import React from 'react';
import { createPortal } from 'react-dom';

import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './ServiceCatalogItemsPage.module.css';
import type { ServiceCatalogItemsPageModel } from './hooks/useServiceCatalogItemsPage';
import {
  collectDescendantCategoryIds,
  countItemsInDescendantCategories,
  effectiveServiceCatalogMarkupPercentClient,
  flattenServiceCategories,
  formatPrice,
  getSiblingCategories,
  isStrictDescendantOf,
  priceWithMarkup,
  sortItemsByOrder,
} from './service-catalog-items-page.utils';

type ServiceCatalogItemsPageViewProps = {
  model: ServiceCatalogItemsPageModel;
};

export function ServiceCatalogItemsPageView({ model }: ServiceCatalogItemsPageViewProps) {
  const {
    categories,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    showNewItem,
    setShowNewItem,
    newItem,
    setNewItem,
    editingItem,
    setEditingItem,
    editItemData,
    setEditItemData,
    collapsedCategoryIds,
    nestedChildBlocksHiddenRoots,
    reorderInProgress,
    structuralCategoryRows,
    categoryMarkupById,
    categoryParentMap,
    toggleCategory,
    toggleAllDescendantsCollapsed,
    toggleNestedChildCategoryBlocksVisibility,
    reorderCategory,
    reorderItem,
    handleAddItem,
    handleUpdateItem,
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
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Виды работ</h1>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Виды работ по категориям</h2>
          {categories.length === 0 ? (
            <p className={styles.empty}>
              Создайте категории в разделе «Категории», затем добавляйте виды работ.
            </p>
          ) : (
            flattenServiceCategories(categories).map(({ cat, level }) => {
              if (level > 0) {
                for (const rootId of nestedChildBlocksHiddenRoots) {
                  if (isStrictDescendantOf(cat.id, rootId, categoryParentMap)) {
                    return null;
                  }
                }
              }

              const effectiveMarkup = effectiveServiceCatalogMarkupPercentClient(
                cat.id,
                categoryMarkupById
              );

              const isCollapsed = collapsedCategoryIds.has(cat.id);
              const itemsCount = cat.items?.length ?? 0;
              const descendantIds =
                level === 0 && cat.children?.length ? collectDescendantCategoryIds(cat) : [];
              const nestedGroupCount = descendantIds.length;
              const nestedItemsCount =
                level === 0 && cat.children?.length ? countItemsInDescendantCategories(cat) : 0;
              const allNestedCollapsed =
                descendantIds.length > 0 &&
                descendantIds.every((id) => collapsedCategoryIds.has(id));
              const nestedChildBlocksHidden =
                level === 0 && descendantIds.length > 0 && nestedChildBlocksHiddenRoots.has(cat.id);
              const siblingCats = getSiblingCategories(cat, structuralCategoryRows);
              const catOrderIdx = siblingCats.findIndex((s) => s.id === cat.id);
              const canMoveCategoryUp = siblingCats.length > 1 && catOrderIdx > 0;
              const canMoveCategoryDown =
                siblingCats.length > 1 && catOrderIdx >= 0 && catOrderIdx < siblingCats.length - 1;
              const itemsSorted = sortItemsByOrder(cat.items ?? []);
              return (
                <div
                  key={cat.id}
                  className={`${styles.categoryBlock} ${level === 0 ? styles.categoryBlockParent : styles.categoryBlockChild}`}
                  style={level > 0 ? { marginLeft: `calc(${level} * 2rem)` } : undefined}
                >
                  <div className={styles.categoryBlockHeader}>
                    <div className={styles.categoryHeaderControls}>
                      <button
                        type="button"
                        className={styles.expandButton}
                        onClick={() => toggleCategory(cat.id)}
                        title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? '+' : '−'}
                      </button>
                      {descendantIds.length > 0 ? (
                        <>
                          <button
                            type="button"
                            className={styles.nestedToggleButton}
                            onClick={() => toggleAllDescendantsCollapsed(cat)}
                            title={
                              allNestedCollapsed
                                ? 'Развернуть таблицы видов работ во всех вложенных категориях'
                                : 'Свернуть таблицы видов работ во всех вложенных категориях'
                            }
                            aria-label={
                              allNestedCollapsed
                                ? 'Развернуть таблицы видов работ во всех вложенных категориях'
                                : 'Свернуть таблицы видов работ во всех вложенных категориях'
                            }
                          >
                            {allNestedCollapsed ? (
                              <ChevronsUp className={styles.nestedToggleIcon} aria-hidden />
                            ) : (
                              <ChevronsDown className={styles.nestedToggleIcon} aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.nestedListToggleButton}
                            onClick={() => toggleNestedChildCategoryBlocksVisibility(cat.id)}
                            title={
                              nestedChildBlocksHidden
                                ? 'Показать список вложенных категорий'
                                : 'Скрыть список вложенных категорий'
                            }
                            aria-label={
                              nestedChildBlocksHidden
                                ? 'Показать список вложенных категорий'
                                : 'Скрыть список вложенных категорий'
                            }
                          >
                            {nestedChildBlocksHidden ? (
                              <UnfoldVertical className={styles.nestedToggleIcon} aria-hidden />
                            ) : (
                              <FoldVertical className={styles.nestedToggleIcon} aria-hidden />
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>
                    <div className={styles.categoryHeaderMain}>
                      <div className={styles.categoryTitleWithReorder}>
                        <h3
                          className={`${styles.categoryBlockTitle} ${level > 0 ? styles.categoryBlockTitleNested : ''}`}
                        >
                          <span className={styles.categoryTitleRow}>
                            {cat.image ? (
                              <img src={cat.image} alt="" className={styles.categoryBlockImage} />
                            ) : cat.icon && serviceCatalogIconMap[cat.icon] ? (
                              <span className={styles.categoryBlockIcon}>
                                {React.createElement(serviceCatalogIconMap[cat.icon], {
                                  className: styles.categoryBlockIconSvg,
                                })}
                              </span>
                            ) : null}
                            {cat.name}
                            {itemsCount > 0 && (
                              <span className={styles.categoryBlockCount}> ({itemsCount})</span>
                            )}
                            {effectiveMarkup !== 0 && (
                              <span className={styles.categoryMarkupBadge}>
                                {' '}
                                · наценка {effectiveMarkup > 0 ? '+' : ''}
                                {effectiveMarkup}%
                              </span>
                            )}
                          </span>
                        </h3>
                        {siblingCats.length > 1 ? (
                          <div
                            className={styles.reorderGroupButtons}
                            role="group"
                            aria-label="Порядок группы в списке"
                          >
                            <button
                              type="button"
                              className={styles.reorderIconButton}
                              disabled={!canMoveCategoryUp || reorderInProgress}
                              title="Переместить группу выше"
                              aria-label="Переместить группу выше"
                              onClick={() => void reorderCategory(cat, 'up')}
                            >
                              <ChevronUp className={styles.reorderGroupIcon} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={styles.reorderIconButton}
                              disabled={!canMoveCategoryDown || reorderInProgress}
                              title="Переместить группу ниже"
                              aria-label="Переместить группу ниже"
                              onClick={() => void reorderCategory(cat, 'down')}
                            >
                              <ChevronDown className={styles.reorderGroupIcon} aria-hidden />
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {level === 0 && nestedGroupCount > 0 ? (
                        <div className={styles.parentNestedStats} role="status">
                          <span className={styles.parentNestedStatLine}>
                            Вложенных групп:{' '}
                            <strong className={styles.parentNestedStatValue}>
                              {nestedGroupCount}
                            </strong>
                          </span>
                          <span className={styles.parentNestedStatLine}>
                            Видов работ во вложенных:{' '}
                            <strong className={styles.parentNestedStatValue}>
                              {nestedItemsCount}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <>
                      <table className={styles.itemsTable}>
                        <colgroup>
                          <col className={styles.nameColumn} />
                          <col className={styles.priceColumn} />
                          <col className={styles.priceColumn} />
                          <col className={styles.unitColumn} />
                          <col className={styles.actionsColumn} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Название</th>
                            <th>База</th>
                            <th>Итого</th>
                            <th>Ед. изм.</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsSorted.map((item, itemIdx) => {
                            const canMoveItemUp =
                              itemsSorted.length > 1 && itemIdx > 0 && editingItem !== item.id;
                            const canMoveItemDown =
                              itemsSorted.length > 1 &&
                              itemIdx < itemsSorted.length - 1 &&
                              editingItem !== item.id;
                            return (
                              <tr key={item.id}>
                                <td className={styles.nameCell}>
                                  {editingItem === item.id ? (
                                    <textarea
                                      value={editItemData.name ?? item.name}
                                      onChange={(e) =>
                                        setEditItemData((p) => ({ ...p, name: e.target.value }))
                                      }
                                      className={styles.nameTextarea}
                                      rows={1}
                                    />
                                  ) : (
                                    item.name
                                  )}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <input
                                      type="text"
                                      value={
                                        editItemData.price !== undefined
                                          ? String(editItemData.price)
                                          : String(item.price)
                                      }
                                      onChange={(e) =>
                                        setEditItemData((p) => ({
                                          ...p,
                                          price: parseFloat(e.target.value.replace(',', '.')) || 0,
                                        }))
                                      }
                                      className={`${styles.input} ${styles.inputPriceNarrow}`}
                                    />
                                  ) : (
                                    formatPrice(item.price)
                                  )}
                                </td>
                                <td className={styles.priceDerivedCell}>
                                  {editingItem === item.id
                                    ? formatPrice(
                                        priceWithMarkup(
                                          editItemData.price !== undefined
                                            ? Number(editItemData.price)
                                            : item.price,
                                          effectiveMarkup
                                        )
                                      )
                                    : formatPrice(priceWithMarkup(item.price, effectiveMarkup))}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <input
                                      type="text"
                                      value={editItemData.unit ?? item.unit}
                                      onChange={(e) =>
                                        setEditItemData((p) => ({ ...p, unit: e.target.value }))
                                      }
                                      className={`${styles.input} ${styles.inputSortNarrow}`}
                                    />
                                  ) : (
                                    item.unit
                                  )}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <>
                                      <button
                                        data-admin-mutation
                                        type="button"
                                        className={styles.smallButton}
                                        onClick={() => handleUpdateItem(item.id)}
                                      >
                                        Сохранить
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.smallButton}
                                        onClick={() => {
                                          setEditingItem(null);
                                          setEditItemData({});
                                        }}
                                      >
                                        Отмена
                                      </button>
                                    </>
                                  ) : (
                                    <span className={styles.cellActions}>
                                      <span
                                        className={styles.itemReorderWrap}
                                        role="group"
                                        aria-label="Порядок в списке"
                                      >
                                        <button
                                          type="button"
                                          className={styles.reorderIconButton}
                                          disabled={!canMoveItemUp || reorderInProgress}
                                          title="Выше в списке"
                                          aria-label="Выше в списке"
                                          onClick={() =>
                                            void reorderItem(cat.items ?? [], item.id, 'up')
                                          }
                                        >
                                          <ChevronUp
                                            className={styles.reorderItemIcon}
                                            aria-hidden
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.reorderIconButton}
                                          disabled={!canMoveItemDown || reorderInProgress}
                                          title="Ниже в списке"
                                          aria-label="Ниже в списке"
                                          onClick={() =>
                                            void reorderItem(cat.items ?? [], item.id, 'down')
                                          }
                                        >
                                          <ChevronDown
                                            className={styles.reorderItemIcon}
                                            aria-hidden
                                          />
                                        </button>
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.editButton}
                                        onClick={() => {
                                          setEditingItem(item.id);
                                          setEditItemData({
                                            name: item.name,
                                            price: item.price,
                                            unit: item.unit,
                                          });
                                        }}
                                        title="Редактировать"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        data-admin-mutation
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: 'item',
                                            id: item.id,
                                            name: item.name,
                                          })
                                        }
                                        title="Удалить"
                                      >
                                        🗑️
                                      </button>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {showNewItem === cat.id && (
                            <tr className={styles.addItemRow}>
                              <td className={styles.nameCell}>
                                <textarea
                                  value={newItem.name}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, name: e.target.value }))
                                  }
                                  placeholder="Название"
                                  className={styles.nameTextarea}
                                  rows={1}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={newItem.price}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, price: e.target.value }))
                                  }
                                  placeholder="Базовая цена"
                                  className={styles.input}
                                />
                              </td>
                              <td className={styles.priceDerivedCell}>
                                {formatPrice(
                                  priceWithMarkup(
                                    parseFloat(newItem.price.replace(',', '.')) || 0,
                                    effectiveMarkup
                                  )
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={newItem.unit}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, unit: e.target.value }))
                                  }
                                  placeholder="м²"
                                  className={styles.input}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.saveButton}
                                  onClick={() => handleAddItem(cat.id)}
                                >
                                  Добавить
                                </button>
                                <button
                                  type="button"
                                  className={styles.cancelButton}
                                  onClick={() => {
                                    setShowNewItem(null);
                                    setNewItem({
                                      name: '',
                                      description: '',
                                      price: '',
                                      unit: 'м²',
                                    });
                                  }}
                                >
                                  Отмена
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {showNewItem !== cat.id && (
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.addItemButton}
                          onClick={() => setShowNewItem(cat.id)}
                        >
                          + Добавить вид работ
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>

        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Подтверждение удаления"
          message={deleteTarget ? `Удалить вид работ «${deleteTarget.name}»?` : ''}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
        />
      </div>
      {message &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`${styles.toast} ${message.type === 'success' ? styles.toastSuccess : styles.toastError}`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>,
          document.body
        )}
    </>
  );
}
