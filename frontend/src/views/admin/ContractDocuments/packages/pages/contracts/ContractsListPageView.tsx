'use client';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import { ContractsListFiltersBar } from './list/ContractsListFiltersBar';
import { ContractsListFiltersPanel } from './list/ContractsListFiltersPanel';
import { ContractsListModals } from './list/ContractsListModals';
import { ContractsListPageHeader } from './list/ContractsListPageHeader';
import { ContractsListSavedViewsBar } from './list/ContractsListSavedViewsBar';
import { ContractsListTable } from './list/ContractsListTable';
import type { ContractsListPageModel } from './list/hooks/useContractsListPage';

export function ContractsListLoadingState() {
  return (
    <div className={cdBase.page}>
      <p className={cdBase.hint}>Загрузка…</p>
    </div>
  );
}

type ContractsListPageViewProps = ContractsListPageModel;

export function ContractsListPageView({
  router,
  error,
  load,
  filters,
  modals,
  derived,
  mutations,
  savedViews,
  objectsById,
  visibleColumns,
  setVisibleColumns,
}: ContractsListPageViewProps) {
  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <ContractsListPageHeader
        visibleRowCount={derived.totalVisible}
        objectGroupCount={derived.objectGroupCount}
        creating={modals.creating}
        loading={load.loading}
        actionsBusy={modals.actionsBusy}
        trashCount={load.trashCount}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        onCreateClick={() => modals.setCreateDirectionModalOpen(true)}
        onRefresh={() => void load.load()}
        onOpenTrash={() => modals.setTrashOpen(true)}
      />

      {error ? <p className={cdDocPreview.error}>{error}</p> : null}

      <ContractsListFiltersPanel
        listScope={filters.listScope}
        queuePreset={filters.queuePreset}
        statusFilters={filters.statusFilters}
        directionFilters={filters.directionFilters}
        directions={load.directions}
        search={filters.search}
        listViewMode={filters.listViewMode}
        managerFilter={filters.managerFilter}
        managerOptions={load.managerOptions}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        limit={filters.limit}
        activeSavedViewTitle={
          savedViews.activeViewId
            ? (savedViews.views.find((view) => view.id === savedViews.activeViewId)?.title ?? null)
            : null
        }
      >
        <ContractsListFiltersBar
          loading={load.loading}
          search={filters.search}
          onSearchChange={filters.setSearch}
          listScope={filters.listScope}
          onListScopeChange={filters.setListScope}
          queuePreset={filters.queuePreset}
          onQueuePresetChange={filters.applyQueuePreset}
          statusFilters={filters.statusFilters}
          onStatusFiltersChange={filters.setStatusFilters}
          listViewMode={filters.listViewMode}
          onListViewModeChange={filters.setListViewMode}
          managerFilter={filters.managerFilter}
          onManagerFilterChange={filters.setManagerFilter}
          managerOptions={load.managerOptions}
          directionFilters={filters.directionFilters}
          onDirectionFiltersChange={filters.setDirectionFilters}
          directions={load.directions}
          myDirectionIds={load.myDirectionIds}
          scopeCounts={derived.scopeCounts}
          queuePresetCounts={derived.queuePresetCounts}
          directionCounts={derived.directionCounts}
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

        <ContractsListSavedViewsBar
          loading={load.loading}
          views={savedViews.views}
          activeViewId={savedViews.activeViewId}
          draftTitle={savedViews.draftTitle}
          onDraftTitleChange={savedViews.setDraftTitle}
          saveOpen={savedViews.saveOpen}
          onSaveOpenChange={savedViews.setSaveOpen}
          suggestedTitles={savedViews.suggestedTitles}
          onApplyView={savedViews.applyView}
          onOpenSaveComposer={savedViews.openSaveComposer}
          onSaveCurrentView={savedViews.saveCurrentView}
          onDeleteView={savedViews.deleteView}
          onRenameView={savedViews.renameView}
        />
      </ContractsListFiltersPanel>

      <ContractsListTable
        loading={load.loading}
        rowsCount={load.rows.length}
        tableDisplayItemsCount={derived.tableDisplayItems.length}
        emptyFilteredListMessage={derived.emptyFilteredListMessage}
        contractsListTableColSpan={derived.contractsListTableColSpan}
        addendumColumnCount={derived.addendumColumnCount}
        visibleColumns={visibleColumns}
        paginatedDisplayItems={derived.paginatedDisplayItems}
        listSortBy={filters.listSortBy}
        listSortOrder={filters.listSortOrder}
        onSort={filters.handleListSortChange}
        totalVisible={derived.totalVisible}
        page={filters.page}
        limit={filters.limit}
        onPageChange={filters.setPage}
        objectsById={objectsById}
        expandedObjectId={filters.expandedObjectId}
        onToggleObjectExpand={(objectId) =>
          filters.setExpandedObjectId((current) => (current === objectId ? null : objectId))
        }
        crmUsers={load.crmUsers}
        creating={modals.creating}
        copyingPackageId={modals.copyingPackageId}
        deletingPackageId={modals.deletingPackageId}
        router={router}
        onCopyPackage={(id) => void mutations.handleCopyPackage(id)}
        onDeletePackage={mutations.requestDeletePackage}
        onOpenHub={modals.setPackageHubPackageId}
        onOpenWorkOrdersHub={modals.setWorkOrdersHubPackageId}
        onOpenActPhotos={modals.setActPhotosModal}
      />

      <ContractsListModals
        creating={modals.creating}
        createDirectionModalOpen={modals.createDirectionModalOpen}
        createDirectionBusyKind={modals.createDirectionBusyKind}
        onCloseCreateDirection={() => modals.setCreateDirectionModalOpen(false)}
        onCreate={mutations.handleCreate}
        actPhotosModal={modals.actPhotosModal}
        onCloseActPhotos={() => modals.setActPhotosModal(null)}
        deleteConfirmOpen={modals.packagePendingDelete != null}
        deleteConfirmMessage={mutations.deleteConfirmMessage}
        onCloseDeleteConfirm={() => modals.setPackagePendingDelete(null)}
        onConfirmDelete={mutations.handleConfirmDeletePackage}
        trashOpen={modals.trashOpen}
        onCloseTrash={() => {
          modals.setTrashOpen(false);
          void load.refreshTrashCount();
        }}
        onTrashRestored={() => {
          void load.load();
          void load.refreshTrashCount();
        }}
        packageHubPackageId={modals.packageHubPackageId}
        onClosePackageHub={() => modals.setPackageHubPackageId(null)}
        onPackageHubUpdated={() => void load.load()}
        workOrdersHubPackageId={modals.workOrdersHubPackageId}
        onCloseWorkOrdersHub={() => modals.setWorkOrdersHubPackageId(null)}
        onWorkOrdersHubUpdated={() => void load.load()}
      />
    </div>
  );
}
