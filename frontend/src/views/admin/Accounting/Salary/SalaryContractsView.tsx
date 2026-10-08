'use client';

import { useId, useMemo } from 'react';

import type { CrmUser, Office } from '@/shared/api/admin-crm';
import type { SalaryContract, SalarySettings } from '@/shared/api/admin-salary';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { ContractFormModal } from './ContractFormModal';
import styles from './SalaryPage.module.css';
import type { SalaryContractsModel } from './hooks/useSalaryContracts';
import {
  SALARY_PAGE_LIMIT_OPTIONS,
  type SalaryPageLimit,
  formatDate,
  formatMoney,
} from './salary-page.constants';

type ContractsViewProps = {
  model: SalaryContractsModel;
  offices: Office[];
  users: CrmUser[];
  settings: SalarySettings | null;
  canEdit: boolean;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Вкладка «Договоры»: реестр договоров для расчёта з/п. */
export function SalaryContractsView({
  model,
  offices,
  users,
  settings,
  canEdit,
}: ContractsViewProps) {
  const filtersContentId = useId();
  const categories = useMemo(
    () => settings?.categories.filter((c) => c.isActive) ?? [],
    [settings]
  );

  /** Для правки существующего договора оставляем его направление в списке, даже если оно выключено. */
  const modalCategories = useMemo(() => {
    if (!model.editing) return categories;
    const present = categories.some((c) => c.id === model.editing!.categoryId);
    const editingCategory = settings?.categories.find((c) => c.id === model.editing!.categoryId);
    return present || !editingCategory ? categories : [editingCategory, ...categories];
  }, [categories, settings, model.editing]);

  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'office',
        label: model.filterOfficeId
          ? `Офис: ${offices.find((o) => o.id === model.filterOfficeId)?.name ?? '—'}`
          : 'Все офисы',
      },
      {
        key: 'category',
        label: model.filterCategoryId
          ? `Направление: ${settings?.categories.find((c) => c.id === model.filterCategoryId)?.name ?? '—'}`
          : 'Все направления',
      },
      {
        key: 'entryKind',
        label:
          model.filterEntryKind === 'auto'
            ? 'Тип записи: Авто'
            : model.filterEntryKind === 'manual'
              ? 'Тип записи: Ручные'
              : 'Тип записи: все',
      },
    ];
    if (model.filterFrom || model.filterTo) {
      chips.push({
        key: 'signed',
        label: `Заключён: ${model.filterFrom ? formatDate(model.filterFrom) : '…'} — ${
          model.filterTo ? formatDate(model.filterTo) : '…'
        }`,
      });
    }
    if (model.search.trim()) chips.push({ key: 'search', label: `Поиск: ${model.search.trim()}` });
    return chips;
  }, [
    model.filterOfficeId,
    model.filterCategoryId,
    model.filterEntryKind,
    model.filterFrom,
    model.filterTo,
    model.search,
    offices,
    settings,
  ]);

  const columns = useMemo(
    () => [
      {
        key: 'number',
        title: '№',
        sortable: true,
        render: (c: SalaryContract) => <span className={styles.nameCell}>{c.number}</span>,
      },
      {
        key: 'entryKind',
        title: 'Тип записи',
        render: (c: SalaryContract) => (
          <span
            className={`${styles.entryKindBadge} ${
              c.sourcePackageId ? styles.entryKindAuto : styles.entryKindManual
            }`}
            title={
              c.sourcePackageId
                ? 'Автоматическая запись — синхронизирована из раздела «Договоры»'
                : 'Ручная запись — внесена вручную или импортом'
            }
          >
            {c.sourcePackageId ? 'Авто' : 'Ручн.'}
          </span>
        ),
      },
      { key: 'officeName', title: 'Офис', sortable: true },
      { key: 'categoryName', title: 'Направление', sortable: true },
      {
        key: 'signedAt',
        title: 'Заключён',
        sortable: true,
        render: (c: SalaryContract) => formatDate(c.signedAt),
      },
      {
        key: 'closedAt',
        title: 'Закрыт',
        sortable: true,
        render: (c: SalaryContract) => formatDate(c.closedAt),
      },
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (c: SalaryContract) => c.customerName ?? '—',
      },
      {
        key: 'manager',
        title: 'Менеджер',
        render: (c: SalaryContract) => (
          <span>
            {c.managerName ?? '—'}
            {!c.managerHandled ? <span className={styles.badgeCommon}> общий</span> : null}
          </span>
        ),
      },
      {
        key: 'surveyorName',
        title: 'Замерщик',
        render: (c: SalaryContract) =>
          c.surveyorName ??
          (c.surveyorHandled ? '—' : <span className={styles.mutedCell}>без замера</span>),
      },
      {
        key: 'baseAmount',
        title: 'Стоимость договора',
        sortable: true,
        render: (c: SalaryContract) => (
          <span className={dpStyles.amountCell}>{formatMoney(c.baseAmount)}</span>
        ),
      },
      {
        key: 'extraBills',
        title: 'Доп. согл.',
        render: (c: SalaryContract) =>
          c.extraBills.length === 0 ? (
            <span className={dpStyles.muted}>—</span>
          ) : (
            <span className={styles.billsCell}>
              {c.extraBills.map((b) => (
                <span key={b.id} className={styles.billsEntry} title={b.note ?? undefined}>
                  <span className={styles.billsDate}>{formatDate(b.date)}</span>
                  <span>{formatMoney(b.amount)}</span>
                </span>
              ))}
            </span>
          ),
      },
      ...(canEdit
        ? [
            {
              key: 'actions',
              title: '',
              render: (c: SalaryContract) => (
                <div className={dpStyles.entryActions}>
                  <button
                    type="button"
                    className={dpStyles.editEntryBtn}
                    onClick={() => model.openEditModal(c)}
                    title="Исправить договор"
                    aria-label="Исправить договор"
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
                    data-admin-mutation
                    type="button"
                    className={dpStyles.deleteEntryBtn}
                    onClick={() => model.setDeleteTarget(c)}
                    title="Удалить договор"
                    aria-label="Удалить договор"
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
              ),
            },
          ]
        : []),
    ],
    [canEdit, model]
  );

  return (
    <div className={styles.tabSection}>
      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры договоров">
        <div className={cdHub.contractsListFiltersPanelHeader}>
          <button
            type="button"
            className={cdHub.contractsListFiltersPanelToggle}
            onClick={model.toggleFiltersCollapsed}
            aria-expanded={!model.filtersCollapsed}
            aria-controls={filtersContentId}
          >
            <span className={cdHub.contractsListFiltersPanelChevron} aria-hidden>
              {model.filtersCollapsed ? '▸' : '▾'}
            </span>
            <span className={cdHub.contractsListFiltersPanelTitle}>
              {model.filtersCollapsed ? 'Фильтры реестра' : 'Свернуть фильтры'}
            </span>
          </button>
          {model.filtersCollapsed ? (
            <button
              type="button"
              className={cdHub.contractsListFiltersPanelExpandLink}
              onClick={model.toggleFiltersCollapsed}
            >
              Изменить
            </button>
          ) : null}
        </div>

        {model.filtersCollapsed ? (
          <button
            type="button"
            className={cdHub.contractsListFiltersSummary}
            onClick={model.toggleFiltersCollapsed}
            aria-label="Развернуть фильтры договоров"
          >
            {filtersSummary.map((item) => (
              <span
                key={item.key}
                className={cdHub.contractsListFiltersSummaryChip}
                data-filter-key={item.key}
                title={item.label}
              >
                {item.label}
              </span>
            ))}
          </button>
        ) : (
          <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
            <div className={cdHub.contractsListFiltersStack}>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Тип записи">
                <span className={cdHub.contractsListChipRowLabel}>Тип записи</span>
                <button
                  type="button"
                  disabled={model.loading}
                  className={chipClass(!model.filterEntryKind)}
                  onClick={() => model.setEntryKindFilter('')}
                >
                  Все
                </button>
                <button
                  type="button"
                  disabled={model.loading}
                  className={chipClass(model.filterEntryKind === 'auto')}
                  onClick={() => model.setEntryKindFilter('auto')}
                >
                  Авто
                </button>
                <button
                  type="button"
                  disabled={model.loading}
                  className={chipClass(model.filterEntryKind === 'manual')}
                  onClick={() => model.setEntryKindFilter('manual')}
                >
                  Ручные
                </button>
              </div>

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Направление">
                <span className={cdHub.contractsListChipRowLabel}>Направление</span>
                <button
                  type="button"
                  disabled={model.loading}
                  className={chipClass(!model.filterCategoryId)}
                  onClick={() => model.setCategoryFilter('')}
                >
                  Все
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={model.loading}
                    className={chipClass(model.filterCategoryId === c.id)}
                    onClick={() => model.setCategoryFilter(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Офис">
                <span className={cdHub.contractsListChipRowLabel}>Офис</span>
                <button
                  type="button"
                  disabled={model.loading}
                  className={chipClass(!model.filterOfficeId)}
                  onClick={() => model.setOfficeFilter('')}
                >
                  Все
                </button>
                {offices.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={model.loading}
                    className={chipClass(model.filterOfficeId === o.id)}
                    onClick={() => model.setOfficeFilter(o.id)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListFilters}>
                <input
                  type="search"
                  placeholder="Поиск: № договора, заказчик, менеджер…"
                  value={model.search}
                  onChange={(e) => model.setSearch(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(model.search.trim())
                  )}
                  aria-label="Поиск по договорам"
                />
                <div className={cdHub.contractsListDateFilters}>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Заключён от</span>
                    <input
                      type="date"
                      value={model.filterFrom}
                      onChange={(e) => model.setFromFilter(e.target.value)}
                      disabled={model.loading}
                      className={filterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(model.filterFrom)
                      )}
                      aria-label="Дата заключения от"
                    />
                  </label>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>до</span>
                    <input
                      type="date"
                      value={model.filterTo}
                      onChange={(e) => model.setToFilter(e.target.value)}
                      disabled={model.loading}
                      className={filterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(model.filterTo)
                      )}
                      aria-label="Дата заключения до"
                    />
                  </label>
                </div>
                <select
                  value={model.limit}
                  onChange={(e) => model.setLimit(Number(e.target.value) as SalaryPageLimit)}
                  disabled={model.loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {SALARY_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} на странице
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={dpStyles.resetBtn}
                  onClick={model.resetFilters}
                  disabled={model.loading}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <DataTable
        data={model.items}
        columns={columns}
        keyExtractor={(c) => c.id}
        loading={model.loading}
        emptyMessage="Договоров нет — добавьте первый кнопкой «+ Договор» в шапке раздела"
        serverSidePagination
        pagination={{
          page: model.page,
          limit: model.limit,
          total: model.total,
          onPageChange: model.setPage,
        }}
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
        getRowClassName={(c) => (c.managerHandled ? undefined : styles.rowCommon)}
      />

      <ContractFormModal
        isOpen={model.modalOpen}
        onClose={model.closeModal}
        contract={model.editing}
        offices={offices}
        categories={modalCategories}
        users={users}
        saving={model.saving}
        onSubmit={(input) => void model.handleSubmit(input)}
      />

      <ConfirmModal
        isOpen={model.deleteTarget != null}
        onClose={() => model.setDeleteTarget(null)}
        onConfirm={() => void model.handleDelete()}
        title="Удалить договор"
        message={
          model.deleteTarget
            ? `Договор №${model.deleteTarget.number} (${model.deleteTarget.categoryName}, стоимость ${formatMoney(model.deleteTarget.baseAmount)}) будет удалён безвозвратно. Продолжить?`
            : ''
        }
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={model.deleting}
      />
    </div>
  );
}
