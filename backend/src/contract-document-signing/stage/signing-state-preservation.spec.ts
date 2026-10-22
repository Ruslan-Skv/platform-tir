import { ContractDocumentPackageStatus } from '@prisma/client';

import {
  REMOTE_SIGNING_CONCLUSION_REVERT_WINDOW_MS,
  applyRemoteSigningPreservation,
  remoteSigningPreservationEvidenceTabs,
  withServerOwnedRemoteSigningMarker,
} from './signing-state-preservation';

const IN_PROGRESS = ContractDocumentPackageStatus.IN_PROGRESS;
const CONCLUDED = ContractDocumentPackageStatus.CONTRACT_CONCLUDED;
const REFUSED = ContractDocumentPackageStatus.REFUSED;

const NOW = Date.parse('2026-10-13T12:00:00.000Z');
const OLD_CONCLUDED_AT = '2026-10-01T10:00:00.000Z';
const FRESH_CONCLUDED_AT = new Date(NOW - 5_000).toISOString();

const signedContract = new Set(['contract']);
const signedAddendum1 = new Set(['addendum1']);
const signedActStart = new Set(['actStart']);
const noEvidence = new Set<string>();

function preserve(input: {
  storedFormData: unknown;
  incomingFormData?: unknown;
  incomingStatus?: ContractDocumentPackageStatus;
  storedStatus?: ContractDocumentPackageStatus;
  signedStageTabs?: ReadonlySet<string>;
}) {
  return applyRemoteSigningPreservation({
    storedFormData: input.storedFormData,
    incomingFormData: input.incomingFormData,
    incomingStatus: input.incomingStatus,
    storedStatus: input.storedStatus ?? IN_PROGRESS,
    signedStageTabs: input.signedStageTabs ?? noEvidence,
    now: NOW,
  });
}

function slots(formData: Record<string, unknown> | null): unknown[] {
  return Array.isArray(formData?.addendumSlots) ? (formData.addendumSlots as unknown[]) : [];
}

describe('withServerOwnedRemoteSigningMarker', () => {
  it('восстанавливает хранимый маркер, потерянный формой', () => {
    const stored = { _remoteSigning: { sessionId: 's1' }, a: 1 };
    const incoming = { a: 2 };
    expect(withServerOwnedRemoteSigningMarker(stored, incoming)).toEqual({
      a: 2,
      _remoteSigning: { sessionId: 's1' },
    });
  });

  it('затирает устаревший маркер из формы, если на сервере его нет', () => {
    const incoming = { a: 1, _remoteSigning: { sessionId: 'old' } };
    expect(withServerOwnedRemoteSigningMarker({}, incoming)).toEqual({ a: 1 });
    expect(withServerOwnedRemoteSigningMarker(undefined, incoming)).toEqual({ a: 1 });
  });

  it('не меняет не-объекты', () => {
    expect(withServerOwnedRemoteSigningMarker({}, 'x')).toBe('x');
  });
});

