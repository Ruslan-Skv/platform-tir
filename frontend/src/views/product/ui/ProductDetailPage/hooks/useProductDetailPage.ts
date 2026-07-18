'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  patchProductAttributes,
  patchProductCatalogBadges,
  patchProductDescription,
  patchProductPricing,
} from '@/shared/api/admin-product-patch';
import { isCompareLimitExceededError } from '@/shared/api/compare';
import {
  type ProductComponent,
  type PublicComponentDraftRow,
  getProductComponents,
  patchProductComponent,
} from '@/shared/api/product-components';
import { apiFetch } from '@/shared/lib/api-fetch';
import { calculateKitPrice, getKitComponents } from '@/shared/lib/catalog/component-kit';
import { emitCompareLimitExceeded } from '@/shared/lib/compare-limit-notify';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';
import { useCanEditCatalogOnPublic } from '@/shared/lib/hooks/useCanEditCatalogOnPublic';
import { usePublicSiteEditMode } from '@/shared/lib/hooks/usePublicSiteEditMode';
import { isPublicPriceDraftDirty } from '@/shared/lib/public-price-draft';
import { touchPublicSiteEditModeActivity } from '@/shared/lib/public-site-edit-mode';

import {
  type AttributeItem,
  type CategoryAttribute,
  type ProductCardBadgeDefinition,
  type ProductData,
  type ProductDetailPageProps,
  type ProductVariant,
} from '../product-detail-page.types';
import {
  scrollProductDetailToTop,
  serializePublicAttributeDraft,
  serializePublicComponentsDraft,
} from '../product-detail-page.utils';

