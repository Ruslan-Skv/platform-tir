'use client';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import {
  ellipsizeContractsListOneLine,
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
