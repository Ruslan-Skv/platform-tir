'use client';

import { useId } from 'react';

import type { Office } from '@/shared/api/admin-crm';
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
  canEdit: boolean;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Вкладка «Расчёт за период»: фонды, итоги по офисам/сотрудникам, договоры в расчёте. */
export function SalaryCalcView({ model, offices, canEdit }: CalcViewProps) {
  const { isSnapshot } = model;
  const shown = model.activeSettlement?.snapshot ?? model.result;
  const filtersContentId = useId();

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
  ];

  return (
    <div className={styles.tabSection}>
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
          Задайте период и офис, затем нажмите «Рассчитать» в шапке раздела. Договоры для расчёта
          заполняются на вкладке «Договоры».
        </div>
      ) : (
        <>
          <CalcTotalsRow result={shown} />
          <FundsTable result={shown} />
          <OfficesTable result={shown} />
          <PeopleTables result={shown} />
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

/** Плитки итогов: фонды к выплате за вычетом налога и статистика периода. */
function CalcTotalsRow({ result }: { result: SalaryCalcResult }) {
  const { totals, settings, vsByCategory } = result;
  const netTotal =
    totals.brigadierTotalNet +
    totals.surveyorFundNet +
    totals.managerPersonalNet +
    vsByCategory.reduce((sum, v) => sum + v.net, 0);
  const managerContracts = result.byManager.reduce((sum, m) => sum + m.contractsCount, 0);

  return (
    <div className={dpStyles.totalsRow} aria-label="Итоги расчёта за период">
      <div
        className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}
        title={`Все фонды к выплате за вычетом налога ${formatPercent(settings.taxPercent)}`}
      >
        <span className={dpStyles.totalsTileLabel}>К выплате всего</span>
        <strong className={dpStyles.totalsTileValue}>{formatMoney(netTotal)}</strong>
        <span className={dpStyles.totalsTileCash}>
          договоров в расчёте: {totals.contractsCount}
        </span>
      </div>
      <div
        className={dpStyles.totalsTile}
        title={`Бригадирский фонд: бригада ${formatPercent(totals.brigadierFund)}${
          settings.commonPoolToBrigadier ? ' + общий пул' : ''
        }; делёж по коэффициенту ${settings.brigadeSplitCoeff}`}
      >
        <span className={dpStyles.totalsTileLabel}>Бригадирский фонд</span>
        <span className={dpStyles.totalsTileValueRow}>
          <strong className={dpStyles.totalsTileValue}>
            {formatMoney(totals.brigadierTotalNet)}
          </strong>
        </span>
        <span className={dpStyles.totalsTileCash}>
          1-й: {formatMoneyShort(totals.brigadier1Share * settings.netFactor)} · 2-й:{' '}
          {formatMoneyShort(totals.brigadier2Share * settings.netFactor)}
        </span>
      </div>
      {vsByCategory.map((v) => (
        <div
          key={v.categoryId}
          className={dpStyles.totalsTile}
          title={`Ведущие специалисты категории «${v.categoryName}»: начислено ${formatMoney(v.gross)}`}
        >
          <span className={dpStyles.totalsTileLabel}>ВС — {v.categoryName}</span>
          <span className={dpStyles.totalsTileValueRow}>
            <strong className={dpStyles.totalsTileValue}>{formatMoney(v.net)}</strong>
            <span className={dpStyles.totalsTilePercent}>{formatPercent(v.vsPercent)}</span>
          </span>
        </div>
      ))}
      <div className={dpStyles.totalsTile} title="Личные начисления замерщиков по замерам">
        <span className={dpStyles.totalsTileLabel}>Фонд замерщиков</span>
        <span className={dpStyles.totalsTileValueRow}>
          <strong className={dpStyles.totalsTileValue}>
            {formatMoney(totals.surveyorFundNet)}
          </strong>
        </span>
      </div>
      <div
        className={dpStyles.totalsTile}
        title="Личные начисления менеджеров по разобранным договорам"
      >
        <span className={dpStyles.totalsTileLabel}>Менеджеры (личные)</span>
        <span className={dpStyles.totalsTileValueRow}>
          <strong className={dpStyles.totalsTileValue}>
            {formatMoney(totals.managerPersonalNet)}
          </strong>
        </span>
        <span className={dpStyles.totalsTileCash}>разобрано договоров: {managerContracts}</span>
      </div>
      <div
        className={dpStyles.totalsTile}
        title={
          settings.commonPoolToBrigadier
            ? '«Общие» договоры ×2 — включены в бригадирский фонд'
            : '«Общие» договоры ×2 — не включены в фонды'
        }
      >
        <span className={dpStyles.totalsTileLabel}>Общий пул</span>
        <span className={dpStyles.totalsTileValueRow}>
          <strong className={dpStyles.totalsTileValue}>{formatMoney(totals.commonPool)}</strong>
        </span>
        <span className={dpStyles.totalsTileCash}>
          {settings.commonPoolToBrigadier ? '→ в бригадирский фонд' : 'не включён в фонды'}
        </span>
      </div>
      <div className={dpStyles.totalsTile} title="Статистика договоров за период">
        <span className={dpStyles.totalsTileLabel}>Заключено / закрыто</span>
        <span className={dpStyles.totalsTileValueRow}>
          <strong className={dpStyles.totalsTileValue}>
            {totals.stats.signedCount} / {totals.stats.closedCount}
          </strong>
        </span>
        <span className={dpStyles.totalsTileCash}>
          {formatMoneyShort(totals.stats.signedAmount)} /{' '}
          {formatMoneyShort(totals.stats.closedAmount)}
        </span>
      </div>
    </div>
  );
}

