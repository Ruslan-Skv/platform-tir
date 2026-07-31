'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';
import { Modal } from '@/shared/ui/Modal';

import { WaybillMobileCallControl } from '../shared/WaybillMobileCallControl';
import styles from '../shared/Waybills.module.css';
import {
  STATUS_LABELS,
  formatTimeRange,
  formatUserLabel,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import type { MyWaybillPageModel } from './hooks/useMyWaybillPage';

type MyWaybillPageViewProps = {
  model: MyWaybillPageModel;
};

export function MyWaybillPageView({ model }: MyWaybillPageViewProps) {
  const {
    date,
    setDate,
    tasks,
    loading,
    message,
    failItem,
    setFailItem,
    failNote,
    setFailNote,
    completeItem,
    setCompleteItem,
    completeNote,
    setCompleteNote,
    submitting,
    openCompleteModal,
    handleCompleteConfirm,
    handleFailConfirm,
  } = model;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Мой маршрут</h1>
          <span className={styles.count}>{tasks.length}</span>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.filterLabel}>
            Дата:
            <input
              className={styles.dateInput}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      <p className={styles.hint}>
        Ваши задания на выбранный день. После доставки отметьте «Выполнено» или укажите причину,
        если не удалось.
      </p>

      {message ? (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      ) : null}

      {loading ? <div className={styles.empty}>Загрузка…</div> : null}

      {!loading && tasks.length === 0 ? (
        <div className={styles.empty}>На этот день заданий нет</div>
      ) : null}

      <div className={styles.cards}>
        {tasks.map((item) => (
          <WaybillCard
            key={item.id}
            item={item}
            submitting={submitting}
            onComplete={() => openCompleteModal(item)}
            onFail={() => {
              setFailNote('');
              setFailItem(item);
            }}
          />
        ))}
      </div>

      <Modal
        isOpen={Boolean(completeItem)}
        onClose={() => setCompleteItem(null)}
        title="Подтвердить выполнение"
        size="md"
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Отметить задание как выполненное? При необходимости добавьте комментарий.
          </p>
          {completeItem ? (
            <p data-modal-form-hint>
              {formatTimeRange(completeItem.timeFrom, completeItem.timeTo)}
              {completeItem.direction ? ` · ${completeItem.direction}` : ''}
              <br />
              {completeItem.taskText}
            </p>
          ) : null}
          <div data-modal-form-group>
            <label htmlFor="my-complete-note">Комментарий</label>
            <textarea
              id="my-complete-note"
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              rows={3}
              placeholder="Например: накладная подписана, оплата получена…"
            />
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setCompleteItem(null)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => void handleCompleteConfirm()}
            >
              {submitting ? 'Сохранение…' : 'Выполнено'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(failItem)}
        onClose={() => setFailItem(null)}
        title="Не выполнено"
        size="md"
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <div data-modal-form-group>
            <label htmlFor="my-fail-note">Причина невыполнения *</label>
            <textarea
              id="my-fail-note"
              value={failNote}
              onChange={(e) => setFailNote(e.target.value)}
              rows={3}
              placeholder="Клиент не открыл, перенос на завтра…"
            />
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setFailItem(null)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => void handleFailConfirm()}
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function WaybillCard({
  item,
  submitting,
  onComplete,
  onFail,
}: {
  item: WaybillTask;
  submitting: boolean;
  onComplete: () => void;
  onFail: () => void;
}) {
  const customer = resolveWaybillCustomerFields(item);
  const mapsUrl = customer.customerAddress
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(customer.customerAddress)}`
    : null;

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTime}>{formatTimeRange(item.timeFrom, item.timeTo)}</div>
          <div className={styles.cardMeta}>
            {item.direction || 'Без направления'}
            {item.responsible ? ` · отв. ${formatUserLabel(item.responsible)}` : ''}
          </div>
        </div>
        <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div>
          <strong>Задание</strong>
          <div>{item.taskText}</div>
        </div>
        {customer.customerName || customer.customerAddress || customer.customerPhones.length > 0 ? (
          <div>
            <strong>Заказчик</strong>
            <dl className={styles.mobileCardRows}>
              <div className={styles.mobileCardRow}>
                <dt>ФИО</dt>
                <dd>{customer.customerName || '—'}</dd>
              </div>
              <div className={styles.mobileCardRow}>
                <dt>Адрес</dt>
                <dd>{customer.customerAddress || '—'}</dd>
              </div>
              <div className={styles.mobileCardRow}>
                <dt>Телефон</dt>
                <dd>
                  {customer.customerPhones.length > 0 ? customer.customerPhones.join(', ') : '—'}
                </dd>
              </div>
            </dl>
            <WaybillMobileCallControl phones={customer.customerPhones} />
            {mapsUrl ? (
              <div className={styles.cardLinks}>
                <a className={styles.mapLink} href={mapsUrl} target="_blank" rel="noreferrer">
                  На карте
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
        {item.completionNote ? (
          <div className={styles.cardMeta}>Комментарий: {item.completionNote}</div>
        ) : null}
      </div>

      {item.status === 'PLANNED' ? (
        <div className={styles.cardActions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            disabled={submitting}
            onClick={onComplete}
          >
            Выполнено
          </button>
          <button
            data-admin-mutation
            type="button"
            className={styles.failButton}
            disabled={submitting}
            onClick={onFail}
          >
            Не выполнено
          </button>
        </div>
      ) : null}
    </article>
  );
}
