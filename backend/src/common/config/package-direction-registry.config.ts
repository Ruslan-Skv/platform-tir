import { ContractDocumentPackageKind } from '@prisma/client';

/** Определение направления: единый источник для CRM-справочника и пакетов договоров. */
export type PackageDirectionDefinition = {
  kind: ContractDocumentPackageKind;
  slug: string;
  name: string;
  numberLetter: string;
  sortOrder: number;
  createEnabled: boolean;
};

/** Порядок и подписи совпадают с frontend packageDirectionRegistry. */
export const PACKAGE_DIRECTION_REGISTRY: readonly PackageDirectionDefinition[] = [
  {
    kind: ContractDocumentPackageKind.REPAIR,
    slug: 'repair',
    name: 'Ремонт',
    numberLetter: 'р',
    sortOrder: 1,
    createEnabled: true,
  },
  {
    kind: ContractDocumentPackageKind.WINDOWS,
    slug: 'windows',
    name: 'Окна',
    numberLetter: 'о',
    sortOrder: 2,
    createEnabled: true,
  },
  {
    kind: ContractDocumentPackageKind.DOORS,
    slug: 'doors',
    name: 'Двери',
    numberLetter: 'д',
    sortOrder: 3,
    createEnabled: true,
  },
  {
    kind: ContractDocumentPackageKind.CEILINGS,
    slug: 'stretch-ceilings',
    name: 'Потолки',
    numberLetter: 'п',
    sortOrder: 4,
    createEnabled: true,
  },
  {
    kind: ContractDocumentPackageKind.BLINDS,
    slug: 'blinds',
    name: 'Жалюзи',
    numberLetter: 'ж',
    sortOrder: 5,
    createEnabled: true,
  },
  {
    kind: ContractDocumentPackageKind.FURNITURE,
    slug: 'furniture',
    name: 'Мебель',
    numberLetter: 'м',
    sortOrder: 6,
    createEnabled: false,
  },
] as const;

export const PACKAGE_KIND_DIRECTION_SLUG: Record<ContractDocumentPackageKind, string> =
  Object.fromEntries(PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.slug])) as Record<
    ContractDocumentPackageKind,
    string
  >;

export function packageDirectionsWithCreateEnabled(): PackageDirectionDefinition[] {
  return PACKAGE_DIRECTION_REGISTRY.filter((d) => d.createEnabled);
}

export function packageDirectionSlugsWithCreateEnabled(): string[] {
  return packageDirectionsWithCreateEnabled().map((d) => d.slug);
}
