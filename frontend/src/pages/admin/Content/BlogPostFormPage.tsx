'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type AdminBlogCategory,
  type AdminBlogPost,
  createBlogPost,
  getAdminBlogCategories,
  getAdminBlogPost,
  updateBlogPost,
} from '@/shared/api/admin-blog';

import styles from './BlogPostFormPage.module.css';

interface BlogPostFormPageProps {
  postId?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function BlogPostFormPage({ postId }: BlogPostFormPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [allowComments, setAllowComments] = useState(true);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const post: AdminBlogPost = await getAdminBlogPost(postId);
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featuredImage || '');
      setStatus(post.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED');
      setCategoryId(post.category?.id || '');
      setTags(post.tags?.join(', ') || '');
      setSeoTitle(post.seoTitle || '');
      setSeoDescription(post.seoDescription || '');
      setAllowComments(post.allowComments ?? true);
    } catch {
      showMessage('error', 'Ошибка загрузки поста');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminBlogCategories();
      setCategories(data);
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, []);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!postId) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !content.trim()) {
      showMessage('error', 'Заполните заголовок, slug и контент');
      return;
    }
    setSaving(true);
    try {
      const dto = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        featuredImage: featuredImage.trim() || undefined,
        status,
        categoryId: categoryId || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        allowComments,
      };
      if (postId) {
        await updateBlogPost(postId, dto);
        showMessage('success', 'Пост обновлён');
      } else {
        await createBlogPost(dto);
        showMessage('success', 'Пост создан');
        router.push('/admin/content/blog');
      }
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.blogPostFormPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.blogPostFormPage}>
      <div className={styles.header}>
        <Link href="/admin/content/blog" className={styles.backLink}>
          ← К списку постов
        </Link>
        <h1 className={styles.title}>{postId ? 'Редактирование поста' : 'Новый пост'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <label className={styles.label}>
            Заголовок *
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={styles.input}
              required
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Slug *
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={styles.input}
              required
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Контент *
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.textarea}
              rows={15}
              required
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Краткое описание
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={styles.textarea}
              rows={3}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Изображение (URL)
            <input
              type="text"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              className={styles.input}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className={styles.rowGrid}>
          <label className={styles.label}>
            Статус
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
              className={styles.select}
            >
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликован</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </label>

          <label className={styles.label}>
            Категория
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Теги (через запятую)
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={styles.input}
              placeholder="ремонт, двери, мебель"
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            SEO заголовок
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            SEO описание
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className={styles.textarea}
              rows={2}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
            />
            Разрешить комментарии
          </label>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : postId ? 'Сохранить' : 'Создать'}
          </button>
          <Link href="/admin/content/blog" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
