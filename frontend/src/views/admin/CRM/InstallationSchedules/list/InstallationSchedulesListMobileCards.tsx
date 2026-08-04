'use client';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { DIRECTION_LABELS } from '@/views/admin/CRM/Installers/installers-page.constants';
import { WaybillMobileCallControl } from '@/views/admin/CRM/Waybills/shared/WaybillMobileCallControl';

import styles from '../shared/InstallationSchedules.module.css';
import { STATUS_LABELS, formatDate, formatTime } from '../shared/installation-schedules';
import { InstallationScheduleRowActions } from './InstallationScheduleRowActions';

type Props = {
  data: InstallationSchedule[];
  loading: boolean;
  onEdit: (item: InstallationSchedule) => void;
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
          return (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>
                    {formatDate(item.date)} · {DIRECTION_LABELS[item.direction]}
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

              <WaybillMobileCallControl phones={phones} />

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
