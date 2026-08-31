import Link from 'next/link';

import {
  type PublicOfferInfo,
  type PublicOfferVersionSummary,
  SITE_PUBLIC_OFFERS_PATH,
  isPublicOfferPdfUrl,
  publicOfferPath,
  renderPublicOfferHtml,
  resolvePublicOfferEmbedUrl,
} from '@/shared/lib/legal/public-offer';

import styles from './PublicOfferPageView.module.css';

type PublicOfferPageViewProps = {
  data: PublicOfferInfo | null;
};

function formatRevisionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return iso;
  }
}

function PreviousRevisions({
  slug,
  versions,
}: {
  slug: string;
  versions: PublicOfferVersionSummary[];
}) {
  if (!versions.length) return null;

  return (
    <section className={styles.revisions} aria-label="Предыдущие редакции">
      <h2 className={styles.revisionsTitle}>Предыдущие редакции</h2>
      <p className={styles.revisionsHint}>
        Актуальная редакция показана выше. Ниже — сохранённые версии документа.
      </p>
      <ul className={styles.revisionsList}>
        {versions.map((version) => {
          const pdfHref =
            version.offerUrl && isPublicOfferPdfUrl(version.offerUrl)
              ? resolvePublicOfferEmbedUrl(version.offerUrl)
              : null;
          const textHref = version.hasContent
            ? `${publicOfferPath(slug)}/revisions/${version.versionNumber}`
            : null;
          const href = pdfHref || textHref;
          return (
            <li key={version.id}>
              {href ? (
                <a href={href} target={pdfHref ? '_blank' : undefined} rel="noopener noreferrer">
                  Редакция №{version.versionNumber}
                </a>
              ) : (
                <span>Редакция №{version.versionNumber}</span>
              )}
              <span className={styles.revisionsDate}>{formatRevisionDate(version.createdAt)}</span>
            </li>
          );
        })}
      </ul>
      <p className={styles.back}>
        <Link href={SITE_PUBLIC_OFFERS_PATH}>← Все оферты</Link>
        {' · '}
        <Link href="/">На главную</Link>
      </p>
    </section>
  );
}

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
  const versions = data.versions ?? [];

  if (pdfUrl) {
    return (
      <div className={styles.pdfShell}>
        <div className={styles.pdfToolbar}>
          <div>
            <h1 className={styles.pdfTitle}>{data.pageTitle}</h1>
            <p className={styles.pdfMeta}>Актуальная редакция</p>
          </div>
          <p className={styles.pdfToolbarLinks}>
            <Link href={SITE_PUBLIC_OFFERS_PATH}>← Все оферты</Link>
            {' · '}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Открыть PDF
            </a>
          </p>
        </div>
        <iframe className={styles.pdfFrameInShell} src={pdfUrl} title={data.pageTitle} />
        <PreviousRevisions slug={data.slug} versions={versions} />
      </div>
    );
  }

  if (html) {
    return (
      <article className={styles.textPage}>
        <h1 className={styles.title}>{data.pageTitle}</h1>
        <div className={styles.textBody} dangerouslySetInnerHTML={{ __html: html }} />
        <PreviousRevisions slug={data.slug} versions={versions} />
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
