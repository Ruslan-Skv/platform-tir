'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';

import styles from './ProductDetailPage.module.css';

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
  isNew: boolean;
  isFeatured: boolean;
  // Атрибуты могут быть массивом (новый формат) или объектом (старый формат)
  attributes: Array<{ name: string; value: string }> | Record<string, unknown> | null;
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
}

interface ProductDetailPageProps {
  slug: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug }) => {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Для SSR — портал работает только на клиенте
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  // Атрибуты могут быть в двух форматах:
  // 1. Новый формат (массив): [{name: "Модель", value: "..."}, ...]
  // 2. Старый формат (объект): {key: value, ...}
  type AttributeItem = { name: string; value: string };
  let attributesArray: AttributeItem[] = [];

  if (product.attributes) {
    if (Array.isArray(product.attributes)) {
      // Новый формат - массив
      attributesArray = product.attributes as AttributeItem[];
    } else {
      // Старый формат - объект (порядок не гарантирован)
      const attrsObj = product.attributes as Record<string, string>;
      attributesArray = Object.entries(attrsObj).map(([key, value]) => ({
        name: key,
        value: String(value),
      }));
    }
  }

  // Формируем хлебные крошки
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог товаров', href: '/catalog/products' },
  ];

  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.parent.name,
      href: `/catalog/products/${product.category.parent.slug}`,
    });
  }

  // Формируем URL для категории товара
  // Если есть родительская категория: /catalog/products/parent-slug/subcategory-part
  // Если нет родительской: /catalog/products/category-slug
  if (product.category.parent) {
    // Извлекаем часть подкатегории из полного slug
    // entrance-doors-tt-xl-xxl -> tt-xl-xxl (убираем prefix entrance-doors-)
    const subcategoryPart = product.category.slug.replace(`${product.category.parent.slug}-`, '');
    breadcrumbs.push({
      label: product.category.name,
      href: `/catalog/products/${product.category.parent.slug}/${subcategoryPart}`,
    });
  } else {
    breadcrumbs.push({
      label: product.category.name,
      href: `/catalog/products/${product.category.slug}`,
    });
  }

  return (
    <div className={styles.container}>
      {/* Хлебные крошки */}
      <nav className={styles.breadcrumbs}>
        {breadcrumbs.map((item, index) => (
          <span key={index}>
            <Link href={item.href} className={styles.breadcrumbLink}>
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
            {/* Бейджи */}
            <div className={styles.badges}>
              {product.isFeatured && <span className={styles.hitBadge}>ХИТ</span>}
              {product.isNew && <span className={styles.newBadge}>Новинка</span>}
              {discount && <span className={styles.discountBadge}>-{discount}%</span>}
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
          <h1 className={styles.title}>{product.name}</h1>

          {product.sku && <p className={styles.sku}>Артикул: {product.sku}</p>}

          <div className={styles.priceBlock}>
            {comparePrice && (
              <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
            )}
            <span className={styles.price}>{price.toLocaleString()} ₽</span>
          </div>

          <div className={styles.availability}>
            {product.stock > 0 ? (
              <span className={styles.inStock}>✓ В наличии</span>
            ) : (
              <span className={styles.outOfStock}>Под заказ</span>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.addToCartButton}>
              Добавить в корзину
            </button>
            <button type="button" className={styles.favoriteButton}>
              ♡
            </button>
          </div>

          {/* Характеристики */}
          {attributesArray.length > 0 && (
            <div className={styles.attributes}>
              <h2 className={styles.attributesTitle}>Характеристики</h2>
              <dl className={styles.attributesList}>
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
            dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br />') }}
          />
        </div>
      )}

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
