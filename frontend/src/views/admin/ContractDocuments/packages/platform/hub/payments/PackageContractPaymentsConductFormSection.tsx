'use client';

import { type ContractDocumentPackagePaymentInput } from '@/shared/api/admin-contract-document-packages';
import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';
import measurementBlankStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';

import cdBase from '../../../../styles/base.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { type PackagePaymentBasisOptionKey } from '../../payments/packagePaymentBasisOptions';
import { PACKAGE_PAYMENT_FORM_LABELS } from '../../payments/packagePaymentFormLabels';
import type { PackageContractPaymentsTabModel } from './usePackageContractPaymentsTab';

export type PackageContractPaymentsConductFormSectionProps = Pick<
  PackageContractPaymentsTabModel,
  | 'isHubConductLayout'
  | 'hubPaymentConductedNotice'
  | 'draft'
  | 'setDraft'
  | 'hubBasisKey'
  | 'conductAmount'
  | 'setConductAmount'
  | 'hubConductDateReady'
  | 'hubConductAllBasesDone'
  | 'hubConductFormComplete'
  | 'hubConductBasisReady'
  | 'hubFixedBasisOptions'
  | 'handleHubBasisChange'
  | 'handleHubPrintCashOrder'
  | 'submitHubConductPayment'
  | 'saving'
  | 'onPrintCashOrder'
  | 'form'
  | 'onUpdateContract'
  | 'newBasisDraft'
  | 'setNewBasisDraft'
  | 'basisSelectOptionsCreate'
  | 'handleAppendBasisOption'
  | 'submitCreate'
>;

