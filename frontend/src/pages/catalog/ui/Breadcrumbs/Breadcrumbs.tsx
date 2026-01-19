import React from 'react';

import Link from 'next/link';

import styles from './Breadcrumbs.module.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  categoryName?: string;
  parentCategoryName?: string;
  parentCategorySlug?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  categoryName = 'Каталог',
  parentCategoryName,
  parentCategorySlug,
}) => {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Главная', href: '/' }];

  // Если текущая категория - "Каталог товаров", не добавляем её дважды
  const isAllProducts = categoryName === 'Каталог товаров';

  if (!isAllProducts) {
    // Добавляем "Каталог товаров" как промежуточную ссылку
    breadcrumbs.push({ label: 'Каталог товаров', href: '/catalog/products' });
  }

  // Если есть родительская категория, добавляем её
  if (parentCategoryName && parentCategorySlug) {
    breadcrumbs.push({
      label: parentCategoryName,
      href: `/catalog/products/${parentCategorySlug}`,
    });
  }

  // Текущая категория (без ссылки)
  breadcrumbs.push({ label: categoryName });

  return (
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
      <ol className={styles.list}>
        {breadcrumbs.map((item, index) => (
          <li key={index} className={styles.item}>
            {item.href ? (
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
            {index < breadcrumbs.length - 1 && <span className={styles.separator}>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
};
