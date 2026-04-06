'use client';

import Link from 'next/link';

import { ProductCardBadgesSection } from '@/views/admin/Settings/ProductCardBadgesSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminProductCardBadgesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Бэйджи карточки товара</h1>
        <p className={styles.subtitle}>
          Картинки для бэйджей слева от фото в каталоге и на странице товара. Формат — JPEG. В
          карточке товара выбирается до 5 бэйджей из этого списка; справа от фото по-прежнему
          отображаются «ХИТ», «Новинка», скидка и видео.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <ProductCardBadgesSection />
    </div>
  );
}
