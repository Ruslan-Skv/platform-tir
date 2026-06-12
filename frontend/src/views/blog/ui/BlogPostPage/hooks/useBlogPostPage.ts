'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type BlogPost, getBlogPostBySlug, toggleBlogPostLike } from '@/shared/api/blog';
import { stripHtmlToText } from '@/shared/lib/sanitize';

/** Извлекает только текст из HTML (безопасно, без innerHTML) */
function stripHtml(html: string): string {
  return stripHtmlToText(html);
}

type UseBlogPostPageParams = {
  slug: string;
};

export function useBlogPostPage({ slug }: UseBlogPostPageParams) {
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

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
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

  const handleListen = () => {
    if (!post || typeof window === 'undefined' || !window.speechSynthesis) return;

    const speechHtml = post.blocks?.length
      ? post.blocks.map((b) => b.bodyHtml).join('\n')
      : post.content;
    const text = stripHtml(speechHtml);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return {
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
  };
}

export type BlogPostPageModel = ReturnType<typeof useBlogPostPage>;
