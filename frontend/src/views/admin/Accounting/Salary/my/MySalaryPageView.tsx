'use client';

import type { ReactNode } from 'react';

import type { MySalaryResult } from '@/shared/api/accounting/admin-salary';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../SalaryPage.module.css';
import {
  formatDate,
  formatMoney,
  monthEndIso,
  monthStartIso,
  pluralContracts,
  prevMonthEndIso,
  prevMonthStartIso,
} from '../salary-page.constants';
import { MySalaryRulesInfoTip } from './MySalaryRulesInfoTip';
import type { MySalaryPageModel } from './hooks/useMySalaryPage';

type Props = {
  model: MySalaryPageModel;
};

/** Чип быстрого периода подсвечен, когда выбранный период совпадает с ним. */
function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

/** Поле фильтра подсвечено, когда в нём задано значение. */
function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Карточка роли в плитках итогов. */
function roleTile(
  key: string,
  label: string,
  amount: number,
  cash: string,
  title: string
): ReactNode {
  return (
    <div key={key} className={dpStyles.totalsTile} title={title}>
      <span className={dpStyles.totalsTileLabel}>{label}</span>
      <span className={dpStyles.totalsTileValueRow}>
        <strong className={dpStyles.totalsTileValue}>{formatMoney(amount)}</strong>
      </span>
      {cash ? <span className={dpStyles.totalsTileCash}>{cash}</span> : null}
    </div>
  );
}

/** Раздел «Моя з/п»: личные начисления за период и договоры, из которых они сложились. */
export function MySalaryPageView({ model }: Props) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, setPeriod, reload, result, loading, error } =
    model;

  const contractsTitle = result
    ? `${result.contracts.length} ${pluralContracts(result.contracts.length)}`
    : '';

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={loading}
        busy={loading}
        title="Обновить расчёт"
        aria-label={loading ? 'Обновление расчёта' : 'Обновить расчёт'}
        onClick={() => void reload()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Моя з/п</h1>
                <MySalaryRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={contractsTitle}>
                <span className={cdHub.contractsListCountDesktop}>{contractsTitle}</span>
                <span className={cdHub.contractsListCountMobile}>
                  {result?.contracts.length ?? 0}
                </span>
              </span>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {iconActions('desktop')}
        </div>
      </div>

      {error ? <div className={dpStyles.pageMessage}>{error}</div> : null}

      <section className={cdHub.contractsListFiltersPanel} aria-label="Период расчёта зарплаты">
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Быстрый период">
            <span className={cdHub.contractsListChipRowLabel}>Период</span>
            <button
              type="button"
              className={chipClass(dateFrom === monthStartIso() && dateTo === monthEndIso())}
              onClick={() => setPeriod('month')}
            >
              Текущий месяц
            </button>
            <button
              type="button"
              className={chipClass(
                dateFrom === prevMonthStartIso() && dateTo === prevMonthEndIso()
              )}
              onClick={() => setPeriod('prevMonth')}
            >
              Прошлый месяц
            </button>
          </div>

          <div className={cdHub.contractsListFilters}>
            <div className={cdHub.contractsListDateFilters}>
              <label className={cdHub.contractsListDateLabel}>
                <span className={cdHub.contractsListDateLabelText}>Период с</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateFrom))}
                  aria-label="Дата начала периода"
                />
              </label>
              <label className={cdHub.contractsListDateLabel}>
                <span className={cdHub.contractsListDateLabelText}>по</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateTo))}
                  aria-label="Дата конца периода"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {loading && !result ? (
        <div className={styles.hintBlock}>Расчёт…</div>
      ) : !result ? (
        <div className={styles.hintBlock}>
          Не удалось загрузить расчёт. Нажмите «Обновить», чтобы повторить.
        </div>
      ) : (
        <MySalaryBody result={result} />
      )}
    </div>
  );
}

/** Названия оснований удержаний из оклада. */
const DEDUCTION_KIND_LABELS: Record<string, string> = {
  LATE: 'Опоздание',
  EARLY_LEAVE: 'Уход раньше графика',
  AUTO_CLOSE: 'Автозакрытие рабочего дня',
  TRUANCY: 'Прогул',
};

