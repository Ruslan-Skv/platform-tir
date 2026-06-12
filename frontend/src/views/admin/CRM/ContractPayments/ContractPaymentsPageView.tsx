'use client';

import { useMemo } from 'react';

import type { ContractPayment } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ContractPaymentsPage.module.css';
import {
  ALL_OFFICES_ID,
  PAYMENT_FORM_LABELS,
  PAYMENT_TYPE_LABELS,
} from './contract-payments-page.constants';
import { formatDate, formatMoney, formatUser } from './contract-payments-page.utils';
import type { ContractPaymentsPageModel } from './hooks/useContractPaymentsPage';

type ContractPaymentsPageViewProps = {
  model: ContractPaymentsPageModel;
};

export function ContractPaymentsPageView({ model }: ContractPaymentsPageViewProps) {
  const {
    canEditIncassation,
    offices,
    selectedOfficeId,
    setSelectedOfficeId,
    period,
    setPeriod,
    summary,
    otherExpenses,
    incassations,
    loading,
    paymentsFilters,
    setPaymentsFilters,
    otherExpenseModalOpen,
    setOtherExpenseModalOpen,
    otherExpenseAmount,
    setOtherExpenseAmount,
    otherExpenseDate,
    setOtherExpenseDate,
    otherExpenseDescription,
    setOtherExpenseDescription,
    otherExpenseSaving,
    collectionSavingId,
    otherExpenseCollectionSavingId,
    incassationModalOpen,
    setIncassationModalOpen,
    incassationAmount,
    setIncassationAmount,
    incassationDate,
    setIncassationDate,
    incassationIncassator,
    setIncassationIncassator,
    incassationNotes,
    setIncassationNotes,
    incassationSaving,
    handleAddOtherExpense,
    handleUpdateCollectionAmount,
    handleUpdateOtherExpenseCollection,
    handleAddIncassation,
    isAllOffices,
    getOfficeName,
    filteredPayments,
    filteredPaymentsSum,
    paymentsWithDiscrepancy,
  } = model;

  const paymentColumns = useMemo(
    () => [
      ...(isAllOffices
        ? [
            {
              key: 'office',
              title: 'Офис',
              render: (p: ContractPayment) =>
                p.contract?.office?.name ?? p.contract?.complexObject?.office?.name ?? '—',
            },
          ]
        : []),
      {
        key: 'paymentDate',
        title: 'Дата',
        render: (p: ContractPayment) => formatDate(p.paymentDate),
      },
      {
        key: 'contract',
        title: '№ договора',
        render: (p: ContractPayment) => p.contract?.contractNumber ?? '—',
      },
      {
        key: 'customer',
        title: 'ФИО Заказчика',
        render: (p: ContractPayment) => p.contract?.customerName ?? '—',
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (p: ContractPayment) => formatMoney(p.amount),
      },
      {
        key: 'paymentForm',
        title: 'Форма оплаты',
        render: (p: ContractPayment) => PAYMENT_FORM_LABELS[p.paymentForm] ?? p.paymentForm,
      },
      {
        key: 'paymentType',
        title: 'Тип операции',
        render: (p: ContractPayment) => PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType,
      },
      {
        key: 'manager',
        title: 'Менеджер',
        render: (p: ContractPayment) =>
          formatUser(p.contract?.manager ?? p.contract?.complexObject?.manager ?? p.manager),
      },
      { key: 'notes', title: 'Примечание', render: (p: ContractPayment) => p.notes ?? '—' },
      {
        key: 'collectionAmount',
        title: 'Инкассация',
        render: (p: ContractPayment) => {
          const val = p.collectionAmount;
          const displayVal =
            val == null || val === '' ? '' : typeof val === 'number' ? String(val) : String(val);
          if (canEditIncassation) {
            return (
              <input
                key={`coll-${p.id}-${displayVal}`}
                type="text"
                className={styles.collectionInput}
                defaultValue={displayVal}
                onBlur={(e) => handleUpdateCollectionAmount(p, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="—"
                disabled={collectionSavingId === p.id}
              />
            );
          }
          return formatMoney(val);
        },
      },
    ],
    [canEditIncassation, collectionSavingId, handleUpdateCollectionAmount, isAllOffices]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Движ. ден. средст</h1>
          <select
            className={styles.officeSelect}
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
          >
            <option value={ALL_OFFICES_ID}>Все офисы</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <label className={styles.periodLabel}>
            Период:
            <input
              type="date"
              className={styles.periodInput}
              value={period.dateFrom}
              onChange={(e) => setPeriod((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
            —
            <input
              type="date"
              className={styles.periodInput}
              value={period.dateTo}
              onChange={(e) => setPeriod((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </label>
        </div>
      </div>

      {summary && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Итого</span>
                <span className={styles.summaryValueHighlight}>
                  {formatMoney(
                    (summary.receivedFromClients ?? 0) +
                      (summary.receivedByTerminal ?? 0) +
                      (summary.receivedByQr ?? 0) +
                      (summary.receivedByInvoice ?? 0) +
                      (summary.receivedByLcTransfer ?? 0)
                  )}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Наличные</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedFromClients)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Терминал</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByTerminal)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>QR</span>
                <span className={styles.summaryValue}>{formatMoney(summary.receivedByQr)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Счета</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByInvoice)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Переводы на ЛК</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByLcTransfer)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Прочие расходы</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.otherExpensesTotal)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Остаток наличных в кассе</span>
                <span className={styles.summaryValueHighlight}>
                  {formatMoney(summary.balanceInCash)}
                </span>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Оплаты по договорам (все формы оплаты)</h3>
            <div className={styles.tableFilters}>
              <input
                type="date"
                className={styles.filterInput}
                placeholder="Дата"
                value={paymentsFilters.date}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, date: e.target.value }))}
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="№ договора"
                value={paymentsFilters.contractNumber}
                onChange={(e) =>
                  setPaymentsFilters((f) => ({ ...f, contractNumber: e.target.value }))
                }
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Заказчик"
                value={paymentsFilters.customer}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, customer: e.target.value }))}
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Сумма"
                value={paymentsFilters.amount}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, amount: e.target.value }))}
              />
              <select
                className={`${styles.filterInput} ${styles.filterSelect} ${!paymentsFilters.paymentForm ? styles.filterSelectPlaceholder : ''}`}
                value={paymentsFilters.paymentForm}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, paymentForm: e.target.value }))}
              >
                <option value="">Все</option>
                {Object.entries(PAYMENT_FORM_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                className={`${styles.filterInput} ${styles.filterSelect} ${!paymentsFilters.paymentType ? styles.filterSelectPlaceholder : ''}`}
                value={paymentsFilters.paymentType}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, paymentType: e.target.value }))}
              >
                <option value="">Все</option>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Менеджер"
                value={paymentsFilters.manager}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, manager: e.target.value }))}
              />
              <span className={styles.filteredSum}>
                Сумма отфильтрованных: {formatMoney(filteredPaymentsSum)} ({filteredPayments.length}{' '}
                зап.)
              </span>
            </div>
            <DataTable
              data={filteredPayments}
              columns={paymentColumns}
              keyExtractor={(p) => p.id}
              loading={loading}
              emptyMessage="Нет оплат по договорам"
              highlightedIds={paymentsWithDiscrepancy}
              highlightedRowClassName={styles.rowDiscrepancy}
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Прочие расходы (бытовые нужды)</h3>
              {!isAllOffices && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setOtherExpenseModalOpen(true)}
                >
                  Добавить расход
                </button>
              )}
            </div>
            {otherExpenses.length === 0 ? (
              <p className={styles.emptyText}>Нет записей</p>
            ) : (
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    {isAllOffices && <th>Офис</th>}
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Назначение</th>
                    <th>Инкассация</th>
                  </tr>
                </thead>
                <tbody>
                  {otherExpenses.map((e) => {
                    const amountNum = Number(e.amount ?? 0);
                    const coll = e.collectionAmount;
                    const collNum = coll == null || coll === '' ? null : Number(coll);
                    const hasDiscrepancy = collNum != null && Math.abs(amountNum - collNum) > 0.001;
                    const displayVal =
                      coll == null || coll === ''
                        ? ''
                        : typeof coll === 'number'
                          ? String(coll)
                          : String(coll);
                    return (
                      <tr key={e.id} className={hasDiscrepancy ? styles.rowDiscrepancy : ''}>
                        {isAllOffices && <td>{e.office?.name ?? getOfficeName(e.officeId)}</td>}
                        <td>{formatDate(e.expenseDate)}</td>
                        <td>{formatMoney(e.amount)}</td>
                        <td>{e.description ?? '—'}</td>
                        <td>
                          {canEditIncassation ? (
                            <input
                              key={`oe-coll-${e.id}-${displayVal}`}
                              type="text"
                              className={styles.collectionInput}
                              defaultValue={displayVal}
                              onBlur={(ev) =>
                                handleUpdateOtherExpenseCollection(e, ev.target.value)
                              }
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') {
                                  (ev.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="—"
                              disabled={otherExpenseCollectionSavingId === e.id}
                            />
                          ) : (
                            formatMoney(coll)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Инкассации (изъятие наличных)</h3>
              {!isAllOffices && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setIncassationModalOpen(true)}
                >
                  Инкассация
                </button>
              )}
            </div>
            {incassations.length === 0 ? (
              <p className={styles.emptyText}>Нет записей об инкассации</p>
            ) : (
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    {isAllOffices && <th>Офис</th>}
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Инкассатор</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {incassations.map((i) => (
                    <tr key={i.id}>
                      {isAllOffices && <td>{i.office?.name ?? getOfficeName(i.officeId)}</td>}
                      <td>{formatDate(i.incassationDate)}</td>
                      <td>{formatMoney(i.amount)}</td>
                      <td>{i.incassator ?? '—'}</td>
                      <td>{i.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <Modal
        isOpen={otherExpenseModalOpen}
        onClose={() => !otherExpenseSaving && setOtherExpenseModalOpen(false)}
        title="Добавить прочий расход"
      >
        <div className={styles.form}>
          <label>
            Сумма *
            <input
              type="text"
              className={styles.input}
              value={otherExpenseAmount}
              onChange={(e) => setOtherExpenseAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Дата *
            <input
              type="date"
              className={styles.input}
              value={otherExpenseDate}
              onChange={(e) => setOtherExpenseDate(e.target.value)}
            />
          </label>
          <label>
            Назначение (описание)
            <input
              type="text"
              className={styles.input}
              value={otherExpenseDescription}
              onChange={(e) => setOtherExpenseDescription(e.target.value)}
              placeholder="Бытовые нужды офиса"
            />
          </label>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setOtherExpenseModalOpen(false)}
              disabled={otherExpenseSaving}
            >
              Отмена
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleAddOtherExpense}
              disabled={otherExpenseSaving}
            >
              {otherExpenseSaving ? 'Сохранение…' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={incassationModalOpen}
        onClose={() => !incassationSaving && setIncassationModalOpen(false)}
        title="Инкассация"
      >
        <div className={styles.form}>
          <p className={styles.formHint}>
            Укажите сумму изъятия наличных и дату проведения инкассации (как правило, раз в неделю).
          </p>
          <label>
            Сумма *
            <input
              type="text"
              className={styles.input}
              value={incassationAmount}
              onChange={(e) => setIncassationAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Дата инкассации *
            <input
              type="date"
              className={styles.input}
              value={incassationDate}
              onChange={(e) => setIncassationDate(e.target.value)}
            />
          </label>
          <label>
            Инкассатор
            <input
              type="text"
              className={styles.input}
              value={incassationIncassator}
              onChange={(e) => setIncassationIncassator(e.target.value)}
              placeholder="ФИО или данные того, кто произвёл инкассацию"
            />
          </label>
          <label>
            Примечание
            <input
              type="text"
              className={styles.input}
              value={incassationNotes}
              onChange={(e) => setIncassationNotes(e.target.value)}
              placeholder="Инкассация за неделю"
            />
          </label>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setIncassationModalOpen(false)}
              disabled={incassationSaving}
            >
              Отмена
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleAddIncassation}
              disabled={incassationSaving}
            >
              {incassationSaving ? 'Сохранение…' : 'Зафиксировать'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
