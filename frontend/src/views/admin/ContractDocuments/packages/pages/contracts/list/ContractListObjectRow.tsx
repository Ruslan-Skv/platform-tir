'use client';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { getDisplayContractNumber } from '../../../platform/form/packageContractDisplay';
import {
  formatContractsListMoney,
  formatContractsListPaidWithPercent,
} from './contractsListFormatters';
import {
  aggregateContractsListPackagesMoney,
  contractsListCustomerName,
  contractsListObjectAddress,
} from './contractsListUtils';

export type ContractListObjectRowProps = {
  objectId: string;
  packages: ContractDocumentPackage[];
  objectsById: Map<string, ContractDocumentObject>;
  addendumColumnCount: number;
  colSpan: number;
  expandedObjectIds: string[];
  onToggleExpand: (objectId: string) => void;
};

export function ContractListObjectRow({
  objectId,
  packages,
  objectsById,
  addendumColumnCount,
  colSpan,
  expandedObjectIds,
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
  const expanded = expandedObjectIds.includes(objectId);
  // Номера внутри свёрнутой карточки: иначе договоры объекта (напр. два свежих
  // черновика) не видны в списке даже по номеру, пока объект не развернуть.
  const contractNumbers = packages
    .map((p) =>
      getDisplayContractNumber({ formData: (p.formData ?? {}) as Record<string, unknown> })
    )
    .filter((n) => n && n !== '—');
  const numbersFull = contractNumbers.join(', ');
  const numbersLabel =
    contractNumbers.length > 3
      ? `${contractNumbers.slice(0, 3).join(', ')} +${contractNumbers.length - 3}`
      : numbersFull;
  const totalLabel =
    addendumColumnCount > 0
      ? formatContractsListMoney(agg.totalWithAddendaRub)
      : formatContractsListMoney(agg.totalRub);
  const nameNorm = objName.trim().toLowerCase().replace(/\s+/g, ' ');
  const addressNorm = (objAddress || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const showAddressMeta = Boolean(addressNorm) && addressNorm !== nameNorm;

  return (
    <tr
      className={`${dataTableStyles.row} ${cdBase.contractsListObjectRow} ${cdHub.contractsListObjectGroupRow} ${
        expanded
          ? `${cdBase.contractsListObjectRowExpanded} ${cdHub.contractsListObjectGroupRowExpanded}`
          : cdHub.contractsListObjectGroupRowCollapsed
      }`}
    >
      <td
        colSpan={colSpan}
        className={`${cdBase.contractsListObjectAccentCell} ${cdHub.contractsListObjectGroupCell}`}
      >
        <div className={cdHub.contractsListObjectHeader}>
          <div className={cdHub.contractsListObjectHeaderControls}>
            <button
              type="button"
              className={cdBase.contractsListExpandBtn}
              aria-expanded={expanded}
              aria-label={expanded ? 'Свернуть договоры' : 'Развернуть договоры'}
              title={expanded ? 'Свернуть' : 'Развернуть'}
              onClick={() => onToggleExpand(objectId)}
            >
              {expanded ? '−' : '+'}
            </button>
          </div>

          <div className={cdHub.contractsListObjectHeaderMain}>
            <div className={cdHub.contractsListObjectHeaderTitleBlock}>
              <div className={cdBase.contractsListObjectTitleRow}>
                <span className={cdBase.contractsListObjectKindChip}>Объект</span>
                <span className={cdBase.contractsListObjectAddressLabel} title={objName}>
                  {objName}
                </span>
                <span className={cdBase.contractsListObjectBadge}>({packages.length})</span>
              </div>
              {objCustomer || showAddressMeta || (!expanded && numbersLabel) ? (
                <div className={cdHub.contractsListObjectHeaderMeta}>
                  {objCustomer ? (
                    <span className={cdHub.contractsListObjectMetaChip} title={objCustomer}>
                      {objCustomer}
                    </span>
                  ) : null}
                  {showAddressMeta ? (
                    <span
                      className={cdHub.contractsListObjectMetaChip}
                      title={objAddress || undefined}
                    >
                      {objAddress}
                    </span>
                  ) : null}
                  {!expanded && numbersLabel ? (
                    <span
                      className={cdHub.contractsListObjectMetaChip}
                      title={`Договоры объекта: ${numbersFull}`}
                    >
                      № {numbersLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={cdHub.contractsListObjectHeaderStats} aria-label="Сводка по объекту">
              <span className={cdHub.contractsListObjectStat}>
                <span className={cdHub.contractsListObjectStatLabel}>СД</span>
                <span className={cdHub.contractsListObjectStatValue}>{totalLabel}</span>
              </span>
              <span className={cdHub.contractsListObjectStat}>
                <span className={cdHub.contractsListObjectStatLabel}>Оплачено</span>
                <span className={cdHub.contractsListObjectStatValue}>
                  {formatContractsListPaidWithPercent(agg.paidRub, paymentBase)}
                </span>
              </span>
              <span className={cdHub.contractsListObjectStat}>
                <span className={cdHub.contractsListObjectStatLabel}>Остаток</span>
                <span className={cdHub.contractsListObjectStatValue}>
                  {formatContractsListMoney(agg.remainingRub)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
