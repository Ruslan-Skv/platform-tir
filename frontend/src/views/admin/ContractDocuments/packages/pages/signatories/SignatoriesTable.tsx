'use client';

import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';

type SignatoriesTableProps = Pick<
  SignatoriesPageModel,
  | 'crmUserLabelById'
  | 'displayedRows'
  | 'handleDelete'
  | 'items'
  | 'loading'
  | 'saving'
  | 'setSignatorySort'
  | 'signatorySort'
  | 'startEdit'
>;

export function SignatoriesTable({
  crmUserLabelById,
  displayedRows,
  handleDelete,
  items,
  loading,
  saving,
  setSignatorySort,
  signatorySort,
  startEdit,
}: SignatoriesTableProps) {
  return (
    <>
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
    </>
  );
}
