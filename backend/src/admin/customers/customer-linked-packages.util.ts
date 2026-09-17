/** Договоры-пакеты (ContractDocumentPackage), привязанные к карточке клиента.
 *  Фронтенд пишет id карточки в formData._linkedCrmCustomerId при сохранении пакета;
 *  часть пакетов связана через crmContractId → Contract.customerId. */

export interface CustomerLinkedPackageInfo {
  id: string;
  kind: string;
  status: string;
  crmContractId: string | null;
  contractNumber: string | null;
  contractDate: Date | null;
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

export function parsePackageContractDate(formData: unknown): Date | null {
  if (!formData || typeof formData !== 'object') return null;
  const iso = String((formData as Record<string, unknown>).contractConcludedAt ?? '').trim();
  if (!iso) return null;
  const d = /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? new Date(`${iso.slice(0, 10)}T12:00:00`)
    : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

type PackagesPrisma = {
  contractDocumentPackage: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        kind: string;
        status: string;
        crmContractId: string | null;
        formData: unknown;
        createdAt: Date;
      }>
    >;
  };
};

/** Пакеты по клиентам: атрибуция по formData._linkedCrmCustomerId, плюс по crmContractId
 *  (если передан контрактный индекс contractOwnerIdById). */
export async function findPackagesLinkedToCustomers(
  prisma: PackagesPrisma,
  customerIds: string[],
  contractOwnerIdById?: Map<string, string>,
): Promise<Map<string, CustomerLinkedPackageInfo[]>> {
  const result = new Map<string, CustomerLinkedPackageInfo[]>();
  if (customerIds.length === 0) return result;

  const packages = await prisma.contractDocumentPackage.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      kind: true,
      status: true,
      crmContractId: true,
      formData: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const idSet = new Set(customerIds);
  for (const pkg of packages) {
    let ownerId = parseLinkedCrmCustomerId(pkg.formData);
    if (!ownerId && pkg.crmContractId && contractOwnerIdById) {
      ownerId = contractOwnerIdById.get(pkg.crmContractId) ?? null;
    }
    if (!ownerId || !idSet.has(ownerId)) continue;
    const info: CustomerLinkedPackageInfo = {
      id: pkg.id,
      kind: pkg.kind,
      status: pkg.status,
      crmContractId: pkg.crmContractId,
      contractNumber: parsePackageContractNumber(pkg.formData),
      contractDate:
        parsePackageContractDate(pkg.formData) ??
        (parsePackageContractNumber(pkg.formData) ? pkg.createdAt : null),
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
  documentPackageId: string | null;
}

/** Итоговый список договоров клиента для карточки: CRM-Contract'ы (привязанные и
 *  сматченные по телефону/ФИО) + пакеты документов, не покрытые CRM-Contract'ом. */
export function buildDisplayContractList(
  customerId: string,
  crmContracts: Array<{
    id: string;
    contractNumber: string;
    contractDate: Date;
    totalAmount: unknown;
  }>,
  packageByContract: Map<string, string>,
  packagesByCustomer: Map<string, CustomerLinkedPackageInfo[]>,
): DisplayContractEntry[] {
  const attributedContractIdSet = new Set(crmContracts.map((c) => c.id));
  const fromCrm = crmContracts.map((c) => ({
    id: c.id,
    contractNumber: c.contractNumber,
    contractDate: c.contractDate,
    totalAmount: Number(c.totalAmount),
    documentPackageId: packageByContract.get(c.id) ?? null,
  }));
  const fromPackages = (packagesByCustomer.get(customerId) ?? [])
    .filter((p) => !p.crmContractId || !attributedContractIdSet.has(p.crmContractId))
    .map((p) => ({
      id: p.id,
      contractNumber: p.contractNumber ?? '—',
      contractDate: p.contractDate ?? new Date(0),
      totalAmount: null,
      documentPackageId: p.id,
    }));
  return [...fromCrm, ...fromPackages].sort(
    (a, b) => b.contractDate.getTime() - a.contractDate.getTime(),
  );
}
