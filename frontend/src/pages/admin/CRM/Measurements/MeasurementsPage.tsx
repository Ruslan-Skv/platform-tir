'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
  updateMeasurement,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { MeasurementHistoryModal } from './MeasurementHistoryModal';
import styles from './MeasurementsPage.module.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
  CONVERTED: 'В договор',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

type EditableFieldKey =
  | 'receptionDate'
  | 'executionDate'
  | 'managerId'
  | 'surveyorId'
  | 'directionId'
  | 'customerName'
  | 'customerAddress'
  | 'customerPhone'
  | 'status'
  | 'comments';

type MeasurementEdits = Partial<Record<EditableFieldKey, string | null>>;

interface EditableColumnConfig {
  key: EditableFieldKey;
  title: string;
  type: 'text' | 'date' | 'select';
  /** Для select — ключ опций (managers, surveyors, directions, status) */
  optionsKey?: 'managers' | 'surveyors' | 'directions' | 'status';
}

const EDITABLE_COLUMNS: EditableColumnConfig[] = [
  { key: 'receptionDate', title: 'Дата приёма', type: 'date' },
  { key: 'executionDate', title: 'Дата выполнения', type: 'date' },
  { key: 'managerId', title: 'Менеджер', type: 'select', optionsKey: 'managers' },
  { key: 'surveyorId', title: 'Замерщик', type: 'select', optionsKey: 'surveyors' },
  { key: 'directionId', title: 'Направление', type: 'select', optionsKey: 'directions' },
  { key: 'customerName', title: 'ФИО заказчика', type: 'text' },
  { key: 'customerAddress', title: 'Адрес', type: 'text' },
  { key: 'customerPhone', title: 'Телефон', type: 'text' },
  { key: 'status', title: 'Статус', type: 'select', optionsKey: 'status' },
  { key: 'comments', title: 'Комментарии', type: 'text' },
];

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 10);
}

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

