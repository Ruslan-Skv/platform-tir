'use client';

import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  DATA_BLANK_SHEET,
  DATA_HINT,
  DATA_PARTY_FIELD,
  DATA_SECTION_CARD,
  DATA_SECTION_FIELDS,
  DATA_SECTION_TITLE,
} from './packageDataTabStyles';
import {
  PackageDataPartySectionCollapseButton,
  PackageDataSectionLockInline,
  packageCompletionBadgeStyle,
} from './packageDataTabUi';

export type PackageDataExecutorPartySectionProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'executorSectionCompletionPercent'
  | 'executorDataSectionExpanded'
  | 'setExecutorDataSectionExpanded'
>;

export function PackageDataExecutorPartySection({
  form,
  contractAndEstimateLocked,
  executorSectionCompletionPercent,
  executorDataSectionExpanded,
  setExecutorDataSectionExpanded,
}: PackageDataExecutorPartySectionProps) {
  return (
    <div className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${styles.packageDataPartySection}`}>
      <div className={styles.packageDataPartySectionHeader}>
        <div className={styles.packageDataPartySectionTitleRow}>
          <h3 className={DATA_SECTION_TITLE}>Исполнитель</h3>
          {contractAndEstimateLocked ? (
            <PackageDataSectionLockInline title="Договор подписан: блок «Исполнитель» только для просмотра" />
          ) : null}
        </div>
        <div className={styles.packageDataPartySectionHeaderActions}>
          <span
            className={styles.packageDataPartySectionCompletion}
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
          <p className={`${DATA_HINT} ${styles.packageDataPartySectionIntroHint}`}>
            Реквизиты подставляются из набора, выбранного в блоке «Договор и объект». Редактировать
            здесь нельзя.
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
              <input id="e_bank_settlement" readOnly value={form.executor.bankSettlementAccount} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
