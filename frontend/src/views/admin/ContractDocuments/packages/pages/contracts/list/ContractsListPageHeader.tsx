'use client';

import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import { ContractsListColumnsSelector } from './ContractsListColumnsSelector';
import { ContractsListRulesInfoTip } from './ContractsListRulesInfoTip';
import type { ContractsListColumnKey } from './contractsListColumns';

type ContractsListPageHeaderProps = {
  visibleRowCount: number;
  objectGroupCount: number;
  creating: boolean;
  loading: boolean;
  actionsBusy: boolean;
  trashCount: number;
  visibleColumns: ContractsListColumnKey[];
  onVisibleColumnsChange: (next: ContractsListColumnKey[]) => void;
  onCreateClick: () => void;
  onRefresh: () => void;
  onOpenTrash: () => void;
};

export function ContractsListPageHeader({
  visibleRowCount,
  objectGroupCount,
  creating,
  loading,
  actionsBusy,
  trashCount,
  visibleColumns,
  onVisibleColumnsChange,
  onCreateClick,
  onRefresh,
  onOpenTrash,
}: ContractsListPageHeaderProps) {
  const iconsDisabled = actionsBusy || loading;
  const countTitle =
    objectGroupCount > 0
      ? `${visibleRowCount} договоров · ${objectGroupCount} объектов`
      : `${visibleRowCount} договоров`;

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить список"
        aria-label={loading ? 'Обновление списка договоров' : 'Обновить список договоров'}
        onClick={onRefresh}
      />
      <AdminToolbarTrashButton
        trashCount={trashCount}
        onClick={onOpenTrash}
        title="Корзина договоров"
        aria-label="Корзина договоров"
      />
    </div>
  );

  return (
    <div className={cdHub.editorHeader}>
      <div className={cdHub.contractsListHeaderLeft}>
        <div className={cdHub.contractsHeaderTitleRow}>
          <div className={cdHub.contractsHeaderTitleCluster}>
            <div className={cdHub.contractsListHeaderTitleGroup}>
              <h1 className={cdHub.title}>Договора</h1>
              <ContractsListRulesInfoTip />
            </div>
            <span className={cdHub.contractsListCount} title={countTitle}>
              <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
              <span className={cdHub.contractsListCountMobile}>
                {objectGroupCount > 0 ? (
                  <>
                    {visibleRowCount}/{objectGroupCount}
                  </>
                ) : (
                  visibleRowCount
                )}
              </span>
            </span>
          </div>
          {iconActions('mobile')}
        </div>
      </div>
      <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
        <button
          data-admin-mutation
          type="button"
          className={cdChrome.contractsListHeaderAddBtn}
          disabled={iconsDisabled}
          onClick={onCreateClick}
        >
          {creating ? 'Создание…' : '+ Новый договор'}
        </button>
        <span className={cdHub.contractsListColumnsSelectorMobileHide}>
          <ContractsListColumnsSelector
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={onVisibleColumnsChange}
            disabled={loading}
          />
        </span>
        {iconActions('desktop')}
      </div>
    </div>
  );
}
