'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
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

interface MeasurementLinksInfo {
  estimateId: string;
  estimateTitle: string;
  packageId?: string;
  packageTitle?: string;
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
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const q = searchParams.get('search');
    if (q && q.trim()) setSearch(q.trim());
  }, [searchParams]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, MeasurementEdits>>({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');
  const [historyMeasurementId, setHistoryMeasurementId] = useState<string | null>(null);
  const [linksByMeasurementId, setLinksByMeasurementId] = useState<
    Record<string, MeasurementLinksInfo>
  >({});
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

  const extractEstimatePresetIdsFromPackageForm = (formData: unknown): string[] => {
    if (!formData || typeof formData !== 'object') return [];
    const estimate = (formData as Record<string, unknown>).estimate;
    if (!estimate || typeof estimate !== 'object') return [];
    const rawIds = (estimate as Record<string, unknown>).estimatePresetIds;
    if (!Array.isArray(rawIds)) return [];
    return rawIds
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim());
  };

  const chooseLatestByUpdatedAt = <T extends { updatedAt?: string }>(items: T[]): T | null => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => {
      const da = new Date(a.updatedAt ?? 0).getTime();
      const db = new Date(b.updatedAt ?? 0).getTime();
      return db - da;
    })[0];
  };

  const loadMeasurementLinks = useCallback(async (measurements: Measurement[]) => {
    const measurementIds = new Set(measurements.map((m) => m.id));
    if (measurementIds.size === 0) {
      setLinksByMeasurementId({});
      return;
    }
    try {
      const [{ items: estimates }, packages] = await Promise.all([
        getContractDocumentEstimatePresets('REPAIR'),
        getContractDocumentPackages('REPAIR'),
      ]);
      const estimatesByMeasurement = new Map<string, ContractEstimatePreset[]>();
      for (const estimate of estimates) {
        const sourceMeasurementId = estimate.sourceMeasurementId?.trim();
        if (!sourceMeasurementId || !measurementIds.has(sourceMeasurementId)) continue;
        const bucket = estimatesByMeasurement.get(sourceMeasurementId) ?? [];
        bucket.push(estimate);
        estimatesByMeasurement.set(sourceMeasurementId, bucket);
      }

      const packagesByEstimateId = new Map<string, ContractDocumentPackage[]>();
      for (const pkg of packages) {
        const estimateIds = extractEstimatePresetIdsFromPackageForm(pkg.formData);
        for (const estimateId of estimateIds) {
          const bucket = packagesByEstimateId.get(estimateId) ?? [];
          bucket.push(pkg);
          packagesByEstimateId.set(estimateId, bucket);
        }
      }

      const nextMap: Record<string, MeasurementLinksInfo> = {};
      for (const measurement of measurements) {
        const relatedEstimates = estimatesByMeasurement.get(measurement.id) ?? [];
        const latestEstimate = chooseLatestByUpdatedAt(relatedEstimates);
        if (!latestEstimate) continue;
        const relatedPackages = packagesByEstimateId.get(latestEstimate.id) ?? [];
        const latestPackage = chooseLatestByUpdatedAt(relatedPackages);
        nextMap[measurement.id] = {
          estimateId: latestEstimate.id,
          estimateTitle: latestEstimate.title || 'Расчёт',
          ...(latestPackage
            ? {
                packageId: latestPackage.id,
                packageTitle: latestPackage.title || 'Пакет документов',
              }
            : {}),
        };
      }
      setLinksByMeasurementId(nextMap);
    } catch {
      setLinksByMeasurementId({});
    }
  }, []);

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
      await loadMeasurementLinks(res.data);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
      setLinksByMeasurementId({});
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    statusFilter,
    managerFilter,
    directionFilter,
    search,
    dateFrom,
    dateTo,
    loadMeasurementLinks,
  ]);

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
      key: 'links',
      title: 'Связи',
      render: (m: Measurement) => {
        const links = linksByMeasurementId[m.id];
        if (!links) {
          return <span className={styles.muted}>Нет связанного расчёта</span>;
        }
        return (
          <div>
            <div className={styles.linkStateOk}>Расчёт создан</div>
            {links.packageId ? (
              <div className={styles.linkStateDone}>Договор создан</div>
            ) : (
              <div className={styles.linkStatePending}>Договор не создан</div>
            )}
          </div>
        );
      },
    },
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
            onClick={() => router.push(`/admin/measurements/${m.id}`)}
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
            className={`${styles.secondaryButton} ${styles.refreshButton}`}
            onClick={() => void fetchData()}
            disabled={loading}
            title="Обновить список замеров"
            aria-label="Обновить список замеров"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? styles.refreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
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
          <Link href="/admin/measurements/new" className={styles.addButton}>
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
        onRowClick={(m) => router.push(`/admin/measurements/${m.id}`)}
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
