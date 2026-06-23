'use client';

import Link from 'next/link';

import styles from './NavigationSectionPage.module.css';
import type { NavigationSectionPageModel } from './hooks/useNavigationSectionPage';
import {
  EMPTY_DROPDOWN_ITEM_FORM,
  EMPTY_NAV_ITEM_FORM,
  EMPTY_SUB_ITEM_FORM,
} from './navigation-section-page.constants';

type NavigationSectionPageViewProps = {
  model: NavigationSectionPageModel;
};

export function NavigationSectionPageView({ model }: NavigationSectionPageViewProps) {
  const {
    items,
    loading,
    message,
    editingId,
    editForm,
    setEditForm,
    adding,
    setAdding,
    newItem,
    setNewItem,
    expandedNavId,
    setExpandedNavId,
    addingDropdownForNavId,
    setAddingDropdownForNavId,
    newDropdownItem,
    setNewDropdownItem,
    editingDropdownId,
    setEditingDropdownId,
    editDropdownForm,
    setEditDropdownForm,
    addingSubForDropdownId,
    setAddingSubForDropdownId,
    newSubItem,
    setNewSubItem,
    editingSubId,
    setEditingSubId,
    editSubForm,
    setEditSubForm,
    catalogCategories,
    catalogCategoriesLoading,
    deleteModal,
    deleteInProgress,
    startEdit,
    cancelEdit,
    saveEdit,
    openDeleteDropdownModal,
    openDeleteSubModal,
    closeDeleteModal,
    confirmDelete,
    handleDelete,
    moveItem,
    handleAdd,
    addDropdownItem,
    startEditDropdown,
    saveDropdownItem,
    reorderDropdownItems,
    addSubItem,
    startEditSub,
    saveSubItem,
    reorderSubItems,
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
      <header className={styles.header}>
        <h1 className={styles.title}>Меню навигации</h1>
        <p className={styles.subtitle}>
          Управление кнопками в шапке сайта и вложенным выпадающим меню: добавление, редактирование,
          ссылки и иконки.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      {deleteModal && (
        <div
          className={styles.modalOverlay}
          onClick={closeDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 id="delete-modal-title" className={styles.modalTitle}>
              Удаление
            </h2>
            <p className={styles.modalMessage}>Удалить «{deleteModal.name}»?</p>
            {deleteModal.warning && (
              <div className={styles.modalWarning}>{deleteModal.warning}</div>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeDeleteModal}
                disabled={deleteInProgress}
              >
                Отмена
              </button>
              <button
                data-admin-mutation
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={confirmDelete}
                disabled={deleteInProgress}
              >
                {deleteInProgress ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Кнопки меню</h2>
        {items.length === 0 && !adding ? (
          <p className={styles.emptyHint}>
            Пунктов пока нет. Добавьте первую кнопку ниже или выполните в backend команду{' '}
            <code>npx prisma db seed</code>, чтобы создать пункты по умолчанию (Каталог, Блог и
            т.д.).
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  title="Поднять"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  title="Опустить"
                >
                  ↓
                </button>
              </div>
              {editingId === item.id ? (
                <>
                  <div className={styles.editBlock}>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Текст кнопки"
                      />
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.href}
                        onChange={(e) => setEditForm((p) => ({ ...p, href: e.target.value }))}
                        placeholder="Ссылка"
                      />
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editForm.hasDropdown}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, hasDropdown: e.target.checked }))
                          }
                        />
                        Выпадающее меню
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, isActive: e.target.checked }))
                          }
                        />
                        Показывать в меню
                      </label>
                    </div>
                    <div className={styles.editActions}>
                      <button
                        data-admin-mutation
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={saveEdit}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={cancelEdit}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className={`${styles.itemName}${item.isActive === false ? ` ${styles.itemNameInactive}` : ''}`}
                  >
                    {item.name}
                  </span>
                  <span className={styles.itemHref}>{item.href}</span>
                  {item.isActive === false && (
                    <span className={styles.itemBadgeInactive}>Скрыт</span>
                  )}
                  {item.hasDropdown && (
                    <span className={styles.itemBadge}>
                      {item.name === 'Каталог'
                        ? 'категории каталога'
                        : `выпадающее меню (${item.dropdownItems?.length ?? 0} разделов)`}
                    </span>
                  )}
                  <div className={styles.itemActions}>
                    <button
                      data-admin-mutation
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      data-admin-mutation
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDelete(item.id)}
                    >
                      Удалить
                    </button>
                    {item.hasDropdown && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() =>
                          setExpandedNavId((prev) => (prev === item.id ? null : item.id))
                        }
                      >
                        {expandedNavId === item.id ? 'Свернуть меню' : 'Управление выпадающим меню'}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Блок управления вложенным меню */}
              {item.hasDropdown && expandedNavId === item.id && editingId !== item.id && (
                <div className={styles.dropdownBlock}>
                  {item.name === 'Каталог' ? (
                    <>
                      <h3 className={styles.dropdownBlockTitle}>Разделы и подразделы каталога</h3>
                      <p className={styles.dropdownBlockNote}>
                        Содержимое выпадающего меню «Каталог» формируется из категорий каталога.
                        Управление: добавление, редактирование, порядок — в разделе Каталог →
                        Категории.
                      </p>
                      <Link
                        href="/admin/catalog/categories"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall} ${styles.catalogCategoriesLink}`}
                      >
                        Управление категориями каталога
                      </Link>
                      {catalogCategoriesLoading ? (
                        <p className={styles.mutedNote}>Загрузка разделов…</p>
                      ) : catalogCategories.length === 0 ? (
                        <p className={styles.mutedNote}>
                          Категорий пока нет. Добавьте их в разделе Каталог → Категории.
                        </p>
                      ) : (
                        <div className={styles.catalogCategoriesList}>
                          {catalogCategories.map((root) => (
                            <div key={root.id} className={styles.dropdownItemRow}>
                              <span className={styles.dropdownItemName}>{root.name}</span>
                              <span className={styles.itemHref}>/catalog/products/{root.slug}</span>
                              {root.icon && (
                                <span className={styles.itemBadge} title={root.icon}>
                                  иконка
                                </span>
                              )}
                              {root._count?.products != null && (
                                <span className={styles.itemBadge}>
                                  {root._count.products} товаров
                                </span>
                              )}
                              <div className={styles.subList}>
                                {(root.children ?? []).map((child) => (
                                  <div key={child.id} className={styles.subItemRow}>
                                    <span className={styles.subItemName}>{child.name}</span>
                                    <span className={styles.itemHref}>
                                      /catalog/products/{root.slug}/{child.slug}
                                    </span>
                                    {child._count?.products != null && (
                                      <span className={styles.itemBadge}>
                                        {child._count.products} товаров
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className={styles.dropdownBlockTitle}>Пункты выпадающего меню</h3>
                      {(item.dropdownItems ?? []).map((d, dIndex) => (
                        <div key={d.id} className={styles.dropdownItemRow}>
                          {editingDropdownId === d.id ? (
                            <div className={styles.dropdownEditRow}>
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.name}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder="Название"
                              />
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.href}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, href: e.target.value }))
                                }
                                placeholder="Ссылка"
                              />
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.icon}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, icon: e.target.value }))
                                }
                                placeholder="Иконка (heroicons или URL)"
                              />
                              <button
                                data-admin-mutation
                                type="button"
                                className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                onClick={saveDropdownItem}
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                onClick={() => setEditingDropdownId(null)}
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.dropdownItemName}>{d.name}</span>
                              <span className={styles.itemHref}>{d.href}</span>
                              {d.icon && (
                                <span className={styles.itemBadge} title={d.icon}>
                                  иконка
                                </span>
                              )}
                              <div className={styles.itemActions}>
                                <button
                                  data-admin-mutation
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() => startEditDropdown(d)}
                                >
                                  Изменить
                                </button>
                                <button
                                  data-admin-mutation
                                  type="button"
                                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                                  onClick={() => openDeleteDropdownModal(d)}
                                >
                                  Удалить
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() =>
                                    setAddingSubForDropdownId((prev) =>
                                      prev === d.id ? null : d.id
                                    )
                                  }
                                >
                                  + Подпункт
                                </button>
                                {dIndex > 0 && (
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                    onClick={() => {
                                      const ids = (item.dropdownItems ?? []).map((x) => x.id);
                                      const swap = ids[dIndex - 1];
                                      ids[dIndex - 1] = ids[dIndex];
                                      ids[dIndex] = swap;
                                      reorderDropdownItems(item.id, ids);
                                    }}
                                    title="Поднять"
                                  >
                                    ↑
                                  </button>
                                )}
                                {dIndex < (item.dropdownItems?.length ?? 0) - 1 && (
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                    onClick={() => {
                                      const ids = (item.dropdownItems ?? []).map((x) => x.id);
                                      const swap = ids[dIndex + 1];
                                      ids[dIndex + 1] = ids[dIndex];
                                      ids[dIndex] = swap;
                                      reorderDropdownItems(item.id, ids);
                                    }}
                                    title="Опустить"
                                  >
                                    ↓
                                  </button>
                                )}
                              </div>
                            </>
                          )}

                          {/* Подпункты */}
                          <div className={styles.subList}>
                            {(d.submenu ?? []).map((s, sIdx) => (
                              <div key={s.id} className={styles.subItemRow}>
                                {editingSubId === s.id ? (
                                  <div className={styles.dropdownEditRow}>
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={editSubForm.name}
                                      onChange={(e) =>
                                        setEditSubForm((p) => ({ ...p, name: e.target.value }))
                                      }
                                      placeholder="Название"
                                    />
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={editSubForm.href}
                                      onChange={(e) =>
                                        setEditSubForm((p) => ({ ...p, href: e.target.value }))
                                      }
                                      placeholder="Ссылка"
                                    />
                                    <button
                                      data-admin-mutation
                                      type="button"
                                      className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                      onClick={saveSubItem}
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                      onClick={() => setEditingSubId(null)}
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className={styles.subItemName}>{s.name}</span>
                                    <span className={styles.itemHref}>{s.href}</span>
                                    <div className={styles.itemActions}>
                                      <button
                                        data-admin-mutation
                                        type="button"
                                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                        onClick={() => startEditSub(s)}
                                      >
                                        Изменить
                                      </button>
                                      <button
                                        data-admin-mutation
                                        type="button"
                                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                                        onClick={() => openDeleteSubModal(s)}
                                      >
                                        Удалить
                                      </button>
                                      {sIdx > 0 && (
                                        <button
                                          type="button"
                                          className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                          onClick={() => {
                                            const ids = (d.submenu ?? []).map((x) => x.id);
                                            const t = ids[sIdx - 1];
                                            ids[sIdx - 1] = ids[sIdx];
                                            ids[sIdx] = t;
                                            reorderSubItems(d.id, ids);
                                          }}
                                          title="Поднять"
                                        >
                                          ↑
                                        </button>
                                      )}
                                      {sIdx < (d.submenu?.length ?? 0) - 1 && (
                                        <button
                                          type="button"
                                          className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                          onClick={() => {
                                            const ids = (d.submenu ?? []).map((x) => x.id);
                                            const t = ids[sIdx + 1];
                                            ids[sIdx + 1] = ids[sIdx];
                                            ids[sIdx] = t;
                                            reorderSubItems(d.id, ids);
                                          }}
                                          title="Опустить"
                                        >
                                          ↓
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            {addingSubForDropdownId === d.id && (
                              <div className={styles.addForm}>
                                <input
                                  type="text"
                                  className={`${styles.input} ${styles.inputName}`}
                                  value={newSubItem.name}
                                  onChange={(e) =>
                                    setNewSubItem((p) => ({ ...p, name: e.target.value }))
                                  }
                                  placeholder="Название подпункта"
                                />
                                <input
                                  type="text"
                                  className={`${styles.input} ${styles.inputHref}`}
                                  value={newSubItem.href}
                                  onChange={(e) =>
                                    setNewSubItem((p) => ({ ...p, href: e.target.value }))
                                  }
                                  placeholder="Ссылка"
                                />
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                  onClick={() => addSubItem(d.id)}
                                  disabled={!newSubItem.name.trim()}
                                >
                                  Добавить
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() => {
                                    setAddingSubForDropdownId(null);
                                    setNewSubItem(EMPTY_SUB_ITEM_FORM);
                                  }}
                                >
                                  Отмена
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {addingDropdownForNavId === item.id ? (
                        <div className={styles.addForm}>
                          <input
                            type="text"
                            className={`${styles.input} ${styles.inputName}`}
                            value={newDropdownItem.name}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Название пункта"
                          />
                          <input
                            type="text"
                            className={`${styles.input} ${styles.inputHref}`}
                            value={newDropdownItem.href}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, href: e.target.value }))
                            }
                            placeholder="Ссылка"
                          />
                          <input
                            type="text"
                            className={`${styles.input} ${styles.inputIcon}`}
                            value={newDropdownItem.icon}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, icon: e.target.value }))
                            }
                            placeholder="Иконка (опционально)"
                          />
                          <button
                            data-admin-mutation
                            type="button"
                            className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                            onClick={() => addDropdownItem(item.id)}
                            disabled={!newDropdownItem.name.trim()}
                          >
                            Добавить пункт
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                            onClick={() => {
                              setAddingDropdownForNavId(null);
                              setNewDropdownItem(EMPTY_DROPDOWN_ITEM_FORM);
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          data-admin-mutation
                          type="button"
                          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall} ${styles.addDropdownTrigger}`}
                          onClick={() => setAddingDropdownForNavId(item.id)}
                        >
                          + Добавить пункт выпадающего меню
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {adding ? (
          <div className={styles.addForm}>
            <input
              type="text"
              className={`${styles.input} ${styles.inputName}`}
              value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              placeholder="Текст кнопки"
            />
            <input
              type="text"
              className={`${styles.input} ${styles.inputHref}`}
              value={newItem.href}
              onChange={(e) => setNewItem((p) => ({ ...p, href: e.target.value }))}
              placeholder="Ссылка (например /blog)"
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newItem.hasDropdown}
                onChange={(e) => setNewItem((p) => ({ ...p, hasDropdown: e.target.checked }))}
              />
              Выпадающее меню
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newItem.isActive}
                onChange={(e) => setNewItem((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Показывать в меню
            </label>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
              onClick={handleAdd}
              disabled={!newItem.name.trim()}
            >
              Добавить
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
              onClick={() => {
                setAdding(false);
                setNewItem(EMPTY_NAV_ITEM_FORM);
              }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            data-admin-mutation
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall} ${styles.addNavTrigger}`}
            onClick={() => setAdding(true)}
          >
            + Добавить кнопку меню
          </button>
        )}
      </section>
    </div>
  );
}
