import { digitsOnly } from './customer-duplicates.util';
import { resolvePersonDisplayName } from './customer-display.util';

/** Атрибуция замеров/договоров без явной карточки (customerId = null):
 *  матчинг по нормализованному телефону, затем по точному ФИО (если владелец однозначен). */

export interface AttributableCustomerRow {
  id: string;
}

export function buildCustomerPhoneIndex(
  customers: Array<{ id: string; phone: string | null; phones: string[] }>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const c of customers) {
    const all = [...(c.phones ?? []), ...(c.phone ? [c.phone] : [])];
    for (const p of all) {
      const d = digitsOnly(p);
      if (d && !index.has(d)) index.set(d, c.id);
    }
  }
  return index;
}

export function buildCustomerDisplayNameIndex(
  customers: Array<{ id: string; displayName: string }>,
): Map<string, string> {
  // Имя → id, только если имя уникально среди карточек (иначе атрибуция неоднозначна).
  const counts = new Map<string, string[]>();
  for (const c of customers) {
    const key = c.displayName.trim().toLowerCase();
    if (!key) continue;
    const list = counts.get(key) ?? [];
    list.push(c.id);
    counts.set(key, list);
  }
  const index = new Map<string, string>();
  for (const [key, ids] of counts) {
    if (ids.length === 1) index.set(key, ids[0]);
  }
  return index;
}

export function attributeUnlinkedDoc(
  doc: { customerName?: string | null; customerPhone?: string | null },
  phoneIndex: Map<string, string>,
  displayNameIndex: Map<string, string>,
): string | null {
  const phoneDigits = digitsOnly(doc.customerPhone ?? '');
  if (phoneDigits) {
    const byPhone = phoneIndex.get(phoneDigits);
    if (byPhone) return byPhone;
  }
  const name = (doc.customerName ?? '').trim().toLowerCase();
  if (name) return displayNameIndex.get(name) ?? null;
  return null;
}

type MinimalPrisma = {
  measurement: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        receptionDate: Date;
        status: string;
        customerName: string;
        customerPhone?: string | null;
      }>
    >;
  };
};

/** Список замеров карточки: явно привязанные (customerId) плюс непривязанные,
 *  сматченные по телефону или полному ФИО; отсортированные по дате по убыванию. */
export async function collectCustomerDocLists(
  prisma: MinimalPrisma,
  customer: {
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;
    entityType: string | null;
    phone: string | null;
    phones: string[];
    extendedProfile: unknown;
  },
  linked: {
    measurements: Array<{
      id: string;
      receptionDate: Date;
      status: string;
      customerName: string;
    }>;
  },
): Promise<{
  measurements: Array<{
    id: string;
    receptionDate: Date;
    status: string;
    customerName: string;
  }>;
}> {
  const phoneIndex = buildCustomerPhoneIndex([
    { id: customer.id, phone: customer.phone, phones: customer.phones },
  ]);
  const displayNameIndex = buildCustomerDisplayNameIndex([
    {
      id: customer.id,
      displayName: resolvePersonDisplayName(customer),
    },
  ]);
  const belongsToCustomer = (doc: {
    customerName?: string | null;
    customerPhone?: string | null;
  }) => attributeUnlinkedDoc(doc, phoneIndex, displayNameIndex) === customer.id;

  const unlinkedMeasurements = await prisma.measurement.findMany({
    where: { customerId: null },
    select: {
      id: true,
      receptionDate: true,
      status: true,
      customerName: true,
      customerPhone: true,
    },
    orderBy: { receptionDate: 'desc' },
  });

  const measurements = [
    ...linked.measurements,
    ...unlinkedMeasurements.filter(belongsToCustomer),
  ].sort((a, b) => b.receptionDate.getTime() - a.receptionDate.getTime());

  return { measurements };
}
