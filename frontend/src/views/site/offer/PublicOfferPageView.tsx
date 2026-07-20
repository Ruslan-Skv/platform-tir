import Link from 'next/link';

import {
  type PublicOfferInfo,
  SITE_PUBLIC_OFFERS_PATH,
  isPublicOfferPdfUrl,
  renderPublicOfferHtml,
  resolvePublicOfferEmbedUrl,
} from '@/shared/lib/legal/public-offer';

import styles from './PublicOfferPageView.module.css';

type PublicOfferPageViewProps = {
  data: PublicOfferInfo | null;
};

export function PublicOfferPageView({ data }: PublicOfferPageViewProps) {
  if (!data) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Публичная оферта</h1>
        <p>Договор оферты пока не опубликован.</p>
      </div>
    );
  }

  const pdfUrl = isPublicOfferPdfUrl(data.offerUrl)
    ? resolvePublicOfferEmbedUrl(data.offerUrl)
    : null;
  const html = data.offerContent ? renderPublicOfferHtml(data.offerContent) : null;

  if (pdfUrl) {
    return (
      <div className={styles.pdfPage}>
        <iframe className={styles.pdfFrame} src={pdfUrl} title={data.pageTitle} />
      </div>
    );
  }

  if (html) {
    return (
      <article className={styles.textPage}>
        <h1 className={styles.title}>{data.pageTitle}</h1>
        <div className={styles.textBody} dangerouslySetInnerHTML={{ __html: html }} />
        <p className={styles.back}>
          <Link href={SITE_PUBLIC_OFFERS_PATH}>← Все оферты</Link>
          {' · '}
          <Link href="/">На главную</Link>
        </p>
      </article>
    );
  }

  return (
    <div className={styles.empty}>
      <h1 className={styles.title}>{data.pageTitle}</h1>
      <p>Текст оферты ещё не загружен.</p>
    </div>
  );
}
