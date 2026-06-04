'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type InstallerDirection,
  type InstallerMaster,
  createInstaller,
  deleteInstaller,
  getInstallers,
  updateInstaller,
} from '@/shared/api/admin-crm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './InstallersPage.module.css';

const DIRECTION_LABELS: Record<InstallerDirection, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  FURNITURE: 'Мебель',
  BLINDS: 'Жалюзи',
};

const DIRECTION_OPTIONS: Array<{ value: InstallerDirection; label: string }> = [
  { value: 'REPAIR', label: DIRECTION_LABELS.REPAIR },
  { value: 'WINDOWS', label: DIRECTION_LABELS.WINDOWS },
  { value: 'DOORS', label: DIRECTION_LABELS.DOORS },
  { value: 'CEILINGS', label: DIRECTION_LABELS.CEILINGS },
  { value: 'FURNITURE', label: DIRECTION_LABELS.FURNITURE },
  { value: 'BLINDS', label: DIRECTION_LABELS.BLINDS },
];

const DIRECTION_BADGE_CLASS: Record<InstallerDirection, string> = {
  REPAIR: styles.badgeRepair,
  WINDOWS: styles.badgeWindows,
  DOORS: styles.badgeDoors,
  CEILINGS: styles.badgeCeilings,
  FURNITURE: styles.badgeFurniture,
  BLINDS: styles.badgeBlinds,
};

interface InstallerFormValues {
  direction: InstallerDirection;
  fullName: string;
  grade: string;
}

/** В БД поле обязательное; для направлений кроме «Ремонт» сохраняем заглушку. */
const INSTALLER_GRADE_NOT_USED = '—';

const EMPTY_FORM: InstallerFormValues = {
  direction: 'REPAIR',
  fullName: '',
  grade: '',
};

function isRepairInstallerDirection(direction: InstallerDirection): boolean {
  return direction === 'REPAIR';
}

function gradeForApi(direction: InstallerDirection, grade: string): string {
  return isRepairInstallerDirection(direction) ? grade.trim() : INSTALLER_GRADE_NOT_USED;
}

function gradeForForm(direction: InstallerDirection, grade: string): string {
  if (!isRepairInstallerDirection(direction)) return '';
  if (grade === INSTALLER_GRADE_NOT_USED) return '';
  return grade;
}

