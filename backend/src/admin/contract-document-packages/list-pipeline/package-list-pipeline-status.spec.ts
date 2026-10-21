import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

import {
  computePackageEffectiveManagerUserId,
  computePackageListPipelineStatus,
  computePackagePaidPercent,
  packageMatchesDateRange,
  packageMatchesListSearch,
} from './package-list-pipeline-status';

describe('computePackageListPipelineStatus', () => {
  it('returns REFUSED for DB status or client refused flag', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.REFUSED,
        formData: {},
        payments: [],
      }),
    ).toBe('REFUSED');

    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.IN_PROGRESS,
        formData: { repairContractClientRefused: true },
        payments: [],
      }),
    ).toBe('REFUSED');
  });

  it('returns IN_PROJECT for unsigned repair package', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.IN_PROGRESS,
        formData: {
          contract: { totalAmount: '100000' },
        },
        payments: [],
      }),
    ).toBe('IN_PROJECT');
  });

  it('returns SIGNED for concluded package without work start', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000' },
          contractConcludedAt: '2026-01-10T12:00:00.000Z',
        },
        payments: [{ amount: '10000', paymentType: 'PREPAYMENT', paymentDate: '2026-01-11' }],
      }),
    ).toBe('SIGNED');
  });

  it('returns WORK_IN_PROGRESS when ≥70% paid and work-start act present', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000' },
          repairWorkStartActSignedAt: '2026-02-01',
          repairWorkStartActPhotoUrl: '/uploads/act.jpg',
        },
        payments: [{ amount: '70000', paymentType: 'PREPAYMENT', paymentDate: '2026-01-20' }],
      }),
    ).toBe('WORK_IN_PROGRESS');
  });

  it('returns CLOSED when fully paid and close act present', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000' },
          repairWorkStartActSignedAt: '2026-02-01',
          repairWorkStartActPhotoUrl: '/uploads/act.jpg',
          repairContractCloseActSignedAt: '2026-03-01',
          repairContractCloseActPhotoUrl: '/uploads/close.jpg',
        },
        payments: [{ amount: '100000', paymentType: 'FINAL', paymentDate: '2026-02-15' }],
      }),
    ).toBe('CLOSED');
  });

  it('keeps windows SIGNED after 70% prepayment — «В работе» только у «Ремонта»', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.WINDOWS,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          estimate: { snapshot: { total: 100000 } },
          contract: { discountPercent: '' },
          productSpecificationAmount: '0',
        },
        payments: [{ amount: '70000', paymentType: 'PREPAYMENT', paymentDate: '2026-01-20' }],
      }),
    ).toBe('SIGNED');
  });

  it('simplifies furniture to SIGNED/IN_PROJECT', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.FURNITURE,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {},
        payments: [],
      }),
    ).toBe('SIGNED');
  });

  it('closes fully paid contract when one final payment covers the addendum too (spillover)', () => {
    const formData = {
      contract: { totalAmount: '100000' },
      addendumSlotCount: 1,
      addendumSlots: [{ snapshot: { total: 20000 } }],
      repairContractCloseActSignedAt: '2026-10-15',
      repairContractCloseActPhotoUrl: '/uploads/close.jpg',
    };
    // Окончательный расчёт одной суммой 120 000: 100 000 закрывают договор,
    // остаток 20 000 переливается на Д/с №1 — договор закрыт.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData,
        payments: [{ amount: '120000', paymentType: 'FINAL', paymentDate: '2026-10-14' }],
      }),
    ).toBe('CLOSED');

    // Недостаточная сумма: перелив 10 000 не покрывает Д/с 20 000 — не закрыт.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData,
        payments: [{ amount: '110000', paymentType: 'FINAL', paymentDate: '2026-10-14' }],
      }),
    ).toBe('SIGNED');
  });

  it('closes with dedicated AMENDMENT payments as before', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000' },
          addendumSlotCount: 1,
          addendumSlots: [{ snapshot: { total: 20000 } }],
          repairContractCloseActSignedAt: '2026-10-15',
          repairContractCloseActPhotoUrl: '/uploads/close.jpg',
        },
        payments: [
          { amount: '100000', paymentType: 'FINAL', paymentDate: '2026-10-14' },
          {
            amount: '20000',
            paymentType: 'AMENDMENT',
            addendumNumber: 1,
            paymentDate: '2026-10-14',
          },
        ],
      }),
    ).toBe('CLOSED');
  });

  it('applies addendum own discount instead of contract discount (ремонт)', () => {
    // Д/с №1 со своей скидкой 50% (замещает договоровую 10%): платить 10 000 из 20 000.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000', discountPercent: '10' },
          addendumSlotCount: 1,
          addendumSlots: [
            { snapshot: { total: 20000 }, discountType: 'PERCENT', discountPercent: '50' },
          ],
          repairContractCloseActSignedAt: '2026-10-15',
          repairContractCloseActPhotoUrl: '/uploads/close.jpg',
        },
        payments: [
          { amount: '100000', paymentType: 'FINAL', paymentDate: '2026-10-14' },
          {
            amount: '10000',
            paymentType: 'AMENDMENT',
            addendumNumber: 1,
            paymentDate: '2026-10-14',
          },
        ],
      }),
    ).toBe('CLOSED');

    // Рублёвая скидка Д/с: 5 000 от 20 000 → 25% → платить 15 000.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          contract: { totalAmount: '100000' },
          addendumSlotCount: 1,
          addendumSlots: [
            { snapshot: { total: 20000 }, discountType: 'AMOUNT', discountAmount: '5000' },
          ],
          repairContractCloseActSignedAt: '2026-10-15',
          repairContractCloseActPhotoUrl: '/uploads/close.jpg',
        },
        payments: [
          { amount: '100000', paymentType: 'FINAL', paymentDate: '2026-10-14' },
          {
            amount: '15000',
            paymentType: 'AMENDMENT',
            addendumNumber: 1,
            paymentDate: '2026-10-14',
          },
        ],
      }),
    ).toBe('CLOSED');
  });

  it('reduces payable by negative addendum (уменьшение договора)', () => {
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.WINDOWS,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          estimate: { snapshot: { total: 100000 } },
          contract: { discountPercent: '' },
          addendumSlotCount: 1,
          addendumSlots: [{ snapshot: { total: -5000 } }],
          repairContractCloseActSignedAt: '2026-10-15',
          repairContractCloseActPhotoUrl: '/uploads/close.jpg',
        },
        // Отрицательное Д/с (исключено больше, чем добавлено) уменьшило сумму до 95 000.
        payments: [{ amount: '95000', paymentType: 'FINAL', paymentDate: '2026-10-14' }],
      }),
    ).toBe('CLOSED');
  });

  it('closes fully paid ceilings contract when goodsNoMarkup keeps «Товар» out of extra markup', () => {
    const ceilingsSpecification = {
      extraMarkupPercent: '70',
      discountPercent: '',
      goodsNoMarkup: true,
      ceilings: [
        {
          fabrics: [{ qtyM2: '10', unitPrice: '100' }],
          goods: [{ qty: '2', unitPrice: '500' }],
          tapes: [],
          profiles: [],
          extras: [],
        },
      ],
    };
    const formData = {
      estimate: { snapshot: { total: 500 } },
      contract: { discountPercent: '' },
      ceilingsSpecification,
      repairContractCloseActSignedAt: '2026-10-15',
      repairContractCloseActPhotoUrl: '/uploads/close.jpg',
    };
    // Итог как в карточке договора: работы 500 + ткани 1000×1.7 + товар 1000 без наценки = 3200.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.CEILINGS,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData,
        payments: [{ amount: '3200', paymentType: 'FINAL', paymentDate: '2026-10-10' }],
      }),
    ).toBe('CLOSED');

    // Без флага товар наценяется: payable 3900, оплата 3200 — договор не закрыт.
    expect(
      computePackageListPipelineStatus({
        kind: ContractDocumentPackageKind.CEILINGS,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        formData: {
          ...formData,
          ceilingsSpecification: { ...ceilingsSpecification, goodsNoMarkup: false },
        },
        payments: [{ amount: '3200', paymentType: 'FINAL', paymentDate: '2026-10-10' }],
      }),
    ).toBe('SIGNED');
  });
});

