'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { CrmUser } from '@/shared/api/admin-crm';
import { AdminTablePagination } from '@/shared/ui/admin/AdminTablePagination';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import { ContractListObjectRow } from './ContractListObjectRow';
import { ContractListPackageRow } from './ContractListPackageRow';
import type { ContractsListActPhotoItem } from './contractsListActPhotos';
import type { ContractsListDisplayItem } from './contractsListLayout';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';
import { ContractsListSortableTh } from './contractsListTableUi';

type ContractsListTableProps = {
  loading: boolean;
  rowsCount: number;
  tableDisplayItemsCount: number;
  emptyFilteredListMessage: string;
  contractsListTableColSpan: number;
  addendumColumnCount: number;
  paginatedDisplayItems: ContractsListDisplayItem[];
  listSortBy: ContractsListSortBy;
  listSortOrder: ContractsListSortOrder;
  onSort: (column: ContractsListSortBy) => void;
  totalVisible: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  objectsById: Map<string, ContractDocumentObject>;
  expandedObjectId: string | null;
  onToggleObjectExpand: (objectId: string) => void;
  crmUsers: CrmUser[];
  creating: boolean;
  copyingPackageId: string | null;
  deletingPackageId: string | null;
  router: AppRouterInstance;
  onCopyPackage: (packageId: string) => void;
  onDeletePackage: (pkg: ContractDocumentPackage) => void;
  onOpenHub: (packageId: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  onOpenActPhotos: (payload: { items: ContractsListActPhotoItem[]; contractLabel: string }) => void;
};

export function ContractsListTable({
  loading,
  rowsCount,
  tableDisplayItemsCount,
  emptyFilteredListMessage,
  contractsListTableColSpan,
  addendumColumnCount,
  paginatedDisplayItems,
  listSortBy,
  listSortOrder,
  onSort,
  totalVisible,
  page,
  limit,
  onPageChange,
  objectsById,
  expandedObjectId,
  onToggleObjectExpand,
  crmUsers,
  creating,
  copyingPackageId,
  deletingPackageId,
  router,
  onCopyPackage,
  onDeletePackage,
  onOpenHub,
  onOpenWorkOrdersHub,
  onOpenActPhotos,
}: ContractsListTableProps) {
  return (
    <div className={`${dataTableStyles.tableContainer} ${cdHub.contractsDirectoryTable}`}>
      <div className={dataTableStyles.tableWrapper}>
        <div className={dataTableStyles.scrollContainer}>
          <table className={`${dataTableStyles.table} ${cdHub.contractsListTable}`}>
            <thead className={dataTableStyles.stickyHeader}>
              <tr>
                <th className={cdHub.contractsListSelectCol} aria-label="Группа" />
                <th className={cdHub.contractsListKindCol}>Направл.</th>
                <ContractsListSortableTh
                  column="contractNumber"
                  title="№ дог."
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="date"
                  title="Дата"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="status"
                  title="Статус"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="customer"
                  title="Заказчик"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="manager"
                  title="Ответственный"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <th>Адрес объекта</th>
                <th>Описание работ</th>
                <th>СД нач.</th>
                {addendumColumnCount > 0
                  ? Array.from({ length: addendumColumnCount }, (_, i) => (
                      <th key={`addendum_th_${i + 1}`}>Д/с №{i + 1}</th>
                    ))
                  : null}
                {addendumColumnCount > 0 ? <th>СД итог.</th> : null}
                <th>Оплачено</th>
                <ContractsListSortableTh
                  column="remaining"
                  title="Остаток"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="workStartAct"
                  title="Акт нр"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <ContractsListSortableTh
                  column="closeAct"
                  title="Акт с/п"
                  sortBy={listSortBy}
                  sortOrder={listSortOrder}
                  onSort={onSort}
                />
                <th className={cdHub.contractsListActionsCol} />
              </tr>
            </thead>
            <tbody className={loading ? dataTableStyles.tbodyRefreshing : undefined}>
              {loading ? (
                <tr>
                  <td colSpan={contractsListTableColSpan} className={dataTableStyles.loadingCell}>
                    Загрузка…
                  </td>
                </tr>
              ) : rowsCount === 0 ? (
                <tr>
                  <td colSpan={contractsListTableColSpan} className={dataTableStyles.emptyCell}>
                    Пока нет ни одного пакета. Нажмите «+ Новый договор».
                  </td>
                </tr>
              ) : tableDisplayItemsCount === 0 ? (
                <tr>
                  <td colSpan={contractsListTableColSpan} className={dataTableStyles.emptyCell}>
                    {emptyFilteredListMessage}
                  </td>
                </tr>
              ) : (
                paginatedDisplayItems.map((item, index) => {
                  if (item.type === 'gap') {
                    return (
                      <tr
                        key={item.id}
                        className={`${cdHub.contractsListObjectGroupGap}${
                          item.size === 'section'
                            ? ` ${cdHub.contractsListObjectGroupGapSection}`
                            : ''
                        }`}
                        aria-hidden
                      >
                        <td colSpan={contractsListTableColSpan} />
                      </tr>
                    );
                  }
                  if (item.type === 'object') {
                    return (
                      <ContractListObjectRow
                        key={`obj-${item.objectId}`}
                        objectId={item.objectId}
                        packages={item.packages}
                        objectsById={objectsById}
                        addendumColumnCount={addendumColumnCount}
                        colSpan={contractsListTableColSpan}
                        expandedObjectId={expandedObjectId}
                        onToggleExpand={onToggleObjectExpand}
                      />
                    );
                  }
                  const next = paginatedDisplayItems[index + 1];
                  const isLastObjectChild =
                    Boolean(item.childOfObject) &&
                    (next == null || next.type !== 'package' || !next.childOfObject);
                  return (
                    <ContractListPackageRow
                      key={item.package.id}
                      pkg={item.package}
                      childOfObject={item.childOfObject}
                      lastObjectChild={isLastObjectChild}
                      standaloneCard={item.standaloneCard}
                      addendumColumnCount={addendumColumnCount}
                      crmUsers={crmUsers}
                      loading={loading}
                      creating={creating}
                      copyingPackageId={copyingPackageId}
                      deletingPackageId={deletingPackageId}
                      router={router}
                      onCopy={onCopyPackage}
                      onDelete={onDeletePackage}
                      onOpenHub={onOpenHub}
                      onOpenWorkOrdersHub={onOpenWorkOrdersHub}
                      onOpenActPhotos={onOpenActPhotos}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {!loading && totalVisible > 0 ? (
        <AdminTablePagination
          page={page}
          limit={limit}
          total={totalVisible}
          onPageChange={onPageChange}
          className={cdHub.contractsListPagination}
          activePageClassName={cdHub.contractsListPaginationPageActive}
        />
      ) : null}
    </div>
  );
}
