import { ContractDocumentPackageStatus } from '@prisma/client';

const PACKAGE_STATUS_LABELS: Record<ContractDocumentPackageStatus, string> = {
  IN_PROGRESS: 'в работе',
  CONTRACT_CONCLUDED: 'договор подписан',
  REFUSED: 'отказ',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PERSON: 'физлицо',
  COMPANY: 'организация',
  ENTREPRENEUR: 'ИП',
};

const CUSTOMER_FIELD_LABELS: Record<string, string> = {
  type: 'тип',
  fullName: 'ФИО',
  representativeFullNameNominative: 'представитель (им.)',
  representativeFullNameGenitive: 'представитель (род.)',
  organizationName: 'организация',
  representativePositionNominative: 'должность (им.)',
  representativePositionGenitive: 'должность (род.)',
  inn: 'ИНН',
  ogrn: 'ОГРН',
  address: 'адрес',
  phone: 'телефон',
  phones: 'телефоны',
  email: 'email',
  bankDetails: 'банковские реквизиты',
  passportSeriesNumber: 'паспорт',
  passportIssuedBy: 'кем выдан паспорт',
  passportIssueDate: 'дата выдачи паспорта',
};

const EXECUTOR_FIELD_LABELS: Record<string, string> = {
  selectedProfileTitle: 'профиль исполнителя',
  executorKind: 'тип исполнителя',
  companyName: 'наименование',
  inn: 'ИНН',
  kpp: 'КПП',
  ogrn: 'ОГРН',
  ogrnip: 'ОГРНИП',
  legalAddress: 'юр. адрес',
  actualAddress: 'факт. адрес',
  bankDetails: 'банковские реквизиты',
  bankName: 'банк',
  bankBik: 'БИК',
  bankCorrAccount: 'корр. счёт',
  bankSettlementAccount: 'расчётный счёт',
  email: 'email',
  selectedSignatoryProfileTitle: 'профиль менеджера',
  directorNameNominative: 'директор (им.)',
  directorNameGenitive: 'директор (род.)',
  directorName: 'директор',
  basis: 'основание полномочий',
  salesOffice: 'офис продаж',
  officePhone: 'телефон офиса',
};

const OBJECT_FIELD_LABELS: Record<string, string> = {
  objectAddress: 'адрес объекта',
  objectFloor: 'этаж',
  objectDescription: 'описание объекта',
};

const CONTRACT_FIELD_LABELS: Record<string, string> = {
  number: 'номер',
  date: 'дата',
  totalAmount: 'сумма',
  recommendedPrepayment: 'рекомендуемый аванс',
  totalAmountWords: 'сумма прописью',
  prepaymentAmount: 'аванс',
  prepaymentAmountWords: 'аванс прописью',
  paymentBasis: 'основание платежа',
  prepaymentDate: 'дата оплаты',
  paymentFormLabel: 'форма оплаты',
  invoiceNumber: 'номер счёта',
  workPeriod: 'срок работ',
  discountPercent: 'скидка',
};

const TEMPLATE_TAB_LABELS: Record<string, string> = {
  contract: 'договор',
  actStart: 'акт начала работ',
  actAcceptance: 'акт сдачи-приёмки',
  memo: 'памятка',
  cashOrder: 'ПКО',
  paymentInvoice: 'счёт на оплату',
  questionnaire1: 'анкета 1',
  questionnaire2: 'анкета 2',
  addendum1: 'Д/с №1',
  addendum2: 'Д/с №2',
  addendum3: 'Д/с №3',
  addendum4: 'Д/с №4',
  addendum5: 'Д/с №5',
  workOrder: 'заказ-наряд',
  workOrderAddendum1: 'заказ-наряд Д/с №1',
  workOrderAddendum2: 'заказ-наряд Д/с №2',
  workOrderAddendum3: 'заказ-наряд Д/с №3',
  workOrderAddendum4: 'заказ-наряд Д/с №4',
  workOrderAddendum5: 'заказ-наряд Д/с №5',
  productionLog: 'журнал производства',
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function changedFieldLabels(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  labels: Record<string, string>,
): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(prev[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
      changed.push(labels[key] ?? key);
    }
  }
  return changed;
}

