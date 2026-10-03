import { defaultPackageFormData } from '../../form/defaults';
import type { PackageFormData } from '../../form/types';
import { revertContractConclusionForm } from './contractConclusionRevert';

function slot(patch: Partial<PackageFormData['addendumSlots'][number]>) {
  return { ...defaultPackageFormData().addendumSlots[0], ...patch };
}

describe('revertContractConclusionForm', () => {
  it('сбрасывает подписанные и оплаченные д/с вместе с договором', () => {
    const form = {
      ...defaultPackageFormData(),
      contractConcludedAt: '2026-09-29T07:00:00.000Z',
      contractPaidAt: '2026-09-29T08:00:00.000Z',
      addendumSlots: [
        slot({ status: 'SIGNED', signedAt: '2026-09-10T10:28:23.789Z' }),
        slot({
          status: 'PAID',
          signedAt: '2026-09-11T10:00:00.000Z',
          paidAt: '2026-09-12T10:00:00.000Z',
        }),
        slot({}),
        slot({}),
        slot({}),
      ],
    } as unknown as ReturnType<typeof defaultPackageFormData>;

    const next = revertContractConclusionForm(form);
    expect(next.contractConcludedAt).toBe('');
    expect(next.contractPaidAt).toBe('');
    expect(next.addendumSlots.map((s) => s.status)).toEqual([
      'OPEN',
      'OPEN',
      'OPEN',
      'OPEN',
      'OPEN',
    ]);
    expect(next.addendumSlots.every((s) => !s.signedAt && !s.paidAt)).toBe(true);
  });

  it('не трогает содержимое д/с (прикреплённые расчёты остаются)', () => {
    const form = {
      ...defaultPackageFormData(),
      contractConcludedAt: '2026-09-29T07:00:00.000Z',
      addendumSlots: [
        slot({ status: 'SIGNED', signedAt: 't', selectedPresetIds: ['p1'] }),
        slot({}),
        slot({}),
        slot({}),
        slot({}),
      ],
    } as unknown as ReturnType<typeof defaultPackageFormData>;

    const next = revertContractConclusionForm(form);
    expect(next.addendumSlots[0].selectedPresetIds).toEqual(['p1']);
    expect(next.addendumSlots[0].status).toBe('OPEN');
  });
});