describe('applyRemoteSigningPreservation: договор', () => {
  it('восстанавливает дату заключения, затёртую устаревшей формой (вне окна отката)', () => {
    const result = preserve({
      storedFormData: { contractConcludedAt: OLD_CONCLUDED_AT },
      incomingFormData: { contractConcludedAt: '' },
      storedStatus: CONCLUDED,
    });
    expect(result.formData?.contractConcludedAt).toBe(OLD_CONCLUDED_AT);
    expect(result.preserved).toContain('contractConcludedAt');
  });

  it('восстанавливает дату внутри окна отката, если договор подписан по ЭП', () => {
    const result = preserve({
      storedFormData: { contractConcludedAt: FRESH_CONCLUDED_AT },
      incomingFormData: { contractConcludedAt: '' },
      storedStatus: CONCLUDED,
      signedStageTabs: signedContract,
    });
    expect(result.formData?.contractConcludedAt).toBe(FRESH_CONCLUDED_AT);
  });

  it('не мешает отмене ручного подписания внутри окна отката', () => {
    const result = preserve({
      storedFormData: { contractConcludedAt: FRESH_CONCLUDED_AT },
      incomingFormData: { contractConcludedAt: '' },
      incomingStatus: IN_PROGRESS,
      storedStatus: CONCLUDED,
      signedStageTabs: noEvidence,
    });
    expect(result.formData?.contractConcludedAt).toBe('');
    expect(result.status).toBe(IN_PROGRESS);
  });

  it('не даёт откатить статус CONTRACT_CONCLUDED устаревшей формой (вне окна)', () => {
    const result = preserve({
      storedFormData: { contractConcludedAt: OLD_CONCLUDED_AT },
      incomingFormData: { contractConcludedAt: OLD_CONCLUDED_AT },
      incomingStatus: IN_PROGRESS,
      storedStatus: CONCLUDED,
    });
    expect(result.status).toBe(CONCLUDED);
  });

  it('не даёт откатить статус по ЭП-подписи даже внутри окна и без даты', () => {
    const result = preserve({
      storedFormData: {},
      incomingFormData: {},
      incomingStatus: REFUSED,
      storedStatus: CONCLUDED,
      signedStageTabs: signedContract,
    });
    expect(result.status).toBe(CONCLUDED);
  });

  it('форма без затирания даты проходит без изменений', () => {
    const result = preserve({
      storedFormData: { contractConcludedAt: OLD_CONCLUDED_AT, x: 1 },
      incomingFormData: { contractConcludedAt: OLD_CONCLUDED_AT, x: 2 },
      storedStatus: CONCLUDED,
    });
    expect(result.formData).toEqual({ contractConcludedAt: OLD_CONCLUDED_AT, x: 2 });
    expect(result.preserved).toEqual([]);
  });
});

describe('applyRemoteSigningPreservation: Д/с', () => {
  const signedSlot = {
    status: 'SIGNED',
    signedAt: OLD_CONCLUDED_AT,
    paidAt: '',
    selectedPresetIds: ['preset-1'],
  };

  it('возвращает слот в SIGNED, «открытый» устаревшей формой', () => {
    const result = preserve({
      storedFormData: { addendumSlots: [signedSlot] },
      incomingFormData: { addendumSlots: [{ ...signedSlot, status: 'OPEN', signedAt: '' }] },
      storedStatus: CONCLUDED,
    });
    expect(result.formData?.addendumSlots).toEqual([signedSlot]);
  });

  it('внутри окна отката защищает слот только при подписанной сессии ЭП', () => {
    const freshSlot = { ...signedSlot, signedAt: FRESH_CONCLUDED_AT };
    const withEvidence = preserve({
      storedFormData: { addendumSlots: [freshSlot] },
      incomingFormData: { addendumSlots: [{ ...freshSlot, status: 'OPEN', signedAt: '' }] },
      storedStatus: CONCLUDED,
      signedStageTabs: signedAddendum1,
    });
    expect(slots(withEvidence.formData)[0]).toEqual(freshSlot);

    const withoutEvidence = preserve({
      storedFormData: { addendumSlots: [freshSlot] },
      incomingFormData: { addendumSlots: [{ ...freshSlot, status: 'OPEN', signedAt: '' }] },
      storedStatus: CONCLUDED,
    });
    expect((slots(withoutEvidence.formData)[0] as { status: string }).status).toBe('OPEN');
  });

  it('слот без метки времени защищается всегда', () => {
    const result = preserve({
      storedFormData: { addendumSlots: [{ ...signedSlot, signedAt: '' }] },
      incomingFormData: { addendumSlots: [{ ...signedSlot, status: 'OPEN', signedAt: '' }] },
      storedStatus: CONCLUDED,
    });
    expect((slots(result.formData)[0] as { status: string }).status).toBe('SIGNED');
  });
});

