import { ContractDocumentPackageCustomerSyncService } from './contract-document-package-customer-sync.service';
import {
  buildPackageCustomerBlockFromCustomerRow,
  customerObjectAddressFromRow,
  type CustomerRowForPackageSync,
} from './customer-package-block.util';

function makeCustomer(fields: Partial<CustomerRowForPackageSync> = {}): CustomerRowForPackageSync {
  return {
    id: 'cust_1',
    email: 'rina@example.com',
    phone: '+79990001111',
    phones: ['+79990001111'],
    firstName: 'Рина',
    lastName: null,
    company: null,
    entityType: 'PERSON',
    extendedProfile: {
      lastName: 'Гусева',
      firstName: 'Рина',
      patronymic: 'Витальевна',
      address: 'г. Мурманск ул. Ленина 5',
      objectAddresses: ['Мурманск, Кольский, 13к2-3', 'Мурманск, Пол. Зори 8'],
    },
    ...fields,
  };
}

describe('buildPackageCustomerBlockFromCustomerRow', () => {
  it('физлицо: блок из extendedProfile как при прикреплении карточки', () => {
    const block = buildPackageCustomerBlockFromCustomerRow(makeCustomer());
    expect(block.type).toBe('PERSON');
    expect(block.fullName).toBe('Гусева Рина Витальевна');
    expect(block.address).toBe('г. Мурманск ул. Ленина 5');
    expect(block.email).toBe('rina@example.com');
    expect(block.phone).toBe('+79990001111');
    expect(block.phones).toEqual(['+79990001111']);
  });

  it('организация: название и представитель', () => {
    const block = buildPackageCustomerBlockFromCustomerRow(
      makeCustomer({
        entityType: 'COMPANY',
        company: 'ООО «Строй»',
        extendedProfile: {
          organizationName: '',
          representativeFullNameNominative: 'Гусева Рина Витальевна',
          representativeFullNameGenitive: 'Гусевой Рины Витальевны',
          representativePositionNominative: 'Директор',
        },
      }),
    );
    expect(block.type).toBe('COMPANY');
    expect(block.fullName).toBe('Гусева Рина Витальевна');
    expect(block.organizationName).toBe('ООО «Строй»');
    expect(block.representativeFullNameGenitive).toBe('Гусевой Рины Витальевны');
    expect(block.representativePositionNominative).toBe('Директор');
  });

  it('без телефонов — пустой слот, как normalizePackageCustomerBlock', () => {
    const block = buildPackageCustomerBlockFromCustomerRow(
      makeCustomer({ phone: null, phones: [] }),
    );
    expect(block.phones).toEqual(['']);
    expect(block.phone).toBe('');
  });

  it('адрес объекта — первый из списка', () => {
    expect(customerObjectAddressFromRow(makeCustomer())).toBe('Мурманск, Кольский, 13к2-3');
    expect(customerObjectAddressFromRow(makeCustomer({ extendedProfile: {} }))).toBe('');
  });
});

describe('ContractDocumentPackageCustomerSyncService.syncCustomerInPackages', () => {
  function makeService(packages: Array<{ id: string; status: string; formData: unknown }>) {
    const updates: Array<{ id: string; formData: Record<string, unknown> }> = [];
    const prisma = {
      contractDocumentPackage: {
        findMany: jest.fn(async () => packages),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: { formData: Record<string, unknown> };
          }) => {
            updates.push({ id: where.id, formData: data.formData });
            return { id: where.id };
          },
        ),
      },
    };
    return { service: new ContractDocumentPackageCustomerSyncService(prisma as never), updates };
  }

  const LINKED = { _linkedCrmCustomerId: 'cust_1' };

  it('обновляет блок заказчика и адрес объекта в привязанном неподписанном пакете', async () => {
    const { service, updates } = makeService([
      {
        id: 'pkg_1',
        status: 'IN_PROGRESS',
        formData: {
          ...LINKED,
          customer: { type: 'PERSON', fullName: 'Рина', phones: ['+79990001111'] },
          object: { objectAddress: 'Старый адрес' },
        },
      },
    ]);

    const updated = await service.syncCustomerInPackages(makeCustomer());

    expect(updated).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].formData.customer).toMatchObject({ fullName: 'Гусева Рина Витальевна' });
    expect(updates[0].formData.object).toMatchObject({
      objectAddress: 'Мурманск, Кольский, 13к2-3',
    });
  });

  it('не трогает подписанные и отказные пакеты и пакеты других заказчиков', async () => {
    const { service, updates } = makeService([
      {
        id: 'pkg_signed',
        status: 'CONTRACT_CONCLUDED',
        formData: { ...LINKED, customer: { fullName: 'Рина' } },
      },
      {
        id: 'pkg_refused',
        status: 'REFUSED',
        formData: { ...LINKED, customer: { fullName: 'Рина' } },
      },
      {
        id: 'pkg_other',
        status: 'IN_PROGRESS',
        formData: { _linkedCrmCustomerId: 'cust_2', customer: { fullName: 'Иванов' } },
      },
    ]);

    const updated = await service.syncCustomerInPackages(makeCustomer());

    expect(updated).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('не пишет пакет без изменений и не затирает адрес пустым списком из карточки', async () => {
    const customer = makeCustomer({
      extendedProfile: { lastName: 'Гусева', firstName: 'Рина', patronymic: 'Витальевна' },
    });
    const freshBlock = buildPackageCustomerBlockFromCustomerRow(customer);
    const { service, updates } = makeService([
      {
        id: 'pkg_1',
        status: 'IN_PROGRESS',
        formData: {
          ...LINKED,
          customer: freshBlock,
          object: { objectAddress: 'Адрес введён вручную' },
        },
      },
    ]);

    const updated = await service.syncCustomerInPackages(customer);

    expect(updated).toBe(0);
    expect(updates).toHaveLength(0);
  });
});
