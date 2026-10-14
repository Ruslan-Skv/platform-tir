'use client';

import { useId, useMemo } from 'react';

import type { CrmUser, Office } from '@/shared/api/admin-crm';
import type { SalaryCalcResult, SalarySettlementListItem } from '@/shared/api/admin-salary';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import styles from './SalaryPage.module.css';
import type { SalaryCalcModel } from './hooks/useSalaryCalc';
import { formatDate, formatMoney, formatMoneyShort, formatPercent } from './salary-page.constants';

type CalcViewProps = {
  model: SalaryCalcModel;
  offices: Office[];
  users: CrmUser[];
  canEdit: boolean;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

function userName(user: CrmUser): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
}

/** Вкладка «Расчёт за период»: фонды, итоги по офисам/сотрудникам, договоры в расчёте. */
export function SalaryCalcView({ model, offices, users, canEdit }: CalcViewProps) {
  const { isSnapshot } = model;
  const shown = model.activeSettlement?.snapshot ?? model.result;
  const filtersContentId = useId();
  const sortedUsers = useMemo(
    () => users.slice().sort((a, b) => userName(a).localeCompare(userName(b))),
    [users]
  );
  const selectedEmployee = users.find((u) => u.id === model.employeeId) ?? null;

  const filtersSummary = [
    {
      key: 'period',
      label: `Период: ${formatDate(model.dateFrom)} — ${formatDate(model.dateTo)}`,
    },
    {
      key: 'office',
      label: model.officeId
        ? `Офис: ${offices.find((o) => o.id === model.officeId)?.name ?? '—'}`
        : 'Все офисы',
    },
    {
      key: 'employee',
      label: selectedEmployee ? `Сотрудник: ${userName(selectedEmployee)}` : 'Все сотрудники',
    },
  ];

  return (
    <div className={`${styles.tabSection}${isSnapshot ? ` ${styles.tabSectionSnapshot}` : ''}`}>
      {isSnapshot && model.activeSettlement ? (
        <div className={styles.snapshotBanner} role="status">
          <span>
            Зафиксированная ведомость за {formatDate(model.activeSettlement.dateFrom)} —{' '}
            {formatDate(model.activeSettlement.dateTo)} ·{' '}
            {model.activeSettlement.status === 'CONFIRMED' ? 'подтверждена' : 'черновик'}
          </span>
          <span className={styles.snapshotBannerActions}>
            {model.activeSettlement.status === 'DRAFT' && canEdit ? (
              <button
                data-admin-mutation
                type="button"
                className={styles.bannerBtn}
                onClick={() => void model.confirmSettlement(model.activeSettlement!.id)}
                disabled={model.saving}
              >
                Подтвердить
              </button>
            ) : null}
            {model.activeSettlement.status === 'DRAFT' && canEdit ? (
              <button
                data-admin-mutation
                type="button"
                className={styles.bannerBtnDanger}
                onClick={() => model.setDeleteTarget(model.activeSettlement!)}
                disabled={model.deleting}
              >
                Удалить черновик
              </button>
            ) : null}
            <button type="button" className={styles.bannerBtn} onClick={model.closeSettlement}>
              ← К живому расчёту
            </button>
          </span>
        </div>
      ) : null}

      <section className={cdHub.contractsListFiltersPanel} aria-label="Период расчёта зарплаты">
        <div className={cdHub.contractsListFiltersPanelHeader}>
          <button
            type="button"
            className={cdHub.contractsListFiltersPanelToggle}
            onClick={model.toggleFiltersCollapsed}
            aria-expanded={!model.filtersCollapsed}
            aria-controls={filtersContentId}
            disabled={isSnapshot}
          >
            <span className={cdHub.contractsListFiltersPanelChevron} aria-hidden>
              {model.filtersCollapsed ? '▸' : '▾'}
            </span>
            <span className={cdHub.contractsListFiltersPanelTitle}>
              {model.filtersCollapsed ? 'Период и офис' : 'Свернуть'}
            </span>
          </button>
          {model.filtersCollapsed ? (
            <button
              type="button"
              className={cdHub.contractsListFiltersPanelExpandLink}
              onClick={model.toggleFiltersCollapsed}
              disabled={isSnapshot}
            >
              Изменить
            </button>
          ) : null}
        </div>

        {model.filtersCollapsed ? (
          <div className={cdHub.contractsListFiltersSummary}>
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
          </div>
        ) : (
          <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
            <div className={cdHub.contractsListFiltersStack}>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Офис">
                <span className={cdHub.contractsListChipRowLabel}>Офис</span>
                <button
                  type="button"
                  disabled={isSnapshot}
                  className={chipClass(!model.officeId)}
                  onClick={() => model.setOfficeId('')}
                >
                  Все
                </button>
                {offices.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={isSnapshot}
                    className={chipClass(model.officeId === o.id)}
                    onClick={() => model.setOfficeId(o.id)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Быстрый период">
                <span className={cdHub.contractsListChipRowLabel}>Период</span>
                <button
                  type="button"
                  disabled={isSnapshot}
                  className={cdHub.contractsListChip}
                  onClick={() => model.setPeriod('month')}
                >
                  Текущий месяц
                </button>
                <button
                  type="button"
                  disabled={isSnapshot}
                  className={cdHub.contractsListChip}
                  onClick={() => model.setPeriod('prevMonth')}
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
                      value={model.dateFrom}
                      onChange={(e) => model.setDateFrom(e.target.value)}
                      disabled={isSnapshot}
                      className={filterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(model.dateFrom)
                      )}
                      aria-label="Дата начала периода"
                    />
                  </label>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>по</span>
                    <input
                      type="date"
                      value={model.dateTo}
                      onChange={(e) => model.setDateTo(e.target.value)}
                      disabled={isSnapshot}
                      className={filterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(model.dateTo)
                      )}
                      aria-label="Дата конца периода"
                    />
                  </label>
                </div>
                <select
                  value={model.employeeId}
                  onChange={(e) => model.setEmployeeId(e.target.value)}
                  disabled={isSnapshot}
                  className={filterFieldClass(cdHub.contractsListSelect, Boolean(model.employeeId))}
                  aria-label="Сотрудник"
                >
                  <option value="">Все сотрудники</option>
                  {sortedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userName(u)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={dpStyles.resetBtn}
                  onClick={model.resetFilters}
                  disabled={isSnapshot}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {!shown ? (
        <div className={styles.hintBlock}>
          {model.loading
            ? 'Расчёт…'
            : 'Укажите период — расчёт выполнится автоматически. Договоры для расчёта заполняются на вкладке «Договоры».'}
        </div>
      ) : (
        <>
          <EmployeeTotalsRow result={shown} />
          <FundsTable result={shown} />
          <OfficesTable result={shown} />
          <PeopleTables result={shown} />
          <SalariesTable result={shown} />
          <ContractsTable result={shown} />
        </>
      )}

      <SettlementsTable model={model} canEdit={canEdit} />

      <ConfirmModal
        isOpen={model.deleteTarget != null}
        onClose={() => model.setDeleteTarget(null)}
        onConfirm={() => void model.handleDeleteSettlement()}
        title="Удалить черновик ведомости"
        message={
          model.deleteTarget
            ? `Черновик ведомости за ${formatDate(model.deleteTarget.dateFrom)} — ${formatDate(model.deleteTarget.dateTo)} будет удалён безвозвратно. Продолжить?`
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

type EmployeeTotalsRowItem = {
  key: string;
  name: string;
  manager: number;
  surveyor: number;
  brigadier: number;
  vs: number;
  salary: number;
  bonus: number;
  gross: number;
};

/** Разрез плиток итогов по сотрудникам: личные начисления + фонды бригадира и ВС. */
function employeeTotalsRows(result: SalaryCalcResult): EmployeeTotalsRowItem[] {
  const byKey = new Map<string, EmployeeTotalsRowItem>();
  const acc = (key: string, name: string): EmployeeTotalsRowItem => {
    const existing = byKey.get(key);
    if (existing) return existing;
    const created: EmployeeTotalsRowItem = {
      key,
      name,
      manager: 0,
      surveyor: 0,
      brigadier: 0,
      vs: 0,
      salary: 0,
      bonus: 0,
      gross: 0,
    };
    byKey.set(key, created);
    return created;
  };
  for (const m of result.byManager) {
    acc(m.managerId ?? `name:${m.managerName}`, m.managerName).manager += m.amount;
  }
  for (const s of result.bySurveyor) {
    acc(s.surveyorId ?? `name:${s.surveyorName}`, s.surveyorName).surveyor += s.amount;
  }
  if (result.brigadier?.userId && result.brigadier.total > 0) {
    acc(result.brigadier.userId, result.brigadier.userName ?? 'Бригадир').brigadier +=
      result.brigadier.total;
  }
  // Фонды ВС — получателям направлений из настроек з/п.
  for (const v of result.vsByCategory) {
    if (v.userId && v.gross > 0) {
      acc(v.userId, v.userName ?? 'Ведущий специалист').vs += v.gross;
    }
  }
  // Оклады за период — сотрудникам с установленным окладом.
  for (const s of result.salaries ?? []) {
    acc(s.userId, s.userName ?? 'Сотрудник').salary += s.amount;
  }
  // Премии за места по итогам продаж (журнал ДП).
  for (const b of result.salesBonuses ?? []) {
    acc(b.userId, b.userName ?? 'Менеджер').bonus += b.amount;
  }
  // Премии за выполнение плана продаж.
  for (const b of result.salesPlanBonuses ?? []) {
    acc(b.userId, b.userName ?? 'Менеджер').bonus += b.amount;
  }
  // Премии «QR + Н».
  for (const b of result.cashQrBonuses ?? []) {
    acc(b.userId, b.userName ?? 'Менеджер').bonus += b.amount;
  }
  return [...byKey.values()]
    .map((e) => ({ ...e, gross: e.manager + e.surveyor + e.brigadier + e.vs + e.salary + e.bonus }))
    .filter((e) => e.gross > 0)
    .sort((a, b) => b.gross - a.gross);
}

/** Части, из которых сложилась з/п сотрудника: оклад первой строкой, далее роли. */
function employeePartsList(
  e: EmployeeTotalsRowItem,
  netFactor: number,
  penalty = 0,
  autoClosePenalty = 0,
  truancyDeduction = 0
): string[] {
  const part = (v: number) => Math.round(v * netFactor * 100) / 100;
  const retention = penalty + autoClosePenalty + truancyDeduction;
  return [
    e.salary > 0 ? `оклад ${formatMoneyShort(e.salary)}` : null,
    e.salary > 0 && retention > 0 ? `удержание −${formatMoneyShort(retention)}` : null,
    e.bonus > 0 ? `премия ${formatMoneyShort(e.bonus)}` : null,
    e.manager > 0 ? `менеджер ${formatMoneyShort(e.manager)}` : null,
    e.surveyor > 0 ? `замеры ${formatMoneyShort(part(e.surveyor))}` : null,
    e.vs > 0 ? `ВС ${formatMoneyShort(part(e.vs))}` : null,
    e.brigadier > 0 ? `бригадир ${formatMoneyShort(part(e.brigadier))}` : null,
  ].filter((p): p is string => !!p);
}

/** Итог сотрудника к выплате: з/п менеджера — целиком, остальные роли — за вычетом налога. */
function employeePayout(e: EmployeeTotalsRowItem, netFactor: number): number {
  const part = (v: number) => Math.round(v * netFactor * 100) / 100;
  return e.manager + part(e.surveyor) + part(e.vs) + part(e.brigadier) + e.salary + e.bonus;
}

/** Плитки итогов по сотрудникам: к выплате по всем ролям. */
function EmployeeTotalsRow({ result }: { result: SalaryCalcResult }) {
  const { totals, settings } = result;
  const netTotal =
    totals.brigadierTotalNet +
    totals.surveyorFundNet +
    totals.managerPersonalNet +
    result.vsByCategory.reduce((sum, v) => sum + v.net, 0) +
    (totals.salariesTotal ?? 0) +
    (totals.salesBonusesTotal ?? 0) +
    (totals.salesPlanBonusesTotal ?? 0) +
    (totals.cashQrBonusesTotal ?? 0);
  const employees = employeeTotalsRows(result);

  return (
    <div className={dpStyles.totalsRow} aria-label="Итоги по сотрудникам за период">
      <div
        className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}
        title="Все начисления к выплате за период"
      >
        <span className={dpStyles.totalsTileLabel}>К выплате всего</span>
        <strong className={dpStyles.totalsTileValue}>{formatMoney(netTotal)}</strong>
        <span className={dpStyles.totalsTileCash}>сотрудников: {employees.length}</span>
      </div>
      {employees.map((e) => {
        const salaryRow = (result.salaries ?? []).find((s) => s.userId === e.key);
        const penalty = salaryRow?.penalty ?? 0;
        const autoClosePenalty = salaryRow?.autoClosePenalty ?? 0;
        const truancyDeduction = salaryRow?.truancyDeduction ?? 0;
        const parts = employeePartsList(
          e,
          settings.netFactor,
          penalty,
          autoClosePenalty,
          truancyDeduction
        );
        return (
          <div key={e.key} className={dpStyles.totalsTile} title={parts.join(' · ')}>
            <span className={dpStyles.totalsTileLabel}>{e.name}</span>
            <span className={dpStyles.totalsTileValueRow}>
              <strong className={dpStyles.totalsTileValue}>
                {formatMoney(employeePayout(e, settings.netFactor))}
              </strong>
            </span>
            <span className={`${dpStyles.totalsTileCash} ${styles.tilePartsColumn}`}>
              {parts.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Детализация фондов — аналог листа «Д» таблицы; суммы сразу к выплате. */
function FundsTable({ result }: { result: SalaryCalcResult }) {
  const { totals, settings } = result;

  // З/п замерщиков в разрезе направлений (считаем из договоров расчёта).
  const surveyorAggs = new Map<string, { gross: number; surveyors: Set<string> }>();
  for (const r of result.rows) {
    if (r.surveyorAmount === 0) continue;
    const agg = surveyorAggs.get(r.categoryId) ?? { gross: 0, surveyors: new Set<string>() };
    agg.gross = Math.round((agg.gross + r.surveyorAmount) * 100) / 100;
    if (r.surveyorName) agg.surveyors.add(r.surveyorName);
    surveyorAggs.set(r.categoryId, agg);
  }
  const surveyorRow = (categoryId: string, categoryName: string) => {
    const agg = surveyorAggs.get(categoryId);
    const names = agg ? [...agg.surveyors].sort((a, b) => a.localeCompare(b)) : [];
    return {
      id: `surveyor-${categoryId}`,
      name: `Замеры (${categoryName})`,
      amount: Math.round((agg?.gross ?? 0) * settings.netFactor * 100) / 100,
      comment: names.length > 0 ? `замерщики: ${names.join(', ')}` : 'замеров в периоде не было',
      kind: 'total' as const,
    };
  };
  // Замеры по ремонту показываем всегда — сразу после бригадира.
  const repairCategory = result.vsByCategory.find((v) => v.categoryCode === 'REPAIR');

  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>
        Детализация фондов за {formatDate(result.period.from)} — {formatDate(result.period.to)}
      </h2>
      <DataTable
        data={[
          {
            id: 'brigadier',
            name: 'Бригадир (без замеров)',
            amount: totals.brigadierTotalNet,
            comment: `получатель: ${result.brigadier?.userName ?? 'не назначен в настройках'}`,
            kind: 'total' as const,
          },
          ...(repairCategory
            ? [surveyorRow(repairCategory.categoryId, repairCategory.categoryName)]
            : []),
          ...result.vsByCategory.map((v) => ({
            id: `vs-${v.categoryId}`,
            name: `ВС — ${v.categoryName}`,
            amount: v.net,
            comment: `ставка ВС ${formatPercent(v.vsPercent)} · получатель: ${
              v.userName ?? 'не назначен'
            }`,
            kind: 'total' as const,
          })),
          ...result.vsByCategory
            .filter((v) => v.categoryCode !== 'REPAIR' && surveyorAggs.has(v.categoryId))
            .map((v) => surveyorRow(v.categoryId, v.categoryName)),
          {
            id: 'manager',
            name: 'Менеджеры',
            amount: totals.managerPersonalTotal,
            comment: 'личные начисления по договорам',
            kind: 'total' as const,
          },
        ]}
        columns={[
          {
            key: 'name',
            title: 'Фонд / получатель',
            render: (r) => <span className={styles.nameCell}>{r.name}</span>,
          },
          {
            key: 'amount',
            title: 'К выплате',
            render: (r) => (
              <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                {formatMoney(r.amount)}
              </span>
            ),
          },
          {
            key: 'comment',
            title: 'Комментарий',
            render: (r) => <span className={styles.mutedCell}>{r.comment}</span>,
          },
        ]}
        keyExtractor={(r) => r.id}
        getRowClassName={(r) => (r.kind === 'total' ? styles.rowStrong : styles.rowIndented)}
        emptyMessage="Нет данных"
      />
    </div>
  );
}

type OfficeRow = {
  id: string;
  officeName: string;
  categoryName: string;
  vsAmount: number;
  brigadierAmount: number;
  signed: string;
  closed: string;
  kind: 'cat' | 'total';
};

/** Разрез офис × направление с итогами по офису; суммы к выплате. */
function OfficesTable({ result }: { result: SalaryCalcResult }) {
  if (result.byOffice.length === 0) return null;
  const toNet = (value: number) => Math.round(value * result.settings.netFactor * 100) / 100;
  const rows: OfficeRow[] = result.byOffice.flatMap((office) => [
    ...office.byCategory.map<OfficeRow>((cat) => ({
      id: `${office.officeId}-${cat.categoryId}`,
      officeName: office.officeName,
      categoryName: cat.categoryName,
      vsAmount: toNet(cat.vsAmount),
      brigadierAmount: toNet(cat.brigadierAmount),
      signed: `${cat.signedCount} / ${formatMoneyShort(cat.signedAmount)}`,
      closed: `${cat.closedCount} / ${formatMoneyShort(cat.closedAmount)}`,
      kind: 'cat',
    })),
    {
      id: `${office.officeId}-total`,
      officeName: office.officeName,
      categoryName: 'Итого',
      vsAmount: toNet(office.totals.vsAmount),
      brigadierAmount: toNet(office.totals.brigadierAmount),
      signed: `договоров: ${office.byCategory.reduce((s, c) => s + c.contractsCount, 0)}`,
      closed: '—',
      kind: 'total',
    },
  ]);

  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>По офисам и направлениям</h2>
      <DataTable
        data={rows}
        columns={[
          { key: 'officeName', title: 'Офис', sortable: true },
          { key: 'categoryName', title: 'Направление' },
          {
            key: 'vsAmount',
            title: 'ВС',
            sortable: true,
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.vsAmount)}</span>,
          },
          {
            key: 'brigadierAmount',
            title: 'Бригадир',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(r.brigadierAmount)}</span>
            ),
          },
          {
            key: 'signed',
            title: 'Заключено',
            render: (r) => <span className={styles.numCell}>{r.signed}</span>,
          },
          {
            key: 'closed',
            title: 'Закрыто',
            render: (r) => <span className={styles.numCell}>{r.closed}</span>,
          },
        ]}
        keyExtractor={(r) => r.id}
        getRowClassName={(r) => (r.kind === 'total' ? styles.rowStrong : undefined)}
        emptyMessage="Нет данных по офисам"
      />
    </div>
  );
}

/** Личные начисления менеджерам, замерщикам, ведущим специалистам и бригадиру. */
function PeopleTables({ result }: { result: SalaryCalcResult }) {
  const hasPersonal = result.byManager.length > 0 || result.bySurveyor.length > 0;
  const brigadier = result.brigadier?.userId ? result.brigadier : null;
  // В старых зафиксированных ведомостях разреза по ведущим специалистам нет.
  const leadSpecialists = result.byLeadSpecialist ?? [];
  if (!hasPersonal && !brigadier && leadSpecialists.length === 0) return null;
  const netFactor = result.settings.netFactor;
  // Договоры, из которых сложился бригадирский фонд (с процентом бригадира).
  const brigadierContracts = result.rows.filter((r) => r.brigadierAmount > 0).length;
  return (
    <div className={styles.tablesRow}>
      {result.byManager.length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Менеджеры (личные начисления)</h2>
          <DataTable
            data={result.byManager.map((m, i) => ({ ...m, rowKey: m.managerId ?? `name-${i}` }))}
            columns={[
              {
                key: 'managerName',
                title: 'Менеджер',
                sortable: true,
                render: (m) => <span className={styles.nameCell}>{m.managerName}</span>,
              },
              {
                key: 'contractsCount',
                title: 'Договоров',
                sortable: true,
                render: (m) => <span className={styles.numCell}>{m.contractsCount}</span>,
              },
              {
                key: 'amount',
                title: 'К выплате',
                sortable: true,
                render: (m) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(m.amount)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(m) => m.rowKey}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {result.bySurveyor.length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Замерщики</h2>
          <DataTable
            data={result.bySurveyor.map((s, i) => ({ ...s, rowKey: s.surveyorId ?? `name-${i}` }))}
            columns={[
              {
                key: 'surveyorName',
                title: 'Замерщик',
                sortable: true,
                render: (s) => <span className={styles.nameCell}>{s.surveyorName}</span>,
              },
              {
                key: 'contractsCount',
                title: 'Замеров',
                sortable: true,
                render: (s) => <span className={styles.numCell}>{s.contractsCount}</span>,
              },
              {
                key: 'amount',
                title: 'К выплате',
                sortable: true,
                render: (s) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(Math.round(s.amount * netFactor * 100) / 100)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(s) => s.rowKey}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {leadSpecialists.length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Ведущие специалисты</h2>
          <DataTable
            data={leadSpecialists.map((ls) => ({
              ...ls,
              categoriesLine: ls.categories.join(', '),
            }))}
            columns={[
              {
                key: 'userName',
                title: 'Сотрудник',
                sortable: true,
                render: (ls) => <span className={styles.nameCell}>{ls.userName ?? '—'}</span>,
              },
              {
                key: 'categoriesLine',
                title: 'Направления',
                render: (ls) => <span className={styles.mutedCell}>{ls.categoriesLine}</span>,
              },
              {
                key: 'amountNet',
                title: 'К выплате',
                sortable: true,
                render: (ls) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(ls.amountNet)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(ls) => ls.userId}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {brigadier && brigadier.total > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Бригадир</h2>
          <DataTable
            data={[
              {
                id: brigadier.userId ?? 'brigadier',
                userName: brigadier.userName ?? '—',
                contractsCount: brigadierContracts,
                net: brigadier.totalNet,
              },
            ]}
            columns={[
              {
                key: 'userName',
                title: 'Сотрудник',
                render: (b) => <span className={styles.nameCell}>{b.userName}</span>,
              },
              {
                key: 'contractsCount',
                title: 'Договоров',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.contractsCount}</span>,
              },
              {
                key: 'net',
                title: 'К выплате',
                render: (b) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(b.net)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(b) => b.id}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {(result.salesBonuses ?? []).length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Премии за продажи (итоги ДП)</h2>
          <DataTable
            data={result.salesBonuses ?? []}
            columns={[
              {
                key: 'userName',
                title: 'Менеджер',
                sortable: true,
                render: (b) => <span className={styles.nameCell}>{b.userName ?? '—'}</span>,
              },
              {
                key: 'month',
                title: 'Месяц',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.month}</span>,
              },
              {
                key: 'place',
                title: 'Место',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.place}</span>,
              },
              {
                key: 'salesAmount',
                title: 'Продажи за месяц',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.salesAmount)}</span>
                ),
              },
              {
                key: 'amount',
                title: 'Премия',
                sortable: true,
                render: (b) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(b.amount)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(b) => `${b.userId}-${b.month}`}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {(result.salesPlanBonuses ?? []).length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Премии за план продаж</h2>
          <DataTable
            data={result.salesPlanBonuses ?? []}
            columns={[
              {
                key: 'userName',
                title: 'Менеджер',
                sortable: true,
                render: (b) => <span className={styles.nameCell}>{b.userName ?? '—'}</span>,
              },
              {
                key: 'month',
                title: 'Месяц',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.month}</span>,
              },
              {
                key: 'salesAmount',
                title: 'Продажи за месяц',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.salesAmount)}</span>
                ),
              },
              {
                key: 'reachedTiers',
                title: 'Порогов достигнуто',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.reachedTiers}</span>,
              },
              {
                key: 'baseAmount',
                title: 'З/п по договорам',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.baseAmount)}</span>
                ),
              },
              {
                key: 'percent',
                title: '% премии',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{formatPercent(b.percent)}</span>,
              },
              {
                key: 'amount',
                title: 'Премия',
                sortable: true,
                render: (b) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(b.amount)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(b) => `${b.userId}-${b.month}`}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
      {(result.cashQrBonuses ?? []).length > 0 ? (
        <div className={styles.tableBlock}>
          <h2 className={styles.sectionTitle}>Премии «QR + Н»</h2>
          <DataTable
            data={result.cashQrBonuses ?? []}
            columns={[
              {
                key: 'userName',
                title: 'Менеджер',
                sortable: true,
                render: (b) => <span className={styles.nameCell}>{b.userName ?? '—'}</span>,
              },
              {
                key: 'month',
                title: 'Месяц',
                sortable: true,
                render: (b) => <span className={styles.numCell}>{b.month}</span>,
              },
              {
                key: 'totalSales',
                title: 'Продажи всего',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.totalSales)}</span>
                ),
              },
              {
                key: 'terminalSales',
                title: 'Терминал',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.terminalSales)}</span>
                ),
              },
              {
                key: 'terminalShare',
                title: 'Доля терминала',
                sortable: true,
                render: (b) => (
                  <span className={styles.numCell}>{formatPercent(b.terminalShare)}</span>
                ),
              },
              {
                key: 'otherSales',
                title: 'Остальные продажи',
                sortable: true,
                render: (b) => (
                  <span className={dpStyles.amountCell}>{formatMoney(b.otherSales)}</span>
                ),
              },
              {
                key: 'amount',
                title: `Премия (${formatPercent(result.settings.cashQrBonusPercent ?? 0.5)})`,
                sortable: true,
                render: (b) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(b.amount)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(b) => `${b.userId}-${b.month}`}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Оклады за период — отдельным блоком на всю ширину. */
function SalariesTable({ result }: { result: SalaryCalcResult }) {
  if ((result.salaries ?? []).length === 0) return null;
  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>Оклады</h2>
      <DataTable
        data={result.salaries ?? []}
        columns={[
          {
            key: 'userName',
            title: 'Сотрудник',
            sortable: true,
            render: (s) => <span className={styles.nameCell}>{s.userName ?? '—'}</span>,
          },
          {
            key: 'monthlySalary',
            title: 'Оклад, ₽/мес',
            sortable: true,
            render: (s) => (
              <span className={dpStyles.amountCell}>{formatMoney(s.monthlySalary)}</span>
            ),
          },
          {
            key: 'days',
            title: 'Дней в периоде',
            sortable: true,
            render: (s) => <span className={styles.numCell}>{s.days}</span>,
          },
          {
            key: 'violationsCount',
            title: 'Нарушений режима',
            sortable: true,
            render: (s) => (
              <span className={styles.numCell}>
                {s.violationsCount
                  ? `${s.violationsCount} (−${formatMoneyShort(s.penalty ?? 0)})`
                  : '—'}
              </span>
            ),
          },
          {
            key: 'autoCloseCount',
            title: 'Автозакрытий',
            sortable: true,
            render: (s) => (
              <span className={styles.numCell}>
                {s.autoCloseCount
                  ? `${s.autoCloseCount} (−${formatMoneyShort(s.autoClosePenalty ?? 0)})`
                  : '—'}
              </span>
            ),
          },
          {
            key: 'truancyDays',
            title: 'Прогулов',
            sortable: true,
            render: (s) => (
              <span className={styles.numCell}>
                {s.truancyDays
                  ? `${s.truancyDays} (−${formatMoneyShort(s.truancyDeduction ?? 0)})`
                  : '—'}
              </span>
            ),
          },
          {
            key: 'amount',
            title: 'К выплате',
            sortable: true,
            render: (s) => (
              <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                {formatMoney(s.amount)}
              </span>
            ),
          },
        ]}
        keyExtractor={(s) => s.userId}
        emptyMessage="Нет начислений"
      />
    </div>
  );
}

/** Договоры, вошедшие в расчёт; суммы ролей — к выплате (у менеджера без вычета налога). */
function ContractsTable({ result }: { result: SalaryCalcResult }) {
  if (result.rows.length === 0) return null;
  // Налог удерживается со всех, кроме менеджеров.
  const toNet = (value: number) => Math.round(value * result.settings.netFactor * 100) / 100;
  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>Договоры в расчёте ({result.rows.length})</h2>
      <DataTable
        data={result.rows}
        columns={[
          {
            key: 'number',
            title: '№',
            sortable: true,
            render: (r) => <span className={styles.nameCell}>{r.number}</span>,
          },
          {
            key: 'customerName',
            title: 'Заказчик',
            render: (r) => (
              <span className={styles.noteCell}>
                {!r.surveyorHandled ? (
                  <span className={styles.mutedCell}>без замера — з/п за замер не считается</span>
                ) : (
                  <span className={styles.mutedCell}>{r.customerName ?? ''}</span>
                )}
              </span>
            ),
          },
          { key: 'officeName', title: 'Офис', sortable: true },
          { key: 'categoryName', title: 'Направление', sortable: true },
          {
            key: 'signedAt',
            title: 'Заключён',
            sortable: true,
            render: (r) => formatDate(r.signedAt),
          },
          {
            key: 'closedAt',
            title: 'Закрыт',
            sortable: true,
            render: (r) => formatDate(r.closedAt),
          },
          {
            key: 'baseAmount',
            title: 'Стоимость договора',
            sortable: true,
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.baseAmount)}</span>,
          },
          {
            key: 'extraBills',
            title: 'Доп. согл.',
            render: (r) =>
              r.extraBills.length === 0 ? (
                <span className={dpStyles.muted}>—</span>
              ) : (
                <span className={styles.billsCell}>
                  {r.extraBills.map((b, i) => (
                    <span key={i} className={styles.billsEntry}>
                      <span className={styles.billsDate}>{formatDate(b.date)}</span>
                      <span>{formatMoney(b.amount)}</span>
                    </span>
                  ))}
                </span>
              ),
          },
          {
            key: 'managerPercent',
            title: '% мен',
            render: (r) => formatPercent(r.percents.manager),
          },
          {
            key: 'managerAmount',
            title: 'Менеджеру',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(r.managerAmount)}</span>
            ),
          },
          {
            key: 'surveyorAmount',
            title: 'Замерщику',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(toNet(r.surveyorAmount))}</span>
            ),
          },
          {
            key: 'vsAmount',
            title: 'ВС',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(toNet(r.vsAmount))}</span>
            ),
          },
          {
            key: 'brigadierAmount',
            title: 'Бригадиру',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(toNet(r.brigadierAmount))}</span>
            ),
          },
        ]}
        keyExtractor={(r) => r.id}
        emptyMessage="Договоров в расчёте нет"
      />
    </div>
  );
}

