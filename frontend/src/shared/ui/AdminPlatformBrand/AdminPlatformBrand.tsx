import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';
import { Logo } from '@/shared/ui/Logo';

import styles from './AdminPlatformBrand.module.css';

const PLATFORM_TITLE = 'Виртуальный офис';

type AdminPlatformBrandProps = {
  /** Только знак (сайдбар в свёрнутом виде). */
  collapsed?: boolean;
  /** `header` — компактная подпись в мобильной шапке (две строки). */
  size?: 'sidebar' | 'login' | 'header';
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
  const showTitle = (size === 'sidebar' && !collapsed) || size === 'header' || size === 'login';
  const markClassName =
    size === 'login'
      ? styles.logoLoginMark
      : size === 'header'
        ? styles.logoHeaderMark
        : styles.logoSidebarMark;

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

  const title =
    size === 'header' ? (
      <span
        className={`${styles.platformTitle} ${styles.platformTitleStacked}`}
        title={PLATFORM_TITLE}
      >
        <span className={styles.platformTitleLine}>Виртуальный</span>
        <span className={styles.platformTitleLine}>офис</span>
      </span>
    ) : (
      <span className={styles.platformTitle} title={PLATFORM_TITLE}>
        {PLATFORM_TITLE}
      </span>
    );

  return (
    <span
      className={[
        styles.brand,
        size === 'login' ? styles.login : size === 'header' ? styles.header : styles.sidebar,
        collapsed ? styles.collapsed : '',
        showTitle && size !== 'login' ? styles.withTitle : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showTitle ? (
        <span
          className={`${styles.brandRow} ${size === 'login' ? styles.loginBrandRow : ''} ${
            size === 'header' ? styles.headerBrandRow : ''
          }`}
        >
          {linkedHouseMark}
          {title}
        </span>
      ) : (
        linkedHouseMark
      )}
    </span>
  );
}
