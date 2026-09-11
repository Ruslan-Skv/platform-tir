'use client';

import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import {
  type CrmCustomerAppliedContext,
  CrmCustomerSearchPanel,
} from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';
import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';

export type EstimateWorkspaceCustomerCardProps = {
  estimateNameDraft: string;
  onEstimateNameChange: (value: string) => void;
  estimateNameError: string | null;
  /** Наценка расчёта, % ('' — «наценка объекта»). */
  additionalMarkupRaw: string;
  onAdditionalMarkupChange: (value: string) => void;
  customerName: string;
  objectAddress: string;
  estimateCustomerError: string | null;
  estimateObjectAddressError: string | null;
  crmCustomerId: string | null;
  onCustomerApplied: (detail: CrmCustomerDetail, context?: CrmCustomerAppliedContext) => void;
  onCustomerClear: () => void;
  onCrmError: (text: string) => void;
};

export function EstimateWorkspaceCustomerCard({
  estimateNameDraft,
  onEstimateNameChange,
  estimateNameError,
  additionalMarkupRaw,
  onAdditionalMarkupChange,
  customerName,
  objectAddress,
  estimateCustomerError,
  estimateObjectAddressError,
  crmCustomerId,
  onCustomerApplied,
  onCustomerClear,
  onCrmError,
}: EstimateWorkspaceCustomerCardProps) {
  return (
    <div className={`${cdTemplates.sectionCard} ${cdWorkspace.estimateWorkspaceCustomerCard}`}>
      <div
        className={`${measurementFormStyles.blankSheet} ${cdWorkspace.estimateWorkspaceCustomerBlankSheet}`}
      >
        <div className={measurementFormStyles.row}>
          <label className={measurementFormStyles.label} htmlFor="estimate-workspace-name">
            Название расчёта <span className={measurementFormStyles.required}>*</span>
          </label>
          <input
            id="estimate-workspace-name"
            type="text"
            value={estimateNameDraft}
            onChange={(e) => onEstimateNameChange(e.target.value)}
            placeholder="Например: ЖК Парк, кв. 54"
            className={`${cdWorkspace.estimateWorkspaceNameSearchInput} ${
              estimateNameError ? measurementFormStyles.inputError : ''
            }`}
            autoComplete="off"
            required
            aria-invalid={!!estimateNameError}
            aria-describedby={estimateNameError ? 'estimate-workspace-name-error' : undefined}
          />
          {estimateNameError ? (
            <span
              id="estimate-workspace-name-error"
              className={measurementFormStyles.fieldError}
              role="alert"
            >
              {estimateNameError}
            </span>
          ) : null}
        </div>
        <div className={cdWorkspace.estimateWorkspaceCustomerFieldsRow}>
          <div className={measurementFormStyles.row}>
            <label className={measurementFormStyles.label} htmlFor="estimate-workspace-customer">
              Заказчик
            </label>
            <input
              id="estimate-workspace-customer"
              type="text"
              value={customerName}
              readOnly
              placeholder="Выберите карточку в базе"
              className={`${measurementFormStyles.input} ${measurementFormStyles.inputReadonly} ${
                estimateCustomerError ? measurementFormStyles.inputError : ''
              }`}
              aria-invalid={!!estimateCustomerError}
              aria-describedby={
                estimateCustomerError ? 'estimate-workspace-customer-error' : undefined
              }
            />
            {estimateCustomerError ? (
              <span
                id="estimate-workspace-customer-error"
                className={measurementFormStyles.fieldError}
                role="alert"
              >
                {estimateCustomerError}
              </span>
            ) : null}
          </div>
          <div className={measurementFormStyles.row}>
            <label
              className={measurementFormStyles.label}
              htmlFor="estimate-workspace-object-address"
            >
              Адрес объекта
            </label>
            <input
              id="estimate-workspace-object-address"
              type="text"
              value={objectAddress}
              readOnly
              placeholder="Из карточки заказчика"
              className={`${measurementFormStyles.input} ${measurementFormStyles.inputReadonly} ${
                estimateObjectAddressError ? measurementFormStyles.inputError : ''
              }`}
              aria-invalid={!!estimateObjectAddressError}
              aria-describedby={
                estimateObjectAddressError ? 'estimate-workspace-object-address-error' : undefined
              }
            />
            {estimateObjectAddressError ? (
              <span
                id="estimate-workspace-object-address-error"
                className={measurementFormStyles.fieldError}
                role="alert"
              >
                {estimateObjectAddressError}
              </span>
            ) : null}
          </div>
          <div className={measurementFormStyles.row}>
            <label
              className={measurementFormStyles.label}
              htmlFor="estimate-workspace-additional-markup"
              title="Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете."
            >
              Наценка, %
            </label>
            <input
              id="estimate-workspace-additional-markup"
              type="number"
              min={0}
              max={999}
              step={0.1}
              value={additionalMarkupRaw}
              onChange={(e) => onAdditionalMarkupChange(e.target.value)}
              placeholder="Наценка объекта"
              className={measurementFormStyles.input}
              autoComplete="off"
            />
          </div>
        </div>
        <div className={cdWorkspace.packageCustomerSearchSlot}>
          <CrmCustomerSearchPanel
            customerId={crmCustomerId}
            listboxId="estimate-workspace-customer-search-listbox"
            onCustomerApplied={onCustomerApplied}
            onClear={onCustomerClear}
            onError={onCrmError}
            addCustomerDraft={{
              fullName: customerName,
              objectAddress,
            }}
          />
        </div>
      </div>
    </div>
  );
}
