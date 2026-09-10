'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';

import { WaybillMobileCallControl } from '../shared/WaybillMobileCallControl';
import styles from '../shared/Waybills.module.css';
import {
  STATUS_LABELS,
  formatMoney,
  formatTimeRange,
  formatUserLabel,
  formatWaybillDateDisplay,
  isLateEdit,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import { WaybillTaskRowActions } from './WaybillTaskRowActions';

type WaybillsListMobileCardsProps = {
  data: WaybillTask[];
  loading: boolean;
  currentUserId: string | null;
  onEdit: (item: WaybillTask) => void;
  onComplete: (item: WaybillTask) => void;
  onFail: (item: WaybillTask) => void;
  onCopy: (item: WaybillTask) => void;
  onDelete: (item: WaybillTask) => void;
  onReopen: (item: WaybillTask) => void;
  onOpenAttachments: (item: WaybillTask) => void;
};

export function WaybillsListMobileCards({
  data,
  loading,
  currentUserId,
  onEdit,
  onComplete,
  onFail,
  onCopy,
  onDelete,
  onReopen,
  onOpenAttachments,
}: WaybillsListMobileCardsProps) {
  return (
    <div className={styles.mobileCards} aria-label="Список заданий путевого листа">
      {loading && data.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : data.length === 0 ? (
        <p className={styles.mobileEmpty}>На этот день заданий нет</p>
      ) : (
        data.map((item) => {
          const customer = resolveWaybillCustomerFields(item);
          return (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>
                    {formatWaybillDateDisplay(item.date)}
                    {item.direction ? ` · ${item.direction}` : ''}
                  </span>
                  <span className={styles.mobileCardMeta}>
                    {formatTimeRange(item.timeFrom, item.timeTo)}
                    {item.driver ? ` · ${formatUserLabel(item.driver)}` : ''}
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
                  <dd className={styles.mobileCardTask}>{customer.customerAddress || '—'}</dd>
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
                <div className={styles.mobileCardRow}>
                  <dt>Отв.</dt>
                  <dd>{formatUserLabel(item.responsible)}</dd>
                </div>
                {isLateEdit(item.date, item.updatedAt, item.createdAt) ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Правка</dt>
                    <dd>
                      <span className={styles.lateFlagInline}>после 08:00</span>
                    </dd>
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
                <WaybillTaskRowActions
                  item={item}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onComplete={onComplete}
                  onFail={onFail}
                  onCopy={onCopy}
                  onDelete={onDelete}
                  onReopen={onReopen}
                  onOpenAttachments={onOpenAttachments}
                />
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