export function InstallersPage() {
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<InstallerDirection | 'ALL'>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InstallerMaster | null>(null);
  const [deleteItem, setDeleteItem] = useState<InstallerMaster | null>(null);

  const [formValues, setFormValues] = useState<InstallerFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadInstallers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstallers();
      setInstallers(data);
    } catch (err) {
      setInstallers([]);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить мастеров',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstallers();
  }, [loadInstallers]);

  const extractGradeRank = (value: string): number => {
    const match = value.match(/\d+/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number.parseInt(match[0], 10);
  };

  const filtered = useMemo(() => {
    const byDirection =
      directionFilter === 'ALL'
        ? installers
        : installers.filter((item) => item.direction === directionFilter);

    return [...byDirection].sort((a, b) => {
      const gradeDiff = extractGradeRank(a.grade) - extractGradeRank(b.grade);
      if (gradeDiff !== 0) return gradeDiff;
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [installers, directionFilter]);

  const resetForm = () => {
    setFormValues(EMPTY_FORM);
    setFormError(null);
    setSubmitting(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (item: InstallerMaster) => {
    setFormValues({
      direction: item.direction,
      fullName: item.fullName,
      grade: gradeForForm(item.direction, item.grade),
    });
    setFormError(null);
    setSubmitting(false);
    setEditItem(item);
  };

  const validateForm = () => {
    if (!formValues.fullName.trim()) return 'Укажите ФИО мастера';
    if (isRepairInstallerDirection(formValues.direction) && !formValues.grade.trim()) {
      return 'Укажите разряд мастера';
    }
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createInstaller({
        direction: formValues.direction,
        fullName: formValues.fullName.trim(),
        grade: gradeForApi(formValues.direction, formValues.grade),
      });
      setCreateModalOpen(false);
      resetForm();
      setMessage({ type: 'success', text: 'Мастер добавлен' });
      await loadInstallers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить мастера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await updateInstaller(editItem.id, {
        direction: formValues.direction,
        fullName: formValues.fullName.trim(),
        grade: gradeForApi(formValues.direction, formValues.grade),
      });
      setEditItem(null);
      resetForm();
      setMessage({ type: 'success', text: 'Карточка мастера обновлена' });
      await loadInstallers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось обновить мастера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await deleteInstaller(deleteItem.id);
      setDeleteItem(null);
      setMessage({ type: 'success', text: 'Мастер удалён' });
      await loadInstallers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось удалить мастера',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'direction',
      title: 'Направление',
      render: (item: InstallerMaster) => (
        <span className={`${styles.badge} ${DIRECTION_BADGE_CLASS[item.direction]}`}>
          {DIRECTION_LABELS[item.direction]}
        </span>
      ),
    },
    {
      key: 'fullName',
      title: 'ФИО',
      render: (item: InstallerMaster) => item.fullName,
    },
    {
      key: 'grade',
      title: 'Разряд',
      render: (item: InstallerMaster) =>
        isRepairInstallerDirection(item.direction) ? item.grade : '—',
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (item: InstallerMaster) => (
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} onClick={() => openEditModal(item)}>
            Изменить
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionDanger}`}
            onClick={() => setDeleteItem(item)}
          >
            Удалить
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Мастера (монтажники)</h1>
          <span className={styles.count}>
            {filtered.length} из {installers.length}
          </span>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.filterLabel}>
            Направление:
            <select
              className={styles.filterSelect}
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as InstallerDirection | 'ALL')}
            >
              <option value="ALL">Все направления</option>
              {DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.addButton} onClick={openCreateModal}>
            + Добавить мастера
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Мастера не найдены"
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Добавить мастера"
        size="md"
      >
        <form data-modal-form onSubmit={handleCreate}>
          <InstallerForm values={formValues} onChange={setFormValues} formError={formError} />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              Заполните карточку мастера для выбранного направления.
            </span>
          </div>
          <ModalActions
            onCancel={() => {
              setCreateModalOpen(false);
              resetForm();
            }}
            submitting={submitting}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editItem)}
        onClose={() => {
          setEditItem(null);
          resetForm();
        }}
        title="Изменить мастера"
        size="md"
      >
        <form data-modal-form onSubmit={handleEdit}>
          <InstallerForm values={formValues} onChange={setFormValues} formError={formError} />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>Изменения применятся сразу после сохранения.</span>
          </div>
          <ModalActions
            onCancel={() => {
              setEditItem(null);
              resetForm();
            }}
            submitting={submitting}
          />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        title="Удалить мастера"
        message={`Удалить мастера ${deleteItem?.fullName ?? ''}?`}
        confirmText={submitting ? 'Удаление…' : 'Удалить'}
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function InstallerForm({
  values,
  onChange,
  formError,
}: {
  values: InstallerFormValues;
  onChange: (next: InstallerFormValues) => void;
  formError: string | null;
}) {
  const gradeApplies = isRepairInstallerDirection(values.direction);

  const handleDirectionChange = (direction: InstallerDirection) => {
    onChange({
      ...values,
      direction,
      grade: isRepairInstallerDirection(direction) ? values.grade : '',
    });
  };

  return (
    <>
      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="installer-direction">Направление *</label>
          <select
            id="installer-direction"
            value={values.direction}
            onChange={(e) => handleDirectionChange(e.target.value as InstallerDirection)}
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="installer-grade">Разряд{gradeApplies ? ' *' : ''}</label>
          <input
            id="installer-grade"
            type="text"
            value={values.grade}
            disabled={!gradeApplies}
            readOnly={!gradeApplies}
            onChange={(e) => onChange({ ...values, grade: e.target.value })}
            placeholder={gradeApplies ? 'Например: 4 разряд' : 'Только для направления «Ремонт»'}
            title={
              gradeApplies
                ? undefined
                : 'Разряд указывается только для мастеров направления «Ремонт»'
            }
          />
        </div>
      </div>

      <div data-modal-form-group>
        <label htmlFor="installer-fullname">ФИО *</label>
        <input
          id="installer-fullname"
          type="text"
          value={values.fullName}
          onChange={(e) => onChange({ ...values, fullName: e.target.value })}
          placeholder="Иванов Иван Иванович"
        />
      </div>

      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}

function ModalActions({ onCancel, submitting }: { onCancel: () => void; submitting: boolean }) {
  return (
    <div data-modal-form-actions>
      <button type="button" data-modal-btn="secondary" onClick={onCancel} disabled={submitting}>
        Отмена
      </button>
      <button type="submit" data-modal-btn="primary" disabled={submitting}>
        {submitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  );
}
