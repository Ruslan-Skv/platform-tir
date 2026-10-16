'use client';

import { useEffect, useMemo, useState } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';
import {
  type InstallerAdvancePackageBalance,
  type InstallerAdvanceSheetDetail,
  type InstallerAdvanceSheetItemParams,
  getInstallerAdvancePackageBalance,
} from '@/shared/api/crm/admin-installer-advance-sheets';
import modalStyles from '@/shared/ui/Modal/Modal.module.css';
import {
  PackageOrderSearch,
  packageSearchLabel,
} from '@/views/admin/CRM/shared/PackageOrderSearch';

import styles from './InstallerAdvanceSheets.module.css';
import { formatIasGradeShort, formatIasMoney } from './installer-advance-sheets-page.constants';

type FormRow = {
  key: string;
  /** Выбранный договор. */
  packageId: string;
  /** Подпись договора (№ + заказчик) в таблице строк. */
  label: string;
  amount: string;
};

type FormValues = {
  installerId: string;
  note?: string;
  items: InstallerAdvanceSheetItemParams[];
};

/** Сумма из поля строки (запятая → точка); NaN — не заполнена. */
function parseRowAmount(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

/**
 * Остаток з/п мастера по выбранному договору: «начислено − выдано» как в
 * «Расчёте мастеров». После ввода суммы аванса показывает остаток после
 * его выдачи (в т.ч. переплату — красным).
 */
function RowBalanceHint({
  installerId,
  packageId,
  amount,
}: {
  installerId: string;
  packageId: string;
  amount: string;
}) {
  const [balance, setBalance] = useState<InstallerAdvancePackageBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!installerId || !packageId) {
      setBalance(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getInstallerAdvancePackageBalance(packageId, installerId)
      .then((data) => {
        if (!cancelled) {
          setBalance(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [installerId, packageId]);

  if (!installerId || !packageId) return null;
  if (loading && !balance) {
    return (
      <span className={`${styles.rowBalance} ${styles.rowBalanceMuted}`}>остаток: загрузка…</span>
    );
  }
  if (failed) {
    return (
      <span className={`${styles.rowBalance} ${styles.rowBalanceMuted}`}>остаток недоступен</span>
    );
  }
  if (!balance) return null;

  if (!balance.hasAccruals) {
    return (
      <span
        className={`${styles.rowBalance} ${styles.rowBalanceMuted}`}
        title="Назначьте мастера на строки итоговой сметы в модалке «Заказ-наряды» договора"
      >
        мастер не назначен в заказ-наряде — остаток неизвестен
      </span>
    );
  }

  const amountNumber = parseRowAmount(amount);
  const amountEntered = amount.trim() !== '' && Number.isFinite(amountNumber);
  const remaining =
    balance.balance != null && amountEntered ? balance.balance - amountNumber : null;

  if (remaining != null && remaining < 0) {
    return (
      <span className={`${styles.rowBalance} ${styles.rowBalanceOver}`}>
        переплата после аванса: {formatIasMoney(Math.abs(remaining))}
      </span>
    );
  }

  return (
    <span className={styles.rowBalance}>
      {remaining != null ? (
        <>
          <strong>после аванса: {formatIasMoney(remaining)}</strong>
          <span className={styles.rowBalanceDetails}>
            {' '}
            (сейчас {formatIasMoney(balance.balance)})
          </span>
        </>
      ) : (
        <>
          <strong>остаток: {formatIasMoney(balance.balance)}</strong>
          <span className={styles.rowBalanceDetails}>
            {' '}
            начислено {formatIasMoney(balance.accrued)} · выдано {formatIasMoney(balance.paid)}
          </span>
        </>
      )}
    </span>
  );
}

let rowKeySeq = 0;
function nextRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

/**
 * Форма ведомости: мастер + единая панель «Поиск заказа», добавляющая выбранного
 * договор строкой в таблицу (договор → сумма → остаток з/п после аванса).
 * В режиме редактирования выплаченные строки показаны замороженными и не
 * отправляются на бэкенд.
 */
export function InstallerAdvanceSheetForm({
  mode,
  installers,
  sheet,
  submitting,
  onSubmit,
  onCancel,
  cancelHref,
}: {
  /** Режим редактирования показывает выплаченные строки замороженными. */
  mode: 'create' | 'edit';
  installers: InstallerMaster[];
  /** Ведомость для редактирования; null/undefined — создание. */
  sheet?: InstallerAdvanceSheetDetail | null;
  submitting: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
  cancelHref?: string;
}) {
  const [installerId, setInstallerId] = useState(sheet?.installer.id ?? '');
  const [note, setNote] = useState(sheet?.note ?? '');
  const [rows, setRows] = useState<FormRow[]>(() => {
    if (!sheet) return [];
    // Редактирование: невыплатенные строки — в таблицу, выплаченные — замороженными.
    return sheet.items
      .filter((item) => item.status !== 'PAID')
      .map((item) => ({
        key: nextRowKey(),
        packageId: item.packageId,
        label:
          [item.contractNumber, item.customerName].filter(Boolean).join(' — ') ||
          'Договор без номера',
        amount: item.amount,
      }));
  });
  const [error, setError] = useState<string | null>(null);
  /** Ошибка добавления договора панелью поиска (дубликат в таблице). */
  const [panelError, setPanelError] = useState<string | null>(null);
  /** Текст единой панели поиска; после выбора договора сбрасывается. */
  const [panelSearchValue, setPanelSearchValue] = useState('');

  /** Мастера нельзя менять, пока в ведомости есть выданные строки. */
  const hasPaidItems = (sheet?.items ?? []).some((item) => item.status === 'PAID');
  const paidRows = useMemo(
    () => (sheet?.items ?? []).filter((item) => item.status === 'PAID'),
    [sheet]
  );

  const totalAmount = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const value = parseRowAmount(row.amount);
        return sum + (Number.isFinite(value) && value > 0 ? value : 0);
      }, 0),
    [rows]
  );

  /** Выбранный в панели договор становится строкой таблицы; панель освобождается. */
  const handlePanelSelect = (pkg: { id: string }, label: string) => {
    const exists =
      rows.some((row) => row.packageId === pkg.id) ||
      paidRows.some((row) => row.packageId === pkg.id);
    if (exists) {
      setPanelError('Этот договор уже есть в ведомости');
      return;
    }
    setPanelError(null);
    setRows((current) => [...current, { key: nextRowKey(), packageId: pkg.id, label, amount: '' }]);
    setPanelSearchValue('');
  };

  const updateRow = (key: string, patch: Partial<FormRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!installerId) {
      setError('Выберите мастера');
      return;
    }
    const seenPackages = new Set<string>(paidRows.map((item) => item.packageId));
    const items: InstallerAdvanceSheetItemParams[] = [];
    for (const row of rows) {
      const amount = parseRowAmount(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(`Укажите сумму аванса (положительное число) для «${row.label}»`);
        return;
      }
      if (seenPackages.has(row.packageId)) {
        setError('В ведомости не может быть двух строк по одному договору');
        return;
      }
      seenPackages.add(row.packageId);
      items.push({ packageId: row.packageId, amount: Math.round(amount * 100) / 100 });
    }
    if (items.length === 0) {
      setError('Добавьте хотя бы одну строку с договором');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        installerId,
        note: note.trim() ? note.trim() : undefined,
        items,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось сохранить ведомость'
      );
    }
  };

  return (
    <div className={`${modalStyles.content} ${styles.formShell} ${styles.formPage}`}>
      <form data-modal-form onSubmit={(e) => void handleSubmit(e)}>
        {mode === 'create' ? (
          <p data-modal-form-hint>
            Ведомость — еженедельный список авансов одного мастера по нескольким договорам. Найдите
            заказ панелью поиска — он добавится строкой в таблицу; после ввода суммы рядом виден
            остаток з/п по договору. Выплаты отмечает супер-админ.
          </p>
        ) : null}

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="ias-installer">Мастер *</label>
            <select
              id="ias-installer"
              value={installerId}
              onChange={(e) => setInstallerId(e.target.value)}
              disabled={submitting || (mode === 'edit' && hasPaidItems)}
              required
            >
              <option value="">— выбрать мастера —</option>
              {installers.map((master) => (
                <option key={master.id} value={master.id}>
                  {formatIasGradeShort(master.grade)
                    ? `${master.fullName} (${formatIasGradeShort(master.grade)})`
                    : master.fullName}
                </option>
              ))}
            </select>
            {mode === 'edit' && hasPaidItems ? (
              <p className={styles.fieldHint}>
                Мастера нельзя сменить: в ведомости уже есть выданные строки.
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.rowsCard}>
          <span className={styles.rowsCardLabel}>Строки ведомости (договор → сумма) *</span>

          <div className={styles.searchPanelWrap}>
            <PackageOrderSearch
              id="ias-package-search"
              searchValue={panelSearchValue}
              selectedPackageId=""
              onSearchChange={(value) => {
                setPanelSearchValue(value);
                setPanelError(null);
              }}
              onSelect={(pkg) => handlePanelSelect(pkg, packageSearchLabel(pkg))}
              onClear={() => {
                setPanelSearchValue('');
                setPanelError(null);
              }}
            />
            {panelError ? <p className={styles.panelError}>{panelError}</p> : null}
          </div>

          {paidRows.map((item) => (
            <div key={item.id} className={styles.frozenRow}>
              <span>
                Выплачено {item.paidAt ? `(${item.paidAt.split('-').reverse().join('.')})` : ''}:{' '}
                {item.contractNumber || 'Договор без номера'}
                {item.customerName ? ` — ${item.customerName}` : ''}
              </span>
              <strong className={styles.frozenRowAmount}>{formatIasMoney(item.amount)}</strong>
            </div>
          ))}

          {rows.length > 0 ? (
            <div className={styles.rowsTable}>
              <div className={`${styles.rowsTableRow} ${styles.rowsTableHead}`}>
                <span>Договор</span>
                <span>Сумма аванса, ₽</span>
                <span>Остаток з/п</span>
                <span />
              </div>
              {rows.map((row) => (
                <div key={row.key} className={styles.rowsTableRow}>
                  <div className={styles.rowContract}>{row.label}</div>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    value={row.amount}
                    onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    disabled={submitting}
                    autoComplete="off"
                    aria-label={`Сумма аванса: ${row.label}`}
                  />
                  <div className={styles.rowBalanceCell}>
                    <RowBalanceHint
                      installerId={installerId}
                      packageId={row.packageId}
                      amount={row.amount}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.formRowRemove}
                    onClick={() => removeRow(row.key)}
                    disabled={submitting}
                    title="Убрать строку"
                    aria-label={`Убрать строку: ${row.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.rowsEmpty}>
              Найдите заказ панелью поиска выше — выбранный договор появится здесь строкой.
            </p>
          )}
        </div>

        <div data-modal-form-group>
          <label htmlFor="ias-note">Примечание</label>
          <textarea
            id="ias-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="Напр. Авансы за неделю 14.10–20.10"
            maxLength={2000}
          />
        </div>

        <div className={styles.formTotalRow}>
          <span>Итого к выдаче:</span>
          <span className={styles.formTotalValue}>{formatIasMoney(totalAmount)}</span>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          {onCancel ? (
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Отмена
            </button>
          ) : null}
          {cancelHref ? (
            <a href={cancelHref} data-modal-btn="secondary">
              Отмена
            </a>
          ) : null}
          <button type="submit" data-admin-mutation data-modal-btn="primary" disabled={submitting}>
            {submitting ? 'Сохранение…' : mode === 'create' ? 'Создать ведомость' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
