'use client';

import { useMemo } from 'react';

import type { CrmUser, Office } from '@/shared/api/admin-crm';
import type { SalaryCategory, SalarySettings } from '@/shared/api/admin-salary';
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
      {/* Глобальные параметры */}
      <section className={styles.settingsPanel} aria-label="Глобальные параметры расчёта">
        <h2 className={styles.sectionTitle}>Глобальные параметры расчёта</h2>
        <div className={styles.settingsGrid}>
          <label className={styles.settingsField}>
            <span>Налог из фондов, % (кроме з/п менеджеров)</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.taxPercent}
              onChange={(e) => model.setGlobalForm((f) => ({ ...f, taxPercent: e.target.value }))}
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Бригадир (получатель бригадирского фонда)</span>
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
        </div>
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
            согласованных 10 минут) оклад сотрудника уменьшается на 50 ₽
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
        <p className={styles.mutedCell}>
          Премии за места по итогам продаж за месяц (журнал ДП) — начисляются менеджерам из итогов
          продаж за полностью завершённые месяцы:
        </p>
        <div className={styles.settingsGrid}>
          <label className={styles.settingsField}>
            <span>Премия за 1 место, ₽</span>
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
            <span>Премия за 2 место, ₽</span>
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
            <span>Премия за 3 место, ₽</span>
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
            <span>Минимальные продажи для премии, ₽</span>
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
        <p className={styles.mutedCell}>
          План продаж — при достижении порога объёма продаж за месяц менеджеру начисляется премия в
          % от его з/п по договорам за этот месяц; премия считается по самому высокому достигнутому
          порогу:
        </p>
        <div className={styles.settingsGrid}>
          <label className={styles.settingsField}>
            <span>Порог 1, ₽ продаж</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanThreshold1}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanThreshold1: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Премия за порог 1, %</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanPercent1}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanPercent1: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Порог 2, ₽ продаж</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanThreshold2}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanThreshold2: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Премия за порог 2, %</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanPercent2}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanPercent2: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Порог 3, ₽ продаж</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanThreshold3}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanThreshold3: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
          <label className={styles.settingsField}>
            <span>Премия за порог 3, %</span>
            <input
              type="text"
              inputMode="decimal"
              value={model.globalForm.salesPlanPercent3}
              onChange={(e) =>
                model.setGlobalForm((f) => ({ ...f, salesPlanPercent3: e.target.value }))
              }
              disabled={model.globalSaving}
            />
          </label>
        </div>
        <p className={styles.mutedCell}>
          Ведущие специалисты направлений — получатели з/п ВС по каждому направлению:
        </p>
        <div className={styles.settingsGrid}>
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
          Месячные оклады сотрудников — при расчёте з/п за каждый день периода начисляется 1/N часть
          оклада (N — число дней в месяце этого дня):
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
        <div className={styles.settingsActions}>
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
        <div className={styles.settingsActions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.saveBtn}
            onClick={() => void model.saveGlobal()}
            disabled={model.globalSaving}
          >
            {model.globalSaving ? 'Сохранение…' : 'Сохранить параметры'}
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
