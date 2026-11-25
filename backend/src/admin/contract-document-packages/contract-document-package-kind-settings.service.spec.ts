import { ContractDocumentPackageKind } from '@prisma/client';

import type { PrismaService } from '../../database/prisma.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';

type SupplierRow = {
  id: string;
  legalName: string;
  commercialName: string | null;
  isActive: boolean;
  deletedAt: Date | null;
};

type Where = { deletedAt?: null; id?: { in: string[] }; isActive?: boolean };
type UpsertArgs = { update: { doorsSpecificationSupplierIds: string[] } };

/** Поставщик вне корзины. */
function supplier(
  id: string,
  fields: Pick<SupplierRow, 'legalName'> & Partial<SupplierRow>,
): SupplierRow {
  return { isActive: true, deletedAt: null, commercialName: null, ...fields, id };
}

/** Prisma с in-memory справочником поставщиков: findMany применяет where как база. */
function makePrisma(suppliers: SupplierRow[], storedIds: string[]) {
  const updatedAt = new Date('2026-11-25T10:00:00.000Z');
  const upserts: Array<Record<string, unknown>> = [];
  const findUnique = jest.fn().mockResolvedValue({
    doorsSpecificationSupplierIds: storedIds,
    updatedAt,
  });
  const findMany = jest.fn().mockImplementation(async ({ where }: { where: Where }) => {
    return suppliers
      .filter((s) => s.deletedAt === null)
      .filter((s) => (where.id ? where.id.in.includes(s.id) : true))
      .filter((s) => where.isActive === undefined || s.isActive === where.isActive)
      .map(({ id, legalName, commercialName, isActive }) => ({
        id,
        legalName,
        commercialName,
        isActive,
      }));
  });
  const upsert = jest.fn().mockImplementation(async (args: UpsertArgs) => {
    upserts.push(args);
    return {
      doorsSpecificationSupplierIds: args.update.doorsSpecificationSupplierIds,
      updatedAt,
    };
  });
  const prisma = {
    contractDocumentRepairSettings: { findUnique, upsert },
    supplier: { findMany },
  };
  return {
    prisma: prisma as unknown as PrismaService,
    findMany,
    findUnique,
    upserts,
  };
}

const suppliers: SupplierRow[] = [
  supplier('s_avs', { legalName: 'ООО «АВС»' }),
  supplier('s_bau', { legalName: 'ООО «Стройком»', commercialName: '  Бау-Мастер  ' }),
  supplier('s_yandex', { legalName: 'ООО «Яндекс»' }),
  supplier('s_off', { legalName: 'Яя-выключенный', isActive: false }),
  supplier('s_trash', { legalName: 'ООО «В корзине»', deletedAt: new Date() }),
];

/** Сохранённый список: неактивный, удалённый в корзину и несуществующий id. */
const storedIds = ['s_yandex', 's_bau', 's_off', 's_trash', 's_missing'];

describe('поставщики спецификации «Дверей»', () => {
  describe('listDoorsSpecificationSuppliers', () => {
    it('отдаёт только выбранных, действующих и вне корзины — по названию', async () => {
      const { prisma } = makePrisma(suppliers, storedIds);
      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).listDoorsSpecificationSuppliers();

      expect(result).toEqual({
        data: [
          { id: 's_bau', title: 'Бау-Мастер' },
          { id: 's_yandex', title: 'ООО «Яндекс»' },
        ],
      });
    });

    it('не выбирает лишнего из базы и не отдаёт реквизиты карточки', async () => {
      const { prisma, findMany } = makePrisma(suppliers, storedIds);
      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).listDoorsSpecificationSuppliers();

      expect(findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, id: { in: storedIds }, isActive: true },
        select: { id: true, legalName: true, commercialName: true, isActive: true },
      });
      expect(Object.keys(result.data[0]).sort()).toEqual(['id', 'title']);
    });

    it('без строки настроек — пустой список', async () => {
      const { prisma, findUnique } = makePrisma(suppliers, []);
      findUnique.mockResolvedValue(null);

      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).listDoorsSpecificationSuppliers();

      expect(result).toEqual({ data: [] });
    });
  });

  describe('listDoorsSupplierOptions', () => {
    it('отдаёт весь справочник вне корзины, включая неактивных', async () => {
      const { prisma } = makePrisma(suppliers, []);
      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).listDoorsSupplierOptions();

      expect(result).toEqual({
        data: [
          { id: 's_bau', title: 'Бау-Мастер', legalName: 'ООО «Стройком»', isActive: true },
          { id: 's_avs', title: 'ООО «АВС»', legalName: 'ООО «АВС»', isActive: true },
          { id: 's_yandex', title: 'ООО «Яндекс»', legalName: 'ООО «Яндекс»', isActive: true },
          {
            id: 's_off',
            title: 'Яя-выключенный',
            legalName: 'Яя-выключенный',
            isActive: false,
          },
        ],
      });
    });
  });

  describe('getDoorsSettings', () => {
    it('не показывает id удалённых в корзину и несуществующих поставщиков', async () => {
      const { prisma } = makePrisma(suppliers, storedIds);
      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).getDoorsSettings();

      expect(result).toEqual({
        kind: ContractDocumentPackageKind.DOORS,
        specificationSupplierIds: ['s_yandex', 's_bau', 's_off'],
        updatedAt: '2026-11-25T10:00:00.000Z',
      });
    });

    it('без строки настроек — пустой список', async () => {
      const { prisma, findUnique } = makePrisma(suppliers, []);
      findUnique.mockResolvedValue(null);

      const result = await new ContractDocumentPackageKindSettingsService(
        prisma,
      ).getDoorsSettings();

      expect(result).toEqual({
        kind: ContractDocumentPackageKind.DOORS,
        specificationSupplierIds: [],
        updatedAt: null,
      });
    });
  });

  describe('setDoorsSettings', () => {
    it('сохраняет список без повторов и без id поставщиков из корзины', async () => {
      const { prisma } = makePrisma(suppliers, []);
      const result = await new ContractDocumentPackageKindSettingsService(prisma).setDoorsSettings(
        { specificationSupplierIds: ['s_yandex', 's_trash', 's_bau', 's_yandex', 's_missing'] },
        'user_1',
      );

      expect(result).toEqual({
        kind: ContractDocumentPackageKind.DOORS,
        specificationSupplierIds: ['s_yandex', 's_bau'],
        updatedAt: '2026-11-25T10:00:00.000Z',
      });
    });

    it('меняет только список поставщиков, не трогая остальные настройки направления', async () => {
      const { prisma, upserts } = makePrisma(suppliers, []);
      await new ContractDocumentPackageKindSettingsService(prisma).setDoorsSettings(
        { specificationSupplierIds: ['s_off'] },
        'user_1',
      );

      expect(upserts).toEqual([
        {
          where: { kind: ContractDocumentPackageKind.DOORS },
          create: {
            kind: ContractDocumentPackageKind.DOORS,
            defaultWorkPeriodDays: 90,
            doorsSpecificationSupplierIds: ['s_off'],
            updatedById: 'user_1',
          },
          update: { doorsSpecificationSupplierIds: ['s_off'], updatedById: 'user_1' },
          select: { doorsSpecificationSupplierIds: true, updatedAt: true },
        },
      ]);
    });

    it('пустой список сохраняется как пустой', async () => {
      const { prisma } = makePrisma(suppliers, ['s_yandex']);
      const result = await new ContractDocumentPackageKindSettingsService(prisma).setDoorsSettings({
        specificationSupplierIds: [],
      });

      expect(result.specificationSupplierIds).toEqual([]);
    });
  });
});
