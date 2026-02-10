'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type Contract,
  type CrmDirection,
  type CrmUser,
  getContracts,
  getCrmDirections,
  getCrmUsers,
  updateContract,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ContractsPage.module.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
};

type EditableFieldKey =
  | 'contractNumber'
  | 'contractDate'
  | 'status'
  | 'directionId'
  | 'managerId'
  | 'customerName'
  | 'customerAddress'
  | 'customerPhone'
  | 'installationDate'
  | 'deliveryDate';

type ContractEdits = Partial<Record<EditableFieldKey, string | null>>;

interface EditableColumnConfig {
  key: EditableFieldKey;
  title: string;
  type: 'text' | 'date' | 'select';
  optionsKey?: 'managers' | 'directions' | 'status';
}

const EDITABLE_COLUMNS: EditableColumnConfig[] = [
  { key: 'contractNumber', title: '№ договора', type: 'text' },
  { key: 'contractDate', title: 'Дата заключения', type: 'date' },
  { key: 'status', title: 'Статус', type: 'select', optionsKey: 'status' },
  { key: 'directionId', title: 'Направление', type: 'select', optionsKey: 'directions' },
  { key: 'managerId', title: 'Менеджер', type: 'select', optionsKey: 'managers' },
  { key: 'customerName', title: 'ФИО заказчика', type: 'text' },
  { key: 'customerAddress', title: 'Адрес', type: 'text' },
  { key: 'installationDate', title: 'Дата монтажа', type: 'date' },
  { key: 'deliveryDate', title: 'Дата доставки', type: 'date' },
];

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 10);
}

