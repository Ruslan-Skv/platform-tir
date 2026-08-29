'use client';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { DIRECTION_LABELS } from '@/views/admin/CRM/Installers/installers-page.constants';
import { WaybillMobileCallControl } from '@/views/admin/CRM/Waybills/shared/WaybillMobileCallControl';

import styles from '../shared/InstallationSchedules.module.css';
import { STATUS_LABELS, formatDateRange, formatTime } from '../shared/installation-schedules';
import { InstallationScheduleRowActions } from './InstallationScheduleRowActions';

type Props = {
  data: InstallationSchedule[];
  loading: boolean;
  onEdit: (item: InstallationSchedule) => void;
  onOpenWorkOrders: (item: InstallationSchedule) => void;
  onShare: (item: InstallationSchedule) => void;
  onComplete: (item: InstallationSchedule) => void;
  onFail: (item: InstallationSchedule) => void;
  onReschedule: (item: InstallationSchedule) => void;
  onDelete: (item: InstallationSchedule) => void;
  onReopen: (item: InstallationSchedule) => void;
};

export function InstallationSchedulesListMobileCards({
  data,
  loading,
  onEdit,
  onOpenWorkOrders,
  onShare,
  onComplete,
  onFail,
  onReschedule,
  onDelete,
  onReopen,
}: Props) {
  return (
    <div className={styles.mobileCards} aria-label="Список монтажей">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>В выбранный период монтажей нет</p>
      ) : (
        data.map((item) => {
          const phones =
            item.customerPhones?.length > 0
              ? item.customerPhones
              : item.customerPhone
                ? [item.customerPhone]
                : [];
          const contactPhones = item.contactPersons?.flatMap((person) => person.phones ?? []) ?? [];
          const allPhones = [...phones, ...contactPhones];
          return (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>
                    {formatDateRange(item)} · {DIRECTION_LABELS[item.direction]}
                  </span>
                  <span className={styles.mobileCardMeta}>
                    {formatTime(item)}
                    {item.installerName ? ` · ${item.installerName}` : ''}
                  </span>
                </div>
                <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              <WaybillMobileCallControl phones={allPhones} />

              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Договор</dt>
                  <dd>{item.contractNumber || '—'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Заказ-наряд</dt>
                  <dd className={styles.mobileCardTask}>{item.workOrderLabel || '—'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>ФИО</dt>
                  <dd>{item.customerName || '—'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Адрес</dt>
                  <dd className={styles.mobileCardTask}>{item.customerAddress || '—'}</dd>
                </div>
                {item.contactPersons?.length
                  ? item.contactPersons.map((person, index) => (
                      <div className={styles.mobileCardRow} key={`${person.name}-${index}`}>
                        <dt>Контакт</dt>
                        <dd className={styles.mobileCardTask}>
                          {[person.name, ...(person.phones ?? [])].filter(Boolean).join(' · ') ||
                            '—'}
                        </dd>
                      </div>
                    ))
                  : null}
                {item.orderInfo ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Заказ</dt>
                    <dd className={styles.mobileCardTask}>{item.orderInfo}</dd>
                  </div>
                ) : null}
                {item.note ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Примеч.</dt>
                    <dd>{item.note}</dd>
                  </div>
                ) : null}
                {item.completionNote ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Коммент.</dt>
                    <dd>{item.completionNote}</dd>
                  </div>
                ) : null}
              </dl>

              <div className={styles.mobileCardActions}>
                <InstallationScheduleRowActions
                  item={item}
                  onEdit={onEdit}
                  onOpenWorkOrders={onOpenWorkOrders}
                  onShare={onShare}
                  onComplete={onComplete}
                  onFail={onFail}
                  onReschedule={onReschedule}
                  onDelete={onDelete}
                  onReopen={onReopen}
                />
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
