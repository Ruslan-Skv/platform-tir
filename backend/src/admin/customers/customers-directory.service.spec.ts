import { CustomersDirectoryService } from './customers-directory.service';

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  entityType: string | null;
  email: string | null;
  phone: string | null;
  phones: string[];
  status: string | null;
  stage: string | null;
  extendedProfile: unknown;
  createdAt: Date;
  updatedAt: Date;
  manager: unknown;
  createdBy: unknown;
};

function makeCustomer(i: number): CustomerRow {
  return {
    id: `c${i}`,
    firstName: `Имя${i}`,
    lastName: `Фамилия${i}`,
    company: null,
    entityType: 'PERSON',
    email: null,
    phone: `+7999000000${String(i).padStart(2, '0')}`,
    phones: [],
    status: 'LEAD',
    stage: 'NEW',
    extendedProfile: {},
    createdAt: new Date(2026, 0, i + 1),
    updatedAt: new Date(),
    manager: null,
    createdBy: null,
  };
}

function makeService(customers: CustomerRow[]) {
  const prisma = {
    customer: {
      findMany: jest.fn().mockResolvedValue(customers),
    },
    contract: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    measurement: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const contractsService = {
    getCustomersFromContracts: jest.fn().mockResolvedValue({ customers: [] }),
  };
  const service = new CustomersDirectoryService(prisma as never, contractsService as never);
  return { service, prisma };
}

describe('CustomersDirectoryService pagination', () => {
  it('при limit=20 и 29 карточках возвращает 20 строк и total=29', async () => {
    const customers = Array.from({ length: 29 }, (_, i) => makeCustomer(i));
    const { service } = makeService(customers);

    const res = await service.findClientDirectory({ page: 1, limit: 20 });

    expect(res.data).toHaveLength(20);
    expect(res.total).toBe(29);
    expect(res.totalPages).toBe(2);
    expect(res.limit).toBe(20);
  });

  it('вторая страница возвращает оставшиеся 9 строк', async () => {
    const customers = Array.from({ length: 29 }, (_, i) => makeCustomer(i));
    const { service } = makeService(customers);

    const res = await service.findClientDirectory({ page: 2, limit: 20 });

    expect(res.data).toHaveLength(9);
    expect(res.total).toBe(29);
  });

  it('строки contract_only тоже учитываются в пагинации', async () => {
    const customers = Array.from({ length: 15 }, (_, i) => makeCustomer(i));
    const prisma = {
      customer: { findMany: jest.fn().mockResolvedValue(customers) },
      contract: { findMany: jest.fn().mockResolvedValue([]) },
      measurement: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const contractsService = {
      getCustomersFromContracts: jest.fn().mockResolvedValue({
        customers: Array.from({ length: 20 }, (_, i) => ({
          customerId: null,
          customerName: `Договор ${i}`,
          customerPhone: '+79990001122',
          contractCount: 1,
          totalAmount: 0,
        })),
      }),
    };
    const service = new CustomersDirectoryService(prisma as never, contractsService as never);

    const res = await service.findClientDirectory({ page: 1, limit: 20 });

    // 15 карточек + 20 строк без карточки = 35; на первой странице должно быть 20
    expect(res.total).toBe(35);
    expect(res.data).toHaveLength(20);
  });
});
