import Link from 'next/link';

import { type PublicCareersData, formatCareerText } from '@/shared/lib/careers';

import styles from './CareersPageView.module.css';

type CareersPageViewProps = {
  data: PublicCareersData;
};

export function CareersPageView({ data }: CareersPageViewProps) {
  const pageTitle = data.page?.pageTitle ?? 'Вакансии';
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

      {data.vacancies.length === 0 ? (
        <p className={styles.empty}>
          Сейчас открытых вакансий нет. Загляните позже или отправьте резюме на{' '}
          <a href="mailto:skvirya@mail.ru">skvirya@mail.ru</a>.
        </p>
      ) : (
        <div className={styles.list}>
          {data.vacancies.map((vacancy) => (
            <article key={vacancy.id} className={styles.card}>
              <h2 className={styles.cardTitle}>{vacancy.title}</h2>
              <div className={styles.cardBody}>{formatCareerText(vacancy.description)}</div>
              {vacancy.requirements ? (
                <div className={styles.cardBlock}>
                  <h3 className={styles.cardSubtitle}>Требования</h3>
                  <div className={styles.cardBody}>{formatCareerText(vacancy.requirements)}</div>
                </div>
              ) : null}
              {vacancy.conditions ? (
                <div className={styles.cardBlock}>
                  <h3 className={styles.cardSubtitle}>Условия</h3>
                  <div className={styles.cardBody}>{formatCareerText(vacancy.conditions)}</div>
                </div>
              ) : null}
              {vacancy.contactEmail ? (
                <p className={styles.contact}>
                  Откликнуться:{' '}
                  <a href={`mailto:${vacancy.contactEmail}`}>{vacancy.contactEmail}</a>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
