'use client';

import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  DATA_FIELD,
  DATA_SECTION,
  DATA_SECTION_ACTIONS,
  DATA_SECTION_HEAD,
  DATA_SECTION_HINT,
  DATA_SECTION_TITLE,
} from './packageDataTabStyles';
import {
  PackageDataPartySectionCollapseButton,
  PackageDataPartySectionSummary,
  PackageDataSectionLockInline,
  buildPartySummaryText,
  packageCompletionBadgeStyle,
} from './packageDataTabUi';

export type PackageDataManagerPartySectionProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'signedDocsLocked'
  | 'managerSectionCompletionPercent'
  | 'managerDataSectionExpanded'
  | 'setManagerDataSectionExpanded'
>;

export function PackageDataManagerPartySection({
  form,
  signedDocsLocked,
  managerSectionCompletionPercent,
  managerDataSectionExpanded,
  setManagerDataSectionExpanded,
}: PackageDataManagerPartySectionProps) {
  return (
    <div className={DATA_SECTION}>
      <div className={DATA_SECTION_HEAD}>
        <div className={styles.sectionTitleCluster}>
          <h3 className={DATA_SECTION_TITLE}>Менеджер</h3>
          {signedDocsLocked ? (
            <PackageDataSectionLockInline title="Договор подписан: блок «Менеджер» только для просмотра" />
          ) : null}
        </div>
        <div className={DATA_SECTION_ACTIONS}>
          <span
            className={styles.packageDataPartySectionCompletion}
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
      {!managerDataSectionExpanded ? (
        <PackageDataPartySectionSummary
          text={buildPartySummaryText([
            form.executor.directorNameNominative,
            form.executor.salesOffice,
            form.executor.officePhone,
          ])}
        />
      ) : null}
      {managerDataSectionExpanded ? (
        <>
          <p className={DATA_SECTION_HINT}>
            Данные подставляются из карточки, выбранной в блоке «Договор и объект». Редактировать
            здесь нельзя.
          </p>
          <p className={DATA_SECTION_HINT}>
            {form.executor.signatoryCrmUserId ? (
              <>
                Ответственный менеджер пакета связан с CRM-пользователем{' '}
                <code>{form.executor.signatoryCrmUserId}</code>. При смене карточки менеджера в
                блоке «Договор и объект» ответственность по договору передаётся этому сотруднику.
              </>
            ) : (
              <>
                Выберите карточку менеджера в блоке «Договор и объект», чтобы закрепить
                ответственного за пакет (очередь «Мои» в списке договоров).
              </>
            )}
          </p>
          <div id="repair-data-manager-section-body" className={styles.partyFields}>
            <div className={DATA_FIELD}>
              <label htmlFor="e_directorNom">Менеджер (именит. падеж)</label>
              <input id="e_directorNom" readOnly value={form.executor.directorNameNominative} />
            </div>
            <div className={DATA_FIELD}>
              <label htmlFor="e_directorGen">Менеджер (родит. падеж)</label>
              <input id="e_directorGen" readOnly value={form.executor.directorNameGenitive} />
            </div>
            <div className={DATA_FIELD}>
              <label htmlFor="e_basis">Действует на основании</label>
              <input id="e_basis" readOnly value={form.executor.basis} />
            </div>
            <div className={DATA_FIELD}>
              <label htmlFor="e_sales_office">Офис продаж</label>
              <input id="e_sales_office" readOnly value={form.executor.salesOffice} />
            </div>
            <div className={DATA_FIELD}>
              <label htmlFor="e_office_phone">Телефон офиса</label>
              <input id="e_office_phone" readOnly value={form.executor.officePhone} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
