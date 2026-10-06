import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { getLinkedCopyDisabledReason } from './estimateSplitBundle';
import {
  estimateSnapshotRoomsFingerprint,
  findSplitBundleSnapshotMismatches,
} from './estimateWorkScopeTree';

function snapshot(total: number, lineName: string, amount: number) {
  return {
    total,
    rooms: [
      {
        name: 'Комната 1',
        total,
        lines: [
          { name: lineName, unit: 'п.м.', quantity: 1, price: amount, amount, itemId: 'item_1' },
        ],
      },
    ],
  };
}

function presetWith(fields: Partial<ContractEstimatePreset>): ContractEstimatePreset {
  return {
    id: 'est_a',
    title: 'Расчёт А',
    categorySlug: 'elektrika',
    categoryName: 'Электромонтажные работы',
    calculatorDraft: '',
    objectAddress: 'Мурманск, Кольский, 13к2-3',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...fields,
  } as ContractEstimatePreset;
}

const copyOptions = { archiveView: false, hasLockedUsage: false };

describe('estimateSnapshotRoomsFingerprint', () => {
  it('совпадает для одинакового состава и не зависит от итоговой суммы', () => {
    const a = presetWith({ snapshot: snapshot(1000, 'Проводка кабеля', 1000) });
    const b = presetWith({ snapshot: snapshot(2000, 'Проводка кабеля', 1000) });
    expect(estimateSnapshotRoomsFingerprint(a)).toBe(estimateSnapshotRoomsFingerprint(b));
  });

  it('различается при другом составе позиций', () => {
    const a = presetWith({ snapshot: snapshot(1000, 'Проводка кабеля', 1000) });
    const b = presetWith({ snapshot: snapshot(1000, 'Штробление стен', 1000) });
    expect(estimateSnapshotRoomsFingerprint(a)).not.toBe(estimateSnapshotRoomsFingerprint(b));
  });
});

describe('findSplitBundleSnapshotMismatches', () => {
  it('пусто, когда связка из копий одной сметы', () => {
    const anchor = presetWith({
      id: 'est_a',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
      estimateWorkScopeKeys: ['wsl:0:0'],
    });
    const copy = presetWith({
      id: 'est_b',
      title: 'Расчёт Б',
      splitBundleId: 'est_a',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
      estimateWorkScopeKeys: [],
    });
    expect(findSplitBundleSnapshotMismatches(anchor, [anchor, copy])).toEqual([]);
  });

  it('находит участников с другим составом сметы', () => {
    const anchor = presetWith({
      id: 'est_a',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
      estimateWorkScopeKeys: ['wsl:0:0'],
    });
    const alien = presetWith({
      id: 'est_c',
      title: 'Чужая смета',
      splitBundleId: 'est_a',
      snapshot: snapshot(5000, 'Укладка плитки', 5000),
    });
    expect(findSplitBundleSnapshotMismatches(anchor, [anchor, alien])).toEqual([alien]);
  });
});

describe('getLinkedCopyDisabledReason: связка — только копии одной сметы', () => {
  const base = {
    categorySlug: 'elektrika',
    objectAddress: 'Мурманск, Кольский, 13к2-3',
  };

  it('блокирует добавление в связку с чужим составом (в эту же связку)', () => {
    const anchor = presetWith({
      ...base,
      id: 'est_a',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
      estimateWorkScopeKeys: ['wsl:0:0'],
    });
    const alien = presetWith({
      ...base,
      id: 'est_c',
      title: 'Чужая смета',
      splitBundleId: 'est_a',
      snapshot: snapshot(5000, 'Укладка плитки', 5000),
    });
    const reason = getLinkedCopyDisabledReason(
      anchor,
      [anchor, alien],
      { mode: 'same' },
      copyOptions
    );
    expect(reason).toContain('копий одной сметы');
    expect(reason).toContain('Чужая смета');
  });

  it('блокирует добавление копии в чужую связку (join)', () => {
    const focus = presetWith({
      ...base,
      id: 'est_x',
      title: 'Электрика',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
    });
    const bundleMember = presetWith({
      ...base,
      id: 'est_m',
      title: 'Смета плитки',
      splitBundleId: 'est_m',
      estimateWorkScopeKeys: ['wsl:0:0'],
      snapshot: snapshot(5000, 'Укладка плитки', 5000),
    });
    const reason = getLinkedCopyDisabledReason(
      focus,
      [focus, bundleMember],
      { mode: 'join', bundleId: 'est_m' },
      copyOptions
    );
    expect(reason).toContain('копий одной сметы');
    expect(reason).toContain('Смета плитки');
  });

  it('разрешает join при совпадающем составе', () => {
    const focus = presetWith({
      ...base,
      id: 'est_x',
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
    });
    const bundleMember = presetWith({
      ...base,
      id: 'est_m',
      splitBundleId: 'est_m',
      estimateWorkScopeKeys: ['wsl:0:0'],
      snapshot: snapshot(1000, 'Проводка кабеля', 1000),
    });
    expect(
      getLinkedCopyDisabledReason(
        focus,
        [focus, bundleMember],
        { mode: 'join', bundleId: 'est_m' },
        copyOptions
      )
    ).toBeNull();
  });
});