export function MeasurementsPage() {
  const router = useRouter();
  const [data, setData] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, MeasurementEdits>>({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');
  const [historyMeasurementId, setHistoryMeasurementId] = useState<string | null>(null);
  const hasSelection = selectedIds.length > 0;

  const managers = users.filter((u) =>
    [
      'SUPER_ADMIN',
      'ADMIN',
      'MODERATOR',
      'SUPPORT',
      'BRIGADIER',
      'LEAD_SPECIALIST_FURNITURE',
      'LEAD_SPECIALIST_WINDOWS_DOORS',
    ].includes(u.role)
  );
  const surveyors = users.filter((u) => u.role === 'SURVEYOR');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMeasurements({
        page,
        limit,
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, managerFilter, directionFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const handleInlineEdit = (
    measurementId: string,
    field: EditableFieldKey,
    value: string | null
  ) => {
    setEditedProducts((prev) => ({
      ...prev,
      [measurementId]: {
        ...prev[measurementId],
        [field]: value,
      },
    }));
  };

  const getCurrentValue = (m: Measurement, field: EditableFieldKey): string | null => {
    if (editedProducts[m.id]?.[field] !== undefined) {
      return editedProducts[m.id][field] ?? null;
    }
    switch (field) {
      case 'managerId':
        return m.managerId ?? m.manager?.id ?? null;
      case 'surveyorId':
        return m.surveyorId ?? m.surveyor?.id ?? null;
      case 'directionId':
        return m.directionId ?? m.direction?.id ?? null;
      case 'receptionDate':
        return m.receptionDate ? formatDateForInput(m.receptionDate) : null;
      case 'executionDate':
        return m.executionDate ? formatDateForInput(m.executionDate) : null;
      default:
        return (m[field] as string) ?? null;
    }
  };

  const hasEdits = (measurementId: string): boolean =>
    Object.keys(editedProducts[measurementId] || {}).length > 0;

  const saveAllEdits = async () => {
    const idsToSave = Object.keys(editedProducts).filter((id) => hasEdits(id));
    if (idsToSave.length === 0) return;

    setSavingEdits(true);
    setSaveMessage(null);
    try {
      for (const id of idsToSave) {
        const edits = { ...editedProducts[id] } as Record<string, string | null>;
        const optionalKeys: EditableFieldKey[] = [
          'executionDate',
          'surveyorId',
          'directionId',
          'comments',
          'customerAddress',
        ];
        const payload: Record<string, string | null | undefined> = {};
        for (const [k, v] of Object.entries(edits)) {
          const key = k as EditableFieldKey;
          if (v === null || v === '') {
            if (optionalKeys.includes(key)) {
              payload[k] = null;
            }
          } else {
            payload[k] = v;
          }
        }
        await updateMeasurement(id, payload);
      }
      setEditedProducts({});
      setSaveMessageType('success');
      setSaveMessage(`Сохранено замеров: ${idsToSave.length}`);
      setTimeout(() => setSaveMessage(null), 3000);
      fetchData();
    } catch (err) {
      setSaveMessageType('error');
      setSaveMessage(err instanceof Error ? err.message : 'Ошибка сохранения');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSavingEdits(false);
    }
  };

  const cancelEdits = () => {
    setEditedProducts({});
    setEditMode(false);
  };

  const totalEditsCount = Object.keys(editedProducts).filter((id) => hasEdits(id)).length;

  const renderEditableCell = (m: Measurement, col: EditableColumnConfig) => {
    const currentValue = getCurrentValue(m, col.key);
    const isEdited = editedProducts[m.id]?.[col.key] !== undefined;

    if (col.type === 'date') {
      return (
        <input
          type="date"
          className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
          value={currentValue ?? ''}
          onChange={(e) => {
            e.stopPropagation();
            const v = e.target.value || null;
            handleInlineEdit(m.id, col.key, v);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (col.type === 'select') {
      const options =
        col.optionsKey === 'status'
          ? STATUS_OPTIONS
          : col.optionsKey === 'managers'
            ? managers.length > 0
              ? managers
              : users
            : col.optionsKey === 'surveyors'
              ? surveyors.length > 0
                ? surveyors
                : users
              : directions;
      const optionList =
        col.optionsKey === 'status'
          ? (options as { value: string; label: string }[])
          : (options as {
              id: string;
              name?: string;
              firstName?: string | null;
              lastName?: string | null;
            }[]);

      return (
        <select
          className={`${styles.editableInput} ${styles.editableSelect} ${isEdited ? styles.edited : ''}`}
          value={currentValue ?? ''}
          onChange={(e) => {
            e.stopPropagation();
            handleInlineEdit(m.id, col.key, e.target.value || null);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(col.key === 'surveyorId' || col.key === 'directionId') && <option value="">—</option>}
          {col.optionsKey === 'status'
            ? (optionList as { value: string; label: string }[]).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : (
                optionList as {
                  id: string;
                  name?: string;
                  firstName?: string | null;
                  lastName?: string | null;
                }[]
              ).map((o) => (
                <option key={o.id} value={o.id}>
                  {'name' in o ? o.name : [o.firstName, o.lastName].filter(Boolean).join(' ')}
                </option>
              ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
        value={currentValue ?? ''}
        onChange={(e) => {
          e.stopPropagation();
          handleInlineEdit(m.id, col.key, e.target.value || null);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  const columns = EDITABLE_COLUMNS.map((col) => ({
    key: col.key,
    title: col.title,
    sortable: col.key === 'receptionDate',
    render: (m: Measurement) => {
      if (editMode && selectedIds.includes(m.id)) {
        return renderEditableCell(m, col);
      }
      switch (col.key) {
        case 'receptionDate':
          return formatDate(m.receptionDate);
        case 'executionDate':
          return formatDate(m.executionDate);
        case 'managerId':
          return formatUser(m.manager);
        case 'surveyorId':
          return formatUser(m.surveyor);
        case 'directionId':
          return m.direction?.name ?? '—';
        case 'status':
          return (
            <span className={`${styles.badge} ${styles[`status${m.status}`] ?? ''}`}>
              {STATUS_LABELS[m.status] ?? m.status}
            </span>
          );
        case 'comments':
          const c = m.comments;
          if (!c) return '—';
          const s = String(c);
          return s.length > 50 ? s.slice(0, 50) + '…' : s;
        default:
          return (m[col.key] as string) ?? '—';
      }
    },
  }));

  const columnsWithActions = [
    ...columns,
    {
      key: 'actions',
      title: '',
      width: '90px',
      render: (m: Measurement) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {editMode && hasEdits(m.id) && (
            <span className={styles.editedIndicator} title="Есть изменения">
              ●
            </span>
          )}
          <button
            className={styles.actionButton}
            onClick={() => setHistoryMeasurementId(m.id)}
            title="История изменений"
          >
            📋
          </button>
          <button
            className={styles.actionButton}
            onClick={() => router.push(`/admin/crm/measurements/${m.id}`)}
            title="Редактировать"
          >
            ✏️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Замеры</h1>
          <span className={styles.count}>{total} замеров</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.secondaryButton} ${editMode ? styles.active : ''}`}
            onClick={() => {
              if (editMode && totalEditsCount > 0) {
                if (confirm('Есть несохранённые изменения. Выйти без сохранения?')) cancelEdits();
              } else {
                setEditMode(!editMode);
                setEditedProducts({});
              }
            }}
          >
            {editMode ? '✕ Выйти из редактирования' : '✏️ Быстрое редактирование'}
          </button>
          <Link href="/admin/crm/measurements/new" className={styles.addButton}>
            + Добавить замер
          </Link>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`${styles.saveMessage} ${
            saveMessageType === 'success' ? styles.saveMessageSuccess : styles.saveMessageError
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по ФИО, адресу, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все менеджеры</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все направления</option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className={styles.dateLabel}>
          <span className={styles.dateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.dateLabel}>
          <span className={styles.dateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={styles.dateInput}
          />
        </label>
      </div>

      {editMode && (
        <div className={styles.editModeBar}>
          <div className={styles.editModeInfo}>
            <span className={styles.editModeIcon}>✏️</span>
            <span>Режим быстрого редактирования</span>
            {totalEditsCount > 0 && (
              <span className={styles.editCount}>
                Изменено замеров: <strong>{totalEditsCount}</strong>
              </span>
            )}
          </div>
          <div className={styles.editModeActions}>
            <button
              className={styles.editCancelButton}
              onClick={cancelEdits}
              disabled={savingEdits}
            >
              Отмена
            </button>
            <button
              className={styles.editSaveButton}
              onClick={saveAllEdits}
              disabled={savingEdits || totalEditsCount === 0}
            >
              {savingEdits ? 'Сохранение...' : `Сохранить изменения (${totalEditsCount})`}
            </button>
          </div>
        </div>
      )}

      <DataTable
        data={data}
        columns={columnsWithActions}
        keyExtractor={(m) => m.id}
        onRowClick={(m) => router.push(`/admin/crm/measurements/${m.id}`)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
        emptyMessage="Нет замеров"
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />

      {historyMeasurementId && (
        <MeasurementHistoryModal
          measurementId={historyMeasurementId}
          measurementName={data.find((m) => m.id === historyMeasurementId)?.customerName}
          users={users}
          directions={directions}
          onClose={() => setHistoryMeasurementId(null)}
          onRollback={() => fetchData()}
        />
      )}
    </div>
  );
}
