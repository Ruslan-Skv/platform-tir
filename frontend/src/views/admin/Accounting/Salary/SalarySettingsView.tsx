'use client';

import { useMemo } from 'react';

import type { SalaryCategory, SalarySettings } from '@/shared/api/accounting/admin-salary';
import type { CrmUser, Office } from '@/shared/api/admin-crm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';

import { SalaryCategoryModal } from './SalaryCategoryModal';
import styles from './SalaryPage.module.css';
import { SalaryRateRuleModal } from './SalaryRateRuleModal';
import type { SalarySettingsModel } from './hooks/useSalarySettings';
import { SALARY_ROLE_OPTIONS, formatPercent } from './salary-page.constants';

type SettingsViewProps = {
  model: SalarySettingsModel;
  offices: Office[];
  users: CrmUser[];
  settings: SalarySettings | null;
  settingsLoading: boolean;
};

function userName(user: CrmUser): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
}

/** Вкладка «Настройки» (только суперадмин): проценты, сплиты, налог, направления, правила по офисам. */
export function SalarySettingsView({
  model,
  offices,
  users,
  settings,
  settingsLoading,
}: SettingsViewProps) {
  const categories = settings?.categories ?? [];
  const sortedUsers = useMemo(
    () => users.slice().sort((a, b) => userName(a).localeCompare(userName(b))),
    [users]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Направление',
        sortable: true,
        render: (c: SalaryCategory) => (
          <span className={styles.nameCell}>
            {c.name} <span className={styles.mutedCell}>({c.code})</span>
          </span>
        ),
      },
      {
        key: 'vsPercent',
        title: '% ВС',
        sortable: true,
        render: (c: SalaryCategory) => formatPercent(c.vsPercent),
      },
      {
        key: 'split',
        title: 'Сплит закл./закр.',
        render: (c: SalaryCategory) => `${c.splitSign} / ${c.splitClose}`,
      },
      {
        key: 'managerPercent',
        title: '% менеджера',
        sortable: true,
        render: (c: SalaryCategory) => formatPercent(c.managerPercent),
      },
      {
        key: 'surveyorPercent',
        title: '% замерщика',
        sortable: true,
        render: (c: SalaryCategory) => formatPercent(c.surveyorPercent),
      },
      {
        key: 'brigadierPercent',
        title: '% бригадира',
        sortable: true,
        render: (c: SalaryCategory) => formatPercent(c.brigadierPercent),
      },
      {
        key: 'minPrepaidPercent',
        title: 'Мин. предоплата, %',
        sortable: true,
        render: (c: SalaryCategory) =>
          c.minPrepaidPercent > 0 ? formatPercent(c.minPrepaidPercent) : '—',
      },
      {
        key: 'isActive',
        title: 'Активна',
        sortable: true,
        render: (c: SalaryCategory) => (
          <span
            className={`${styles.statusBadge} ${c.isActive ? styles.statusActive : styles.statusInactive}`}
          >
            {c.isActive ? 'да' : 'нет'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '',
        render: (c: SalaryCategory) => (
          <div className={dpStyles.entryActions}>
            <button
              type="button"
              className={dpStyles.editEntryBtn}
              onClick={() => model.openEditCategoryModal(c)}
              title="Исправить направление"
              aria-label="Исправить направление"
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
              onClick={() => model.setDeleteCategoryTarget(c)}
              title="Удалить направление"
              aria-label="Удалить направление"
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
    ],
    [model]
  );

  if (settingsLoading && !settings) {
    return <div className={styles.hintBlock}>Загрузка настроек…</div>;
  }

  if (!settings) {
    return (
      <div className={styles.hintBlock}>
        Не удалось загрузить настройки расчёта з/п. Нажмите «Обновить» в шапке раздела, чтобы
        повторить.
      </div>
    );
  }

  return (
    <div className={styles.tabSection}>
      {/* Общие параметры */}
      <section className={styles.settingsPanel} aria-label="Общие параметры">
        <h2 className={styles.sectionTitle}>Общие параметры</h2>
        <div className={styles.settingsGridNumbers}>
          <label className={styles.settingsField}>
            <span>Налог из фондов, %</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.taxPercent}
              onChange={(e) => model.setGlobalForm((f) => ({ ...f, taxPercent: e.target.value }))}
              disabled={model.globalSaving}
            />
          </label>
        </div>
        <p className={styles.mutedCell}>
          Удерживается из фондов ВС, замерщиков и бригадира; з/п менеджеров не уменьшает.
        </p>
      </section>

      {/* Назначить исполнителя */}
      <section className={styles.settingsPanel} aria-label="Назначить исполнителя">
        <h2 className={styles.sectionTitle}>Назначить исполнителя</h2>
        <div className={styles.settingsGrid}>
          <label className={styles.settingsField}>
            <span>Бригадир</span>
            <select
              value={model.globalForm.brigadierUserId}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, brigadierUserId: e.target.value }))
              }
              disabled={model.globalSaving}
            >
              <option value="">— не назначен —</option>
              {sortedUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </label>
          {categories.map((category) => (
            <label key={category.id} className={styles.settingsField}>
              <span>
                ВС — {category.name}
                {!category.isActive ? ' (неактивно)' : ''}
              </span>
              <select
                value={model.globalForm.leadSpecialistUserIds[category.id] ?? ''}
                onChange={(e) =>
                  model.setGlobalForm((f) => ({
                    ...f,
                    leadSpecialistUserIds: {
                      ...f.leadSpecialistUserIds,
                      [category.id]: e.target.value,
                    },
                  }))
                }
                disabled={model.globalSaving}
              >
                <option value="">— не назначен —</option>
                {sortedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userName(u)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className={styles.mutedCell}>
          Бригадир получает бригадирский фонд; ведущий специалист (ВС) — з/п ВС по своему
          направлению.
        </p>
      </section>

      {/* Контроль дисциплины */}
      <section className={styles.settingsPanel} aria-label="Контроль дисциплины">
        <h2 className={styles.sectionTitle}>Контроль дисциплины</h2>
        <label className={styles.settingsCheckbox}>
          <input
            type="checkbox"
            checked={model.globalForm.workModeEnforced}
            onChange={(e) =>
              model.setGlobalForm((f) => ({ ...f, workModeEnforced: e.target.checked }))
            }
            disabled={model.globalSaving}
          />
          <span>
            Контролировать режим работы — за каждое опоздание или убытие раньше графика (сверх
            согласованных 10 минут) оклад сотрудника уменьшается на{' '}
            <input
              type="text"
              inputMode="decimal"
              className={styles.inlineAmountInput}
              value={model.globalForm.workModePenaltyRub}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, workModePenaltyRub: e.target.value }))
              }
              disabled={model.globalSaving}
              aria-label="Удержание за опоздание или ранний уход, ₽"
              title="Удержание за опоздание или ранний уход, ₽"
            />{' '}
            ₽
          </span>
        </label>
        <label className={styles.settingsCheckbox}>
          <input
            type="checkbox"
            checked={model.globalForm.autoCloseEnforced}
            onChange={(e) =>
              model.setGlobalForm((f) => ({ ...f, autoCloseEnforced: e.target.checked }))
            }
            disabled={model.globalSaving}
          />
          <span>
            Учитывать автозакрытия — за каждый рабочий день, закрытый автоматически по истечении
            срока (сотрудник не закрыл день сам), оклад сотрудника уменьшается на{' '}
            <input
              type="text"
              inputMode="decimal"
              className={styles.inlineAmountInput}
              value={model.globalForm.autoClosePenaltyRub}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, autoClosePenaltyRub: e.target.value }))
              }
              disabled={model.globalSaving}
              aria-label="Удержание за автозакрытие рабочего дня, ₽"
              title="Удержание за автозакрытие рабочего дня, ₽"
            />{' '}
            ₽
          </span>
        </label>
        <label className={styles.settingsCheckbox}>
          <input
            type="checkbox"
            checked={model.globalForm.truancyEnforced}
            onChange={(e) =>
              model.setGlobalForm((f) => ({ ...f, truancyEnforced: e.target.checked }))
            }
            disabled={model.globalSaving}
          />
          <span>
            Учитывать прогулы — за каждый прогул (рабочий день по графику без явки и без
            согласованного выходного) из оклада удерживается дневная доля
          </span>
        </label>
      </section>

      {/* Премии по итогам продаж */}
      <section className={styles.settingsPanel} aria-label="Премии по итогам продаж">
        <h2 className={styles.sectionTitle}>Премии по итогам продаж</h2>
        <h3 className={styles.settingsSubTitle}>За места по итогам месяца (журнал ДП)</h3>
        <p className={styles.mutedCell}>
          Менеджерам по итогам продаж за полностью завершённые месяцы; при продажах ниже минимума
          премия не начисляется.
        </p>
        <div className={styles.settingsGridNumbers}>
          <label className={styles.settingsField}>
            <span>1 место, ₽</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesBonusFirstPlace}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesBonusFirstPlace: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>2 место, ₽</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesBonusSecondPlace}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesBonusSecondPlace: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>3 место, ₽</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesBonusThirdPlace}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesBonusThirdPlace: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Мин. продажи для премии, ₽</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesBonusMinSales}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesBonusMinSales: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
        </div>
        <h3 className={styles.settingsSubTitle}>«QR + Н»</h3>
        <label className={styles.settingsCheckbox}>
          <input
            type="checkbox"
            checked={model.globalForm.cashQrBonusEnforced}
            onChange={(e) =>
              model.setGlobalForm((f) => ({ ...f, cashQrBonusEnforced: e.target.checked }))
            }
            disabled={model.globalSaving}
          />
          <span>
            Начислять премию — если за месяц терминал дал менее 50% продаж, менеджер получает{' '}
            <input
              type="text"
              inputMode="decimal"
              className={styles.inlineAmountInput}
              value={model.globalForm.cashQrBonusPercent}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, cashQrBonusPercent: e.target.value }))
              }
              disabled={model.globalSaving}
              aria-label="Процент премии «QR + Н»"
              title="Процент от не терминальных продаж месяца"
            />{' '}
            % от остальных продаж (наличные, QR, счёт, перевод на ЛК, банк-приложение)
          </span>
        </label>
        <h3 className={styles.settingsSubTitle}>Планы продаж менеджеров</h3>
        <p className={styles.mutedCell}>
          Устанавливаются индивидуально: при достижении порога объёма продаж за месяц — премия в %
          от з/п менеджера по договорам за этот месяц; действует самый высокий достигнутый порог.
        </p>
        {model.globalForm.managerSalesPlans.length > 0 ? (
          <div className={styles.planRows}>
            {model.globalForm.managerSalesPlans.map((row, index) => {
              const patch = (fields: Partial<typeof row>) =>
                model.setGlobalForm((f) => ({
                  ...f,
                  managerSalesPlans: f.managerSalesPlans.map((r, i) =>
                    i === index ? { ...r, ...fields } : r
                  ),
                }));
              return (
                <div key={index} className={styles.planRow}>
                  <select
                    value={row.userId}
                    onChange={(e) => patch({ userId: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Менеджер"
                  >
                    <option value="">— выберите менеджера —</option>
                    {sortedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {userName(u)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="порог 1, ₽"
                    value={row.threshold1}
                    onChange={(e) => patch({ threshold1: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Порог 1, ₽ продаж"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="премия 1, %"
                    value={row.percent1}
                    onChange={(e) => patch({ percent1: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Премия за порог 1, %"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="порог 2, ₽"
                    value={row.threshold2}
                    onChange={(e) => patch({ threshold2: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Порог 2, ₽ продаж"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="премия 2, %"
                    value={row.percent2}
                    onChange={(e) => patch({ percent2: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Премия за порог 2, %"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="порог 3, ₽"
                    value={row.threshold3}
                    onChange={(e) => patch({ threshold3: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Порог 3, ₽ продаж"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="премия 3, %"
                    value={row.percent3}
                    onChange={(e) => patch({ percent3: e.target.value })}
                    disabled={model.globalSaving}
                    aria-label="Премия за порог 3, %"
                  />
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.salaryRowRemove}
                    onClick={() =>
                      model.setGlobalForm((f) => ({
                        ...f,
                        managerSalesPlans: f.managerSalesPlans.filter((_, i) => i !== index),
                      }))
                    }
                    disabled={model.globalSaving}
                    title="Убрать план менеджера"
                    aria-label="Убрать план менеджера"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className={styles.settingsAddRow}>
          <button
            data-admin-mutation
            type="button"
            className={styles.addRuleBtn}
            onClick={() =>
              model.setGlobalForm((f) => ({
                ...f,
                managerSalesPlans: [
                  ...f.managerSalesPlans,
                  {
                    userId: '',
                    threshold1: '',
                    threshold2: '',
                    threshold3: '',
                    percent1: '',
                    percent2: '',
                    percent3: '',
                  },
                ],
              }))
            }
            disabled={model.globalSaving}
          >
            + План менеджера
          </button>
        </div>
      </section>

      {/* Оклады */}
      <section className={styles.settingsPanel} aria-label="Месячные оклады сотрудников">
        <h2 className={styles.sectionTitle}>Месячные оклады сотрудников</h2>
        <p className={styles.mutedCell}>
          За каждый день периода начисляется 1/N часть оклада (N — число дней в месяце этого дня).
        </p>
        {model.globalForm.employeeSalaries.length > 0 ? (
          <div className={styles.salaryRows}>
            {model.globalForm.employeeSalaries.map((row, index) => (
              <div key={index} className={styles.salaryRow}>
                <select
                  value={row.userId}
                  onChange={(e) =>
                    model.setGlobalForm((f) => ({
                      ...f,
                      employeeSalaries: f.employeeSalaries.map((r, i) =>
                        i === index ? { ...r, userId: e.target.value } : r
                      ),
                    }))
                  }
                  disabled={model.globalSaving}
                  aria-label="Сотрудник"
                >
                  <option value="">— выберите сотрудника —</option>
                  {sortedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userName(u)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="оклад, ₽/мес"
                  value={row.monthlySalary}
                  onChange={(e) =>
                    model.setGlobalForm((f) => ({
                      ...f,
                      employeeSalaries: f.employeeSalaries.map((r, i) =>
                        i === index ? { ...r, monthlySalary: e.target.value } : r
                      ),
                    }))
                  }
                  disabled={model.globalSaving}
                  aria-label="Месячный оклад"
                />
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.salaryRowRemove}
                  onClick={() =>
                    model.setGlobalForm((f) => ({
                      ...f,
                      employeeSalaries: f.employeeSalaries.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={model.globalSaving}
                  title="Убрать оклад"
                  aria-label="Убрать оклад"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className={styles.settingsAddRow}>
          <button
            data-admin-mutation
            type="button"
            className={styles.addRuleBtn}
            onClick={() =>
              model.setGlobalForm((f) => ({
                ...f,
                employeeSalaries: [...f.employeeSalaries, { userId: '', monthlySalary: '' }],
              }))
            }
            disabled={model.globalSaving}
          >
            + Оклад сотрудника
          </button>
        </div>
      </section>

      {/* Направления */}
      <div className={styles.tableBlock}>
        <h2 className={styles.sectionTitle}>Направления договоров и ставки по должностям</h2>
        <DataTable
          data={categories}
          columns={columns}
          keyExtractor={(c) => c.id}
          getRowClassName={(c) => (c.isActive ? undefined : styles.rowInactive)}
          emptyMessage="Направлений нет — добавьте первой кнопкой «+ Направление» в шапке раздела"
        />
      </div>

      {/* Правила по офисам */}
      <div className={styles.tableBlock}>
        <h2 className={styles.sectionTitle}>
          Переопределения ставок по офисам
          <span className={styles.mutedCell}> (приоритет: договор → офис → направление)</span>
        </h2>
        <div className={styles.rulesList}>
          {categories.map((category) => (
            <div key={category.id} className={styles.rulesBlock}>
              <div className={styles.rulesBlockHeader}>
                <span className={styles.nameCell}>{category.name}</span>
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.addRuleBtn}
                  onClick={() => model.openRuleModal(category)}
                  disabled={model.rulesSaving}
                >
                  + Правило
                </button>
              </div>
              {category.rateRules.length === 0 ? (
                <span className={styles.mutedCell}>переопределений нет</span>
              ) : (
                <div className={styles.rulesChips}>
                  {category.rateRules.map((rule) => (
                    <span key={rule.id} className={styles.ruleChip}>
                      {rule.officeName ?? 'Все офисы'} ·{' '}
                      {SALARY_ROLE_OPTIONS.find((r) => r.value === rule.role)?.label ?? rule.role} ·{' '}
                      {formatPercent(rule.percent)}
                      <button
                        data-admin-mutation
                        type="button"
                        className={styles.ruleChipRemove}
                        onClick={() => model.setDeleteRuleTarget({ category, ruleId: rule.id })}
                        disabled={model.deletingRule}
                        title="Удалить правило"
                        aria-label="Удалить правило"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <SalaryCategoryModal
        isOpen={model.categoryModalOpen}
        onClose={model.closeCategoryModal}
        category={model.editingCategory}
        saving={model.categorySaving}
        onSubmit={(input) => void model.handleSubmitCategory(input)}
      />

      <SalaryRateRuleModal
        isOpen={model.ruleCategory != null}
        onClose={model.closeRuleModal}
        category={model.ruleCategory}
        offices={offices}
        saving={model.rulesSaving}
        onSubmit={(input) => void model.handleSubmitRule(input)}
      />

      <ConfirmModal
        isOpen={model.deleteCategoryTarget != null}
        onClose={() => model.setDeleteCategoryTarget(null)}
        onConfirm={() => void model.handleDeleteCategory()}
        title="Удалить направление"
        message={
          model.deleteCategoryTarget
            ? `Направление «${model.deleteCategoryTarget.name}» будет удалено. Направление с договорами удалить нельзя. Продолжить?`
            : ''
        }
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={model.deletingCategory}
      />

      <ConfirmModal
        isOpen={model.deleteRuleTarget != null}
        onClose={() => model.setDeleteRuleTarget(null)}
        onConfirm={() => void model.handleDeleteRule()}
        title="Удалить правило ставок"
        message={
          model.deleteRuleTarget
            ? `Правило для направления «${model.deleteRuleTarget.category.name}» будет удалено. Продолжить?`
            : ''
        }
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={model.deletingRule}
      />
    </div>
  );
}
