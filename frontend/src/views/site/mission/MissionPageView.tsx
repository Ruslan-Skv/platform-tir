import Link from 'next/link';

import { type MissionPageInfo, formatMissionText } from '@/shared/lib/mission';

import styles from './MissionPageView.module.css';

type MissionPageViewProps = {
  page: MissionPageInfo;
};

export function MissionPageView({ page }: MissionPageViewProps) {
  const paragraphs = formatMissionText(page.content).split('\n\n');

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>{page.pageTitle}</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{page.pageTitle}</h1>
        {page.introText ? <p className={styles.intro}>{page.introText}</p> : null}
      </header>

      <div className={styles.content}>
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
