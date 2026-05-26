import type { RepairCustomerBlock } from './repairPackageForm';

/** Контекст документа для выбора формулировки заказчика в `{{customer.fullName}}`. */
export type RepairCustomerTemplateContext =
  | 'contract'
  | 'act'
  | 'cashOrder'
  | 'productionLog'
  | 'general';

export function repairCustomerTemplateContextFromTab(
  templateTab: string | undefined
): RepairCustomerTemplateContext {
  if (templateTab === 'contract') return 'contract';
  if (templateTab === 'actStart' || templateTab === 'actAcceptance') return 'act';
  if (templateTab === 'cashOrder') return 'cashOrder';
  if (templateTab === 'productionLog') return 'productionLog';
  return 'general';
}

function pick(...parts: (string | undefined)[]): string {
  for (const p of parts) {
    const t = (p ?? '').trim();
    if (t) return t;
  }
  return '';
}

function joinParts(parts: string[], sep: string): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(sep);
}

/** ИП из CRM: «ИП Иванов…» или «Индивидуальный предприниматель …» — без дубля «ИП» / «Индивидуальный предприниматель». */
function normalizeEntrepreneurParty(raw: string): { preambleLabel: string; signatureFio: string } {
  let s = raw.trim();
  if (!s) return { preambleLabel: '—', signatureFio: '—' };

  s = s.replace(/^индивидуальный\s+предприниматель\s*/i, '').trim();
  const fio = s.replace(/^ип\.?\s*/i, '').trim() || s;

  return {
    preambleLabel: fio ? `Индивидуальный предприниматель ${fio}` : '—',
    signatureFio: fio || '—',
  };
}

/** Вычисляемые поля заказчика для HTML-шаблонов (договор, акты, ПКО, журнал). */
export interface RepairCustomerTemplateFields {
  /** Краткое имя: ФИО или наименование организации / ИП. */
  displayName: string;
  /** «Физическое лицо» / «Юридическое лицо» / «Индивидуальный предприниматель». */
  typeLabel: string;
  /** Преамбула договора (фрагмент до «, далее «Заказчик»»). */
  contractPartyLine: string;
  /** Участник в тексте акта («… с одной стороны, и …»). */
  actPartyLine: string;
  /** Строка «От …» в ПКО. */
  payerLine: string;
  /** Подпись в графе «Заказчик» (ФИО / представитель / ИП). */
  signatureName: string;
  /** HTML-блок реквизитов заказчика (колонка в таблице сторон). */
  requisitesHtml: string;
}

