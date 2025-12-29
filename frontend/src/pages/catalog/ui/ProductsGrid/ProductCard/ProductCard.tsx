import React from 'react';
import Link from 'next/link';
import type { Product } from '@/entities/product';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const oldPrice = product.discount ? product.price : undefined;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Реализовать добавление в избранное
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Реализовать добавление в корзину
  };

  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.id}`} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          <img src={product.image} alt={product.name} className={styles.image} loading="lazy" />

          {/* Бейджи */}
          <div className={styles.badges}>
            {product.isNew && <span className={styles.newBadge}>Новинка</span>}
            {product.discount && <span className={styles.discountBadge}>-{product.discount}%</span>}
          </div>

          <button
            type="button"
            className={styles.favoriteButton}
            aria-label="Добавить в избранное"
            onClick={handleFavoriteClick}
          >
            ♡
          </button>
        </div>

        <div className={styles.content}>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.category}>{product.category}</p>

          <div className={styles.rating}>
            {'★'.repeat(Math.floor(product.rating))}
            {'☆'.repeat(5 - Math.floor(product.rating))}
            <span className={styles.ratingValue}>({product.rating})</span>
          </div>

          <div className={styles.price}>
            {oldPrice && <span className={styles.oldPrice}>{oldPrice.toLocaleString()} ₽</span>}
            <span className={styles.finalPrice}>{finalPrice.toLocaleString()} ₽</span>
          </div>

          <button
            type="button"
            className={styles.addToCartButton}
            onClick={handleAddToCart}
          >
            В корзину
          </button>
        </div>
      </Link>
    </div>
  );
};
