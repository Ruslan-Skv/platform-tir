import {
  computeRepairPipelineModel,
  inferWindowsPrepayment70StartDate,
} from './repairContractPipeline';
import { mergeRepairPackageFormData } from './repairPackageForm';

describe('inferWindowsPrepayment70StartDate', () => {
  it('returns date of payment that crosses 70% threshold', () => {
    const date = inferWindowsPrepayment70StartDate(
      [
        { amount: '40000', paymentDate: '2026-06-01', paymentType: 'PREPAYMENT', basis: 'аванс' },
        { amount: '30000', paymentDate: '2026-06-03', paymentType: 'ADVANCE', basis: 'частичная' },
      ] as never,
      100_000
    );
    expect(date).toBe('2026-06-03');
  });
});

describe('computeRepairPipelineModel WINDOWS', () => {
  const baseForm = () =>
    mergeRepairPackageFormData({
      contract: { totalAmount: '100 000', discountPercent: '', workPeriod: '50' },
      windowsSpecificationAmount: '40 000',
      estimate: { snapshot: { total: 60_000 } },
    });

  it('includes work step and addendums when present', () => {
    const form = mergeRepairPackageFormData({
      ...baseForm(),
      addendumSlotCount: 1,
      addendumSlots: [
        {
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          selectedPresetIds: ['p1'],
          snapshot: { total: 10_000 },
        },
        ...baseForm().addendumSlots.slice(1),
      ],
    });
    const model = computeRepairPipelineModel({
      packageKind: 'WINDOWS',
      packageFlowStatus: 'CONTRACT_CONCLUDED',
      form,
      payments: [],
    });
    expect(model.steps.map((s) => s.id)).toEqual([
      'in_project',
      'signed',
      'addendums',
      'payments',
      'work',
      'closed',
    ]);
    expect(model.hasAddendumsInPackage).toBe(true);
  });

  it('marks work in progress from journal when 70% paid', () => {
    const model = computeRepairPipelineModel({
      packageKind: 'WINDOWS',
      packageFlowStatus: 'CONTRACT_CONCLUDED',
      form: baseForm(),
      payments: [
        {
          amount: '70000',
          paymentDate: '2026-06-03',
          paymentType: 'PREPAYMENT',
          basis: 'предоплата',
        },
      ] as never,
    });
    expect(model.workStartPaymentReady).toBe(true);
    expect(model.windowsWorkPeriodStartDate).toBe('2026-06-03');
    expect(model.repairWorkStarted).toBe(true);
    expect(model.listPipelineStatus).toBe('WORK_IN_PROGRESS');
    expect(model.windowsContractDeadline?.workingDays).toBe(50);
    expect(model.windowsContractDeadline?.startLabelRu).toBe('03.06.2026');
    expect(model.windowsContractDeadline?.labelRu).toBeTruthy();
  });

  it('requires full payment including addendum before close', () => {
    const form = mergeRepairPackageFormData({
      contract: { totalAmount: '100 000', discountPercent: '' },
      windowsSpecificationAmount: '40 000',
      estimate: { snapshot: { total: 60_000 } },
      addendumSlotCount: 1,
      addendumSlots: [
        {
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          selectedPresetIds: ['p1'],
          snapshot: { total: 10_000 },
        },
        ...mergeRepairPackageFormData({}).addendumSlots.slice(1),
      ],
      repairContractCloseActSignedAt: '2026-06-10',
      repairContractCloseActPhotoUrl: '/uploads/act.jpg',
    });
    const model = computeRepairPipelineModel({
      packageKind: 'WINDOWS',
      packageFlowStatus: 'CONTRACT_CONCLUDED',
      form,
      payments: [{ amount: '100000', paymentType: 'FINAL', basis: 'окончательный' }] as never,
    });
    expect(model.allPaymentsComplete).toBe(false);
    expect(model.repairContractClosed).toBe(false);
  });
});
