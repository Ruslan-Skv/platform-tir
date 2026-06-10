'use client';

import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../styles/estimates-list.module.css';
import type { PackageFormData, PackageManagerQuestionnaire1Block } from '../form/packageForm';
import {
  MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS,
  MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS,
  MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS,
} from '../questionnaires/managerQuestionnaire1Print';
import {
  PACKAGE_FIELD,
  PACKAGE_FORM_GRID,
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../ui/packageTabClassNames';

export type PackageManagerQuestionnaire1TabProps = {
  form: PackageFormData;
  onPatch: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  onToggleTrafficSource: (id: string) => void;
  onToggleWhyChosen: (id: string) => void;
  onToggleClientNeed: (id: string) => void;
  /** `crm` — анкета из карточки клиента; `package` — привязан CRM; иначе подсказка о привязке. */
  syncSourceLabel?: 'crm' | 'package' | 'unlinked' | null;
};

export function PackageManagerQuestionnaire1Tab({
  form,
  onPatch,
  onToggleTrafficSource,
  onToggleWhyChosen,
  onToggleClientNeed,
  syncSourceLabel = null,
}: PackageManagerQuestionnaire1TabProps) {
  const q = form.managerQuestionnaire1;
  const { customer: c, object: o } = form;

  return (
    <div className={PACKAGE_FORM_GRID}>
      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h3 className={`${PACKAGE_SECTION_TITLE} ${cdEstimatesList.managerQuestionnaire1Title}`}>
          Анкета (опросник)
        </h3>
        <p className={PACKAGE_HINT} style={{ marginTop: 0 }}>
          Заполните по телефонному разговору или при личной встрече со слов клиента. Основные
          реквизиты заказчика и объекта редактируются на вкладке «Данные»; ниже — уточнения и
          маркетинговые ответы. Печать — как у других документов пакета (кнопка «Печать»).
        </p>
        {syncSourceLabel === 'crm' || syncSourceLabel === 'package' ? (
          <p className={PACKAGE_HINT} style={{ margin: '8px 0 0' }}>
            Одна анкета на заказчика: данные хранятся в карточке CRM и совпадают во всех договорах
            этого клиента (Ремонт, Окна и другие направления). Изменения можно вносить в любое
            время.
          </p>
        ) : syncSourceLabel === 'unlinked' ? (
          <p className={PACKAGE_HINT} style={{ margin: '8px 0 0' }}>
            Привяжите заказчика на вкладке «Данные» — тогда анкета будет общей для всех его
            договоров.
          </p>
        ) : null}
      </div>

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

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>2) Информация о заказе (что нужно сделать?)</h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_order">Суть заказа, объём, приоритеты</label>
            <textarea
              id="mq1_order"
              rows={5}
              value={q.orderInfo}
              onChange={(e) => onPatch({ orderInfo: e.target.value })}
              placeholder="Что именно хочет клиент: тип работ, помещения, сроки ожидания…"
            />
          </div>
        </div>
      </div>

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>3) Откуда узнали о нас? (источник трафика)</h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <div
              className={cdEstimatesList.managerQuestionnaireNeedsGrid}
              role="group"
              aria-label="Источник трафика"
            >
              {MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS.map((opt) => {
                const checked = q.trafficSourceCheckedIds.includes(opt.id);
                return (
                  <label key={opt.id} className={cdEstimatesList.managerQuestionnaireNeedRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleTrafficSource(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {q.trafficSourceCheckedIds.includes('friends_recommendation') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_traffic_who">Кто именно порекомендовал</label>
              <input
                id="mq1_traffic_who"
                type="text"
                value={q.trafficSourceRecommendationWho}
                onChange={(e) => onPatch({ trafficSourceRecommendationWho: e.target.value })}
                placeholder="ФИО или как представился"
              />
            </div>
          ) : null}
          {q.trafficSourceCheckedIds.includes('returning_client') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_traffic_prev_contract">№ предыдущего договора</label>
              <input
                id="mq1_traffic_prev_contract"
                type="text"
                value={q.trafficSourcePreviousContractNumber}
                onChange={(e) => onPatch({ trafficSourcePreviousContractNumber: e.target.value })}
                placeholder="Например: R-012/25"
              />
            </div>
          ) : null}
          {q.trafficSourceCheckedIds.includes('traffic_other') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_traffic_other">Другое (уточните)</label>
              <textarea
                id="mq1_traffic_other"
                rows={2}
                value={q.trafficSourceOtherText}
                onChange={(e) => onPatch({ trafficSourceOtherText: e.target.value })}
                placeholder="Кратко опишите источник"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>4) Пожелания по мастеру (и контроль качества)</h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_master">Пожелания</label>
            <textarea
              id="mq1_master"
              rows={4}
              value={q.masterAndQualityPreferences}
              onChange={(e) => onPatch({ masterAndQualityPreferences: e.target.value })}
              placeholder="Опыт, коммуникация, фотоотчёты, график, контрольные выезды…"
            />
          </div>
        </div>
      </div>

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>5) Почему выбрали этого мастера / нашу компанию?</h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <div
              className={cdEstimatesList.managerQuestionnaireNeedsGrid}
              role="group"
              aria-label="Причина выбора мастера или компании"
            >
              {MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS.map((opt) => {
                const checked = q.whyChosenCheckedIds.includes(opt.id);
                return (
                  <label key={opt.id} className={cdEstimatesList.managerQuestionnaireNeedRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleWhyChosen(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {q.whyChosenCheckedIds.includes('why_relatives') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_why_relatives">Чьи знакомые / родственники</label>
              <input
                id="mq1_why_relatives"
                type="text"
                value={q.whyChosenRelativesWho}
                onChange={(e) => onPatch({ whyChosenRelativesWho: e.target.value })}
                placeholder="ФИО или степень родства"
              />
            </div>
          ) : null}
          {q.whyChosenCheckedIds.includes('why_master_before') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_why_master_ref">№ договора / адрес предыдущего объекта</label>
              <input
                id="mq1_why_master_ref"
                type="text"
                value={q.whyChosenMasterContractOrAddress}
                onChange={(e) => onPatch({ whyChosenMasterContractOrAddress: e.target.value })}
                placeholder="Например: договор № … или адрес объекта"
              />
            </div>
          ) : null}
          {q.whyChosenCheckedIds.includes('why_manager_advised') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_why_manager">ФИО менеджера</label>
              <input
                id="mq1_why_manager"
                type="text"
                value={q.whyChosenManagerAdvisedName}
                onChange={(e) => onPatch({ whyChosenManagerAdvisedName: e.target.value })}
                placeholder="Кто из менеджеров порекомендовал"
              />
            </div>
          ) : null}
          {q.whyChosenCheckedIds.includes('why_review_site') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_why_site">Какой сайт (отзыв о мастере)</label>
              <input
                id="mq1_why_site"
                type="text"
                value={q.whyChosenReviewSite}
                onChange={(e) => onPatch({ whyChosenReviewSite: e.target.value })}
                placeholder="Например: Профи.ру, Яндекс.Карты, 2ГИС…"
              />
            </div>
          ) : null}
          {q.whyChosenCheckedIds.includes('why_other') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_why_other">Другая причина (уточните)</label>
              <textarea
                id="mq1_why_other"
                rows={3}
                value={q.whyChosenOtherReason}
                onChange={(e) => onPatch({ whyChosenOtherReason: e.target.value })}
                placeholder="Кратко опишите"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>6) Дополнительные услуги (кросс-продажи)</h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_cross">Интерес к доп. услугам</label>
            <textarea
              id="mq1_cross"
              rows={4}
              value={q.crossSellServices}
              onChange={(e) => onPatch({ crossSellServices: e.target.value })}
              placeholder="Дизайн, материалы «под ключ», техника, страховка…"
            />
          </div>
        </div>
      </div>

      <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={PACKAGE_SECTION_TITLE}>
          Что ещё может понадобиться клиенту сейчас (отметьте при разговоре)
        </h4>
        <div className={PACKAGE_SECTION_FIELDS}>
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <div
              className={cdEstimatesList.managerQuestionnaireNeedsGrid}
              role="group"
              aria-label="Потребности клиента"
            >
              {MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS.map((opt) => {
                const checked = q.clientNeedsCheckedIds.includes(opt.id);
                return (
                  <label key={opt.id} className={cdEstimatesList.managerQuestionnaireNeedRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleClientNeed(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {q.clientNeedsCheckedIds.includes('other') ? (
            <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <label htmlFor="mq1_other">Уточнение к «Другое»</label>
              <textarea
                id="mq1_other"
                rows={2}
                value={q.clientNeedsOtherDetails}
                onChange={(e) => onPatch({ clientNeedsOtherDetails: e.target.value })}
                placeholder="Кратко опишите"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
