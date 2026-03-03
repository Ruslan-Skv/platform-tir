'use client';

import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusCircleIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { cancelOrderByCustomer, getUserOrder } from '@/shared/api/user-orders';
import { useApprovedOrderGuard } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { useCart } from '@/shared/lib/hooks';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';

import styles from './ServiceCategoryPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  items: ServiceCatalogItem[];
  showPricesInPublic: boolean;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' ₽';

interface CalculatorLine {
  itemId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

interface CalculateResult {
  total: number;
  lines: {
    itemId: string;
    name: string;
    categoryName: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  showPricesInPublic: boolean;
}

type CalculatorDraft = {
  id: string;
  name: string;
  lines: CalculatorLine[];
  result: CalculateResult | null;
  loading: boolean;
  collapsed: boolean;
};

/** Парсинг query-параметра preset: "itemId1:qty1,itemId2:qty2" */
function parsePresetParam(preset: string | null): Array<{ itemId: string; quantity: number }> {
  if (!preset || typeof preset !== 'string') return [];
  const result: Array<{ itemId: string; quantity: number }> = [];
  for (const part of preset.split(',')) {
    const sep = part.indexOf(':');
    if (sep < 0) continue;
    const itemId = part.slice(0, sep).trim();
    const qty = parseFloat(part.slice(sep + 1));
    if (itemId && !isNaN(qty) && qty > 0) {
      result.push({ itemId, quantity: qty });
    }
  }
  return result;
}

type RoomPreset = { name: string; items: Array<{ itemId: string; quantity: number }> };

const decodeBase64 = (value: string) => {
  const decoded = atob(value);
  return decodeURIComponent(decoded);
};

const decodeRoomsParam = (value: string | null): RoomPreset[] => {
  if (!value) return [];
  try {
    const json = decodeBase64(value);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((room) => ({
        name: typeof room?.name === 'string' ? room.name : 'Помещение',
        items: Array.isArray(room?.items) ? room.items : [],
      }))
      .filter((room) => room.items.length > 0);
  } catch {
    return [];
  }
};

const getCancelledOrderIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem('cancelled_service_order_ids');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const addCancelledOrderId = (orderId: string) => {
  if (typeof window === 'undefined') return;
  const current = new Set(getCancelledOrderIds());
  current.add(orderId);
  window.sessionStorage.setItem('cancelled_service_order_ids', JSON.stringify([...current]));
};

const removeCancelledOrderId = (orderId: string) => {
  if (typeof window === 'undefined') return;
  const current = new Set(getCancelledOrderIds());
  current.delete(orderId);
  window.sessionStorage.setItem('cancelled_service_order_ids', JSON.stringify([...current]));
};

const getDetachedServiceCategories = (): Array<{
  orderId: string;
  categorySlug?: string;
  categoryName?: string;
}> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem('detached_service_categories');
    return raw
      ? (JSON.parse(raw) as Array<{
          orderId: string;
          categorySlug?: string;
          categoryName?: string;
        }>)
      : [];
  } catch {
    return [];
  }
};

const addDetachedServiceCategory = (
  orderId: string,
  categorySlug: string,
  categoryName?: string
) => {
  if (typeof window === 'undefined') return;
  const current = getDetachedServiceCategories();
  current.push({ orderId, categorySlug, categoryName });
  window.sessionStorage.setItem('detached_service_categories', JSON.stringify(current));
  window.dispatchEvent(new Event('cart-service-detached'));
};

const removeDetachedServiceCategory = (
  orderId: string,
  categorySlug: string,
  categoryName?: string
) => {
  if (typeof window === 'undefined') return;
  const current = getDetachedServiceCategories().filter(
    (entry) =>
      !(
        entry.orderId === orderId &&
        (entry.categorySlug === categorySlug || entry.categoryName === categoryName)
      )
  );
  window.sessionStorage.setItem('detached_service_categories', JSON.stringify(current));
  window.dispatchEvent(new Event('cart-service-restored'));
};

