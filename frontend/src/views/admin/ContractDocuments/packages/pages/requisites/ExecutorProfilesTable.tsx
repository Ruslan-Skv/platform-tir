'use client';

import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

type ExecutorProfilesTableProps = Pick<
  ExecutorProfilesPageModel,
  'handleDelete' | 'items' | 'loading' | 'saving' | 'startEdit'
>;

export function ExecutorProfilesTable({
  handleDelete,
  items,
  loading,
  saving,
  startEdit,
}: ExecutorProfilesTableProps) {
  return (
    <div className={cdWorkspace.tableWrap}>
      <table className={cdWorkspace.table}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Организация</th>
            <th>ИНН</th>
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
              <td colSpan={5}>Наборы реквизитов пока не добавлены.</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={`${item.title}-${idx}`}>
                <td>{item.title}</td>
                <td>{item.kind === 'ENTREPRENEUR' ? 'ИП' : 'ЮЛ'}</td>
                <td>{item.companyName || '—'}</td>
                <td>{item.inn || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={cdWorkspace.secondaryBtn}
                      onClick={() => startEdit(idx)}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className={cdWorkspace.dangerBtn}
                      disabled={saving}
                      onClick={() => void handleDelete(idx)}
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
  );
}
