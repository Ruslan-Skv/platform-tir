import type { RepairManagerQuestionnaire1Block, RepairPackageFormData } from './repairPackageForm';

/** Варианты «Откуда узнали о нас?» — id хранятся в `trafficSourceCheckedIds`. */
export const MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS: ReadonlyArray<{ id: string; label: string }> =
  [
    { id: 'yandex_search', label: 'Поиск Яндекс' },
    { id: 'google_search', label: 'Поиск Гугл' },
    { id: 'vk', label: 'ВК' },
    { id: 'avito', label: 'Авито' },
    {
      id: 'friends_recommendation',
      label: 'Рекомендация друзей / знакомых (укажите, кто именно)',
    },
    {
      id: 'returning_client',
      label: 'Уже обращался ранее (№ предыдущего договора)',
    },
    { id: 'outdoor_ad', label: 'Наружная реклама' },
    { id: 'flyers', label: 'Листовки' },
    { id: 'traffic_other', label: 'Другое' },
  ];

/** «Почему выбрали этого мастера / нашу компанию?» — id в `whyChosenCheckedIds`. */
export const MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  {
    id: 'why_relatives',
    label: 'Посоветовали знакомые / родственники (чьи: ____________________)',
  },
  {
    id: 'why_master_before',
    label: 'Конкретно этот мастер уже работал у нас (№ договора / адрес: ___________)',
  },
  {
    id: 'why_manager_advised',
    label: 'Посоветовал менеджер на сайте / по телефону (ФИО менеджера: __________)',
  },
  {
    id: 'why_review_site',
    label: 'Увидел(а) положительный отзыв о конкретном мастере (какой сайт: __________)',
  },
  { id: 'why_other', label: 'Другая причина: _____________________________________' },
];

/** Пункты «что ещё может понадобиться клиенту» — отмечает менеджер при разговоре. */
export const MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: 'measure_visit', label: 'Замер / выезд специалиста' },
  { id: 'design_consult', label: 'Консультация по дизайну / планировке' },
  { id: 'material_samples', label: 'Образцы отделочных материалов' },
  { id: 'warranty_insurance', label: 'Расширенная гарантия / страховка' },
  { id: 'financing', label: 'Рассрочка / кредит' },
  { id: 'urgent_timing', label: 'Сжатые сроки / приоритет в графике' },
  { id: 'cleaning_disposal', label: 'Уборка / вывоз мусора после работ' },
  { id: 'furniture_storage', label: 'Хранение мебели на время ремонта' },
  { id: 'smart_low_voltage', label: '«Умный дом» / слаботочные сети' },
  { id: 'other', label: 'Другое (указать в поле на форме)' },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatParagraph(text: string): string {
  const t = text.trim();
  if (!t) return '<p style="color:#64748b;margin:4pt 0;">—</p>';
  return `<p style="margin:4pt 0;">${escapeHtml(t).replace(/\n/g, '<br/>')}</p>`;
}

function buildTrafficSourcePrintBlock(q: RepairManagerQuestionnaire1Block): string {
  const lines = q.trafficSourceCheckedIds
    .map((id) => {
      const opt = MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS.find((o) => o.id === id);
      if (!opt) return '';
      if (id === 'friends_recommendation') {
        const who = q.trafficSourceRecommendationWho.trim();
        return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}${
          who ? `: ${escapeHtml(who)}` : ''
        }</li>`;
      }
      if (id === 'returning_client') {
        const num = q.trafficSourcePreviousContractNumber.trim();
        return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}${
          num ? `: № ${escapeHtml(num)}` : ''
        }</li>`;
      }
      if (id === 'traffic_other') {
        const t = q.trafficSourceOtherText.trim();
        return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}${
          t ? `: ${escapeHtml(t)}` : ''
        }</li>`;
      }
      return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}</li>`;
    })
    .filter(Boolean)
    .join('');

  return lines.length > 0
    ? `<ul style="margin:6pt 0;padding-left:18pt;">${lines}</ul>`
    : '<p style="color:#64748b;margin:4pt 0;">—</p>';
}

