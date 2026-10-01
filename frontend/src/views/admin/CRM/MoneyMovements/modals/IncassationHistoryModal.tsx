'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  ManagerIncassation,
  ManagerIncassationUpdateParams,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import styles from '@/views/admin/CRM/Customers/modals/CrmCustomerTrashModal.module.css';

import { formatDpDate, formatDpMoney, formatDpTime } from '../money-movements-page.constants';

const PAGE_SIZE = 15;

function formatDateTimeLocale(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

type IncassationHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  incassations: ManagerIncassation[];
  /** true — текущий пользователь супер-админ: доступны правка и аннулирование записей. */
  canManage: boolean;
  saving: boolean;
  onUpdate: (id: string, params: ManagerIncassationUpdateParams) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/** История инкассаций менеджеров — открывается кнопкой-иконкой рядом с «+ Инкассация». */
export function IncassationHistoryModal({
  open,
  onClose,
  incassations,
  canManage,
  saving,
  onUpdate,
  onDelete,
}: IncassationHistoryModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  // Правка строки (супер-админ): id записи и её редактируемые поля.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [incassator, setIncassator] = useState('');
  const [notes, setNotes] = useState('');
  // Аннулирование: id записи, ожидающей подтверждения.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Закрытие модалки — чистое состояние поиска и правки.
  useEffect(() => {
    if (open) return;
    setSearchInput('');
    setPage(1);
    setEditingId(null);
    setConfirmDeleteId(null);
    setError(null);
  }, [open]);

  // Новый поисковый запрос — с первой страницы.
  useEffect(() => {
    setPage(1);
  }, [searchInput]);

  const term = searchInput.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!term) return incassations;
    return incassations.filter((row) =>
      [row.manager?.name, row.submitter?.name, row.incassator, row.notes, row.amount]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [incassations, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // После аннулирования записей страница могла стать больше последней.
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const startEdit = (row: ManagerIncassation) => {
    setConfirmDeleteId(null);
    setError(null);
    setEditingId(row.id);
    setAmount(row.amount);
    setIncassator(row.incassator);
    setNotes(row.notes ?? '');
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const amountNumber = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму инкассации (положительное число)');
      return;
    }
    if (incassator.trim().length < 2) {
      setError('Укажите ФИО лица, производившего инкассацию');
      return;
    }
    setError(null);
    try {
      await onUpdate(editingId, {
        amount: amountNumber,
        incassator: incassator.trim(),
        notes: notes.trim(),
      });
      setEditingId(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Не удалось сохранить правку инкассации'
      );
    }
  };

  const submitDelete = async () => {
    if (!confirmDeleteId) return;
    setError(null);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
      setEditingId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Не удалось аннулировать инкассацию'
      );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="История инкассаций"
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.trashPanel}`}
      contentClassName={styles.contentBody}
      showCloseButton
    >
      <form
        className={`${panelStyles.formShell} ${styles.shell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => {
          e.preventDefault();
          // Enter в полях правки сохраняет инкассацию; поиск фильтруется по мере ввода.
          void submitEdit();
        }}
      >
        <div className={styles.searchRow} data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="incassation-history-search">Поиск в истории</label>
            <input
              id="incassation-history-search"
              type="search"
              placeholder="Менеджер, ФИО инкассатора, примечание…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div data-modal-form-group className={styles.searchBtnWrap}>
            <span className={styles.searchBtnLabel} aria-hidden>
              &nbsp;
            </span>
            <button type="submit" data-modal-btn="primary" className={styles.searchBtn}>
              Найти
            </button>
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}
        {incassations.length === 0 ? <p data-modal-form-hint>Инкассаций пока не было</p> : null}
        {incassations.length > 0 && filtered.length === 0 ? (
          <p data-modal-form-hint>Ничего не найдено</p>
        ) : null}

        {rows.length > 0 ? (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            {rows.map((row) =>
              editingId === row.id ? (
                <article key={row.id} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <div className={styles.entryMeta}>
                      <span className={styles.entryName}>
                        {`${formatDpDate(row.performedAt)} · ${formatDpTime(row.performedAt)} · ${formatDpMoney(row.amount)}`}
                      </span>
                      <div className={panelStyles.personNameRow} data-modal-form-grid>
                        <div data-modal-form-group>
                          <label htmlFor={`incassation-amount-${row.id}`}>Сумма, ₽</label>
                          <input
                            id={`incassation-amount-${row.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={saving}
                          />
                        </div>
                        <div data-modal-form-group>
                          <label htmlFor={`incassation-incassator-${row.id}`}>
                            ФИО инкассатора
                          </label>
                          <input
                            id={`incassation-incassator-${row.id}`}
                            type="text"
                            value={incassator}
                            onChange={(e) => setIncassator(e.target.value)}
                            disabled={saving}
                            maxLength={500}
                          />
                        </div>
                        <div data-modal-form-group>
                          <label htmlFor={`incassation-notes-${row.id}`}>Примечание</label>
                          <input
                            id={`incassation-notes-${row.id}`}
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={saving}
                            maxLength={1000}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.entryActions}>
                      <button
                        data-admin-mutation
                        type="button"
                        data-modal-btn="primary"
                        onClick={() => void submitEdit()}
                        disabled={saving}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <article key={row.id} className={styles.entry}>
                  <div className={styles.entryMain}>
                    <div className={styles.entryMeta}>
                      <span className={styles.entryName}>
                        {`${formatDpDate(row.performedAt)} · ${formatDpTime(row.performedAt)} · ${formatDpMoney(row.amount)}`}
                      </span>
                      {row.cashBalanceAfter != null ? (
                        <span className={styles.entrySub}>
                          {`Остаток в кассе после инкассации: ${formatDpMoney(row.cashBalanceAfter)}`}
                        </span>
                      ) : null}
                      <span className={styles.entrySub}>
                        {`Менеджер: ${row.manager?.name ?? '—'}${
                          row.submitter ? ` · сдал: ${row.submitter.name}` : ''
                        }`}
                      </span>
                      <span className={styles.entrySub}>{`Инкассатор: ${row.incassator}`}</span>
                      <span className={styles.entrySub}>{`Примечание: ${row.notes ?? '—'}`}</span>
                      <span className={styles.entryDeleted}>
                        {`Создана: ${formatDateTimeLocale(row.createdAt)}`}
                      </span>
                    </div>
                    {canManage ? (
                      <div className={styles.entryActions}>
                        {confirmDeleteId === row.id ? (
                          <>
                            <span className={styles.entrySub}>Аннулировать?</span>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => void submitDelete()}
                              disabled={saving}
                            >
                              Да
                            </button>
                            <button
                              type="button"
                              data-modal-btn="secondary"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={saving}
                            >
                              Нет
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.restoreBtn}
                              onClick={() => startEdit(row)}
                              disabled={saving || confirmDeleteId !== null}
                            >
                              Изменить
                            </button>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => setConfirmDeleteId(row.id)}
                              disabled={saving || editingId !== null}
                            >
                              Аннулировать
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        ) : null}

        {filtered.length > PAGE_SIZE ? (
          <div className={styles.pagination}>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span className={styles.pageInfo}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </button>
          </div>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Инкассация — сдача наличных из кассы менеджера; остаток в карточке — касса на момент
            сразу после сдачи, текущий остаток кассы считается с момента последней инкассации.{' '}
            {canManage
              ? 'Правка и аннулирование сразу пересчитывают остатки касс менеджеров.'
              : 'Править и аннулировать записи может только супер-администратор.'}
          </span>
        </div>
      </form>
    </Modal>
  );
}
