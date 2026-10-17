'use client';

import { useRef, useState } from 'react';

import {
  type BankCode,
  type ParsedStatementEntry,
  type StatementImportEntryInput,
  applyBankStatement,
  parseBankStatement,
} from '@/shared/api/accounting/admin-bank-entries';
import { Modal } from '@/shared/ui/Modal';

import { formatDateRu, formatMoneyRub } from '../accounting-invoices-page.utils';
import styles from './BankPage.module.css';
import { BANK_ENTRY_TYPE_OPTIONS } from './bank-page.constants';

type BankImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Вызывается после успешного импорта с итоговым сообщением для страницы. */
  onImported: (message: string) => void;
};

/**
 * Модалка импорта банковской выписки: файл xlsx распознаётся на сервере,
 * строки показываются превью (способ оплаты можно поправить), выбранные
 * вносятся в раздел «Банк». Дубли (та же дата + сумма) пропускаются.
 */
export function BankImportModal({ isOpen, onClose, onImported }: BankImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bank, setBank] = useState<BankCode>('SBER');
  const [entries, setEntries] = useState<ParsedStatementEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEntries([]);
    setSelected(new Set());
    setBank('SBER');
    setFileName(null);
    setError(null);
    setParsing(false);
    setApplying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (parsing || applying) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setEntries([]);
    setSelected(new Set());
    try {
      const statement = await parseBankStatement(file);
      setBank(statement.bank);
      setFileName(file.name);
      setEntries(statement.entries);
      setSelected(new Set(statement.entries.map((_, index) => index)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось распознать файл выписки');
      setFileName(null);
    } finally {
      setParsing(false);
    }
  };

  const toggleRow = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === entries.length ? new Set() : new Set(entries.map((_, i) => i))
    );
  };

  const updateEntryType = (index: number, entryType: ParsedStatementEntry['entryType']) => {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, entryType } : entry)));
  };

  const handleApply = async () => {
    if (selected.size === 0) {
      setError('Отметьте хотя бы одну строку');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const payload: StatementImportEntryInput[] = entries
        .filter((_, index) => selected.has(index))
        .map((entry) => ({
          entryDate: entry.entryDate,
          entryType: entry.entryType,
          amount: entry.amount,
          fee: entry.fee,
          refund: entry.refund,
          counterparty: entry.counterparty ?? undefined,
          notes: entry.notes ?? undefined,
        }));
      const result = await applyBankStatement(bank, payload);
      reset();
      onClose();
      const skipped =
        result.skippedDuplicates > 0 ? `, пропущено дублей: ${result.skippedDuplicates}` : '';
      onImported(`Импортировано записей: ${result.created}${skipped}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось внести строки выписки');
    } finally {
      setApplying(false);
    }
  };

  const selectedSum = entries
    .filter((_, index) => selected.has(index))
    .reduce((sum, entry) => sum + entry.amount + entry.fee + entry.refund, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Импорт банковской выписки"
      size="lg"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint>
          Загрузите xlsx-выписку Сбербизнеса или Альфа-Банка — банк определяется автоматически,
          операции распознаются: дата, зачисление, комиссия, возврат и контрагент. Перед внесением
          проверьте способ оплаты; повторная загрузка той же выписки не задвоит записи.
        </p>

        <div className={styles.importFileRow}>
          <input
            ref={fileInputRef}
            id="bank_import_file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            disabled={parsing || applying}
          />
          {parsing ? <span className={styles.importStatus}>Распознавание…</span> : null}
          {fileName && !parsing ? (
            <span className={styles.importStatus}>
              {fileName} · {bank === 'ALFA' ? 'Альфа-Банк' : 'Сбербанк'} · записей: {entries.length}
            </span>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div className={styles.importTableWrap}>
            <table className={styles.importTable}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === entries.length}
                      onChange={toggleAll}
                      disabled={applying}
                      aria-label="Выбрать все строки"
                    />
                  </th>
                  <th>Дата</th>
                  <th>Контрагент</th>
                  <th>Способ оплаты</th>
                  <th>Зачислено</th>
                  <th>Комиссия</th>
                  <th>Возврат</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={`${entry.entryDate}-${entry.docNumber ?? index}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(index)}
                        onChange={() => toggleRow(index)}
                        disabled={applying}
                        aria-label={`Выбрать запись от ${entry.entryDate}`}
                      />
                    </td>
                    <td>{formatDateRu(entry.entryDate)}</td>
                    <td className={styles.importCounterpartyCell}>
                      {entry.counterparty || '—'}
                      {entry.notes ? (
                        <span className={styles.importNotesSubline}>{entry.notes}</span>
                      ) : null}
                    </td>
                    <td>
                      <select
                        value={entry.entryType}
                        onChange={(e) =>
                          updateEntryType(
                            index,
                            e.target.value as ParsedStatementEntry['entryType']
                          )
                        }
                        disabled={applying}
                        aria-label="Способ оплаты"
                      >
                        {BANK_ENTRY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatMoneyRub(String(entry.amount))}</td>
                    <td>{entry.fee > 0 ? formatMoneyRub(String(entry.fee)) : '—'}</td>
                    <td>{entry.refund > 0 ? formatMoneyRub(String(entry.refund)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="secondary"
            onClick={handleClose}
            disabled={parsing || applying}
          >
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={() => void handleApply()}
            disabled={parsing || applying || entries.length === 0}
          >
            {applying
              ? 'Импорт…'
              : `Импортировать${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>

        {selected.size > 0 ? (
          <p className={styles.importTotalHint}>
            Выбрано строк: {selected.size} · итого к зачислению с комиссией и возвратами:{' '}
            <strong>
              {selectedSum.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ₽
            </strong>
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
