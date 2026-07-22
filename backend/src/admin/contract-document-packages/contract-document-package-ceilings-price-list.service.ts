import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CeilingsPriceItemDto,
  CeilingsPriceListSettingsDto,
  SetCeilingsPriceListDto,
} from './dto/set-ceilings-price-list.dto';

export const CEILINGS_PRICE_LIST_TAB = 'ceilings_price_list';

const DEFAULT_GOODS_GROUP_MARKUPS: Record<string, number> = {
  'Светильники и лампы': 1,
  'Светодиодная лента и комплектующие к ней': 1,
  'Световые линии с комплектующими': 1.8,
  Гардины: 1.8,
  Карнизы: 1,
};

const DEFAULT_SETTINGS: Required<CeilingsPriceListSettingsDto> = {
  fabricMarkup: 2,
  profileMarkup: 1.7,
  tapeMarkup: 2,
  defaultExtraMarkupPercent: 10,
  goodsGroupMarkups: { ...DEFAULT_GOODS_GROUP_MARKUPS },
};

function normalizeGoodsGroupMarkups(raw?: Record<string, number> | null): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_GOODS_GROUP_MARKUPS };
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      const n = Number(value);
      if (key.trim() && Number.isFinite(n) && n >= 0) out[key] = n;
    }
  }
  return out;
}

function normalizeSettings(
  raw?: Partial<CeilingsPriceListSettingsDto> | null,
): Required<CeilingsPriceListSettingsDto> {
  return {
    ...DEFAULT_SETTINGS,
    ...(raw ?? {}),
    goodsGroupMarkups: normalizeGoodsGroupMarkups(raw?.goodsGroupMarkups),
  };
}

type CeilingsPriceListBlob = {
  settings: Required<CeilingsPriceListSettingsDto>;
  items: CeilingsPriceItemDto[];
};

@Injectable()
export class ContractDocumentPackageCeilingsPriceListService {
  constructor(private readonly prisma: PrismaService) {}

  async getPriceList() {
    const blob = await this.loadBlob();
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: {
          kind: ContractDocumentPackageKind.CEILINGS,
          tab: CEILINGS_PRICE_LIST_TAB,
        },
      },
      select: { updatedAt: true },
    });
    return {
      kind: ContractDocumentPackageKind.CEILINGS,
      settings: blob.settings,
      items: blob.items,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setPriceList(dto: SetCeilingsPriceListDto, updatedById?: string) {
    const settings = normalizeSettings(dto.settings);
    const items = (dto.items ?? []).map((item, index) => this.normalizeItem(item, index));
    const payload = JSON.stringify({ settings, items } satisfies CeilingsPriceListBlob);
    await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: {
          kind: ContractDocumentPackageKind.CEILINGS,
          tab: CEILINGS_PRICE_LIST_TAB,
        },
      },
      create: {
        kind: ContractDocumentPackageKind.CEILINGS,
        tab: CEILINGS_PRICE_LIST_TAB,
        html: payload,
        updatedById: updatedById ?? null,
      },
      update: {
        html: payload,
        updatedById: updatedById ?? null,
      },
      select: { id: true },
    });
    return this.getPriceList();
  }

  private async loadBlob(): Promise<CeilingsPriceListBlob> {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: {
          kind: ContractDocumentPackageKind.CEILINGS,
          tab: CEILINGS_PRICE_LIST_TAB,
        },
      },
      select: { html: true },
    });
    if (!row?.html?.trim()) {
      return { settings: normalizeSettings(), items: [] };
    }
    try {
      const parsed = JSON.parse(row.html) as Partial<CeilingsPriceListBlob>;
      return {
        settings: normalizeSettings(parsed.settings),
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item, index) =>
              this.normalizeItem(item as CeilingsPriceItemDto, index),
            )
          : [],
      };
    } catch {
      return { settings: normalizeSettings(), items: [] };
    }
  }

  private normalizeItem(item: CeilingsPriceItemDto, index: number): CeilingsPriceItemDto {
    const purchasePrice = Number(item.purchasePrice) || 0;
    const markup =
      item.markup === null || item.markup === undefined
        ? null
        : Number.isFinite(Number(item.markup))
          ? Number(item.markup)
          : null;
    let retailPrice = Number(item.retailPrice);
    if (!Number.isFinite(retailPrice) || retailPrice < 0) {
      retailPrice =
        markup != null && markup > 0 ? Math.round(purchasePrice * markup) : purchasePrice;
    }
    return {
      id: String(item.id || `item-${index + 1}`),
      category: item.category,
      name: String(item.name ?? '').trim() || `Позиция ${index + 1}`,
      unit: String(item.unit ?? 'шт').trim() || 'шт',
      purchasePrice,
      markup,
      retailPrice,
      attributes:
        item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
          ? item.attributes
          : {},
      active: item.active !== false,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    };
  }
}
