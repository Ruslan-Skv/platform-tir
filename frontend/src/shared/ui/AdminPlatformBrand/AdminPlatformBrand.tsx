import Image from 'next/image';
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
  const showHouseOnly = collapsed && size === 'sidebar';

  const logoNode = showHouseOnly ? (
    <span className={styles.logoWrap}>
      <Image
        src="/favicon.svg"
        alt=""
        width={28}
        height={34}
        className={styles.houseMark}
        aria-hidden
      />
    </span>
  ) : (
    <Logo
      unlinked
      className={size === 'login' ? styles.logoLogin : styles.logoSidebar}
      linkClassName={styles.logoWrap}
    />
  );

  return (
    <span
      className={[
        styles.brand,
        size === 'login' ? styles.login : styles.sidebar,
        collapsed ? styles.collapsed : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!showHouseOnly && size === 'sidebar' && (
        <span className={styles.platformTitle}>{PLATFORM_TITLE}</span>
      )}
      {publicSiteHref ? (
        <Link
          href={getSafeHref(publicSiteHref, '/')}
          className={styles.logoLink}
          title="Вернуться на публичный сайт"
          aria-label="Вернуться на публичный сайт"
        >
          {logoNode}
        </Link>
      ) : (
        logoNode
      )}
    </span>
  );
}
