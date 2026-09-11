import {
  estimateWorkspaceCustomerDirty,
  isEstimateWorkspaceDirty,
} from './estimateWorkspaceDirtyState';
import type { WorkspaceBaseline } from './estimateWorkspaceUtils';

function baselineWith(fields: Partial<WorkspaceBaseline>): WorkspaceBaseline {
  return {
    categorySlugs: ['repair'],
    name: 'Расчёт',
    draftsByCategory: {},
    customer: { crmCustomerId: null, customerName: '', objectAddress: '' },
    ...fields,
  };
}

function dirtyParams(overrides: Record<string, unknown>) {
  return {
    copySessionPendingSave: false,
    baseline: baselineWith({}),
    estimateCategorySlugs: ['repair'],
    estimateNameDraft: 'Расчёт',
    crmCustomerId: null,
    customerName: '',
    objectAddress: '',
    additionalMarkupRaw: '',
    ...overrides,
  };
}

describe('isEstimateWorkspaceDirty: наценка', () => {
  it('не грязно, когда наценка не задана в обоих местах', () => {
    expect(isEstimateWorkspaceDirty(dirtyParams({}))).toBe(false);
  });

  it('не грязно, когда наценка совпадает', () => {
    expect(
      isEstimateWorkspaceDirty(
        dirtyParams({
          baseline: baselineWith({ additionalMarkupPercent: 12.5 }),
          additionalMarkupRaw: '12,5',
        })
      )
    ).toBe(false);
  });

  it('грязно, когда наценка введена', () => {
    expect(isEstimateWorkspaceDirty(dirtyParams({ additionalMarkupRaw: '10' }))).toBe(true);
  });

  it('грязно, когда наценка очищена', () => {
    expect(
      isEstimateWorkspaceDirty(
        dirtyParams({ baseline: baselineWith({ additionalMarkupPercent: 10 }) })
      )
    ).toBe(true);
  });

  it('грязно, когда наценка изменилась', () => {
    expect(
      isEstimateWorkspaceDirty(
        dirtyParams({
          baseline: baselineWith({ additionalMarkupPercent: 10 }),
          additionalMarkupRaw: '15',
        })
      )
    ).toBe(true);
  });
});

describe('estimateWorkspaceCustomerDirty', () => {
  it('сравнивает все поля покупателя', () => {
    const baseline = baselineWith({});
    expect(
      estimateWorkspaceCustomerDirty(baseline, {
        crmCustomerId: 'c1',
        customerName: 'Иван',
        objectAddress: 'ул. Ленина, 1',
      })
    ).toBe(true);
  });
});