export function PackageContractPaymentsConductFormSection({
  isHubConductLayout,
  hubPaymentConductedNotice,
  draft,
  setDraft,
  hubBasisKey,
  conductAmount,
  setConductAmount,
  hubConductDateReady,
  hubConductAllBasesDone,
  hubConductFormComplete,
  hubConductBasisReady,
  hubFixedBasisOptions,
  handleHubBasisChange,
  handleHubPrintCashOrder,
  submitHubConductPayment,
  saving,
  onPrintCashOrder,
  form,
  onUpdateContract,
  newBasisDraft,
  setNewBasisDraft,
  basisSelectOptionsCreate,
  handleAppendBasisOption,
  submitCreate,
}: PackageContractPaymentsConductFormSectionProps) {
  return (
    <>
      {isHubConductLayout ? (
        <div className={cdBase.paymentsHubConductTitleRow}>
          <h3 className={`${crmDetailStyles.linkedSectionTitle} ${cdBase.paymentsHubBlockTitle}`}>
            Провести оплату
          </h3>
          {hubPaymentConductedNotice ? (
            <span className={cdBase.paymentsHubConductDoneMsg} role="status">
              Оплата проведена
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={
          isHubConductLayout
            ? cdBase.paymentsHubConductFormWrap
            : `${cdTemplates.sectionCard} ${cdBase.paymentsFormCard} ${cdBase.paymentsBlockAccentForm}`
        }
      >
        {!isHubConductLayout ? <h3 className={cdBase.sectionTitle}>Добавить оплату</h3> : null}
        {isHubConductLayout ? (
          <div className={`${measurementBlankStyles.blankSheet} ${cdBase.paymentsHubConductBlank}`}>
            <div className={`${cdBase.paymentsFormHubRow} ${cdBase.paymentsFormHubRowCompact}`}>
              <div
                className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubDateField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_date"
                >
                  Дата оплаты
                </label>
                <input
                  id="pay_tab_date"
                  type="date"
                  className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                  value={draft.paymentDate}
                  onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
                />
              </div>
              <div
                className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubBasisField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_basis_select"
                >
                  Основание
                </label>
                <select
                  id="pay_tab_basis_select"
                  className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                  value={hubBasisKey}
                  disabled={!hubConductDateReady || hubConductAllBasesDone}
                  onChange={(e) =>
                    handleHubBasisChange(e.target.value as PackagePaymentBasisOptionKey | '')
                  }
                >
                  <option value="">Выберите основание</option>
                  {hubFixedBasisOptions.map((opt) => (
                    <option key={opt.key} value={opt.key} disabled={opt.disabled}>
                      {opt.disabled ? `${opt.label} (проведено)` : opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubFormField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_form"
                >
                  Способ оплаты
                </label>
                <select
                  id="pay_tab_form"
                  className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                  value={draft.paymentForm}
                  disabled={!hubConductBasisReady}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      paymentForm: e.target
                        .value as ContractDocumentPackagePaymentInput['paymentForm'],
                    }))
                  }
                >
                  {Object.entries(PACKAGE_PAYMENT_FORM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubAmountField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_amount_num"
                >
                  Сумма, ₽
                </label>
                <input
                  id="pay_tab_amount_num"
                  inputMode="decimal"
                  className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                  value={conductAmount}
                  disabled={!hubConductBasisReady}
                  onChange={(e) => setConductAmount(e.target.value)}
                  placeholder="175000"
                  autoComplete="off"
                />
              </div>
              <div className={cdBase.paymentsFormHubSubmitField}>
                <label
                  className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel} ${cdBase.paymentsFormHubSubmitSpacer}`}
                  aria-hidden="true"
                >
                  &nbsp;
                </label>
                <div className={cdBase.paymentsHubConductActions}>
                  <button
                    type="button"
                    className={cdBase.paymentsHubConductBtn}
                    disabled={
                      saving ||
                      hubPaymentConductedNotice ||
                      hubConductAllBasesDone ||
                      !hubConductFormComplete
                    }
                    onClick={() => void submitHubConductPayment()}
                  >
                    {saving ? 'Сохранение…' : 'Провести оплату'}
                  </button>
                  {onPrintCashOrder ? (
                    <button
                      type="button"
                      className={cdBase.paymentsHubConductSecondaryBtn}
                      disabled={!hubConductFormComplete}
                      title="Печать ПКО (два экземпляра на листе)"
                      onClick={handleHubPrintCashOrder}
                    >
                      Печать ПКО
                    </button>
                  ) : null}
                </div>
              </div>
              {hubConductAllBasesDone ? (
                <p className={`${cdProduct.hint} ${cdBase.paymentsFormHubHint}`}>
                  Все основания по этому договору уже проведены.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className={cdBase.paymentsFormGrid}>
              <div className={cdBase.field}>
                <label htmlFor="pay_tab_date">Дата оплаты</label>
                <input
                  id="pay_tab_date"
                  type="date"
                  value={draft.paymentDate}
                  onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
                />
              </div>
              <div className={`${cdBase.field} ${cdBase.paymentsAmountField}`}>
                <label htmlFor="pay_tab_amount_num">Сумма оплаты, ₽</label>
                <input
                  id="pay_tab_amount_num"
                  inputMode="decimal"
                  value={form.contract.prepaymentAmount}
                  onChange={(e) => onUpdateContract('prepaymentAmount', e.target.value)}
                  placeholder="Напр. 175000 или 175000,50"
                  autoComplete="off"
                />
              </div>
              <div className={cdBase.field}>
                <label htmlFor="pay_tab_form">Способ оплаты</label>
                <select
                  id="pay_tab_form"
                  value={draft.paymentForm}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      paymentForm: e.target
                        .value as ContractDocumentPackagePaymentInput['paymentForm'],
                    }))
                  }
                >
                  {Object.entries(PACKAGE_PAYMENT_FORM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${cdBase.field} ${cdEstimateTab.fieldSpanAll}`}>
                <label htmlFor="pay_tab_basis_select">Основание (ПКО, договор, журнал)</label>
                <div className={cdBase.paymentsBasisInlineRow}>
                  <div className={cdBase.paymentsBasisSelectWrap}>
                    <select
                      id="pay_tab_basis_select"
                      value={form.contract.paymentBasis}
                      disabled={basisSelectOptionsCreate.length === 0}
                      onChange={(e) => onUpdateContract('paymentBasis', e.target.value)}
                    >
                      {basisSelectOptionsCreate.length === 0 ? (
                        <option value="">— Укажите текст справа и нажмите + —</option>
                      ) : (
                        basisSelectOptionsCreate.map((text, idx) => (
                          <option key={`${idx}_${text.slice(0, 48)}`} value={text}>
                            {text.length > 120 ? `${text.slice(0, 117)}…` : text}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <input
                    type="text"
                    id="pay_tab_new_basis"
                    value={newBasisDraft}
                    onChange={(e) => setNewBasisDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAppendBasisOption();
                      }
                    }}
                    placeholder="Новый вариант основания"
                    className={cdBase.paymentsNewBasisInput}
                    aria-label="Текст нового варианта основания"
                  />
                  <button
                    type="button"
                    className={cdBase.paymentsAddBasisIconBtn}
                    onClick={handleAppendBasisOption}
                    aria-label="Добавить в список"
                    title="Добавить в список"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
                <p className={cdProduct.hint} style={{ marginTop: 6 }}>
                  Список вариантов — в этом браузере (localStorage). В журнал уходит тот же текст,
                  что в договоре/ПКО; тип строки в базе подбирается по формулировке (Д/с, предоплата
                  и т.д.).
                </p>
              </div>
            </div>
            <div className={cdBase.paymentsFormActions}>
              <button
                type="button"
                className={cdWorkspace.primaryBtn}
                disabled={saving}
                onClick={() => void submitCreate()}
              >
                Добавить в журнал
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
