import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  getEstimateAttachmentStatus,
  getEstimateListPipelineTab,
} from './estimatesListPipelineTabs';
import type { EstimatePackageUsage } from './estimatesListUtils';

type PresetSpec = {
  id: string;
  bundle?: string;
  stage?: ContractEstimatePreset['pipelineStage'];
  archived?: boolean;
  usage?: 'free' | 'attached' | 'signed';
};

function buildFixtures(specs: PresetSpec[]) {
  const items = specs.map(
    (s) =>
      ({
        id: s.id,
        title: s.id,
        pipelineStage: s.stage,
        archived: s.archived,
      }) as never as ContractEstimatePreset
  );
  // Связка: у копий splitBundleId = id якоря.
  for (const s of specs) {
    if (!s.bundle) continue;
    const anchor = items.find((it) => it.id === s.bundle);
    const preset = items.find((it) => it.id === s.id);
    if (!anchor || !preset) continue;
    if (s.id === s.bundle) continue;
    (preset as { splitBundleId?: string }).splitBundleId = s.bundle;
  }
  const usageByEstimateId = new Map<string, EstimatePackageUsage[]>();
  for (const s of specs) {
    if (s.usage === 'attached') {
      usageByEstimateId.set(s.id, [
        {
          packageId: 'pkg1',
          packageTitle: 'Пакет',
          kind: 'contract',
          packageStatus: 'IN_PROGRESS',
          contractNumber: '1',
          contractDate: '01.01.2026',
        },
      ]);
    } else if (s.usage === 'signed') {
      usageByEstimateId.set(s.id, [
        {
          packageId: 'pkg2',
          packageTitle: 'Пакет',
          kind: 'contract',
          packageStatus: 'CONTRACT_CONCLUDED',
          contractNumber: '2',
          contractDate: '01.01.2026',
        },
      ]);
    }
  }
  return { items, usageByEstimateId };
}

const tabOf = (id: string, ctx: ReturnType<typeof buildFixtures>) =>
  getEstimateListPipelineTab(
    ctx.items.find((it) => it.id === id) as ContractEstimatePreset,
    ctx.items,
    [],
    ctx.usageByEstimateId
  );

describe('вкладки расчётов: автоматические статусы', () => {
  it('свободный расчёт — «В работе»', () => {
    const ctx = buildFixtures([{ id: 'a', usage: 'free' }]);
    expect(tabOf('a', ctx)).toBe('active');
  });

  it('прикреплённый к неподписанному договору — «Прикреплены»', () => {
    const ctx = buildFixtures([{ id: 'a', usage: 'attached' }]);
    expect(getEstimateAttachmentStatus(ctx.items[0], ctx.usageByEstimateId)).toBe('attached');
    expect(tabOf('a', ctx)).toBe('attached');
  });

  it('прикреплённый к подписанному договору — «Подписаны»', () => {
    const ctx = buildFixtures([{ id: 'a', usage: 'signed' }]);
    expect(tabOf('a', ctx)).toBe('signed');
  });

  it('ручная пауза (deferred) бьёт прикрепление, но не подписание', () => {
    const ctx = buildFixtures([
      { id: 'paused_free', stage: 'deferred' },
      { id: 'paused_attached', stage: 'deferred', usage: 'attached' },
      { id: 'paused_signed', stage: 'deferred', usage: 'signed' },
    ]);
    expect(tabOf('paused_free', ctx)).toBe('deferred');
    expect(tabOf('paused_attached', ctx)).toBe('deferred');
    expect(tabOf('paused_signed', ctx)).toBe('signed');
  });

  it('legacy: «В перспективе» и архив трактуются как «Отложены»', () => {
    const ctx = buildFixtures([
      { id: 'old_prospect', stage: 'prospect' },
      { id: 'old_archived', archived: true },
      { id: 'old_contract', stage: 'contract' },
    ]);
    expect(tabOf('old_prospect', ctx)).toBe('deferred');
    expect(tabOf('old_archived', ctx)).toBe('deferred');
    expect(tabOf('old_contract', ctx)).toBe('active');
  });
});

describe('вкладки расчётов: связка живёт целиком', () => {
  it('связка не уходит на «Прикреплены», пока прикреплён не последний участник', () => {
    const ctx = buildFixtures([
      { id: 'anchor', bundle: 'anchor', usage: 'attached' },
      { id: 'copy', bundle: 'anchor', usage: 'free' },
    ]);
    expect(tabOf('anchor', ctx)).toBe('active');
    expect(tabOf('copy', ctx)).toBe('active');
  });

  it('связка на «Прикреплённых», когда прикреплены все', () => {
    const ctx = buildFixtures([
      { id: 'anchor', bundle: 'anchor', usage: 'attached' },
      { id: 'copy', bundle: 'anchor', usage: 'attached' },
    ]);
    expect(tabOf('anchor', ctx)).toBe('attached');
    expect(tabOf('copy', ctx)).toBe('attached');
  });

  it('связка не на «Подписаны», пока подписан не последний участник', () => {
    const ctx = buildFixtures([
      { id: 'anchor', bundle: 'anchor', usage: 'signed' },
      { id: 'copy', bundle: 'anchor', usage: 'attached' },
    ]);
    expect(tabOf('anchor', ctx)).toBe('attached');
    expect(tabOf('copy', ctx)).toBe('attached');
  });

  it('связка на «Подписаны», когда подписаны все', () => {
    const ctx = buildFixtures([
      { id: 'anchor', bundle: 'anchor', usage: 'signed' },
      { id: 'copy', bundle: 'anchor', usage: 'signed' },
    ]);
    expect(tabOf('anchor', ctx)).toBe('signed');
    expect(tabOf('copy', ctx)).toBe('signed');
  });
});
