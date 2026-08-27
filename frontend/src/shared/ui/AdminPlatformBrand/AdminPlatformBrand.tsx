import Image from 'next/image';

import { Logo } from '@/shared/ui/Logo';

import styles from './AdminPlatformBrand.module.css';

const PLATFORM_TITLE = 'Виртуальный офис';

type AdminPlatformBrandProps = {
  /** Только знак (сайдбар в свёрнутом виде). */
  collapsed?: boolean;
  /** Крупнее для экрана входа. */
  size?: 'sidebar' | 'login';
  className?: string;
};

export function AdminPlatformBrand({
  collapsed = false,
  size = 'sidebar',
  className,
}: AdminPlatformBrandProps) {
  const showHouseOnly = collapsed && size === 'sidebar';

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
      title={PLATFORM_TITLE}
    >
      {showHouseOnly ? (
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
      )}
      {!showHouseOnly && size === 'sidebar' && (
        <span className={styles.platformTitle}>{PLATFORM_TITLE}</span>
      )}
    </span>
  );
}
