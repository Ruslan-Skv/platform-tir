'use client';

import Link from 'next/link';

import {
  SITE_SELLER_LEGAL_PATH,
  type SellerLegalInfo,
  formatSellerLegalCompactLine,
  isSellerLegalConfigured,
} from '@/shared/lib/legal/seller-legal';

import styles from './SellerLegalNotice.module.css';

type SellerLegalNoticeProps = {
  data?: SellerLegalInfo | null;
  variant?: 'compact' | 'card';
  className?: string;
};

export function SellerLegalNotice({
  data,
  variant = 'compact',
  className,
}: SellerLegalNoticeProps) {
  if (!isSellerLegalConfigured(data)) {
    return null;
  }

  const rootClassName = [styles.root, styles[variant], className].filter(Boolean).join(' ');

  if (variant === 'card') {
    return (
      <section className={rootClassName} aria-label="Информация о продавце">
        <h2 className={styles.cardTitle}>Информация о продавце</h2>
        <dl className={styles.list}>
          <div className={styles.row}>
            <dt>Продавец</dt>
            <dd>{data!.legalName}</dd>
          </div>
          {data!.inn ? (
            <div className={styles.row}>
              <dt>ИНН</dt>
              <dd>{data!.inn}</dd>
            </div>
          ) : null}
          <div className={styles.row}>
            <dt>{data!.ogrnLabel}</dt>
            <dd>{data!.ogrn}</dd>
          </div>
          <div className={styles.row}>
            <dt>Юридический адрес</dt>
            <dd>{data!.legalAddress}</dd>
          </div>
          <div className={styles.row}>
            <dt>Телефон</dt>
            <dd>
              <a href={`tel:${data!.phone.replace(/[^\d+]/g, '')}`}>{data!.phone}</a>
            </dd>
          </div>
          <div className={styles.row}>
            <dt>E-mail</dt>
            <dd>
              <a href={`mailto:${data!.email}`}>{data!.email}</a>
            </dd>
          </div>
        </dl>
        <Link href={SITE_SELLER_LEGAL_PATH} className={styles.moreLink}>
          Полная информация о продавце →
        </Link>
      </section>
    );
  }

  return (
    <p className={rootClassName}>
      <span className={styles.compactLabel}>Продавец:</span>{' '}
      <span>{formatSellerLegalCompactLine(data!)}</span>{' '}
      <Link href={SITE_SELLER_LEGAL_PATH} className={styles.compactLink}>
        Подробнее
      </Link>
    </p>
  );
}
