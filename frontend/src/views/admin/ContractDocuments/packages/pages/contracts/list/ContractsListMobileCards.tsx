'use client';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { CrmUser } from '@/shared/api/admin-crm';
import { remoteSigningStatusLabel } from '@/shared/api/contract-documents/admin-contract-document-signing';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { ShareIcon } from '@/shared/ui/icons';
import { CallCustomerIcon } from '@/shared/ui/icons/crm/CallCustomerIcon';
import {
  crmPhoneToTelHref,
  formatCrmPhoneOrDash,
} from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import { getDisplayContractNumber } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import { mergePackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import { PackageHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/PackageHubIcon';
import { PACKAGE_HUB_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/packageHubConstants';
import { PackageInvoicesHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesHubIcon';
import { PACKAGE_INVOICES_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesModal';
import { packageListPipelineStatusLabel } from '@/views/admin/ContractDocuments/packages/platform/hub/pipeline/packagePipeline';
import { PackageWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubIcon';
import { formatPackageWorkOrderHubModalTitle } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import {
  formatContractsListMoney,
  formatContractsListPaidWithPercent,
} from './contractsListFormatters';
import type { ContractsListDisplayItem } from './contractsListLayout';
import { contractsListPipelineStatusBadgeClass } from './contractsListTableUi';
import {
  aggregateContractsListPackagesMoney,
  contractsListContractAndSignedAddendaTotalRub,
  contractsListContractTotalAmount,
  contractsListCustomerName,
  contractsListCustomerPhone,
  contractsListManagerDisplayLabel,
  contractsListObjectAddress,
  contractsListPackageKindLabel,
  contractsListPackagesCustomerPhone,
  contractsListPipelineStatus,
  contractsListRemainingToPayRub,
  formatSigningDateOnly,
  sumPackagePaymentsRub,
} from './contractsListUtils';

function MobileCallCustomerControl({ phone }: { phone: string }) {
  const phoneDisplay = formatCrmPhoneOrDash(phone);
  const telHref = crmPhoneToTelHref(phone);
  if (!telHref || !phoneDisplay || phoneDisplay === '—') return null;

  return (
    <div className={cdHub.contractsMobilePhoneRow}>
      <a
        href={telHref}
        className={cdHub.contractsMobilePhoneLink}
        aria-label={`Позвонить ${phoneDisplay}`}
      >
        {phoneDisplay}
      </a>
      <a
        href={telHref}
        className={cdHub.contractsMobileCall}
        aria-label={`Позвонить заказчику ${phoneDisplay}`}
        title={`Позвонить заказчику ${phoneDisplay}`}
      >
        <CallCustomerIcon size={22} />
      </a>
    </div>
  );
}

type ContractsListMobileCardsProps = {
  loading: boolean;
  rowsCount: number;
  tableDisplayItemsCount: number;
  emptyFilteredListMessage: string;
  paginatedDisplayItems: ContractsListDisplayItem[];
  addendumColumnCount: number;
  objectsById: Map<string, ContractDocumentObject>;
  expandedObjectId: string | null;
  onToggleObjectExpand: (objectId: string) => void;
  crmUsers: CrmUser[];
  creating: boolean;
  onOpenHub: (packageId: string) => void;
  onOpenInvoicesHub: (packageId: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  onOpenCustomerShare: (packageId: string) => void;
  onOpenRemoteSigning: (packageId: string) => void;
};

function PackageMobileCard({
  pkg,
  addendumColumnCount,
  crmUsers,
  nested,
  creating,
  onOpenHub,
  onOpenInvoicesHub,
  onOpenWorkOrdersHub,
  onOpenCustomerShare,
  onOpenRemoteSigning,
}: {
  pkg: ContractDocumentPackage;
  addendumColumnCount: number;
  crmUsers: CrmUser[];
  nested?: boolean;
  creating: boolean;
  onOpenHub: (packageId: string) => void;
  onOpenInvoicesHub: (packageId: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  onOpenCustomerShare: (packageId: string) => void;
  onOpenRemoteSigning: (packageId: string) => void;
}) {
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
  const pipelineStatus = contractsListPipelineStatus(pkg);
  const customer = contractsListCustomerName(fd);
  const address = contractsListObjectAddress(fd);
  const manager = contractsListManagerDisplayLabel(form, crmUsers, pkg);
  const kind = contractsListPackageKindLabel(pkg.kind);
  const dateLabel = formatSigningDateOnly(pkg) || '—';
  const customerPhone = contractsListCustomerPhone(fd);
  const actionsDisabled = creating;

  return (
    <article
      className={`${cdHub.contractsMobileCard}${nested ? ` ${cdHub.contractsMobileCardNested}` : ''}`}
    >
      {/* На мобиле в сам договор не заходим — только просмотр списка и хабы (счета / наряды / оплаты). */}
      <div className={cdHub.contractsMobileCardMain}>
        <div className={cdHub.contractsMobileCardTop}>
          <div className={cdHub.contractsMobileCardTitle}>
            {num ? `№ ${num}` : 'Без номера'}
            {kind ? <span className={cdHub.contractsMobileCardKind}>{kind}</span> : null}
          </div>
          <div>
            <span className={contractsListPipelineStatusBadgeClass(pipelineStatus)}>
              {packageListPipelineStatusLabel(pipelineStatus)}
            </span>
            {(() => {
              const remote = (fd as Record<string, unknown>)._remoteSigning;
              if (!remote || typeof remote !== 'object' || Array.isArray(remote)) return null;
              const status =
                typeof (remote as { status?: unknown }).status === 'string'
                  ? (remote as { status: string }).status
                  : '';
              const label = remoteSigningStatusLabel(status);
              if (!label || (status !== 'PENDING' && status !== 'VIEWED')) return null;
              return <div className={cdHub.contractsListRemoteSigningHint}>{label}</div>;
            })()}
          </div>
        </div>
        <MobileCallCustomerControl phone={nested ? '' : customerPhone} />
        <dl className={cdHub.contractsMobileCardRows}>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Дата</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Заказчик</dt>
            <dd>{customer || '—'}</dd>
          </div>
          {address ? (
            <div className={cdHub.contractsMobileCardRow}>
              <dt>Адрес</dt>
              <dd>{address}</dd>
            </div>
          ) : null}
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Ответств.</dt>
            <dd>{manager || '—'}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Сумма</dt>
            <dd>{formatContractsListMoney(paymentBaseRub)}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Оплачено</dt>
            <dd>{formatContractsListPaidWithPercent(paidRub, paymentBaseRub)}</dd>
          </div>
          <div className={cdHub.contractsMobileCardRow}>
            <dt>Остаток</dt>
            <dd>{formatContractsListMoney(remainingRub)}</dd>
          </div>
        </dl>
      </div>
      <div className={cdHub.contractsMobileCardActions}>
        <AdminTableIconButton
          disabled={actionsDisabled}
          title={PACKAGE_INVOICES_MODAL_TITLE}
          aria-label={`Открыть ${PACKAGE_INVOICES_MODAL_TITLE}`}
          onClick={() => onOpenInvoicesHub(pkg.id)}
        >
          <PackageInvoicesHubIcon />
        </AdminTableIconButton>
        <AdminTableIconButton
          disabled={actionsDisabled}
          title={formatPackageWorkOrderHubModalTitle(num)}
          aria-label={`Открыть ${formatPackageWorkOrderHubModalTitle(num)}`}
          onClick={() => onOpenWorkOrdersHub(pkg.id)}
        >
          <PackageWorkOrdersHubIcon />
        </AdminTableIconButton>
        <AdminTableIconButton
          disabled={actionsDisabled}
          title="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
          aria-label={`Отправить документы заказчику (договор ${num})`}
          onClick={() => onOpenCustomerShare(pkg.id)}
        >
          <ShareIcon />
        </AdminTableIconButton>
        <AdminTableIconButton
          disabled={actionsDisabled}
          title="Отправить на дистанционное подписание"
          aria-label={`Отправить на подписание (договор ${num})`}
          onClick={() => onOpenRemoteSigning(pkg.id)}
        >
          <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>ЭП</span>
        </AdminTableIconButton>
        <AdminTableIconButton
          disabled={actionsDisabled}
          title={PACKAGE_HUB_MODAL_TITLE}
          aria-label={`Открыть ${PACKAGE_HUB_MODAL_TITLE}`}
          onClick={() => onOpenHub(pkg.id)}
        >
          <PackageHubIcon />
        </AdminTableIconButton>
      </div>
    </article>
  );
}

export function ContractsListMobileCards({
  loading,
  rowsCount,
  tableDisplayItemsCount,
  emptyFilteredListMessage,
  paginatedDisplayItems,
  addendumColumnCount,
  objectsById,
  expandedObjectId,
  onToggleObjectExpand,
  crmUsers,
  creating,
  onOpenHub,
  onOpenInvoicesHub,
  onOpenWorkOrdersHub,
  onOpenCustomerShare,
  onOpenRemoteSigning,
}: ContractsListMobileCardsProps) {
  if (loading && rowsCount === 0) {
    return <p className={cdHub.contractsMobileEmpty}>Загрузка…</p>;
  }
  if (rowsCount === 0) {
    return (
      <p className={cdHub.contractsMobileEmpty}>
        Пока нет ни одного пакета. Нажмите «+ Новый договор».
      </p>
    );
  }
  if (tableDisplayItemsCount === 0) {
    return <p className={cdHub.contractsMobileEmpty}>{emptyFilteredListMessage}</p>;
  }

  return (
    <div className={cdHub.contractsMobileCards} aria-label="Список договоров">
      {paginatedDisplayItems.map((item) => {
        if (item.type === 'gap') return null;

        if (item.type === 'object') {
          const obj = objectsById.get(item.objectId) ?? item.packages[0]?.documentObject;
          const objName =
            (obj && 'name' in obj ? obj.name : null) ??
            item.packages[0]?.documentObject?.name ??
            'Объект';
          const objAddress =
            (obj && 'address' in obj ? obj.address : null) ??
            item.packages[0]?.documentObject?.address ??
            contractsListObjectAddress(
              (item.packages[0]?.formData ?? {}) as Record<string, unknown>
            );
          const objCustomer =
            (obj && 'customerName' in obj ? obj.customerName : null) ??
            item.packages[0]?.documentObject?.customerName ??
            contractsListCustomerName(
              (item.packages[0]?.formData ?? {}) as Record<string, unknown>
            );
          const agg = aggregateContractsListPackagesMoney(item.packages, addendumColumnCount);
          const paymentBase = addendumColumnCount > 0 ? agg.totalWithAddendaRub : agg.totalRub;
          const expanded = expandedObjectId === item.objectId;
          const objectCustomerPhone = contractsListPackagesCustomerPhone(item.packages);

          return (
            <div key={`obj-${item.objectId}`} className={cdHub.contractsMobileObjectGroup}>
              <div className={cdHub.contractsMobileObjectHeader}>
                <div className={cdHub.contractsMobileObjectHeaderRow}>
                  <button
                    type="button"
                    className={cdHub.contractsMobileExpandBtn}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Свернуть договоры' : 'Развернуть договоры'}
                    title={expanded ? 'Свернуть' : 'Развернуть'}
                    onClick={() => onToggleObjectExpand(item.objectId)}
                  >
                    {expanded ? '−' : '+'}
                  </button>
                  <div className={cdHub.contractsMobileObjectHeaderBody}>
                    <div className={cdHub.contractsMobileObjectTitle}>
                      {objName}
                      <span className={cdHub.contractsMobileObjectCount}>
                        ({item.packages.length})
                      </span>
                    </div>
                    <div className={cdHub.contractsMobileObjectMeta}>
                      {objCustomer ? <span>{objCustomer}</span> : null}
                      {objAddress ? <span>{objAddress}</span> : null}
                      <span>
                        остаток {formatContractsListMoney(agg.remainingRub)}
                        {paymentBase != null ? ` / ${formatContractsListMoney(paymentBase)}` : ''}
                      </span>
                    </div>
                    <MobileCallCustomerControl phone={objectCustomerPhone} />
                  </div>
                </div>
              </div>
              {expanded
                ? item.packages.map((pkg) => (
                    <PackageMobileCard
                      key={pkg.id}
                      pkg={pkg}
                      nested
                      addendumColumnCount={addendumColumnCount}
                      crmUsers={crmUsers}
                      creating={creating}
                      onOpenHub={onOpenHub}
                      onOpenInvoicesHub={onOpenInvoicesHub}
                      onOpenWorkOrdersHub={onOpenWorkOrdersHub}
                      onOpenCustomerShare={onOpenCustomerShare}
                      onOpenRemoteSigning={onOpenRemoteSigning}
                    />
                  ))
                : null}
            </div>
          );
        }

        if (item.childOfObject) {
          // Договоры объекта рендерятся под шапкой object при expanded.
          return null;
        }

        return (
          <PackageMobileCard
            key={item.package.id}
            pkg={item.package}
            addendumColumnCount={addendumColumnCount}
            crmUsers={crmUsers}
            creating={creating}
            onOpenHub={onOpenHub}
            onOpenInvoicesHub={onOpenInvoicesHub}
            onOpenWorkOrdersHub={onOpenWorkOrdersHub}
            onOpenCustomerShare={onOpenCustomerShare}
            onOpenRemoteSigning={onOpenRemoteSigning}
          />
        );
      })}
    </div>
  );
}
