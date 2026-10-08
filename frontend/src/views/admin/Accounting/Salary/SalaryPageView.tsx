'use client';

import { useId } from 'react';

import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { SalaryCalcView } from './SalaryCalcView';
import { SalaryContractsView } from './SalaryContractsView';
import styles from './SalaryPage.module.css';
import { SalarySettingsView } from './SalarySettingsView';
import type { SalaryPageModel, SalaryTab } from './hooks/useSalaryPage';
import { pluralCategories, pluralContracts, pluralSettlements } from './salary-page.constants';

type SalaryPageViewProps = {
  model: SalaryPageModel;
};

/** Вкладка раздела — стиль как у «В работе / В перспективе / В договорах» списка расчётов. */
function tabActiveClass(key: SalaryTab): string {
  if (key === 'calc') return styles.tabActiveCalc;
  if (key === 'contracts') return styles.tabActiveContracts;
  return styles.tabActiveSettings;
}

/** Каркас раздела «Расчёт з/п» в стиле журналов Банк/Касса/ДП: шапка, вкладки-чипы, вкладка. */
export function SalaryPageView({ model }: SalaryPageViewProps) {
  const {
    tab,
    setTab,
    isSuperAdmin,
    canEdit,
    offices,
    users,
    settings,
    settingsLoading,
    reloadSettings,
    calc,
    contracts,
    settingsModel,
  } = model;

  const tabsId = useId();

  /** Активная модель определяет содержимое шапки и баннеров. */
  const activeError =
    tab === 'calc' ? calc.error : tab === 'contracts' ? contracts.error : settingsModel.error;
  const activeNotice =
    tab === 'calc' ? calc.notice : tab === 'contracts' ? contracts.notice : settingsModel.notice;

  const tabs: Array<{ key: SalaryTab; label: string }> = [
    { key: 'calc', label: 'Расчёт за период' },
    { key: 'contracts', label: 'Договоры' },
    ...(isSuperAdmin ? [{ key: 'settings' as const, label: 'Настройки' }] : []),
  ];

  const countTitle =
    tab === 'calc'
      ? `${calc.settlements.length} ${pluralSettlements(calc.settlements.length)}`
      : tab === 'contracts'
        ? `${contracts.total} ${pluralContracts(contracts.total)}`
        : `${settings?.categories.length ?? 0} ${pluralCategories(settings?.categories.length ?? 0)}`;

  const handleRefresh = () => {
    if (tab === 'calc') {
      void calc.reloadSettlements();
    } else if (tab === 'contracts') {
      void contracts.load();
    } else {
      void reloadSettings();
    }
  };

  const refreshBusy =
    tab === 'contracts' ? contracts.loading : tab === 'calc' ? calc.loading : settingsLoading;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={styles.headerStack}>
            <div className={cdHub.contractsHeaderTitleRow}>
              <div className={cdHub.contractsHeaderTitleCluster}>
                <div className={cdHub.contractsListHeaderTitleGroup}>
                  <h1 className={cdHub.title}>Расчёт з/п</h1>
                </div>
                <span className={cdHub.contractsListCount} title={countTitle}>
                  <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                  <span className={cdHub.contractsListCountMobile}>
                    {tab === 'calc'
                      ? calc.settlements.length
                      : tab === 'contracts'
                        ? contracts.total
                        : (settings?.categories.length ?? 0)}
                  </span>
                </span>
              </div>
              {/* Мобильная шапка: в строке с названием — только иконки; «+» — в ряду ниже. */}
              <div className={cdHub.contractsHeaderIconActionsMobile}>
                <AdminListRefreshButton
                  disabled={refreshBusy}
                  busy={refreshBusy}
                  title="Обновить раздел"
                  aria-label="Обновление раздела расчёта з/п"
                  onClick={handleRefresh}
                />
              </div>
            </div>

            {/* Ярлычки вкладок — под заголовком, притёрты к линии шапки, как у списка расчётов. */}
            <div className={styles.tabBar} role="tablist" aria-label="Вкладки раздела">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  id={`${tabsId}-${t.key}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`${styles.tab}${tab === t.key ? ` ${tabActiveClass(t.key)}` : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span className={styles.tabCount}>
                    {t.key === 'calc'
                      ? calc.settlements.length
                      : t.key === 'contracts'
                        ? contracts.total
                        : (settings?.categories.length ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {tab === 'calc' && !calc.isSnapshot && canEdit ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={calc.saving}
              onClick={() => void calc.fixSettlement()}
              title="Зафиксировать расчёт за период как черновик ведомости"
            >
              {calc.saving ? 'Сохранение…' : 'Зафиксировать расчёт'}
            </button>
          ) : null}
          {tab === 'contracts' ? (
            canEdit ? (
              <button
                data-admin-mutation
                type="button"
                className={cdChrome.contractsListHeaderAddBtn}
                disabled={contracts.syncing || contracts.loading}
                onClick={() => void contracts.sync()}
                title="Подтянуть подписанные договоры из раздела «Договоры»"
              >
                {contracts.syncing ? 'Синхронизация…' : '↔ Синхронизировать'}
              </button>
            ) : null
          ) : null}
          {tab === 'contracts' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={contracts.loading || !canEdit}
              onClick={contracts.openCreateModal}
              title={
                canEdit ? 'Добавить договор для расчёта з/п' : 'Нет прав на изменение договоров'
              }
            >
              + Договор
            </button>
          ) : null}
          {tab === 'settings' && isSuperAdmin ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={settingsModel.categorySaving}
              onClick={settingsModel.openCreateCategoryModal}
              title="Добавить направление договоров"
            >
              + Направление
            </button>
          ) : null}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={refreshBusy}
              busy={refreshBusy}
              title="Обновить раздел"
              aria-label="Обновление раздела расчёта з/п"
              onClick={handleRefresh}
            />
          </div>
        </div>
      </div>

      {activeError ? (
        <div className={dpStyles.pageMessage}>
          <span>{activeError}</span>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => {
              if (tab === 'calc') calc.setError(null);
              else if (tab === 'contracts') contracts.setError(null);
              else settingsModel.setError(null);
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {activeNotice ? <div className={styles.pageNotice}>{activeNotice}</div> : null}

      {tab === 'calc' ? (
        <SalaryCalcView model={calc} offices={offices} users={users} canEdit={canEdit} />
      ) : null}
      {tab === 'contracts' ? (
        <SalaryContractsView
          model={contracts}
          offices={offices}
          users={users}
          settings={settings}
          canEdit={canEdit}
        />
      ) : null}
      {tab === 'settings' && isSuperAdmin ? (
        <SalarySettingsView
          model={settingsModel}
          offices={offices}
          users={users}
          settings={settings}
          settingsLoading={settingsLoading}
        />
      ) : null}
    </div>
  );
}
