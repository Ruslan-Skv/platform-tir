import type { ComponentKind, ProductComponent } from '@/shared/api/product-components';

export function getKitComponents(components: ProductComponent[]) {
  const stoikaKorobka = components.find((c) => c.kind === 'STOIKA_KOROBKI' && c.isActive) ?? null;
  const nalichnik = components.find((c) => c.kind === 'NALICHNIK' && c.isActive) ?? null;
  if (!stoikaKorobka || !nalichnik) return null;
  return { stoikaKorobka, nalichnik };
}

export function calculateKitPrice(
  canvasPrice: number,
  components: ProductComponent[]
): number | null {
  if (components.length === 0) return null;
  const kit = getKitComponents(components);
  if (!kit) return null;

  let total = canvasPrice;
  const stoikaQty = kit.stoikaKorobka.kitQuantity ?? 2.5;
  const nalichnikQty = kit.nalichnik.kitQuantity ?? 5;
  total += stoikaQty * parseFloat(kit.stoikaKorobka.price);
  total += nalichnikQty * parseFloat(kit.nalichnik.price);
  return Math.round(total);
}

export function getComponentQuantityStep(component: ProductComponent): number {
  if (component.quantityStep && component.quantityStep > 0) return component.quantityStep;
  if (component.kind === 'STOIKA_KOROBKI') return 0.5;
  return 1;
}

export function kindLabel(kind: ComponentKind): string {
  const labels: Record<ComponentKind, string> = {
    STOIKA_KOROBKI: 'Стойка коробки',
    NALICHNIK: 'Наличник',
    DOBOR: 'Добор',
    PRITVORNAYA_PLANKA: 'Притворная планка',
    KOROBKA: 'Коробка',
    OTHER: 'Прочее',
  };
  return labels[kind] ?? kind;
}
