'use client';

import Link from 'next/link';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../styles/estimates-list.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';
import { formatCrmUserLabel } from './signatoriesUtils';

export function SignatoriesPageView({
  crmUserLabelById,
  displayedRows,
  draft,
  editingIndex,
  error,
  handleDelete,
  handleUpsert,
  items,
  loading,
  managerCrmUsers,
  ok,
  resetDraft,
  saving,
  setDraft,
  setSignatorySort,
  signatorySort,
  startEdit,
}: SignatoriesPageModel) {
  return (
    <div className={cdBase.page}>
      <div className={cdHub.editorHeader}>
        <div>
          <h1 className={cdWorkspace.title}>Менеджеры</h1>
          <p className={cdWorkspace.subtitle}>
            Карточки менеджера для договоров: ФИО в падежах, основание полномочий, офис продаж. Для
            каждой карточки укажите пользователя CRM — по нему карточка попадает в фильтр менеджера
            в замерах. В пакете документов менеджер выберет карточку из списка.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <Link className={cdWorkspace.secondaryBtn} href="/admin/contract-documents/contracts">
            К разделу «Ремонт»
          </Link>
        </div>
      </div>

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

      <div className={cdTemplates.sectionCard}>
        <div className={cdTemplates.sectionFields}>
          <div className={cdEstimateTab.field}>
            <label>Название карточки</label>
            <input
              value={draft.title ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="Например: «Иванов И.И. — офис X»"
            />
          </div>
          <div className={cdEstimateTab.field}>
            <label htmlFor="signatory_crm_user">Пользователь CRM</label>
            <select
              id="signatory_crm_user"
              value={draft.crmUserId ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, crmUserId: e.target.value }))}
            >
              <option value="">— Выберите сотрудника —</option>
              {managerCrmUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatCrmUserLabel(u)}
                </option>
              ))}
            </select>
            <p className={cdTemplates.hint} style={{ marginTop: 4, marginBottom: 0 }}>
              Обязательная привязка к учётной записи CRM для фильтра замеров и поля «Менеджер» в
              бланке замера.
            </p>
          </div>
          <div className={cdEstimateTab.field}>
            <label>Менеджер (именительный падеж)</label>
            <input
              value={draft.directorNameNominative ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, directorNameNominative: e.target.value }))}
            />
          </div>
          <div className={cdEstimateTab.field}>
            <label>Менеджер (родительный падеж)</label>
            <input
              value={draft.directorNameGenitive ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, directorNameGenitive: e.target.value }))}
            />
          </div>
          <div className={cdEstimateTab.field}>
            <label>Действует на основании</label>
            <input
              value={draft.basis ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, basis: e.target.value }))}
              placeholder="Устава, доверенности № …"
            />
          </div>
          <div className={cdEstimateTab.field}>
            <label>Офис продаж</label>
            <input
              value={draft.salesOffice ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, salesOffice: e.target.value }))}
            />
          </div>
          <div className={cdEstimateTab.field}>
            <label>Телефон офиса</label>
            <input
              value={draft.officePhone ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, officePhone: e.target.value }))}
            />
          </div>
        </div>
        <div className={cdWorkspace.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
          <button
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={saving}
            onClick={() => void handleUpsert()}
          >
            {editingIndex === null ? 'Добавить карточку' : 'Сохранить карточку'}
          </button>
          {editingIndex !== null ? (
            <button type="button" className={cdWorkspace.secondaryBtn} onClick={resetDraft}>
              Отменить редактирование
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cdEstimatesList.estimatesControlsSingleRow}
        style={{ marginTop: 'var(--admin-space-lg)', marginBottom: 'var(--admin-space-sm)' }}
      >
        <div className={cdEstimateTab.field} style={{ minWidth: 240, flex: '1 1 220px' }}>
          <label htmlFor="signatory_sort">Сортировка</label>
          <select
            id="signatory_sort"
            value={signatorySort}
            onChange={(e) => setSignatorySort(e.target.value as typeof signatorySort)}
            disabled={loading}
          >
            <option value="title_asc">По названию карточки А → Я</option>
            <option value="title_desc">По названию карточки Я → А</option>
          </select>
        </div>
        <div className={cdEstimatesList.estimatesFilterRowSpacer} aria-hidden />
      </div>

      <div className={cdWorkspace.tableWrap}>
        <table className={cdWorkspace.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Пользователь CRM</th>
              <th>Менеджер (им.)</th>
              <th>Офис</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>Карточки менеджеров пока не добавлены.</td>
              </tr>
            ) : (
              displayedRows.map(({ item, originalIndex }) => (
                <tr key={`${item.title}-${originalIndex}`}>
                  <td>{item.title}</td>
                  <td>
                    {item.crmUserId
                      ? (crmUserLabelById.get(item.crmUserId) ?? item.crmUserId)
                      : '— не привязан —'}
                  </td>
                  <td>{item.directorNameNominative || '—'}</td>
                  <td>{item.salesOffice || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={cdWorkspace.secondaryBtn}
                        onClick={() => startEdit(originalIndex)}
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className={cdWorkspace.dangerBtn}
                        disabled={saving}
                        onClick={() => void handleDelete(originalIndex)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
