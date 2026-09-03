'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { EstimatesListFiltersBar } from './EstimatesListFiltersBar';
import { EstimatesListFiltersPanel } from './EstimatesListFiltersPanel';
import { EstimatesListModals } from './EstimatesListModals';
import { EstimatesListPageHeader } from './EstimatesListPageHeader';
import { EstimatesListTable } from './EstimatesListTable';
import { isUsageLocked } from './estimatesListUtils';
import type { EstimatesListPageModel } from './hooks/useEstimatesListPage';

export function EstimatesListLoadingState() {
  return (
    <div className={cdBase.page}>
      <p className={cdBase.hint}>Загрузка…</p>
    </div>
  );
}

type EstimatesListPageViewProps = EstimatesListPageModel;

export function EstimatesListPageView({
  router,
  archiveView,
  pipelineTab,
  saving,
  error,
  ok,
  load,
  filters,
  navigation,
  modals,
  generateFromMeasurement,
  derived,
  mutations,
}: EstimatesListPageViewProps) {
  const { visibleItems, pipelineTabCounts, archiveCount, addressGroupCount } = derived;

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdEstimatesList.estimatesPage}${archiveView ? ` ${cdEstimatesList.estimatesPageInArchive}` : ''}`}
    >
      <EstimatesListPageHeader
        archiveView={archiveView}
        onNavigateArchiveView={navigation.navigateArchiveView}
        listViewMode={filters.listViewMode}
        visibleItemCount={visibleItems.length}
        addressGroupCount={addressGroupCount}
        autosaveVisible={ok === 'Сохранено.'}
        pipelineTab={pipelineTab}
        pipelineTabCounts={pipelineTabCounts}
        onPipelineTabChange={navigation.navigatePipelineTab}
        saving={saving}
        refreshing={load.refreshing}
        onGenerateFromMeasurement={() => void generateFromMeasurement.open()}
        onRefresh={() => void mutations.refreshEstimates()}
        trashCount={modals.trashCount}
        onOpenTrash={() => modals.setTrashOpen(true)}
        archiveCount={archiveCount}
      />

      {error ? <p className={cdDocPreview.error}>{error}</p> : null}
      {ok && ok !== 'Сохранено.' ? <p className={cdDocPreview.success}>{ok}</p> : null}

      <EstimatesListFiltersPanel
        listScope={filters.listScope}
        search={filters.search}
        listViewMode={filters.listViewMode}
        managerFilter={filters.managerFilter}
        managerOptions={load.managerOptions}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        limit={filters.limit}
      >
        <EstimatesListFiltersBar
          loading={load.loading}
          saving={saving}
          search={filters.search}
          onSearchChange={filters.setSearch}
          listScope={filters.listScope}
          onListScopeChange={filters.setListScope}
          scopeCounts={derived.scopeCounts}
          listViewMode={filters.listViewMode}
          onListViewModeChange={filters.setListViewMode}
          managerFilter={filters.managerFilter}
          onManagerFilterChange={filters.setManagerFilter}
          managerOptions={load.managerOptions}
          dateFrom={filters.dateFrom}
          onDateFromChange={filters.setDateFrom}
          dateTo={filters.dateTo}
          onDateToChange={filters.setDateTo}
          limit={filters.limit}
          onLimitChange={(nextLimit) => {
            filters.setLimit(nextLimit);
            filters.setPage(1);
          }}
        />
      </EstimatesListFiltersPanel>

      <EstimatesListTable
        archiveView={archiveView}
        pipelineTab={pipelineTab}
        loading={load.loading}
        refreshing={load.refreshing}
        saving={saving}
        visibleItemCount={visibleItems.length}
        hasAnythingInArchive={archiveCount > 0}
        hasActiveListFilters={filters.hasActiveListFilters}
        totalTableRows={derived.totalTableRows}
        paginatedDisplayItems={derived.paginatedDisplayItems}
        listSortBy={filters.listSortBy}
        listSortOrder={filters.listSortOrder}
        onSort={filters.handleListSortChange}
        groups={load.groups}
        items={load.items}
        usageByEstimateId={derived.usageByEstimateId}
        groupIdsWithLockedEstimate={derived.groupIdsWithLockedEstimate}
        effectiveExpandedAddressKey={filters.effectiveExpandedAddressKey}
        onToggleAddressExpand={(addressKey) =>
          filters.setExpandedAddressKey((current) => (current === addressKey ? null : addressKey))
        }
        onAddressPipelineStage={mutations.setAddressPipelineStage}
        onSetEstimatesArchivedByAddress={mutations.setEstimatesArchivedByAddress}
        onGroupMarkupChange={mutations.updateGroupAdditionalMarkupPercent}
        router={router}
        onPresetPipelineStage={mutations.setPresetPipelineStage}
        onPresetArchived={mutations.setPresetArchived}
        onArchivePreset={modals.setArchiveConfirmModal}
        onPresetMarkupChange={mutations.updatePresetAdditionalMarkupPercent}
        onDetachEdit={(estimateId, usages) => modals.setDetachEditModal({ estimateId, usages })}
        onCopyPreset={modals.setCopyChoicePresetId}
        onOpenWorkScopeSplit={modals.setWorkScopeModalPresetId}
        onTrashPreset={modals.setTrashConfirmModal}
        page={filters.page}
        limit={filters.limit}
        onPageChange={filters.setPage}
      />

      <EstimatesListModals
        saving={saving}
        archiveView={archiveView}
        groups={load.groups}
        items={load.items}
        workScopePreset={modals.workScopePreset}
        onCloseWorkScope={() => modals.setWorkScopeModalPresetId(null)}
        onWorkScopeSave={mutations.handleWorkScopeSave}
        copyChoicePreset={modals.copyChoicePreset}
        copyChoiceHasLockedUsage={
          modals.copyChoicePreset
            ? (derived.usageByEstimateId.get(modals.copyChoicePreset.id) ?? []).some((u) =>
                isUsageLocked(u)
              )
            : false
        }
        onCloseCopyChoice={() => modals.setCopyChoicePresetId(null)}
        onCopyChoose={(choice) => {
          if (!modals.copyChoicePreset) return;
          const qs = new URLSearchParams({ copyFrom: modals.copyChoicePreset.id });
          if (choice.kind === 'linked') {
            qs.set('splitInstance', '1');
            if (choice.target.mode === 'new') qs.set('newSplitBundle', '1');
            if (choice.target.mode === 'join') qs.set('splitBundle', choice.target.bundleId);
          }
          modals.setCopyChoicePresetId(null);
          router.push(`/admin/contract-documents/estimates/workspace?${qs}`);
        }}
        detachEditOpen={modals.detachEditModal != null}
        onCancelDetachEdit={() => modals.setDetachEditModal(null)}
        onConfirmDetachEdit={mutations.handleConfirmDetachEdit}
        trashConfirmModal={modals.trashConfirmModal}
        onCloseTrashConfirm={() => modals.setTrashConfirmModal(null)}
        onConfirmTrashMove={mutations.handleConfirmTrashMove}
        archiveConfirmModal={modals.archiveConfirmModal}
        onCloseArchiveConfirm={() => modals.setArchiveConfirmModal(null)}
        onConfirmArchive={mutations.handleConfirmArchive}
        trashOpen={modals.trashOpen}
        trashMineOnly={modals.trashMineOnly}
        onCloseTrash={() => {
          modals.setTrashOpen(false);
          void modals.refreshTrashCount();
        }}
        onTrashRestored={() => {
          void mutations.refreshEstimates();
          void modals.refreshTrashCount();
        }}
        isGenerateFromMeasurementOpen={generateFromMeasurement.isOpen}
        completedMeasurements={generateFromMeasurement.completedMeasurements}
        completedMeasurementsBusy={generateFromMeasurement.busy}
        selectedMeasurementId={generateFromMeasurement.selectedMeasurementId}
        onSelectedMeasurementIdChange={generateFromMeasurement.setSelectedMeasurementId}
        onCloseGenerateFromMeasurement={generateFromMeasurement.close}
        onCreateFromMeasurement={(measurementId) => {
          router.push(
            `/admin/contract-documents/estimates/workspace?fromMeasurement=${encodeURIComponent(measurementId)}`
          );
        }}
      />
    </div>
  );
}
