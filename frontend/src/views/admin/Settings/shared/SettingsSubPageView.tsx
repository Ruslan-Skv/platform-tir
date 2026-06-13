import type { ReactNode } from 'react';

import Link from 'next/link';

import styles from './SettingsPage.module.css';

type SettingsSubPageViewProps = {
  title: string;
  subtitle?: ReactNode;
  wide?: boolean;
  /** Специальный header для страницы бэйджей каталога */
  headerVariant?: 'default' | 'badges';
  backLink?: { href: string; label: string };
  children: ReactNode;
};

export function SettingsSubPageView({
  title,
  subtitle,
  wide = false,
  headerVariant = 'default',
  backLink,
  children,
}: SettingsSubPageViewProps) {
  const pageClassName = wide ? `${styles.page} ${styles.pageWide}` : styles.page;

  return (
    <div className={pageClassName}>
      {headerVariant === 'badges' ? (
        <header className={styles.badgesHeader}>
          <h1 className={styles.badgesTitle}>{title}</h1>
          {subtitle && <p className={styles.badgesSubtitle}>{subtitle}</p>}
          {backLink && (
            <p className={styles.badgesBack}>
              <Link href={backLink.href} className={styles.backLink}>
                {backLink.label}
              </Link>
            </p>
          )}
        </header>
      ) : (
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {backLink && (
            <p className={styles.backNav}>
              <Link href={backLink.href} className={styles.backLink}>
                {backLink.label}
              </Link>
            </p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
