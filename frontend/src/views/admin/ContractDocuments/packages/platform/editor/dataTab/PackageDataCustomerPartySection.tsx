'use client';

import { crmCustomerFillPercentHint } from '@/views/admin/CRM/Customers/shared/crmCustomerFillPercent';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
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

export type PackageDataCustomerPartySectionProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'linkedCrmCustomerId'
  | 'customerSectionCompletionPercent'
  | 'customerDataSectionExpanded'
  | 'setCustomerDataSectionExpanded'
  | 'customerPhonesReadonlyDisplay'
>;

export function PackageDataCustomerPartySection({
  form,
  contractAndEstimateLocked,
  linkedCrmCustomerId,
  customerSectionCompletionPercent,
  customerDataSectionExpanded,
  setCustomerDataSectionExpanded,
  customerPhonesReadonlyDisplay,
}: PackageDataCustomerPartySectionProps) {
  const fillHint = crmCustomerFillPercentHint(form.customer.type);

  return (
    <div className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${styles.packageDataPartySection}`}>
      <div className={styles.packageDataPartySectionHeader}>
        <div className={styles.packageDataPartySectionTitleRow}>
          <h3 className={DATA_SECTION_TITLE}>Заказчик</h3>
          {contractAndEstimateLocked ? (
            <PackageDataSectionLockInline title="Договор подписан: блок «Заказчик» только для просмотра" />
          ) : null}
        </div>
        <div className={styles.packageDataPartySectionHeaderActions}>
          <span
            className={styles.packageDataPartySectionCompletion}
            title={fillHint}
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
          <p className={`${DATA_HINT} ${styles.packageDataPartySectionIntroHint}`}>
            {linkedCrmCustomerId?.trim()
              ? 'Данные подставляются из карточки заказчика в блоке «Поиск заказчика в базе». Редактировать здесь нельзя. Чтобы завести карточку и указать телефоны, нажмите «Добавить нового заказчика» в блоке поиска.'
              : 'Карточка CRM не выбрана. Если поля ниже всё ещё заполнены, нажмите «Снять выбор» в блоке «Поиск заказчика в базе», затем выберите карточку заново. Редактировать поля здесь нельзя.'}
          </p>
          <div id="repair-data-customer-section-body" className={DATA_SECTION_FIELDS}>
            {form.customer.type === 'PERSON' ? (
              <>
                <div
                  className={`${styles.packageCustomerPrimaryRow} ${cdEstimateTab.fieldSpanAll}`}
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
                  className={`${styles.packageCustomerSecondaryRow} ${cdEstimateTab.fieldSpanAll}`}
                >
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="c_phones_ro">Телефоны</label>
                    <input
                      id="c_phones_ro"
                      type="text"
                      readOnly
                      value={customerPhonesReadonlyDisplay}
                      title={customerPhonesReadonlyDisplay}
                    />
                    {/* <p className={`${cdTemplates.hint} ${styles.packageDataPartySectionFieldHint}`}>
                        Несколько номеров — только в карточке CRM через «Добавить нового заказчика»; в
                        шаблоне основной номер — <code>{'{{customer.phone}}'}</code>.
                      </p> */}
                  </div>
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="c_passport">Паспорт (серия и номер)</label>
                    <input id="c_passport" value={form.customer.passportSeriesNumber} readOnly />
                  </div>
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="c_passportBy">Кем выдан</label>
                    <input id="c_passportBy" value={form.customer.passportIssuedBy} readOnly />
                  </div>
                  <div className={DATA_PARTY_FIELD}>
                    <label htmlFor="c_passportDate">Дата выдачи</label>
                    <input id="c_passportDate" value={form.customer.passportIssueDate} readOnly />
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
                    value={customerPhonesReadonlyDisplay}
                    title={customerPhonesReadonlyDisplay}
                  />
                  {/* <p className={`${cdTemplates.hint} ${styles.packageDataPartySectionFieldHint}`}>
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
  );
}
