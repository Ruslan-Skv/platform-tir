'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { useFormContext } from '@/features/forms';
import { type BlogPost, getBlogPostBySlug, toggleBlogPostLike } from '@/shared/api/blog';
import { sanitizeHtml, stripHtmlToText } from '@/shared/lib/sanitize';

import styles from './BlogPostPage.module.css';

interface BlogPostPageProps {
  slug: string;
}

/** Извлекает только текст из HTML (безопасно, без innerHTML) */
function stripHtml(html: string): string {
  return stripHtmlToText(html);
}

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug }) => {
  const { callbackModal } = useFormContext();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadPost = useCallback(() => {
    getBlogPostBySlug(slug)
      .then((data) => {
        setPost(data);
        setLikeCount(data.likeCount ?? 0);
        setIsLiked(data.isLiked ?? false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleLike = async () => {
    if (!post || liking) return;
    setLiking(true);
    try {
      const res = await toggleBlogPostLike(post.id);
      setLikeCount(res.likeCount);
      setIsLiked(res.liked);
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const title = post?.title || 'Статья';
    const text = post?.excerpt || '';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await handleCopyLink(url);
        }
      }
    } else {
      await handleCopyLink(url);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  const handleListen = () => {
    if (!post || typeof window === 'undefined' || !window.speechSynthesis) return;

    const text = stripHtml(post.content);
    if (!text) return;

    if (isListening) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    speechRef.current = utterance;

    utterance.onend = () => setIsListening(false);
    utterance.onerror = () => setIsListening(false);

    window.speechSynthesis.speak(utterance);
    setIsListening(true);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const authorByline = post.authorByline?.trim();

  return (
    <div className={styles.blogPostPage}>
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

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />

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
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
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
};
