'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_FIELD,
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

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
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>1) Контактные данные и объект</h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <p className={PACKAGE_HINT} style={{ margin: '0 0 8px' }}>
            <strong>Из карточки пакета:</strong> {c.fullName || '—'} · {c.phone || '—'} ·{' '}
            {c.email || '—'}
          </p>
          <p className={PACKAGE_HINT} style={{ margin: '0 0 8px' }}>
            <strong>Адрес:</strong> {c.address || '—'}
          </p>
          <p className={PACKAGE_HINT} style={{ margin: '0 0 8px' }}>
            <strong>Объект:</strong> {o.objectAddress || '—'}
            {o.objectFloor ? `, эт. ${o.objectFloor}` : ''}
          </p>
          <p className={PACKAGE_HINT} style={{ margin: '0 0 8px' }}>
            <strong>Описание работ (карточка):</strong> {o.objectDescription || '—'}
          </p>
        </div>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
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
    </div>
  );
}