describe('applyRemoteSigningPreservation: акты', () => {
  it('восстанавливает поля акта при подписанной сессии ЭП', () => {
    const result = preserve({
      storedFormData: {
        repairWorkStartActSignedAt: '2026-10-11',
        repairWorkStartActPhotoUrl: '/uploads/signed.pdf',
      },
      incomingFormData: { repairWorkStartActSignedAt: '', repairWorkStartActPhotoUrl: '' },
      storedStatus: CONCLUDED,
      signedStageTabs: signedActStart,
    });
    expect(result.formData?.repairWorkStartActSignedAt).toBe('2026-10-11');
    expect(result.formData?.repairWorkStartActPhotoUrl).toBe('/uploads/signed.pdf');
  });

  it('ручная отметка акта без сессии ЭП не защищается (менять дату можно)', () => {
    const result = preserve({
      storedFormData: { repairWorkStartActSignedAt: '2026-10-11' },
      incomingFormData: { repairWorkStartActSignedAt: '2026-10-12' },
      storedStatus: CONCLUDED,
    });
    expect(result.formData?.repairWorkStartActSignedAt).toBe('2026-10-12');
    expect(result.preserved).toEqual([]);
  });

  it('булевы признаки закрытия восстанавливаются по сессии акта сдачи-приёмки', () => {
    const result = preserve({
      storedFormData: { contractClosed: true, repairContractClosed: true },
      incomingFormData: { contractClosed: false, repairContractClosed: false },
      storedStatus: CONCLUDED,
      signedStageTabs: new Set(['actAcceptance']),
    });
    expect(result.formData?.contractClosed).toBe(true);
    expect(result.formData?.repairContractClosed).toBe(true);
  });
});

describe('remoteSigningPreservationEvidenceTabs', () => {
  it('вне окна отката запрос к сессиям не нужен', () => {
    expect(
      remoteSigningPreservationEvidenceTabs({
        storedFormData: { contractConcludedAt: OLD_CONCLUDED_AT },
        incomingFormData: { contractConcludedAt: '' },
        incomingStatus: IN_PROGRESS,
        storedStatus: CONCLUDED,
        now: NOW,
      }),
    ).toEqual(new Set());
  });

  it('внутри окна отката требуется подтверждение договором по ЭП', () => {
    expect(
      remoteSigningPreservationEvidenceTabs({
        storedFormData: { contractConcludedAt: FRESH_CONCLUDED_AT },
        incomingFormData: { contractConcludedAt: '' },
        incomingStatus: IN_PROGRESS,
        storedStatus: CONCLUDED,
        now: NOW,
      }),
    ).toEqual(new Set(['contract']));
  });

  it('регресс слота и акта требует подтверждения их сессиями', () => {
    expect(
      remoteSigningPreservationEvidenceTabs({
        storedFormData: {
          addendumSlots: [
            { status: 'SIGNED', signedAt: FRESH_CONCLUDED_AT, selectedPresetIds: ['x'] },
          ],
          repairWorkStartActSignedAt: '2026-10-11',
        },
        incomingFormData: {
          addendumSlots: [{ status: 'OPEN', signedAt: '', selectedPresetIds: ['x'] }],
          repairWorkStartActSignedAt: '',
        },
        storedStatus: CONCLUDED,
        now: NOW,
      }),
    ).toEqual(new Set(['addendum1', 'actStart']));
  });

  it('без затираний признаков подтверждения не нужны', () => {
    expect(
      remoteSigningPreservationEvidenceTabs({
        storedFormData: { contractConcludedAt: FRESH_CONCLUDED_AT },
        incomingFormData: { contractConcludedAt: FRESH_CONCLUDED_AT, other: 1 },
        incomingStatus: CONCLUDED,
        storedStatus: CONCLUDED,
        now: NOW,
      }),
    ).toEqual(new Set());
  });

  it('окно отката — 5 секунд', () => {
    expect(REMOTE_SIGNING_CONCLUSION_REVERT_WINDOW_MS).toBe(5 * 1000);
  });

  it('обновление только статуса: дата не проверяется, статус — подтверждается', () => {
    expect(
      remoteSigningPreservationEvidenceTabs({
        storedFormData: { contractConcludedAt: FRESH_CONCLUDED_AT },
        incomingFormData: undefined,
        incomingStatus: IN_PROGRESS,
        storedStatus: CONCLUDED,
        now: NOW,
      }),
    ).toEqual(new Set(['contract']));
  });
});
