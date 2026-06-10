'use client';

import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';

type ContractsListPageHeaderProps = {
  visibleRowCount: number;
  objectGroupCount: number;
  creating: boolean;
  loading: boolean;
  actionsBusy: boolean;
  trashCount: number;
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
  onCreateClick,
  onRefresh,
  onOpenTrash,
}: ContractsListPageHeaderProps) {
  return (
    <div className={cdHub.editorHeader}>
      <div className={cdHub.contractsListHeaderLeft}>
        <h1 className={cdHub.title}>Договора</h1>
        <span className={cdHub.contractsListCount}>
          {visibleRowCount} договоров
          {objectGroupCount > 0 ? ` · ${objectGroupCount} объектов` : ''}
        </span>
      </div>
      <div className={cdChrome.headerButtonsRow}>
        <button
          type="button"
          className={cdChrome.contractsListHeaderAddBtn}
          disabled={actionsBusy || loading}
          onClick={onCreateClick}
        >
          {creating ? 'Создание…' : '+ Новый договор'}
        </button>
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
