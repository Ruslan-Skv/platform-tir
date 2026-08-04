'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CrmUser, InstallerDirection, InstallerMaster } from '@/shared/api/admin-crm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon, EditIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

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

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function InstallersPageView({ model }: InstallersPageViewProps) {
  const {
    installers,
    filtered,
    users,
    loading,
    directionFilter,
    setDirectionFilter,
    message,
    setMessage,
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
    refresh,
  } = model;

  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    if (message.type === 'success') {
      setSuccessText(message.text);
      setSuccessVisible(true);
      const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
      setMessage(null);
      return () => window.clearTimeout(timer);
    }
  }, [message, setMessage]);

  const directionCounts = useMemo(() => {
    const counts: Record<'ALL' | InstallerDirection, number> = {
      ALL: installers.length,
      REPAIR: 0,
      WINDOWS: 0,
      DOORS: 0,
      CEILINGS: 0,
      FURNITURE: 0,
      BLINDS: 0,
    };
    for (const item of installers) counts[item.direction] += 1;
    return counts;
  }, [installers]);

  const countTitle =
    directionFilter === 'ALL'
      ? `${installers.length} мастеров`
      : `${filtered.length} из ${installers.length} мастеров`;

  const iconsDisabled = loading || submitting;

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
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Изменить"
            title="Изменить"
            onClick={() => openEditModal(item)}
          >
            <EditIcon />
          </AdminTableIconButton>
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Удалить"
            title="Удалить"
            onClick={() => setDeleteItem(item)}
          >
            <DeleteIcon />
          </AdminTableIconButton>
        </div>
      ),
    },
  ];

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить список"
        aria-label={loading ? 'Обновление списка мастеров' : 'Обновить список мастеров'}
        onClick={() => void refresh()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Мастера (монтажники)</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{filtered.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={openCreateModal}
          >
            + Добавить мастера
          </button>
          {iconActions('desktop')}
        </div>
      </div>

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Направление">
            <span className={cdHub.contractsListChipRowLabel}>Направление</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(directionFilter === 'ALL')}
              onClick={() => setDirectionFilter('ALL')}
            >
              Все ({directionCounts.ALL})
            </button>
            {DIRECTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={chipClass(directionFilter === opt.value)}
                onClick={() => setDirectionFilter(opt.value)}
              >
                {opt.label} ({directionCounts[opt.value]})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mobileCards} aria-label="Список мастеров">
        {loading && filtered.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className={styles.mobileEmpty}>Мастера не найдены</p>
        ) : (
          filtered.map((item) => (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{item.fullName}</span>
                  <span className={styles.mobileCardMeta}>
                    {DIRECTION_LABELS[item.direction]}
                    {isRepairInstallerDirection(item.direction) ? ` · ${item.grade}` : ''}
                  </span>
                </div>
                <span className={`${styles.badge} ${DIRECTION_BADGE_CLASS[item.direction]}`}>
                  {DIRECTION_LABELS[item.direction]}
                </span>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Аккаунт</dt>
                  <dd>{item.user ? formatUserLabel(item.user) : 'Без привязки'}</dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>
                <div className={styles.actions}>
                  <AdminTableIconButton
                    data-admin-mutation
                    aria-label="Изменить"
                    title="Изменить"
                    onClick={() => openEditModal(item)}
                  >
                    <EditIcon />
                  </AdminTableIconButton>
                  <AdminTableIconButton
                    data-admin-mutation
                    aria-label="Удалить"
                    title="Удалить"
                    onClick={() => setDeleteItem(item)}
                  >
                    <DeleteIcon />
                  </AdminTableIconButton>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
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
