import { mergePackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';

import {
  computePackageContractPipelineModel,
  packageListPipelineStatusInfoFromPackage,
  packageListPipelineStatusLabel,
} from './packagePipeline';

const payableWindowsForm = mergePackageFormData({
  estimate: { snapshot: { total: 100000 } },
  productSpecificationAmount: '0',
});

function pkg(input: {
  kind: 'WINDOWS' | 'REPAIR';
  status: 'IN_PROGRESS' | 'CONTRACT_CONCLUDED';
  payments?: Array<{ amount: string; paymentType: string; paymentDate: string }>;
  formData?: Record<string, unknown>;
}) {
  return {
    kind: input.kind,
    status: input.status,
    formData: input.formData ?? {},
    payments: (input.payments ?? []) as never[],
  };
}

describe('«Подписан (оплата N%!)» — оплата ниже порога 70% при подписанном договоре', () => {
  it('окна: подписан без оплат → «Подписан (оплата 0%!)»', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'WINDOWS',
        status: 'CONTRACT_CONCLUDED',
        formData: {
          estimate: { snapshot: { total: 100000 } },
          productSpecificationAmount: '0',
        },
      })
    );
    expect(info.status).toBe('SIGNED');
    expect(info.signedPaymentDue).toBe(true);
    expect(info.signedPaymentDuePaidPct).toBe(0);
    expect(packageListPipelineStatusLabel(info.status, info)).toBe('Подписан (оплата 0%!)');
  });

  it('окна: подписан, оплачено 70% → просто «Подписан»', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'WINDOWS',
        status: 'CONTRACT_CONCLUDED',
        payments: [{ amount: '70000', paymentType: 'PREPAYMENT', paymentDate: '2026-06-03' }],
        formData: {
          estimate: { snapshot: { total: 100000 } },
          productSpecificationAmount: '0',
        },
      })
    );
    expect(info.status).toBe('SIGNED');
    expect(info.signedPaymentDue).toBe(false);
    expect(info.signedPaymentDuePaidPct).toBeNull();
    expect(packageListPipelineStatusLabel(info.status, info)).toBe('Подписан');
  });

  it('окна: частичная оплата ниже порога → «Подписан (оплата 50%!)»', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'WINDOWS',
        status: 'CONTRACT_CONCLUDED',
        payments: [{ amount: '50000', paymentType: 'PREPAYMENT', paymentDate: '2026-06-03' }],
        formData: {
          estimate: { snapshot: { total: 100000 } },
          productSpecificationAmount: '0',
        },
      })
    );
    expect(info.status).toBe('SIGNED');
    expect(info.signedPaymentDue).toBe(true);
    expect(info.signedPaymentDuePaidPct).toBe(50);
    expect(packageListPipelineStatusLabel(info.status, info)).toBe('Подписан (оплата 50%!)');
  });

  it('процент оплаты округляется вниз: 69 900 из 100 000 → 69%', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'WINDOWS',
        status: 'CONTRACT_CONCLUDED',
        payments: [{ amount: '69900', paymentType: 'PREPAYMENT', paymentDate: '2026-06-03' }],
        formData: {
          estimate: { snapshot: { total: 100000 } },
          productSpecificationAmount: '0',
        },
      })
    );
    expect(info.signedPaymentDue).toBe(true);
    expect(info.signedPaymentDuePaidPct).toBe(69);
    expect(packageListPipelineStatusLabel(info.status, info)).toBe('Подписан (оплата 69%!)');
  });

  it('неподписанный договор — без признака оплаты', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({ kind: 'WINDOWS', status: 'IN_PROGRESS' })
    );
    expect(info.status).toBe('IN_PROJECT');
    expect(info.signedPaymentDue).toBe(false);
  });

  it('закрытый договор — без признака оплаты', () => {
    const info = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'WINDOWS',
        status: 'CONTRACT_CONCLUDED',
        payments: [{ amount: '100000', paymentType: 'FINAL', paymentDate: '2026-06-20' }],
        formData: {
          estimate: { snapshot: { total: 100000 } },
          productSpecificationAmount: '0',
          repairContractCloseActSignedAt: '2026-06-25',
          repairContractCloseActPhotoUrl: '/uploads/act.jpg',
        },
      })
    );
    expect(info.status).toBe('CLOSED');
    expect(info.signedPaymentDue).toBe(false);
  });

  it('ремонт: подписан без предоплаты → «Подписан (оплата 0%!)»; с актом и оплатой → «В работе»', () => {
    const due = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'REPAIR',
        status: 'CONTRACT_CONCLUDED',
        formData: { contract: { totalAmount: '100000' } },
      })
    );
    expect(due.status).toBe('SIGNED');
    expect(due.signedPaymentDue).toBe(true);
    expect(due.signedPaymentDuePaidPct).toBe(0);

    const working = packageListPipelineStatusInfoFromPackage(
      pkg({
        kind: 'REPAIR',
        status: 'CONTRACT_CONCLUDED',
        payments: [{ amount: '70000', paymentType: 'PREPAYMENT', paymentDate: '2026-06-03' }],
        formData: {
          contract: { totalAmount: '100000' },
          repairWorkStartActSignedAt: '2026-06-05',
          repairWorkStartActPhotoUrl: '/uploads/act.jpg',
        },
      })
    );
    expect(working.status).toBe('WORK_IN_PROGRESS');
    expect(working.signedPaymentDue).toBe(false);
  });

  it('модель хаба тоже выставляет signedPaymentDue', () => {
    const model = computePackageContractPipelineModel({
      packageKind: 'WINDOWS',
      packageFlowStatus: 'CONTRACT_CONCLUDED',
      form: payableWindowsForm,
      payments: [],
    });
    expect(model.signedPaymentDue).toBe(true);
  });
});
