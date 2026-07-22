'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type CeilingsPriceCategory,
  type CeilingsPriceItem,
  type CeilingsPriceListSettings,
  getCeilingsPriceList,
  putCeilingsPriceList,
} from '@/shared/api/admin-contract-document-packages';

import {
  type FabricAdminBlock,
  fabricLevelOf,
  groupFabricAdminBlocks,
} from '../../../families/product-like/ceilings/ceilingsFabricCatalog';
import {
  CEILINGS_GOODS_GROUP_ORDER,
  applyGoodsGroupMarkupToItem,
  goodsGroupOf,
  groupGoodsAdminBlocks,
  normalizeGoodsGroupMarkups,
  resolveGoodsGroupMarkup,
} from '../../../families/product-like/ceilings/ceilingsGoodsCatalog';
import {
  CEILINGS_PRICE_CATEGORIES,
  CEILINGS_PRICE_CATEGORY_LABELS,
} from '../../../families/product-like/ceilings/ceilingsPriceTypes';

function newItem(
  category: CeilingsPriceCategory,
  sortOrder: number,
  attrs?: Record<string, unknown>
): CeilingsPriceItem {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `item-${Date.now()}-${sortOrder}`;
  return {
    id,
    category,
    name: '',
    unit:
      category === 'FABRIC'
        ? 'м²'
        : category === 'TAPE' || category === 'FABRIC_EXTRA'
          ? 'м'
          : 'шт',
    purchasePrice: 0,
    markup: category === 'PROFILE' ? 1.7 : category === 'GOODS' || category === 'FABRIC' ? null : 2,
    retailPrice: 0,
    attributes: attrs ?? {},
    active: true,
    sortOrder,
  };
}