function sectionChangeMessage(
  sectionTitle: string,
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  labels: Record<string, string>,
): string | null {
  const fields = changedFieldLabels(prev, next, labels);
  if (fields.length === 0) return null;
  return `${sectionTitle}: ${fields.join(', ')}`;
}

function customerChangeMessage(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): string | null {
  const fields = changedFieldLabels(prev, next, CUSTOMER_FIELD_LABELS);
  if (fields.length === 0) return null;
  const prevType = typeof prev.type === 'string' ? prev.type : '';
  const nextType = typeof next.type === 'string' ? next.type : '';
  if (prevType && nextType && prevType !== nextType) {
    const from = CUSTOMER_TYPE_LABELS[prevType] ?? prevType;
    const to = CUSTOMER_TYPE_LABELS[nextType] ?? nextType;
    return `Заказчик (${from} → ${to}): ${fields.filter((f) => f !== 'тип').join(', ') || 'данные'}`;
  }
  return `Заказчик: ${fields.join(', ')}`;
}

function estimateChangeMessage(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): string | null {
  if (JSON.stringify(prev) === JSON.stringify(next)) return null;
  const prevIds = extractEstimatePresetIds(prev);
  const nextIds = extractEstimatePresetIds(next);
  const idsChanged = JSON.stringify(prevIds) !== JSON.stringify(nextIds);
  const snapshotChanged =
    JSON.stringify(prev.snapshot ?? null) !== JSON.stringify(next.snapshot ?? null);
  const roomsChanged = JSON.stringify(prev.rooms ?? null) !== JSON.stringify(next.rooms ?? null);
  const parts: string[] = [];
  if (idsChanged) {
    if (nextIds.length === 0 && prevIds.length > 0) {
      parts.push('откреплены расчёты');
    } else if (prevIds.length === 0 && nextIds.length > 0) {
      parts.push('прикреплены расчёты');
    } else {
      parts.push('изменён набор прикреплённых расчётов');
    }
  }
  if (snapshotChanged || roomsChanged) {
    parts.push('изменён состав работ');
  }
  const objectGroupChanged =
    JSON.stringify(prev.objectGroupKey ?? '') !== JSON.stringify(next.objectGroupKey ?? '');
  if (objectGroupChanged) {
    parts.push('изменён объект расчёта');
  }
  if (parts.length === 0) {
    return 'Смета: изменены параметры';
  }
  return `Смета: ${parts.join('; ')}`;
}

function extractEstimatePresetIds(estimate: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof estimate.selectedPresetId === 'string' && estimate.selectedPresetId.trim()) {
    ids.push(estimate.selectedPresetId.trim());
  }
  if (Array.isArray(estimate.selectedPresetIds)) {
    for (const x of estimate.selectedPresetIds) {
      if (typeof x === 'string' && x.trim()) ids.push(x.trim());
    }
  }
  return [...new Set(ids)].sort();
}

function templatePresetChanges(
  prevRoot: Record<string, unknown>,
  nextRoot: Record<string, unknown>,
): string[] {
  const prev = asObject(prevRoot._templatePresetIds);
  const next = asObject(nextRoot._templatePresetIds);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const messages: string[] = [];
  for (const key of keys) {
    const p = typeof prev[key] === 'string' ? prev[key] : '';
    const n = typeof next[key] === 'string' ? next[key] : '';
    if (p !== n) {
      const tab = TEMPLATE_TAB_LABELS[key] ?? key;
      messages.push(`шаблон «${tab}»`);
    }
  }
  if (messages.length === 0) return [];
  return [`Шаблоны документов: ${messages.join(', ')}`];
}

function templateOverrideChanges(
  prevRoot: Record<string, unknown>,
  nextRoot: Record<string, unknown>,
): string[] {
  const prev = asObject(prevRoot._templateOverrides);
  const next = asObject(nextRoot._templateOverrides);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const messages: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(prev[key] ?? '') !== JSON.stringify(next[key] ?? '')) {
      const tab = TEMPLATE_TAB_LABELS[key] ?? key;
      messages.push(`«${tab}»`);
    }
  }
  if (messages.length === 0) return [];
  return [`Текст шаблонов: ${messages.join(', ')}`];
}

