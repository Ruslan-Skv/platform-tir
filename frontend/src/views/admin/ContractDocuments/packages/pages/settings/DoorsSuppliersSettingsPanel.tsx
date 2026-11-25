'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import panelStyles from './SettingsPanels.module.css';
import { useDoorsSuppliersSettingsPage } from './hooks/useDoorsSuppliersSettingsPage';

/** Тело раздела «Поставщики дверей» для модалки «Настройки договоров». */
export function DoorsSuppliersSettingsPanel() {
  const {
    dirty,
    error,
    filteredSuppliers,
    loading,
    refresh,
    save,
    saving,
    search,
    selectFiltered,
    selectedIds,
    setSearch,
    successVisible,
    suppliers,
    toggleSupplier,
    unselectFiltered,
  } = useDoorsSuppliersSettingsPage();

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const busy = loading || saving;
  const filteredSelectedCount = filteredSuppliers.filter((s) => selected.has(s.id)).length;

  return (
    <div className={panelStyles.panelRoot}>
      <div className={panelStyles.panelHead}>
        <div className={panelStyles.panelHeadMain}>
          <span className={panelStyles.panelCount}>
            {loading ? 'Загрузка…' : `Выбрано ${selectedIds.length} из ${suppliers.length}`}
          </span>
          <AdminSaveNotice visible={successVisible}>Список поставщиков сохранён</AdminSaveNotice>
        </div>
        <AdminListRefreshButton
          disabled={busy}
          busy={loading}
          title="Обновить справочник поставщиков"
          aria-label={
            loading ? 'Обновление справочника поставщиков' : 'Обновить справочник поставщиков'
          }
          onClick={() => void refresh()}
        />
      </div>

      {error ? <p className={panelStyles.panelError}>{error}</p> : null}

      <p className={panelStyles.panelHint}>
        Отмеченные поставщики показываются в колонке «Поставщик» на вкладке «Спецификация» договоров
        «Двери». Список общий для всех сотрудников и не зависит от их доступа к разделу
        «Поставщики». Неактивные поставщики в спецификации не показываются, пока их не включат
        обратно.
      </p>

      {!loading && !error && suppliers.length === 0 ? (
        <p className={panelStyles.panelHint}>
          В справочнике пока нет поставщиков.{' '}
          <Link href="/admin/suppliers" className={panelStyles.panelLink}>
            Перейти в раздел «Поставщики»
          </Link>
        </p>
      ) : null}

      {suppliers.length > 0 ? (
        <>
          <div className={panelStyles.panelToolbar}>
            <input
              type="search"
              className={panelStyles.panelSearchInput}
              value={search}
              placeholder="Название или юридическое лицо…"
              aria-label="Поиск поставщика"
              autoComplete="off"
              disabled={busy}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={panelStyles.panelActions}>
              <button
                type="button"
                className={panelStyles.panelSecondaryBtn}
                disabled={busy || filteredSelectedCount === filteredSuppliers.length}
                title="Отметить поставщиков, найденных поиском"
                onClick={selectFiltered}
              >
                Выбрать все
              </button>
              <button
                type="button"
                className={panelStyles.panelSecondaryBtn}
                disabled={busy || filteredSelectedCount === 0}
                title="Снять отметки с поставщиков, найденных поиском"
                onClick={unselectFiltered}
              >
                Снять все
              </button>
            </div>
          </div>

          <div
            className={panelStyles.panelOptionList}
            role="group"
            aria-label="Поставщики спецификации дверей"
          >
            {loading ? (
              <p className={panelStyles.panelOptionEmpty}>Загрузка…</p>
            ) : filteredSuppliers.length === 0 ? (
              <p className={panelStyles.panelOptionEmpty}>
                По запросу «{search.trim()}» поставщики не найдены.
              </p>
            ) : (
              filteredSuppliers.map((supplier) => {
                const checked = selected.has(supplier.id);
                return (
                  <label
                    key={supplier.id}
                    className={`${panelStyles.panelOptionItem}${
                      checked ? ` ${panelStyles.panelOptionItemSelected}` : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggleSupplier(supplier.id)}
                    />
                    <span className={panelStyles.panelOptionText}>
                      <span className={panelStyles.panelOptionTitle}>{supplier.title}</span>
                      {supplier.title !== supplier.legalName ? (
                        <span className={panelStyles.panelOptionSubline}>{supplier.legalName}</span>
                      ) : null}
                    </span>
                    {!supplier.isActive ? (
                      <span
                        className={panelStyles.panelBadgeInactive}
                        title="Не показывается в спецификации, пока поставщик неактивен"
                      >
                        неактивен
                      </span>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>
        </>
      ) : null}

      <div className={panelStyles.panelActions}>
        <button
          data-admin-mutation
          type="button"
          className={panelStyles.panelPrimaryBtn}
          disabled={saving || loading || !dirty}
          onClick={() => void save()}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
