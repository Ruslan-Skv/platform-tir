'use client';

import cdBase from '../../../../styles/base.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import {
  PAYMENT_INVOICE_LINE_KIND_LABELS,
  type PaymentInvoiceLineItem,
  type PaymentInvoiceLineKind,
} from '../../payments/packagePaymentInvoiceLineItems';
import type { PackageIssueInvoicePanelModel } from './usePackageIssueInvoicePanel';

export type PackageIssueInvoiceLineRowProps = Pick<
  PackageIssueInvoicePanelModel,
  'updateLine' | 'removeLine'
> & {
  line: PaymentInvoiceLineItem;
  index: number;
};

export function PackageIssueInvoiceLineRow({
  line,
  index,
  updateLine,
  removeLine,
}: PackageIssueInvoiceLineRowProps) {
  return (
    <tr>
      <td className={cdBase.invoiceLinesKindCol}>
        <select
          value={line.lineKind}
          onChange={(e) =>
            updateLine(index, { lineKind: e.target.value as PaymentInvoiceLineKind })
          }
        >
          {(Object.keys(PAYMENT_INVOICE_LINE_KIND_LABELS) as PaymentInvoiceLineKind[]).map(
            (kind) => (
              <option key={kind} value={kind}>
                {PAYMENT_INVOICE_LINE_KIND_LABELS[kind]}
              </option>
            )
          )}
        </select>
      </td>
      <td className={cdBase.invoiceLinesNameCol}>
        <input
          value={line.name}
          onChange={(e) => updateLine(index, { name: e.target.value })}
          placeholder="Дверные изделия"
        />
      </td>
      <td>
        <input
          value={line.quantity}
          onChange={(e) => updateLine(index, { quantity: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} />
      </td>
      <td>
        <select
          value={line.vatLabel}
          onChange={(e) => updateLine(index, { vatLabel: e.target.value })}
        >
          <option value="Без НДС">Без НДС</option>
          <option value="20%">20%</option>
          <option value="10%">10%</option>
        </select>
      </td>
      <td>
        <input
          value={line.unitPrice}
          onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <input
          value={line.amount}
          onChange={(e) => updateLine(index, { amount: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <button
          data-admin-mutation
          type="button"
          className={cdWorkspace.dangerBtn}
          title="Удалить строку"
          onClick={() => removeLine(index)}
        >
          ×
        </button>
      </td>
    </tr>
  );
}
