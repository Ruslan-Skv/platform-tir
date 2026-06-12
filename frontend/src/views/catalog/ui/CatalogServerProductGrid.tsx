import Link from 'next/link';

import type { CatalogApiProduct } from '@/shared/types/catalog';
import { formatCatalogProductPrice } from '@/views/catalog/lib/format-catalog-price';

import styles from './CatalogServerProductGrid.module.css';

interface CatalogServerProductGridProps {
  products: CatalogApiProduct[];
}

/**
 * SSR-разметка карточек для SEO: в HTML для краулеров, но скрыта от пользователей
 * (атрибут hidden + CatalogSeoFallbackController), чтобы не мелькала до гидратации.
 */
export function CatalogServerProductGrid({ products }: CatalogServerProductGridProps) {
  if (products.length === 0) return null;

  return (
    <section
      id="catalog-seo-fallback"
      className={styles.seoGrid}
      aria-label="Товары в категории"
      hidden
    >
      <ul className={styles.seoList}>
        {products.map((product) => {
          const image = product.images?.[0];
          const priceLabel = formatCatalogProductPrice(product.price);
          return (
            <li key={product.id} className={styles.seoItem}>
              <Link href={`/product/${product.slug}`} className={styles.seoLink}>
                {image ? (
                  <img src={image} alt={product.name} className={styles.seoImage} loading="lazy" />
                ) : null}
                <span className={styles.seoName}>{product.name}</span>
                {priceLabel ? <span className={styles.seoPrice}>{priceLabel}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
