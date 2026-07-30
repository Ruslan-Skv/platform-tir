'use client';

import type { CrmDirection, Measurement } from '@/shared/api/admin-crm';
import { CallCustomerIcon } from '@/shared/ui/icons/crm/CallCustomerIcon';
import {
  crmPhoneToTelHref,
  formatCrmPhoneOrDash,
} from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';

import { getMeasurementStatusLabel } from '../shared/measurementStatuses';
import styles from './MeasurementsPage.module.css';
import type { MeasurementLinksInfo } from './measurements-page.types';
import { formatDate, formatUser } from './measurements-page.utils';

type MeasurementsListMobileCardsProps = {
  data: Measurement[];
  loading: boolean;
  directions: CrmDirection[];
  linksByMeasurementId: Record<string, MeasurementLinksInfo | undefined>;
  onOpen: (measurement: Measurement) => void;
};

function renderDirection(m: Measurement, directions: CrmDirection[]): string {
  const primary = m.direction?.name;
  const extra =
    m.additionalDirections?.map((d) => d.name).filter(Boolean) ??
    (m.additionalDirectionIds ?? [])
      .map((id) => directions.find((d) => d.id === id)?.name)
      .filter(Boolean);
  if (primary && extra.length > 0) return `${primary} (+${extra.join(', ')})`;
  if (primary) return primary;
  if (extra.length > 0) return extra.join(', ');
  return '—';
}

export function MeasurementsListMobileCards({
  data,
  loading,
  directions,
  linksByMeasurementId,
  onOpen,
}: MeasurementsListMobileCardsProps) {
  return (
    <div className={styles.mobileCards} aria-label="Список замеров">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>Нет замеров</p>
      ) : (
        data.map((m) => {
          const links = linksByMeasurementId[m.id];
          const phoneDisplay = m.customerPhone ? formatCrmPhoneOrDash(m.customerPhone) : null;
          const telHref = crmPhoneToTelHref(m.customerPhone);
          return (
            <article key={m.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <button type="button" className={styles.mobileCardOpen} onClick={() => onOpen(m)}>
                    <span className={styles.mobileCardName}>{m.customerName || 'Без ФИО'}</span>
                    {m.customerAddress ? (
                      <span className={styles.mobileCardMeta}>{m.customerAddress}</span>
                    ) : null}
                  </button>
                </div>
                <span className={`${styles.badge} ${styles[`status${m.status}`] ?? ''}`}>
                  {getMeasurementStatusLabel(m.status)}
                </span>
              </div>
              {telHref && phoneDisplay && phoneDisplay !== '—' ? (
                <div className={styles.mobileCardPhoneRow}>
                  <a
                    href={telHref}
                    className={styles.phoneLink}
                    aria-label={`Позвонить ${phoneDisplay}`}
                  >
                    {phoneDisplay}
                  </a>
                  <a
                    href={telHref}
                    className={styles.mobileCardCall}
                    aria-label={`Позвонить ${phoneDisplay}`}
                    title={`Позвонить ${phoneDisplay}`}
                  >
                    <CallCustomerIcon size={22} />
                  </a>
                </div>
              ) : phoneDisplay && phoneDisplay !== '—' ? (
                <span className={styles.mobileCardMeta}>{phoneDisplay}</span>
              ) : null}
              <button
                type="button"
                className={styles.mobileCardDetails}
                onClick={() => onOpen(m)}
                aria-label={`Открыть замер: ${m.customerName || 'без ФИО'}`}
              >
                <dl className={styles.mobileCardRows}>
                  <div className={styles.mobileCardRow}>
                    <dt>Дата</dt>
                    <dd>{formatDate(m.receptionDate)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Дата замера</dt>
                    <dd>{formatDate(m.executionDate)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Менеджер</dt>
                    <dd>{formatUser(m.manager)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Замерщик</dt>
                    <dd>{formatUser(m.surveyor)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Направление</dt>
                    <dd>{renderDirection(m, directions)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Связи</dt>
                    <dd>
                      {!links ? (
                        <span className={styles.muted}>Нет связанного расчёта</span>
                      ) : (
                        <>
                          <span className={styles.linkStateOk}>Расчёт создан</span>
                          {links.packageId ? (
                            <>
                              {' · '}
                              <span className={styles.linkStateDone}>Договор создан</span>
                            </>
                          ) : (
                            <>
                              {' · '}
                              <span className={styles.linkStatePending}>Договор не создан</span>
                            </>
                          )}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </button>
            </article>
          );
        })
      )}
    </div>
  );
}
