'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { CrmUser } from '@/shared/api/admin-crm';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { adminContractDocumentsContractsPackageHref } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';

import cdBase from '../../../../styles/base.module.css';
import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import { getDisplayContractNumber } from '../../../platform/form/packageContractDisplay';
import { mergePackageFormData } from '../../../platform/form/packageForm';
import { PackageHubIcon } from '../../../platform/hub/PackageHubIcon';
import { PackageWorkOrdersHubIcon } from '../../../platform/hub/PackageWorkOrdersHubIcon';
import { PACKAGE_HUB_MODAL_TITLE } from '../../../platform/hub/packageHubConstants';
import { packageListPipelineStatusLabel } from '../../../platform/hub/packagePipeline';
import { formatPackageWorkOrderHubModalTitle } from '../../../platform/hub/packageWorkOrderHubTabs';
import {
  type ContractsListActPhotoItem,
  contractsListAttachedActPhotosFromForm,
  contractsListContractCloseActDateCell,
  contractsListWorkStartActDateCell,
} from './contractsListActPhotos';
import {
  ellipsizeContractsListOneLine,
  formatContractsListMoney,
  formatContractsListPaidWithPercent,
} from './contractsListFormatters';
import {
  ContractsListActPhotosTriggerIcon,
  contractsListPipelineStatusBadgeClass,
} from './contractsListTableUi';
import {
  aggregateContractsListPackagesMoney,
  contractsListContractAndSignedAddendaTotalRub,
  contractsListContractTotalAmount,
  contractsListCustomerName,
  contractsListManagerDisplayLabel,
  contractsListObjectAddress,
  contractsListPackageKindLabel,
  contractsListPipelineStatus,
  contractsListRemainingToPayRub,
  contractsListSignedAddendumRub,
  contractsListWorkDescription,
  formatSigningDateOnly,
  isPackageDraftDeletionAllowed,
  sumPackagePaymentsRub,
} from './contractsListUtils';

type ContractListObjectRowProps = {
  objectId: string;
  packages: ContractDocumentPackage[];
  objectsById: Map<string, ContractDocumentObject>;
  addendumColumnCount: number;
  expandedObjectId: string | null;
  onToggleExpand: (objectId: string) => void;
};

export function ContractListObjectRow({
  objectId,
  packages,
  objectsById,
  addendumColumnCount,
  expandedObjectId,
  onToggleExpand,
}: ContractListObjectRowProps) {
  const obj = objectsById.get(objectId) ?? packages[0]?.documentObject;
  const objName =
    (obj && 'name' in obj ? obj.name : null) ?? packages[0]?.documentObject?.name ?? 'Объект';
  const objAddress =
    (obj && 'address' in obj ? obj.address : null) ??
    packages[0]?.documentObject?.address ??
    contractsListObjectAddress((packages[0]?.formData ?? {}) as Record<string, unknown>);
  const objCustomer =
    (obj && 'customerName' in obj ? obj.customerName : null) ??
    packages[0]?.documentObject?.customerName ??
    contractsListCustomerName((packages[0]?.formData ?? {}) as Record<string, unknown>);
  const agg = aggregateContractsListPackagesMoney(packages, addendumColumnCount);
  const paymentBase = addendumColumnCount > 0 ? agg.totalWithAddendaRub : agg.totalRub;
  const expanded = expandedObjectId === objectId;

  return (
    <tr
      className={`${dataTableStyles.row} ${cdBase.contractsListObjectRow} ${
        expanded ? cdBase.contractsListObjectRowExpanded : ''
      }`}
    >
      <td className={cdHub.contractsListSelectCol}>
        <button
          type="button"
          className={cdBase.contractsListExpandBtn}
          aria-expanded={expanded}
          aria-label={expanded ? 'Свернуть договоры' : 'Развернуть договоры'}
          onClick={() => onToggleExpand(objectId)}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </td>
      <td className={cdHub.contractsListKindCol}>Объект</td>
      <td>
        <span className={cdBase.contractsListObjectAddressLabel}>{objName}</span>
        <span className={cdBase.contractsListObjectBadge}>{packages.length} дог.</span>
      </td>
      <td>—</td>
      <td>—</td>
      <td>{objCustomer || '—'}</td>
      <td>—</td>
      <td>{ellipsizeContractsListOneLine(objAddress || '—', 64)}</td>
      <td>—</td>
      <td>{formatContractsListMoney(agg.totalRub)}</td>
      {addendumColumnCount > 0
        ? Array.from({ length: addendumColumnCount }, (_, i) => (
            <td key={`obj_add_${objectId}_${i + 1}`}>—</td>
          ))
        : null}
      {addendumColumnCount > 0 ? (
        <td>{formatContractsListMoney(agg.totalWithAddendaRub)}</td>
      ) : null}
      <td>{formatContractsListPaidWithPercent(agg.paidRub, paymentBase)}</td>
      <td>{formatContractsListMoney(agg.remainingRub)}</td>
      <td>—</td>
      <td>—</td>
      <td className={cdHub.contractsListActionsCol} />
    </tr>
  );
}

