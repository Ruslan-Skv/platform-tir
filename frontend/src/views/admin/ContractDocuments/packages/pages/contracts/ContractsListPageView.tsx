'use client';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import { ContractsListFiltersBar } from './list/ContractsListFiltersBar';
import { ContractsListModals } from './list/ContractsListModals';
import { ContractsListPageHeader } from './list/ContractsListPageHeader';
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
  objectsById,
}: ContractsListPageViewProps) {
  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <ContractsListPageHeader
        visibleRowCount={derived.visibleRows.length}
        objectGroupCount={derived.objectGroupCount}
        creating={modals.creating}
        loading={load.loading}
        actionsBusy={modals.actionsBusy}
        trashCount={load.trashCount}
        onCreateClick={() => modals.setCreateDirectionModalOpen(true)}
        onRefresh={() => void load.load()}
        onOpenTrash={() => modals.setTrashOpen(true)}
      />

      {error ? <p className={cdDocPreview.error}>{error}</p> : null}

      <ContractsListFiltersBar
        loading={load.loading}
        search={filters.search}
        onSearchChange={filters.setSearch}
        statusFilter={filters.statusFilter}
        onStatusFilterChange={filters.setStatusFilter}
        listViewMode={filters.listViewMode}
        onListViewModeChange={filters.setListViewMode}
        managerFilter={filters.managerFilter}
        onManagerFilterChange={filters.setManagerFilter}
        managerOptions={load.managerOptions}
        directionFilter={filters.directionFilter}
        onDirectionFilterChange={filters.setDirectionFilter}
        directions={load.directions}
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

      <ContractsListTable
        loading={load.loading}
        rowsCount={load.rows.length}
        tableDisplayItemsCount={derived.tableDisplayItems.length}
        emptyFilteredListMessage={derived.emptyFilteredListMessage}
        contractsListTableColSpan={derived.contractsListTableColSpan}
        addendumColumnCount={derived.addendumColumnCount}
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
