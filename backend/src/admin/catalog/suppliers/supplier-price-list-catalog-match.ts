import type { PrismaService } from '../../../database/prisma.service';
import { normalizePriceListText } from './parsers/stroykom-price-list.parser';

export type CatalogCandidate = {
  catalogItemId: string;
  label: string;
  seriesName: string;
  subgroupName: string;
  kindCode: string;
  size: string | null;
  color: string | null;
  price: number;
};

export async function loadCatalogCandidates(
  prisma: PrismaService,
  supplierId: string,
): Promise<CatalogCandidate[]> {
  const series = await prisma.componentCatalogSeries.findMany({
    where: { supplierId },
    include: {
      subgroups: {
        include: {
          items: {
            include: {
              catalogItem: {
                include: { kindRef: { select: { code: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const candidates: CatalogCandidate[] = [];
  for (const s of series) {
    for (const subgroup of s.subgroups) {
      for (const gi of subgroup.items) {
        const item = gi.catalogItem;
        candidates.push({
          catalogItemId: item.id,
          label: [item.name, item.size, item.color].filter(Boolean).join(' · '),
          seriesName: s.name,
          subgroupName: subgroup.name,
          kindCode: item.kindRef.code,
          size: item.size,
          color: item.color ?? subgroup.name,
          price: Number(item.price),
        });
      }
    }
  }
  return candidates;
}

function detectKindCode(itemName: string): string | null {
  const n = normalizePriceListText(itemName);
  if (n.includes('стойка')) return 'STOIKA_KOROBKI';
  if (n.includes('наличник')) return 'NALICHNIK';
  if (n.includes('добор')) return 'DOBOR';
  if (n.includes('притвор')) return 'PRITVORNAYA_PLANKA';
  return null;
}

function normalizeSize(size: string | null): string {
  if (!size) return '';
  const nums = size.match(/\d+/g);
  return nums ? nums.join('x') : normalizePriceListText(size);
}

function sizeMatches(priceListSize: string, catalogSize: string | null): boolean {
  const a = normalizeSize(priceListSize);
  const b = normalizeSize(catalogSize);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

export function findCatalogMatch(
  row: {
    blockTitle: string;
    color: string;
    itemName: string;
    size: string | null;
    variantNote: string | null;
    rowKey: string;
  },
  candidates: CatalogCandidate[],
): CatalogCandidate | null {
  const kindCode = detectKindCode(row.itemName);
  if (!kindCode) return null;

  const normalizedColor = normalizePriceListText(row.color);
  const normalizedSize = normalizeSize(row.size);
  const normalizedBlock = normalizePriceListText(row.blockTitle);
  const normalizedVariant = normalizePriceListText(row.variantNote ?? '');

  const scored = candidates
    .map((candidate) => {
      if (candidate.kindCode !== kindCode) return null;
      if (!sizeMatches(normalizedSize, candidate.size)) return null;

      const subgroupNorm = normalizePriceListText(candidate.subgroupName);
      const itemColorNorm = normalizePriceListText(candidate.color ?? '');
      const colorMatch =
        subgroupNorm.includes(normalizedColor) ||
        normalizedColor.includes(subgroupNorm) ||
        itemColorNorm.includes(normalizedColor) ||
        normalizedColor.includes(itemColorNorm);
      if (!colorMatch) return null;

      let score = 10;
      const seriesNorm = normalizePriceListText(candidate.seriesName);
      if (seriesNorm && normalizedBlock) {
        const blockTokens = normalizedBlock.split(' ').filter((t) => t.length > 3);
        const matchedTokens = blockTokens.filter(
          (t) => seriesNorm.includes(t) || normalizedBlock.includes(seriesNorm),
        );
        score += matchedTokens.length * 2;
      }

      if (normalizedVariant) {
        const subgroupHasVariant =
          subgroupNorm.includes(normalizedVariant) ||
          normalizePriceListText(candidate.subgroupName).includes('телескоп') ===
            normalizedVariant.includes('телескоп');
        if (subgroupHasVariant) score += 5;
      }

      return { candidate, score };
    })
    .filter((x): x is { candidate: CatalogCandidate; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].candidate;
}
