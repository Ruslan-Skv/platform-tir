import { defaultPackageFormData } from '../form/defaults';
import type { PackageFormData } from '../form/types';
import type { PackageCustomerShareContext } from './packageCustomerDocumentShare';
import { remoteSigningStageProblem } from './remoteSigningStage';

function ctx(patch: {
  form?: Partial<PackageFormData>;
  packageStatus?: PackageCustomerShareContext['packageStatus'];
  packageKind?: PackageCustomerShareContext['packageKind'];
}): Pick<PackageCustomerShareContext, 'packageKind' | 'form' | 'packageStatus'> {
  return {
    packageKind: patch.packageKind ?? 'REPAIR',
    packageStatus: patch.packageStatus ?? 'IN_PROGRESS',
    form: { ...defaultPackageFormData(), ...patch.form },
  };
}

function slot(patch: Partial<PackageFormData['addendumSlots'][number]>) {
  return { ...defaultPackageFormData().addendumSlots[0], ...patch };
}

/** Кортеж из 5 слотов, где первый — с данными Д/с №1. */
function addendumSlotsWithFirst(
  patch: Partial<PackageFormData['addendumSlots'][number]>
): PackageFormData['addendumSlots'] {
  return [slot(patch), slot({}), slot({}), slot({}), slot({})] as PackageFormData['addendumSlots'];
}

describe('remoteSigningStageProblem: признаки подписанного договора', () => {
  it('Д/с и акты блокируются, пока договор не подписан', () => {
    expect(remoteSigningStageProblem({ selectedTabs: ['addendum1'], ctx: ctx({}) })).toBe(
      'Сначала подпишите договор: «Д/с №1» направляется заказчику после подписания договора.'
    );
    expect(remoteSigningStageProblem({ selectedTabs: ['actAcceptance'], ctx: ctx({}) })).toBe(
      'Сначала подпишите договор: «Акт сдачи-приёмки» направляется заказчику после подписания договора.'
    );
  });

  it('подписанная сессия ЭП договора открывает Д/с, даже если форма устарела', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['addendum1'],
        ctx: ctx({
          form: { addendumSlots: addendumSlotsWithFirst({ selectedPresetIds: ['p1'] }) },
        }),
        signedTabs: new Set(['contract']),
      })
    ).toBeNull();
  });

  it('статус пакета CONTRACT_CONCLUDED открывает акты при пустой дате в форме', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['actAcceptance'],
        ctx: ctx({ packageStatus: 'CONTRACT_CONCLUDED' }),
      })
    ).toBeNull();
  });

  it('дата contractConcludedAt в форме открывает акты', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['actAcceptance'],
        ctx: ctx({ form: { contractConcludedAt: '2026-10-10T21:30:00.000Z' } }),
      })
    ).toBeNull();
  });

  it('договор с любым признаком подписания повторно не отправляется', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['contract'],
        ctx: ctx({ form: { contractConcludedAt: '' } }),
        signedTabs: new Set(['contract']),
      })
    ).toBe(
      'Договор уже подписан. Для изменений используйте доп. соглашения (Д/с) или снимите вкладку «Договор».'
    );
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['contract'],
        ctx: ctx({ packageStatus: 'CONTRACT_CONCLUDED' }),
      })
    ).toBe(
      'Договор уже подписан. Для изменений используйте доп. соглашения (Д/с) или снимите вкладку «Договор».'
    );
  });

  it('подписанные по ЭП акты и Д/с повторно не отправляются', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['actStart'],
        ctx: ctx({ packageStatus: 'CONTRACT_CONCLUDED' }),
        signedTabs: new Set(['contract', 'actStart']),
      })
    ).toBe('Акт начала работ уже подписан по ЭП — повторная отправка не требуется.');
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['actAcceptance'],
        ctx: ctx({ packageStatus: 'CONTRACT_CONCLUDED' }),
        signedTabs: new Set(['contract', 'actAcceptance']),
      })
    ).toBe('Акт сдачи-приёмки уже подписан по ЭП — повторная отправка не требуется.');
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['addendum1'],
        ctx: ctx({
          packageStatus: 'CONTRACT_CONCLUDED',
          form: { addendumSlots: addendumSlotsWithFirst({ selectedPresetIds: ['p1'] }) },
        }),
        signedTabs: new Set(['contract', 'addendum1']),
      })
    ).toBe('Д/с №1 уже подписано по ЭП — повторная отправка не требуется.');
  });

  it('акт начала работ — только для «Ремонта»', () => {
    expect(
      remoteSigningStageProblem({
        selectedTabs: ['actStart'],
        ctx: ctx({ packageStatus: 'CONTRACT_CONCLUDED', packageKind: 'WINDOWS' }),
      })
    ).toBe('«Акт начала работ» можно отправить на подписание только для направления «Ремонт».');
  });
});
