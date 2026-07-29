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
import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import type { EstimateTrashConfirmState } from '../modals/EstimateTrashConfirmModal';
import { EstimateAddressGroupTableRow } from './EstimateAddressGroupTableRow';
import { EstimatePresetTableRow } from './EstimatePresetTableRow';
import { EstimatesListMobileCards } from './EstimatesListMobileCards';
import type { EstimatesTableDisplayItem } from './estimatesListLayout';
import type { EstimatesListSortBy, EstimatesListSortOrder } from './estimatesListSort';
import { EstimatesListSortableTh } from './estimatesListTableUi';
import { ESTIMATES_LIST_TABLE_COL_SPAN, type EstimatePackageUsage } from './estimatesListUtils';

export type EstimatesListTableProps = {
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  visibleItemCount: number;
  hasAnythingInArchive: boolean;
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
  effectiveExpandedAddressKey: string | null;
  onToggleAddressExpand: (addressKey: string) => void;
  onAddressPipelineStage: (addressKey: string, tab: EstimatePipelineTab) => void;
  onSetEstimatesArchivedByAddress: (addressKey: string, archived: boolean) => void;
  onGroupMarkupChange: (groupId: string, raw: string) => void;
  router: AppRouterInstance;
  onPresetPipelineStage: (presetId: string, tab: EstimatePipelineTab) => void;
  onPresetArchived: (presetId: string, archived: boolean) => void;
  onPresetMarkupChange: (presetId: string, raw: string) => void;
  onDetachEdit: (estimateId: string, usages: EstimatePackageUsage[]) => void;
  onCopyPreset: (presetId: string) => void;
  onOpenWorkScopeSplit: (presetId: string) => void;
  onTrashPreset: (state: EstimateTrashConfirmState) => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function EstimatesListTable({
  archiveView,
  pipelineTab,
  loading,
  refreshing,
  saving,
  visibleItemCount,
  hasAnythingInArchive,
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
  effectiveExpandedAddressKey,
  onToggleAddressExpand,
  onAddressPipelineStage,
  onSetEstimatesArchivedByAddress,
  onGroupMarkupChange,
  router,
  onPresetPipelineStage,
  onPresetArchived,
  onPresetMarkupChange,
  onDetachEdit,
  onCopyPreset,
  onOpenWorkScopeSplit,
  onTrashPreset,
  page,
  limit,
  onPageChange,
}: EstimatesListTableProps) {
  return (
    <div
      className={`${dataTableStyles.tableContainer} ${cdEstimatesList.contractsDirectoryTable} ${cdEstimatesList.estimatesDirectoryTable}${archiveView ? ` ${cdEstimatesList.estimatesDirectoryTableArchive}` : ''}`}
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
                <EstimatesListSortableTh
                  column="date"
                  title="Дата"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <th>Стоимость</th>
                <th>Привязка</th>
                <th>Наценка, %</th>
                <th className={cdEstimatesList.contractsListActionsCol} aria-label="Действия" />
              </tr>
            </thead>
            <tbody className={loading || refreshing ? dataTableStyles.tbodyRefreshing : undefined}>
              {visibleItemCount === 0 ? (
                <tr>
                  <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN} className={dataTableStyles.emptyCell}>
                    {archiveView && !hasAnythingInArchive
                      ? 'В архиве пока нет расчётов и объектов.'
                      : hasActiveListFilters
                        ? 'Нет расчётов по выбранным фильтрам.'
                        : pipelineTab === 'prospect'
                          ? 'На вкладке «В перспективе» пока нет расчётов.'
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
                        archiveView={archiveView}
                        pipelineTab={pipelineTab}
                        groups={groups}
                        usageByEstimateId={usageByEstimateId}
                        groupIdsWithLockedEstimate={groupIdsWithLockedEstimate}
                        effectiveExpandedAddressKey={effectiveExpandedAddressKey}
                        onToggleAddressExpand={onToggleAddressExpand}
                        onAddressPipelineStage={onAddressPipelineStage}
                        onSetEstimatesArchivedByAddress={onSetEstimatesArchivedByAddress}
                        onGroupMarkupChange={onGroupMarkupChange}
                      />
                    );
                  }
                  if (item.type === 'soloArchivedSection') {
                    return (
                      <tr key="_soloArchived" className={cdEstimatesList.estimatesListSectionRow}>
                        <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN}>
                          В архиве отдельно (объект в основном списке)
                        </td>
                      </tr>
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
                      saving={saving}
                      archiveView={archiveView}
                      pipelineTab={pipelineTab}
                      groups={groups}
                      items={items}
                      usageByEstimateId={usageByEstimateId}
                      router={router}
                      onPresetPipelineStage={onPresetPipelineStage}
                      onPresetArchived={onPresetArchived}
                      onPresetMarkupChange={onPresetMarkupChange}
                      onDetachEdit={onDetachEdit}
                      onCopyPreset={onCopyPreset}
                      onOpenWorkScopeSplit={onOpenWorkScopeSplit}
                      onTrashPreset={onTrashPreset}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EstimatesListMobileCards
        archiveView={archiveView}
        pipelineTab={pipelineTab}
        loading={loading}
        refreshing={refreshing}
        saving={saving}
        visibleItemCount={visibleItemCount}
        hasAnythingInArchive={hasAnythingInArchive}
        hasActiveListFilters={hasActiveListFilters}
        totalTableRows={totalTableRows}
        paginatedDisplayItems={paginatedDisplayItems}
        groups={groups}
        items={items}
        usageByEstimateId={usageByEstimateId}
        groupIdsWithLockedEstimate={groupIdsWithLockedEstimate}
        effectiveExpandedAddressKey={effectiveExpandedAddressKey}
        onToggleAddressExpand={onToggleAddressExpand}
        onAddressPipelineStage={onAddressPipelineStage}
        onSetEstimatesArchivedByAddress={onSetEstimatesArchivedByAddress}
        onGroupMarkupChange={onGroupMarkupChange}
        router={router}
        onPresetPipelineStage={onPresetPipelineStage}
        onPresetArchived={onPresetArchived}
        onPresetMarkupChange={onPresetMarkupChange}
        onDetachEdit={onDetachEdit}
        onCopyPreset={onCopyPreset}
        onOpenWorkScopeSplit={onOpenWorkScopeSplit}
        onTrashPreset={onTrashPreset}
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
