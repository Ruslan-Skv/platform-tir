import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { ensureEstimateObjectGroups } from './estimateObjectGroupSync';

function preset(id: string, groupId: string | undefined, objectAddress: string) {
  return {
    id,
    ...(groupId ? { groupId } : {}),
    objectAddress,
  } as ContractEstimatePreset;
}

function group(id: string, title: string) {
  return { id, title, updatedAt: '2026-01-01T00:00:00.000Z' } as ContractEstimateGroup;
}

describe('ensureEstimateObjectGroups', () => {
  it('оставляет расчёт в группе, когда заголовок группы совпадает с адресом', () => {
    const items = [preset('est_1', 'g_addr', 'ул. Ленина, 1')];
    const groups = [group('g_addr', 'ул. Ленина, 1')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.changed).toBe(false);
    expect(res.items[0].groupId).toBe('g_addr');
    expect(res.groups).toHaveLength(1);
  });

  it('перемещает расчёт в группу нового адреса, если адрес изменился', () => {
    const items = [preset('est_1', 'g_old', 'ул. Новая, 2')];
    const groups = [group('g_old', 'ул. Старая, 1'), group('g_new', 'ул. Новая, 2')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.changed).toBe(true);
    expect(res.items[0].groupId).toBe('g_new');
    expect(res.groups).toHaveLength(2);
  });

  it('создаёт группу с адресом-заголовком, когда группы нового адреса нет', () => {
    const items = [preset('est_1', 'g_old', 'ул. Новая, 2')];
    const groups = [group('g_old', 'ул. Старая, 1')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.changed).toBe(true);
    const created = res.groups.find((g) => g.title === 'ул. Новая, 2');
    expect(created).toBeDefined();
    expect(res.items[0].groupId).toBe(created!.id);
  });

  it('не «захватывает» чужую группу: расчёты одного адреса собираются в свою группу', () => {
    // est_1 застрял в группе с посторонним заголовком, est_2 без группы — тот же адрес.
    const items = [
      preset('est_1', 'g_junk', 'ул. Правильная, 5'),
      preset('est_2', undefined, 'ул. Правильная, 5'),
    ];
    const groups = [group('g_junk', 'тестовый мусор')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.changed).toBe(true);
    const created = res.groups.find((g) => g.title === 'ул. Правильная, 5');
    expect(created).toBeDefined();
    expect(res.items[0].groupId).toBe(created!.id);
    expect(res.items[1].groupId).toBe(created!.id);
  });

  it('привязывает расчёт без группы к существующей группе своего адреса', () => {
    const items = [preset('est_1', undefined, 'ул. Ленина, 1')];
    const groups = [group('g_addr', 'ул. Ленина, 1')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.items[0].groupId).toBe('g_addr');
  });

  it('не трогает расчёт без адреса', () => {
    const items = [preset('est_1', 'g_x', '')];
    const groups = [group('g_x', 'ул. Ленина, 1')];
    const res = ensureEstimateObjectGroups(items, groups);
    expect(res.changed).toBe(false);
    expect(res.items[0].groupId).toBe('g_x');
  });
});
