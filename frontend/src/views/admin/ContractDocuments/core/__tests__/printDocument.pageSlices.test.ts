import { computePdfPageSlices } from '@/views/admin/ContractDocuments/core/printDocument';

/** A4 портрет: 190×277 мм области контента при полях 10 мм; канвас 1558 px (2×CSS). */
const PX_PER_MM = 1558 / 190;
const PAGE_PX = 277 * PX_PER_MM; // ≈ 2271.7

describe('computePdfPageSlices (нарезка канваса на страницы без дублей)', () => {
  it('полосы стыкуются без зазоров и пересечений и покрывают весь канвас', () => {
    const height = Math.round(PAGE_PX * 3 + 815); // 3 полные + хвост
    const slices = computePdfPageSlices(height, 277, PX_PER_MM);
    expect(slices).toHaveLength(4);
    // Начало первой полосы — от верха канваса.
    expect(slices[0]!.topPx).toBe(0);
    for (let i = 1; i < slices.length; i++) {
      // Конец предыдущей == началу следующей: ни дублей, ни пропусков.
      expect(slices[i]!.topPx).toBe(slices[i - 1]!.topPx + slices[i - 1]!.heightPx);
    }
    // Вместе — весь канвас.
    const total = slices.reduce((sum, s) => sum + s.heightPx, 0);
    expect(total).toBe(height);
    // Последняя страница короче полной.
    expect(slices[3]!.heightPx).toBeLessThan(PAGE_PX);
    // Все полосы, кроме последней, полной высоты.
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(slices[i]!.heightPx - PAGE_PX)).toBeLessThanOrEqual(1);
    }
  });

  it('канвас ниже одной страницы даёт одну полосу во всю высоту', () => {
    const slices = computePdfPageSlices(1200, 277, PX_PER_MM);
    expect(slices).toHaveLength(1);
    expect(slices[0]).toEqual({ topPx: 0, heightPx: 1200 });
  });

  it('высота, кратная странице, не порождает пустую последнюю страницу', () => {
    const height = Math.round(PAGE_PX * 2);
    const slices = computePdfPageSlices(height, 277, PX_PER_MM);
    expect(slices).toHaveLength(2);
    const total = slices.reduce((sum, s) => sum + s.heightPx, 0);
    expect(total).toBe(height);
  });

  it('некорректные параметры дают пустой список', () => {
    expect(computePdfPageSlices(0, 277, PX_PER_MM)).toEqual([]);
    expect(computePdfPageSlices(1000, 0, PX_PER_MM)).toEqual([]);
    expect(computePdfPageSlices(1000, 277, 0)).toEqual([]);
  });
});
