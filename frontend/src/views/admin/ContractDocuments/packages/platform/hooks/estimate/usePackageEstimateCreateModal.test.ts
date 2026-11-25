/** Поле «Помещение» модалки создания/правки расчёта из пакета (см. usePackageEstimateCreateModal). */
import { act, renderHook } from '@testing-library/react';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  type QuickEstimateCategoryInput,
  buildQuickEstimatePreset,
} from '../../estimates/packageEstimateQuickCreate';
import { mergePackageFormData } from '../../form/normalize';
import { usePackageEstimateCreateModal } from './usePackageEstimateCreateModal';

jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_1' } }),
}));
jest.mock('@/shared/api/service-catalog', () => ({
  getServiceCatalogCategory: async () => ({ items: [] }),
}));
jest.mock('@/shared/lib/hooks/useServiceCatalog', () => ({
  useServiceCatalog: () => ({
    data: {
      categories: [
        { slug: 'steny', name: 'Стены' },
        { slug: 'elektrika', name: 'Электрика' },
      ],
    },
    isLoading: false,
  }),
  serviceCatalogCategoryQueryKey: (slug: string) => ['service-catalog-category', slug],
}));
jest.mock('@tanstack/react-query', () => ({ useQueries: () => [] }));
jest.mock(
  '@/views/admin/ContractDocuments/packages/pages/estimates/workspace/estimateWorkspacePersist',
  () => ({
    persistEstimateWorkspacePresets: async (items: unknown[], groups: unknown[]) => ({
      items,
      groups,
    }),
  })
);

/** Что модалка отдала пакету после сохранения. */
type SavedEstimates = { presetId: string; presets: ContractEstimatePreset[] };

function mountModal(estimatePresets: ContractEstimatePreset[] = []) {
  /** Созданные расчёты (ушли в `attachCreatedPreset`). */
  const created: SavedEstimates[] = [];
  /** Сохранённые правки (ушли в `presetUpdated`). */
  const updated: SavedEstimates[] = [];
  const base = mergePackageFormData({});
  const { result } = renderHook(() =>
    usePackageEstimateCreateModal({
      packageKind: 'REPAIR',
      signedDocsLocked: false,
      form: {
        ...base,
        customer: { ...base.customer, fullName: 'Иванов Иван' },
        object: { ...base.object, objectAddress: 'Москва, ул. Ленина, 1' },
      },
      linkedCrmCustomerId: null,
      estimatePresets,
      estimateGroups: [],
      contractEstimateObjectKey: '',
      lockedEstimatePresetIds: new Set<string>(),
      setEstimatePresets: jest.fn(),
      setEstimateGroups: jest.fn(),
      attachCreatedPreset: (presetId, presets) => {
        created.push({ presetId, presets });
      },
      presetUpdated: (presetId, presets) => {
        updated.push({ presetId, presets });
      },
    })
  );
  return { result, created, updated };
}

type ModalResult = ReturnType<typeof mountModal>['result'];

/** Доп. работа в категории — через поля модалки (позиции каталога не нужны). */
function addCustomWork(result: ModalResult, slug: string, name: string) {
  act(() => result.current.toggleCategory(slug));
  act(() => result.current.setCustomDraftField(slug, 'name', name));
  act(() => result.current.setCustomDraftField(slug, 'price', '100'));
  act(() => result.current.addCustomItem(slug));
}

async function save(result: ModalResult) {
  await act(async () => {
    await result.current.save();
  });
}

/** Имена помещений в снимке — так они попадают в смету/счёт-заказ. */
function roomNames(preset: ContractEstimatePreset): string[] {
  return (preset.snapshot?.rooms ?? []).map((room) => room.name);
}

/** Расчёт, созданный из пакета: категории с одной доп. работой и заданным помещением. */
async function quickPreset(
  title: string,
  calcNamesBySlug: Record<string, string>
): Promise<ContractEstimatePreset> {
  const categories: QuickEstimateCategoryInput[] = Object.entries(calcNamesBySlug).map(
    ([slug, calcName]) => ({
      slug,
      name: slug === 'steny' ? 'Стены' : 'Электрика',
      calcName,
      lines: [{ itemId: 'est-custom:a', quantity: 1 }],
      customItems: { 'est-custom:a': { name: 'Шпаклёвка', unit: 'шт', price: 100 } },
      customItemsNoMarkup: false,
    })
  );
  return buildQuickEstimatePreset({
    title,
    crmCustomerId: '',
    customerName: 'Иванов Иван',
    objectAddress: 'Москва, ул. Ленина, 1',
    direction: 'REPAIR',
    categories,
  });
}

