'use client';

import type { CrmUser, InstallerDirection, InstallerMaster } from '@/shared/api/admin-crm';
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
    users,
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
    formatUserLabel,
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
      key: 'user',
      title: 'Аккаунт',
      render: (item: InstallerMaster) =>
        item.user ? formatUserLabel(item.user) : <span className={styles.muted}>Без привязки</span>,
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
          <InstallerForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            formatUserLabel={formatUserLabel}
          />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              ФИО достаточно для графика. Аккаунт нужен только если мастер должен получать
              уведомления в колокольчик.
            </span>
          </div>
          <ModalActions onCancel={closeCreateModal} submitting={submitting} />
        </form>
      </Modal>

      <Modal isOpen={Boolean(editItem)} onClose={closeEditModal} title="Изменить мастера" size="md">
        <form data-modal-form onSubmit={handleEdit}>
          <InstallerForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            formatUserLabel={formatUserLabel}
          />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              Привязку к аккаунту можно снять в любой момент — мастер останется в справочнике по
              ФИО.
            </span>
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
  users,
  formatUserLabel,
}: {
  values: InstallerFormValues;
  onChange: (next: InstallerFormValues) => void;
  formError: string | null;
  users: CrmUser[];
  formatUserLabel: (user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
  }) => string;
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

      <div data-modal-form-group>
        <label htmlFor="installer-user">Аккаунт в системе</label>
        <select
          id="installer-user"
          value={values.userId}
          onChange={(e) => onChange({ ...values, userId: e.target.value })}
        >
          <option value="">Без привязки</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {formatUserLabel(u)}
              {u.email ? ` (${u.email})` : ''}
            </option>
          ))}
        </select>
        <p className={styles.fieldHint}>
          Необязательно. С привязкой мастер получает уведомления по графику монтажей в колокольчик.
        </p>
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
