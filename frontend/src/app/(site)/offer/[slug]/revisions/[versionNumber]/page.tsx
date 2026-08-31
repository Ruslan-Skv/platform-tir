import Link from 'next/link';
import { notFound } from 'next/navigation';

import { loadPublicOfferRevision } from '@/features/public-offer/load-public-offer-config';
import {
  SITE_PUBLIC_OFFERS_PATH,
  isPublicOfferPdfUrl,
  publicOfferPath,
  renderPublicOfferHtml,
  resolvePublicOfferEmbedUrl,
} from '@/shared/lib/legal/public-offer';
import styles from '@/views/site/offer/PublicOfferPageView.module.css';

type Props = {
  params: Promise<{ slug: string; versionNumber: string }>;
};

export default async function PublicOfferRevisionPage({ params }: Props) {
  const { slug, versionNumber: versionRaw } = await params;
  const versionNumber = Number(versionRaw);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    notFound();
  }

  const data = await loadPublicOfferRevision(slug, versionNumber);
  if (!data) {
    notFound();
  }

  const pdfUrl =
    data.offerUrl && isPublicOfferPdfUrl(data.offerUrl)
      ? resolvePublicOfferEmbedUrl(data.offerUrl)
      : null;
  const html = data.offerContent ? renderPublicOfferHtml(data.offerContent) : null;
  const currentHref = publicOfferPath(data.slug);

  if (pdfUrl) {
    return (
      <div className={styles.pdfShell}>
        <div className={styles.pdfToolbar}>
          <div>
            <h1 className={styles.pdfTitle}>
              {data.pageTitle} · редакция №{data.versionNumber}
            </h1>
            <p className={styles.pdfMeta}>Архивная редакция</p>
          </div>
          <p className={styles.pdfToolbarLinks}>
            <Link href={currentHref}>← Актуальная редакция</Link>
            {' · '}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Открыть PDF
            </a>
          </p>
        </div>
        <iframe
          className={styles.pdfFrameInShell}
          src={pdfUrl}
          title={`${data.pageTitle} редакция ${data.versionNumber}`}
        />
      </div>
    );
  }

  if (html) {
    return (
      <article className={styles.textPage}>
        <h1 className={styles.title}>
          {data.pageTitle}
          <br />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>
            Архивная редакция №{data.versionNumber}
          </span>
        </h1>
        <div className={styles.textBody} dangerouslySetInnerHTML={{ __html: html }} />
        <p className={styles.back}>
          <Link href={currentHref}>← Актуальная редакция</Link>
          {' · '}
          <Link href={SITE_PUBLIC_OFFERS_PATH}>Все оферты</Link>
        </p>
      </article>
    );
  }

  notFound();
}