/** Сохранённая правка конкретного расчёта. */
function editedPreset(saved: SavedEstimates, presetId: string): ContractEstimatePreset | undefined {
  return saved.presets.find((p) => p.id === presetId);
}

describe('usePackageEstimateCreateModal: поле «Помещение»', () => {
  it('при создании помещение поля уходит в расчёт, пустое поле — «Работы»', async () => {
    const { result, created } = mountModal();
    act(() => result.current.open());
    addCustomWork(result, 'steny', 'Шпаклёвка');
    act(() => result.current.setTitleDraft('Лоджия, расчёт'));

    await save(result);
    expect(roomNames(created[0]!.presets[0]!)).toEqual(['Работы']);

    act(() => result.current.open());
    addCustomWork(result, 'steny', 'Шпаклёвка');
    addCustomWork(result, 'elektrika', 'Розетка');
    act(() => result.current.setTitleDraft('Лоджия, расчёт'));
    act(() => result.current.setRoomDraft('  Лоджия  '));

    await save(result);
    expect(result.current.error).toBeNull();
    // Помещение одно на все категории расчёта.
    expect(roomNames(created[1]!.presets[0]!)).toEqual(['Лоджия', 'Лоджия']);
  });

  it('при правке поле заполнено текущим помещением; смена включает «Сохранить» и сохраняется', async () => {
    const preset = await quickPreset('111', { steny: 'Работы', elektrika: 'Работы' });
    const { result, updated } = mountModal([preset]);

    act(() => result.current.openEdit(preset));
    expect(result.current.roomDraft).toBe('Работы');
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setRoomDraft('Лоджия'));
    expect(result.current.isDirty).toBe(true);

    await save(result);
    expect(roomNames(editedPreset(updated[0]!, preset.id)!)).toEqual(['Лоджия', 'Лоджия']);
  });

  it('очищенное поле в правке возвращает «Работы»; другое изменение помещение не трогает', async () => {
    const preset = await quickPreset('Кухня', { steny: 'Кухня' });

    const cleared = mountModal([preset]);
    act(() => cleared.result.current.openEdit(preset));
    act(() => cleared.result.current.setRoomDraft(''));
    await save(cleared.result);
    expect(roomNames(editedPreset(cleared.updated[0]!, preset.id)!)).toEqual(['Работы']);

    // Помещение не меняли — поменяли количество: помещение прежнее.
    const touched = mountModal([preset]);
    act(() => touched.result.current.openEdit(preset));
    act(() => touched.result.current.setQuantity('steny', 'est-custom:a', '3'));
    expect(touched.result.current.roomDraft).toBe('Кухня');
    await save(touched.result);
    expect(roomNames(editedPreset(touched.updated[0]!, preset.id)!)).toEqual(['Кухня']);
  });

  it('в категориях разные помещения: поле пустое, имена сохраняются, пока его не заполнят', async () => {
    const preset = await quickPreset('Разные', { steny: 'Кухня', elektrika: 'Ванная' });

    const untouched = mountModal([preset]);
    act(() => untouched.result.current.openEdit(preset));
    expect(untouched.result.current.roomDraft).toBe('');
    act(() => untouched.result.current.setQuantity('steny', 'est-custom:a', '2'));
    await save(untouched.result);
    expect(roomNames(editedPreset(untouched.updated[0]!, preset.id)!)).toEqual(['Кухня', 'Ванная']);

    // Заполнили поле — оно задаёт помещение обеим категориям.
    const filled = mountModal([preset]);
    act(() => filled.result.current.openEdit(preset));
    act(() => filled.result.current.setRoomDraft('Санузел'));
    await save(filled.result);
    expect(roomNames(editedPreset(filled.updated[0]!, preset.id)!)).toEqual(['Санузел', 'Санузел']);
  });
});
