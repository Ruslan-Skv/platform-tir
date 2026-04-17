'use client';

import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
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
import type { Review } from '@/shared/api/reviews';
import { isAuthRequiredForCartError } from '@/shared/lib/cart-auth-required';
import { emitCompareLimitExceeded } from '@/shared/lib/compare-limit-notify';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';
import { useCanEditCatalogOnPublic } from '@/shared/lib/hooks/useCanEditCatalogOnPublic';
import { usePublicSiteEditMode } from '@/shared/lib/hooks/usePublicSiteEditMode';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import { isPublicPriceDraftDirty } from '@/shared/lib/public-price-draft';
import { touchPublicSiteEditModeActivity } from '@/shared/lib/public-site-edit-mode';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { escapeHtmlAndPreserveNewlines, getSafeHref } from '@/shared/lib/sanitize';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';

import { ProductComponents } from './ProductComponents';
import styles from './ProductDetailPage.module.css';
import { ProductReviewsSection } from './ProductReviewsSection';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  onOrder?: boolean;
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  isNew: boolean;
  isFeatured: boolean;
  // Атрибуты могут быть массивом (новый формат) или объектом (старый формат)
  attributes:
    | Array<{ name: string; value: string; slug?: string }>
    | Record<string, unknown>
    | null;
  sizes?: string[];
  openingSide?: string[];
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  rating?: number;
  reviewsCount?: number;
  reviews?: Review[];
  cardVariants?: Array<{
    id: string;
    name: string;
    price: number | string;
    image?: string | null;
    size?: string | null;
    color?: string | null;
    extraOption?: string | null;
    sortOrder?: number;
  }>;
  cardBadgeSelections?: Array<{
    sortOrder: number;
    badge: {
      id: string;
      key: string;
      label: string;
      imageUrl: string | null;
      description?: string | null;
    };
  }>;
}

interface CategoryAttribute {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: {
    id: string;
    name: string;
    slug: string;
  };
}

type AttributeItem = { name: string; value: string; slug?: string };

interface ProductCardBadgeDefinition {
  id: string;
  key: string;
  label: string;
  imageUrl: string | null;
  description?: string | null;
}

function catalogBadgeIdsFromProduct(product: ProductData): string[] {
  return (product.cardBadgeSelections ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((s) => String(s.badge.id));
}

function serializePublicAttributeDraft(rows: AttributeItem[]): string {
  return JSON.stringify(
    rows.map((a) => ({
      name: a.name.trim(),
      value: a.value,
      slug: a.slug ?? '',
    }))
  );
}

function serializePublicComponentsDraft(rows: PublicComponentDraftRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      type: r.type.trim(),
      price: r.price.replace(/\s/g, '').replace(',', '.'),
    }))
  );
}

interface ProductDetailPageProps {
  slug: string;
}

