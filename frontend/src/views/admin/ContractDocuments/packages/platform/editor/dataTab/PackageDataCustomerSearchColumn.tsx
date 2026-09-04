'use client';

import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';
import crmCustomerSearchPanelStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel.module.css';

import cdDataTab from '../../../../styles/data-tab.module.css';
import { ProductContractCostFields } from '../../../families/product-like/cost/ProductContractCostFields';
import { packageCustomerBlockHasContent } from '../../questionnaires/applyCrmContractToForm';
import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  CUSTOMER_SEARCH_SLOT,
  DATA_AUTO_FILLED,
  DATA_FIELD,
  DATA_TOP_BLOCK,
} from './packageDataTabStyles';

export type PackageDataCustomerSearchColumnProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'linkedCrmCustomerId'
  | 'onCrmCustomerApplied'
  | 'onCrmCustomerClear'
  | 'onCrmError'
  | 'isProductDirectionPackage'
  | 'productContractCostBreakdown'
>;

export function PackageDataCustomerSearchColumn({
  form,
  contractAndEstimateLocked,
  linkedCrmCustomerId,
  onCrmCustomerApplied,
  onCrmCustomerClear,
  onCrmError,
  isProductDirectionPackage,
  productContractCostBreakdown,
}: PackageDataCustomerSearchColumnProps) {
  const hasOrphanCustomerFields =
    !linkedCrmCustomerId?.trim() && packageCustomerBlockHasContent(form.customer);

  return (
    <div className={`${DATA_TOP_BLOCK} ${cdDataTab.dataTopBlockCustomerCol}`}>
      <div
        className={`${CUSTOMER_SEARCH_SLOT} ${
          contractAndEstimateLocked ? cdDataTab.packageCustomerSearchSlotLocked : ''
        }`}
      >
        <CrmCustomerSearchPanel
          className={`${crmCustomerSearchPanelStyles.customerCrmPanelCompact} ${crmCustomerSearchPanelStyles.customerCrmPanelDataTopFill}`}
          customerId={linkedCrmCustomerId}
          disabled={contractAndEstimateLocked}
          listboxId="repair-customer-crm-search-listbox"
          onCustomerApplied={onCrmCustomerApplied}
          onClear={onCrmCustomerClear}
          onError={onCrmError}
          showClearButton={hasOrphanCustomerFields}
        />
      </div>
      {isProductDirectionPackage && productContractCostBreakdown ? (
        <ProductContractCostFields breakdown={productContractCostBreakdown} />
      ) : (
        <div className={`${DATA_FIELD} ${styles.packageDataContractAmountField}`}>
          <label htmlFor="repair_data_contract_total">Стоимость договора</label>
          <input
            id="repair_data_contract_total"
            type="text"
            readOnly
            value={form.contract.totalAmount}
            placeholder="—"
            autoComplete="off"
            title="Из вкладки «Смета» (с учётом скидки по договору)"
            className={DATA_AUTO_FILLED}
          />
        </div>
      )}
    </div>
  );
}
