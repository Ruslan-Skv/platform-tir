import React from 'react';

import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './Breadcrumbs.module.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Проверяет, что строка похожа на slug (латиница/цифры/дефисы), а не на человекочитаемое название */
function looksLikeSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.trim());
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

  // Не показывать slug в крошках — только человекочитаемые названия
  const displayCategoryName = looksLikeSlug(categoryName) ? 'Каталог' : categoryName;
  const displayParentName =
    parentCategoryName && looksLikeSlug(parentCategoryName) ? undefined : parentCategoryName;

  // Если текущая категория - "Каталог", не добавляем её дважды
  const isAllProducts = displayCategoryName === 'Каталог';

  if (!isAllProducts) {
    // Добавляем "Каталог" как промежуточную ссылку
    breadcrumbs.push({ label: 'Каталог', href: '/catalog/products' });
  }

  // Если есть родительская категория, добавляем её
  if (displayParentName && parentCategorySlug) {
    breadcrumbs.push({
      label: displayParentName,
      href: `/catalog/products/${parentCategorySlug}`,
    });
  }

  // Текущая категория (без ссылки)
  breadcrumbs.push({ label: displayCategoryName });

  return (
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
      <ol className={styles.list}>
        {breadcrumbs.map((item, index) => (
          <li key={index} className={styles.item}>
            {item.href ? (
              <Link href={getSafeHref(item.href, '/')} className={styles.link}>
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