export function ServiceCategoryPage({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const roomsParam = searchParams.get('rooms');
  const orderIdParam = searchParams.get('orderId');
  const { addServiceToCart, refreshCart, cartServiceItems, removeCartServiceItemById } = useCart();
  const guard = useApprovedOrderGuard();
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const createCalcId = () => `calc-${Math.random().toString(36).slice(2, 10)}`;
  const [calculations, setCalculations] = useState<CalculatorDraft[]>(() => [
    {
      id: createCalcId(),
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/service-catalog/categories/${slug}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  /** Предустановка позиций из query-параметра ?preset=itemId1:qty1,itemId2:qty2 (после загрузки категории). */
  const presetRaw = searchParams.get('preset');
  useEffect(() => {
    if (!data) return;
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
          id: createCalcId(),
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
      return;
    }
    const presetItems = parsePresetParam(presetRaw);
    if (presetItems.length === 0) return;
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
          const id = createCalcId();
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
    }
  }, [data, presetRaw, roomsParam]);

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

  const updateQuantity = async (calcId: string, itemId: string, quantity: number) => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.id !== calcId) return calc;
        const nextLines =
          quantity <= 0
            ? calc.lines.filter((l) => l.itemId !== itemId)
            : calc.lines.map((l) => (l.itemId === itemId ? { ...l, quantity } : l));
        return { ...calc, lines: nextLines, result: null };
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
    const res = await fetch(`${API_URL}/service-catalog/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      }),
    });
    if (!res.ok) throw new Error('Не удалось рассчитать стоимость');
    return res.json() as Promise<CalculateResult>;
  };

  const addCalculation = async () => {
    const canEdit = await requireDetachFromCart();
    if (!canEdit) return;
    const id = createCalcId();
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
        const id = createCalcId();
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
          items: calc.lines.map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity) || 1,
          })),
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
      setAddToCartError(err instanceof Error ? err.message : 'Ошибка добавления в корзину');
    } finally {
      setAddToCartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Категория не найдена</h1>
        <Link href="/catalog/services" className={styles.backLink}>
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/catalog/services">Каталог услуг</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{data.name}</span>
      </nav>

      <h1 className={styles.title}>{data.name}</h1>
      {data.description && <p className={styles.description}>{data.description}</p>}

      <div className={styles.content}>
        <section className={styles.itemsSection}>
          <h2 className={styles.sectionTitle}>Виды работ</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                {showPrices && (
                  <>
                    <th>Цена за ед.</th>
                    <th>Ед. изм.</th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  {showPrices && (
                    <>
                      <td>{item.price !== undefined ? formatPrice(item.price) : '—'}</td>
                      <td>{item.unit}</td>
                      <td>
                        {item.price !== undefined &&
                          (() => {
                            const isInCalc = activeCalcLines.some((l) => l.itemId === item.id);
                            return (
                              <button
                                type="button"
                                className={`${styles.addButton} ${isInCalc ? styles.addButtonSelected : ''}`}
                                onClick={() => void addToCalculator(item)}
                                title={
                                  isInCalc ? 'В расчёте (нажмите, чтобы добавить ещё)' : 'В расчёт'
                                }
                              >
                                {isInCalc ? (
                                  <CheckCircleIconSolid className={styles.addButtonIcon} />
                                ) : (
                                  <PlusCircleIcon className={styles.addButtonIcon} />
                                )}
                              </button>
                            );
                          })()}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {showPrices && (
          <aside className={styles.calculator}>
            <div className={styles.calcHeaderRow}>
              <h2 className={styles.sectionTitle}>
                Расчёты по помещениям
                {totalAllRooms !== null && totalAllRooms > 0 && (
                  <span className={styles.calcHeaderTotal}> · {formatPrice(totalAllRooms)}</span>
                )}
              </h2>
              <button
                type="button"
                className={styles.addCalcButton}
                onClick={() => void addCalculation()}
                title="Добавить помещение"
                aria-label="Добавить помещение"
              >
                <PlusCircleIcon className={styles.addCalcButtonIcon} />
              </button>
            </div>
            <div className={styles.calcCards}>
              {calculations.map((calc) => (
                <div
                  key={calc.id}
                  className={`${styles.calcCard} ${calc.id === activeCalcId ? styles.calcCardActive : ''}`}
                  onClick={() => setActiveCalcId(calc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCalcId(calc.id);
                    }
                  }}
                >
                  <div className={styles.calcCardHeader}>
                    <input
                      value={calc.name}
                      onChange={(e) => void updateCalcName(calc.id, e.target.value)}
                      onFocus={() => setActiveCalcId(calc.id)}
                      className={styles.calcNameInput}
                      placeholder="Название помещения"
                    />
                    <span className={styles.calcSummaryTotal}>
                      {calc.loading ? '…' : calc.result ? formatPrice(calc.result.total) : '—'}
                    </span>
                    <button
                      type="button"
                      className={styles.calcCollapseButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapsed(calc.id);
                      }}
                      aria-label={calc.collapsed ? 'Развернуть' : 'Свернуть'}
                    >
                      {calc.collapsed ? (
                        <ChevronDownIcon className={styles.calcCollapseIcon} />
                      ) : (
                        <ChevronUpIcon className={styles.calcCollapseIcon} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.calcRemoveButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeCalculation(calc.id);
                      }}
                      aria-label="Удалить помещение"
                    >
                      <XMarkIcon className={styles.calcRemoveIcon} />
                    </button>
                  </div>
                  {!calc.collapsed && (
                    <div className={styles.calcCardBody}>
                      {calc.lines.length === 0 ? (
                        <p className={styles.calcEmpty}>
                          Добавьте виды работ из таблицы и укажите количество.
                        </p>
                      ) : (
                        <>
                          <ul className={styles.calcList}>
                            {calc.lines.map((line) => (
                              <li key={line.itemId} className={styles.calcLine}>
                                <div className={styles.calcLineInfo}>
                                  <span className={styles.calcLineName}>{line.name}</span>
                                  <span className={styles.calcLinePrice}>
                                    {formatPrice(line.price)} / {line.unit}
                                  </span>
                                </div>
                                <div className={styles.calcLineControls}>
                                  <input
                                    type="number"
                                    min={0.01}
                                    step={0.1}
                                    value={line.quantity}
                                    onChange={(e) =>
                                      void updateQuantity(
                                        calc.id,
                                        line.itemId,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className={styles.quantityInput}
                                  />
                                  <button
                                    type="button"
                                    className={styles.removeButton}
                                    onClick={() => void removeFromCalculator(calc.id, line.itemId)}
                                    title="Убрать"
                                  >
                                    ×
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <div className={styles.calcLoading}>
                            {calc.loading ? 'Расчёт...' : '\u00A0'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${styles.addToCartButton} ${isInCart ? styles.addToCartButtonSuccess : ''}`}
              onClick={handleAddToCart}
              disabled={addToCartLoading || isInCart || !hasAnyCalcLines}
              title={
                isInCart
                  ? 'Уже в корзине'
                  : 'Добавить перечень работ в корзину (1 позиция = 1 категория)'
              }
            >
              {isInCart ? (
                <CheckCircleIconSolid className={styles.addToCartIcon} />
              ) : (
                <ShoppingCartIcon className={styles.addToCartIcon} />
              )}
              {addToCartLoading
                ? 'Добавление...'
                : isInCart
                  ? `В корзине${lastAddedTotal != null ? ` · ${formatPrice(lastAddedTotal)}` : ''}`
                  : 'В корзину'}
            </button>
            {addToCartError && <p className={styles.orderError}>{addToCartError}</p>}
            <p className={styles.cartHint}>
              Добавьте услуги в корзину, затем оформите заказ в корзине аналогично товарам. Данные
              покупателя заполняются в админке.
            </p>
          </aside>
        )}
      </div>
      <ConfirmModal
        isOpen={detachConfirmOpen}
        onClose={() => {
          setDetachConfirmOpen(false);
          detachResolverRef.current?.(false);
          detachResolverRef.current = null;
        }}
        onConfirm={() => {
          setDetachConfirmOpen(false);
          detachResolverRef.current?.(true);
          detachResolverRef.current = null;
        }}
        title="Удалить расчёт из корзины?"
        message="Любые изменения расчёта (включая добавление помещения) удалят его из корзины. После редактирования можно снова отправить в корзину."
        confirmText="Удалить и продолжить"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={pendingReviewConfirmOpen}
        onClose={() => {
          setPendingReviewConfirmOpen(false);
          pendingReviewResolverRef.current?.(false);
          pendingReviewResolverRef.current = null;
        }}
        onConfirm={() => {
          setPendingReviewConfirmOpen(false);
          pendingReviewResolverRef.current?.(true);
          pendingReviewResolverRef.current = null;
        }}
        title="Обновить заказ на проверке?"
        message="У вас уже есть заказ на проверке. Завершите оформление заказа. При изменении состава заказа производится полное переоформление заказа. При этом все незавершённые заказы будут отменены! Продолжить?"
        confirmText="Да"
        cancelText="Нет"
      />
    </div>
  );
}
