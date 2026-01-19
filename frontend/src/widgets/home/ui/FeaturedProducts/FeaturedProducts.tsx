'use client';

import React from 'react';

import { useRouter } from 'next/navigation';

import type { Product } from '@/entities/product/types';
import { ProductCard } from '@/pages/catalog/ui/ProductsGrid';

import styles from './FeaturedProducts.module.css';

// Временные данные - потом замените на реальные из API
const featuredProducts: Product[] = [
  {
    id: 1,
    name: 'Кухня "Модерн" с барной стойкой',
    slug: 'kuhnya-modern-s-barnoy-stoykoy',
    price: 85000,
    image: '/images/products/kitchen-modern.jpg',
    category: 'Кухни',
    rating: 4.8,
    isNew: true,
  },
  {
    id: 2,
    name: 'Шкаф-купе 3-х створчатый "Престиж"',
    slug: 'shkaf-kupe-3-stvorchaty-prestizh',
    price: 42000,
    image: '/images/products/wardrobe.jpg',
    category: 'Шкафы',
    rating: 4.6,
  },
  {
    id: 3,
    name: 'Межкомнатная дверь "Classic" дуб',
    slug: 'mezhkomnatnaya-dver-classic-dub',
    price: 12500,
    image: '/images/products/door-classic.jpg',
    category: 'Двери',
    rating: 4.7,
    discount: 15,
  },
  {
    id: 4,
    name: 'Пластиковое окно 1500x1500 с ламинацией',
    slug: 'plastikovoe-okno-1500x1500-s-laminaciey',
    price: 8900,
    image: '/images/products/window-standard.jpg',
    category: 'Окна',
    rating: 4.9,
  },
  {
    id: 5,
    name: 'Натяжной потолок глянцевый белый',
    slug: 'natyazhnoy-potolok-glyantsevyy-belyy',
    price: 550,
    image: '/images/products/ceiling-glossy.jpg',
    category: 'Потолки',
    rating: 4.8,
    isNew: true,
  },
  {
    id: 6,
    name: 'Жалюзи горизонтальные алюминиевые',
    slug: 'zhalyuzi-gorizontalnye-alyuminievye',
    price: 2800,
    image: '/images/products/blinds-horizontal.jpg',
    category: 'Жалюзи',
    rating: 4.5,
    discount: 10,
  },
  {
    id: 7,
    name: 'Гостиная "Милан" с ТВ-тумбой',
    slug: 'gostinaya-milan-s-tv-tumboy',
    price: 120000,
    image: '/images/products/living-room.jpg',
    category: 'Гостиные',
    rating: 4.9,
  },
  {
    id: 8,
    name: 'Входная дверь стальная с терморазрывом',
    slug: 'vhodnaya-dver-stalnaya-s-termorazryvom',
    price: 28000,
    image: '/images/products/entrance-door.jpg',
    category: 'Двери',
    rating: 4.7,
  },
];

export const FeaturedProducts: React.FC = () => {
  const router = useRouter();

  const handleViewAll = () => {
    router.push('/catalog');
  };

  return (
    <section className={styles.featured}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Популярные товары</h2>
            <p className={styles.subtitle}>Товары, которые выбирают наши клиенты</p>
          </div>
          <button type="button" className={styles.viewAllButton} onClick={handleViewAll}>
            Смотреть все →
          </button>
        </div>

        <div className={styles.productsGrid}>
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
