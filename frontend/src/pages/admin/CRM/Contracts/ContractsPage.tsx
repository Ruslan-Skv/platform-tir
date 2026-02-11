'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ComplexObject,
  type Contract,
  type CrmDirection,
  type CrmUser,
  type Office,
  getComplexObjects,
  getContracts,
  getCrmDirections,
  getCrmUsers,
  getOffices,
  updateContract,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { ContractHistoryModal } from './ContractHistoryModal';
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
  | 'officeId'
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
  optionsKey?: 'managers' | 'directions' | 'status' | 'offices';
}

const EDITABLE_COLUMNS: EditableColumnConfig[] = [
  { key: 'contractNumber', title: '№ договора', type: 'text' },
  { key: 'contractDate', title: 'Дата заключения', type: 'date' },
  { key: 'status', title: 'Статус', type: 'select', optionsKey: 'status' },
  { key: 'directionId', title: 'Направление', type: 'select', optionsKey: 'directions' },
  { key: 'managerId', title: 'Менеджер', type: 'select', optionsKey: 'managers' },
  { key: 'officeId', title: 'Офис', type: 'select', optionsKey: 'offices' },
  { key: 'customerName', title: 'ФИО заказчика', type: 'text' },
  { key: 'customerAddress', title: 'Адрес', type: 'text' },
  { key: 'installationDate', title: 'Дата монтажа', type: 'date' },
  { key: 'deliveryDate', title: 'Дата доставки', type: 'date' },
];

// Все доступные колонки для управления
type ColumnKey =
  | 'contractNumber'
  | 'contractDate'
  | 'status'
  | 'directionId'
  | 'managerId'
  | 'officeId'
  | 'customerName'
  | 'customerAddress'
  | 'installationDate'
  | 'deliveryDate'
  | 'totalAmount'
  | 'paidAmount'
  | 'remaining';

interface ColumnConfig {
  key: ColumnKey;
  title: string;
  editable: boolean;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'contractNumber', title: '№ договора', editable: true },
  { key: 'contractDate', title: 'Дата заключения', editable: true },
  { key: 'status', title: 'Статус', editable: true },
  { key: 'directionId', title: 'Направление', editable: true },
  { key: 'managerId', title: 'Менеджер', editable: true },
  { key: 'officeId', title: 'Офис', editable: true },
  { key: 'customerName', title: 'ФИО заказчика', editable: true },
  { key: 'customerAddress', title: 'Адрес', editable: true },
  { key: 'installationDate', title: 'Дата монтажа', editable: true },
  { key: 'deliveryDate', title: 'Дата доставки', editable: true },
  { key: 'totalAmount', title: 'Стоимость', editable: false },
  { key: 'paidAmount', title: 'Оплачено', editable: false },
  { key: 'remaining', title: 'Остаток', editable: false },
];