function addendumSlotChanges(prevSlots: unknown, nextSlots: unknown): string[] {
  const prev = Array.isArray(prevSlots) ? prevSlots : [];
  const next = Array.isArray(nextSlots) ? nextSlots : [];
  const messages: string[] = [];
  const len = Math.max(prev.length, next.length, 5);
  for (let i = 0; i < len; i += 1) {
    const p = asObject(prev[i]);
    const n = asObject(next[i]);
    const slotLabel = `Д/с №${i + 1}`;
    const prevStatus = typeof p.status === 'string' ? p.status : '';
    const nextStatus = typeof n.status === 'string' ? n.status : '';
    if (prevStatus !== nextStatus) {
      if (nextStatus === 'SIGNED') {
        messages.push(`${slotLabel}: отмечено как подписанное`);
      } else if (nextStatus === 'OPEN' && prevStatus === 'SIGNED') {
        messages.push(`${slotLabel}: снята отметка о подписании`);
      } else {
        messages.push(`${slotLabel}: изменён статус`);
      }
      continue;
    }
    const prevIds = JSON.stringify(p.selectedPresetIds ?? []);
    const nextIds = JSON.stringify(n.selectedPresetIds ?? []);
    if (prevIds !== nextIds) {
      messages.push(`${slotLabel}: изменены прикреплённые расчёты`);
    }
  }
  return messages;
}

function pipelineChanges(
  prevForm: Record<string, unknown>,
  nextForm: Record<string, unknown>,
): string[] {
  const messages: string[] = [];
  if (
    JSON.stringify(prevForm.repairWorkStartActSignedAt ?? '') !==
      JSON.stringify(nextForm.repairWorkStartActSignedAt ?? '') ||
    JSON.stringify(prevForm.repairWorkStartActPhotoUrl ?? '') !==
      JSON.stringify(nextForm.repairWorkStartActPhotoUrl ?? '')
  ) {
    messages.push('Акт начала работ: дата или фото');
  }
  if (
    JSON.stringify(prevForm.repairContractCloseActSignedAt ?? '') !==
      JSON.stringify(nextForm.repairContractCloseActSignedAt ?? '') ||
    JSON.stringify(prevForm.repairContractCloseActPhotoUrl ?? '') !==
      JSON.stringify(nextForm.repairContractCloseActPhotoUrl ?? '')
  ) {
    messages.push('Акт сдачи-приёмки: дата или фото');
  }
  if (
    JSON.stringify(prevForm.contractConcludedAt ?? '') !==
    JSON.stringify(nextForm.contractConcludedAt ?? '')
  ) {
    if (nextForm.contractConcludedAt) {
      messages.push('Зафиксирована дата подписания договора');
    } else {
      messages.push('Снята отметка о подписании договора');
    }
  }
  if (
    JSON.stringify(prevForm.contractRefusalReason ?? '') !==
      JSON.stringify(nextForm.contractRefusalReason ?? '') ||
    JSON.stringify(prevForm.contractRefusedAt ?? '') !==
      JSON.stringify(nextForm.contractRefusedAt ?? '')
  ) {
    messages.push('Зафиксирован отказ по договору');
  }
  if (
    JSON.stringify(prevForm.contractPaidAt ?? '') !== JSON.stringify(nextForm.contractPaidAt ?? '')
  ) {
    messages.push('Изменена дата полной оплаты договора');
  }
  if (
    JSON.stringify(prevForm.addendumSlotCount ?? 0) !==
    JSON.stringify(nextForm.addendumSlotCount ?? 0)
  ) {
    messages.push('Изменено количество доп. соглашений');
  }
  if (
    JSON.stringify(prevForm.selectedRepairInstallerIds ?? []) !==
    JSON.stringify(nextForm.selectedRepairInstallerIds ?? [])
  ) {
    messages.push('Изменён список прикреплённых мастеров');
  }
  if (
    JSON.stringify(prevForm.finalEstimateInstallerAssignments ?? {}) !==
    JSON.stringify(nextForm.finalEstimateInstallerAssignments ?? {})
  ) {
    messages.push('Изменены назначения мастеров в итоговой смете');
  }
  return messages;
}