function buildWhyChosenPrintBlock(q: RepairManagerQuestionnaire1Block): string {
  const lines = q.whyChosenCheckedIds
    .map((id) => {
      const opt = MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS.find((o) => o.id === id);
      if (!opt) return '';
      if (id === 'why_relatives') {
        const who = q.whyChosenRelativesWho.trim();
        return `<li style="margin:2pt 0;">Посоветовали знакомые / родственники${
          who ? ` (чьи: ${escapeHtml(who)})` : ''
        }</li>`;
      }
      if (id === 'why_master_before') {
        const detail = q.whyChosenMasterContractOrAddress.trim();
        return `<li style="margin:2pt 0;">Конкретно этот мастер уже работал у нас${
          detail ? `: ${escapeHtml(detail)}` : ''
        }</li>`;
      }
      if (id === 'why_manager_advised') {
        const name = q.whyChosenManagerAdvisedName.trim();
        return `<li style="margin:2pt 0;">Посоветовал менеджер на сайте / по телефону${
          name ? ` (ФИО: ${escapeHtml(name)})` : ''
        }</li>`;
      }
      if (id === 'why_review_site') {
        const site = q.whyChosenReviewSite.trim();
        return `<li style="margin:2pt 0;">Положительный отзыв о мастере${
          site ? ` (сайт: ${escapeHtml(site)})` : ''
        }</li>`;
      }
      if (id === 'why_other') {
        const t = q.whyChosenOtherReason.trim();
        return `<li style="margin:2pt 0;">Другая причина${t ? `: ${escapeHtml(t)}` : ''}</li>`;
      }
      return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}</li>`;
    })
    .filter(Boolean)
    .join('');

  return lines.length > 0
    ? `<ul style="margin:6pt 0;padding-left:18pt;">${lines}</ul>`
    : '<p style="color:#64748b;margin:4pt 0;">—</p>';
}

/** HTML для предпросмотра и печати вкладки «Анкета 1». */
export function buildManagerQuestionnaire1PrintHtml(form: RepairPackageFormData): string {
  const { customer: c, object, managerQuestionnaire1: q } = form;

  const listItems = q.clientNeedsCheckedIds
    .map((id) => {
      const opt = MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS.find((o) => o.id === id);
      if (!opt) return '';
      if (id === 'other') {
        const detail = q.clientNeedsOtherDetails.trim();
        return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}${
          detail ? `: ${escapeHtml(detail)}` : ''
        }</li>`;
      }
      return `<li style="margin:2pt 0;">${escapeHtml(opt.label)}</li>`;
    })
    .filter(Boolean)
    .join('');

  const needsBlock =
    listItems.length > 0
      ? `<ul style="margin:6pt 0;padding-left:18pt;">${listItems}</ul>`
      : '<p style="color:#64748b;margin:4pt 0;">—</p>';

  return `
<div class="docPrint repairQuestionnairePrint">
  <h1>Анкета (опросник)</h1>
  <p style="color:#475569;font-size:10pt;margin:0 0 12pt;">Заполняется менеджером со слов клиента при оформлении договора. Блок ниже дублирует данные из вкладки «Данные» для удобства печати.</p>

  <h2>1. Контактные данные и объект</h2>
  <p style="margin:4pt 0;">Заказчик: ${escapeHtml(c.fullName || '—')}</p>
  <p style="margin:4pt 0;">Телефон: ${escapeHtml(c.phone || '—')} &nbsp;&nbsp; E-mail: ${escapeHtml(c.email || '—')}</p>
  <p style="margin:4pt 0;">Адрес (карточка): ${escapeHtml(c.address || '—')}</p>
  <p style="margin:4pt 0;">Адрес объекта: ${escapeHtml(object.objectAddress || '—')}${
    object.objectFloor ? `, эт. ${escapeHtml(object.objectFloor)}` : ''
  }</p>
  <p style="margin:4pt 0;">Описание работ (карточка): ${escapeHtml(object.objectDescription || '—')}</p>
  <p style="margin:8pt 0 4pt;">Дополнительно по контакту / объекту (со слов клиента):</p>
  ${formatParagraph(q.contactNotesFromCall)}

  <h2>2. Информация о заказе (что нужно сделать?)</h2>
  ${formatParagraph(q.orderInfo)}

  <h2>3. Откуда узнали о нас? (источник трафика)</h2>
  ${buildTrafficSourcePrintBlock(q)}

  <h2>4. Пожелания по мастеру (и контроль качества)</h2>
  ${formatParagraph(q.masterAndQualityPreferences)}

  <h2>5. Почему выбрали этого мастера / нашу компанию?</h2>
  ${buildWhyChosenPrintBlock(q)}

  <h2>6. Дополнительные услуги (кросс-продажи)</h2>
  ${formatParagraph(q.crossSellServices)}

  <h2>Что ещё может понадобиться клиенту сейчас (отметьте при разговоре)</h2>
  ${needsBlock}
</div>
`.trim();
}
