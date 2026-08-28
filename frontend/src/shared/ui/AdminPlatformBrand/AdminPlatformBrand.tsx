import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';
import { Logo } from '@/shared/ui/Logo';

import styles from './AdminPlatformBrand.module.css';

const PLATFORM_TITLE = 'Виртуальный офис';

type AdminPlatformBrandProps = {
  /** Только знак (сайдбар в свёрнутом виде). */
  collapsed?: boolean;
  /** Крупнее для экрана входа. */
  size?: 'sidebar' | 'login';
  /** Ссылка на публичный сайт — только для логотипа. */
  publicSiteHref?: string;
  className?: string;
};

export function AdminPlatformBrand({
  collapsed = false,
  size = 'sidebar',
  publicSiteHref,
  className,
}: AdminPlatformBrandProps) {
  const showTitle = size === 'sidebar' && !collapsed;
  const markClassName = size === 'login' ? styles.logoLoginMark : styles.logoSidebarMark;

  const houseMark = (
    <Logo markOnly unlinked className={markClassName} linkClassName={styles.logoWrap} />
  );

  const linkedHouseMark = publicSiteHref ? (
    <Link
      href={getSafeHref(publicSiteHref, '/')}
      className={styles.logoLink}
      title="Вернуться на публичный сайт"
      aria-label="Вернуться на публичный сайт"
    >
      {houseMark}
    </Link>
  ) : (
    houseMark
  );

  return (
    <span
      className={[
        styles.brand,
        size === 'login' ? styles.login : styles.sidebar,
        collapsed ? styles.collapsed : '',
        showTitle ? styles.withTitle : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showTitle ? (
        <span className={styles.brandRow}>
          {linkedHouseMark}
          <span className={styles.platformTitle} title={PLATFORM_TITLE}>
            {PLATFORM_TITLE}
          </span>
        </span>
      ) : size === 'login' ? (
        <span className={`${styles.brandRow} ${styles.loginBrandRow}`}>
          {linkedHouseMark}
          <span className={styles.platformTitle} title={PLATFORM_TITLE}>
            {PLATFORM_TITLE}
          </span>
        </span>
      ) : (
        linkedHouseMark
      )}
    </span>
  );
}