/** Детализация фондов — аналог листа «Д» таблицы. */
function FundsTable({ result }: { result: SalaryCalcResult }) {
  const { totals, settings } = result;
  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>
        Детализация фондов за {formatDate(result.period.from)} — {formatDate(result.period.to)}
      </h2>
      <DataTable
        data={[
          {
            id: 'brigadier',
            name: 'Бригадирский фонд (общий)',
            gross: totals.brigadierTotal,
            net: totals.brigadierTotalNet,
            comment: `бригада ${formatPercent(totals.brigadierFund)}${
              settings.commonPoolToBrigadier ? ' + общий пул' : ''
            }`,
            kind: 'total' as const,
          },
          {
            id: 'brigadier1',
            name: '— 1-й бригадир',
            gross: totals.brigadier1Share,
            net: totals.brigadier1Share * settings.netFactor,
            comment: `делёж по коэффициенту ${settings.brigadeSplitCoeff}`,
            kind: 'part' as const,
          },
          {
            id: 'brigadier2',
            name: '— 2-й бригадир',
            gross: totals.brigadier2Share,
            net: totals.brigadier2Share * settings.netFactor,
            comment: `ставки: ${formatPercent(settings.brigadier1Percent)} / ${formatPercent(settings.brigadier2Percent)}`,
            kind: 'part' as const,
          },
          ...result.vsByCategory.map((v) => ({
            id: `vs-${v.categoryId}`,
            name: `ВС — ${v.categoryName}`,
            gross: v.gross,
            net: v.net,
            comment: `ставка ВС ${formatPercent(v.vsPercent)}`,
            kind: 'total' as const,
          })),
          {
            id: 'surveyor',
            name: 'Фонд замерщиков',
            gross: totals.surveyorFund,
            net: totals.surveyorFundNet,
            comment: 'личные начисления по замерам',
            kind: 'total' as const,
          },
          {
            id: 'manager',
            name: 'Менеджеры (личные начисления)',
            gross: totals.managerPersonalTotal,
            net: totals.managerPersonalNet,
            comment: 'разобранные договоры; неразобранные — в общем пуле',
            kind: 'total' as const,
          },
          {
            id: 'common',
            name: 'Общий пул («общие» договоры ×2)',
            gross: totals.commonPool,
            net: null,
            comment: settings.commonPoolToBrigadier
              ? 'включён в бригадирский фонд'
              : 'не включён в фонды',
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
            key: 'gross',
            title: 'Начислено',
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.gross)}</span>,
          },
          {
            key: 'net',
            title: `К выплате (− налог ${formatPercent(settings.taxPercent)})`,
            render: (r) =>
              r.net === null ? (
                <span className={dpStyles.muted}>—</span>
              ) : (
                <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                  {formatMoney(r.net)}
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
  commonPool: number;
  signed: string;
  closed: string;
  kind: 'cat' | 'total';
};

/** Разрез офис × категория с итогами по офису. */
function OfficesTable({ result }: { result: SalaryCalcResult }) {
  if (result.byOffice.length === 0) return null;
  const rows: OfficeRow[] = result.byOffice.flatMap((office) => [
    ...office.byCategory.map<OfficeRow>((cat) => ({
      id: `${office.officeId}-${cat.categoryId}`,
      officeName: office.officeName,
      categoryName: cat.categoryName,
      vsAmount: cat.vsAmount,
      brigadierAmount: cat.brigadierAmount,
      commonPool: cat.commonPool,
      signed: `${cat.signedCount} / ${formatMoneyShort(cat.signedAmount)}`,
      closed: `${cat.closedCount} / ${formatMoneyShort(cat.closedAmount)}`,
      kind: 'cat',
    })),
    {
      id: `${office.officeId}-total`,
      officeName: office.officeName,
      categoryName: 'Итого',
      vsAmount: office.totals.vsAmount,
      brigadierAmount: office.totals.brigadierAmount,
      commonPool: office.totals.commonPool,
      signed: `договоров: ${office.byCategory.reduce((s, c) => s + c.contractsCount, 0)}`,
      closed: '—',
      kind: 'total',
    },
  ]);

  return (
    <div className={styles.tableBlock}>
      <h2 className={styles.sectionTitle}>По офисам и категориям</h2>
      <DataTable
        data={rows}
        columns={[
          { key: 'officeName', title: 'Офис', sortable: true },
          { key: 'categoryName', title: 'Категория' },
          {
            key: 'vsAmount',
            title: 'ВС',
            sortable: true,
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.vsAmount)}</span>,
          },
          {
            key: 'brigadierAmount',
            title: 'Бригада',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(r.brigadierAmount)}</span>
            ),
          },
          {
            key: 'commonPool',
            title: 'Общий пул',
            sortable: true,
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.commonPool)}</span>,
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

/** Личные начисления менеджерам и замерщикам. */
function PeopleTables({ result }: { result: SalaryCalcResult }) {
  if (result.byManager.length === 0 && result.bySurveyor.length === 0) return null;
  const netFactor = result.settings.netFactor;
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
                title: 'Начислено',
                sortable: true,
                render: (m) => <span className={dpStyles.amountCell}>{formatMoney(m.amount)}</span>,
              },
              {
                key: 'net',
                title: 'К выплате',
                render: (m) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(m.amount * netFactor)}
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
                title: 'Начислено',
                sortable: true,
                render: (s) => <span className={dpStyles.amountCell}>{formatMoney(s.amount)}</span>,
              },
              {
                key: 'net',
                title: 'К выплате',
                render: (s) => (
                  <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
                    {formatMoney(s.amount * netFactor)}
                  </span>
                ),
              },
            ]}
            keyExtractor={(s) => s.rowKey}
            emptyMessage="Нет начислений"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Договоры, вошедшие в расчёт. */
