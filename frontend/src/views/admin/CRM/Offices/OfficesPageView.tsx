'use client';

import { OfficeHistoryModal } from './OfficeHistoryModal';
import styles from './OfficesPage.module.css';
import type { OfficesPageModel } from './hooks/useOfficesPage';

type OfficesPageViewProps = {
  model: OfficesPageModel;
};

export function OfficesPageView({ model }: OfficesPageViewProps) {
  const {
    offices,
    loading,
    saving,
    message,
    editingId,
    editForm,
    setEditForm,
    showAddForm,
    setShowAddForm,
    newForm,
    setNewForm,
    showInactive,
    setShowInactive,
    deleteConfirmId,
    setDeleteConfirmId,
    historyOfficeId,
    setHistoryOfficeId,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleAddOffice,
    handleDelete,
    cancelAddForm,
    handleHistoryRollback,
  } = model;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Офисы</h1>
          <span className={styles.count}>{offices.length} офисов</span>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Показать неактивные
          </label>
          <button
            className={styles.addButton}
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            + Добавить офис
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colIndex}>№</th>
              <th>Название</th>
              <th className={styles.colPrefix}>Префикс</th>
              <th>Адрес</th>
              <th>Телефон</th>
              <th className={styles.colActive}>Активен</th>
              <th className={styles.colActions}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {showAddForm && (
              <tr className={styles.editRow}>
                <td>—</td>
                <td>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Название офиса"
                    className={styles.input}
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newForm.prefix}
                    onChange={(e) => setNewForm((f) => ({ ...f, prefix: e.target.value }))}
                    placeholder="Префикс"
                    className={styles.input}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newForm.address}
                    onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Адрес"
                    className={styles.input}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newForm.phone}
                    onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Телефон"
                    className={styles.input}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={newForm.isActive}
                    onChange={(e) => setNewForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.saveButton}
                      onClick={() => void handleAddOffice()}
                      disabled={saving}
                    >
                      ✓
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={cancelAddForm}
                      disabled={saving}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.loading}>
                  Загрузка...
                </td>
              </tr>
            ) : offices.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Нет офисов
                </td>
              </tr>
            ) : (
              offices.map((office, index) => (
                <tr
                  key={office.id}
                  className={`${!office.isActive ? styles.inactiveRow : ''} ${editingId === office.id ? styles.editRow : ''}`}
                >
                  {editingId === office.id ? (
                    <>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className={styles.input}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.prefix}
                          onChange={(e) => setEditForm((f) => ({ ...f, prefix: e.target.value }))}
                          className={styles.input}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                          className={styles.input}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          className={styles.input}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                          }
                        />
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.historyButton}
                            onClick={() => setHistoryOfficeId(office.id)}
                            title="История изменений"
                          >
                            История
                          </button>
                          <button
                            className={styles.saveButton}
                            onClick={() => void handleSaveEdit()}
                            disabled={saving}
                          >
                            ✓
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{index + 1}</td>
                      <td className={styles.nameCell}>{office.name}</td>
                      <td>{office.prefix || '—'}</td>
                      <td>{office.address || '—'}</td>
                      <td>{office.phone || '—'}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${office.isActive ? styles.active : styles.inactive}`}
                        >
                          {office.isActive ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td>
                        {deleteConfirmId === office.id ? (
                          <div className={styles.rowActions}>
                            <button
                              className={styles.deleteConfirmButton}
                              onClick={() => void handleDelete(office.id)}
                              disabled={saving}
                              title="Подтвердить удаление"
                            >
                              🗑️
                            </button>
                            <button
                              className={styles.cancelButton}
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={saving}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className={styles.rowActions}>
                            <button
                              className={styles.editButton}
                              onClick={() => handleStartEdit(office)}
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => setDeleteConfirmId(office.id)}
                              title="Удалить"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {historyOfficeId && (
        <OfficeHistoryModal
          officeId={historyOfficeId}
          officeName={offices.find((o) => o.id === historyOfficeId)?.name}
          onClose={() => setHistoryOfficeId(null)}
          onRollback={handleHistoryRollback}
        />
      )}
    </div>
  );
}
