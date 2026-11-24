import type { EstimateSnapshotRoom } from './applyEstimatePresetIds';
import {
  DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE,
  buildEstimateRoomSections,
  pinPackageEstimatePreviewGroupMode,
  readStoredEstimatePreviewGroupMode,
  readStoredPackageEstimatePreviewGroupMode,
  storeEstimatePreviewGroupMode,
  storePackageEstimatePreviewGroupMode,
  subscribeEstimatePreviewGroupMode,
  subscribePackageEstimatePreviewGroupMode,
} from './estimatePreviewGrouping';
import type { EstimateEmbedSection } from './packageEstimateDocPrintEmbedHtml';

function room(name: string, total: number): EstimateSnapshotRoom {
  return { name, total, lines: [] };
}

function section(categoryName: string, rooms: EstimateSnapshotRoom[]): EstimateEmbedSection {
  return { categoryName, rooms };
}

describe('buildEstimateRoomSections', () => {
  it('склеивает одноимённые помещения разных категорий в одно помещение', () => {
    const sections = [
      section('Демонтаж', [room('Кухня', 100), room('Санузел', 50)]),
      section('Сантехника', [room('Кухня', 200), room('Ванная', 80)]),
    ];

    const roomSections = buildEstimateRoomSections(sections);

    expect(roomSections.map((r) => r.roomName)).toEqual(['Кухня', 'Санузел', 'Ванная']);
    expect(roomSections[0]).toMatchObject({ roomName: 'Кухня', total: 300 });
    expect(roomSections[0]!.categories.map((c) => c.categoryName)).toEqual([
      'Демонтаж',
      'Сантехника',
    ]);
    expect(roomSections[2]).toMatchObject({ roomName: 'Ванная', total: 80 });
  });

  it('не различает регистр и пробелы в названиях помещений', () => {
    const sections = [
      section('Демонтаж', [room('  кухня ', 10)]),
      section('Электрика', [room('Кухня', 20)]),
    ];

    const [roomSection] = buildEstimateRoomSections(sections);

    expect(roomSection?.roomName).toBe('кухня');
    expect(roomSection?.total).toBe(30);
  });

  it('подставляет «Помещение» для пустого названия', () => {
    const [roomSection] = buildEstimateRoomSections([section('Демонтаж', [room('   ', 5)])]);

    expect(roomSection?.roomName).toBe('Помещение');
  });

  it('возвращает пустой массив без секций', () => {
    expect(buildEstimateRoomSections([])).toEqual([]);
  });
});

describe('readStoredEstimatePreviewGroupMode', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('по умолчанию — первично по помещениям', () => {
    expect(readStoredEstimatePreviewGroupMode()).toBe(DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE);
    expect(DEFAULT_ESTIMATE_PREVIEW_GROUP_MODE).toBe('byRooms');
  });

  it('читает сохранённый вариант «первично по категориям»', () => {
    window.localStorage.setItem('admin_estimates_preview_group_mode_v1', 'byCategories');
    expect(readStoredEstimatePreviewGroupMode()).toBe('byCategories');
  });

  it('игнорирует неизвестные значения', () => {
    window.localStorage.setItem('admin_estimates_preview_group_mode_v1', 'nonsense');
    expect(readStoredEstimatePreviewGroupMode()).toBe('byRooms');
  });
});

describe('настройка конкретного договора (packageScope)', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('без своей настройки наследует общую (раздел «Расчёты»)', () => {
    window.localStorage.setItem('admin_estimates_preview_group_mode_v1', 'byCategories');
    expect(readStoredPackageEstimatePreviewGroupMode('pkg_a')).toBe('byCategories');
  });

  it('своя настройка договора независима от общей и от других договоров', () => {
    window.localStorage.setItem('admin_estimates_preview_group_mode_v1', 'byCategories');
    storePackageEstimatePreviewGroupMode('pkg_a', 'byRooms');

    expect(readStoredPackageEstimatePreviewGroupMode('pkg_a')).toBe('byRooms');
    // Другой договор и общая настройка не изменились.
    expect(readStoredPackageEstimatePreviewGroupMode('pkg_b')).toBe('byCategories');
    expect(readStoredEstimatePreviewGroupMode()).toBe('byCategories');
  });

  it('подписка договора реагирует на свою смену, но не на чужую', () => {
    const seenA: string[] = [];
    const seenB: string[] = [];
    const unsubA = subscribePackageEstimatePreviewGroupMode('pkg_a', (m) => seenA.push(m));
    const unsubB = subscribePackageEstimatePreviewGroupMode('pkg_b', (m) => seenB.push(m));

    storePackageEstimatePreviewGroupMode('pkg_a', 'byCategories');
    expect(seenA).toEqual(['byCategories']);
    expect(seenB).toEqual([]);

    unsubA();
    unsubB();
  });

  it('подписка договора без своей настройки следует общей, с настройкой — нет', () => {
    const seen: string[] = [];
    const unsub = subscribePackageEstimatePreviewGroupMode('pkg_a', (m) => seen.push(m));

    storeEstimatePreviewGroupMode('byCategories');
    expect(seen).toEqual(['byCategories']);

    storePackageEstimatePreviewGroupMode('pkg_a', 'byRooms');
    storeEstimatePreviewGroupMode('byRooms');
    expect(seen).toEqual(['byCategories', 'byRooms']);

    unsub();
  });

  it('фиксация: унаследованный вариант становится настройкой договора — общая больше не влияет', () => {
    window.localStorage.setItem('admin_estimates_preview_group_mode_v1', 'byCategories');

    pinPackageEstimatePreviewGroupMode('pkg_a');

    storeEstimatePreviewGroupMode('byRooms');
    expect(readStoredPackageEstimatePreviewGroupMode('pkg_a')).toBe('byCategories');
    // Другой договор по-прежнему наследует общую настройку.
    expect(readStoredPackageEstimatePreviewGroupMode('pkg_b')).toBe('byRooms');
  });

  it('фиксация: не перезаписывает свою настройку договора', () => {
    storePackageEstimatePreviewGroupMode('pkg_a', 'byCategories');

    pinPackageEstimatePreviewGroupMode('pkg_a');

    expect(readStoredPackageEstimatePreviewGroupMode('pkg_a')).toBe('byCategories');
  });

  it('фиксация: не уведомляет подписчиков — вариант не меняется', () => {
    const seen: string[] = [];
    const unsub = subscribePackageEstimatePreviewGroupMode('pkg_a', (m) => seen.push(m));

    pinPackageEstimatePreviewGroupMode('pkg_a');

    expect(seen).toEqual([]);
    unsub();
  });

  it('общая подписка (раздел «Расчёты») игнорирует смены в договорах', () => {
    const seen: string[] = [];
    const unsub = subscribeEstimatePreviewGroupMode((m) => seen.push(m));

    storePackageEstimatePreviewGroupMode('pkg_a', 'byCategories');
    expect(seen).toEqual([]);

    storeEstimatePreviewGroupMode('byCategories');
    expect(seen).toEqual(['byCategories']);

    unsub();
  });
});
