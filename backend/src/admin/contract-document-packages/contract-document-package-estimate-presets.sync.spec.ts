import { ContractDocumentPackageKind } from '@prisma/client';

import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';

type BlobRow = {
  kind: ContractDocumentPackageKind;
  html: string | null;
  updatedAt: Date;
};

type PresetItem = {
  id: string;
  title: string;
  crmCustomerId?: string;
  customerName?: string;
};

describe('ContractDocumentPackageEstimatePresetsService.syncCustomerNameInEstimatePresets', () => {
  function makeService(
    rows: BlobRow[],
    upserts: Array<{ kind: ContractDocumentPackageKind; html: string }>,
  ) {
    const prisma = {
      contractDocumentGlobalTemplate: {
        findUnique: jest.fn(
          async ({ where }: { where: { kind_tab: { kind: ContractDocumentPackageKind } } }) =>
            rows.find((r) => r.kind === where.kind_tab.kind) ?? null,
        ),
        upsert: jest.fn(
          async ({ create }: { create: { kind: ContractDocumentPackageKind; html: string } }) => {
            upserts.push({ kind: create.kind, html: create.html });
            return { id: 'row_' + create.kind };
          },
        ),
      },
    };
    return new ContractDocumentPackageEstimatePresetsService(prisma as never);
  }

  function blob(items: PresetItem[]): string {
    return JSON.stringify({ items, groups: [] });
  }

  const CUSTOMER = 'cust_1';

  function baseRows(): BlobRow[] {
    return [
      {
        kind: ContractDocumentPackageKind.REPAIR,
        html: blob([
          {
            id: 'est_1',
            title: 'Свежий',
            crmCustomerId: CUSTOMER,
            customerName: 'Гусева Рина Витальевна',
          },
          { id: 'est_2', title: 'Старый', crmCustomerId: CUSTOMER, customerName: 'Рина' },
          {
            id: 'est_3',
            title: 'Другой заказчик',
            crmCustomerId: 'cust_2',
            customerName: 'Иванов',
          },
          { id: 'est_4', title: 'Без карточки', customerName: 'Рина' },
        ]),
        updatedAt: new Date(),
      },
      {
        kind: ContractDocumentPackageKind.WINDOWS,
        html: blob([{ id: 'w_1', title: 'Окна', crmCustomerId: CUSTOMER, customerName: 'Рина' }]),
        updatedAt: new Date(),
      },
    ];
  }

  it('обновляет имя только в пресетах этой карточки и сохраняет изменённые блобы', async () => {
    const upserts: Array<{ kind: ContractDocumentPackageKind; html: string }> = [];
    const service = makeService(baseRows(), upserts);

    const updated = await service.syncCustomerNameInEstimatePresets(
      CUSTOMER,
      'Гусева Рина Витальевна',
    );

    expect(updated).toBe(2); // est_2 (REPAIR) + w_1 (WINDOWS)
    expect(upserts).toHaveLength(2);

    const repair = JSON.parse(upserts.find((u) => u.kind === 'REPAIR')!.html);
    expect(repair.items.find((i: PresetItem) => i.id === 'est_1').customerName).toBe(
      'Гусева Рина Витальевна',
    );
    expect(repair.items.find((i: PresetItem) => i.id === 'est_2').customerName).toBe(
      'Гусева Рина Витальевна',
    );
    expect(repair.items.find((i: PresetItem) => i.id === 'est_3').customerName).toBe('Иванов');
    expect(repair.items.find((i: PresetItem) => i.id === 'est_4').customerName).toBe('Рина');

    const windows = JSON.parse(upserts.find((u) => u.kind === 'WINDOWS')!.html);
    expect(windows.items[0].customerName).toBe('Гусева Рина Витальевна');
  });

  it('не пишет блоб, когда изменений нет', async () => {
    const upserts: Array<{ kind: ContractDocumentPackageKind; html: string }> = [];
    const syncedRows: BlobRow[] = [
      {
        kind: ContractDocumentPackageKind.REPAIR,
        html: blob([
          {
            id: 'est_1',
            title: 'Свежий',
            crmCustomerId: CUSTOMER,
            customerName: 'Гусева Рина Витальевна',
          },
          {
            id: 'est_2',
            title: 'Тоже свежий',
            crmCustomerId: CUSTOMER,
            customerName: 'Гусева Рина Витальевна',
          },
        ]),
        updatedAt: new Date(),
      },
    ];
    const service = makeService(syncedRows, upserts);

    const updated = await service.syncCustomerNameInEstimatePresets(
      CUSTOMER,
      'Гусева Рина Витальевна',
    );

    // Все пресеты карточки уже носят это имя — ничего не сохраняется.
    expect(updated).toBe(0);
    expect(upserts).toHaveLength(0);
  });

  it('пустое имя или пустой id — нет обращений к базе', async () => {
    const upserts: Array<{ kind: ContractDocumentPackageKind; html: string }> = [];
    const service = makeService(baseRows(), upserts);

    expect(await service.syncCustomerNameInEstimatePresets(CUSTOMER, '  ')).toBe(0);
    expect(await service.syncCustomerNameInEstimatePresets('  ', 'Имя')).toBe(0);
    expect(upserts).toHaveLength(0);
  });
});

describe('resolveCustomerDisplayName (снимок имени как на фронте)', () => {
  const { resolveCustomerDisplayName } = jest.requireActual('../customers/customer-display.util');

  it('физлицо: ФИО из extendedProfile', () => {
    expect(
      resolveCustomerDisplayName({
        firstName: 'Рина',
        lastName: null,
        entityType: 'PERSON',
        extendedProfile: { lastName: 'Гусева', firstName: 'Рина', patronymic: 'Витальевна' },
      }),
    ).toBe('Гусева Рина Витальевна');
  });

  it('физлицо без профиля: имя из колонок', () => {
    expect(
      resolveCustomerDisplayName({
        firstName: 'Рина',
        lastName: 'Гусева',
        entityType: null,
        extendedProfile: {},
      }),
    ).toBe('Гусева Рина');
  });

  it('организация: company, затем organizationName', () => {
    expect(
      resolveCustomerDisplayName({
        firstName: 'Иван',
        lastName: null,
        company: 'ООО «Строй»',
        entityType: 'COMPANY',
        extendedProfile: {},
      }),
    ).toBe('ООО «Строй»');
  });
});