function MySalaryBody({ result }: { result: MySalaryResult }) {
  const p = result.payouts;
  const roles: ReactNode[] = [];
  if (p.manager !== 0) {
    roles.push(
      roleTile(
        'manager',
        'Менеджер',
        p.manager,
        `договоров: ${p.managerContracts}`,
        'З/п менеджера по договорам (по ставке, без вычета налога)'
      )
    );
  }
  if (p.surveyor !== 0) {
    roles.push(
      roleTile(
        'surveyor',
        'Замеры',
        p.surveyor,
        `замеров: ${p.surveyorContracts}`,
        'З/п за замеры по договорам, где вы замерщик'
      )
    );
  }
  if (p.vs !== 0) {
    roles.push(
      roleTile(
        'vs',
        'ВС',
        p.vs,
        p.vsCategories.length > 0 ? p.vsCategories.join(', ') : '',
        'З/п ведущего специалиста по закреплённым за вами направлениям'
      )
    );
  }
  if (p.brigadier !== 0) {
    roles.push(roleTile('brigadier', 'Бригадир', p.brigadier, '', 'Бригадирский фонд'));
  }
  if ((p.salary ?? 0) !== 0) {
    roles.push(
      roleTile(
        'salary',
        'Оклад',
        p.salary ?? 0,
        '',
        'Оклад: за каждый день периода начисляется 1/N часть (N — дней в месяце)'
      )
    );
  }
  if ((p.bonus ?? 0) !== 0) {
    roles.push(
      roleTile(
        'bonus',
        'Премия за продажи',
        p.bonus ?? 0,
        '',
        'Премия за место по итогам продаж за прошедшие месяцы (журнал ДП)'
      )
    );
  }
  if ((p.planBonus ?? 0) !== 0) {
    roles.push(
      roleTile(
        'planBonus',
        'Премия за план',
        p.planBonus ?? 0,
        '',
        'Премия за достижение порогов плана продаж — % от з/п по договорам за месяц'
      )
    );
  }
  if ((p.cashQrBonus ?? 0) !== 0) {
    roles.push(
      roleTile(
        'cashQrBonus',
        'QR + Н',
        p.cashQrBonus ?? 0,
        '',
        'Премия, если продажи через терминал за месяц менее 50% — установленный % от остальных продаж'
      )
    );
  }

  return (
    <>
      <div className={dpStyles.totalsRow} aria-label="Моя з/п за период">
        <div
          className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}
          title={`К выплате за ${formatDate(result.period.from)} — ${formatDate(result.period.to)}`}
        >
          <span className={dpStyles.totalsTileLabel}>К выплате за период</span>
          <strong className={dpStyles.totalsTileValue}>{formatMoney(p.total)}</strong>
          <span className={dpStyles.totalsTileCash}>{result.employee.userName}</span>
        </div>
        {roles}
      </div>

      {(result.deductions?.length ?? 0) > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Удержания из оклада ({result.deductions!.length})</h2>
          <DataTable
            data={result.deductions!}
            columns={[
              {
                key: 'date',
                title: 'Дата',
                sortable: true,
                render: (d) => formatDate(d.date),
              },
              {
                key: 'kind',
                title: 'Основание',
                sortable: true,
                render: (d) => DEDUCTION_KIND_LABELS[d.kind] ?? d.kind,
              },
              {
                key: 'minutes',
                title: 'На сколько',
                render: (d) =>
                  d.minutes != null ? (
                    `${d.minutes} мин`
                  ) : d.kind === 'AUTO_CLOSE' ? (
                    <span className={styles.mutedCell}>день не закрыт вовремя</span>
                  ) : (
                    <span className={styles.mutedCell}>рабочий день</span>
                  ),
              },
              {
                key: 'amount',
                title: 'Удержание',
                sortable: true,
                render: (d) => (
                  <span className={dpStyles.amountCell}>−{formatMoney(d.amount)}</span>
                ),
              },
            ]}
            keyExtractor={(d) => `${d.date}|${d.kind}|${d.amount}`}
            emptyMessage="Удержаний нет"
          />
        </div>
      ) : null}

      {result.contracts.length === 0 ? (
        <div className={styles.hintBlock}>
          За период начислений нет — договоров с вашим участием не найдено.
        </div>
      ) : (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>
            Договоры в моём расчёте ({result.contracts.length})
          </h2>
          <DataTable
            data={result.contracts}
            columns={[
              {
                key: 'number',
                title: '№',
                sortable: true,
                render: (c) => <span className={styles.nameCell}>{c.number}</span>,
              },
              { key: 'categoryName', title: 'Направление', sortable: true },
              { key: 'officeName', title: 'Офис', sortable: true },
              {
                key: 'signedAt',
                title: 'Заключён',
                sortable: true,
                render: (c) => formatDate(c.signedAt),
              },
              {
                key: 'closedAt',
                title: 'Закрыт',
                sortable: true,
                render: (c) => formatDate(c.closedAt),
              },
              {
                key: 'baseAmount',
                title: 'Стоимость договора',
                sortable: true,
                render: (c) => (
                  <span className={dpStyles.amountCell}>{formatMoney(c.baseAmount)}</span>
                ),
              },
              {
                key: 'roles',
                title: 'Моя роль',
                sortable: true,
                render: (c) => (
                  <span className={styles.mutedCell}>{c.roles.join(' + ') || '—'}</span>
                ),
              },
              {
                key: 'payout',
                title: 'К выплате',
                sortable: true,
                render: (c) => (
                  <span
                    className={`${dpStyles.amountCell} ${styles.totalCell}`}
                    title={c.parts
                      .map((part) => `${part.role}: ${formatMoney(part.amount)}`)
                      .join('\n')}
                  >
                    {formatMoney(c.payout)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(c) => c.id}
            emptyMessage="Договоров в расчёте нет"
          />
        </div>
      )}
    </>
  );
}