type ContractListPackageRowProps = {
  pkg: ContractDocumentPackage;
  childOfObject?: boolean;
  addendumColumnCount: number;
  crmUsers: CrmUser[];
  loading: boolean;
  creating: boolean;
  copyingPackageId: string | null;
  deletingPackageId: string | null;
  router: AppRouterInstance;
  onCopy: (packageId: string) => void;
  onDelete: (pkg: ContractDocumentPackage) => void;
  onOpenHub: (packageId: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  onOpenActPhotos: (payload: { items: ContractsListActPhotoItem[]; contractLabel: string }) => void;
};

export function ContractListPackageRow({
  pkg,
  childOfObject,
  addendumColumnCount,
  crmUsers,
  loading,
  creating,
  copyingPackageId,
  deletingPackageId,
  router,
  onCopy,
  onDelete,
  onOpenHub,
  onOpenWorkOrdersHub,
  onOpenActPhotos,
}: ContractListPackageRowProps) {
  const fd = pkg.formData ?? {};
  const form = mergePackageFormData(fd);
  const num = getDisplayContractNumber({ formData: fd });
  const paidRub = sumPackagePaymentsRub(pkg);
  const totalRub = contractsListContractTotalAmount(fd);
  const totalWithAddendaRub = contractsListContractAndSignedAddendaTotalRub(
    form,
    totalRub,
    addendumColumnCount
  );
  const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
  const remainingRub = contractsListRemainingToPayRub(paymentBaseRub, paidRub);
  const workDesc = contractsListWorkDescription(fd);
  const workShort = ellipsizeContractsListOneLine(workDesc, 100);
  const managerLabel = contractsListManagerDisplayLabel(form, crmUsers);
  const copyBusy = copyingPackageId === pkg.id;
  const deleteBusy = deletingPackageId === pkg.id;
  const canDeleteDraft = isPackageDraftDeletionAllowed(pkg);
  const pipelineStatus = contractsListPipelineStatus(pkg);
  const actPhotoItems = contractsListAttachedActPhotosFromForm(form, publicUploadUrl);
  const packageHref = adminContractDocumentsContractsPackageHref(pkg.id);
  const rowClass = childOfObject
    ? `${dataTableStyles.row} ${cdHub.contractsListClickableRow} ${cdBase.contractsListChildRow}`
    : `${dataTableStyles.row} ${cdHub.contractsListClickableRow}`;

  return (
    <tr
      className={rowClass}
      tabIndex={0}
      aria-label={`Открыть договор ${num}`}
      onClick={() => router.push(packageHref)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(packageHref);
        }
      }}
    >
      <td className={cdHub.contractsListSelectCol} />
      <td className={cdHub.contractsListKindCol}>{contractsListPackageKindLabel(pkg.kind)}</td>
      <td>{num}</td>
      <td>{formatSigningDateOnly(pkg)}</td>
      <td>
        <span className={contractsListPipelineStatusBadgeClass(pipelineStatus)}>
          {packageListPipelineStatusLabel(pipelineStatus)}
        </span>
      </td>
      <td>{contractsListCustomerName(fd)}</td>
      <td title={managerLabel}>{ellipsizeContractsListOneLine(managerLabel, 40)}</td>
      <td>{ellipsizeContractsListOneLine(contractsListObjectAddress(fd), 64)}</td>
      <td title={workDesc.length > workShort.length ? workDesc : undefined}>{workShort}</td>
      <td>{formatContractsListMoney(totalRub)}</td>
      {addendumColumnCount > 0
        ? Array.from({ length: addendumColumnCount }, (_, i) => (
            <td key={`addendum_td_${pkg.id}_${i + 1}`}>
              {formatContractsListMoney(contractsListSignedAddendumRub(form, i))}
            </td>
          ))
        : null}
      {addendumColumnCount > 0 ? <td>{formatContractsListMoney(totalWithAddendaRub)}</td> : null}
      <td>{formatContractsListPaidWithPercent(paidRub, paymentBaseRub)}</td>
      <td>{formatContractsListMoney(remainingRub)}</td>
      <td title="Акт начала работ">{contractsListWorkStartActDateCell(form)}</td>
      <td title="Акт сдачи-приёмки">{contractsListContractCloseActDateCell(form)}</td>
      <td
        className={cdHub.contractsListActionsCol}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          className={`${cdEstimatesList.estimatesCardActions} ${cdEstimatesList.contractsListActionsGrid}`}
        >
          <div className={cdEstimatesList.contractsListActionsSlot}>
            <AdminTableIconButton
              disabled={
                loading || creating || copyingPackageId !== null || deletingPackageId !== null
              }
              title={PACKAGE_HUB_MODAL_TITLE}
              aria-label={`${PACKAGE_HUB_MODAL_TITLE} (${num})`}
              onClick={() => onOpenHub(pkg.id)}
            >
              <PackageHubIcon />
            </AdminTableIconButton>
          </div>
          <div className={cdEstimatesList.contractsListActionsSlot}>
            <AdminTableIconButton
              disabled={
                loading || creating || copyingPackageId !== null || deletingPackageId !== null
              }
              title={formatPackageWorkOrderHubModalTitle(num)}
              aria-label={`Открыть ${formatPackageWorkOrderHubModalTitle(num)}`}
              onClick={() => onOpenWorkOrdersHub(pkg.id)}
            >
              <PackageWorkOrdersHubIcon />
            </AdminTableIconButton>
          </div>
          <div className={cdEstimatesList.contractsListActionsSlot}>
            <AdminTableIconButton
              disabled={
                loading ||
                creating ||
                (copyingPackageId !== null && !copyBusy) ||
                deletingPackageId !== null
              }
              aria-busy={copyBusy}
              aria-label={
                copyBusy
                  ? 'Копирование договора…'
                  : 'Копировать договор (данные без прикреплённых расчётов)'
              }
              title="Копировать: все вкладки, без расчётов в смете и в Д/с"
              onClick={() => onCopy(pkg.id)}
            >
              <CopyIcon className={copyBusy ? cdChrome.estimatesRefreshIconSpinning : undefined} />
            </AdminTableIconButton>
          </div>
          <div className={cdEstimatesList.contractsListActionsSlot}>
            <AdminTableIconButton
              disabled={
                !canDeleteDraft ||
                loading ||
                creating ||
                copyingPackageId !== null ||
                (deletingPackageId !== null && !deleteBusy)
              }
              aria-busy={deleteBusy}
              aria-label={
                deleteBusy
                  ? 'Перемещение в корзину…'
                  : canDeleteDraft
                    ? 'В корзину'
                    : 'Удаление недоступно: прикреплена смета или есть оплаты'
              }
              title={
                canDeleteDraft
                  ? 'В корзину (если нет прикреплённой сметы и записей об оплатах)'
                  : 'В корзину нельзя: к договору прикреплена смета или в журнале есть оплаты'
              }
              onClick={() => onDelete(pkg)}
            >
              <DeleteIcon
                className={deleteBusy ? cdChrome.estimatesRefreshIconSpinning : undefined}
              />
            </AdminTableIconButton>
          </div>
          <div className={cdEstimatesList.contractsListActionsSlot}>
            {actPhotoItems.length > 0 ? (
              <AdminTableIconButton
                disabled={
                  loading || creating || copyingPackageId !== null || deletingPackageId !== null
                }
                title="Просмотр загруженных фото актов (статусы «В работе», «Договор закрыт»)"
                aria-label={`Просмотр фото актов договора ${num}`}
                onClick={() =>
                  onOpenActPhotos({
                    items: actPhotoItems,
                    contractLabel: num,
                  })
                }
              >
                <ContractsListActPhotosTriggerIcon />
              </AdminTableIconButton>
            ) : (
              <span className={cdEstimatesList.contractsListActionsIconPlaceholder} aria-hidden />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
