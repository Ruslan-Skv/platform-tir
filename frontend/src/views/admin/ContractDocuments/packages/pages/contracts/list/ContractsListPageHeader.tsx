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
  return (
    <div className={cdHub.editorHeader}>
      <div className={cdHub.contractsListHeaderLeft}>
        <div className={cdHub.contractsListHeaderTitleGroup}>
          <h1 className={cdHub.title}>Договора</h1>
          <ContractsListRulesInfoTip />
        </div>
        <span className={cdHub.contractsListCount}>
          {visibleRowCount} договоров
          {objectGroupCount > 0 ? ` · ${objectGroupCount} объектов` : ''}
        </span>
      </div>
      <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
        <button
          data-admin-mutation
          type="button"
          className={cdChrome.contractsListHeaderAddBtn}
          disabled={actionsBusy || loading}
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
        <AdminListRefreshButton
          disabled={actionsBusy || loading}
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
    </div>
  );
}