describe('computePackagePaidPercent', () => {
  const base = {
    kind: ContractDocumentPackageKind.REPAIR,
    status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED as ContractDocumentPackageStatus,
  };

  it('counts payments share of payable total, refunds subtracted', () => {
    expect(
      computePackagePaidPercent({
        ...base,
        formData: { contract: { totalAmount: '100000' } },
        payments: [{ amount: '25000', paymentType: 'PREPAYMENT' }],
      }),
    ).toBe(25);

    expect(
      computePackagePaidPercent({
        ...base,
        formData: { contract: { totalAmount: '100000' } },
        payments: [
          { amount: '50000', paymentType: 'PREPAYMENT' },
          { amount: '10000', paymentType: 'REFUND' },
        ],
      }),
    ).toBe(40);
  });

  it('includes addendum payments and addendum totals in the share', () => {
    expect(
      computePackagePaidPercent({
        ...base,
        formData: {
          contract: { totalAmount: '100000' },
          addendumSlotCount: 1,
          addendumSlots: [{ snapshot: { total: 50000 } }],
        },
        payments: [
          { amount: '100000', paymentType: 'FINAL' },
          { amount: '25000', paymentType: 'AMENDMENT', addendumNumber: 1 },
        ],
      }),
    ).toBe(83);
  });

  it('rounds to whole percent and returns null without payable base', () => {
    expect(
      computePackagePaidPercent({
        ...base,
        formData: { contract: { totalAmount: '30000' } },
        payments: [{ amount: '10000', paymentType: 'PREPAYMENT' }],
      }),
    ).toBe(33);

    expect(
      computePackagePaidPercent({
        ...base,
        formData: {},
        payments: [{ amount: '10000', paymentType: 'PREPAYMENT' }],
      }),
    ).toBeNull();
  });
});

