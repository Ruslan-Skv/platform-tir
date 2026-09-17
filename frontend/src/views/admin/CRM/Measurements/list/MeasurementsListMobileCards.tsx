'use client';

import type { CrmDirection, Measurement } from '@/shared/api/admin-crm';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CallCustomerIcon } from '@/shared/ui/icons/crm/CallCustomerIcon';
import {
  crmPhoneToTelHref,
  formatCrmPhoneOrDash,
} from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';

import {
  MyMeasurementSurveyorActions,
  canCompleteMyMeasurement,
} from '../my/MyMeasurementSurveyorActions';
import { getMeasurementStatusLabel } from '../shared/measurementStatuses';
import styles from './MeasurementsPage.module.css';
import type { MeasurementLinksInfo } from './measurements-page.types';
import { formatDate, formatUser } from './measurements-page.utils';

/** Скрепка «Фото замера» (как в таблице списков замеров). */
export function MeasurementPhotosIconButton({
  count,
  onClick,
  disabled = false,
}: {
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const label = count > 0 ? `Фото замера (${count})` : 'Фото замера — прикрепить';
  return (
    <AdminTableIconButton
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`${styles.photosIconButton} ${count > 0 ? styles.photosIconButtonActive : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      {count > 0 ? <span className={styles.photosCountBadge}>{count}</span> : null}
    </AdminTableIconButton>
  );
}

type MeasurementsListMobileCardsProps = {
  data: Measurement[];
  loading: boolean;
  directions: CrmDirection[];
  linksByMeasurementId: Record<string, MeasurementLinksInfo | undefined>;
  onOpen: (measurement: Measurement) => void;
  /** Только для «Мои замеры»: отметить выполненным. */
  onComplete?: (measurement: Measurement) => void;
  completeDisabled?: boolean;
  /** Открыть фото замера (модалка) прямо из карточки. */
  onOpenPhotos?: (measurement: Measurement) => void;
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

function MeasurementMobileCard({
  m,
  directions,
  linksByMeasurementId,
  onOpen,
  onComplete,
  completeDisabled,
  onOpenPhotos,
}: {
  m: Measurement;
  directions: CrmDirection[];
  linksByMeasurementId: Record<string, MeasurementLinksInfo | undefined>;
  onOpen: (measurement: Measurement) => void;
  onComplete?: (measurement: Measurement) => void;
  completeDisabled: boolean;
  onOpenPhotos?: (measurement: Measurement) => void;
}) {
  const links = linksByMeasurementId[m.id];
  const phoneDisplay = m.customerPhone ? formatCrmPhoneOrDash(m.customerPhone) : null;
  const telHref = crmPhoneToTelHref(m.customerPhone);
  const showComplete = Boolean(onComplete) && canCompleteMyMeasurement(m.status);

  return (
    <article className={styles.mobileCard}>
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
          <a href={telHref} className={styles.phoneLink} aria-label={`Позвонить ${phoneDisplay}`}>
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
            <dt>Желаемое время</dt>
            <dd>{m.preferredTime || '—'}</dd>
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
                  {links.estimateId ? (
                    <span className={styles.linkStateOk}>Расчёт создан</span>
                  ) : null}
                  {links.packageId ? (
                    <>
                      {links.estimateId ? ' · ' : null}
                      <span className={styles.linkStateDone}>
                        Договор создан{links.manual ? ' (вручную)' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      {links.estimateId ? ' · ' : null}
                      <span className={styles.linkStatePending}>Договор не создан</span>
                    </>
                  )}
                </>
              )}
            </dd>
          </div>
        </dl>
      </button>
      {showComplete || onOpenPhotos ? (
        <div className={styles.mobileCardActions}>
          {onOpenPhotos ? (
            <MeasurementPhotosIconButton
              count={(m.photoUrls ?? []).length}
              onClick={() => onOpenPhotos(m)}
            />
          ) : null}
          {showComplete ? (
            <MyMeasurementSurveyorActions
              item={m}
              onComplete={onComplete!}
              disabled={completeDisabled}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function MeasurementsListMobileCards({
  data,
  loading,
  directions,
  linksByMeasurementId,
  onOpen,
  onComplete,
  completeDisabled = false,
  onOpenPhotos,
}: MeasurementsListMobileCardsProps) {
  const groupByCompletion = Boolean(onComplete);
  const openItems = groupByCompletion
    ? data.filter((m) => canCompleteMyMeasurement(m.status))
    : data;
  const doneItems = groupByCompletion
    ? data.filter((m) => !canCompleteMyMeasurement(m.status))
    : [];

  return (
    <div className={styles.mobileCards} aria-label="Список замеров">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>Нет замеров</p>
      ) : groupByCompletion ? (
        <>
          {openItems.length > 0 ? (
            <section className={styles.mobileCardGroup} aria-label="Невыполненные замеры">
              <h2 className={styles.mobileCardGroupTitle}>Невыполненные</h2>
              {openItems.map((m) => (
                <MeasurementMobileCard
                  key={m.id}
                  m={m}
                  directions={directions}
                  linksByMeasurementId={linksByMeasurementId}
                  onOpen={onOpen}
                  onComplete={onComplete}
                  completeDisabled={completeDisabled}
                  onOpenPhotos={onOpenPhotos}
                />
              ))}
            </section>
          ) : null}
          {doneItems.length > 0 ? (
            <section className={styles.mobileCardGroup} aria-label="Выполненные замеры">
              <h2 className={styles.mobileCardGroupTitle}>Выполненные</h2>
              {doneItems.map((m) => (
                <MeasurementMobileCard
                  key={m.id}
                  m={m}
                  directions={directions}
                  linksByMeasurementId={linksByMeasurementId}
                  onOpen={onOpen}
                  onComplete={onComplete}
                  completeDisabled={completeDisabled}
                  onOpenPhotos={onOpenPhotos}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : (
        data.map((m) => (
          <MeasurementMobileCard
            key={m.id}
            m={m}
            directions={directions}
            linksByMeasurementId={linksByMeasurementId}
            onOpen={onOpen}
            completeDisabled={completeDisabled}
            onOpenPhotos={onOpenPhotos}
          />
        ))
      )}
    </div>
  );
}
