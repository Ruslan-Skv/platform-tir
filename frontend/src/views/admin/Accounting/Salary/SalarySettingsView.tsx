'use client';

import { useMemo } from 'react';

import type { Office } from '@/shared/api/admin-crm';
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
  settings: SalarySettings | null;
  settingsLoading: boolean;
};

/** Вкладка «Настройки» (только суперадмин): проценты, сплиты, налог, направления, правила по офисам. */
export function SalarySettingsView({
  model,
  offices,
  settings,
  settingsLoading,
}: SettingsViewProps) {
  const categories = settings?.categories ?? [];

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
