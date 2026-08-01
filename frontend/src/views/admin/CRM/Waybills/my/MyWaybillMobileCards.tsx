'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';

import { WaybillMobileCallControl } from '../shared/WaybillMobileCallControl';
import styles from '../shared/Waybills.module.css';
import {
  STATUS_LABELS,
  formatMoney,
  formatTimeRange,
  formatUserLabel,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import { MyWaybillDriverActions } from './MyWaybillDriverActions';

type MyWaybillMobileCardsProps = {
  data: WaybillTask[];
  loading: boolean;
  submitting: boolean;
  onComplete: (item: WaybillTask) => void;
  onFail: (item: WaybillTask) => void;
};

export function MyWaybillMobileCards({
  data,
  loading,
  submitting,
  onComplete,
  onFail,
}: MyWaybillMobileCardsProps) {
  return (
    <div className={styles.mobileCards} aria-label="Мой маршрут">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>На выбранный период заданий нет</p>
      ) : (
        data.map((item) => {
          const customer = resolveWaybillCustomerFields(item);
          const mapsUrl = customer.customerAddress
            ? `https://yandex.ru/maps/?text=${encodeURIComponent(customer.customerAddress)}`
            : null;
          return (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>
                    {item.date.slice(0, 10)}
                    {item.direction ? ` · ${item.direction}` : ''}
                  </span>
                  <span className={styles.mobileCardMeta}>
                    {formatTimeRange(item.timeFrom, item.timeTo)}
                    {item.responsible ? ` · отв. ${formatUserLabel(item.responsible)}` : ''}
                  </span>
                </div>
                <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>

              <WaybillMobileCallControl phones={customer.customerPhones} />

              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Задание</dt>
                  <dd className={styles.mobileCardTask}>{item.taskText}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>ФИО</dt>
                  <dd>{customer.customerName || '—'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Адрес</dt>
                  <dd className={styles.mobileCardTask}>
                    {customer.customerAddress || '—'}
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
                <div className={styles.mobileCardRow}>
                  <dt>Телефон</dt>
                  <dd>
                    {customer.customerPhones.length > 0 ? customer.customerPhones.join(', ') : '—'}
                  </dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Доставка</dt>
                  <dd>{formatMoney(item.deliveryCost, item.deliveryPayer)}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Грузчики</dt>
                  <dd>{formatMoney(item.moversCost, item.moversPayer)}</dd>
                </div>
                {item.completionNote ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Коммент.</dt>
                    <dd>{item.completionNote}</dd>
                  </div>
                ) : null}
              </dl>

              {item.status === 'PLANNED' && !submitting ? (
                <div className={styles.mobileCardActions}>
                  <MyWaybillDriverActions item={item} onComplete={onComplete} onFail={onFail} />
                </div>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}
