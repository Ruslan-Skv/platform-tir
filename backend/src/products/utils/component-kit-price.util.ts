import { ResolvedProductComponent } from './component-catalog-resolve.util';

export type KitPriceBreakdownLine = {
  componentId: string | null;
  label: string;
  kind: string | 'CANVAS';
  quantity: number;
  unitPrice: number;
  total: number;
};

export type KitPriceResult = {
  canvasPrice: number;
  total: number;
  breakdown: KitPriceBreakdownLine[];
  kitComponents: {
    stoikaKorobka: ResolvedProductComponent | null;
    nalichnik: ResolvedProductComponent | null;
  };
};

export function calculateKitPrice(
  canvasPrice: number,
  components: ResolvedProductComponent[],
): KitPriceResult {
  const stoikaKorobka = components.find((c) => c.kind === 'STOIKA_KOROBKI' && c.isActive) ?? null;
  const nalichnik = components.find((c) => c.kind === 'NALICHNIK' && c.isActive) ?? null;

  const breakdown: KitPriceBreakdownLine[] = [
    {
      componentId: null,
      label: 'Полотно',
      kind: 'CANVAS',
      quantity: 1,
      unitPrice: canvasPrice,
      total: canvasPrice,
    },
  ];

  let total = canvasPrice;

  if (stoikaKorobka) {
    const qty = stoikaKorobka.kitQuantity ?? 2.5;
    const unitPrice = parseFloat(stoikaKorobka.price);
    const lineTotal = qty * unitPrice;
    breakdown.push({
      componentId: stoikaKorobka.id,
      label: buildKitLineLabel(stoikaKorobka),
      kind: 'STOIKA_KOROBKI',
      quantity: qty,
      unitPrice,
      total: lineTotal,
    });
    total += lineTotal;
  }

  if (nalichnik) {
    const qty = nalichnik.kitQuantity ?? 5;
    const unitPrice = parseFloat(nalichnik.price);
    const lineTotal = qty * unitPrice;
    breakdown.push({
      componentId: nalichnik.id,
      label: buildKitLineLabel(nalichnik),
      kind: 'NALICHNIK',
      quantity: qty,
      unitPrice,
      total: lineTotal,
    });
    total += lineTotal;
  }

  return {
    canvasPrice,
    total: Math.round(total),
    breakdown,
    kitComponents: { stoikaKorobka, nalichnik },
  };
}

function buildKitLineLabel(c: ResolvedProductComponent): string {
  const parts = [c.name, c.size, c.color].filter(Boolean);
  return parts.join(' ');
}
