/**
 * Чтение служебных полей из formData пакета документов (чистые функции,
 * без обращения к БД): подписант, привязанные расчёты, номер и заказчик.
 */

/** Id карточки CRM подписанта (executor.signatoryCrmUserId), если заполнен. */
export function extractSignatoryCrmUserId(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const executor = (formData as Record<string, unknown>).executor;
  if (!executor || typeof executor !== 'object') return null;
  const id = (executor as Record<string, unknown>).signatoryCrmUserId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Id привязанных расчётов (estimate.selectedPresetId(s)), без дублей. */
export function extractEstimatePresetIds(formData: unknown): string[] {
  if (!formData || typeof formData !== 'object') return [];
  const est = (formData as Record<string, unknown>).estimate;
  if (!est || typeof est !== 'object') return [];
  const e = est as Record<string, unknown>;
  const ids: string[] = [];
  if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) {
    ids.push(e.selectedPresetId.trim());
  }
  if (Array.isArray(e.selectedPresetIds)) {
    for (const x of e.selectedPresetIds) {
      if (typeof x === 'string' && x.trim()) ids.push(x.trim());
    }
  }
  return [...new Set(ids)];
}

/** Отображаемый номер договора: общий или по этапам («мебель»). */
export function displayContractNumberFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '—';
  const fd = formData as Record<string, unknown>;
  const contract =
    fd.contract && typeof fd.contract === 'object'
      ? (fd.contract as Record<string, unknown>)
      : null;
  const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
  if (num) return num;
  const furniture = fd.furniture;
  if (furniture && typeof furniture === 'object') {
    const legs = furniture as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of ['manufacture', 'montage', 'appliances'] as const) {
      const leg = legs[key];
      if (!leg || typeof leg !== 'object') continue;
      const enabled = (leg as { enabled?: unknown }).enabled;
      if (key !== 'manufacture' && enabled !== true) continue;
      const legContract = (leg as { contract?: unknown }).contract;
      if (!legContract || typeof legContract !== 'object') continue;
      const legNum = (legContract as { number?: unknown }).number;
      if (typeof legNum === 'string' && legNum.trim()) parts.push(legNum.trim());
    }
    if (parts.length > 0) return parts.join(' / ');
  }
  return '—';
}

/** Отображаемое имя заказчика (организация или ФИО). */
export function customerNameFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '—';
  const fd = formData as Record<string, unknown>;
  const c =
    fd.customer && typeof fd.customer === 'object'
      ? (fd.customer as Record<string, unknown>)
      : null;
  if (!c) return '—';
  const type = c.type;
  if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
    const org = typeof c.organizationName === 'string' ? c.organizationName.trim() : '';
    return org || '—';
  }
  const full = typeof c.fullName === 'string' ? c.fullName.trim() : '';
  return full || '—';
}