export function buildPackageVersionKeyMoments(args: {
  previous: {
    title: string | null;
    status: ContractDocumentPackageStatus;
    crmContractId: string | null;
    formData: unknown;
  } | null;
  current: {
    title: string | null;
    status: ContractDocumentPackageStatus;
    crmContractId: string | null;
    formData: unknown;
  };
  action?: 'CREATE' | 'UPDATE' | 'ROLLBACK';
}): string[] {
  const { previous, current, action } = args;
  if (!previous) {
    return ['Создание пакета'];
  }

  const moments: string[] = [];
  if (action === 'ROLLBACK') {
    moments.push('Восстановлено более раннее состояние пакета');
  }

  if ((previous.title ?? null) !== (current.title ?? null)) {
    const prevTitle = previous.title?.trim() || 'без названия';
    const nextTitle = current.title?.trim() || 'без названия';
    moments.push(`Название черновика: «${prevTitle}» → «${nextTitle}»`);
  }

  if (previous.status !== current.status) {
    const from = PACKAGE_STATUS_LABELS[previous.status] ?? previous.status;
    const to = PACKAGE_STATUS_LABELS[current.status] ?? current.status;
    moments.push(`Статус пакета: ${from} → ${to}`);
  }

  if ((previous.crmContractId ?? null) !== (current.crmContractId ?? null)) {
    moments.push('Изменена привязка к договору CRM');
  }

  const prevRoot = asObject(previous.formData);
  const nextRoot = asObject(current.formData);

  const customerMsg = customerChangeMessage(
    asObject(prevRoot.customer),
    asObject(nextRoot.customer),
  );
  if (customerMsg) moments.push(customerMsg);

  const executorMsg = sectionChangeMessage(
    'Исполнитель',
    asObject(prevRoot.executor),
    asObject(nextRoot.executor),
    EXECUTOR_FIELD_LABELS,
  );
  if (executorMsg) moments.push(executorMsg);

  const objectMsg = sectionChangeMessage(
    'Объект',
    asObject(prevRoot.object),
    asObject(nextRoot.object),
    OBJECT_FIELD_LABELS,
  );
  if (objectMsg) moments.push(objectMsg);

  const contractMsg = sectionChangeMessage(
    'Договор',
    asObject(prevRoot.contract),
    asObject(nextRoot.contract),
    CONTRACT_FIELD_LABELS,
  );
  if (contractMsg) moments.push(contractMsg);

  const estimateMsg = estimateChangeMessage(
    asObject(prevRoot.estimate),
    asObject(nextRoot.estimate),
  );
  if (estimateMsg) moments.push(estimateMsg);

  moments.push(...addendumSlotChanges(prevRoot.addendumSlots, nextRoot.addendumSlots));
  moments.push(...pipelineChanges(prevRoot, nextRoot));
  moments.push(...templatePresetChanges(prevRoot, nextRoot));
  moments.push(...templateOverrideChanges(prevRoot, nextRoot));

  if (
    JSON.stringify(asObject(prevRoot.managerQuestionnaire1)) !==
    JSON.stringify(asObject(nextRoot.managerQuestionnaire1))
  ) {
    moments.push('Анкета менеджера (опрос по телефону)');
  }
  if (
    JSON.stringify(asObject(prevRoot.postWorkQuestionnaire2)) !==
    JSON.stringify(asObject(nextRoot.postWorkQuestionnaire2))
  ) {
    moments.push('Анкета заказчика после выполнения работ');
  }
  if (
    JSON.stringify(asObject(prevRoot.workOrder)) !== JSON.stringify(asObject(nextRoot.workOrder))
  ) {
    moments.push('Заказ-наряд: изменены данные');
  }
  if (
    JSON.stringify(prevRoot.issuedInvoices ?? []) !== JSON.stringify(nextRoot.issuedInvoices ?? [])
  ) {
    moments.push('Журнал выставленных счетов');
  }

  if (moments.length === 0) {
    const prevFormText = JSON.stringify(previous.formData ?? {});
    const nextFormText = JSON.stringify(current.formData ?? {});
    if (prevFormText !== nextFormText) {
      moments.push('Прочие данные пакета');
    }
  }

  return moments.length ? moments : ['Без изменений'];
}
