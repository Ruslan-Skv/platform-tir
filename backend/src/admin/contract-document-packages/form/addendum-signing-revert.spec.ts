import { revertAddendumSigningForm } from './addendum-signing-revert';

describe('revertAddendumSigningForm', () => {
  it('возвращает подписанное Д/с в состояние OPEN и сбрасывает метку подписания', () => {
    const result = revertAddendumSigningForm(
      {
        addendumSlots: [
          { status: 'OPEN', signedAt: '', paidAt: '' },
          { status: 'SIGNED', signedAt: '2026-10-21T15:00:00.000Z', paidAt: '', notes: 'д/с 2' },
          {
            status: 'PAID',
            signedAt: '2026-10-21T15:00:00.000Z',
            paidAt: '2026-10-22T09:00:00.000Z',
          },
        ],
      },
      2,
    ) as { addendumSlots: Array<Record<string, unknown>> };
    expect(result.addendumSlots[1]).toEqual({
      status: 'OPEN',
      signedAt: '',
      paidAt: '',
      notes: 'д/с 2',
    });
    // Прочие слоты не затрагиваются.
    expect(result.addendumSlots[0].status).toBe('OPEN');
    expect(result.addendumSlots[2].status).toBe('PAID');
  });

  it('сохраняет отметку оплаты оплаченного Д/с', () => {
    const result = revertAddendumSigningForm(
      {
        addendumSlots: [
          {
            status: 'PAID',
            signedAt: '2026-10-21T15:00:00.000Z',
            paidAt: '2026-10-22T09:00:00.000Z',
          },
        ],
      },
      1,
    ) as { addendumSlots: Array<Record<string, unknown>> };
    expect(result.addendumSlots[0]).toEqual({
      status: 'OPEN',
      signedAt: '',
      paidAt: '2026-10-22T09:00:00.000Z',
    });
  });

  it('сохраняет отметку оплаты у слота с датой оплаты', () => {
    const result = revertAddendumSigningForm(
      {
        addendumSlots: [
          {
            status: 'SIGNED',
            signedAt: '2026-10-21T15:00:00.000Z',
            paidAt: '2026-10-22T09:00:00.000Z',
          },
        ],
      },
      1,
    ) as { addendumSlots: Array<Record<string, unknown>> };
    expect(result.addendumSlots[0]).toEqual({
      status: 'OPEN',
      signedAt: '',
      paidAt: '2026-10-22T09:00:00.000Z',
    });
  });

  it('не меняет неподписанное Д/с (null)', () => {
    const form = {
      addendumSlots: [
        { status: 'OPEN', signedAt: '', paidAt: '' },
        { status: 'SIGNED', signedAt: '2026-10-21T15:00:00.000Z', paidAt: '' },
      ],
    };
    expect(revertAddendumSigningForm(form, 1)).toBeNull();
  });

  it('null при отсутствии слота или списка слотов', () => {
    expect(revertAddendumSigningForm({ addendumSlots: [] }, 1)).toBeNull();
    expect(revertAddendumSigningForm({}, 1)).toBeNull();
    expect(revertAddendumSigningForm(null, 1)).toBeNull();
  });

  it('null при некорректном номере Д/с', () => {
    const form = {
      addendumSlots: [{ status: 'SIGNED', signedAt: '2026-10-21T15:00:00.000Z', paidAt: '' }],
    };
    expect(revertAddendumSigningForm(form, 0)).toBeNull();
    expect(revertAddendumSigningForm(form, 6)).toBeNull();
    expect(revertAddendumSigningForm(form, 1.5)).toBeNull();
  });
});
