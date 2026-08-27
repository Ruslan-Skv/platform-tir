'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './AdvertisingStrategy.module.css';

const TABS = [
  { href: '/admin/advertising-strategy', label: 'Обзор стратегии', exact: true },
  { href: '/admin/advertising-strategy/channels', label: 'Каналы продвижения' },
  { href: '/admin/advertising-strategy/metrics', label: 'Статистика каналов' },
] as const;

export function AdvertisingStrategyTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabs} role="group" aria-label="Разделы рекламной стратегии">
      {TABS.map((tab) => {
        const active =
          'exact' in tab && tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? styles.tabActive : styles.tab}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