/** Путь в каталог как в app router: /catalog/products[/parent][/child]; сегменты кодируются для безопасных slug из API */
function catalogProductsHref(...slugSegments: string[]): string {
  const parts = slugSegments
    .map((s) =>
      String(s ?? '')
        .trim()
        .replace(/^\uFEFF/, '')
    )
    .filter((s) => s.length > 0);
  if (parts.length === 0) return '/catalog/products';
  return `/catalog/products/${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}

/** Прокрутка в начало страницы товара (мобильные часто сохраняют offset с каталога или смещаются после подгрузки контента). */
function scrollProductDetailToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Плеер для YouTube, Vimeo или прямого URL видео */
function ProductVideoPlayer({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube: watch?v=ID или youtu.be/ID
  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    return (
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title="Видео о товаре"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      </div>
    );
  }

  // Vimeo: vimeo.com/123456
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return (
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title="Видео о товаре"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      </div>
    );
  }

  // Прямая ссылка на видеофайл
  return (
    <div className={styles.videoWrapper}>
      <video src={trimmed} controls className={styles.videoNative} />
    </div>
  );
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug }) => {
  const router = useRouter();
  const {
    cart,
    addToCart,
    addComponentToCart,
    updateQuantity,
    updateCartItemQuantityById,
    removeCartItemById,
  } = useCart();
  const { toggleWishlist, isInWishlist, wishlist } = useWishlist();
  const { toggleCompare, isInCompare, compare } = useCompare();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  // Варианты товара для добавления в корзину
  type DeliveryType = 'polotno' | 'komplekt';
  interface ProductVariant {
    id: string;
    size: string;
    openingSide: string;
    quantity: number;
    deliveryType: DeliveryType | '';
  }
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
  const kitComponentsForCart = useMemo(() => {
    if (components.length === 0) return null;
    const stoikaKorobka = components.find(
      (c) =>
        (/стойк/i.test(c.name) && /коробк/i.test(c.name)) ||
        (/стойк/i.test(c.type) && /коробк/i.test(c.type))
    );
    const nalichnik = components.find((c) => /наличник/i.test(c.name) || /наличник/i.test(c.type));
    return stoikaKorobka && nalichnik ? { stoikaKorobka, nalichnik } : null;
  }, [components]);

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
        const response = await fetch(`${apiUrl}/products/slug/${slug}`, {
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
        const res = await fetch(`${apiUrl}/categories/${categoryId}/attributes`);
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
        const res = await fetch(`${apiUrl}/product-card-badges/definitions`);
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
    [isInWishlist, productId, wishlist]
  );
  const isInCompareState = useMemo(
    () => (productId ? isInCompare(productId) : false),
    [isInCompare, productId, compare]
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
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = '';
  };

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

  // Обработка клавиатуры для лайтбокса
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, goToPrevImage, goToNextImage]);

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
    // Стойка коробки — 2,5 шт. (название/тип содержит «стойк» и «коробк»: «стойка коробки» или «стойки коробки»)
    const stoikaKorobka = components.find(
      (c) =>
        (/стойк/i.test(c.name) && /коробк/i.test(c.name)) ||
        (/стойк/i.test(c.type) && /коробк/i.test(c.type))
    );
    // Наличники — 5 шт.
    const nalichnik = components.find((c) => /наличник/i.test(c.name) || /наличник/i.test(c.type));
    let total = canvasPrice; // полотно 1 шт.
    if (stoikaKorobka) total += 2.5 * parseFloat(stoikaKorobka.price);
    if (nalichnik) total += 5 * parseFloat(nalichnik.price);
    return Math.round(total);
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
        fetch('/api/revalidate', {
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
  }, [product, draftCatalogBadgeIds]);

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка товара...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Ошибка</h1>
          <p>{error || 'Товар не найден'}</p>
          <Link href="/" className={styles.backLink}>
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  const price = displayPrice;
  const comparePrice =
    !selectedCardVariant && product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  // Формируем хлебные крошки
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog/products' },
  ];

  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.parent.name,
      href: catalogProductsHref(product.category.parent.slug),
    });
  }

  // URL подкатегории как в каталоге и в админке (навигация): /catalog/products/{parent}/{child.slug}
  // Второй сегмент — полный slug листовой категории из API (не суффикс без префикса родителя):
  // иначе Next открывает несуществующий маршрут, ломается клиентская навигация и хлебные крошки.
  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.name,
      href: catalogProductsHref(product.category.parent.slug, product.category.slug),
    });
  } else {
    breadcrumbs.push({
      label: product.category.name,
      href: catalogProductsHref(product.category.slug),
    });
  }

  return (
    <div className={styles.container}>
      {/* Кастомное уведомление при невыбранных параметрах варианта */}
      {variantNotification && (
        <div className={styles.variantNotification} role="alert" aria-live="polite">
          <span className={styles.variantNotificationIcon}>!</span>
          <span className={styles.variantNotificationText}>{variantNotification}</span>
          <button
            type="button"
            className={styles.variantNotificationClose}
            onClick={() => setVariantNotification(null)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}

      {/* Хлебные крошки */}
      <nav className={styles.breadcrumbs}>
        {breadcrumbs.map((item, index) => (
          <span key={index}>
            <Link href={getSafeHref(item.href, '/')} className={styles.breadcrumbLink}>
              {item.label}
            </Link>
            {index < breadcrumbs.length - 1 && (
              <span className={styles.breadcrumbSeparator}>/</span>
            )}
          </span>
        ))}
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{product.name}</span>
      </nav>

      <div className={styles.productLayout}>
        {/* Галерея изображений */}
        <div className={styles.gallery}>
          <div className={styles.galleryMainRow}>
            <div className={styles.galleryLeftBadges}>
              {(product.cardBadgeSelections ?? [])
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((s) => s.badge)
                .filter((b) => b.imageUrl)
                .map((b) => {
                  const hoverText = b.description?.trim() || b.label || '';
                  return (
                    <BadgeTooltip key={b.id} content={hoverText} side="right">
                      <img
                        src={publicUploadUrl(b.imageUrl)}
                        alt={b.label}
                        className={styles.catalogBadgeDetailImg}
                      />
                    </BadgeTooltip>
                  );
                })}
            </div>
            <div className={styles.mainImage}>
              {product.images.length > 0 ? (
                <button
                  type="button"
                  className={styles.mainImageButton}
                  onClick={() => openLightbox(selectedImage)}
                  aria-label="Открыть изображение"
                >
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className={styles.image}
                  />
                </button>
              ) : (
                <div className={styles.noImage}>Нет изображения</div>
              )}
            </div>
            <div className={styles.galleryRightBadges}>
              {product.isFeatured && <span className={styles.hitBadge}>ХИТ</span>}
              {product.isNew && <span className={styles.newBadge}>Новинка</span>}
              {discount != null && discount > 0 && (
                <span className={styles.discountBadge}>-{discount}%</span>
              )}
              {product.videoUrl && (
                <span className={styles.videoBadge} title="Есть видео о товаре">
                  ▶ Видео
                </span>
              )}
            </div>
          </div>

          {showBadgePublicEditBlock && (
            <div className={styles.galleryBadgePublicEdit}>
              <div className={styles.galleryBadgePublicEditHeader}>
                <span className={styles.galleryBadgePublicEditLabel}>Бэйджи слева от фото</span>
                <div className={styles.attributesToolbar}>
                  {!isEditingPublicBadges ? (
                    <button
                      type="button"
                      className={styles.attributesEditBtn}
                      onClick={() => {
                        touchPublicSiteEditModeActivity();
                        const ids = catalogBadgeIdsFromProduct(product);
                        badgesEditBaselineRef.current = JSON.stringify(ids);
                        setDraftCatalogBadgeIds([...ids]);
                        setIsEditingPublicBadges(true);
                      }}
                      title="Редактировать бэйджи"
                      aria-label="Редактировать бэйджи"
                    >
                      <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                    </button>
                  ) : (
                    <div className={styles.publicEditToolbarActions}>
                      <button
                        type="button"
                        className={styles.attributesCancelBtn}
                        onClick={exitPublicBadgesEdit}
                        disabled={savingPublicBadges}
                        title="Закрыть без сохранения"
                        aria-label="Закрыть без сохранения"
                      >
                        <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.attributesSaveBtn}
                        onClick={() => void handleSavePublicCatalogBadges()}
                        disabled={savingPublicBadges || !isPublicBadgesDirty}
                        title={savingPublicBadges ? 'Сохранение...' : 'Сохранить'}
                        aria-label={savingPublicBadges ? 'Сохранение...' : 'Сохранить'}
                      >
                        <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isEditingPublicBadges && (
                <>
                  <p className={styles.galleryBadgeHint}>
                    Выбрано: {draftCatalogBadgeIds.length} / 5. На карточке в каталоге показываются
                    только бэйджи с загруженной картинкой.
                  </p>
                  <div className={styles.galleryBadgePickGrid}>
                    {badgeDefinitions.map((b) => {
                      const id = String(b.id);
                      const checked = draftCatalogBadgeIds.some((x) => String(x) === id);
                      return (
                        <div
                          key={id}
                          className={styles.galleryBadgePickItem}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          aria-label={b.label}
                          onClick={() => toggleDraftCatalogBadgeId(id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleDraftCatalogBadgeId(id);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            className={styles.galleryBadgePickCheckbox}
                            checked={checked}
                            tabIndex={-1}
                            aria-hidden
                            onChange={() => {
                              /* переключение только через onClick строки — избегаем двойного change у <label>+controlled checkbox */
                            }}
                          />
                          {b.imageUrl ? (
                            <span className={styles.galleryBadgePickThumb}>
                              <img src={publicUploadUrl(b.imageUrl)} alt="" />
                            </span>
                          ) : null}
                          <span>{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {product.images.length > 1 && (
            <div className={styles.thumbnails}>
              {product.images.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.thumbnail} ${index === selectedImage ? styles.thumbnailActive : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img} alt={`${product.name} - ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.titleAvailability}>
              {(() => {
                const av = getProductAvailability(product.stock, product.onOrder);
                const cls =
                  av === 'in_stock'
                    ? styles.inStock
                    : av === 'on_order'
                      ? styles.onOrder
                      : styles.soldOut;
                const prefix = av === 'in_stock' ? '✓ ' : '';
                return (
                  <span className={cls}>
                    {prefix}
                    {PRODUCT_AVAILABILITY_LABEL[av]}
                  </span>
                );
              })()}
            </div>
          </div>

          {product.sku && <p className={styles.sku}>Артикул: {product.sku}</p>}

          {cardVariants.length > 0 && (
            <div className={styles.cardVariantsSection}>
              <span className={styles.cardVariantsLabel}>Вариант:</span>
              <div className={styles.cardVariantsChips}>
                {cardVariants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`${styles.cardVariantChip} ${i === selectedCardVariantIndex ? styles.cardVariantChipActive : ''}`}
                    onClick={() => setSelectedCardVariantIndex(i)}
                    title={v.name}
                  >
                    {v.image ? (
                      <img src={v.image} alt="" className={styles.cardVariantChipImg} />
                    ) : (
                      <span>{v.color || v.size || v.name || `${i + 1}`}</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedCardVariant && (
                <p className={styles.cardVariantName}>{selectedCardVariant.name}</p>
              )}
            </div>
          )}

          <div className={styles.priceBlock}>
            <div className={styles.priceRowCluster}>
              <div className={styles.pricesRow}>
                {components.length > 0 ? (
                  <>
                    <div className={styles.priceBox}>
                      <span className={styles.priceLabel}>полотно</span>
                      <div
                        className={`${styles.priceInfo} ${isEditingPublicPrice ? styles.priceInfoEditing : ''}`}
                      >
                        {comparePrice && (
                          <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
                        )}
                        {isEditingPublicPrice ? (
                          <span className={styles.priceEditRow}>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={styles.priceEditInput}
                              value={draftPrice}
                              onChange={(e) => setDraftPrice(e.target.value)}
                              aria-label="Цена"
                            />
                            <span className={styles.priceCurrency}>₽</span>
                          </span>
                        ) : (
                          <span className={styles.price}>{price.toLocaleString()} ₽</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`${styles.priceBox} ${styles.priceBoxTooltip}`}
                      data-tooltip="В комплект входит: полотно 1шт., стойка коробки 2,5шт., наличники 5шт."
                    >
                      <span className={styles.priceLabel}>комплект</span>
                      <div className={styles.priceInfo}>
                        <span className={styles.price}>
                          {(kitPrice ?? price).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.priceItem}>
                    <div
                      className={`${styles.priceInfo} ${isEditingPublicPrice ? styles.priceInfoEditing : ''}`}
                    >
                      {comparePrice && (
                        <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
                      )}
                      {isEditingPublicPrice ? (
                        <span className={styles.priceEditRow}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.priceEditInput}
                            value={draftPrice}
                            onChange={(e) => setDraftPrice(e.target.value)}
                            aria-label="Цена"
                          />
                          <span className={styles.priceCurrency}>₽</span>
                        </span>
                      ) : (
                        <span className={styles.price}>{price.toLocaleString()} ₽</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {showPublicAttrsToolbar && (
                <div className={styles.publicPriceToolbar}>
                  {!isEditingPublicPrice ? (
                    <button
                      type="button"
                      className={styles.attributesEditBtn}
                      onClick={() => {
                        touchPublicSiteEditModeActivity();
                        const src = selectedCardVariant
                          ? String(
                              typeof selectedCardVariant.price === 'string'
                                ? selectedCardVariant.price
                                : selectedCardVariant.price
                            )
                          : product.price;
                        priceEditBaselineRef.current = src;
                        setDraftPrice(src);
                        setIsEditingPublicPrice(true);
                      }}
                      title="Редактировать цену"
                      aria-label="Редактировать цену"
                    >
                      <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                    </button>
                  ) : (
                    <div className={styles.publicEditToolbarActions}>
                      <button
                        type="button"
                        className={styles.attributesCancelBtn}
                        onClick={exitPublicPriceEdit}
                        disabled={savingPublicPrice}
                        title="Закрыть без сохранения"
                        aria-label="Закрыть без сохранения"
                      >
                        <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.attributesSaveBtn}
                        onClick={() => void handleSavePublicPrice()}
                        disabled={savingPublicPrice || !isPublicPriceDirty}
                        title={savingPublicPrice ? 'Сохранение...' : 'Сохранить'}
                        aria-label={savingPublicPrice ? 'Сохранение...' : 'Сохранить'}
                      >
                        <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.priceActions}>
              <button
                type="button"
                className={`${styles.compareButton} ${isInCompareState ? styles.compareButtonActive : ''}`}
                aria-label={isInCompareState ? 'Удалить из сравнения' : 'Добавить в сравнение'}
                onClick={handleCompareClick}
                disabled={isCompareLoading}
              >
                ⚖
              </button>
              <button
                type="button"
                className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ''}`}
                aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                onClick={handleFavoriteClick}
                disabled={isWishlistLoading}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            {(() => {
              if (!product) return null;

              const productId = String(product.id);

              // Если есть варианты исполнения, показываем компактный блок вариантов
              const hasVariants =
                (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) ||
                (product.openingSide &&
                  Array.isArray(product.openingSide) &&
                  product.openingSide.length > 0);

              if (hasVariants) {
                return (
                  <div className={styles.variantsCompact}>
                    <div className={styles.variantsListCompact}>
                      {variants.map((variant) => {
                        const cartItem = getCartItemForVariant(variant.size, variant.openingSide);
                        const isInCart = cartItem !== null;
                        const cartQuantity = cartItem ? Number(cartItem.quantity) : 0;
                        const isAdding = addingToCart[variant.id] || false;

                        return (
                          <div key={variant.id} className={styles.variantItemCompact}>
                            <div className={styles.variantRowCompact}>
                              {product.sizes &&
                                Array.isArray(product.sizes) &&
                                product.sizes.length > 0 && (
                                  <div className={styles.variantFieldCompact}>
                                    <label className={styles.variantLabelCompact}>Размер:</label>
                                    <select
                                      value={variant.size}
                                      onChange={(e) => {
                                        setVariants((prev) =>
                                          prev.map((v) =>
                                            v.id === variant.id ? { ...v, size: e.target.value } : v
                                          )
                                        );
                                      }}
                                      className={styles.optionSelectCompact}
                                    >
                                      <option value="">Выберите</option>
                                      {product.sizes.map((size) => (
                                        <option key={size} value={size}>
                                          {size}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {product.openingSide &&
                                Array.isArray(product.openingSide) &&
                                product.openingSide.length > 0 && (
                                  <div className={styles.variantFieldCompact}>
                                    <label className={styles.variantLabelCompact}>Сторона:</label>
                                    <select
                                      value={variant.openingSide}
                                      onChange={(e) => {
                                        setVariants((prev) =>
                                          prev.map((v) =>
                                            v.id === variant.id
                                              ? { ...v, openingSide: e.target.value }
                                              : v
                                          )
                                        );
                                      }}
                                      className={styles.optionSelectCompact}
                                    >
                                      <option value="">Выберите</option>
                                      {product.openingSide.map((side) => (
                                        <option key={side} value={side}>
                                          {side}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {components.length > 0 && (
                                <div className={styles.variantFieldCompact}>
                                  <label className={styles.variantLabelCompact}>Тип:</label>
                                  <select
                                    value={variant.deliveryType}
                                    onChange={(e) => {
                                      setVariants((prev) =>
                                        prev.map((v) =>
                                          v.id === variant.id
                                            ? {
                                                ...v,
                                                deliveryType: e.target.value as DeliveryType,
                                              }
                                            : v
                                        )
                                      );
                                    }}
                                    className={styles.optionSelectCompact}
                                  >
                                    <option value="">Выберите тип</option>
                                    <option value="polotno">Полотно</option>
                                    <option value="komplekt">Комплект</option>
                                  </select>
                                </div>
                              )}

                              {variants.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeVariantButtonCompact}
                                  onClick={() => {
                                    setVariants((prev) => prev.filter((v) => v.id !== variant.id));
                                  }}
                                  title="Удалить вариант"
                                  aria-label="Удалить вариант"
                                >
                                  🗑️
                                </button>
                              )}

                              <div className={styles.variantActionsCompact}>
                                {isInCart && cartItem ? (
                                  <div className={styles.cartControlsCompact}>
                                    <span className={styles.inCartLabelCompact}>В корзине</span>
                                    <div
                                      className={styles.quantityControlsCompact}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (isAdding || !cartItem) return;
                                          try {
                                            const newQuantity = Number(cartQuantity) - 1;
                                            if (newQuantity < 0) return;
                                            await updateCartItemQuantityById(
                                              cartItem.id,
                                              newQuantity
                                            );
                                          } catch (error) {
                                            if (error instanceof Error) {
                                              alert(error.message);
                                            } else {
                                              alert('Произошла ошибка при обновлении количества');
                                            }
                                          }
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        disabled={isAdding || !cartItem}
                                      >
                                        −
                                      </button>
                                      <span className={styles.quantityValueCompact}>
                                        {cartQuantity}
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (isAdding || !cartItem) return;
                                          try {
                                            const newQuantity = Number(cartQuantity) + 1;
                                            await updateCartItemQuantityById(
                                              cartItem.id,
                                              newQuantity
                                            );
                                          } catch (error) {
                                            if (error instanceof Error) {
                                              alert(error.message);
                                            } else {
                                              alert('Произошла ошибка при обновлении количества');
                                            }
                                          }
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        disabled={isAdding || !cartItem}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className={styles.quantitySelectorCompact}>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={() => {
                                          const newQuantity = Math.max(1, variant.quantity - 1);
                                          setVariants((prev) =>
                                            prev.map((v) =>
                                              v.id === variant.id
                                                ? { ...v, quantity: newQuantity }
                                                : v
                                            )
                                          );
                                        }}
                                        disabled={variant.quantity <= 1}
                                      >
                                        −
                                      </button>
                                      <span className={styles.quantityValueCompact}>
                                        {variant.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={() => {
                                          const newQuantity = variant.quantity + 1;
                                          setVariants((prev) =>
                                            prev.map((v) =>
                                              v.id === variant.id
                                                ? { ...v, quantity: newQuantity }
                                                : v
                                            )
                                          );
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.addToCartButtonCompact}
                                      onClick={async () => {
                                        if (!product) return;

                                        const hasSize =
                                          !product.sizes?.length || !!variant.size?.trim();
                                        const hasOpeningSide =
                                          !product.openingSide?.length ||
                                          !!variant.openingSide?.trim();
                                        const hasType =
                                          components.length === 0 ||
                                          variant.deliveryType === 'polotno' ||
                                          variant.deliveryType === 'komplekt';

                                        if (!hasSize || !hasOpeningSide || !hasType) {
                                          const messages: string[] = [];
                                          if (!hasSize) messages.push('Выберите размер двери');
                                          if (!hasOpeningSide)
                                            messages.push('Выберите сторону открывания двери');
                                          if (!hasType)
                                            messages.push('Выберите «полотно» или «комплект»');
                                          setVariantNotification(
                                            messages.length === 1
                                              ? messages[0]
                                              : messages.join('\n')
                                          );
                                          return;
                                        }

                                        const doAdd = async () => {
                                          setAddingToCart((prev) => ({
                                            ...prev,
                                            [variant.id]: true,
                                          }));
                                          try {
                                            await addToCart(
                                              productId,
                                              variant.quantity,
                                              variant.size && variant.size.trim()
                                                ? variant.size
                                                : undefined,
                                              variant.openingSide && variant.openingSide.trim()
                                                ? variant.openingSide
                                                : undefined
                                            );
                                            if (
                                              variant.deliveryType === 'komplekt' &&
                                              kitComponentsForCart
                                            ) {
                                              const qty = variant.quantity;
                                              await addComponentToCart(
                                                kitComponentsForCart.stoikaKorobka.id,
                                                2.5 * qty
                                              );
                                              await addComponentToCart(
                                                kitComponentsForCart.nalichnik.id,
                                                5 * qty
                                              );
                                            }
                                            await new Promise((resolve) =>
                                              setTimeout(resolve, 100)
                                            );
                                          } catch (error) {
                                            if (isAuthRequiredForCartError(error)) {
                                              return;
                                            }
                                            if (error instanceof Error) {
                                              alert(error.message);
                                            } else {
                                              alert(
                                                'Произошла ошибка при добавлении товара в корзину'
                                              );
                                            }
                                          } finally {
                                            setAddingToCart((prev) => ({
                                              ...prev,
                                              [variant.id]: false,
                                            }));
                                          }
                                        };
                                        await doAdd();
                                      }}
                                      disabled={isAdding}
                                    >
                                      {isAdding ? 'Добавление...' : 'В корзину'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Кнопка добавления варианта */}
                    <button
                      type="button"
                      className={styles.addVariantButtonCompact}
                      onClick={() => {
                        const newVariant: ProductVariant = {
                          id: `variant-${Date.now()}-${Math.random()}`,
                          size: '',
                          openingSide: '',
                          quantity: 1,
                          deliveryType: '',
                        };
                        setVariants((prev) => [...prev, newVariant]);
                      }}
                    >
                      + Добавить товар
                    </button>
                  </div>
                );
              }

              // Интерфейс для товаров без вариантов (или с выбором «схожего» варианта)
              const selectedCardVariantId = selectedCardVariant?.id ?? null;
              const cartItem = cart.find(
                (item) =>
                  item.productId !== null &&
                  String(item.productId) === productId &&
                  item.componentId === null &&
                  (item.cardVariantId ?? null) === selectedCardVariantId &&
                  item.size === null &&
                  item.openingSide === null
              );
              const quantity = cartItem ? Number(cartItem.quantity) : 0;
              const isInCart = quantity > 0;

              if (isInCart) {
                return (
                  <div className={styles.cartControls}>
                    <span className={styles.inCartLabel}>В корзине</span>
                    <div className={styles.quantityControls} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isAddingToCart) return;
                          try {
                            const newQuantity = Number(quantity) - 1;
                            if (newQuantity < 0) return;
                            if (cartItem?.id && selectedCardVariantId !== undefined) {
                              await updateCartItemQuantityById(cartItem.id, newQuantity);
                            } else {
                              await updateQuantity(productId, newQuantity);
                            }
                          } catch (error) {
                            if (error instanceof Error) {
                              alert(error.message);
                            } else {
                              alert('Произошла ошибка при обновлении количества');
                            }
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled={isAddingToCart}
                      >
                        −
                      </button>
                      <span className={styles.quantityValue}>{quantity}</span>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isAddingToCart) return;
                          try {
                            const newQuantity = Number(quantity) + 1;
                            if (cartItem?.id && selectedCardVariantId !== undefined) {
                              await updateCartItemQuantityById(cartItem.id, newQuantity);
                            } else {
                              await updateQuantity(productId, newQuantity);
                            }
                          } catch (error) {
                            if (error instanceof Error) {
                              alert(error.message);
                            } else {
                              alert('Произошла ошибка при обновлении количества');
                            }
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled={isAddingToCart}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  className={`${styles.addToCartButton} ${isInCart ? styles.addToCartButtonSuccess : ''}`}
                  onClick={async () => {
                    if (!product) return;

                    try {
                      setIsAddingToCart(true);
                      await addToCart(productId, 1, undefined, undefined, selectedCardVariant?.id);
                    } catch (error) {
                      if (isAuthRequiredForCartError(error)) {
                        return;
                      }
                      if (error instanceof Error) {
                        alert(error.message);
                      } else {
                        alert('Произошла ошибка при добавлении товара в корзину');
                      }
                    } finally {
                      setIsAddingToCart(false);
                    }
                  }}
                  disabled={isAddingToCart || !product}
                >
                  {isAddingToCart
                    ? 'Добавление...'
                    : isInCart
                      ? `Добавлено в корзину ${quantity} шт.`
                      : 'Добавить в корзину'}
                </button>
              );
            })()}
          </div>

          {/* Характеристики */}
          {showAttributesSection && (
            <div className={styles.attributes}>
              <div className={styles.attributesHeader}>
                <h2 className={styles.attributesTitle}>Характеристики</h2>
                {showPublicAttrsToolbar && attributesEditableRows.length > 0 && (
                  <div className={styles.attributesToolbar}>
                    {!isEditingPublicAttrs ? (
                      <button
                        type="button"
                        className={styles.attributesEditBtn}
                        onClick={() => {
                          touchPublicSiteEditModeActivity();
                          const rows = attributesEditableRows.map((a) => ({ ...a }));
                          attrsEditBaselineRef.current = serializePublicAttributeDraft(rows);
                          setDraftAttributes(rows);
                          setIsEditingPublicAttrs(true);
                        }}
                        title="Редактировать характеристики"
                        aria-label="Редактировать характеристики"
                      >
                        <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                      </button>
                    ) : (
                      <div className={styles.publicEditToolbarActions}>
                        <button
                          type="button"
                          className={styles.attributesCancelBtn}
                          onClick={exitPublicAttrsEdit}
                          disabled={savingPublicAttrs}
                          title="Закрыть без сохранения"
                          aria-label="Закрыть без сохранения"
                        >
                          <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={styles.attributesSaveBtn}
                          onClick={() => void handleSavePublicAttributes()}
                          disabled={savingPublicAttrs || !isPublicAttrsDirty}
                          title={savingPublicAttrs ? 'Сохранение...' : 'Сохранить'}
                          aria-label={savingPublicAttrs ? 'Сохранение...' : 'Сохранить'}
                        >
                          <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <dl className={styles.attributesList}>
                {product.weight != null && !Number.isNaN(Number(product.weight)) && (
                  <>
                    <dt>Масса</dt>
                    <dd>{`${Number(product.weight)} кг`}</dd>
                  </>
                )}
                {isEditingPublicAttrs
                  ? draftAttributes.map((attr, index) => (
                      <React.Fragment key={`${attr.slug ?? attr.name}-${index}`}>
                        <dt>{attr.name}</dt>
                        <dd>
                          <input
                            type="text"
                            className={styles.attributesInput}
                            value={attr.value}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraftAttributes((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, value: v } : row))
                              );
                            }}
                            aria-label={`Значение: ${attr.name}`}
                          />
                        </dd>
                      </React.Fragment>
                    ))
                  : attributesArray.map((attr, index) => {
                      if (!attr.value) return null;

                      return (
                        <React.Fragment key={`${attr.name}-${index}`}>
                          <dt>{attr.name}</dt>
                          <dd>{attr.value}</dd>
                        </React.Fragment>
                      );
                    })}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Описание */}
      {(product.description?.trim() || showPublicAttrsToolbar) && (
        <div className={styles.description}>
          <div className={styles.attributesHeader}>
            <h2 className={`${styles.descriptionTitle} ${styles.descriptionTitleBar}`}>Описание</h2>
            {showPublicAttrsToolbar && (
              <div className={styles.attributesToolbar}>
                {!isEditingPublicDescription ? (
                  <button
                    type="button"
                    className={styles.attributesEditBtn}
                    onClick={() => {
                      touchPublicSiteEditModeActivity();
                      const src = product.description ?? '';
                      descriptionEditBaselineRef.current = src;
                      setDraftDescription(src);
                      setIsEditingPublicDescription(true);
                    }}
                    title="Редактировать описание"
                    aria-label="Редактировать описание"
                  >
                    <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                  </button>
                ) : (
                  <div className={styles.publicEditToolbarActions}>
                    <button
                      type="button"
                      className={styles.attributesCancelBtn}
                      onClick={exitPublicDescriptionEdit}
                      disabled={savingPublicDescription}
                      title="Закрыть без сохранения"
                      aria-label="Закрыть без сохранения"
                    >
                      <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.attributesSaveBtn}
                      onClick={() => void handleSavePublicDescription()}
                      disabled={savingPublicDescription || !isPublicDescriptionDirty}
                      title={savingPublicDescription ? 'Сохранение...' : 'Сохранить'}
                      aria-label={savingPublicDescription ? 'Сохранение...' : 'Сохранить'}
                    >
                      <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditingPublicDescription ? (
            <textarea
              className={styles.descriptionTextarea}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={10}
              aria-label="Текст описания"
            />
          ) : product.description?.trim() ? (
            <div
              className={styles.descriptionText}
              dangerouslySetInnerHTML={{
                __html: escapeHtmlAndPreserveNewlines(product.description),
              }}
            />
          ) : (
            <p className={styles.descriptionEmpty}>Описание не заполнено</p>
          )}
        </div>
      )}

      {/* Видео о товаре */}
      {product.videoUrl && (
        <div className={styles.productVideo}>
          <h2 className={styles.descriptionTitle}>Видео о товаре</h2>
          <ProductVideoPlayer url={product.videoUrl} />
        </div>
      )}

      {/* Комплектующие */}
      <ProductComponents
        productId={product.id}
        initialComponents={components}
        publicToolbar={
          showPublicAttrsToolbar && components.length > 0
            ? {
                show: true,
                isEditing: isEditingPublicComponents,
                onStartEdit: () => {
                  touchPublicSiteEditModeActivity();
                  const rows: PublicComponentDraftRow[] = components.map((c) => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    price: String(c.price),
                  }));
                  componentsEditBaselineRef.current = serializePublicComponentsDraft(rows);
                  setDraftComponents(rows);
                  setIsEditingPublicComponents(true);
                },
                onCancel: exitPublicComponentsEdit,
                onSave: () => void handleSavePublicComponents(),
                canSave: isPublicComponentsDirty,
                saving: savingPublicComponents,
              }
            : undefined
        }
        draftRows={isEditingPublicComponents ? draftComponents : undefined}
        onDraftRowChange={handleDraftComponentChange}
      />

      {/* Отзывы */}
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        initialRating={product.rating}
        initialReviewsCount={product.reviewsCount}
        initialReviews={product.reviews}
      />

      {/* Лайтбокс через Portal — рендерится в body, вне иерархии компонентов */}
      {isMounted &&
        isLightboxOpen &&
        product.images.length > 0 &&
        createPortal(
          <div className={styles.lightbox} onClick={closeLightbox}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              aria-label="Закрыть"
            >
              ✕
            </button>

            {product.images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                aria-label="Предыдущее изображение"
              >
                ‹
              </button>
            )}

            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <img
                src={product.images[lightboxIndex]}
                alt={`${product.name} - ${lightboxIndex + 1}`}
                className={styles.lightboxImage}
              />
            </div>

            {product.images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                aria-label="Следующее изображение"
              >
                ›
              </button>
            )}

            {product.images.length > 1 && (
              <div className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {product.images.length}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
