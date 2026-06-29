import Link from 'next/link';

import {
  type PublicContactsData,
  formatContactPhoneHref,
  getContactImageUrl,
} from '@/shared/lib/contacts';

import styles from './ContactsPageView.module.css';

type ContactsPageViewProps = {
  data: PublicContactsData;
};

export function ContactsPageView({ data }: ContactsPageViewProps) {
  const pageTitle = data.page?.pageTitle ?? 'Контакты';
  const intro = data.page?.introText;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>{pageTitle}</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{pageTitle}</h1>
        {intro ? <p className={styles.intro}>{intro}</p> : null}
      </header>

      {data.salons.length === 0 ? (
        <p className={styles.empty}>
          Информация о салонах скоро появится. По вопросам звоните{' '}
          <a href="tel:+78152601270">8 (8152) 60-12-70</a> или пишите на{' '}
          <a href="mailto:skvirya@mail.ru">skvirya@mail.ru</a>.
        </p>
      ) : (
        <div className={styles.list}>
          {data.salons.map((salon) => {
            const imageUrl = getContactImageUrl(salon.imageUrl);
            return (
              <article key={salon.id} className={styles.card}>
                {imageUrl ? (
                  <div className={styles.imageWrap}>
                    <img src={imageUrl} alt={salon.name} className={styles.image} />
                  </div>
                ) : null}
                <div className={styles.cardContent}>
                  <h2 className={styles.cardTitle}>{salon.name}</h2>
                  <p className={styles.address}>{salon.address}</p>
                  {salon.phone ? (
                    <p className={styles.phone}>
                      <a href={formatContactPhoneHref(salon.phone)}>{salon.phone}</a>
                    </p>
                  ) : null}
                  {salon.managers.length > 0 ? (
                    <div className={styles.managers}>
                      <h3 className={styles.managersTitle}>Менеджеры</h3>
                      <ul className={styles.managersList}>
                        {salon.managers.map((manager) => (
                          <li key={manager.id} className={styles.managerItem}>
                            <span className={styles.managerName}>{manager.name}</span>
                            <div className={styles.managerContacts}>
                              {manager.phone ? (
                                <a href={formatContactPhoneHref(manager.phone)}>{manager.phone}</a>
                              ) : null}
                              {manager.email ? (
                                <a href={`mailto:${manager.email}`}>{manager.email}</a>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
