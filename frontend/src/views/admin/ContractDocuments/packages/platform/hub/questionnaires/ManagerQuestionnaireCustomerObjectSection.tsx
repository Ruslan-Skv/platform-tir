'use client';

import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import styles from './PackageQuestionnairesHubPanels.module.css';
import { Q_FIELD, Q_PANEL, Q_PANEL_HEAD, Q_PANEL_TITLE } from './managerQuestionnairePanelStyles';

export type ManagerQuestionnaireCustomerObjectSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch'
>;

export function ManagerQuestionnaireCustomerObjectSection({
  form,
  onPatch,
}: ManagerQuestionnaireCustomerObjectSectionProps) {
  const q = form.managerQuestionnaire1;
  const { customer: c, object: o } = form;

  return (
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>1) Контактные данные и объект</h4>
      </div>
      <dl className={styles.summaryList}>
        <div>
          <dt>Из карточки пакета:</dt>
          <dd>
            {c.fullName || '—'} · {c.phone || '—'} · {c.email || '—'}
          </dd>
        </div>
        <div>
          <dt>Адрес:</dt>
          <dd>{c.address || '—'}</dd>
        </div>
        <div>
          <dt>Объект:</dt>
          <dd>
            {o.objectAddress || '—'}
            {o.objectFloor ? `, эт. ${o.objectFloor}` : ''}
          </dd>
        </div>
        <div>
          <dt>Описание работ (карточка):</dt>
          <dd>{o.objectDescription || '—'}</dd>
        </div>
      </dl>
      <div className={Q_FIELD}>
        <label htmlFor="mq1_contact_notes">
          Дополнительно по контакту / объекту (со слов клиента)
        </label>
        <textarea
          id="mq1_contact_notes"
          rows={4}
          value={q.contactNotesFromCall}
          onChange={(e) => onPatch({ contactNotesFromCall: e.target.value })}
          placeholder="Например: удобное время звонка, второй номер, особенности подъезда…"
        />
      </div>
    </div>
  );
}