export function useProductDetailPage({ slug }: ProductDetailPageProps) {
  const router = useRouter();
  const {
    cart,
    addToCart,
    addComponentToCart,
    updateQuantity,
    updateCartItemQuantityById,
    removeCartItemById,
  } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOrigin, setLightboxOrigin] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const publicSiteEditMode = usePublicSiteEditMode();
  const canEditCatalogOnPublic = useCanEditCatalogOnPublic();
  const showPublicAttrsToolbar = publicSiteEditMode && canEditCatalogOnPublic;
  const [isEditingPublicAttrs, setIsEditingPublicAttrs] = useState(false);
  const [draftAttributes, setDraftAttributes] = useState<AttributeItem[]>([]);
  const [savingPublicAttrs, setSavingPublicAttrs] = useState(false);
  const [isEditingPublicPrice, setIsEditingPublicPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const [savingPublicPrice, setSavingPublicPrice] = useState(false);
  const [isEditingPublicDescription, setIsEditingPublicDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState('');
  const [savingPublicDescription, setSavingPublicDescription] = useState(false);
  const [isEditingPublicComponents, setIsEditingPublicComponents] = useState(false);
  const [draftComponents, setDraftComponents] = useState<PublicComponentDraftRow[]>([]);
  const [savingPublicComponents, setSavingPublicComponents] = useState(false);
  const [badgeDefinitions, setBadgeDefinitions] = useState<ProductCardBadgeDefinition[]>([]);
  const [isEditingPublicBadges, setIsEditingPublicBadges] = useState(false);
  const [draftCatalogBadgeIds, setDraftCatalogBadgeIds] = useState<string[]>([]);
  const [savingPublicBadges, setSavingPublicBadges] = useState(false);
  const attrsEditBaselineRef = useRef('');
  const priceEditBaselineRef = useRef('');
  const descriptionEditBaselineRef = useRef('');
  const componentsEditBaselineRef = useRef('');
  const badgesEditBaselineRef = useRef('');
  const [variantNotification, setVariantNotification] = useState<string | null>(null);
  const [selectedCardVariantIndex, setSelectedCardVariantIndex] = useState(0);

  const cardVariants =
    product?.cardVariants && product.cardVariants.length > 0 ? product.cardVariants : [];
  const selectedCardVariant = cardVariants[selectedCardVariantIndex] ?? null;
  const displayPrice = selectedCardVariant
    ? typeof selectedCardVariant.price === 'string'
      ? parseFloat(selectedCardVariant.price)
      : selectedCardVariant.price
    : product
      ? parseFloat(product.price)
      : 0;
  const displayName = selectedCardVariant ? selectedCardVariant.name : (product?.name ?? '');

  const isPublicAttrsDirty = useMemo(() => {
    if (!isEditingPublicAttrs) return false;
    return serializePublicAttributeDraft(draftAttributes) !== attrsEditBaselineRef.current;
  }, [isEditingPublicAttrs, draftAttributes]);

  const isPublicPriceDirty = useMemo(() => {
    if (!isEditingPublicPrice) return false;
    return isPublicPriceDraftDirty(draftPrice, priceEditBaselineRef.current);
  }, [isEditingPublicPrice, draftPrice]);

  const isPublicDescriptionDirty = useMemo(() => {
    if (!isEditingPublicDescription) return false;
    return draftDescription !== descriptionEditBaselineRef.current;
  }, [isEditingPublicDescription, draftDescription]);

  const isPublicComponentsDirty = useMemo(() => {
    if (!isEditingPublicComponents) return false;
    return serializePublicComponentsDraft(draftComponents) !== componentsEditBaselineRef.current;
  }, [isEditingPublicComponents, draftComponents]);

  const isPublicBadgesDirty = useMemo(() => {
    if (!isEditingPublicBadges) return false;
    return JSON.stringify(draftCatalogBadgeIds) !== badgesEditBaselineRef.current;
  }, [isEditingPublicBadges, draftCatalogBadgeIds]);

  const showBadgePublicEditBlock = showPublicAttrsToolbar && badgeDefinitions.length > 0;

  // Получаем информацию о варианте в корзине
  const getCartItemForVariant = useCallback(
    (size: string, openingSide: string) => {
      if (!product) return null;
      const productId = String(product.id);

      // Нормализуем значения для сравнения (пустые строки и null считаются одинаковыми)
      const normalizedSize = size || null;
      const normalizedOpeningSide = openingSide || null;

      return cart.find(
        (item) =>
          item.productId !== null &&
          String(item.productId) === productId &&
          item.componentId === null &&
          (item.size || null) === normalizedSize &&
          (item.openingSide || null) === normalizedOpeningSide
      );
    },
    [product, cart]
  );

  // Компоненты комплекта для добавления в корзину при выборе «Комплект»
  const kitComponentsForCart = useMemo(() => getKitComponents(components), [components]);

  // Автоскрытие уведомления о выборе параметров варианта
  useEffect(() => {
    if (!variantNotification) return;
    const timer = setTimeout(() => setVariantNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [variantNotification]);

  // Сбрасываем варианты при загрузке нового товара
  useEffect(() => {
    if (product) {
      setVariants([
        {
          id: `variant-${Date.now()}`,
          size: '',
          openingSide: '',
          quantity: 1,
          deliveryType: '',
        },
      ]);
    }
  }, [product]);

  // Обновляем состояние добавления в корзину при изменении корзины
  // Это помогает синхронизировать UI после добавления товара
  useEffect(() => {
    // Сбрасываем флаги добавления, если товар уже в корзине
    setAddingToCart((prev) => {
      const updated = { ...prev };
      variants.forEach((variant) => {
        const cartItem = getCartItemForVariant(variant.size, variant.openingSide);
        if (cartItem) {
          // Если товар в корзине, сбрасываем флаг добавления
          delete updated[variant.id];
        }
      });
      return updated;
    });
  }, [cart, variants, getCartItemForVariant]);

  // Для SSR — портал работает только на клиенте
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Вверх страницы при открытии карточки / смене slug (до отрисовки, чтобы не мигать серединой каталога).
  useLayoutEffect(() => {
    scrollProductDetailToTop();
  }, [slug]);

  // После окончания загрузки данных — снова вверх (высота страницы меняется, на телефонах позиция «плывёт»).
  useEffect(() => {
    if (loading) return;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(scrollProductDetailToTop);
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
    };
  }, [loading, slug]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const response = await apiFetch(`${apiUrl}/products/slug/${slug}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Товар не найден');
          }
          throw new Error('Не удалось загрузить товар');
        }

        const data: ProductData = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Атрибуты категории (с order) нужны, чтобы выводить характеристики в заданном порядке
  useEffect(() => {
    const categoryId = product?.category?.id;
    if (!categoryId) {
      setCategoryAttributes([]);
      return;
    }

    let cancelled = false;
    const fetchCategoryAttributes = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await apiFetch(`${apiUrl}/categories/${categoryId}/attributes`);
        if (!res.ok) {
          if (!cancelled) setCategoryAttributes([]);
          return;
        }
        const data: CategoryAttribute[] = await res.json();
        const sorted = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (!cancelled) setCategoryAttributes(sorted);
      } catch {
        if (!cancelled) setCategoryAttributes([]);
      }
    };

    fetchCategoryAttributes();
    return () => {
      cancelled = true;
    };
  }, [product?.category?.id]);

  useEffect(() => {
    if (!showPublicAttrsToolbar) {
      setBadgeDefinitions([]);
      setIsEditingPublicBadges(false);
      setDraftCatalogBadgeIds([]);
      badgesEditBaselineRef.current = '';
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await apiFetch(`${apiUrl}/product-card-badges/definitions`);
        if (!res.ok) {
          if (!cancelled) setBadgeDefinitions([]);
          return;
        }
        const data: unknown = await res.json();
        if (!cancelled) {
          setBadgeDefinitions(Array.isArray(data) ? (data as ProductCardBadgeDefinition[]) : []);
        }
      } catch {
        if (!cancelled) setBadgeDefinitions([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showPublicAttrsToolbar]);

  useEffect(() => {
    setIsEditingPublicAttrs(false);
    setDraftAttributes([]);
    setIsEditingPublicPrice(false);
    setDraftPrice('');
    setIsEditingPublicDescription(false);
    setDraftDescription('');
    attrsEditBaselineRef.current = '';
    priceEditBaselineRef.current = '';
    descriptionEditBaselineRef.current = '';
    setIsEditingPublicComponents(false);
    setDraftComponents([]);
    componentsEditBaselineRef.current = '';
    setIsEditingPublicBadges(false);
    setDraftCatalogBadgeIds([]);
    badgesEditBaselineRef.current = '';
  }, [product?.id]);

  // Получаем ID товара для работы с wishlist, compare и загрузки комплектующих
  const productId = useMemo(() => (product ? String(product.id) : ''), [product]);

  // Загружаем комплектующие при наличии товара (для отображения двух цен и блока комплектующих)
  useEffect(() => {
    if (!productId) {
      setComponents([]);
      return;
    }
    getProductComponents(productId)
      .then(setComponents)
      .catch(() => setComponents([]));
  }, [productId]);

  // Используем глобальное состояние напрямую - автоматически обновляется при изменении wishlist/compare
  const isFavorite = useMemo(
    () => (productId ? isInWishlist(productId) : false),
    [isInWishlist, productId]
  );
  const isInCompareState = useMemo(
    () => (productId ? isInCompare(productId) : false),
    [isInCompare, productId]
  );

  const handleFavoriteClick = async () => {
    if (!productId) return;
    try {
      setIsWishlistLoading(true);
      await toggleWishlist(productId);
      // Состояние обновится автоматически через глобальный контекст
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при работе с избранным');
      }
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleCompareClick = async () => {
    if (!productId) return;
    try {
      setIsCompareLoading(true);
      await toggleCompare(productId);
      // Состояние обновится автоматически через глобальный контекст
    } catch (err) {
      if (isCompareLimitExceededError(err)) {
        emitCompareLimitExceeded();
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при работе с сравнением');
      }
    } finally {
      setIsCompareLoading(false);
    }
  };

  // Функции для лайтбокса
  const openLightbox = (index: number, originEl?: HTMLElement | null) => {
    const rect = originEl?.getBoundingClientRect();
    setLightboxOrigin(
      rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : null
    );
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const goToPrevImage = useCallback(() => {
    if (product) {
      setLightboxIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  }, [product]);

  const goToNextImage = useCallback(() => {
    if (product) {
      setLightboxIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }
  }, [product]);

  // Стоимость комплекта по подсказке: полотно 1шт., стойка коробки 2,5шт., наличники 5шт.
  const kitPrice = useMemo(() => {
    if (!product || components.length === 0) return null;
    const draftCanvasRaw = draftPrice.replace(/\s/g, '').replace(',', '.');
    const draftCanvas = parseFloat(draftCanvasRaw);
    const useDraftCanvas = isEditingPublicPrice && Number.isFinite(draftCanvas) && draftCanvas >= 0;

    const canvasPrice = useDraftCanvas
      ? draftCanvas
      : selectedCardVariant != null
        ? typeof selectedCardVariant.price === 'string'
          ? parseFloat(selectedCardVariant.price)
          : selectedCardVariant.price
        : parseFloat(product.price);
    return calculateKitPrice(canvasPrice, components);
  }, [product, components, selectedCardVariant, isEditingPublicPrice, draftPrice]);

  // Хуки атрибутов — строго до любых return, иначе нарушается порядок Hooks при loading → loaded
  const rawAttributesArray = useMemo<AttributeItem[]>(() => {
    if (!product?.attributes) return [];
    // Атрибуты могут быть в двух форматах:
    // 1) массив [{name, value}] (новый формат)
    // 2) объект { [slug|name]: value } (старый формат)
    if (Array.isArray(product.attributes)) {
      return (product.attributes as Array<{ name: string; value?: unknown; slug?: string }>)
        .filter((a) => a && typeof a.name === 'string' && a.name.trim() !== '')
        .map((a) => ({
          name: a.name,
          value: a.value == null ? '' : String(a.value),
          ...(typeof a.slug === 'string' && a.slug.trim() !== '' ? { slug: a.slug.trim() } : {}),
        }));
    }
    const attrsObj = product.attributes as Record<string, unknown>;
    return Object.entries(attrsObj).map(([key, value]) => ({
      name: key,
      value: value == null ? '' : String(value),
    }));
  }, [product?.attributes]);

  const attributesArray = useMemo<AttributeItem[]>(() => {
    if (rawAttributesArray.length === 0) return [];

    // Если для категории задан порядок — выводим характеристики именно в нём
    if (categoryAttributes.length > 0) {
      const bySlug = new Map<string, string>();
      const byName = new Map<string, string>();

      for (const item of rawAttributesArray) {
        const key = item.name.trim();
        const val = item.value;
        if (!key) continue;
        // В старом формате key обычно = slug; в новом — чаще всего name.
        // Поэтому держим оба словаря и пробуем матчиться по slug и по title.
        bySlug.set(key, val);
        byName.set(key, val);
      }

      const usedKeys = new Set<string>();
      const ordered: AttributeItem[] = [];

      for (const ca of categoryAttributes) {
        const slug = ca.attribute.slug;
        const title = ca.attribute.name;
        const valueFromSlug = bySlug.get(slug);
        const valueFromName = byName.get(title);
        const value =
          valueFromSlug !== undefined
            ? valueFromSlug
            : valueFromName !== undefined
              ? valueFromName
              : undefined;

        if (value === undefined) continue;
        const trimmed = String(value).trim();
        if (!trimmed) continue;

        ordered.push({ name: title, value: trimmed, slug });
        usedKeys.add(slug);
        usedKeys.add(title);
      }

      // Добавляем "лишние" атрибуты (например, кастомные), сохраняя исходный порядок
      for (const item of rawAttributesArray) {
        const key = item.name.trim();
        if (!key) continue;
        if (usedKeys.has(key)) continue;
        if (item.slug && usedKeys.has(item.slug)) continue;
        const trimmed = String(item.value ?? '').trim();
        if (!trimmed) continue;
        ordered.push({ name: key, value: trimmed, slug: item.slug });
      }

      return ordered;
    }

    // Без схемы категории — как было (показываем непустые)
    return rawAttributesArray.filter((a) => String(a.value ?? '').trim() !== '');
  }, [rawAttributesArray, categoryAttributes]);

  /** Все строки характеристик для режима правки с публичного сайта (в т.ч. пустые значения по схеме категории). */
  const attributesEditableRows = useMemo<AttributeItem[]>(() => {
    if (!product) return [];
    if (categoryAttributes.length > 0) {
      const bySlug = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const item of rawAttributesArray) {
        const key = item.name.trim();
        if (!key) continue;
        const val = String(item.value ?? '');
        bySlug.set(key, val);
        byName.set(key, val);
      }
      const usedKeys = new Set<string>();
      const ordered: AttributeItem[] = [];
      for (const ca of categoryAttributes) {
        const slug = ca.attribute.slug;
        const title = ca.attribute.name;
        const valueFromSlug = bySlug.get(slug);
        const valueFromName = byName.get(title);
        const value =
          valueFromSlug !== undefined
            ? valueFromSlug
            : valueFromName !== undefined
              ? valueFromName
              : '';
        ordered.push({ name: title, value: String(value), slug });
        usedKeys.add(slug);
        usedKeys.add(title);
      }
      for (const item of rawAttributesArray) {
        const key = item.name.trim();
        if (!key) continue;
        if (usedKeys.has(key)) continue;
        if (item.slug && usedKeys.has(item.slug)) continue;
        ordered.push({
          name: key,
          value: String(item.value ?? ''),
          slug: item.slug,
        });
      }
      return ordered;
    }
    return rawAttributesArray.filter((a) => a.name.trim() !== '');
  }, [product, rawAttributesArray, categoryAttributes]);

  const showAttributesSection = useMemo(() => {
    if (!product) return false;
    const hasWeight = product.weight != null && !Number.isNaN(Number(product.weight));
    return (
      attributesArray.length > 0 ||
      hasWeight ||
      (showPublicAttrsToolbar && attributesEditableRows.length > 0)
    );
  }, [product, attributesArray, showPublicAttrsToolbar, attributesEditableRows]);

  const toggleDraftCatalogBadgeId = useCallback((rawBadgeId: string) => {
    const badgeId = String(rawBadgeId);
    setDraftCatalogBadgeIds((prev) => {
      const normalized = prev.map((id) => String(id));
      const i = normalized.indexOf(badgeId);
      if (i >= 0) {
        return normalized.filter((id) => id !== badgeId);
      }
      if (normalized.length >= 5) {
        alert('Можно выбрать не более 5 бэйджей слева от фото');
        return prev;
      }
      return [...normalized, badgeId];
    });
  }, []);

  const exitPublicBadgesEdit = useCallback(() => {
    if (savingPublicBadges) return;
    touchPublicSiteEditModeActivity();
    try {
      const parsed = JSON.parse(badgesEditBaselineRef.current) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
        setDraftCatalogBadgeIds(parsed as string[]);
      }
    } catch {
      /* ignore */
    }
    setIsEditingPublicBadges(false);
  }, [savingPublicBadges]);

  const handleSavePublicCatalogBadges = useCallback(async () => {
    if (!product) return;
    setSavingPublicBadges(true);
    try {
      const idsPayload = draftCatalogBadgeIds.map((x) => String(x)).filter((x) => x.length > 0);
      const result = await patchProductCatalogBadges(product.id, idsPayload);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      const data = result.data as ProductData;
      if (data && typeof data === 'object' && 'id' in data) {
        setProduct(data);
      }
      const slugForRevalidate = product.slug?.trim();
      if (slugForRevalidate) {
        apiFetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: [
              `/product/${slugForRevalidate}`,
              { path: '/catalog/products', type: 'layout' as const },
            ],
          }),
        }).catch(() => {});
      }
      router.refresh();
      touchPublicSiteEditModeActivity();
      setIsEditingPublicBadges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить бэйджи');
    } finally {
      setSavingPublicBadges(false);
    }
  }, [product, draftCatalogBadgeIds, router]);

  const handleSavePublicAttributes = useCallback(async () => {
    if (!product) return;
    const payload = draftAttributes
      .map((r) => ({
        name: r.name.trim(),
        value: r.value.trim(),
        ...(r.slug ? { slug: r.slug } : {}),
      }))
      .filter((r) => r.name.length > 0 && r.value.length > 0);

    setSavingPublicAttrs(true);
    try {
      const result = await patchProductAttributes(product.id, payload);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      const data = result.data as ProductData;
      if (data && typeof data === 'object' && 'id' in data) {
        setProduct(data);
      }
      touchPublicSiteEditModeActivity();
      setIsEditingPublicAttrs(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить характеристики');
    } finally {
      setSavingPublicAttrs(false);
    }
  }, [product, draftAttributes]);

  const handleSavePublicPrice = useCallback(async () => {
    if (!product) return;
    const raw = draftPrice.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num < 0) {
      alert('Укажите корректную цену (неотрицательное число)');
      return;
    }

    setSavingPublicPrice(true);
    try {
      const variants = product.cardVariants;
      const hasVariants = variants && variants.length > 0;
      const result = hasVariants
        ? await patchProductPricing(product.id, {
            cardVariants: variants.map((v, i) => ({
              name: v.name,
              price:
                i === selectedCardVariantIndex
                  ? num
                  : typeof v.price === 'string'
                    ? parseFloat(v.price)
                    : v.price,
              image: v.image?.trim() || undefined,
              size: v.size?.trim() || undefined,
              color: v.color?.trim() || undefined,
              extraOption: v.extraOption?.trim() || undefined,
              sortOrder: v.sortOrder ?? i,
            })),
          })
        : await patchProductPricing(product.id, { price: num });

      if (!result.ok) {
        alert(result.message);
        return;
      }
      const data = result.data as ProductData;
      if (data && typeof data === 'object' && 'id' in data) {
        setProduct(data);
      }
      touchPublicSiteEditModeActivity();
      setIsEditingPublicPrice(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить цену');
    } finally {
      setSavingPublicPrice(false);
    }
  }, [product, draftPrice, selectedCardVariantIndex]);

  const handleSavePublicDescription = useCallback(async () => {
    if (!product) return;
    const trimmed = draftDescription.trim();
    setSavingPublicDescription(true);
    try {
      const result = await patchProductDescription(product.id, trimmed.length > 0 ? trimmed : null);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      const data = result.data as ProductData;
      if (data && typeof data === 'object' && 'id' in data) {
        setProduct(data);
      }
      touchPublicSiteEditModeActivity();
      setIsEditingPublicDescription(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить описание');
    } finally {
      setSavingPublicDescription(false);
    }
  }, [product, draftDescription]);

  const exitPublicPriceEdit = useCallback(() => {
    if (savingPublicPrice) return;
    touchPublicSiteEditModeActivity();
    setDraftPrice(priceEditBaselineRef.current);
    setIsEditingPublicPrice(false);
  }, [savingPublicPrice]);

  const exitPublicAttrsEdit = useCallback(() => {
    if (savingPublicAttrs) return;
    touchPublicSiteEditModeActivity();
    const baseline = attrsEditBaselineRef.current;
    if (baseline) {
      try {
        const raw = JSON.parse(baseline) as Array<{ name: string; value: string; slug?: string }>;
        setDraftAttributes(
          raw.map((r) => ({
            name: r.name,
            value: r.value,
            ...(r.slug ? { slug: r.slug } : {}),
          }))
        );
      } catch {
        /* ignore */
      }
    }
    setIsEditingPublicAttrs(false);
  }, [savingPublicAttrs]);

  const exitPublicDescriptionEdit = useCallback(() => {
    if (savingPublicDescription) return;
    touchPublicSiteEditModeActivity();
    setDraftDescription(descriptionEditBaselineRef.current);
    setIsEditingPublicDescription(false);
  }, [savingPublicDescription]);

  const handleDraftComponentChange = useCallback(
    (id: string, field: 'name' | 'type' | 'price', value: string) => {
      setDraftComponents((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const exitPublicComponentsEdit = useCallback(() => {
    if (savingPublicComponents) return;
    touchPublicSiteEditModeActivity();
    const baseline = componentsEditBaselineRef.current;
    if (baseline) {
      try {
        setDraftComponents(JSON.parse(baseline) as PublicComponentDraftRow[]);
      } catch {
        /* ignore */
      }
    }
    setIsEditingPublicComponents(false);
  }, [savingPublicComponents]);

  const handleSavePublicComponents = useCallback(async () => {
    if (!product) return;
    setSavingPublicComponents(true);
    try {
      for (const row of draftComponents) {
        const orig = components.find((c) => c.id === row.id);
        if (!orig) continue;
        const name = row.name.trim();
        const type = row.type.trim();
        if (!name || !type) {
          alert('Заполните наименование и тип для каждой позиции');
          return;
        }
        const priceNum = parseFloat(row.price.replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(priceNum) || priceNum < 0) {
          alert(`Некорректная цена для «${name}»`);
          return;
        }
        let origPrice = parseFloat(String(orig.price).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(origPrice)) origPrice = 0;
        if (orig.name === name && orig.type === type && Math.abs(origPrice - priceNum) < 1e-9) {
          continue;
        }
        const res = await patchProductComponent(row.id, { name, type, price: priceNum });
        if (!res.ok) {
          alert(res.message);
          return;
        }
      }
      const fresh = await getProductComponents(product.id);
      setComponents(fresh);
      touchPublicSiteEditModeActivity();
      setIsEditingPublicComponents(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить комплектующие');
    } finally {
      setSavingPublicComponents(false);
    }
  }, [product, draftComponents, components]);

  return {
    slug,
    router,
    cart,
    addToCart,
    addComponentToCart,
    updateQuantity,
    updateCartItemQuantityById,
    removeCartItemById,
    product,
    setProduct,
    loading,
    error,
    selectedImage,
    setSelectedImage,
    isLightboxOpen,
    lightboxIndex,
    lightboxOrigin,
    isMounted,
    isAddingToCart,
    setIsAddingToCart,
    isWishlistLoading,
    isCompareLoading,
    variants,
    setVariants,
    addingToCart,
    setAddingToCart,
    components,
    setComponents,
    categoryAttributes,
    publicSiteEditMode,
    canEditCatalogOnPublic,
    showPublicAttrsToolbar,
    isEditingPublicAttrs,
    setIsEditingPublicAttrs,
    draftAttributes,
    setDraftAttributes,
    savingPublicAttrs,
    isEditingPublicPrice,
    setIsEditingPublicPrice,
    draftPrice,
    setDraftPrice,
    savingPublicPrice,
    isEditingPublicDescription,
    setIsEditingPublicDescription,
    draftDescription,
    setDraftDescription,
    savingPublicDescription,
    isEditingPublicComponents,
    setIsEditingPublicComponents,
    draftComponents,
    setDraftComponents,
    savingPublicComponents,
    badgeDefinitions,
    isEditingPublicBadges,
    setIsEditingPublicBadges,
    draftCatalogBadgeIds,
    setDraftCatalogBadgeIds,
    savingPublicBadges,
    attrsEditBaselineRef,
    priceEditBaselineRef,
    descriptionEditBaselineRef,
    componentsEditBaselineRef,
    badgesEditBaselineRef,
    variantNotification,
    setVariantNotification,
    selectedCardVariantIndex,
    setSelectedCardVariantIndex,
    cardVariants,
    selectedCardVariant,
    displayPrice,
    displayName,
    isPublicAttrsDirty,
    isPublicPriceDirty,
    isPublicDescriptionDirty,
    isPublicComponentsDirty,
    isPublicBadgesDirty,
    showBadgePublicEditBlock,
    getCartItemForVariant,
    kitComponentsForCart,
    productId,
    isFavorite,
    isInCompareState,
    handleFavoriteClick,
    handleCompareClick,
    openLightbox,
    closeLightbox,
    goToPrevImage,
    goToNextImage,
    kitPrice,
    rawAttributesArray,
    attributesArray,
    attributesEditableRows,
    showAttributesSection,
    toggleDraftCatalogBadgeId,
    exitPublicBadgesEdit,
    handleSavePublicCatalogBadges,
    handleSavePublicAttributes,
    handleSavePublicPrice,
    handleSavePublicDescription,
    exitPublicPriceEdit,
    exitPublicAttrsEdit,
    exitPublicDescriptionEdit,
    handleDraftComponentChange,
    exitPublicComponentsEdit,
    handleSavePublicComponents,
  };
}

export type ProductDetailPageModel = ReturnType<typeof useProductDetailPage>;
