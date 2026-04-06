'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';

import { type ProductComponent, getProductComponents } from '@/shared/api/product-components';
import type { Review } from '@/shared/api/reviews';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';
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
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  isNew: boolean;
  isFeatured: boolean;
  // Атрибуты могут быть массивом (новый формат) или объектом (старый формат)
  attributes: Array<{ name: string; value: string }> | Record<string, unknown> | null;
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

type AttributeItem = { name: string; value: string };

interface ProductDetailPageProps {
  slug: string;
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
        const response = await fetch(`${apiUrl}/products/slug/${slug}`);

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
      if (err instanceof Error) {
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
    const canvasPrice =
      selectedCardVariant != null
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
  }, [product, components, selectedCardVariant]);

  // Хуки атрибутов — строго до любых return, иначе нарушается порядок Hooks при loading → loaded
  const rawAttributesArray = useMemo<AttributeItem[]>(() => {
    if (!product?.attributes) return [];
    // Атрибуты могут быть в двух форматах:
    // 1) массив [{name, value}] (новый формат)
    // 2) объект { [slug|name]: value } (старый формат)
    if (Array.isArray(product.attributes)) {
      return (product.attributes as AttributeItem[]).filter(
        (a) => a && typeof a.name === 'string' && a.name.trim() !== ''
      );
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

        ordered.push({ name: title, value: trimmed });
        usedKeys.add(slug);
        usedKeys.add(title);
      }

      // Добавляем "лишние" атрибуты (например, кастомные), сохраняя исходный порядок
      for (const item of rawAttributesArray) {
        const key = item.name.trim();
        if (!key) continue;
        if (usedKeys.has(key)) continue;
        const trimmed = String(item.value ?? '').trim();
        if (!trimmed) continue;
        ordered.push({ name: key, value: trimmed });
      }

      return ordered;
    }

    // Без схемы категории — как было (показываем непустые)
    return rawAttributesArray.filter((a) => String(a.value ?? '').trim() !== '');
  }, [rawAttributesArray, categoryAttributes]);

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
      href: `/catalog/products/${product.category.parent.slug}`,
    });
  }

  // URL подкатегории как в каталоге и в админке (навигация): /catalog/products/{parent}/{child.slug}
  // Второй сегмент — полный slug листовой категории из API (не суффикс без префикса родителя):
  // иначе Next открывает несуществующий маршрут, ломается клиентская навигация и хлебные крошки.
  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.name,
      href: `/catalog/products/${product.category.parent.slug}/${product.category.slug}`,
    });
  } else {
    breadcrumbs.push({
      label: product.category.name,
      href: `/catalog/products/${product.category.slug}`,
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
              {product.stock > 0 ? (
                <span className={styles.inStock}>✓ В наличии</span>
              ) : (
                <span className={styles.outOfStock}>Под заказ</span>
              )}
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
            <div className={styles.pricesRow}>
              {components.length > 0 ? (
                <>
                  <div className={styles.priceBox}>
                    <span className={styles.priceLabel}>полотно</span>
                    <div className={styles.priceInfo}>
                      {comparePrice && (
                        <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
                      )}
                      <span className={styles.price}>{price.toLocaleString()} ₽</span>
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
                  <div className={styles.priceInfo}>
                    {comparePrice && (
                      <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
                    )}
                    <span className={styles.price}>{price.toLocaleString()} ₽</span>
                  </div>
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
          {(attributesArray.length > 0 ||
            (product.weight != null && !Number.isNaN(Number(product.weight)))) && (
            <div className={styles.attributes}>
              <h2 className={styles.attributesTitle}>Характеристики</h2>
              <dl className={styles.attributesList}>
                {product.weight != null && !Number.isNaN(Number(product.weight)) && (
                  <>
                    <dt>Масса</dt>
                    <dd>{`${Number(product.weight)} кг`}</dd>
                  </>
                )}
                {attributesArray.map((attr, index) => {
                  // Пропускаем пустые значения
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
      {product.description && (
        <div className={styles.description}>
          <h2 className={styles.descriptionTitle}>Описание</h2>
          <div
            className={styles.descriptionText}
            dangerouslySetInnerHTML={{ __html: escapeHtmlAndPreserveNewlines(product.description) }}
          />
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
      <ProductComponents productId={product.id} initialComponents={components} />

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