function formatMoney(v: string | number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

function getEffectiveAmount(c: Contract): number {
  const total = Number(c.totalAmount);
  const discount = Number(c.discount ?? 0);
  const base = Math.max(0, total - discount);
  const amendmentsTotal = (c.amendments ?? []).reduce(
    (s, a) => s + Number(a.amount) - Number(a.discount ?? 0),
    0
  );
  return base + amendmentsTotal;
}

export function ContractsPage() {
  const router = useRouter();
  const [data, setData] = useState<Contract[]>([]);
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
  const [editedContracts, setEditedContracts] = useState<Record<string, ContractEdits>>({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContracts({
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

  const handleInlineEdit = (contractId: string, field: EditableFieldKey, value: string | null) => {
    setEditedContracts((prev) => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        [field]: value,
      },
    }));
  };

  const getCurrentValue = (c: Contract, field: EditableFieldKey): string | null => {
    if (editedContracts[c.id]?.[field] !== undefined) {
      return editedContracts[c.id][field] ?? null;
    }
    switch (field) {
      case 'managerId':
        return c.managerId ?? (c.manager as { id?: string })?.id ?? null;
      case 'directionId':
        return c.directionId ?? (c.direction as { id?: string })?.id ?? null;
      case 'contractDate':
        return c.contractDate ? formatDateForInput(c.contractDate) : null;
      case 'installationDate':
        return c.installationDate ? formatDateForInput(c.installationDate) : null;
      case 'deliveryDate':
        return c.deliveryDate ? formatDateForInput(c.deliveryDate) : null;
      default:
        return (c[field] as string) ?? null;
    }
  };

  const hasEdits = (contractId: string): boolean =>
    Object.keys(editedContracts[contractId] || {}).length > 0;

  const saveAllEdits = async () => {
    const idsToSave = Object.keys(editedContracts).filter((id) => hasEdits(id));
    if (idsToSave.length === 0) return;

    setSavingEdits(true);
    setSaveMessage(null);
    try {
      for (const id of idsToSave) {
        const edits = { ...editedContracts[id] } as Record<string, string | null>;
        const optionalKeys: EditableFieldKey[] = [
          'directionId',
          'managerId',
          'customerAddress',
          'customerPhone',
          'installationDate',
          'deliveryDate',
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
        await updateContract(id, payload);
      }
      setEditedContracts({});
      setSaveMessageType('success');
      setSaveMessage(`Сохранено договоров: ${idsToSave.length}`);
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
    setEditedContracts({});
    setEditMode(false);
  };

  const totalEditsCount = Object.keys(editedContracts).filter((id) => hasEdits(id)).length;

  const renderEditableCell = (c: Contract, col: EditableColumnConfig) => {
    const currentValue = getCurrentValue(c, col.key);
    const isEdited = editedContracts[c.id]?.[col.key] !== undefined;

    if (col.type === 'date') {
      return (
        <input
          type="date"
          className={`${styles.editableInput} ${isEdited ? styles.edited : ''}`}
          value={currentValue ?? ''}
          onChange={(e) => {
            e.stopPropagation();
            const v = e.target.value || null;
            handleInlineEdit(c.id, col.key, v);
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
            ? users
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
            handleInlineEdit(c.id, col.key, e.target.value || null);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(col.key === 'directionId' || col.key === 'managerId') && <option value="">—</option>}
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
          handleInlineEdit(c.id, col.key, e.target.value || null);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  const editableColumns = EDITABLE_COLUMNS.map((col) => ({
    key: col.key,
    title: col.title,
    render: (c: Contract) => {
      if (editMode && selectedIds.includes(c.id)) {
        return renderEditableCell(c, col);
      }
      switch (col.key) {
        case 'contractNumber':
          return c.contractNumber;
        case 'contractDate':
          return formatDate(c.contractDate);
        case 'status':
          return (
            <span className={`${styles.badge} ${styles[`status${c.status}`] ?? ''}`}>
              {STATUS_LABELS[c.status] ?? c.status}
            </span>
          );
        case 'directionId':
          return c.direction?.name ?? '—';
        case 'managerId':
          return formatUser(c.manager);
        case 'customerName':
          return c.customerName;
        case 'customerAddress':
          return c.customerAddress || '—';
        case 'installationDate':
          return formatDate(c.installationDate);
        case 'deliveryDate':
          return formatDate(c.deliveryDate);
        default:
          return (c[col.key] as string) ?? '—';
      }
    },
  }));

  const displayOnlyColumns = [
    {
      key: 'totalAmount',
      title: 'Стоимость',
      render: (c: Contract) => formatMoney(getEffectiveAmount(c)),
    },
    {
      key: 'paidAmount',
      title: 'Оплачено',
      render: (c: Contract) => {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const pct = effectiveAmount > 0 ? ((paid / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(paid)} (${pct}%)`;
      },
    },
    {
      key: 'remaining',
      title: 'Остаток',
      render: (c: Contract) => {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const remain = Math.max(0, effectiveAmount - paid);
        const pct = effectiveAmount > 0 ? ((remain / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(remain)} (${pct}%)`;
      },
    },
  ];

  const columnsWithActions = [
    ...editableColumns,
    ...displayOnlyColumns,
    {
      key: 'actions',
      title: '',
      width: '90px',
      render: (c: Contract) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {editMode && hasEdits(c.id) && (
            <span className={styles.editedIndicator} title="Есть изменения">
              ●
            </span>
          )}
          <button
            className={styles.actionButton}
            onClick={() => router.push(`/admin/crm/contracts/${c.id}`)}
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
          <h1 className={styles.title}>Договоры</h1>
          <span className={styles.count}>{total} договоров</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.secondaryButton} ${editMode ? styles.active : ''}`}
            onClick={() => {
              if (editMode && totalEditsCount > 0) {
                if (confirm('Есть несохранённые изменения. Выйти без сохранения?')) cancelEdits();
              } else {
                setEditMode(!editMode);
                setEditedContracts({});
              }
            }}
          >
            {editMode ? '✕ Выйти из редактирования' : '✏️ Быстрое редактирование'}
          </button>
          <Link href="/admin/crm/contracts/new" className={styles.addButton}>
            + Добавить договор
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

      {editMode && (
        <div className={styles.editModeBar}>
          <div className={styles.editModeInfo}>
            <span className={styles.editModeIcon}>✏️</span>
            <span>Режим быстрого редактирования</span>
            {totalEditsCount > 0 && (
              <span className={styles.editCount}>
                Изменено договоров: <strong>{totalEditsCount}</strong>
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

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по № договора, ФИО, адресу..."
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
              {[u.firstName, u.lastName].filter(Boolean).join(' ')}
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

      <DataTable
        data={data}
        columns={columnsWithActions}
        keyExtractor={(c) => c.id}
        onRowClick={(c) => router.push(`/admin/crm/contracts/${c.id}`)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
        emptyMessage="Нет договоров"
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
