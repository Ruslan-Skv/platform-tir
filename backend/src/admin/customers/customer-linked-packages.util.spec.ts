import {
  findPackagesLinkedToCustomers,
  parsePackageContractTotal,
  parseLinkedCrmCustomerId,
  parsePackageContractDate,
  parsePackageContractNumber,
} from './customer-linked-packages.util';

function makePrisma(packages: Array<Record<string, unknown>>) {
  return {
    contractDocumentPackage: {
      findMany: jest.fn().mockResolvedValue(packages),
    },
  };
}

describe('customer-linked-packages.util', () => {
  it('парсит id карточки из formData', () => {
    expect(parseLinkedCrmCustomerId({ _linkedCrmCustomerId: ' cm1 ' })).toBe('cm1');
    expect(parseLinkedCrmCustomerId({})).toBeNull();
    expect(parseLinkedCrmCustomerId(null)).toBeNull();
  });

  it('номер договора: contract.number, затем мебельные номера через «/»', () => {
    expect(parsePackageContractNumber({ contract: { number: 'Р-101' } })).toBe('Р-101');
    expect(
      parsePackageContractNumber({
        furniture: {
          manufacture: { contract: { number: 'М-1' } },
          montage: { enabled: true, contract: { number: 'М-2' } },
          appliances: { enabled: false, contract: { number: 'М-3' } },
        },
      }),
    ).toBe('М-1 / М-2');
    expect(parsePackageContractNumber({})).toBeNull();
  });

  it('сумма договора из contract.totalAmount (строка с запятой)', () => {
    expect(parsePackageContractTotal({ contract: { totalAmount: '17474,00' } })).toBe(17474);
    expect(parsePackageContractTotal({ contract: { totalAmount: '17 474,50' } })).toBe(17474.5);
    expect(parsePackageContractTotal({ contract: { totalAmount: '' } })).toBeNull();
    expect(parsePackageContractTotal({})).toBeNull();
  });

  it('дата договора из contractConcludedAt', () => {
    const d = parsePackageContractDate({ contractConcludedAt: '2026-09-01' });
    expect(d?.toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(parsePackageContractDate({})).toBeNull();
  });

  it('атрибуция пакетов по _linkedCrmCustomerId', async () => {
    const prisma = makePrisma([
      {
        id: 'p1',
        kind: 'REPAIR',
        status: 'DRAFT',
        formData: {
          _linkedCrmCustomerId: 'cm1',
          contract: { number: 'Р-1', totalAmount: '17474,00' },
        },
        createdAt: new Date('2026-09-01'),
        payments: [{ amount: 5000 }, { amount: 2474 }],
      },
      {
        id: 'p2',
        kind: 'FURNITURE',
        status: 'DRAFT',
        formData: {},
        createdAt: new Date('2026-09-02'),
        payments: [],
      },
    ]);
    const map = await findPackagesLinkedToCustomers(prisma as never, ['cm1']);
    expect(map.get('cm1')?.map((p) => p.id)).toEqual(['p1']);
    expect(map.get('cm1')?.[0].contractNumber).toBe('Р-1');
    expect(map.get('cm1')?.[0].totalAmount).toBe(17474);
    expect(map.get('cm1')?.[0].paidAmount).toBe(7474);
    expect(map.get('cm1')?.[0].remainingAmount).toBe(10000);
  });
});