function ContractsTable({ result }: { result: SalaryCalcResult }) {
  if (result.rows.length === 0) return null;
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
          { key: 'officeName', title: 'Офис', sortable: true },
          { key: 'categoryName', title: 'Категория', sortable: true },
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
            title: 'База',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>
                {formatMoney(r.baseAmount)}
                {r.extraBillsAmount !== 0 ? (
                  <span className={styles.subline}>
                    {' '}
                    +{formatMoneyShort(r.extraBillsAmount)} дс
                  </span>
                ) : null}
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
              <span className={dpStyles.amountCell}>{formatMoney(r.surveyorAmount)}</span>
            ),
          },
          {
            key: 'vsAmount',
            title: 'ВС',
            sortable: true,
            render: (r) => <span className={dpStyles.amountCell}>{formatMoney(r.vsAmount)}</span>,
          },
          {
            key: 'brigadierAmount',
            title: 'Бригаде',
            sortable: true,
            render: (r) => (
              <span className={dpStyles.amountCell}>{formatMoney(r.brigadierAmount)}</span>
            ),
          },
          {
            key: 'note',
            title: 'Примечание',
            render: (r) => (
              <span className={styles.noteCell}>
                {!r.managerHandled ? (
                  <span className={styles.badgeCommon}>
                    общий ×2 → {formatMoneyShort(r.managerCommon)}
                  </span>
                ) : null}
                {!r.surveyorHandled && r.surveyorAmount > 0 ? (
                  <span className={styles.badgeCommon}>
                    без замера ×2 → {formatMoneyShort(r.surveyorCommon)}
                  </span>
                ) : null}
                {r.managerHandled && r.surveyorHandled ? (
                  <span className={styles.mutedCell}>{r.customerName ?? ''}</span>
                ) : null}
              </span>
            ),
          },
        ]}
        keyExtractor={(r) => r.id}
        getRowClassName={(r) => (r.managerHandled ? undefined : styles.rowCommon)}
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
