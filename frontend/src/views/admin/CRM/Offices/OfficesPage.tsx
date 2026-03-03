'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type Office,
  createOffice,
  deleteOffice,
  getOffices,
  updateOffice,
} from '@/shared/api/admin-crm';

import { OfficeHistoryModal } from './OfficeHistoryModal';
import styles from './OfficesPage.module.css';

interface OfficeFormData {
  name: string;
  prefix: string;
  address: string;
  phone: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: OfficeFormData = {
  name: '',
  prefix: '',
  address: '',
  phone: '',
  isActive: true,
  sortOrder: 0,
};

export function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OfficeFormData>(emptyForm);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState<OfficeFormData>(emptyForm);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historyOfficeId, setHistoryOfficeId] = useState<string | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOffices(showInactive);
      setOffices(data);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки офисов');
    } finally {
      setLoading(false);
    }
  }, [showInactive, showMessage]);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  const handleStartEdit = (office: Office) => {
    setEditingId(office.id);
    setEditForm({
      name: office.name,
      prefix: office.prefix ?? '',
      address: office.address ?? '',
      phone: office.phone ?? '',
      isActive: office.isActive,
      sortOrder: office.sortOrder,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) {
      showMessage('error', 'Укажите название офиса');
      return;
    }
    setSaving(true);
    try {
      await updateOffice(editingId, {
        name: editForm.name.trim(),
        prefix: editForm.prefix.trim() || null,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        isActive: editForm.isActive,
        sortOrder: editForm.sortOrder,
      });
      showMessage('success', 'Офис обновлён');
      setEditingId(null);
      setEditForm(emptyForm);
      loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffice = async () => {
    if (!newForm.name.trim()) {
      showMessage('error', 'Укажите название офиса');
      return;
    }
    setSaving(true);
    try {
      await createOffice({
        name: newForm.name.trim(),
        prefix: newForm.prefix.trim() || undefined,
        address: newForm.address.trim() || undefined,
        phone: newForm.phone.trim() || undefined,
        isActive: newForm.isActive,
        sortOrder: newForm.sortOrder,
      });
      showMessage('success', 'Офис добавлен');
      setShowAddForm(false);
      setNewForm(emptyForm);
      loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка создания офиса');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteOffice(id);
      showMessage('success', 'Офис удалён');
      setDeleteConfirmId(null);
      loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setSaving(false);
    }
  };

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
              <th style={{ width: '50px' }}>№</th>
              <th>Название</th>
              <th style={{ width: '100px' }}>Префикс</th>
              <th>Адрес</th>
              <th>Телефон</th>
              <th style={{ width: '80px' }}>Активен</th>
              <th style={{ width: '120px' }}>Действия</th>
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
                      onClick={handleAddOffice}
                      disabled={saving}
                    >
                      ✓
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setShowAddForm(false);
                        setNewForm(emptyForm);
                      }}
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
                            onClick={handleSaveEdit}
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
                              onClick={() => handleDelete(office.id)}
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
          onRollback={() => {
            loadOffices();
            setHistoryOfficeId(null);
          }}
        />
      )}
    </div>
  );
}
