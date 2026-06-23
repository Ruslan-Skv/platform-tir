'use client';

import type { InstallerDirection, InstallerMaster } from '@/shared/api/admin-crm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './InstallersPage.module.css';
import type { InstallersPageModel } from './hooks/useInstallersPage';
import { DIRECTION_LABELS, DIRECTION_OPTIONS } from './installers-page.constants';
import type { InstallerFormValues } from './installers-page.types';
import { isRepairInstallerDirection } from './installers-page.utils';

type InstallersPageViewProps = {
  model: InstallersPageModel;
};

const DIRECTION_BADGE_CLASS: Record<InstallerDirection, string> = {
  REPAIR: styles.badgeRepair,
  WINDOWS: styles.badgeWindows,
  DOORS: styles.badgeDoors,
  CEILINGS: styles.badgeCeilings,
  FURNITURE: styles.badgeFurniture,
  BLINDS: styles.badgeBlinds,
};

export function InstallersPageView({ model }: InstallersPageViewProps) {
  const {
    installers,
    filtered,
    loading,
    directionFilter,
    setDirectionFilter,
    message,
    createModalOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    formValues,
    setFormValues,
    formError,
    submitting,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handleCreate,
    handleEdit,
    handleDelete,
  } = model;

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
          <button
            data-admin-mutation
            type="button"
            className={styles.actionButton}
            onClick={() => openEditModal(item)}
          >
            Изменить
          </button>
          <button
            data-admin-mutation
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
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            onClick={openCreateModal}
          >
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

      <Modal isOpen={createModalOpen} onClose={closeCreateModal} title="Добавить мастера" size="md">
        <form data-modal-form onSubmit={handleCreate}>
          <InstallerForm values={formValues} onChange={setFormValues} formError={formError} />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              Заполните карточку мастера для выбранного направления.
            </span>
          </div>
          <ModalActions onCancel={closeCreateModal} submitting={submitting} />
        </form>
      </Modal>

      <Modal isOpen={Boolean(editItem)} onClose={closeEditModal} title="Изменить мастера" size="md">
        <form data-modal-form onSubmit={handleEdit}>
          <InstallerForm values={formValues} onChange={setFormValues} formError={formError} />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>Изменения применятся сразу после сохранения.</span>
          </div>
          <ModalActions onCancel={closeEditModal} submitting={submitting} />
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
      <button data-admin-mutation type="submit" data-modal-btn="primary" disabled={submitting}>
        {submitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  );
}