describe('computePackageEffectiveManagerUserId', () => {
  it('prefers responsibleManagerId over signatory and createdBy', () => {
    expect(
      computePackageEffectiveManagerUserId({
        responsibleManagerId: 'resp-1',
        createdById: 'created-1',
        formData: { executor: { signatoryCrmUserId: 'sign-1' } },
      }),
    ).toBe('resp-1');
  });

  it('falls back to signatory then createdBy', () => {
    expect(
      computePackageEffectiveManagerUserId({
        responsibleManagerId: null,
        createdById: 'created-1',
        formData: { executor: { signatoryCrmUserId: 'sign-1' } },
      }),
    ).toBe('sign-1');

    expect(
      computePackageEffectiveManagerUserId({
        responsibleManagerId: null,
        createdById: 'created-1',
        formData: {},
      }),
    ).toBe('created-1');
  });
});

describe('packageMatchesListSearch / packageMatchesDateRange', () => {
  it('matches search by contract number and customer', () => {
    expect(
      packageMatchesListSearch(
        {
          contract: { number: 'Д-100' },
          customer: { type: 'PERSON', fullName: 'Иванов Иван' },
          object: { objectAddress: 'ул. Ленина 1' },
        },
        'д-100',
      ),
    ).toBe(true);
    expect(
      packageMatchesListSearch(
        {
          contract: { number: 'Д-100' },
          customer: { type: 'PERSON', fullName: 'Иванов Иван' },
        },
        'петров',
      ),
    ).toBe(false);
  });

  it('matches date range by signing date', () => {
    expect(
      packageMatchesDateRange(
        { contractConcludedAt: '2026-02-15T10:00:00.000Z' },
        '2026-02-01',
        '2026-02-28',
      ),
    ).toBe(true);
    expect(
      packageMatchesDateRange(
        { contractConcludedAt: '2026-03-15T10:00:00.000Z' },
        '2026-02-01',
        '2026-02-28',
      ),
    ).toBe(false);
  });
});
