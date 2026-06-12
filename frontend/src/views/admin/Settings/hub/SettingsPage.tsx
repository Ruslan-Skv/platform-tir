'use client';

import { ProductTemplatesSection } from '../product-templates/ProductTemplatesSection';
import { RolesSection } from '../roles/RolesSection';
import styles from '../shared/SettingsPage.module.css';

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Настройки</h1>
        <p className={styles.subtitle}>
          Управление ролями, шаблонами товаров и параметрами системы. Роли заданы в базе данных
          (enum UserRole) и используются для доступа к разделам админки.
        </p>
      </header>
      <ProductTemplatesSection />
      <RolesSection />
    </div>
  );
}
