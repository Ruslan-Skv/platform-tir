'use client';

import Link from 'next/link';

import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';
import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers/CrmCustomerSearchPanel';
import crmCustomerSearchPanelStyles from '@/views/admin/CRM/Customers/CrmCustomerSearchPanel.module.css';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import cdWindows from '../../../styles/windows-package.module.css';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS,
} from '../../directions/repair/form/repairContractWorkPeriod';
import type { RepairPackageFormData } from '../../directions/repair/repairPackageForm';
import { WindowsContractCostFields } from '../../directions/windows/WindowsContractCostFields';
import type { WindowsContractCostBreakdown } from '../../directions/windows/windowsContractCostBreakdown';
import { ContractDocumentsHelpTooltip } from '../ui/ContractDocumentsHelpTooltip';
import type { PackageContractObjectBlockFieldId } from './packageContractObjectBlock';
import {
  PackageDataPartySectionCollapseButton,
  PackageDataSectionLockInline,
  packageCompletionBadgeStyle,
} from './packageDataTabUi';

const DATA_TAB_DENSE = `${cdBase.repairContractDataTabDense} ${cdDataTab.repairContractDataTabDense} ${cdEstimateTab.repairContractDataTabDense}`;
const DATA_BLOCK = `${cdDataTab.blockData} ${cdWindows.blockData}`;
const DATA_FORM_GRID = `${cdDataTab.formGrid} ${cdWindows.formGrid}`;
const DATA_TOP_ROW = `${cdBase.dataTopRow} ${cdDataTab.dataTopRow}`;
const DATA_TOP_BLOCK = `${cdBase.dataTopBlock} ${cdDataTab.dataTopBlock}`;
const DATA_SECTION_CARD = `${cdBase.sectionCard} ${cdDataTab.sectionCard}`;
const DATA_BLANK_SHEET = `${cdBase.repairDataBlankSheet} ${cdDataTab.repairDataBlankSheet}`;
const DATA_SECTION_TITLE = `${cdBase.sectionTitle} ${cdDataTab.sectionTitle}`;
const DATA_FIELD = `${cdBase.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
const DATA_PARTY_FIELD = `${cdBase.field} ${cdDataTab.field}`;
const DATA_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdDataTab.sectionFields}`;
const DATA_HINT = `${cdDataTab.hint} ${cdTemplates.hint}`;
const DATA_CONTRACT_COMPACT = `${cdBase.contractCompactBlock} ${cdDataTab.contractCompactBlock} ${cdEstimateTab.contractCompactBlock}`;
const DATA_AUTO_FILLED = `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;
const CUSTOMER_SEARCH_SLOT = `${cdBase.repairCustomerSearchSlot} ${cdDataTab.repairCustomerSearchSlot}`;

export type PackageDataTabProps = {
  form: RepairPackageFormData;
  contractAndEstimateLocked: boolean;
  isSuperAdmin: boolean;
  isProductDirectionPackage: boolean;
  contractObjectBlockFieldClassName: (
    fieldId: PackageContractObjectBlockFieldId
  ) => string | undefined;
  updateContract: (key: keyof RepairPackageFormData['contract'], value: string) => void;
  updateObject: (key: keyof RepairPackageFormData['object'], value: string) => void;
  applyExecutorProfile: (title: string) => void;
  applySignatoryProfile: (title: string) => void;
  executorProfiles: ExecutorRequisiteProfile[];
  signatoryProfiles: ContractSignatoryProfile[];
  contractDateFieldHelp: { title: string; steps: readonly string[]; note?: string };
  workPeriodFieldHelp: { title: string; steps: readonly string[]; note?: string };
  discountFieldHelp: { title: string; steps: readonly string[]; note?: string };
  linkedCrmCustomerId: string | null;
  onCrmCustomerApplied: (detail: import('@/shared/api/admin-crm').CrmCustomerDetail) => void;
  onCrmCustomerClear: () => void;
  onCrmError: (text: string) => void;
  windowsContractCostBreakdown: WindowsContractCostBreakdown | null;
  customerSectionCompletionPercent: number;
  executorSectionCompletionPercent: number;
  managerSectionCompletionPercent: number;
  customerDataSectionExpanded: boolean;
  setCustomerDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  executorDataSectionExpanded: boolean;
  setExecutorDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  managerDataSectionExpanded: boolean;
  setManagerDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  repairCustomerPhonesReadonlyDisplay: string;
};

export function PackageDataTab({
  form,
  contractAndEstimateLocked,
  isSuperAdmin,
  isProductDirectionPackage,
  contractObjectBlockFieldClassName,
  updateContract,
  updateObject,
  applyExecutorProfile,
  applySignatoryProfile,
  executorProfiles,
  signatoryProfiles,
  contractDateFieldHelp,
  workPeriodFieldHelp,
  discountFieldHelp,
  linkedCrmCustomerId,
  onCrmCustomerApplied,
  onCrmCustomerClear,
  onCrmError,
  windowsContractCostBreakdown,
  customerSectionCompletionPercent,
  executorSectionCompletionPercent,
  managerSectionCompletionPercent,
  customerDataSectionExpanded,
  setCustomerDataSectionExpanded,
  executorDataSectionExpanded,
  setExecutorDataSectionExpanded,
  managerDataSectionExpanded,
  setManagerDataSectionExpanded,
  repairCustomerPhonesReadonlyDisplay,
}: PackageDataTabProps) {
  return (
    <div className={`${DATA_BLOCK} ${cdDataTab.dataCompact} ${DATA_TAB_DENSE}`}>
      <div className={DATA_FORM_GRID}>
        <div className={DATA_TOP_ROW}>
          <div className={DATA_TOP_BLOCK}>
            <div className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET}`}>
              <div className={cdDataTab.repairDataPartySectionTitleRow}>
                <h3 className={DATA_SECTION_TITLE}>Договор и объект</h3>
                {contractAndEstimateLocked ? (
                  <PackageDataSectionLockInline title="Договор подписан: блок «Договор и объект» только для просмотра" />
                ) : null}
              </div>
              <div className={DATA_CONTRACT_COMPACT}>
                <div
                  className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractHeaderMetaRow}`}
                >
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="cn">Номер дог.</label>
                    <input
                      id="cn"
                      value={form.contract.number}
                      onChange={(e) => updateContract('number', e.target.value)}
                      autoComplete="off"
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName('contract.number')}
                    />
                  </div>
                  <ContractDocumentsHelpTooltip
                    title={contractDateFieldHelp.title}
                    steps={contractDateFieldHelp.steps}
                    note={contractDateFieldHelp.note}
                    align="end"
                  >
                    <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                      <label htmlFor="cd">Дата закл.</label>
                      <input
                        id="cd"
                        value={form.contract.date}
                        onChange={(e) => updateContract('date', e.target.value)}
                        placeholder="дд.мм.гггг"
                        autoComplete="off"
                        disabled={contractAndEstimateLocked}
                        readOnly={contractAndEstimateLocked}
                        className={
                          contractAndEstimateLocked
                            ? DATA_AUTO_FILLED
                            : contractObjectBlockFieldClassName('contract.date')
                        }
                      />
                    </div>
                  </ContractDocumentsHelpTooltip>
                  <ContractDocumentsHelpTooltip
                    title={workPeriodFieldHelp.title}
                    steps={workPeriodFieldHelp.steps}
                    note={workPeriodFieldHelp.note}
                    align="end"
                  >
                    <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                      <label htmlFor="wp">Срок дог.</label>
                      <input
                        id="wp"
                        inputMode="numeric"
                        value={form.contract.workPeriod}
                        onChange={(e) => updateContract('workPeriod', e.target.value)}
                        placeholder={
                          isProductDirectionPackage
                            ? String(DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS)
                            : String(DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS)
                        }
                        autoComplete="off"
                        readOnly={!isSuperAdmin || contractAndEstimateLocked}
                        disabled={contractAndEstimateLocked || !isSuperAdmin}
                        className={
                          !isSuperAdmin || contractAndEstimateLocked
                            ? DATA_AUTO_FILLED
                            : contractObjectBlockFieldClassName('contract.workPeriod')
                        }
                      />
                    </div>
                  </ContractDocumentsHelpTooltip>
                  <ContractDocumentsHelpTooltip
                    title={discountFieldHelp.title}
                    steps={discountFieldHelp.steps}
                    note={discountFieldHelp.note}
                    align="end"
                  >
                    <div
                      className={`${DATA_FIELD} ${cdDataTab.contractInlineField} ${cdDataTab.contractDiscountFieldCell}`}
                    >
                      <label htmlFor="contract_discount_pct">Скидка (%)</label>
                      <input
                        id="contract_discount_pct"
                        inputMode="decimal"
                        value={form.contract.discountPercent}
                        onChange={(e) => updateContract('discountPercent', e.target.value)}
                        placeholder="0"
                        autoComplete="off"
                        disabled={contractAndEstimateLocked}
                        readOnly={contractAndEstimateLocked}
                        className={
                          contractAndEstimateLocked
                            ? DATA_AUTO_FILLED
                            : contractObjectBlockFieldClassName('contract.discountPercent')
                        }
                      />
                    </div>
                  </ContractDocumentsHelpTooltip>
                </div>
                <div
                  className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractObjectAddressRow}`}
                >
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="o_addr">Адрес объекта</label>
                    <input
                      id="o_addr"
                      value={form.object.objectAddress}
                      onChange={(e) => updateObject('objectAddress', e.target.value)}
                      autoComplete="off"
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName('object.objectAddress')}
                    />
                  </div>
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="o_floor">Этаж</label>
                    <input
                      id="o_floor"
                      value={form.object.objectFloor}
                      onChange={(e) => updateObject('objectFloor', e.target.value)}
                      autoComplete="off"
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName('object.objectFloor')}
                    />
                  </div>
                </div>
                <div
                  className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractObjectDescDiscountRow}`}
                >
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="o_desc">Описание работ / объекта</label>
                    <textarea
                      id="o_desc"
                      value={form.object.objectDescription}
                      onChange={(e) => updateObject('objectDescription', e.target.value)}
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName('object.objectDescription')}
                    />
                  </div>
                </div>
                <div className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractProfilesRow}`}>
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="e_profile">Исполнители (из справочника)</label>
                    <select
                      id="e_profile"
                      value={form.executor.selectedProfileTitle}
                      onChange={(e) => applyExecutorProfile(e.target.value)}
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName('executor.selectedProfileTitle')}
                    >
                      <option value="">— выбрать набор —</option>
                      {executorProfiles.map((profile) => (
                        <option key={profile.title} value={profile.title}>
                          {profile.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
                    <label htmlFor="s_profile">Карточка менеджера (из справочника)</label>
                    <select
                      id="s_profile"
                      value={form.executor.selectedSignatoryProfileTitle}
                      onChange={(e) => applySignatoryProfile(e.target.value)}
                      disabled={contractAndEstimateLocked}
                      className={contractObjectBlockFieldClassName(
                        'executor.selectedSignatoryProfileTitle'
                      )}
                    >
                      <option value="">— выбрать карточку —</option>
                      {signatoryProfiles.map((profile) => (
                        <option key={profile.title} value={profile.title}>
                          {profile.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${DATA_TOP_BLOCK} ${cdDataTab.dataTopBlockCustomerCol}`}>
            <div
              className={`${CUSTOMER_SEARCH_SLOT} ${
                contractAndEstimateLocked ? cdDataTab.repairCustomerSearchSlotLocked : ''
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
              />
            </div>
            {isProductDirectionPackage && windowsContractCostBreakdown ? (
              <WindowsContractCostFields breakdown={windowsContractCostBreakdown} />
            ) : (
              <div className={`${DATA_FIELD} ${cdDataTab.repairDataContractAmountField}`}>
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
        </div>

        <div
          className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${cdDataTab.repairDataPartySection}`}
        >
          <div className={cdDataTab.repairDataPartySectionHeader}>
            <div className={cdDataTab.repairDataPartySectionTitleRow}>
              <h3 className={DATA_SECTION_TITLE}>Заказчик</h3>
              {contractAndEstimateLocked ? (
                <PackageDataSectionLockInline title="Договор подписан: блок «Заказчик» только для просмотра" />
              ) : null}
            </div>
            <div className={cdDataTab.repairDataPartySectionHeaderActions}>
              <span
                className={cdDataTab.repairDataPartySectionCompletion}
                title="Процент заполненности блока"
                style={packageCompletionBadgeStyle(customerSectionCompletionPercent)}
              >
                {customerSectionCompletionPercent}%
              </span>
              <PackageDataPartySectionCollapseButton
                expanded={customerDataSectionExpanded}
                sectionLabel="Заказчик"
                controlsId="repair-data-customer-section-body"
                onToggle={() => setCustomerDataSectionExpanded((open) => !open)}
              />
            </div>
          </div>
          {customerDataSectionExpanded ? (
            <>
              <p className={`${DATA_HINT} ${cdDataTab.repairDataPartySectionIntroHint}`}>
                Данные подставляются из карточки заказчика в блоке «Поиск заказчика в базе».
                Редактировать здесь нельзя. Чтобы завести карточку и указать телефоны, нажмите
                «Добавить нового заказчика» в блоке поиска.
              </p>
              <div id="repair-data-customer-section-body" className={DATA_SECTION_FIELDS}>
                {form.customer.type === 'PERSON' ? (
                  <>
                    <div
                      className={`${cdDataTab.repairCustomerPrimaryRow} ${cdEstimateTab.fieldSpanAll}`}
                    >
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_type">Тип заказчика</label>
                        <select id="c_type" value={form.customer.type} disabled>
                          <option value="PERSON">Физлицо</option>
                          <option value="COMPANY">ЮЛ</option>
                          <option value="ENTREPRENEUR">ИП</option>
                        </select>
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_fullName">ФИО</label>
                        <input id="c_fullName" value={form.customer.fullName} readOnly />
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_address">Адрес</label>
                        <input id="c_address" value={form.customer.address} readOnly />
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_email">E-mail</label>
                        <input
                          id="c_email"
                          type="email"
                          autoComplete="email"
                          value={form.customer.email}
                          readOnly
                        />
                      </div>
                    </div>
                    <div
                      className={`${cdDataTab.repairCustomerSecondaryRow} ${cdEstimateTab.fieldSpanAll}`}
                    >
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_phones_ro">Телефоны</label>
                        <input
                          id="c_phones_ro"
                          type="text"
                          readOnly
                          value={repairCustomerPhonesReadonlyDisplay}
                          title={repairCustomerPhonesReadonlyDisplay}
                        />
                        {/* <p className={`${cdTemplates.hint} ${cdDataTab.repairDataPartySectionFieldHint}`}>
                        Несколько номеров — только в карточке CRM через «Добавить нового заказчика»; в
                        шаблоне основной номер — <code>{'{{customer.phone}}'}</code>.
                      </p> */}
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_passport">Паспорт (серия и номер)</label>
                        <input
                          id="c_passport"
                          value={form.customer.passportSeriesNumber}
                          readOnly
                        />
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_passportBy">Кем выдан</label>
                        <input id="c_passportBy" value={form.customer.passportIssuedBy} readOnly />
                      </div>
                      <div className={DATA_PARTY_FIELD}>
                        <label htmlFor="c_passportDate">Дата выдачи</label>
                        <input
                          id="c_passportDate"
                          value={form.customer.passportIssueDate}
                          readOnly
                        />
                      </div>
                    </div>
                    <div
                      className={`${DATA_PARTY_FIELD} ${cdEstimateTab.fieldSpanAll} ${cdDataTab.customerBankDetailsField}`}
                    >
                      <label htmlFor="c_bank_details">Банковские реквизиты</label>
                      <textarea
                        id="c_bank_details"
                        rows={1}
                        value={form.customer.bankDetails}
                        readOnly
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_type">Тип заказчика</label>
                      <select id="c_type" value={form.customer.type} disabled>
                        <option value="PERSON">Физлицо</option>
                        <option value="COMPANY">ЮЛ</option>
                        <option value="ENTREPRENEUR">ИП</option>
                      </select>
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_repFullNameNom">ФИО представителя (именит.)</label>
                      <input
                        id="c_repFullNameNom"
                        value={form.customer.representativeFullNameNominative}
                        readOnly
                      />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_repFullNameGen">ФИО представителя (родит.)</label>
                      <input
                        id="c_repFullNameGen"
                        value={form.customer.representativeFullNameGenitive}
                        readOnly
                      />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_orgName">Наименование организации</label>
                      <input id="c_orgName" value={form.customer.organizationName} readOnly />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_posNom">Должность представ. (именит.)</label>
                      <input
                        id="c_posNom"
                        value={form.customer.representativePositionNominative}
                        readOnly
                      />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_posGen">Должность представ. (родит.)</label>
                      <input
                        id="c_posGen"
                        value={form.customer.representativePositionGenitive}
                        readOnly
                      />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_inn">ИНН</label>
                      <input id="c_inn" value={form.customer.inn} readOnly />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_ogrn">ОГРН</label>
                      <input id="c_ogrn" value={form.customer.ogrn} readOnly />
                    </div>
                    <div className={DATA_PARTY_FIELD}>
                      <label htmlFor="c_address">Адрес</label>
                      <input id="c_address" value={form.customer.address} readOnly />
                    </div>
                    <div className={`${DATA_PARTY_FIELD} ${cdEstimateTab.customerEmailInRow}`}>
                      <label htmlFor="c_email">E-mail</label>
                      <input
                        id="c_email"
                        type="email"
                        autoComplete="email"
                        value={form.customer.email}
                        readOnly
                      />
                    </div>
                    <div className={`${DATA_PARTY_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
                      <label htmlFor="c_phones_ro">Телефоны</label>
                      <input
                        id="c_phones_ro"
                        type="text"
                        readOnly
                        value={repairCustomerPhonesReadonlyDisplay}
                        title={repairCustomerPhonesReadonlyDisplay}
                      />
                      {/* <p className={`${cdTemplates.hint} ${cdDataTab.repairDataPartySectionFieldHint}`}>
                        Несколько номеров — только в карточке CRM через «Добавить нового заказчика»; в
                        шаблоне основной номер — <code>{'{{customer.phone}}'}</code>.
                      </p> */}
                    </div>
                    <div
                      className={`${DATA_PARTY_FIELD} ${cdEstimateTab.fieldSpanAll} ${cdDataTab.customerBankDetailsField}`}
                    >
                      <label htmlFor="c_bank_details">Банковские реквизиты</label>
                      <textarea
                        id="c_bank_details"
                        rows={1}
                        value={form.customer.bankDetails}
                        readOnly
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div
          className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${cdDataTab.repairDataPartySection}`}
        >
          <div className={cdDataTab.repairDataPartySectionHeader}>
            <div className={cdDataTab.repairDataPartySectionTitleRow}>
              <h3 className={DATA_SECTION_TITLE}>Исполнитель</h3>
              {contractAndEstimateLocked ? (
                <PackageDataSectionLockInline title="Договор подписан: блок «Исполнитель» только для просмотра" />
              ) : null}
            </div>
            <div className={cdDataTab.repairDataPartySectionHeaderActions}>
              <span
                className={cdDataTab.repairDataPartySectionCompletion}
                title="Процент заполненности блока"
                style={packageCompletionBadgeStyle(executorSectionCompletionPercent)}
              >
                {executorSectionCompletionPercent}%
              </span>
              <PackageDataPartySectionCollapseButton
                expanded={executorDataSectionExpanded}
                sectionLabel="Исполнитель"
                controlsId="repair-data-executor-section-body"
                onToggle={() => setExecutorDataSectionExpanded((open) => !open)}
              />
            </div>
          </div>
          {executorDataSectionExpanded ? (
            <>
              <p className={`${DATA_HINT} ${cdDataTab.repairDataPartySectionIntroHint}`}>
                Реквизиты подставляются из набора, выбранного в блоке «Договор и объект».
                Редактировать здесь нельзя.
              </p>
              <div id="repair-data-executor-section-body" className={DATA_SECTION_FIELDS}>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_company">Наименование организации</label>
                  <input id="e_company" readOnly value={form.executor.companyName} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_inn">ИНН</label>
                  <input id="e_inn" readOnly value={form.executor.inn} />
                </div>
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="e_kpp">КПП</label>
                    <input id="e_kpp" readOnly value={form.executor.kpp} />
                  </div>
                ) : null}
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="e_ogrn">ОГРН</label>
                    <input id="e_ogrn" readOnly value={form.executor.ogrn} />
                  </div>
                ) : (
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="e_ogrnip">ОГРНИП</label>
                    <input id="e_ogrnip" readOnly value={form.executor.ogrnip} />
                  </div>
                )}
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_email">E-mail</label>
                  <input
                    id="e_email"
                    type="email"
                    autoComplete="email"
                    readOnly
                    value={form.executor.email}
                  />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_legal">Юридический адрес</label>
                  <textarea id="e_legal" readOnly value={form.executor.legalAddress} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_actual">Адрес для корреспонденции</label>
                  <textarea id="e_actual" readOnly value={form.executor.actualAddress} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_bank_name">Банк</label>
                  <input id="e_bank_name" readOnly value={form.executor.bankName} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_bank_bik">БИК</label>
                  <input id="e_bank_bik" readOnly value={form.executor.bankBik} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_bank_corr">Корр. счёт (к/с)</label>
                  <input id="e_bank_corr" readOnly value={form.executor.bankCorrAccount} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_bank_settlement">Расчётный счёт (р/с)</label>
                  <input
                    id="e_bank_settlement"
                    readOnly
                    value={form.executor.bankSettlementAccount}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div
          className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${cdDataTab.repairDataPartySection}`}
        >
          <div className={cdDataTab.repairDataPartySectionHeader}>
            <div className={cdDataTab.repairDataPartySectionTitleRow}>
              <h3 className={DATA_SECTION_TITLE}>Менеджер</h3>
              {contractAndEstimateLocked ? (
                <PackageDataSectionLockInline title="Договор подписан: блок «Менеджер» только для просмотра" />
              ) : null}
            </div>
            <div className={cdDataTab.repairDataPartySectionHeaderActions}>
              <span
                className={cdDataTab.repairDataPartySectionCompletion}
                title="Процент заполненности блока"
                style={packageCompletionBadgeStyle(managerSectionCompletionPercent)}
              >
                {managerSectionCompletionPercent}%
              </span>
              <PackageDataPartySectionCollapseButton
                expanded={managerDataSectionExpanded}
                sectionLabel="Менеджер"
                controlsId="repair-data-manager-section-body"
                onToggle={() => setManagerDataSectionExpanded((open) => !open)}
              />
            </div>
          </div>
          {managerDataSectionExpanded ? (
            <>
              <p className={`${DATA_HINT} ${cdDataTab.repairDataPartySectionIntroHint}`}>
                Данные подставляются из карточки, выбранной в блоке «Договор и объект».
                Редактировать здесь нельзя.
              </p>
              <div id="repair-data-manager-section-body" className={DATA_SECTION_FIELDS}>
                {form.executor.signatoryCrmUserId ? (
                  <p
                    className={`${DATA_HINT} ${cdDataTab.repairDataPartySectionFieldHint}`}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    Связь с CRM: id сотрудника{' '}
                    <code style={{ fontSize: '0.9em' }}>{form.executor.signatoryCrmUserId}</code> —
                    пользователь из справочника «Менеджеры».
                  </p>
                ) : null}
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_directorNom">Менеджер (именит. падеж)</label>
                  <input id="e_directorNom" readOnly value={form.executor.directorNameNominative} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_directorGen">Менеджер (родит. падеж)</label>
                  <input id="e_directorGen" readOnly value={form.executor.directorNameGenitive} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_basis">Действует на основании</label>
                  <input id="e_basis" readOnly value={form.executor.basis} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_sales_office">Офис продаж</label>
                  <input id="e_sales_office" readOnly value={form.executor.salesOffice} />
                </div>
                <div className={DATA_PARTY_FIELD}>
                  <label htmlFor="e_office_phone">Телефон офиса</label>
                  <input id="e_office_phone" readOnly value={form.executor.officePhone} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <p className={`${DATA_HINT} ${cdDataTab.contractInstructionHint}`}>
        Полная инструкция:{' '}
        <Link className={cdHub.link} href="/admin/contract-documents/instruction">
          Оформление договоров → Инструкция
        </Link>
        . На вкладке «Договор» можно править HTML и вставлять плейсхолдеры.
      </p>
    </div>
  );
}