const DEFAULT_COLUMNS: ColumnKey[] = [
  'contractNumber',
  'contractDate',
  'status',
  'customerName',
  'totalAmount',
  'paidAmount',
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
  const [offices, setOffices] = useState<Office[]>([]);
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
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);

  // Комплексные объекты и иерархическое отображение
  const [complexObjects, setComplexObjects] = useState<ComplexObject[]>([]);
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

  // Управление колонками
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_contracts_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as ColumnKey[];
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return DEFAULT_COLUMNS;
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

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
    getOffices()
      .then(setOffices)
      .catch(() => setOffices([]));
    getComplexObjects()
      .then(setComplexObjects)
      .catch(() => setComplexObjects([]));
  }, []);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  // Переключение развернутости объекта
  const toggleObjectExpand = (objectId: string) => {
    setExpandedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  };

  // Группировка договоров по объектам
  type GroupedData =
    | {
        type: 'object';
        object: ComplexObject;
        contracts: Contract[];
      }
    | {
        type: 'contract';
        contract: Contract;
      };

  const groupedData: GroupedData[] = (() => {
    const result: GroupedData[] = [];
    const usedContractIds = new Set<string>();

    // Сначала добавляем объекты с договорами
    complexObjects.forEach((obj) => {
      const objContracts = data.filter((c) => c.complexObjectId === obj.id);
      if (objContracts.length > 0) {
        result.push({ type: 'object', object: obj, contracts: objContracts });
        objContracts.forEach((c) => usedContractIds.add(c.id));
      }
    });

    // Затем добавляем договоры без объекта
    data.forEach((c) => {
      if (!usedContractIds.has(c.id)) {
        result.push({ type: 'contract', contract: c });
      }
    });

    return result;
  })();

  // Функции управления колонками
  const toggleColumn = (columnKey: ColumnKey) => {
    setSelectedColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey];
      localStorage.setItem('admin_contracts_columns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleDragStart = (e: React.DragEvent, columnKey: ColumnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }

    setSelectedColumns((prev) => {
      const newColumns = [...prev];
      const draggedIndex = newColumns.indexOf(draggedColumn);
      const targetIndex = newColumns.indexOf(targetKey);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }

      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);

      localStorage.setItem('admin_contracts_columns', JSON.stringify(newColumns));
      return newColumns;
    });

    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const moveColumn = (columnKey: ColumnKey, direction: 'up' | 'down') => {
    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnKey);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newColumns = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

      localStorage.setItem('admin_contracts_columns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

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
            : col.optionsKey === 'offices'
              ? offices
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

  // Рендер ячейки колонки
  const renderColumnCell = (c: Contract, columnKey: ColumnKey) => {
    const editableCol = EDITABLE_COLUMNS.find((col) => col.key === columnKey);

    // Если колонка редактируемая и включён режим редактирования
    if (editableCol && editMode && selectedIds.includes(c.id)) {
      return renderEditableCell(c, editableCol);
    }

    switch (columnKey) {
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
      case 'officeId':
        return c.office?.name ?? '—';
      case 'customerName':
        return c.customerName;
      case 'customerAddress':
        return c.customerAddress || '—';
      case 'installationDate':
        return formatDate(c.installationDate);
      case 'deliveryDate':
        return formatDate(c.deliveryDate);
      case 'totalAmount':
        return formatMoney(getEffectiveAmount(c));
      case 'paidAmount': {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const pct = effectiveAmount > 0 ? ((paid / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(paid)} (${pct}%)`;
      }
      case 'remaining': {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const remain = Math.max(0, effectiveAmount - paid);
        const pct = effectiveAmount > 0 ? ((remain / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(remain)} (${pct}%)`;
      }
      default:
        return '—';
    }
  };

  // Формирование видимых колонок на основе selectedColumns
  const visibleColumns = selectedColumns
    .map((columnKey) => {
      const columnConfig = AVAILABLE_COLUMNS.find((c) => c.key === columnKey);
      if (!columnConfig) return null;

      return {
        key: columnConfig.key,
        title: columnConfig.title,
        render: (c: Contract) => renderColumnCell(c, columnKey),
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    title: string;
    render: (c: Contract) => React.ReactNode;
  }>;

  const columnsWithActions = [
    ...visibleColumns,
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
            onClick={() => setHistoryContractId(c.id)}
            title="История изменений"
          >
            📋
          </button>
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
          <h1 className={styles.title}>Объекты</h1>
          <span className={styles.count}>{total} объектов</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.columnSelectorWrapper} ref={columnSelectorRef}>
            <button
              className={`${styles.secondaryButton} ${showColumnSelector ? styles.active : ''}`}
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              ⚙️ Колонки
            </button>
            {showColumnSelector && (
              <div className={styles.columnSelectorDropdown}>
                <div className={styles.columnSelectorHeader}>
                  <span>Выберите и упорядочьте колонки:</span>
                </div>
                <div className={styles.columnsList}>
                  {/* Выбранные колонки — можно перетаскивать */}
                  {selectedColumns.length > 0 && (
                    <div className={styles.selectedColumnsSection}>
                      <div className={styles.sectionLabel}>
                        Отображаемые (перетащите для сортировки):
                      </div>
                      {selectedColumns.map((colKey, index) => {
                        const col = AVAILABLE_COLUMNS.find((c) => c.key === colKey);
                        if (!col) return null;
                        return (
                          <div
                            key={colKey}
                            className={`${styles.columnItem} ${styles.selected} ${draggedColumn === colKey ? styles.dragging : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, colKey)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, colKey)}
                            onDragEnd={handleDragEnd}
                          >
                            <span className={styles.dragHandle}>⋮⋮</span>
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => toggleColumn(colKey)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={styles.columnTitle}>{col.title}</span>
                            <div className={styles.columnOrderButtons}>
                              <button
                                className={styles.orderButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveColumn(colKey, 'up');
                                }}
                                disabled={index === 0}
                                title="Переместить вверх"
                              >
                                ↑
                              </button>
                              <button
                                className={styles.orderButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveColumn(colKey, 'down');
                                }}
                                disabled={index === selectedColumns.length - 1}
                                title="Переместить вниз"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Доступные колонки — не выбранные */}
                  {AVAILABLE_COLUMNS.filter((col) => !selectedColumns.includes(col.key)).length >
                    0 && (
                    <div className={styles.availableColumnsSection}>
                      <div className={styles.sectionLabel}>Доступные колонки:</div>
                      {AVAILABLE_COLUMNS.filter((col) => !selectedColumns.includes(col.key)).map(
                        (col) => (
                          <div key={col.key} className={styles.columnItem}>
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleColumn(col.key)}
                            />
                            <span className={styles.columnTitle}>{col.title}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
            + Добавить объект
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

      {/* Иерархическая таблица объектов и договоров */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : groupedData.length === 0 ? (
          <div className={styles.empty}>Нет объектов</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.expandColumn}></th>
                <th className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(data.map((c) => c.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th key={col.key}>{col.title}</th>
                ))}
                <th className={styles.actionsColumn}></th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((item) => {
                if (item.type === 'object') {
                  const isExpanded = expandedObjects.has(item.object.id);
                  const hasMultiple = item.contracts.length > 1;
                  return (
                    <React.Fragment key={`obj-${item.object.id}`}>
                      {/* Строка объекта */}
                      <tr
                        className={`${styles.objectRow} ${isExpanded ? styles.expanded : ''}`}
                        onClick={() => hasMultiple && toggleObjectExpand(item.object.id)}
                      >
                        <td className={styles.expandCell}>
                          {hasMultiple && (
                            <button
                              className={styles.expandButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleObjectExpand(item.object.id);
                              }}
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          )}
                        </td>
                        <td className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            checked={item.contracts.every((c) => selectedIds.includes(c.id))}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedIds((prev) => [
                                  ...prev,
                                  ...item.contracts
                                    .map((c) => c.id)
                                    .filter((id) => !prev.includes(id)),
                                ]);
                              } else {
                                setSelectedIds((prev) =>
                                  prev.filter((id) => !item.contracts.some((c) => c.id === id))
                                );
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td colSpan={visibleColumns.length} className={styles.objectNameCell}>
                          <div className={styles.objectInfo}>
                            <span className={styles.objectIcon}>🏠</span>
                            <span className={styles.objectName}>{item.object.name}</span>
                            <span className={styles.objectMeta}>
                              {item.object.customerName && <span>{item.object.customerName}</span>}
                              <span className={styles.contractCount}>
                                {item.contracts.length} договор
                                {item.contracts.length === 1
                                  ? ''
                                  : item.contracts.length < 5
                                    ? 'а'
                                    : 'ов'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className={styles.actionsCell}>
                          <button
                            className={styles.actionButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/crm/contracts/${item.contracts[0].id}`);
                            }}
                            title="Открыть объект"
                          >
                            ➜
                          </button>
                        </td>
                      </tr>
                      {/* Вложенные договоры */}
                      {(isExpanded || !hasMultiple) &&
                        item.contracts.map((c, idx) => (
                          <tr
                            key={c.id}
                            className={`${styles.contractRow} ${hasMultiple ? styles.nested : ''} ${selectedIds.includes(c.id) ? styles.selected : ''}`}
                            onClick={() => router.push(`/admin/crm/contracts/${c.id}`)}
                          >
                            <td className={styles.expandCell}>
                              {hasMultiple && (
                                <span className={styles.nestLine}>
                                  {idx === item.contracts.length - 1 ? '└' : '├'}
                                </span>
                              )}
                            </td>
                            <td className={styles.checkboxCell}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(c.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setSelectedIds((prev) => [...prev, c.id]);
                                  } else {
                                    setSelectedIds((prev) => prev.filter((id) => id !== c.id));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            {visibleColumns.map((col) => (
                              <td key={col.key}>{col.render(c)}</td>
                            ))}
                            <td className={styles.actionsCell}>
                              <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                                {editMode && hasEdits(c.id) && (
                                  <span className={styles.editedIndicator} title="Есть изменения">
                                    ●
                                  </span>
                                )}
                                <button
                                  className={styles.actionButton}
                                  onClick={() => setHistoryContractId(c.id)}
                                  title="История изменений"
                                >
                                  📋
                                </button>
                                <button
                                  className={styles.actionButton}
                                  onClick={() => router.push(`/admin/crm/contracts/${c.id}`)}
                                  title="Редактировать"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                } else {
                  // Одиночный договор без объекта
                  const c = item.contract;
                  return (
                    <tr
                      key={c.id}
                      className={`${styles.contractRow} ${selectedIds.includes(c.id) ? styles.selected : ''}`}
                      onClick={() => router.push(`/admin/crm/contracts/${c.id}`)}
                    >
                      <td className={styles.expandCell}></td>
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td key={col.key}>{col.render(c)}</td>
                      ))}
                      <td className={styles.actionsCell}>
                        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                          {editMode && hasEdits(c.id) && (
                            <span className={styles.editedIndicator} title="Есть изменения">
                              ●
                            </span>
                          )}
                          <button
                            className={styles.actionButton}
                            onClick={() => setHistoryContractId(c.id)}
                            title="История изменений"
                          >
                            📋
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() => router.push(`/admin/crm/contracts/${c.id}`)}
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Пагинация */}
      {total > limit && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className={styles.paginationButton}
          >
            ← Назад
          </button>
          <span className={styles.paginationInfo}>
            Страница {page} из {Math.ceil(total / limit)}
          </span>
          <button
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage(page + 1)}
            className={styles.paginationButton}
          >
            Вперёд →
          </button>
        </div>
      )}

      {historyContractId && (
        <ContractHistoryModal
          contractId={historyContractId}
          contractNumber={data.find((c) => c.id === historyContractId)?.contractNumber}
          users={users}
          directions={directions}
          onClose={() => setHistoryContractId(null)}
          onRollback={() => fetchData()}
        />
      )}
    </div>
  );
}
