/** Договоры-пакеты (ContractDocumentPackage), привязанные к карточке клиента:
 *  фронтенд пишет id карточки в formData._linkedCrmCustomerId при сохранении пакета. */

export interface CustomerLinkedPackageInfo {
  id: string;
  kind: string;
  status: string;
  contractNumber: string | null;
  contractDate: Date | null;
  totalAmount: number | null;
  /** Сумма платежей по пакету (ПКО/оплаты). */
  paidAmount: number;
  /** Остаток к оплате: стоимость − оплачено (null, если стоимость неизвестна). */
  remainingAmount: number | null;
}

export function parseLinkedCrmCustomerId(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const v = (formData as Record<string, unknown>)._linkedCrmCustomerId;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function parsePackageContractNumber(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const fd = formData as Record<string, unknown>;
  const contract =
    fd.contract && typeof fd.contract === 'object'
      ? (fd.contract as Record<string, unknown>)
      : null;
  const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
  if (num) return num;
  const furniture = fd.furniture;
  if (furniture && typeof furniture === 'object') {
    const parts: string[] = [];
    for (const key of ['manufacture', 'montage', 'appliances'] as const) {
      const leg = (furniture as Record<string, unknown>)[key];
      if (!leg || typeof leg !== 'object') continue;
      if (key !== 'manufacture' && (leg as { enabled?: unknown }).enabled !== true) continue;
      const legContract = (leg as { contract?: unknown }).contract;
      if (!legContract || typeof legContract !== 'object') continue;
      const legNum = (legContract as { number?: unknown }).number;
      if (typeof legNum === 'string' && legNum.trim()) parts.push(legNum.trim());
    }
    if (parts.length > 0) return parts.join(' / ');
  }
  return null;
}

/** Сумма договора: formData.contract.totalAmount — строка вида «17474,00» (уже со скидкой). */
export function parsePackageContractTotal(formData: unknown): number | null {
  if (!formData || typeof formData !== 'object') return null;
  const fd = formData as Record<string, unknown>;
  const contract =
    fd.contract && typeof fd.contract === 'object'
      ? (fd.contract as Record<string, unknown>)
      : null;
  const raw = contract?.totalAmount;
  if (raw == null) return null;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePackageContractDate(formData: unknown): Date | null {
  if (!formData || typeof formData !== 'object') return null;
  const iso = String((formData as Record<string, unknown>).contractConcludedAt ?? '').trim();
  if (!iso) return null;
  const d = /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? new Date(`${iso.slice(0, 10)}T12:00:00`)
    : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

type LinkedPackageRow = {
  id: string;
  kind: string;
  status: string;
  formData: unknown;
  createdAt: Date;
  payments?: Array<{ amount: unknown }> | null;
};

type PackagesPrisma = {
  contractDocumentPackage: {
    // args typed as unknown: реальные Prisma-перегрузки (select/include) структурно не совместимы.
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

/** Пакеты по клиентам: атрибуция по formData._linkedCrmCustomerId. */
export async function findPackagesLinkedToCustomers(
  prisma: PackagesPrisma,
  customerIds: string[],
): Promise<Map<string, CustomerLinkedPackageInfo[]>> {
  const result = new Map<string, CustomerLinkedPackageInfo[]>();
  if (customerIds.length === 0) return result;

  const packages = (await prisma.contractDocumentPackage.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      kind: true,
      status: true,
      formData: true,
      createdAt: true,
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: 'desc' },
  })) as LinkedPackageRow[];

  const idSet = new Set(customerIds);
  for (const pkg of packages) {
    const ownerId = parseLinkedCrmCustomerId(pkg.formData);
    if (!ownerId || !idSet.has(ownerId)) continue;
    const totalAmount = parsePackageContractTotal(pkg.formData);
    const paidAmount = (pkg.payments ?? []).reduce((sum, p) => {
      const n = Number(p.amount);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    const info: CustomerLinkedPackageInfo = {
      id: pkg.id,
      kind: pkg.kind,
      status: pkg.status,
      contractNumber: parsePackageContractNumber(pkg.formData),
      contractDate:
        parsePackageContractDate(pkg.formData) ??
        (parsePackageContractNumber(pkg.formData) ? pkg.createdAt : null),
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount != null ? Math.max(0, totalAmount - paidAmount) : null,
    };
    const list = result.get(ownerId) ?? [];
    list.push(info);
    result.set(ownerId, list);
  }
  return result;
}

export interface DisplayContractEntry {
  id: string;
  contractNumber: string;
  contractDate: Date;
  totalAmount: number | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  documentPackageId: string | null;
}

/** Итоговый список договоров клиента для карточки: пакеты документов из раздела «Договора». */
export function buildDisplayContractList(
  packages: CustomerLinkedPackageInfo[],
): DisplayContractEntry[] {
  return packages
    .map((p) => ({
      id: p.id,
      contractNumber: p.contractNumber ?? '—',
      contractDate: p.contractDate ?? new Date(0),
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      remainingAmount: p.remainingAmount,
      documentPackageId: p.id,
    }))
    .sort((a, b) => b.contractDate.getTime() - a.contractDate.getTime());
}
