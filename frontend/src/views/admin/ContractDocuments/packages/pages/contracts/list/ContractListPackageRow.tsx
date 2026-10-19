'use client';

import { useState } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { useAuth } from '@/features/auth';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPackageDiagnosticExport,
  getContractDocumentPackageDiagnosticExport,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmUser } from '@/shared/api/admin-crm';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { ShareIcon } from '@/shared/ui/icons';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { RevertSigningIcon } from '@/shared/ui/icons/admin/RevertSigningIcon';
import { adminContractDocumentsContractsPackageHref } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';
import { getDisplayContractNumber } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import { mergePackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import { PackageHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/PackageHubIcon';
import { PACKAGE_HUB_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/packageHubConstants';
import { PackageInvoicesHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesHubIcon';
import { PACKAGE_INVOICES_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesModal';
import { packageListPipelineStatusLabel } from '@/views/admin/ContractDocuments/packages/platform/hub/pipeline/packagePipeline';
import { PackageWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubIcon';
import { formatPackageWorkOrderHubModalTitle } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import {
  type ContractsListActPhotoItem,
  contractsListAttachedActPhotosFromForm,
  contractsListContractCloseActDateCell,
  contractsListWorkStartActDateCell,
} from './contractsListActPhotos';
import { type ContractsListColumnKey, isContractsListColumnVisible } from './contractsListColumns';
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
  contractsListContractAndSignedAddendaTotalRub,
  contractsListContractTotalAmount,
  contractsListCustomerName,
  contractsListManagerDisplayLabel,
  contractsListObjectAddress,
  contractsListPackageKindLabel,
  contractsListPipelineStatusInfo,
  contractsListRemainingToPayRub,
  contractsListRemoteSigningHintLabel,
  contractsListSignedAddendumRub,
  contractsListWorkDescription,
  formatSigningDateOnly,
  isPackageDraftDeletionAllowed,
  sumPackagePaymentsRub,
} from './contractsListUtils';

function downloadPackageDiagnosticFile(
  payload: ContractDocumentPackageDiagnosticExport,
  contractLabel: string
) {
  const safeTitle =
    contractLabel
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 60) || 'договор';
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `договор-${safeTitle}-диагностика-${day}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type ContractListPackageRowProps = {
  pkg: ContractDocumentPackage;
  childOfObject?: boolean;
  /** Последний договор в раскрытой карточке объекта — скругление низа. */
  lastObjectChild?: boolean;
  /** Договор без объекта — отдельная карточка со скруглением (режим by_object). */
  standaloneCard?: boolean;
  addendumColumnCount: number;
  visibleColumns: readonly ContractsListColumnKey[];
  crmUsers: CrmUser[];
  loading: boolean;
  creating: boolean;
  copyingPackageId: string | null;
  deletingPackageId: string | null;
  router: AppRouterInstance;
  onCopy: (packageId: string) => void;
  onDelete: (pkg: ContractDocumentPackage) => void;
  /** Супер-админ: отмена подписания; кнопка видна только для подписанных договоров. */
  onRevertSigning?: (pkg: ContractDocumentPackage) => void;
  revertSigningBusy?: boolean;
  onOpenHub: (packageId: string) => void;
  onOpenInvoicesHub: (packageId: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  onOpenCustomerShare: (packageId: string) => void;
  onOpenRemoteSigning: (packageId: string) => void;
  onOpenActPhotos: (payload: { items: ContractsListActPhotoItem[]; contractLabel: string }) => void;
};

export function ContractListPackageRow({
  pkg,
  childOfObject,
  lastObjectChild,
  standaloneCard,
  addendumColumnCount,
  visibleColumns,
  crmUsers,
  loading,
  creating,
  copyingPackageId,
  deletingPackageId,
  router,
  onCopy,
  onDelete,
  onRevertSigning,
  revertSigningBusy,
  onOpenHub,
  onOpenInvoicesHub,
  onOpenWorkOrdersHub,
  onOpenCustomerShare,
  onOpenRemoteSigning,
  onOpenActPhotos,
}: ContractListPackageRowProps) {
  const col = (key: ContractsListColumnKey) => isContractsListColumnVisible(visibleColumns, key);
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
  const managerLabel = contractsListManagerDisplayLabel(form, crmUsers, pkg);
  const copyBusy = copyingPackageId === pkg.id;
  const deleteBusy = deletingPackageId === pkg.id;
  const canDeleteDraft = isPackageDraftDeletionAllowed(pkg);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [diagnosticExporting, setDiagnosticExporting] = useState(false);

  const handleDiagnosticExport = async () => {
    setDiagnosticExporting(true);
    try {
      const payload = await getContractDocumentPackageDiagnosticExport(pkg.id);
      downloadPackageDiagnosticFile(payload, num);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Не удалось выгрузить договор');
    } finally {
      setDiagnosticExporting(false);
    }
  };
  const {
    status: pipelineStatus,
    signedPaymentDue,
    signedPaymentDuePaidPct,
  } = contractsListPipelineStatusInfo(pkg);
  const actPhotoItems = contractsListAttachedActPhotosFromForm(form, publicUploadUrl);
  const packageHref = adminContractDocumentsContractsPackageHref(pkg.id);
  const rowClass = childOfObject
    ? `${dataTableStyles.row} ${cdHub.contractsListClickableRow} ${cdBase.contractsListChildRow}${
        lastObjectChild ? ` ${cdHub.contractsListChildRowLast}` : ''
      }`
    : standaloneCard
      ? `${dataTableStyles.row} ${cdHub.contractsListClickableRow} ${cdHub.contractsListStandaloneCard}`
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
      {col('kind') ? (
        <td className={cdHub.contractsListKindCol}>{contractsListPackageKindLabel(pkg.kind)}</td>
      ) : null}
      {col('contractNumber') ? <td>{num}</td> : null}
      {col('date') ? <td>{formatSigningDateOnly(pkg)}</td> : null}
      {col('status') ? (
        <td>
          <span
            className={contractsListPipelineStatusBadgeClass(pipelineStatus, {
              signedPaymentDue,
            })}
            title={
              signedPaymentDue
                ? `Договор подписан, оплачено ${signedPaymentDuePaidPct ?? '—'}% от суммы договора (порог 70%)`
                : undefined
            }
          >
            {packageListPipelineStatusLabel(pipelineStatus, {
              signedPaymentDue,
              signedPaymentDuePaidPct,
            })}
          </span>
          {(() => {
            const label = contractsListRemoteSigningHintLabel(fd, {
              concluded: pkg.status === 'CONTRACT_CONCLUDED',
            });
            if (!label) return null;
            return (
              <div className={cdHub.contractsListRemoteSigningHint} title={label}>
                {label}
              </div>
            );
          })()}
        </td>
      ) : null}
      {col('customer') ? <td>{contractsListCustomerName(fd)}</td> : null}
      {col('manager') ? (
        <td title={managerLabel}>{ellipsizeContractsListOneLine(managerLabel, 40)}</td>
      ) : null}
      {col('address') ? (
        <td>{ellipsizeContractsListOneLine(contractsListObjectAddress(fd), 64)}</td>
      ) : null}
      {col('workDescription') ? (
        <td title={workDesc.length > workShort.length ? workDesc : undefined}>{workShort}</td>
      ) : null}
      {col('contractTotal') ? <td>{formatContractsListMoney(totalRub)}</td> : null}
      {col('addenda') && addendumColumnCount > 0
        ? Array.from({ length: addendumColumnCount }, (_, i) => (
            <td key={`addendum_td_${pkg.id}_${i + 1}`}>
              {formatContractsListMoney(contractsListSignedAddendumRub(form, i))}
            </td>
          ))
        : null}
      {col('addenda') && addendumColumnCount > 0 ? (
        <td>{formatContractsListMoney(totalWithAddendaRub)}</td>
      ) : null}
      {col('paid') ? <td>{formatContractsListPaidWithPercent(paidRub, paymentBaseRub)}</td> : null}
      {col('remaining') ? <td>{formatContractsListMoney(remainingRub)}</td> : null}
      {col('workStartAct') ? (
        <td title="Акт начала работ">{contractsListWorkStartActDateCell(form)}</td>
      ) : null}
      {col('closeAct') ? (
        <td title="Акт сдачи-приёмки">{contractsListContractCloseActDateCell(form)}</td>
      ) : null}
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
              title={PACKAGE_INVOICES_MODAL_TITLE}
              aria-label={`${PACKAGE_INVOICES_MODAL_TITLE} (${num})`}
              onClick={() => onOpenInvoicesHub(pkg.id)}
            >
              <PackageInvoicesHubIcon />
            </AdminTableIconButton>
          </div>
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
                loading || creating || copyingPackageId !== null || deletingPackageId !== null
              }
              title="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
              aria-label={`Отправить документы заказчику (договор ${num})`}
              onClick={() => onOpenCustomerShare(pkg.id)}
            >
              <ShareIcon />
            </AdminTableIconButton>
          </div>
          <div className={cdEstimatesList.contractsListActionsSlot}>
            <AdminTableIconButton
              disabled={
                loading || creating || copyingPackageId !== null || deletingPackageId !== null
              }
              className={pkg.hasSignedSigningSessions ? cdEstimatesList.epSignedGold : undefined}
              title={
                pkg.hasSignedSigningSessions
                  ? 'Отправить на дистанционное подписание (есть подписанные через ЭП документы)'
                  : 'Отправить на дистанционное подписание'
              }
              aria-label={`Отправить на подписание (договор ${num})`}
              onClick={() => onOpenRemoteSigning(pkg.id)}
            >
              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>ЭП</span>
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
            {onRevertSigning && pkg.status === 'CONTRACT_CONCLUDED' ? (
              <AdminTableIconButton
                disabled={
                  loading ||
                  creating ||
                  copyingPackageId !== null ||
                  deletingPackageId !== null ||
                  (revertSigningBusy ?? false)
                }
                aria-busy={revertSigningBusy}
                aria-label={
                  revertSigningBusy
                    ? 'Отмена подписания…'
                    : `Отменить подписание договора ${num} и вернуть на доработку`
                }
                title="Отменить подписание и вернуть на доработку (только супер-админ)"
                onClick={() => onRevertSigning(pkg)}
              >
                <RevertSigningIcon
                  className={revertSigningBusy ? cdChrome.estimatesRefreshIconSpinning : undefined}
                />
              </AdminTableIconButton>
            ) : (
              <span className={cdEstimatesList.contractsListActionsIconPlaceholder} aria-hidden />
            )}
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
          {isSuperAdmin ? (
            <div className={cdEstimatesList.contractsListActionsSlot}>
              <AdminTableIconButton
                disabled={
                  loading ||
                  creating ||
                  copyingPackageId !== null ||
                  deletingPackageId !== null ||
                  diagnosticExporting
                }
                aria-busy={diagnosticExporting}
                aria-label={
                  diagnosticExporting
                    ? 'Выгрузка диагностики договора…'
                    : `Выгрузить диагностику договора ${num} в JSON`
                }
                title="Выгрузить договор в JSON: formData, оплаты, монтажи и расчёт статусов (реестр, план-график ОДПЖ) — только для супер-админа"
                onClick={() => void handleDiagnosticExport()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </AdminTableIconButton>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
