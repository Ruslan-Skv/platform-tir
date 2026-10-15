'use client';

import { useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { type ContractDocumentPackageInstallerAdvancePaymentMethod } from '@/shared/api/admin-contract-document-packages';
import { formatInstallerAdvancePaymentMethod } from '@/shared/constants/installerAdvancePaymentMethod';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import measurementBlankStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdBase from '../../../../styles/base.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { formatDateRu, formatMoneyRub } from '../payments/packageContractPaymentsFormat';
import { PackageInstallerAdvancesEditModal } from './PackageInstallerAdvancesEditModal';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import hubStyles from './PackageWorkOrdersHubModal.module.css';
import {
  WO_FORM_GRID,
  WO_HINT,
  WO_SECTION_CARD,
  WO_SECTION_TITLE,
  WO_SECTION_TITLE_MAIN,
  woPanelRootClass,
} from './packageWorkOrdersHubPanelStyles';
import { usePackageInstallerAdvances } from './usePackageInstallerAdvances';

type MasterSummaryRow = {
  installerId: string;
  name: string;
  grade: string | null;
  /** Начислено по итоговому заказ-наряду; null — мастер без позиций в заказ-наряде. */
  accrued: number | null;
  lineCount: number;
  paidTotal: number;
  paidCount: number;
};

function todayIsoLocal(): string {
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Авансы (частичные выплаты з/п) мастеров по договору: сводка «начислено / выдано /
 * остаток» по каждому мастеру, выдача аванса и журнал записей.
 */
export function PackageWorkOrdersHubInstallerAdvancesPanel() {
  const hub = usePackageWorkOrderHub();
  const {
    isWindowsPackage,
    packageId,
    selectedInstallers,
    finalWorkOrderComputed,
    formatInstallerGradeShort,
  } = hub;

  const { user } = useAuth();
  // Выдавать, править и удалять авансы может только супер-админ (роль проверяется и на бэкенде).
  const canManageAdvances = user?.role === 'SUPER_ADMIN';

  const [error, setError] = useState<string | null>(null);
  const advances = usePackageInstallerAdvances({ packageId, onError: setError });

  const [installerId, setInstallerId] = useState('');
  const [paidAt, setPaidAt] = useState(todayIsoLocal);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<ContractDocumentPackageInstallerAdvancePaymentMethod>('CASH');
  const [note, setNote] = useState('');

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingAdvanceId, setEditingAdvanceId] = useState<string | null>(null);

  const pendingDeleteRow = advances.rows.find((r) => r.id === pendingDeleteId) ?? null;
  const editingRow = advances.rows.find((r) => r.id === editingAdvanceId) ?? null;

  /** Мастера договора (из заказ-нарядов) + мастера из журнала — для сводки и выбора. */
  const mastersById = useMemo(() => {
    const map = new Map<string, MasterSummaryRow>();
    for (const row of finalWorkOrderComputed.installerTotals) {
      map.set(row.installer.id, {
        installerId: row.installer.id,
        name: row.installer.fullName,
        grade: row.installer.grade,
        accrued: row.total,
        lineCount: row.lineCount,
        paidTotal: 0,
        paidCount: 0,
      });
    }
    for (const r of advances.rows) {
      const key = r.installerId ?? '';
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.name = r.installerName ?? existing.name;
        existing.grade = r.installerGrade ?? existing.grade;
      } else {
        map.set(key, {
          installerId: key,
          name: r.installerName ?? 'Мастер удалён из справочника',
          grade: r.installerGrade,
          accrued: null,
          lineCount: 0,
          paidTotal: 0,
          paidCount: 0,
        });
      }
    }
    for (const [key, paid] of advances.paidByInstallerId) {
      const row = map.get(key);
      if (!row) continue;
      row.paidTotal = paid.total;
      row.paidCount = paid.count;
    }
    return map;
  }, [finalWorkOrderComputed.installerTotals, advances.rows, advances.paidByInstallerId]);

  const summaryRows = useMemo(
    () => [...mastersById.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [mastersById]
  );

  const totalAccrued = useMemo(() => {
    let sum = 0;
    let hasAny = false;
    for (const row of summaryRows) {
      if (row.accrued == null) continue;
      sum += row.accrued;
      hasAny = true;
    }
    return hasAny ? sum : null;
  }, [summaryRows]);

  /** Селект выдачи: мастера договора вперёд, затем мастера только из журнала. */
  const installerOptions = useMemo(() => {
    const order: string[] = [
      ...selectedInstallers.map((i) => i.id),
      ...[...mastersById.keys()].filter((id) => !selectedInstallers.some((i) => i.id === id)),
    ];
    return order
      .map((id) => mastersById.get(id))
      .filter((row): row is MasterSummaryRow => row != null)
      .map((row) => ({
        installerId: row.installerId,
        label: `${row.name}${row.grade ? ` (${formatInstallerGradeShort(row.grade)})` : ''}`,
      }));
  }, [selectedInstallers, mastersById, formatInstallerGradeShort]);

  const parsedAmount = Number.parseFloat(amount.trim().replace(',', '.'));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const formComplete = installerId !== '' && paidAt.trim() !== '' && amountValid;

  const handleCreate = async () => {
    if (!formComplete || advances.creating) return;
    const ok = await advances.createAdvance({
      installerId,
      paidAt,
      amount: Math.round(parsedAmount * 100) / 100,
      paymentMethod,
      note: note.trim() ? note.trim() : undefined,
    });
    if (ok) {
      // Мастера, дату и способ оплаты оставляем — обычно сразу выдают несколько авансов подряд.
      setAmount('');
      setNote('');
    }
  };

  const handleEditSave = async (
    patch: Parameters<typeof advances.updateAdvance>[1]
  ): Promise<void> => {
    if (!editingRow) return;
    const ok = await advances.updateAdvance(editingRow.id, patch);
    if (ok) setEditingAdvanceId(null);
  };

  const handleDelete = () => {
    if (pendingDeleteRow) void advances.deleteAdvance(pendingDeleteRow.id);
    setPendingDeleteId(null);
  };

  const rowActionBusy = advances.deletingId != null || advances.updatingId != null;

  const pendingDeleteSummary = pendingDeleteRow
    ? [
        pendingDeleteRow.installerName,
        pendingDeleteRow.amount ? formatMoneyRub(Number(pendingDeleteRow.amount)) : null,
        `от ${formatDateRu(pendingDeleteRow.paidAt)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className={woPanelRootClass(isWindowsPackage)}>
      {error ? (
        <p data-modal-form-error style={{ margin: '0 0 10px' }}>
          {error}
        </p>
      ) : null}
      <div className={WO_FORM_GRID}>
        <div className={WO_SECTION_CARD}>
          <h3 className={`${WO_SECTION_TITLE} ${WO_SECTION_TITLE_MAIN}`}>
            Авансы мастерам по договору
          </h3>
          <p className={WO_HINT} style={{ marginTop: 0 }}>
            Начислено — итог заказ-наряда мастера по этому договору. З/п может выдаваться частями:
            фиксируйте каждую выдачу аванса — остаток посчитается автоматически.
          </p>

          {summaryRows.length === 0 ? (
            <p className={cdProduct.hint}>
              Мастера ещё не привязаны к договору. Добавьте их на вкладке «Интерактивная итоговая
              смета» и назначьте позиции работ.
            </p>
          ) : (
            <div className={cdBase.paymentsTableWrap}>
              <table className={cdBase.paymentsTable}>
                <thead>
                  <tr>
                    <th>Мастер</th>
                    <th>Начислено (заказ-наряд)</th>
                    <th>Выдано авансов</th>
                    <th>Остаток к выплате</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => {
                    const balance = row.accrued == null ? null : row.accrued - row.paidTotal;
                    return (
                      <tr key={row.installerId}>
                        <td>
                          {row.name}
                          {row.grade ? ` (${formatInstallerGradeShort(row.grade)})` : ''}
                        </td>
                        <td>
                          {row.accrued == null ? (
                            '—'
                          ) : (
                            <>
                              {formatMoneyRub(row.accrued)}
                              <span className={cdProduct.hint}> · позиций: {row.lineCount}</span>
                            </>
                          )}
                        </td>
                        <td>
                          {row.paidCount === 0 ? (
                            '—'
                          ) : (
                            <>
                              {formatMoneyRub(row.paidTotal)}
                              <span className={cdProduct.hint}> · выплат: {row.paidCount}</span>
                            </>
                          )}
                        </td>
                        <td>
                          {balance == null ? '—' : formatMoneyRub(balance)}
                          {balance != null && balance < 0 ? ' (переплата)' : ''}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td>
                      <strong>Итого</strong>
                    </td>
                    <td>
                      {totalAccrued == null ? '—' : <strong>{formatMoneyRub(totalAccrued)}</strong>}
                    </td>
                    <td>
                      <strong>{formatMoneyRub(advances.totalPaid)}</strong>
                    </td>
                    <td>
                      {totalAccrued == null ? (
                        '—'
                      ) : (
                        <strong>{formatMoneyRub(totalAccrued - advances.totalPaid)}</strong>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${cdTemplates.sectionCard} ${cdBase.paymentsTableCard}`}>
          <h3 className={cdBase.sectionTitle}>Выдать аванс</h3>
          {!canManageAdvances ? (
            <p className={cdProduct.hint}>
              Выдавать авансы может только супер-админ. Остальным доступен просмотр журнала и
              итогов.
            </p>
          ) : installerOptions.length === 0 ? (
            <p className={cdProduct.hint}>
              Нет мастеров для выдачи аванса — сначала привяжите мастеров к договору.
            </p>
          ) : (
            <div
              className={`${measurementBlankStyles.blankSheet} ${cdBase.paymentsHubConductBlank} ${hubStyles.advancesFormSheet}`}
            >
              <div className={hubStyles.advancesFormRow}>
                <div className={cdBase.paymentsHubConductField}>
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                    htmlFor="advance_form_installer"
                  >
                    Мастер
                  </label>
                  <select
                    id="advance_form_installer"
                    className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                    value={installerId}
                    disabled={advances.creating}
                    onChange={(e) => setInstallerId(e.target.value)}
                  >
                    <option value="">Выберите мастера…</option>
                    {installerOptions.map((opt) => (
                      <option key={opt.installerId} value={opt.installerId}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={cdBase.paymentsHubConductField}>
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                    htmlFor="advance_form_date"
                  >
                    Дата выдачи
                  </label>
                  <input
                    id="advance_form_date"
                    type="date"
                    className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                    value={paidAt}
                    disabled={advances.creating}
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </div>
                <div className={cdBase.paymentsHubConductField}>
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                    htmlFor="advance_form_amount"
                  >
                    Сумма, ₽
                  </label>
                  <input
                    id="advance_form_amount"
                    inputMode="decimal"
                    className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                    value={amount}
                    disabled={advances.creating}
                    placeholder="Напр. 15000"
                    autoComplete="off"
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {amount.trim() !== '' && !amountValid ? (
                    <p className={cdBase.paymentsEditModalFieldError}>Укажите число больше нуля</p>
                  ) : null}
                </div>
                <div className={cdBase.paymentsHubConductField}>
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                    htmlFor="advance_form_payment_method"
                  >
                    Способ оплаты
                  </label>
                  <select
                    id="advance_form_payment_method"
                    className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                    value={paymentMethod}
                    disabled={advances.creating}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as ContractDocumentPackageInstallerAdvancePaymentMethod
                      )
                    }
                  >
                    <option value="CASH">Наличные</option>
                    <option value="BANK">Банк</option>
                  </select>
                </div>
              </div>
              <div className={hubStyles.advancesFormActions}>
                <div
                  className={`${cdBase.paymentsHubConductField} ${hubStyles.advancesFormNoteField}`}
                >
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                    htmlFor="advance_form_note"
                  >
                    Комментарий
                  </label>
                  <input
                    id="advance_form_note"
                    type="text"
                    className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                    value={note}
                    disabled={advances.creating}
                    placeholder="Напр. Аванс за электрику"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className={cdBase.paymentsFormHubSubmitField}>
                  <label
                    className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel} ${cdBase.paymentsFormHubSubmitSpacer}`}
                    aria-hidden="true"
                  >
                    &nbsp;
                  </label>
                  <button
                    data-admin-mutation
                    type="button"
                    className={cdBase.paymentsHubConductBtn}
                    disabled={advances.creating || !formComplete}
                    onClick={() => void handleCreate()}
                  >
                    {advances.creating ? 'Сохранение…' : 'Выдать аванс'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className={`${cdTemplates.sectionCard} ${cdBase.paymentsTableCard} ${cdBase.paymentsBlockAccentJournal}`}
        >
          <h3 className={cdBase.sectionTitle}>Журнал авансов</h3>
          {advances.loading ? (
            <p className={cdProduct.hint}>Загрузка…</p>
          ) : advances.rows.length === 0 ? (
            <p className={cdProduct.hint}>
              Записей пока нет. Выдайте первый аванс в форме выше — зарплата мастера может
              выдаваться частями.
            </p>
          ) : (
            <div className={cdBase.paymentsTableWrap}>
              <table className={cdBase.paymentsTable}>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Мастер</th>
                    <th>Сумма</th>
                    <th>Способ оплаты</th>
                    <th>Комментарий</th>
                    <th>Кто выдал</th>
                    {canManageAdvances ? <th>Действия</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {advances.rows.map((r) => {
                    const rowDeleting = advances.deletingId === r.id;
                    const rowSaving = advances.updatingId === r.id;
                    return (
                      <tr key={r.id}>
                        <td>{formatDateRu(r.paidAt)}</td>
                        <td>{r.installerName ?? '—'}</td>
                        <td>{formatMoneyRub(Number.parseFloat(r.amount))}</td>
                        <td>{formatInstallerAdvancePaymentMethod(r.paymentMethod)}</td>
                        <td className={cdBase.paymentsTableBasisCell}>{r.note?.trim() || '—'}</td>
                        <td className={cdBase.paymentsTableUserCell}>
                          {r.createdBy
                            ? [r.createdBy.firstName, r.createdBy.lastName]
                                .filter(Boolean)
                                .join(' ') || r.createdBy.email
                            : '—'}
                        </td>
                        {canManageAdvances ? (
                          <td className={cdBase.paymentsTableActionsCell}>
                            <button
                              data-admin-mutation
                              type="button"
                              className={cdBase.paymentsEditBtn}
                              disabled={rowActionBusy}
                              title="Изменить запись аванса (только супер-админ)"
                              onClick={() => setEditingAdvanceId(r.id)}
                            >
                              {rowSaving ? 'Сохранение…' : 'Изменить'}
                            </button>
                            <button
                              data-admin-mutation
                              type="button"
                              className={cdBase.paymentsCancelBtn}
                              disabled={rowActionBusy}
                              title="Удалить запись аванса (только супер-админ)"
                              onClick={() => setPendingDeleteId(r.id)}
                            >
                              {rowDeleting ? 'Удаление…' : 'Удалить'}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={pendingDeleteRow != null}
        onClose={() => {
          if (advances.deletingId == null) setPendingDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Удалить запись аванса?"
        message={
          pendingDeleteSummary
            ? `Запись ${pendingDeleteSummary} будет удалена из журнала, выданные суммы и остатки по мастеру пересчитаются.`
            : 'Запись будет удалена из журнала, выданные суммы и остатки по мастеру пересчитаются.'
        }
        confirmText="Удалить аванс"
        variant="danger"
      />

      {canManageAdvances ? (
        <PackageInstallerAdvancesEditModal
          advance={editingRow}
          installerOptions={installerOptions}
          saving={advances.updatingId != null}
          onClose={() => {
            if (advances.updatingId == null) setEditingAdvanceId(null);
          }}
          onSave={(patch) => void handleEditSave(patch)}
        />
      ) : null}
    </div>
  );
}
