'use client';

import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';

import { ProductContractCostFields } from '../../../families/product-like/cost/ProductContractCostFields';
import { formatContractMoneyFieldRaw } from '../../hub/payments/packageContractPaymentsFormat';
import { packageCustomerBlockHasContent } from '../../questionnaires/applyCrmContractToForm';
import { PackageMeasurementLinkSection } from '../measurementTab/PackageMeasurementLinkSection';
import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  CUSTOMER_SEARCH_SLOT,
  DATA_AUTO_FILLED,
  DATA_FIELD,
  DATA_SECTION,
} from './packageDataTabStyles';

export type PackageDataCustomerSearchColumnProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'setForm'
  | 'touchPackageData'
  | 'signedDocsLocked'
  | 'linkedCrmCustomerId'
  | 'onCrmCustomerApplied'
  | 'onCrmCustomerClear'
  | 'onCrmError'
  | 'isProductDirectionPackage'
  | 'productContractCostBreakdown'
>;

/** Колонка заказчика рядом с «Договор и объект»: поиск карточки, связанный замер, стоимость. */
export function PackageDataCustomerSearchColumn({
  form,
  setForm,
  touchPackageData,
  signedDocsLocked,
  linkedCrmCustomerId,
  onCrmCustomerApplied,
  onCrmCustomerClear,
  onCrmError,
  isProductDirectionPackage,
  productContractCostBreakdown,
}: PackageDataCustomerSearchColumnProps) {
  const hasOrphanCustomerFields =
    !linkedCrmCustomerId?.trim() && packageCustomerBlockHasContent(form.customer);
  /** Поле «Стоимость договора» — только отображение: разряды через пробел + «руб.». */
  const contractTotalDisplay = (() => {
    const amount = formatContractMoneyFieldRaw(form.contract.totalAmount);
    return amount ? `${amount} руб.` : '';
  })();

  return (
    <div className={styles.dataTopBlock}>
      <div
        className={`${CUSTOMER_SEARCH_SLOT} ${
          signedDocsLocked ? styles.customerSearchSlotLocked : ''
        }`}
      >
        <CrmCustomerSearchPanel
          customerId={linkedCrmCustomerId}
          disabled={signedDocsLocked}
          listboxId="repair-customer-crm-search-listbox"
          onCustomerApplied={onCrmCustomerApplied}
          onClear={onCrmCustomerClear}
          onError={onCrmError}
          showClearButton={hasOrphanCustomerFields}
        />
      </div>
      <PackageMeasurementLinkSection
        linkedMeasurementId={form.linkedMeasurementId}
        linkedCrmCustomerId={linkedCrmCustomerId}
        placement="data"
        surveyorUserId={form.contract.surveyorUserId}
        onAutoFillSurveyor={(surveyorUserId) => {
          setForm((prev) => ({
            ...prev,
            contract: { ...prev.contract, surveyorUserId },
          }));
          touchPackageData();
        }}
        onLink={(measurementId) => {
          setForm((prev) => ({ ...prev, linkedMeasurementId: measurementId }));
          touchPackageData();
        }}
        onUnlink={() => {
          setForm((prev) => ({ ...prev, linkedMeasurementId: '' }));
          touchPackageData();
        }}
      />
      {isProductDirectionPackage && productContractCostBreakdown ? (
        <div className={DATA_SECTION}>
          <div className={styles.dataFieldRow}>
            <ProductContractCostFields breakdown={productContractCostBreakdown} />
          </div>
        </div>
      ) : (
        <div className={DATA_SECTION}>
          <div className={DATA_FIELD}>
            <label htmlFor="repair_data_contract_total">Стоимость договора</label>
            <input
              id="repair_data_contract_total"
              type="text"
              readOnly
              value={contractTotalDisplay}
              placeholder="—"
              autoComplete="off"
              title="Из вкладки «Смета» (с учётом скидки по договору)"
              className={DATA_AUTO_FILLED}
            />
          </div>
        </div>
      )}
    </div>
  );
}
