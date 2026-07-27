import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

import {
  computePackageEffectiveManagerUserId,
  computePackageListPipelineStatus,
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

  it('returns WORK_IN_PROGRESS for windows after 70% prepayment', () => {
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
    ).toBe('WORK_IN_PROGRESS');
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
