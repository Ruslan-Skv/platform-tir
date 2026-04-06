'use client';

import Link from 'next/link';

import { ProductCardBadgesSection } from '@/views/admin/Settings/ProductCardBadgesSection';
import styles from '@/views/admin/Settings/SettingsPage.module.css';

export default function AdminProductCardBadgesPage() {
  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <header className={styles.badgesHeader}>
        <h1 className={styles.badgesTitle}>Бэйджи карточки товара</h1>
        <p className={styles.badgesSubtitle}>
          Картинки для бэйджей слева от фото в каталоге и на странице товара. Формат — JPEG. В
          карточке товара выбирается до 5 бэйджей из этого списка; справа от фото по-прежнему
          отображаются «ХИТ», «Новинка», скидка и видео.
        </p>
        <p className={styles.badgesBack}>
          <Link href="/admin/settings/catalog" style={{ color: '#d90652' }}>
            ← Настройки каталога
          </Link>
        </p>
      </header>
      <ProductCardBadgesSection />
    </div>
  );
}
