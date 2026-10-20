'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import type {
  AdminSupplierLedgerEntry,
  AdminSupplierRequisite,
} from '@/shared/api/admin-suppliers';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { SuppliersRulesInfoTip } from '../SuppliersRulesInfoTip';
import listStyles from '../list/SuppliersPage.module.css';
import { SupplierFormModal } from '../modals/SupplierFormModal';
import {
  BALANCE_STATUS_LABELS,
  LEDGER_ROW_STATUS_LABELS,
  formatSupplierDate,
  formatSupplierMoney,
  formatVatRate,
  getLedgerRowStatus,
  supplierOrderContractLabel,
} from '../suppliers-page.utils';
import styles from './SupplierDetailPage.module.css';
import type { SupplierDetailPageModel } from './hooks/useSupplierDetailPage';
import { InvoiceEntryModal } from './modals/InvoiceEntryModal';
import { PaymentEntryModal } from './modals/PaymentEntryModal';
import { RequisiteModal } from './modals/RequisiteModal';

type SupplierDetailPageViewProps = {
  model: SupplierDetailPageModel;
};

/** Кнопка «копировать» у поля реквизитов: номер счёта/БИК — в платёжку. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.requisiteField}>
      <span className={styles.requisiteFieldLabel}>{label}</span>
      <span className={styles.requisiteFieldValue}>
        {value}
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
          title="Скопировать"
        >
          {copied ? '✓' : '⧉'}
        </button>
      </span>
    </div>
  );
}

/** Карточка блока реквизитов: банк, счета, БИК, ИНН/КПП — с копированием полей. */
function RequisiteCard({
  requisite,
  canEditCard,
  onEdit,
  onDelete,
}: {
  requisite: AdminSupplierRequisite;
  /** Правка и удаление блока — только супер-админ (добавление — любой редактор). */
  canEditCard: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={styles.requisiteCard}>
      <div className={styles.requisiteCardHeader}>
        <p className={styles.requisiteCardName}>
          {requisite.name}
          {requisite.isDefault ? ' · по умолчанию' : ''}
        </p>
        {canEditCard ? (
          <span className={dpStyles.entryActions}>
            <button
              type="button"
              className={dpStyles.editEntryBtn}
              onClick={onEdit}
              title="Изменить блок реквизитов (только суперадмин)"
              aria-label="Изменить блок реквизитов"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              type="button"
              data-admin-mutation
              className={dpStyles.deleteEntryBtn}
              onClick={onDelete}
              title="Удалить блок реквизитов (только суперадмин)"
              aria-label="Удалить блок реквизитов"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </button>
          </span>
        ) : null}
      </div>
      <div className={styles.requisiteFields}>
        {requisite.bankName ? <CopyField label="Банк" value={requisite.bankName} /> : null}
        {requisite.bankAccount ? <CopyField label="Счёт" value={requisite.bankAccount} /> : null}
        {requisite.bankBik ? <CopyField label="БИК" value={requisite.bankBik} /> : null}
        {requisite.corrAccount ? (
          <CopyField label="Корр. счёт" value={requisite.corrAccount} />
        ) : null}
        {requisite.inn ? <CopyField label="ИНН" value={requisite.inn} /> : null}
        {requisite.kpp ? <CopyField label="КПП" value={requisite.kpp} /> : null}
      </div>
      {requisite.note ? <p className={styles.requisiteNote}>{requisite.note}</p> : null}
    </article>
  );
}

