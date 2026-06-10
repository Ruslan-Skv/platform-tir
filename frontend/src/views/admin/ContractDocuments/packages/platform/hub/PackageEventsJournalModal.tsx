'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';

import type { ContractDocumentPackageVersionListItem } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';

import styles from './PackageEventsJournalModal.module.css';
import hubStyles from './PackageHubModal.module.css';

const PACKAGE_VERSION_MOMENT_LABELS: Record<string, string> = {
  packageCreated: 'Создание пакета',
  packageRollbackApplied: 'Восстановлено состояние из сохранённого снимка',
  packageFormDataUpdated: 'Изменены данные пакета',
  packageCustomerUpdated: 'Изменены данные заказчика',
  packageEstimateUpdated: 'Изменена смета',
  packageStatusUpdated: 'Изменён статус пакета',
  packageTitleUpdated: 'Изменено название черновика',
  packageCrmContractUpdated: 'Изменён связанный договор CRM',
};

const VERSION_ACTION_LABELS: Record<
  NonNullable<ContractDocumentPackageVersionListItem['action']>,
  string
> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  ROLLBACK: 'Откат',
};

function formatPackageVersionDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPackageVersionKeyMomentItems(keyMoments: string[] | undefined): string[] {
  if (!Array.isArray(keyMoments) || keyMoments.length === 0) return ['—'];
  return keyMoments.map((key) => PACKAGE_VERSION_MOMENT_LABELS[key] ?? key);
}

function formatPackageVersionActor(v: ContractDocumentPackageVersionListItem): string {
  const u = v.savedBy;
  if (!u) return '—';
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const email = u.email?.trim();
  if (email) return email;
  return '—';
}

export type PackageEventsJournalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  versions: ContractDocumentPackageVersionListItem[];
  versionsBusy: boolean;
  onRefresh: () => void;
  contractNumberLabel?: string;
  contractDateLabel?: string | null;
};

export function PackageEventsJournalModal({
  isOpen,
  onClose,
  versions,
  versionsBusy,
  onRefresh,
  contractNumberLabel,
  contractDateLabel,
}: PackageEventsJournalModalProps) {
  const journalTitle = contractNumberLabel
    ? `Журнал событий договора №${contractNumberLabel}${contractDateLabel ? ` от ${contractDateLabel}` : ''}`
    : 'Журнал событий договора';

  const modalTitle = (
    <span className={`${crmDetailStyles.titleWithEdit} ${hubStyles.modalTitleRow}`}>
      <span>{journalTitle}</span>
      <button
        type="button"
        className={crmDetailStyles.historyBtn}
        title="Обновить список"
        aria-label="Обновить список"
        disabled={versionsBusy}
        onClick={() => onRefresh()}
      >
        <ArrowPathIcon
          className={`${crmDetailStyles.editIcon} ${versionsBusy ? styles.refreshSpinning : ''}`}
          aria-hidden
        />
      </button>
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      className={`${crmFormStyles.modalPanel} ${styles.journalPanel}`}
      showCloseButton
    >
      <div className={styles.shell} data-modal-form data-modal-density="compact">
        <p className={styles.subtitle}>
          Запись в журнал создаётся через 30 минут после последнего изменения данных пакета. Сразу
          фиксируются важные события: смена статуса, подписание Д/с, акты начала и закрытия работ.
        </p>

        {versionsBusy ? <p data-modal-form-hint>Загрузка журнала…</p> : null}
        {!versionsBusy && versions.length === 0 ? (
          <p data-modal-form-hint>Пока нет записей в журнале.</p>
        ) : null}

        {!versionsBusy && versions.length > 0 ? (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            {versions.map((v) => {
              const actionLabel = v.action ? VERSION_ACTION_LABELS[v.action] : null;
              const items = formatPackageVersionKeyMomentItems(v.keyMoments);
              return (
                <article key={v.id} className={styles.entry}>
                  <div className={styles.entryMeta}>
                    <time className={styles.entryDate} dateTime={v.createdAt}>
                      {formatPackageVersionDate(v.createdAt)}
                    </time>
                    <span className={styles.entryUser}>{formatPackageVersionActor(v)}</span>
                    {actionLabel ? (
                      <span
                        className={`${styles.entryAction} ${
                          v.action === 'ROLLBACK'
                            ? styles.actionRollback
                            : v.action === 'CREATE'
                              ? styles.actionCreate
                              : ''
                        }`}
                      >
                        {actionLabel}
                      </span>
                    ) : null}
                  </div>
                  <ul className={styles.eventList}>
                    {items.map((text, idx) => (
                      <li key={`${v.id}-${idx}`}>{text}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
