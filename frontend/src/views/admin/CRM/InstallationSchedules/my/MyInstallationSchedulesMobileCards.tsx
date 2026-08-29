'use client';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { DIRECTION_LABELS } from '@/views/admin/CRM/Installers/installers-page.constants';
import { WaybillMobileCallControl } from '@/views/admin/CRM/Waybills/shared/WaybillMobileCallControl';

import styles from '../shared/InstallationSchedules.module.css';
import { STATUS_LABELS, formatDateRange, formatTime } from '../shared/installation-schedules';
import { MyInstallationScheduleActions } from './MyInstallationScheduleActions';

type Props = {
  data: InstallationSchedule[];
  loading: boolean;
  submitting: boolean;
  onComplete: (item: InstallationSchedule) => void;
  onFail: (item: InstallationSchedule) => void;
};

export function MyInstallationSchedulesMobileCards({
  data,
  loading,
  submitting,
  onComplete,
  onFail,
}: Props) {
  return (
    <div className={styles.mobileCards} aria-label="Мои монтажи">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>На выбранный период монтажей нет</p>
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
          const mapsUrl = item.customerAddress
            ? `https://yandex.ru/maps/?text=${encodeURIComponent(item.customerAddress)}`
            : null;
          return (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>
                    {formatDateRange(item)} · {DIRECTION_LABELS[item.direction]}
                  </span>
                  <span className={styles.mobileCardMeta}>{formatTime(item)}</span>
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
                  <dd className={styles.mobileCardTask}>
                    {item.customerAddress || '—'}
                    {mapsUrl ? (
                      <>
                        {' '}
                        <a
                          className={styles.mapLink}
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          На карте
                        </a>
                      </>
                    ) : null}
                  </dd>
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
                <div className={styles.mobileCardRow}>
                  <dt>Телефон</dt>
                  <dd>{phones.length > 0 ? phones.join(', ') : '—'}</dd>
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

              {item.status === 'PLANNED' && !submitting ? (
                <div className={styles.mobileCardActions}>
                  <MyInstallationScheduleActions
                    item={item}
                    onComplete={onComplete}
                    onFail={onFail}
                  />
                </div>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}