export function useCeilingsPriceListPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [category, setCategory] = useState<CeilingsPriceCategory>('FABRIC');
  const [settings, setSettings] = useState<CeilingsPriceListSettings>({
    fabricMarkup: 2,
    profileMarkup: 1.7,
    tapeMarkup: 2,
    defaultExtraMarkupPercent: 10,
    goodsGroupMarkups: normalizeGoodsGroupMarkups(),
  });
  const [items, setItems] = useState<CeilingsPriceItem[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCeilingsPriceList();
      setSettings({
        ...data.settings,
        goodsGroupMarkups: normalizeGoodsGroupMarkups(data.settings.goodsGroupMarkups),
      });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((it) => it.category === category)
      .filter((it) => !q || it.name.toLowerCase().includes(q))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
  }, [items, category, search]);

  const fabricBlocks = useMemo((): FabricAdminBlock[] => {
    if (category !== 'FABRIC') return [];
    const q = search.trim().toLowerCase();
    const source = q
      ? items.filter(
          (it) =>
            it.category === 'FABRIC' &&
            (it.name.toLowerCase().includes(q) ||
              String(it.attributes?.block ?? '')
                .toLowerCase()
                .includes(q) ||
              String(it.attributes?.series ?? '')
                .toLowerCase()
                .includes(q))
        )
      : items;
    return groupFabricAdminBlocks(source).filter((b) => b.items.length > 0);
  }, [items, category, search]);

  const goodsBlocks = useMemo(() => {
    if (category !== 'GOODS') return [];
    const q = search.trim().toLowerCase();
    const source = q
      ? items.filter(
          (it) =>
            it.category === 'GOODS' &&
            (it.name.toLowerCase().includes(q) ||
              String(it.attributes?.goodsGroup ?? '')
                .toLowerCase()
                .includes(q))
        )
      : items;
    const grouped = groupGoodsAdminBlocks(source);
    if (q) return grouped.filter((b) => b.items.length > 0);
    const byKey = new Map(grouped.map((b) => [b.key, b]));
    return CEILINGS_GOODS_GROUP_ORDER.map(
      (key) => byKey.get(key) ?? { key, title: key, items: [] }
    );
  }, [items, category, search]);

  const updateItem = (id: string, patch: Partial<CeilingsPriceItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        // Ручная правка розницы — не перезаписываем.
        if (patch.retailPrice !== undefined) return next;
        // При смене закупа или наценки пересчитываем розницу = закуп × наценка.
        if (patch.purchasePrice !== undefined || patch.markup !== undefined) {
          const purchase = Number(next.purchasePrice) || 0;
          const markup =
            next.markup != null && Number.isFinite(Number(next.markup)) && Number(next.markup) > 0
              ? Number(next.markup)
              : it.category === 'GOODS'
                ? resolveGoodsGroupMarkup(goodsGroupOf(next), settings.goodsGroupMarkups)
                : null;
          if (markup != null && markup > 0) {
            return {
              ...next,
              markup,
              retailPrice: purchase > 0 ? Math.round(purchase * markup) : 0,
            };
          }
        }
        return next;
      })
    );
  };

  const setGoodsGroupMarkup = (group: string, markupRaw: number) => {
    const markup = Number.isFinite(markupRaw) && markupRaw > 0 ? markupRaw : 1;
    setSettings((s) => ({
      ...s,
      goodsGroupMarkups: {
        ...normalizeGoodsGroupMarkups(s.goodsGroupMarkups),
        [group]: markup,
      },
    }));
    setItems((prev) =>
      prev.map((it) =>
        it.category === 'GOODS' && goodsGroupOf(it) === group
          ? applyGoodsGroupMarkupToItem(it, markup)
          : it
      )
    );
  };

  const addItem = () => {
    if (category === 'FABRIC') {
      setItems((prev) => [
        ...prev,
        newItem(category, prev.length + 1, {
          fabricLevel: 'SERIES',
          block: 'Матовый',
          texture: 'Матовый',
          series: '',
          article: '',
          hasColorOptions: false,
        }),
      ]);
      return;
    }
    if (category === 'GOODS') {
      setItems((prev) => [
        ...prev,
        newItem(category, prev.length + 1, {
          goodsGroup: 'Светильники и лампы',
          block: 'Светильники и лампы',
          priceKind: 'base',
        }),
      ]);
      return;
    }
    setItems((prev) => [...prev, newItem(category, prev.length + 1)]);
  };

  const addItemToBlock = (block: FabricAdminBlock) => {
    const level = block.level;
    const attrs: Record<string, unknown> =
      level === 'TEXTURE'
        ? { fabricLevel: 'TEXTURE', block: 'Фактуры', texture: '', article: '' }
        : level === 'SERIES'
          ? {
              fabricLevel: 'SERIES',
              block: block.key,
              texture: block.key,
              series: '',
              article: '',
              hasColorOptions: false,
              photoPrintPurchase: 0,
            }
          : {
              fabricLevel: 'COLOR',
              block: block.key,
              texture: fabricLevelOf(block.items[0]!)
                ? String(block.items[0]!.attributes.texture ?? '')
                : '',
              series: block.key,
              article: '',
              color: '',
            };
    setItems((prev) => [...prev, newItem('FABRIC', prev.length + 1, attrs)]);
  };

  const addGoodsToBlock = (group: string) => {
    const markup = resolveGoodsGroupMarkup(group, settings.goodsGroupMarkups);
    setItems((prev) => [
      ...prev,
      applyGoodsGroupMarkupToItem(
        newItem('GOODS', prev.length + 1, {
          goodsGroup: group,
          block: group,
          priceKind: markup > 1 ? 'purchase' : 'base',
        }),
        markup
      ),
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await putCeilingsPriceList({
        settings: {
          ...settings,
          goodsGroupMarkups: normalizeGoodsGroupMarkups(settings.goodsGroupMarkups),
        },
        items,
      });
      setSettings({
        ...res.settings,
        goodsGroupMarkups: normalizeGoodsGroupMarkups(res.settings.goodsGroupMarkups),
      });
      setItems(res.items);
      setSuccess(`Сохранено: ${res.items.length} позиций прайса`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    success,
    category,
    setCategory,
    categories: CEILINGS_PRICE_CATEGORIES,
    categoryLabels: CEILINGS_PRICE_CATEGORY_LABELS,
    settings,
    setSettings,
    filtered,
    fabricBlocks,
    goodsBlocks,
    search,
    setSearch,
    updateItem,
    setGoodsGroupMarkup,
    addItem,
    addItemToBlock,
    addGoodsToBlock,
    removeItem,
    save,
    reload: load,
  };
}
