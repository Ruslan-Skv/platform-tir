import { isEstimatePresetForLinkedContractCustomer } from './applyEstimatePresetIds';
import { findAttachGroupKeyForPackageObjectAddress } from './estimateObjectGroupSync';

describe('findAttachGroupKeyForPackageObjectAddress', () => {
  it('matches by preset objectAddress', () => {
    expect(
      findAttachGroupKeyForPackageObjectAddress({
        packageObjectAddress: '  ул. Ленина, 1 ',
        attachablePresets: [{ groupId: 'g1', objectAddress: 'ул. Ленина, 1' }],
        groups: [{ id: 'g1', title: 'Другое название' }],
      })
    ).toBe('g1');
  });

  it('matches by group title when preset address differs', () => {
    expect(
      findAttachGroupKeyForPackageObjectAddress({
        packageObjectAddress: 'ул. Ленина, 1',
        attachablePresets: [{ groupId: 'g1', objectAddress: '' }],
        groups: [{ id: 'g1', title: 'ул. Ленина, 1' }],
      })
    ).toBe('g1');
  });

  it('returns __ungrouped__ for matching address without group', () => {
    expect(
      findAttachGroupKeyForPackageObjectAddress({
        packageObjectAddress: 'ул. Ленина, 1',
        attachablePresets: [{ groupId: null, objectAddress: 'ул. Ленина, 1' }],
        groups: [],
      })
    ).toBe('__ungrouped__');
  });
});

describe('isEstimatePresetForLinkedContractCustomer', () => {
  it('matches by crmCustomerId', () => {
    expect(
      isEstimatePresetForLinkedContractCustomer({ crmCustomerId: 'c1' } as never, {
        filterByLinkedCustomer: true,
        linkedCrmCustomerId: 'c1',
      })
    ).toBe(true);
  });

  it('allows legacy preset without crm id when address matches', () => {
    expect(
      isEstimatePresetForLinkedContractCustomer({ objectAddress: 'ул. Ленина, 1' } as never, {
        filterByLinkedCustomer: true,
        linkedCrmCustomerId: 'c1',
        packageObjectAddress: 'ул. Ленина, 1',
      })
    ).toBe(true);
  });

  it('rejects different crm id even when address matches', () => {
    expect(
      isEstimatePresetForLinkedContractCustomer(
        { crmCustomerId: 'c2', objectAddress: 'ул. Ленина, 1' } as never,
        {
          filterByLinkedCustomer: true,
          linkedCrmCustomerId: 'c1',
          packageObjectAddress: 'ул. Ленина, 1',
        }
      )
    ).toBe(false);
  });
});