export function buildRepairCustomerTemplateFields(
  customer: RepairCustomerBlock
): RepairCustomerTemplateFields {
  const type = customer.type;

  if (type === 'COMPANY') {
    const org = pick(customer.organizationName);
    const posGen = pick(customer.representativePositionGenitive);
    const repGen = pick(customer.representativeFullNameGenitive);
    const posNom = pick(customer.representativePositionNominative);
    const repNom = pick(customer.representativeFullNameNominative);
    /** Преамбула договора / акт — родительный падеж («в лице генерального директора …»). */
    const inRepGenitive = joinParts(
      [posGen, repGen].filter(Boolean).length > 0 ? [`${posGen} ${repGen}`.trim()] : [repNom],
      ''
    );
    /** Реквизиты и подпись — именительный («Генеральный директор Иванов И.И.»). */
    const repRequisitesLine = joinParts(
      [posNom, repNom].filter(Boolean).length > 0 ? [`${posNom} ${repNom}`.trim()] : [repNom],
      ''
    );
    const contractPartyLine = joinParts(
      [
        org,
        inRepGenitive ? `в лице ${inRepGenitive}` : '',
        inRepGenitive ? 'действующего на основании Устава' : '',
      ],
      ', '
    );
    const actPartyLine = joinParts([org, inRepGenitive ? `в лице ${inRepGenitive}` : ''], ', ');
    const innLine = joinParts(
      [customer.inn ? `ИНН ${customer.inn}` : '', customer.ogrn ? `ОГРН ${customer.ogrn}` : ''],
      ', '
    );
    const requisitesHtml = [
      `<p style="margin: 0 0 6pt;">${org || '—'}</p>`,
      innLine ? `<p style="margin: 0 0 4pt;">${innLine}</p>` : '',
      customer.address
        ? `<p style="margin: 0 0 4pt;">Юридический адрес: ${customer.address}</p>`
        : '',
      customer.phone ? `<p style="margin: 0 0 4pt;">Тел.: ${customer.phone}</p>` : '',
      customer.email ? `<p style="margin: 0 0 4pt;">E-mail: ${customer.email}</p>` : '',
      customer.bankDetails
        ? `<p style="margin: 0 0 4pt;">Банковские реквизиты:</p><p style="margin: 0 0 4pt; white-space: pre-wrap;">${customer.bankDetails}</p>`
        : '',
      repRequisitesLine ? `<p style="margin: 0 0 4pt;">${repRequisitesLine}</p>` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      displayName: org || repNom || '—',
      typeLabel: 'Юридическое лицо',
      contractPartyLine: contractPartyLine || org || '—',
      actPartyLine: actPartyLine || org || '—',
      payerLine: org || repNom || '—',
      signatureName: repNom || repGen || org || '—',
      requisitesHtml,
    };
  }

  if (type === 'ENTREPRENEUR') {
    const name = pick(
      customer.organizationName,
      customer.fullName,
      customer.representativeFullNameNominative
    );
    const { preambleLabel, signatureFio } = normalizeEntrepreneurParty(name);
    const regLine = joinParts(
      [customer.inn ? `ИНН ${customer.inn}` : '', customer.ogrn ? `ОГРНИП ${customer.ogrn}` : ''],
      ', '
    );
    const contractPartyLine = joinParts([preambleLabel, regLine], ', ');
    const requisitesHtml = [
      `<p style="margin: 0 0 6pt;">${preambleLabel || '—'}</p>`,
      regLine ? `<p style="margin: 0 0 4pt;">${regLine}</p>` : '',
      customer.address ? `<p style="margin: 0 0 4pt;">Адрес: ${customer.address}</p>` : '',
      customer.phone ? `<p style="margin: 0 0 4pt;">Тел.: ${customer.phone}</p>` : '',
      customer.email ? `<p style="margin: 0 0 4pt;">E-mail: ${customer.email}</p>` : '',
      customer.bankDetails
        ? `<p style="margin: 0 0 4pt;">Банковские реквизиты:</p><p style="margin: 0 0 4pt; white-space: pre-wrap;">${customer.bankDetails}</p>`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      displayName: signatureFio || preambleLabel || '—',
      typeLabel: 'Индивидуальный предприниматель',
      contractPartyLine: contractPartyLine || preambleLabel || '—',
      actPartyLine: joinParts([preambleLabel, regLine], ', ') || preambleLabel || '—',
      payerLine: preambleLabel || '—',
      signatureName: signatureFio || '—',
      requisitesHtml,
    };
  }

  const fio = pick(customer.fullName);
  const passportLine = pick(customer.passportSeriesNumber);
  const requisitesHtml = [
    `<p style="margin: 0 0 6pt;">${fio || '—'}</p>`,
    customer.address ? `<p style="margin: 0 0 4pt;">Адрес: ${customer.address}</p>` : '',
    customer.phone ? `<p style="margin: 0 0 4pt;">Тел.: ${customer.phone}</p>` : '',
    customer.email ? `<p style="margin: 0 0 4pt;">E-mail: ${customer.email}</p>` : '',
    customer.bankDetails
      ? `<p style="margin: 0 0 4pt;">Банковские реквизиты:</p><p style="margin: 0 0 4pt; white-space: pre-wrap;">${customer.bankDetails}</p>`
      : '',
    passportLine ? `<p style="margin: 0 0 4pt;">Паспорт: ${passportLine}</p>` : '',
    customer.passportIssuedBy || customer.passportIssueDate
      ? `<p style="margin: 0 0 4pt;">Выдан: ${joinParts([customer.passportIssuedBy, customer.passportIssueDate], ', ')}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    displayName: fio || '—',
    typeLabel: 'Физическое лицо',
    contractPartyLine: fio || '—',
    actPartyLine: fio || '—',
    payerLine: fio || '—',
    signatureName: fio || '—',
    requisitesHtml,
  };
}

/** Значение для `{{customer.fullName}}` с учётом типа документа. */
export function repairCustomerContextualFullName(
  fields: RepairCustomerTemplateFields,
  context: RepairCustomerTemplateContext
): string {
  switch (context) {
    case 'contract':
      return fields.contractPartyLine;
    case 'act':
      return fields.actPartyLine;
    case 'cashOrder':
      return fields.payerLine;
    case 'productionLog':
    case 'general':
    default:
      return fields.displayName;
  }
}

export type RepairCustomerForTemplate = RepairCustomerBlock & RepairCustomerTemplateFields;

export function enrichRepairCustomerForTemplate(
  customer: RepairCustomerBlock,
  context: RepairCustomerTemplateContext
): RepairCustomerForTemplate {
  const fields = buildRepairCustomerTemplateFields(customer);
  const contextualFullName = repairCustomerContextualFullName(fields, context);
  return {
    ...customer,
    ...fields,
    fullName: contextualFullName,
  };
}
