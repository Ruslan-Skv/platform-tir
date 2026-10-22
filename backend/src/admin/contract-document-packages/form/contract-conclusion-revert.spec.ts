import { revertContractConclusionForm } from './contract-conclusion-revert';

describe('revertContractConclusionForm', () => {
  it('сбрасывает дату заключения и дату оплаты договора', () => {
    const result = revertContractConclusionForm({
      contractConcludedAt: '2026-10-21T14:32:49.933Z',
      contractPaidAt: '2026-10-22T10:00:00.000Z',
      contract: { number: '1931р-15' },
    });
    expect(result.contractConcludedAt).toBe('');
    expect(result.contractPaidAt).toBe('');
    expect(result.contract).toEqual({ number: '1931р-15' });
  });

  it('возвращает подписанные и оплаченные д/с в состояние OPEN', () => {
    const result = revertContractConclusionForm({
      contractConcludedAt: '2026-10-21T14:32:49.933Z',
      contractPaidAt: '',
      addendumSlots: [
        { status: 'OPEN', signedAt: '', paidAt: '' },
        { status: 'SIGNED', signedAt: '2026-10-21T15:00:00.000Z', paidAt: '', notes: 'д/с 1' },
        {
          status: 'PAID',
          signedAt: '2026-10-21T15:00:00.000Z',
          paidAt: '2026-10-22T09:00:00.000Z',
        },
      ],
    });
    expect((result.addendumSlots as Array<Record<string, unknown>>).map((s) => s.status)).toEqual([
      'OPEN',
      'OPEN',
      'OPEN',
    ]);
    for (const slot of result.addendumSlots as Array<Record<string, unknown>>) {
      expect(slot.signedAt).toBe('');
      expect(slot.paidAt).toBe('');
    }
    expect((result.addendumSlots as Array<Record<string, unknown>>)[1].notes).toBe('д/с 1');
  });

  it('не добавляет addendumSlots, если их не было в форме', () => {
    const result = revertContractConclusionForm({
      contractConcludedAt: '2026-10-21T14:32:49.933Z',
    });
    expect('addendumSlots' in result).toBe(false);
  });

  it('терпим к пустой и не-объектной форме', () => {
    expect(revertContractConclusionForm({})).toEqual({
      contractConcludedAt: '',
      contractPaidAt: '',
    });
    expect(revertContractConclusionForm(null)).toEqual({
      contractConcludedAt: '',
      contractPaidAt: '',
    });
  });
});
