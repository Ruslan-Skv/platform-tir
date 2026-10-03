'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  ReconciliationEntry,
  ReconciliationMovement,
} from '@/shared/api/accounting/admin-bank-reconciliation';
import { Modal } from '@/shared/ui/Modal';

import { formatDateRu, formatMoneyRub } from '../../accounting-invoices-page.utils';
import { BANK_ENTRY_TYPE_LABELS, BANK_LABELS } from '../bank-page.constants';
import styles from './Reconciliation.module.css';

type MatchEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entry: ReconciliationEntry | null;
  /** Непокрытые оплаты того же способа (кандидаты на привязку). */
  candidates: ReconciliationMovement[];
  busy: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onLink: (bankEntryId: string, movementIds: string[]) => void;
  onUnlink: (linkId: string) => void;
  onUnlinkAll: (bankEntryId: string) => void;
};

/**
 * Модалка сопоставления поступления: зафиксированные оплаты (с возможностью
 * отвязки), предложение автоматики и ручной выбор кандидатов-оплат.
 */
export function MatchEntryModal({
  isOpen,
  onClose,
  entry,
  candidates,
  busy,
  canEdit,
  canDelete,
  onLink,
  onUnlink,
  onUnlinkAll,
}: MatchEntryModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Предложение автоматики выбрано по умолчанию при открытии.
  useEffect(() => {
    if (!isOpen || !entry) return;
    setSearch('');
    setSelected(new Set(entry.suggestion ? entry.suggestion.movements.map((m) => m.id) : []));
  }, [isOpen, entry]);

  const remaining = entry ? Number(entry.remainingAmount) : 0;

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((m) =>
      [m.paymentDate, m.customerName, m.managerName, m.contractNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [candidates, search]);

  const selectedSum = useMemo(
    () =>
      candidates
        .filter((m) => selected.has(m.id))
        .reduce((acc, m) => acc + Math.min(Number(m.amount), Number(m.remainder)), 0),
    [candidates, selected]
  );

  const over = selectedSum > remaining + 0.005;
  // Расхождение (например, из-за округления) не блокирует сверку: зафиксируется
  // доступный остаток зачисления, а разница сохранится пометкой в связи.
  const overAmount = over ? selectedSum - remaining : 0;
  const cappedSum = over ? remaining : selectedSum;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Сопоставление поступления — ${formatDateRu(entry.entryDate)}, ${BANK_LABELS[entry.bank]}, ${formatMoneyRub(entry.total)}`}
      size="lg"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form>
        <p data-modal-form-hint>
          {BANK_ENTRY_TYPE_LABELS[entry.entryType]} · Зачислено {formatMoneyRub(entry.amount)}
          {Number(entry.fee) > 0 ? ` · комиссия ${formatMoneyRub(entry.fee)}` : ''}
          {Number(entry.refund) > 0 ? ` · возврат ${formatMoneyRub(entry.refund)}` : ''}.
          Зафиксированные суммы не участвуют в дальнейших сверках.
        </p>

        {entry.links.length > 0 ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Зафиксировано ({formatMoneyRub(entry.coveredAmount)} из {formatMoneyRub(entry.total)})
              {canDelete ? (
                <button
                  type="button"
                  className={styles.dangerLinkBtn}
                  disabled={busy}
                  onClick={() => onUnlinkAll(entry.id)}
                >
                  Снять всю фиксацию
                </button>
              ) : null}
            </div>
            <ul className={styles.movementList}>
              {entry.links.map((link) => (
                <li key={link.id} className={styles.movementRow}>
                  <span className={styles.movementDate}>
                    {formatDateRu(link.moneyMovement.paymentDate)}
                  </span>
                  <span className={styles.movementTitle}>
                    {link.moneyMovement.managerName || '—'}
                    {link.moneyMovement.contractNumber
                      ? ` · №${link.moneyMovement.contractNumber}`
                      : ''}
                    {link.moneyMovement.customerName ? ` · ${link.moneyMovement.customerName}` : ''}
                  </span>
                  {link.moneyMovement.executorName ? (
                    <span className={styles.movementExecutor}>
                      {link.moneyMovement.executorName}
                    </span>
                  ) : null}
                  <span className={styles.movementAmount}>{formatMoneyRub(link.amount)}</span>
                  {link.note ? <span className={styles.linkNote}>{link.note}</span> : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className={styles.unLinkBtn}
                      disabled={busy}
                      onClick={() => onUnlink(link.id)}
                      title="Снять фиксацию этой оплаты (супер-админ)"
                      aria-label="Снять фиксацию оплаты"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {remaining > 0.005 && canEdit ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Непокрытые оплаты для привязки
              <span className={styles.sectionHint}>
                Остаток зачисления: <strong>{formatMoneyRub(entry.remainingAmount)}</strong>
              </span>
            </div>
            {entry.suggestion ? (
              <p className={styles.suggestionHint}>
                Автоматика предлагает (
                {entry.suggestion.reason === 'exact'
                  ? 'точное совпадение суммы'
                  : entry.suggestion.reason === 'day'
                    ? 'все оплаты одного дня'
                    : 'все оплаты за окно зачисления'}
                ): {formatMoneyRub(entry.suggestion.amount)} — выбраны по умолчанию.
                {entry.suggestion.mismatchAmount && Number(entry.suggestion.mismatchAmount) > 0 ? (
                  <span className={styles.overWarn}>
                    {' '}
                    Расхождение {formatMoneyRub(entry.suggestion.mismatchAmount)} (округление):
                    зафиксируется {formatMoneyRub(entry.remainingAmount)} с пометкой о разнице.
                  </span>
                ) : null}
              </p>
            ) : null}
            <input
              type="search"
              className={styles.candidateSearch}
              placeholder="Поиск: дата, заказчик, менеджер, № договора…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={busy}
              aria-label="Поиск оплат для привязки"
            />
            {filteredCandidates.length === 0 ? (
              <p className={styles.emptyHint}>
                Непокрытых оплат этого способа за период не найдено — расхождение требует проверки
                вручную.
              </p>
            ) : (
              <ul className={styles.movementList}>
                {filteredCandidates.map((movement) => (
                  <li key={movement.id} className={styles.movementRow}>
                    <label className={styles.candidateLabel}>
                      <input
                        type="checkbox"
                        checked={selected.has(movement.id)}
                        onChange={() => toggle(movement.id)}
                        disabled={busy}
                      />
                      <span className={styles.movementDate}>
                        {formatDateRu(movement.paymentDate)}
                      </span>
                      <span className={styles.movementTitle}>
                        {movement.managerName || '—'}
                        {movement.contractNumber ? ` · №${movement.contractNumber}` : ''}
                        {movement.customerName ? ` · ${movement.customerName}` : ''}
                      </span>
                      {movement.executorName ? (
                        <span className={styles.movementExecutor}>{movement.executorName}</span>
                      ) : null}
                      <span className={styles.movementAmount}>
                        {formatMoneyRub(
                          String(Math.min(Number(movement.amount), Number(movement.remainder)))
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.selectionRow}>
              <span>
                Выбрано: <strong>{formatMoneyRub(String(selectedSum))}</strong>
                {over ? (
                  <span className={styles.overWarn}>
                    {' '}
                    — расхождение {formatMoneyRub(String(overAmount))}: будет зафиксировано{' '}
                    {formatMoneyRub(String(cappedSum))} с пометкой о разнице
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                data-admin-mutation
                data-modal-btn="primary"
                disabled={busy || selected.size === 0}
                onClick={() => onLink(entry.id, [...selected])}
              >
                {busy ? 'Фиксация…' : 'Зафиксировать сверку'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
