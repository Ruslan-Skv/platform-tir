'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';
import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
} from '../../form/contractWorkPeriod';
import { ContractDocumentsHelpTooltip } from '../../ui/ContractDocumentsHelpTooltip';
import { PackageContractNumberField } from './PackageContractNumberField';
import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  DATA_AUTO_FILLED,
  DATA_BLANK_SHEET,
  DATA_CONTRACT_COMPACT,
  DATA_FIELD,
  DATA_SECTION_CARD,
  DATA_SECTION_TITLE,
  DATA_TOP_BLOCK,
} from './packageDataTabStyles';
import { PackageDataSectionLockInline } from './packageDataTabUi';

export type PackageDataContractObjectSectionProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'isSuperAdmin'
  | 'isProductDirectionPackage'
  | 'packageKind'
  | 'contractObjectBlockFieldClassName'
  | 'updateContract'
  | 'updateObject'
  | 'applyExecutorProfile'
  | 'applySignatoryProfile'
  | 'executorProfiles'
  | 'signatoryProfiles'
  | 'contractDateFieldHelp'
  | 'workPeriodFieldHelp'
>;

export function PackageDataContractObjectSection({
  form,
  contractAndEstimateLocked,
  isSuperAdmin,
  isProductDirectionPackage,
  packageKind,
  contractObjectBlockFieldClassName,
  updateContract,
  updateObject,
  applyExecutorProfile,
  applySignatoryProfile,
  executorProfiles,
  signatoryProfiles,
  contractDateFieldHelp,
  workPeriodFieldHelp,
}: PackageDataContractObjectSectionProps) {
  return (
    <div className={DATA_TOP_BLOCK}>
      <div className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET}`}>
        <div className={styles.packageDataPartySectionTitleRow}>
          <h3 className={DATA_SECTION_TITLE}>Договор и объект</h3>
          {contractAndEstimateLocked ? (
            <PackageDataSectionLockInline title="Договор подписан: блок «Договор и объект» только для просмотра" />
          ) : null}
        </div>
        <div className={DATA_CONTRACT_COMPACT}>
          <PackageContractNumberField
            form={form}
            packageKind={packageKind}
            locked={contractAndEstimateLocked}
            fieldClassName={contractObjectBlockFieldClassName('contract.number')}
            updateContract={updateContract}
          />
          <div className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractHeaderMetaRow}`}>
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
                      ? String(DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS)
                      : String(DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS)
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
            <div
              className={`${DATA_FIELD} ${cdDataTab.contractInlineField} ${cdDataTab.contractDiscountFieldCell}`}
            >
              <label htmlFor="contract_discount_pct">Скидка на работы</label>
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
          </div>
          <div className={`${cdDataTab.contractInlineRow} ${cdDataTab.contractObjectAddressRow}`}>
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
  );
}
