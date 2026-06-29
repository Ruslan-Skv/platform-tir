import Link from 'next/link';

import { type PublicOfferListItem, publicOfferPath } from '@/shared/lib/public-offer';

import styles from './PublicOfferIndexPageView.module.css';

type PublicOfferIndexPageViewProps = {
  offers: PublicOfferListItem[];
};

export function PublicOfferIndexPageView({ offers }: PublicOfferIndexPageViewProps) {
  if (offers.length === 0) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Публичные оферты</h1>
        <p>Договоры оферты пока не опубликованы.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Публичные оферты</h1>
      <p className={styles.lead}>
        Договоры оферты для разных товаров и услуг. Выберите нужный документ для ознакомления.
      </p>
      <ul className={styles.list}>
        {offers.map((offer) => (
          <li key={offer.slug}>
            <Link href={publicOfferPath(offer.slug)} className={styles.link}>
              <span className={styles.linkTitle}>{offer.title}</span>
              {offer.name !== offer.title ? (
                <span className={styles.linkName}>{offer.name}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.back}>
        <Link href="/">← На главную</Link>
      </p>
    </div>
  );
}