/** Зафиксированные ведомости. */
function SettlementsTable({ model, canEdit }: { model: SalaryCalcModel; canEdit: boolean }) {
  if (model.settlements.length === 0) return null;
  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>Зафиксированные ведомости</h2>
      <DataTable
        data={model.settlements}
        columns={[
          {
            key: 'period',
            title: 'Период',
            render: (s: SalarySettlementListItem) =>
              `${formatDate(s.dateFrom)} — ${formatDate(s.dateTo)}`,
          },
          {
            key: 'status',
            title: 'Статус',
            render: (s: SalarySettlementListItem) => (
              <span
                className={`${styles.statusBadge} ${
                  s.status === 'CONFIRMED' ? styles.statusActive : styles.statusDraft
                }`}
              >
                {s.status === 'CONFIRMED' ? 'Подтверждена' : 'Черновик'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            title: 'Создана',
            sortable: true,
            render: (s: SalarySettlementListItem) => formatDate(s.createdAt.slice(0, 10)),
          },
          {
            key: 'createdByName',
            title: 'Кем',
            render: (s: SalarySettlementListItem) => s.createdByName ?? '—',
          },
          ...(canEdit
            ? [
                {
                  key: 'actions',
                  title: '',
                  render: (s: SalarySettlementListItem) => (
                    <div className={dpStyles.entryActions}>
                      <button
                        type="button"
                        className={styles.openSettlementBtn}
                        onClick={() => void model.openSettlement(s.id)}
                        title="Открыть зафиксированную ведомость"
                      >
                        Открыть
                      </button>
                      {s.status === 'DRAFT' ? (
                        <button
                          data-admin-mutation
                          type="button"
                          className={dpStyles.deleteEntryBtn}
                          onClick={() => model.setDeleteTarget(s)}
                          title="Удалить черновик ведомости"
                          aria-label="Удалить черновик ведомости"
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
                      ) : null}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        keyExtractor={(s: SalarySettlementListItem) => s.id}
        emptyMessage="Ведомостей нет"
      />
    </div>
  );
}
