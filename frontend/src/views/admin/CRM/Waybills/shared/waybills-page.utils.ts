import type { WaybillFormValues } from './waybills-page.types';

export const WAYBILL_DIRECTION_SUGGESTIONS = ['двери', 'бавария'] as const;

export const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'В плане',
  DONE: 'Выполнено',
  FAILED: 'Не выполнено',
};

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Сегодня + 6 дней (неделя, включая сегодняшний день). */
export function weekAheadIsoDate(fromIso = todayIsoDate()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso);
  const base = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date();
  base.setUTCDate(base.getUTCDate() + 6);
  const y = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Отображение даты задания в списках: дд.мм.гг */
export function formatWaybillDateDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1].slice(2)}`;
}

export function emptyWaybillForm(date: string, responsibleUserId = ''): WaybillFormValues {
  return {
    date,
    timeFrom: '',
    timeTo: '',
    direction: '',
    taskText: '',
    customerName: '',
    customerAddress: '',
    customerPhones: [''],
    contractId: '',
    contractSearch: '',
    deliveryCost: '',
    deliveryPayer: '',
    moversCost: '',
    moversPayer: '',
    responsibleUserId,
    driverUserId: '',
  };
}

/** Разбирает legacy `customerInfoText` на ФИО / адрес / телефоны. */
export function parseLegacyCustomerInfoText(text: string | null | undefined): {
  customerName: string;
  customerAddress: string;
  customerPhones: string[];
} {
  const empty = { customerName: '', customerAddress: '', customerPhones: [] as string[] };
  if (!text?.trim()) return empty;
  const parts = text
    .split(/\s{2,}|\t/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 4) {
    // раньше: № договора · ФИО · адрес · телефон[+…]
    return {
      customerName: parts[1] ?? '',
      customerAddress: parts[2] ?? '',
      customerPhones: parts.slice(3),
    };
  }
  if (parts.length === 3) {
    return {
      customerName: parts[0] ?? '',
      customerAddress: parts[1] ?? '',
      customerPhones: parts[2] ? [parts[2]] : [],
    };
  }
  if (parts.length === 2) {
    const phoneLike = /(\+?\d[\d\-\s()]{8,}\d)/.test(parts[1]);
    return {
      customerName: parts[0] ?? '',
      customerAddress: phoneLike ? '' : (parts[1] ?? ''),
      customerPhones: phoneLike ? [parts[1]] : [],
    };
  }
  const phoneMatch = text.match(/(\+?\d[\d\-\s()]{8,}\d)/);
  if (phoneMatch) {
    return {
      customerName: text.replace(phoneMatch[0], '').trim(),
      customerAddress: '',
      customerPhones: [phoneMatch[0].trim()],
    };
  }
  return { customerName: text.trim(), customerAddress: '', customerPhones: [] };
}

export function resolveWaybillCustomerFields(item: {
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerPhones?: string[] | null;
  customerInfoText?: string | null;
  contract?: {
    customerName?: string | null;
    customerAddress?: string | null;
    customerPhone?: string | null;
  } | null;
}): { customerName: string; customerAddress: string; customerPhones: string[] } {
  const fromArray = (item.customerPhones ?? []).map((p) => p.trim()).filter(Boolean);
  const fromPrimary = item.customerPhone?.trim();
  const hasStructured =
    Boolean(item.customerName?.trim()) ||
    Boolean(item.customerAddress?.trim()) ||
    fromArray.length > 0 ||
    Boolean(fromPrimary);

  if (hasStructured) {
    const phones = fromArray.length > 0 ? fromArray : fromPrimary ? [fromPrimary] : [];
    return {
      customerName: item.customerName?.trim() || '',
      customerAddress: item.customerAddress?.trim() || '',
      customerPhones: phones,
    };
  }

  const legacy = parseLegacyCustomerInfoText(item.customerInfoText);
  if (legacy.customerName || legacy.customerAddress || legacy.customerPhones.length > 0) {
    return legacy;
  }

  const contractPhone = item.contract?.customerPhone?.trim();
  return {
    customerName: item.contract?.customerName?.trim() || '',
    customerAddress: item.contract?.customerAddress?.trim() || '',
    customerPhones: contractPhone ? [contractPhone] : [],
  };
}

export function formatUserLabel(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        email?: string;
      }
    | null
    | undefined
): string {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || '—';
}

export function formatTimeRange(from: string | null, to: string | null): string {
  if (from && to) return `${from}–${to}`;
  if (from) return `с ${from}`;
  if (to) return `до ${to}`;
  return '—';
}

export function formatMoney(
  value: string | number | null | undefined,
  payer?: string | null
): string {
  if (value === null || value === undefined || value === '') {
    return payer ? `— / ${payer}` : '—';
  }
  const num = typeof value === 'number' ? value : Number(value);
  const cost = Number.isFinite(num) ? `${num} ₽` : String(value);
  return payer ? `${cost} / ${payer}` : cost;
}

/** Правка после 08:00 в день задания. */
export function isLateEdit(taskDateIso: string, updatedAt: string, createdAt: string): boolean {
  const datePart = taskDateIso.slice(0, 10);
  const updated = new Date(updatedAt);
  const created = new Date(createdAt);
  if (Number.isNaN(updated.getTime())) return false;
  const cutoff = new Date(`${datePart}T08:00:00`);
  if (Number.isNaN(cutoff.getTime())) return false;
  const editedAfterCreate = updated.getTime() - created.getTime() > 60_000;
  return editedAfterCreate && updated.getTime() > cutoff.getTime();
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
