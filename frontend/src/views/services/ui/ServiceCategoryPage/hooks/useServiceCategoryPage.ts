'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { cancelOrderByCustomer, getUserOrder } from '@/shared/api/user-orders';
import { apiFetch } from '@/shared/lib/api-fetch';
import { isAuthRequiredForCartError } from '@/shared/lib/cart-auth-required';
import { useApprovedOrderGuard } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { useCart } from '@/shared/lib/hooks';
import { useServiceCatalogCategory } from '@/shared/lib/hooks/useServiceCatalog';
import {
  ESTIMATE_CUSTOM_WORK_UNITS,
  type EstimateCalculatorDraftCustomItems,
  createEstimateCustomItemId,
  mergeCalculateResultWithCustomLines,
  parseCustomWorkFormInput,
  splitDraftLineItems,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateCustomWorkItems';

import type { ServiceCategoryPageProps } from '../service-category-page.types';
import {
  API_URL,
  type CalculateResult,
  type CalculatorDraft,
  type CalculatorLine,
  type CategoryItemSection,
  type ServiceCatalogItem,
  addCancelledOrderId,
  addDetachedServiceCategory,
  decodeRoomsParam,
  getCancelledOrderIds,
  getTableSectionsForData,
  hydrateCalculatorDraftFromStorage,
  newCalcId,
  parsePresetParam,
  readCollapsedWorkGroupKeysFromStorage,
  removeCancelledOrderId,
  removeDetachedServiceCategory,
  workGroupKey,
  writeCalculatorDraftToStorage,
  writeCollapsedWorkGroupKeysToStorage,
} from '../service-category-page.utils';

export function useServiceCategoryPage({
  slug,
  hideAddToCart = false,
  hideBreadcrumbs = false,
  hideTitleBlock = false,
  allowCustomWorkItems = false,
}: ServiceCategoryPageProps) {
  const searchParams = useSearchParams();
  const roomsParam = searchParams.get('rooms');
  const orderIdParam = searchParams.get('orderId');
  const { addServiceToCart, refreshCart, cartServiceItems, removeCartServiceItemById } = useCart();
  const guard = useApprovedOrderGuard();
  const { data, isLoading: categoryLoading } = useServiceCatalogCategory(slug);
  const showCategoryLoading = categoryLoading && !data;
  const [calculations, setCalculations] = useState<CalculatorDraft[]>(() => [
    {
      id: newCalcId(),
      name: 'Помещение 1',
      lines: [],
      result: null,
      loading: false,
      collapsed: false,
    },
  ]);
  const [activeCalcId, setActiveCalcId] = useState<string>(calculations[0]?.id ?? '');
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [detachedFromCart, setDetachedFromCart] = useState(false);
  const [lastAddedTotal, setLastAddedTotal] = useState<number | null>(null);
  const [presetInCart, setPresetInCart] = useState(false);
  const [detachConfirmOpen, setDetachConfirmOpen] = useState(false);
  const detachResolverRef = useRef<((value: boolean) => void) | null>(null);
  const [pendingReviewConfirmOpen, setPendingReviewConfirmOpen] = useState(false);
  const pendingReviewResolverRef = useRef<((value: boolean) => void) | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  /** Ключи `slug::index` свёрнутых блоков видов работ по группам */
  const [collapsedWorkGroupKeys, setCollapsedWorkGroupKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [draftCustomItems, setDraftCustomItems] = useState<EstimateCalculatorDraftCustomItems>({});
  const [customWorkName, setCustomWorkName] = useState('');
  const [customWorkUnit, setCustomWorkUnit] = useState<string>(ESTIMATE_CUSTOM_WORK_UNITS[2]);
  const [customWorkPrice, setCustomWorkPrice] = useState('');
  const [customWorkError, setCustomWorkError] = useState<string | null>(null);
  /** Пока true — не пишем черновик в localStorage (первая гидрация URL/хранилища). */
  const skipPersistCalculatorDraftRef = useRef(true);
  const prevSlugForCalculatorRef = useRef<string | null>(null);

  /*
   * Свёрнутые группы: одна синхронная фаза — чтение из LS + пересечение с актуальными секциями.
   * Запись при клике — сразу в storage (без отложенного useEffect), иначе при уходе со страницы данные не успевают сохраниться.
   */
  useLayoutEffect(() => {
    if (!data || data.slug !== slug) return;
    const sections = getTableSectionsForData(data);
    if (sections.length === 0) {
      setCollapsedWorkGroupKeys(new Set());
      return;
    }
    const valid = new Set(sections.map((s, i) => workGroupKey(s, i)));
    const stored = readCollapsedWorkGroupKeysFromStorage(slug);
    const next = new Set<string>();
    for (const k of stored) {
      if (valid.has(k)) next.add(k);
    }
    setCollapsedWorkGroupKeys(next);
  }, [slug, data]);

  useEffect(() => {
    let cancelled = false;
    if (!orderIdParam) {
      setOrderStatus(null);
      return;
    }
    getUserOrder(orderIdParam)
      .then((order) => {
        if (!cancelled) setOrderStatus(order.status ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrderStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderIdParam]);

  useEffect(() => {
    setDetachedFromCart(false);
    setLastAddedTotal(null);
    setPresetInCart(false);
  }, [slug, roomsParam]);

  useEffect(() => {
    if (!roomsParam || !data || detachedFromCart) return;
    if (orderIdParam && getCancelledOrderIds().includes(orderIdParam)) {
      setPresetInCart(false);
      return;
    }
    setPresetInCart(true);
    const cartItem = cartServiceItems.find(
      (item) => item.serviceCatalogCategoryId === data.id || item.category?.id === data.id
    );
    if (cartItem) {
      setLastAddedTotal(cartItem.total != null ? Number(cartItem.total) : null);
    }
  }, [roomsParam, data, cartServiceItems, detachedFromCart, orderIdParam]);

  useEffect(() => {
    if (!roomsParam || !data) return;
    const hasCartItem = cartServiceItems.some(
      (item) => item.serviceCatalogCategoryId === data.id || item.category?.id === data.id
    );
    if (hasCartItem || !presetInCart) return;
    const total = calculations.reduce(
      (sum, calc) =>
        sum + calc.lines.reduce((roomSum, line) => roomSum + line.price * line.quantity, 0),
      0
    );
    if (!Number.isNaN(total)) setLastAddedTotal(total);
  }, [roomsParam, data, cartServiceItems, calculations, presetInCart]);

  /** Предустановка из URL (?rooms= / ?preset=), иначе — черновик из localStorage. */
  const presetRaw = searchParams.get('preset');
  useLayoutEffect(() => {
    if (!data || data.slug !== slug) return;

    const roomPresets = decodeRoomsParam(roomsParam);
    if (roomPresets.length > 0) {
      const idToItem = new Map(data.items.map((i) => [i.id, i]));
      const nextCalculations = roomPresets.map((room, idx) => {
        const lines: CalculatorLine[] = [];
        for (const { itemId, quantity } of room.items) {
          const item = idToItem.get(itemId);
          if (item && item.price !== undefined) {
            lines.push({
              itemId: item.id,
              name: item.name,
              unit: item.unit,
              price: item.price,
              quantity,
            });
          }
        }
        return {
          id: newCalcId(),
          name: room.name || `Помещение ${idx + 1}`,
          lines,
          result: null,
          loading: false,
          collapsed: false,
        };
      });
      if (nextCalculations.length > 0) {
        setCalculations(nextCalculations);
        setActiveCalcId(nextCalculations[0].id);
      }
      skipPersistCalculatorDraftRef.current = false;
      return;
    }

    const presetItems = parsePresetParam(presetRaw);
    if (presetItems.length > 0) {
      const idToItem = new Map(data.items.map((i) => [i.id, i]));
      const lines: CalculatorLine[] = [];
      for (const { itemId, quantity } of presetItems) {
        const item = idToItem.get(itemId);
        if (item && item.price !== undefined) {
          lines.push({
            itemId: item.id,
            name: item.name,
            unit: item.unit,
            price: item.price,
            quantity,
          });
        }
      }
      if (lines.length > 0) {
        setCalculations((prev) => {
          if (prev.length === 0) {
            const id = newCalcId();
            setActiveCalcId(id);
            return [
              {
                id,
                name: 'Помещение 1',
                lines,
                result: null,
                loading: false,
                collapsed: false,
              },
            ];
          }
          return prev.map((calc, index) => (index === 0 ? { ...calc, lines, result: null } : calc));
        });
        skipPersistCalculatorDraftRef.current = false;
        return;
      }
    }

    const restored = hydrateCalculatorDraftFromStorage(slug, data);
    if (restored) {
      setCalculations(restored.calculations);
      setActiveCalcId(restored.activeCalcId);
      setDraftCustomItems(restored.customItems);
    } else {
      setDraftCustomItems({});
    }
    skipPersistCalculatorDraftRef.current = false;
  }, [data, presetRaw, roomsParam, slug]);

  useEffect(() => {
    if (!data || data.slug !== slug) return;
    if (skipPersistCalculatorDraftRef.current) return;
    writeCalculatorDraftToStorage(slug, calculations, activeCalcId, draftCustomItems);
  }, [slug, data?.id, calculations, activeCalcId, draftCustomItems]);

  useEffect(() => {
    if (!activeCalcId && calculations.length > 0) {
      setActiveCalcId(calculations[0].id);
    }
  }, [activeCalcId, calculations]);

  const requireDetachFromCart = async () => {
    if (!data || detachedFromCart) return true;
    const cartItem = cartServiceItems.find(
      (item) => item.serviceCatalogCategoryId === data.id || item.category?.id === data.id
    );
    if (!cartItem && !presetInCart) return true;
    const isApprovedOrderEdit = Boolean(
      orderIdParam && guard.approvedOrder && guard.approvedOrder.id === orderIdParam
    );
    const isPendingReviewEdit = Boolean(orderIdParam && orderStatus === 'PENDING_REVIEW');
    let skipDetachConfirm = false;
    const guardOk = await guard.confirmBeforeCartChange(async () => {}, isApprovedOrderEdit);
    if (!guardOk && isApprovedOrderEdit) return false;
    if (isPendingReviewEdit) {
      const pendingOk = await new Promise<boolean>((resolve) => {
        pendingReviewResolverRef.current = resolve;
        setPendingReviewConfirmOpen(true);
      });
      if (!pendingOk) return false;
      skipDetachConfirm = true;
    }
    if (isApprovedOrderEdit) {
      skipDetachConfirm = true;
    }
    if (!skipDetachConfirm) {
      const detachOk = await new Promise<boolean>((resolve) => {
        detachResolverRef.current = resolve;
        setDetachConfirmOpen(true);
      });
      if (!detachOk) return false;
    }
    try {
      if (orderIdParam && !getCancelledOrderIds().includes(orderIdParam)) {
        if (!isApprovedOrderEdit) {
          await cancelOrderByCustomer(orderIdParam);
        }
        addCancelledOrderId(orderIdParam);
      }
      if (cartItem) {
        await removeCartServiceItemById(cartItem.id);
        await refreshCart();
      }
      if (orderIdParam) {
        if (data?.slug) addDetachedServiceCategory(orderIdParam, data.slug, data.name);
      }
      setDetachedFromCart(true);
      setPresetInCart(false);
      setLastAddedTotal(null);
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить расчёт из корзины');
      return false;
    }
  };

  const addToCalculator = async (item: ServiceCatalogItem) => {
    if (item.price === undefined) return;
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    const targetId = activeCalcId || calculations[0]?.id;
    if (!targetId) return;
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.id !== targetId) return calc;
        const existing = calc.lines.find((l) => l.itemId === item.id);
        if (existing) {
          return {
            ...calc,
            lines: calc.lines.map((l) =>
              l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
            ),
            result: null,
          };
        }
        return {
          ...calc,
          lines: [
            ...calc.lines,
            {
              itemId: item.id,
              name: item.name,
              unit: item.unit,
              price: item.price!,
              quantity: 1,
            },
          ],
          result: null,
        };
      })
    );
  };

  const updateQuantity = async (calcId: string, itemId: string, rawQuantity: number) => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    const quantity = Number.isFinite(rawQuantity) ? Math.max(0, rawQuantity) : 0;
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.id !== calcId) return calc;
        return {
          ...calc,
          lines: calc.lines.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)),
          result: null,
        };
      })
    );
  };

  const removeFromCalculator = async (calcId: string, itemId: string) => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    setCalculations((prev) =>
      prev.map((calc) =>
        calc.id === calcId
          ? { ...calc, lines: calc.lines.filter((l) => l.itemId !== itemId), result: null }
          : calc
      )
    );
  };

  const calculateForLines = async (lines: CalculatorLine[]) => {
    const items = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity }));
    const { catalog, custom } = splitDraftLineItems(items, draftCustomItems);
    const categoryName = data?.name ?? '';

    if (catalog.length === 0) {
      const customLines = custom.map(({ itemId, quantity, def }) => ({
        itemId,
        name: def.name,
        categoryName,
        unit: def.unit,
        quantity,
        price: def.price,
        amount: def.price * quantity,
      }));
      const total = customLines.reduce((s, l) => s + l.amount, 0);
      return {
        total,
        lines: customLines,
        showPricesInPublic: true,
      };
    }

    const res = await apiFetch(`${API_URL}/service-catalog/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: catalog }),
    });
    if (!res.ok) throw new Error('Не удалось рассчитать стоимость');
    const apiResult = (await res.json()) as CalculateResult;
    return mergeCalculateResultWithCustomLines(apiResult, custom, categoryName);
  };

  const addCustomWorkToCalculator = async () => {
    const def = parseCustomWorkFormInput(customWorkName, customWorkUnit, customWorkPrice);
    if (!def) {
      setCustomWorkError(
        'Укажите название, единицу измерения и цену за единицу (неотрицательное число).'
      );
      return;
    }
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    const targetId = activeCalcId || calculations[0]?.id;
    if (!targetId) return;

    const itemId = createEstimateCustomItemId();
    setDraftCustomItems((prev) => ({ ...prev, [itemId]: def }));
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.id !== targetId) return calc;
        return {
          ...calc,
          lines: [
            ...calc.lines,
            {
              itemId,
              name: def.name,
              unit: def.unit,
              price: def.price,
              quantity: 1,
            },
          ],
          result: null,
        };
      })
    );
    setCustomWorkName('');
    setCustomWorkPrice('');
    setCustomWorkError(null);
  };

  const addCalculation = async () => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    const id = newCalcId();
    setCalculations((prev) => [
      ...prev,
      {
        id,
        name: `Помещение ${prev.length + 1}`,
        lines: [],
        result: null,
        loading: false,
        collapsed: false,
      },
    ]);
    setActiveCalcId(id);
  };

  const removeCalculation = async (calcId: string) => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    setCalculations((prev) => {
      const next = prev.filter((calc) => calc.id !== calcId);
      if (next.length === 0) {
        const id = newCalcId();
        setActiveCalcId(id);
        return [
          {
            id,
            name: 'Помещение 1',
            lines: [],
            result: null,
            loading: false,
            collapsed: false,
          },
        ];
      }
      if (activeCalcId === calcId) {
        setActiveCalcId(next[0].id);
      }
      return next;
    });
  };

  const toggleCollapsed = (calcId: string) => {
    setCalculations((prev) =>
      prev.map((calc) => (calc.id === calcId ? { ...calc, collapsed: !calc.collapsed } : calc))
    );
  };

  const updateCalcName = async (calcId: string, name: string) => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    setCalculations((prev) => prev.map((calc) => (calc.id === calcId ? { ...calc, name } : calc)));
  };

  const lastCalcSignature = useRef(new Map<string, string>());
  const calcTimers = useRef(new Map<string, number>());

  useEffect(() => {
    if (prevSlugForCalculatorRef.current !== null && prevSlugForCalculatorRef.current !== slug) {
      skipPersistCalculatorDraftRef.current = true;
      lastCalcSignature.current = new Map();
      for (const t of calcTimers.current.values()) {
        window.clearTimeout(t);
      }
      calcTimers.current.clear();
      const id = newCalcId();
      setCalculations([
        {
          id,
          name: 'Помещение 1',
          lines: [],
          result: null,
          loading: false,
          collapsed: false,
        },
      ]);
      setActiveCalcId(id);
      setDraftCustomItems({});
      setCustomWorkName('');
      setCustomWorkPrice('');
      setCustomWorkError(null);
    }
    prevSlugForCalculatorRef.current = slug;
  }, [slug]);

  const calcSignature = (lines: CalculatorLine[]) =>
    lines
      .map((l) => `${l.itemId}:${l.quantity}`)
      .sort()
      .join('|');

  useEffect(() => {
    for (const calc of calculations) {
      const signature = calcSignature(calc.lines);
      const prevSignature = lastCalcSignature.current.get(calc.id);
      if (calc.lines.length === 0) {
        if (calc.result || calc.loading) {
          setCalculations((prev) =>
            prev.map((c) => (c.id === calc.id ? { ...c, result: null, loading: false } : c))
          );
        }
        lastCalcSignature.current.set(calc.id, signature);
        continue;
      }
      if (signature === prevSignature) continue;
      lastCalcSignature.current.set(calc.id, signature);
      const prevTimer = calcTimers.current.get(calc.id);
      if (prevTimer) window.clearTimeout(prevTimer);
      const timerId = window.setTimeout(async () => {
        setCalculations((prev) =>
          prev.map((c) => (c.id === calc.id ? { ...c, loading: true } : c))
        );
        try {
          const result = await calculateForLines(calc.lines);
          setCalculations((prev) =>
            prev.map((c) => (c.id === calc.id ? { ...c, result, loading: false } : c))
          );
        } catch {
          setCalculations((prev) =>
            prev.map((c) => (c.id === calc.id ? { ...c, loading: false } : c))
          );
        }
      }, 400);
      calcTimers.current.set(calc.id, timerId);
    }
  }, [calculations]);

  const showPrices = data?.showPricesInPublic ?? true;
  const activeCalc = calculations.find((calc) => calc.id === activeCalcId) ?? calculations[0];
  const activeCalcLines = activeCalc?.lines ?? [];

  const tableSections = useMemo((): CategoryItemSection[] => {
    if (!data) return [];
    return getTableSectionsForData(data);
  }, [data]);

  const tableColCount = showPrices ? 4 : 1;

  const toggleWorkGroupCollapsed = (section: CategoryItemSection, sectionIdx: number) => {
    const key = workGroupKey(section, sectionIdx);
    setCollapsedWorkGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeCollapsedWorkGroupKeysToStorage(slug, next);
      return next;
    });
  };

  const totalAllRooms = useMemo(() => {
    let sum = 0;
    let anyLoading = false;
    for (const calc of calculations) {
      if (calc.loading) anyLoading = true;
      if (calc.result?.total != null) {
        sum += calc.result.total;
      } else if (calc.lines.length > 0) {
        sum += calc.lines.reduce((s, l) => s + l.price * l.quantity, 0);
      }
    }
    return anyLoading ? null : sum;
  }, [calculations]);
  const hasAnyCalcLines = calculations.some((calc) => calc.lines.length > 0);
  const isInCart =
    !!data &&
    (presetInCart ||
      cartServiceItems.some(
        (item) => item.serviceCatalogCategoryId === data.id || item.category?.id === data.id
      ));

  const handleAddToCart = async () => {
    if (!data) return;
    const drafts = calculations.filter((calc) => calc.lines.length > 0);
    if (drafts.length === 0) return;
    setAddToCartLoading(true);
    setAddToCartError(null);
    try {
      const total = drafts.reduce(
        (sum, calc) =>
          sum + calc.lines.reduce((roomSum, line) => roomSum + line.price * line.quantity, 0),
        0
      );
      await addServiceToCart(data.id, {
        rooms: drafts.map((calc) => ({
          name: calc.name || 'Помещение',
          items: calc.lines.map((line) => {
            const q = Number(line.quantity);
            return {
              itemId: line.itemId,
              quantity: Number.isFinite(q) ? Math.max(0, q) : 1,
            };
          }),
        })),
      });
      await refreshCart();
      setLastAddedTotal(total);
      setDetachedFromCart(false);
      setPresetInCart(true);
      if (orderIdParam) {
        removeCancelledOrderId(orderIdParam);
        if (data?.slug) removeDetachedServiceCategory(orderIdParam, data.slug, data.name);
      }
    } catch (err) {
      if (isAuthRequiredForCartError(err)) {
        setAddToCartError(null);
        return;
      }
      setAddToCartError(err instanceof Error ? err.message : 'Ошибка добавления в корзину');
    } finally {
      setAddToCartLoading(false);
    }
  };

  return {
    slug,
    hideAddToCart,
    hideBreadcrumbs,
    hideTitleBlock,
    allowCustomWorkItems,
    data,
    showCategoryLoading,
    calculations,
    setCalculations,
    activeCalcId,
    setActiveCalcId,
    addToCartLoading,
    addToCartError,
    detachedFromCart,
    lastAddedTotal,
    presetInCart,
    detachConfirmOpen,
    setDetachConfirmOpen,
    pendingReviewConfirmOpen,
    setPendingReviewConfirmOpen,
    orderStatus,
    collapsedWorkGroupKeys,
    draftCustomItems,
    customWorkName,
    setCustomWorkName,
    customWorkUnit,
    setCustomWorkUnit,
    customWorkPrice,
    setCustomWorkPrice,
    customWorkError,
    setCustomWorkError,
    detachResolverRef,
    pendingReviewResolverRef,
    addToCalculator,
    updateQuantity,
    removeFromCalculator,
    addCustomWorkToCalculator,
    addCalculation,
    removeCalculation,
    updateCalcName,
    toggleCollapsed,
    handleAddToCart,
    showPrices,
    activeCalc,
    activeCalcLines,
    tableSections,
    tableColCount,
    toggleWorkGroupCollapsed,
    totalAllRooms,
    hasAnyCalcLines,
    isInCart,
  };
}

export type ServiceCategoryPageModel = ReturnType<typeof useServiceCategoryPage>;
