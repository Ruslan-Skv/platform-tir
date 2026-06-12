'use client';

import clsx from 'clsx';

import Link from 'next/link';

import { useFormContext } from '@/features/forms';
import { plainTextToBlogHtml } from '@/shared/lib/blog-content';
import { sanitizeHtml } from '@/shared/lib/sanitize';

import styles from './BlogPostPage.module.css';
import type { BlogPostPageModel } from './hooks/useBlogPostPage';

type BlogPostPageViewProps = {
  model: BlogPostPageModel;
};

export function BlogPostPageView({ model }: BlogPostPageViewProps) {
  const { callbackModal } = useFormContext();
  const {
    post,
    loading,
    error,
    likeCount,
    isLiked,
    liking,
    isListening,
    shareCopied,
    handleLike,
    handleShare,
    handleListen,
    formatDate,
  } = model;

  if (loading) {
    return (
      <div className={styles.blogPostPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.blogPostPage}>
        <div className={styles.error}>
          <h2>Запись не найдена</h2>
          <p>{error || 'Запрашиваемая запись не существует или была удалена.'}</p>
          <Link href="/blog" className={styles.backLink}>
            ← К полезным статьям
          </Link>
        </div>
      </div>
    );
  }

  const authorByline = post.authorByline?.trim();

  const alignClass =
    {
      LEFT: styles.alignLeft,
      JUSTIFY: styles.alignJustify,
      CENTER: styles.alignCenter,
      RIGHT: styles.alignRight,
    }[post.contentAlign ?? 'JUSTIFY'] ?? styles.alignJustify;

  const legacyContentHtml = sanitizeHtml(plainTextToBlogHtml(post.content));
  const hasBlocks = Boolean(post.blocks?.length);

  return (
    <div className={clsx(styles.blogPostPage, alignClass)}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <Link href="/blog">Полезные статьи</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>{post.title}</span>
          </li>
        </ol>
      </nav>

      <article className={styles.article}>
        <header className={styles.header}>
          {post.category && (
            <Link href={`/blog?category=${post.category.slug}`} className={styles.category}>
              {post.category.name}
            </Link>
          )}
          <h1 className={styles.title}>
            {post.badge?.trim() && <span className={styles.headerBadge}>{post.badge.trim()}</span>}
            {post.title}
          </h1>
          <div className={styles.meta}>
            {authorByline ? <span>{authorByline}</span> : null}
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
              <span>{post.readingTimeMinutes} мин чтения</span>
            )}
            {post.viewCount > 0 && <span>{post.viewCount} просмотров</span>}
          </div>
        </header>

        {post.featuredImage && (
          <div className={styles.featuredImage}>
            <img src={post.featuredImage} alt={post.featuredImageAlt?.trim() || post.title} />
          </div>
        )}

        {hasBlocks && post.blocks ? (
          <div className={styles.blocks}>
            {post.blocks.map((block) => (
              <section key={block.id} className={styles.articleBlock}>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(plainTextToBlogHtml(block.bodyHtml)),
                  }}
                />
                {block.images.length > 0 ? (
                  <div className={styles.blockGallery} aria-label="Фотоматериалы к разделу">
                    {block.images.map((img) => (
                      <figure key={img.id} className={styles.blockFigure}>
                        <img
                          src={img.url}
                          alt={img.alt?.trim() || ''}
                          loading="lazy"
                          decoding="async"
                        />
                      </figure>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: legacyContentHtml }} />
        )}

        <section className={styles.callbackCta} aria-labelledby="article-cta-title">
          <h2 id="article-cta-title" className={styles.callbackCtaTitle}>
            Остались вопросы?
          </h2>
          <p className={styles.callbackCtaText}>
            Закажите обратный звонок — мы перезвоним и поможем с подбором решений.
          </p>
          <button type="button" className={styles.callbackCtaButton} onClick={callbackModal.open}>
            Заказать звонок
          </button>
        </section>

        <div className={styles.actionsBar}>
          <button
            type="button"
            className={`${styles.actionButton} ${isLiked ? styles.actionButtonActive : ''}`}
            onClick={handleLike}
            disabled={liking}
            title="Нравится"
          >
            <span className={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={handleShare}
            title="Поделиться"
          >
            <span className={styles.actionIcon}>📤</span>
            <span>{shareCopied ? 'Скопировано!' : 'Поделиться'}</span>
          </button>

          <button
            type="button"
            className={`${styles.actionButton} ${isListening ? styles.actionButtonActive : ''}`}
            onClick={handleListen}
            title="Прослушать статью"
          >
            <span className={styles.actionIcon}>{isListening ? '⏹️' : '🔊'}</span>
            <span>{isListening ? 'Остановить' : 'Прослушать'}</span>
          </button>
        </div>

        {post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className={styles.tag}>
                {tag}
              </Link>
            ))}
          </div>
        )}

        <footer className={styles.footer}>
          <Link href="/blog" className={styles.backLink}>
            ← Все полезные статьи
          </Link>
        </footer>
      </article>
    </div>
  );
}