/** Карточка поставщика: баланс, ведомость счетов/оплат, блоки банковских реквизитов. */
export function SupplierDetailPageView({ model }: SupplierDetailPageViewProps) {
  const {
    supplier,
    requisites,
    stats,
    productsCount,
    loading,
    error,
    setError,
    loadAll,
    entries,
    ledgerTotal,
    ledgerPage,
    setLedgerPage,
    ledgerAmountSum,
    ledgerPaymentSum,
    ledgerBalance,
    ledgerLoading,
    ledgerSearch,
    setLedgerSearch,
    resetLedgerFilters,
    tab,
    setTab,
    entryModalKind,
    editingEntry,
    openCreateInvoiceModal,
    openCreatePaymentModal,
    openEditEntryModal,
    closeEntryModal,
    entrySubmitting,
    handleSaveEntry,
    deleteEntryId,
    askDeleteEntry,
    cancelDeleteEntry,
    deletingEntry,
    handleDeleteEntry,
    requisiteModalOpen,
    editingRequisite,
    openCreateRequisiteModal,
    openEditRequisiteModal,
    closeRequisiteModal,
    requisiteSubmitting,
    handleSaveRequisite,
    deleteRequisiteId,
    askDeleteRequisite,
    cancelDeleteRequisite,
    deletingRequisite,
    handleDeleteRequisite,
    supplierModalOpen,
    openSupplierModal,
    closeSupplierModal,
    supplierSubmitting,
    handleSaveSupplier,
    deleteSupplierConfirm,
    askDeleteSupplier,
    cancelDeleteSupplier,
    deletingSupplier,
    handleDeleteSupplier,
    canEdit,
    canManagePayments,
    canDeleteSupplier,
    canEditSupplierCard,
  } = model;

  const ledgerColumns = useMemo(
    () => [
      {
        key: 'date',
        title: 'Дата',
        width: '110px',
        render: (item: AdminSupplierLedgerEntry) => formatSupplierDate(item.date),
      },
      {
        key: 'documentNo',
        title: '№ счёта',
        render: (item: AdminSupplierLedgerEntry) => item.documentNo || '—',
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (item: AdminSupplierLedgerEntry) =>
          item.amount != null ? (
            <span className={listStyles.balancePayable}>{formatSupplierMoney(item.amount)}</span>
          ) : (
            '—'
          ),
      },
      {
        key: 'payment',
        title: 'Оплачено',
        render: (item: AdminSupplierLedgerEntry) => {
          // Счёт: сколько из него закрыто оплатами (FIFO); строка-оплата: её сумма.
          const value = item.amount != null ? item.paidAmount : item.payment;
          return value != null && value !== 0 ? (
            <span className={listStyles.balanceOverpay}>{formatSupplierMoney(value)}</span>
          ) : (
            '—'
          );
        },
      },
      {
        key: 'status',
        title: 'Статус',
        width: '110px',
        render: (item: AdminSupplierLedgerEntry) => {
          const status = getLedgerRowStatus(item);
          if (!status) return '—';
          const tone =
            status === 'PAID'
              ? listStyles.badgeSettled
              : status === 'PARTIAL'
                ? listStyles.badgePartial
                : status === 'UNPAID'
                  ? listStyles.badgeUnpaid
                  : listStyles.badgeNeutral;
          return (
            <span className={`${listStyles.badge} ${tone}`}>
              {LEDGER_ROW_STATUS_LABELS[status]}
            </span>
          );
        },
      },
      {
        key: 'vatRate',
        title: 'НДС',
        width: '100px',
        render: (item: AdminSupplierLedgerEntry) => formatVatRate(item.vatRate),
      },
      {
        key: 'contracts',
        title: 'Договора',
        render: (item: AdminSupplierLedgerEntry) => (
          <div className={dpStyles.basisCell}>
            {item.orderLinks.length > 0
              ? item.orderLinks.map((link) => (
                  <span key={link.id} className={dpStyles.basisSubline}>
                    {supplierOrderContractLabel(link)} · {formatSupplierMoney(link.amount)}
                  </span>
                ))
              : '—'}
          </div>
        ),
      },
      {
        key: 'note',
        title: 'Примечание',
        render: (item: AdminSupplierLedgerEntry) => (
          <div className={dpStyles.basisCell}>
            {item.note || '—'}
            {item.requisiteName ? (
              <span className={dpStyles.basisSubline}>{item.requisiteName}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'author',
        title: 'Автор',
        render: (item: AdminSupplierLedgerEntry) => item.createdByName || '—',
      },
      {
        key: 'actions',
        title: '',
        width: '90px',
        render: (item: AdminSupplierLedgerEntry) => {
          // Счёт правит любой редактор раздела; строку оплаты — только супер-админ,
          // остальным кнопки не показываем вообще. Оплаченный счёт (по нему уже
          // прошла оплата) после этого правит/удаляет тоже только супер-админ.
          const isInvoiceRow = item.amount != null;
          if (!isInvoiceRow && !canManagePayments) {
            return null;
          }
          const invoiceLockedByPayment = isInvoiceRow && item.paidAmount > 0 && !canManagePayments;
          const rowEditable = isInvoiceRow ? canEdit && !invoiceLockedByPayment : canManagePayments;
          return (
            <div className={dpStyles.entryActions}>
              <button
                type="button"
                className={dpStyles.editEntryBtn}
                disabled={!rowEditable || ledgerLoading}
                onClick={() => openEditEntryModal(item)}
                title={
                  !isInvoiceRow
                    ? 'Изменить запись (только суперадмин)'
                    : invoiceLockedByPayment
                      ? 'Счёт оплачен — изменение только суперадмину'
                      : rowEditable
                        ? 'Изменить запись'
                        : 'Нет прав на изменение'
                }
                aria-label="Изменить запись"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
              <button
                type="button"
                data-admin-mutation
                className={dpStyles.deleteEntryBtn}
                disabled={!rowEditable || ledgerLoading}
                onClick={() => askDeleteEntry(item.id)}
                title={
                  !isInvoiceRow
                    ? 'Удалить запись (только суперадмин)'
                    : invoiceLockedByPayment
                      ? 'Счёт оплачен — удаление только суперадмину'
                      : 'Удалить запись'
                }
                aria-label="Удалить запись"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            </div>
          );
        },
      },
    ],
    [canEdit, canManagePayments, ledgerLoading, openEditEntryModal, askDeleteEntry]
  );

  if (!supplier && loading) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
        <p className={styles.emptyMessage}>Загрузка поставщика…</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
        <Link href="/admin/suppliers" className={styles.backLink}>
          ← Поставщики
        </Link>
        {error ? (
          <div className={dpStyles.pageMessage}>
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Закрыть">
              ×
            </button>
          </div>
        ) : null}
        <p className={styles.emptyMessage}>Поставщик не найден</p>
      </div>
    );
  }

  const statusBadgeClass =
    stats?.status === 'PAYABLE'
      ? listStyles.badgePayable
      : stats?.status === 'OVERPAY'
        ? listStyles.badgeOverpay
        : listStyles.badgeSettled;
  const balanceClass =
    stats?.status === 'PAYABLE'
      ? listStyles.balancePayable
      : stats?.status === 'OVERPAY'
        ? listStyles.balanceOverpay
        : listStyles.balanceSettled;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link href="/admin/suppliers" className={styles.backLink}>
        ← Поставщики
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>{supplier.commercialName || supplier.legalName}</h1>
                <SuppliersRulesInfoTip />
              </div>
              <span className={`${listStyles.badge} ${statusBadgeClass}`}>
                {BALANCE_STATUS_LABELS[stats?.status ?? 'SETTLED']}
              </span>
              <span className={cdHub.contractsListCount} title={supplier.legalName}>
                <span className={cdHub.contractsListCountDesktop}>{supplier.legalName}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить карточку"
                aria-label="Обновление карточки поставщика"
                onClick={() => void loadAll()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {tab === 'ledger' ? (
            <>
              <button
                data-admin-mutation
                type="button"
                className={cdChrome.contractsListHeaderAddBtn}
                disabled={ledgerLoading || !canEdit}
                onClick={openCreateInvoiceModal}
                title={
                  canEdit
                    ? 'Счёт от поставщика — вносят ведущие специалисты'
                    : 'Нет прав на изменение раздела'
                }
              >
                + Счёт
              </button>
              <button
                data-admin-mutation
                type="button"
                className={cdChrome.contractsListHeaderAddBtn}
                disabled={ledgerLoading || !canManagePayments}
                onClick={openCreatePaymentModal}
                title={
                  canManagePayments
                    ? 'Оплата по счетам (одной суммой) — гасит самые ранние счета'
                    : 'Проводить оплаты может только супер-админ'
                }
              >
                + Оплата
              </button>
            </>
          ) : (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={loading || !canEdit}
              onClick={openCreateRequisiteModal}
              title={canEdit ? 'Новый блок банковских реквизитов' : 'Нет прав на изменение раздела'}
            >
              + Реквизиты
            </button>
          )}
          <button
            type="button"
            className={listStyles.rowActionBtn}
            disabled={loading || !canEditSupplierCard}
            onClick={openSupplierModal}
            title={
              canEditSupplierCard
                ? 'Наименование, ИНН, контакты, сальдо начальное (только суперадмин)'
                : 'Изменять карточку поставщика может только суперадмин'
            }
          >
            Карточка
          </button>
          <Link
            href={`/admin/catalog/suppliers/${supplier.id}/price-lists`}
            className={listStyles.rowActionBtn}
            title="Сверка прайс-листов (раздел каталога)"
          >
            Прайс-листы
          </Link>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить карточку"
              aria-label="Обновление карточки поставщика"
              onClick={() => void loadAll()}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className={dpStyles.pageMessage}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      {/* Баланс поставщика: сальдо начальное + начислено − оплачено = к оплате. */}
      <section
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Баланс расчётов с поставщиком"
      >
        <div className={dpStyles.totalsTile} title="Сальдо начальное (точка отсчёта ведомости)">
          <span className={dpStyles.totalsTileLabel}>
            Сальдо начальное
            {supplier.openingBalanceDate
              ? ` на ${formatSupplierDate(supplier.openingBalanceDate)}`
              : ''}
          </span>
          <strong className={dpStyles.totalsTileValue}>
            {formatSupplierMoney(stats?.openingBalance ?? null)}
          </strong>
        </div>
        <div className={dpStyles.totalsTile} title="Сумма всех счетов в ведомости">
          <span className={dpStyles.totalsTileLabel}>Начислено (счета)</span>
          <strong className={`${dpStyles.totalsTileValue} ${listStyles.balancePayable}`}>
            +{formatSupplierMoney(ledgerAmountSum)}
          </strong>
        </div>
        <div className={dpStyles.totalsTile} title="Сумма всех оплат в ведомости">
          <span className={dpStyles.totalsTileLabel}>Оплачено</span>
          <strong className={`${dpStyles.totalsTileValue} ${listStyles.balanceOverpay}`}>
            −{formatSupplierMoney(ledgerPaymentSum)}
          </strong>
        </div>
        <div
          className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}
          title="Сальдо конечное: столько должны поставщику (минус — переплата)"
        >
          <span className={dpStyles.totalsTileLabel}>К оплате</span>
          <strong className={`${dpStyles.totalsTileValue} ${balanceClass}`}>
            {formatSupplierMoney(stats?.balance ?? ledgerBalance ?? 0)}
          </strong>
        </div>
      </section>

      {/* Контакты и признаки карточки */}
      <div className={styles.contactsRow}>
        {supplier.inn ? <span>ИНН: {supplier.inn}</span> : null}
        {supplier.phone.filter(Boolean).length > 0 ? (
          <span>Тел.: {supplier.phone.filter(Boolean).join(', ')}</span>
        ) : null}
        {supplier.email ? <a href={`mailto:${supplier.email}`}>{supplier.email}</a> : null}
        {supplier.website ? (
          <a href={supplier.website} target="_blank" rel="noreferrer">
            {supplier.website.replace(/^https?:\/\//, '')}
          </a>
        ) : null}
        {productsCount > 0 ? <span>Товаров в каталоге: {productsCount}</span> : null}
        {!supplier.isActive ? <span>· Неактивен</span> : null}
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Разделы карточки поставщика">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ledger'}
          className={`${styles.tabChip}${tab === 'ledger' ? ` ${styles.tabChipActive}` : ''}`}
          onClick={() => setTab('ledger')}
        >
          Ведомость · {ledgerTotal}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'requisites'}
          className={`${styles.tabChip}${tab === 'requisites' ? ` ${styles.tabChipActive}` : ''}`}
          onClick={() => setTab('requisites')}
        >
          Реквизиты · {requisites.length}
        </button>
      </div>

      {tab === 'ledger' ? (
        <>
          <section
            className={`${cdHub.contractsListFiltersPanel} ${styles.ledgerFiltersPanel}`}
            aria-label="Фильтры ведомости"
          >
            <div className={cdHub.contractsListFilters}>
              <input
                type="search"
                placeholder="Поиск: № документа, № договора, примечание…"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className={`${cdHub.contractsListSearchInput}${
                  ledgerSearch.trim() ? ` ${cdHub.contractsListFilterActive}` : ''
                }`}
                aria-label="Поиск по ведомости"
              />
              {ledgerSearch.trim() ? (
                <button
                  type="button"
                  className={dpStyles.resetBtn}
                  onClick={resetLedgerFilters}
                  disabled={ledgerLoading}
                >
                  Сбросить
                </button>
              ) : null}
            </div>
          </section>

          <DataTable
            data={entries}
            columns={ledgerColumns}
            keyExtractor={(item) => item.id}
            loading={ledgerLoading}
            emptyMessage={
              ledgerSearch.trim()
                ? 'Записи по запросу не найдены'
                : 'Записей пока нет — внесите первый счёт'
            }
            serverSidePagination
            pagination={{
              page: ledgerPage,
              limit: 50,
              total: ledgerTotal,
              onPageChange: setLedgerPage,
            }}
            paginationClassName={cdHub.contractsListPagination}
            paginationActiveClassName={cdHub.contractsListPaginationPageActive}
          />
        </>
      ) : (
        <div className={styles.requisitesGrid}>
          {requisites.length === 0 ? (
            <p className={styles.emptyMessage}>
              Банковских реквизитов нет — добавьте первый блок кнопкой «+ Реквизиты»
            </p>
          ) : (
            requisites.map((requisite) => (
              <RequisiteCard
                key={requisite.id}
                requisite={requisite}
                canEditCard={canEditSupplierCard}
                onEdit={() => openEditRequisiteModal(requisite)}
                onDelete={() => askDeleteRequisite(requisite.id)}
              />
            ))
          )}
        </div>
      )}

      <InvoiceEntryModal
        open={entryModalKind === 'invoice'}
        onClose={closeEntryModal}
        initial={editingEntry}
        requisites={requisites}
        submitting={entrySubmitting}
        onSubmit={handleSaveEntry}
      />

      <PaymentEntryModal
        open={entryModalKind === 'payment'}
        onClose={closeEntryModal}
        initial={editingEntry}
        requisites={requisites}
        submitting={entrySubmitting}
        onSubmit={handleSaveEntry}
      />

      <RequisiteModal
        open={requisiteModalOpen}
        onClose={closeRequisiteModal}
        initial={editingRequisite}
        submitting={requisiteSubmitting}
        onSubmit={handleSaveRequisite}
      />

      <SupplierFormModal
        open={supplierModalOpen}
        onClose={closeSupplierModal}
        initial={supplier}
        submitting={supplierSubmitting}
        onSubmit={handleSaveSupplier}
      />

      <ConfirmModal
        isOpen={deleteEntryId !== null}
        onClose={cancelDeleteEntry}
        onConfirm={() => void handleDeleteEntry()}
        title="Удалить запись ведомости"
        message="Запись будет удалена, сальдо пересчитается. Продолжить?"
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deletingEntry}
      />

      <ConfirmModal
        isOpen={deleteRequisiteId !== null}
        onClose={cancelDeleteRequisite}
        onConfirm={() => void handleDeleteRequisite()}
        title="Удалить блок реквизитов"
        message="Блок банковских реквизитов будет удалён. Записи ведомости останутся. Продолжить?"
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deletingRequisite}
      />

      <ConfirmModal
        isOpen={deleteSupplierConfirm}
        onClose={cancelDeleteSupplier}
        onConfirm={() => void handleDeleteSupplier()}
        title="Удалить поставщика в корзину"
        message={`Поставщик «${supplier.legalName}» будет перемещён в корзину: скроется из списка и карточки. Восстановление невозможно, через 30 дней — безвозвратное удаление вместе с ведомостью и реквизитами. Продолжить?`}
        confirmText="Удалить в корзину"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deletingSupplier}
      />

      {canDeleteSupplier ? (
        <div className={styles.dangerZoneRow}>
          <button
            type="button"
            data-admin-mutation
            className={listStyles.rowActionBtn}
            onClick={askDeleteSupplier}
            disabled={loading}
            title="Удалить поставщика в корзину (только суперадмин)"
          >
            Удалить поставщика
          </button>
        </div>
      ) : null}
    </div>
  );
}
