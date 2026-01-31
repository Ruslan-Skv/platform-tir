'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import {
  type BlogPostWithComments,
  createBlogComment,
  getBlogPostBySlug,
  toggleBlogPostLike,
} from '@/shared/api/blog';

import styles from './BlogPostPage.module.css';

interface BlogPostPageProps {
  slug: string;
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug }) => {
  const [post, setPost] = useState<BlogPostWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState(false);
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentContent.trim() || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);
    setCommentSuccess(false);

    try {
      await createBlogComment(post.id, {
        content: commentContent.trim(),
        authorName: commentName.trim() || undefined,
        authorEmail: commentEmail.trim() || undefined,
      });
      setCommentContent('');
      setCommentName('');
      setCommentEmail('');
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 3000);
      loadPost();
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmittingComment(false);
    }
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
            ← Вернуться к блогу
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

  const getAuthorName = () => {
    const { firstName, lastName } = post.author;
    return [firstName, lastName].filter(Boolean).join(' ') || 'Автор';
  };

  return (
    <div className={styles.blogPostPage}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <Link href="/blog">Блог</Link>
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
          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.meta}>
            <span>{getAuthorName()}</span>
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            {post.viewCount > 0 && <span>{post.viewCount} просмотров</span>}
          </div>
        </header>

        {post.featuredImage && (
          <div className={styles.featuredImage}>
            <img src={post.featuredImage} alt="" />
          </div>
        )}

        <div className={styles.content} dangerouslySetInnerHTML={{ __html: post.content }} />

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
            ← Все записи блога
          </Link>
        </footer>
      </article>

      {post.allowComments && (
        <section className={styles.comments}>
          <h2 className={styles.commentsTitle}>Комментарии</h2>

          <form onSubmit={handleSubmitComment} className={styles.commentForm}>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Ваш комментарий *"
              className={styles.commentTextarea}
              rows={4}
              required
            />
            <div className={styles.commentFormRow}>
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Ваше имя"
                className={styles.commentInput}
              />
              <input
                type="email"
                value={commentEmail}
                onChange={(e) => setCommentEmail(e.target.value)}
                placeholder="Email (для гостей)"
                className={styles.commentInput}
              />
            </div>
            {commentError && <p className={styles.commentError}>{commentError}</p>}
            {commentSuccess && (
              <p className={styles.commentSuccess}>Комментарий отправлен на модерацию. Спасибо!</p>
            )}
            <button type="submit" className={styles.commentSubmit} disabled={submittingComment}>
              {submittingComment ? 'Отправка...' : 'Отправить'}
            </button>
          </form>

          {post.comments && post.comments.length > 0 && (
            <ul className={styles.commentsList}>
              {post.comments.map((comment) => (
                <li key={comment.id} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>
                      {comment.author
                        ? [comment.author.firstName, comment.author.lastName]
                            .filter(Boolean)
                            .join(' ')
                        : comment.authorName || 'Гость'}
                    </span>
                    <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className={styles.commentContent}>{comment.content}</div>
                  {comment.replies && comment.replies.length > 0 && (
                    <ul className={styles.replies}>
                      {comment.replies.map((reply) => (
                        <li key={reply.id} className={styles.reply}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>
                              {reply.author
                                ? [reply.author.firstName, reply.author.lastName]
                                    .filter(Boolean)
                                    .join(' ')
                                : reply.authorName || 'Гость'}
                            </span>
                            <span className={styles.commentDate}>
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <div className={styles.commentContent}>{reply.content}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
