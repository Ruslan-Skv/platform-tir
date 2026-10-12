'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { AdminTablePagination } from '@/shared/ui/admin/AdminTablePagination';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import type {
  EstimatePipelineManualTab,
  EstimatePipelineTab,
} from '../../../platform/estimates/estimatePipelineStage';
import type { EstimateTrashConfirmState } from '../modals/EstimateTrashConfirmModal';
import { EstimateAddressGroupTableRow } from './EstimateAddressGroupTableRow';
import { EstimatePresetTableRow } from './EstimatePresetTableRow';
import { EstimatesListMobileCards } from './EstimatesListMobileCards';
import type { EstimatesTableDisplayItem } from './estimatesListLayout';
import type { EstimatesListSortBy, EstimatesListSortOrder } from './estimatesListSort';
import { EstimatesListSortableTh } from './estimatesListTableUi';
import { ESTIMATES_LIST_TABLE_COL_SPAN, type EstimatePackageUsage } from './estimatesListUtils';

export type EstimatesListTableProps = {
  pipelineTab: EstimatePipelineTab;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  visibleItemCount: number;
  hasActiveListFilters: boolean;
  totalTableRows: number;
  paginatedDisplayItems: EstimatesTableDisplayItem[];
  listSortBy: EstimatesListSortBy;
  listSortOrder: EstimatesListSortOrder;
  onSort: (column: EstimatesListSortBy) => void;
  groups: ContractEstimateGroup[];
  items: ContractEstimatePreset[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  groupIdsWithLockedEstimate: Set<string>;
  effectiveExpandedAddressKeys: string[];
  onToggleAddressExpand: (addressKey: string) => void;
  onGroupMarkupChange: (groupId: string, raw: string) => void;
  router: AppRouterInstance;
  onPresetPipelineStage: (presetId: string, tab: EstimatePipelineManualTab) => void;
  onPresetMarkupChange: (presetId: string, raw: string) => void;
  onDetachEdit: (estimateId: string, usages: EstimatePackageUsage[]) => void;
  onCopyPreset: (presetId: string) => void;
  onOpenWorkScopeSplit: (presetId: string) => void;
  onTrashPreset: (state: EstimateTrashConfirmState) => void;
  onOpenPreview: (presetId: string) => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function EstimatesListTable({
  pipelineTab,
  loading,
  refreshing,
  saving,
  visibleItemCount,
  hasActiveListFilters,
  totalTableRows,
  paginatedDisplayItems,
  listSortBy,
  listSortOrder,
  onSort,
  groups,
  items,
  usageByEstimateId,
  groupIdsWithLockedEstimate,
  effectiveExpandedAddressKeys,
  onToggleAddressExpand,
  onGroupMarkupChange,
  router,
  onPresetPipelineStage,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  onOpenPreview,
  page,
  limit,
  onPageChange,
}: EstimatesListTableProps) {
  return (
    <div
      className={`${dataTableStyles.tableContainer} ${cdEstimatesList.contractsDirectoryTable} ${cdEstimatesList.estimatesDirectoryTable}`}
      data-estimates-tab={pipelineTab}
    >
      <div className={`${dataTableStyles.tableWrapper} ${cdEstimatesList.estimatesDesktopTable}`}>
        <div className={dataTableStyles.scrollContainer}>
          <table
            className={`${dataTableStyles.table} ${cdEstimatesList.contractsListTable} ${cdEstimatesList.estimatesListTable}`}
          >
            <thead className={dataTableStyles.stickyHeader}>
              <tr>
                <th className={cdEstimatesList.contractsListSelectCol} aria-label="Группа" />
                <th>Расчёт</th>
                <th>Направл.</th>
                <EstimatesListSortableTh
                  column="date"
                  title="Дата"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <th>Заказчик</th>
                <th>Автор</th>
                <th>Стоимость</th>
                <EstimatesListSortableTh
                  column="binding"
                  title="Привязка"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <th>Наценка, %</th>
                <th className={cdEstimatesList.contractsListActionsCol} aria-label="Действия" />
              </tr>
            </thead>
            <tbody className={loading || refreshing ? dataTableStyles.tbodyRefreshing : undefined}>
              {visibleItemCount === 0 ? (
                <tr>
                  <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN} className={dataTableStyles.emptyCell}>
                    {hasActiveListFilters
                      ? 'Нет расчётов по выбранным фильтрам.'
                      : pipelineTab === 'attached'
                        ? 'На вкладке «Прикреплённые» пока нет расчётов.'
                        : pipelineTab === 'signed'
                          ? 'На вкладке «Подписаны» пока нет расчётов.'
                          : pipelineTab === 'deferred'
                            ? 'На вкладке «Отложенные» пока нет расчётов.'
                            : 'На вкладке «В работе» пока нет расчётов.'}
                  </td>
                </tr>
              ) : totalTableRows === 0 ? (
                <tr>
                  <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN} className={dataTableStyles.emptyCell}>
                    Нет строк для отображения. Разверните объект или смените режим списка.
                  </td>
                </tr>
              ) : (
                paginatedDisplayItems.map((item, index) => {
                  if (item.type === 'gap') {
                    return (
                      <tr
                        key={item.id}
                        className={cdEstimatesList.estimatesListObjectGroupGap}
                        aria-hidden
                      >
                        <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN} />
                      </tr>
                    );
                  }
                  if (item.type === 'address') {
                    return (
                      <EstimateAddressGroupTableRow
                        key={`addr_${item.addressKey}`}
                        section={{ addressKey: item.addressKey, items: item.items }}
                        saving={saving}
                        groups={groups}
                        usageByEstimateId={usageByEstimateId}
                        groupIdsWithLockedEstimate={groupIdsWithLockedEstimate}
                        effectiveExpandedAddressKeys={effectiveExpandedAddressKeys}
                        onToggleAddressExpand={onToggleAddressExpand}
                        onGroupMarkupChange={onGroupMarkupChange}
                      />
                    );
                  }
                  const next = paginatedDisplayItems[index + 1];
                  const isLastAddressChild =
                    Boolean(item.childOfAddress) &&
                    (next == null || next.type !== 'estimate' || !next.childOfAddress);
                  return (
                    <EstimatePresetTableRow
                      key={`est_${item.preset.id}`}
                      preset={item.preset}
                      childOfAddress={item.childOfAddress}
                      lastAddressChild={isLastAddressChild}
                      standaloneCard={item.standaloneCard}
                      showObjectAddress={item.showObjectAddress}
                      saving={saving}
                      pipelineTab={pipelineTab}
                      groups={groups}
                      items={items}
                      usageByEstimateId={usageByEstimateId}
                      router={router}
                      onPresetPipelineStage={onPresetPipelineStage}
                      onPresetMarkupChange={onPresetMarkupChange}
                      onDetachEdit={onDetachEdit}
                      onCopyPreset={onCopyPreset}
                      onOpenWorkScopeSplit={onOpenWorkScopeSplit}
                      onTrashPreset={onTrashPreset}
                      onOpenPreview={onOpenPreview}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EstimatesListMobileCards
        pipelineTab={pipelineTab}
        loading={loading}
        refreshing={refreshing}
        saving={saving}
        visibleItemCount={visibleItemCount}
        hasActiveListFilters={hasActiveListFilters}
        totalTableRows={totalTableRows}
        paginatedDisplayItems={paginatedDisplayItems}
        groups={groups}
        items={items}
        usageByEstimateId={usageByEstimateId}
        groupIdsWithLockedEstimate={groupIdsWithLockedEstimate}
        effectiveExpandedAddressKeys={effectiveExpandedAddressKeys}
        onToggleAddressExpand={onToggleAddressExpand}
        onGroupMarkupChange={onGroupMarkupChange}
        router={router}
        onPresetPipelineStage={onPresetPipelineStage}
        onPresetMarkupChange={onPresetMarkupChange}
        onDetachEdit={onDetachEdit}
        onCopyPreset={onCopyPreset}
        onOpenWorkScopeSplit={onOpenWorkScopeSplit}
        onTrashPreset={onTrashPreset}
        onOpenPreview={onOpenPreview}
      />

      {!loading && !refreshing && totalTableRows > 0 ? (
        <AdminTablePagination
          page={page}
          limit={limit}
          total={totalTableRows}
          onPageChange={onPageChange}
          className={cdHub.contractsListPagination}
          activePageClassName={cdHub.contractsListPaginationPageActive}
        />
      ) : null}
    </div>
  );
}
