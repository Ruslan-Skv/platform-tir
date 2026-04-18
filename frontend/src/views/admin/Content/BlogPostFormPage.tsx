'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type AdminBlogCategory,
  type AdminBlogPost,
  type BlogBadgePreset,
  createBlogBadgePreset,
  createBlogPost,
  getAdminBlogCategories,
  getAdminBlogPost,
  getBlogBadgePresets,
  updateBlogPost,
  uploadBlogFeaturedImage,
} from '@/shared/api/admin-blog';
import { computeBlogReadingTimeMinutes } from '@/shared/lib/blog-reading-time';

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
  const [badgePresets, setBadgePresets] = useState<BlogBadgePreset[]>([]);
  const [newBadgeLabel, setNewBadgeLabel] = useState('');
  const [addingBadge, setAddingBadge] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

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
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [badge, setBadge] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [authorByline, setAuthorByline] = useState('');

  const readingTimePreview = useMemo(() => computeBlogReadingTimeMinutes(content), [content]);

  const presetLabels = useMemo(() => badgePresets.map((p) => p.label), [badgePresets]);

  const badgeSelectOptions = useMemo(() => {
    const b = badge.trim();
    if (b && !presetLabels.includes(b)) {
      return [...presetLabels, b];
    }
    return presetLabels;
  }, [presetLabels, badge]);

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
      setFeaturedImageAlt(post.featuredImageAlt ?? '');
      setBadge(post.badge?.trim() || '');
      setSortOrder(post.sortOrder ?? 0);
      setAuthorByline(post.authorByline || '');
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

  const loadBadgePresets = useCallback(async () => {
    try {
      const data = await getBlogBadgePresets();
      setBadgePresets(data);
    } catch {
      showMessage('error', 'Не удалось загрузить список плашек');
    }
  }, []);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadBadgePresets();
  }, [loadBadgePresets]);

  const handleAddBadgePreset = async () => {
    const t = newBadgeLabel.trim();
    if (!t || addingBadge) return;
    setAddingBadge(true);
    try {
      await createBlogBadgePreset(t);
      await loadBadgePresets();
      setBadge(t);
      setNewBadgeLabel('');
      showMessage('success', 'Плашка добавлена в список');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Не удалось добавить плашку');
    } finally {
      setAddingBadge(false);
    }
  };

  const MAX_FEATURED_BYTES = 10 * 1024 * 1024;

  const handleFeaturedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploadingFeatured) return;
    if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      showMessage('error', 'Допустимы только JPG, PNG, WebP и GIF');
      return;
    }
    if (file.size > MAX_FEATURED_BYTES) {
      showMessage('error', 'Размер файла не больше 10 МБ');
      return;
    }
    setUploadingFeatured(true);
    try {
      const { imageUrl } = await uploadBlogFeaturedImage(file);
      setFeaturedImage(imageUrl);
      setFeaturedImageAlt((prev) => {
        if (prev.trim()) return prev;
        const fromTitle = title.trim().slice(0, 200);
        return fromTitle || prev;
      });
      showMessage('success', 'Изображение загружено');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingFeatured(false);
    }
  };

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
    if (featuredImage.trim() && !featuredImageAlt.trim()) {
      showMessage('error', 'Укажите alt-текст для изображения (SEO и доступность)');
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
        featuredImageAlt: featuredImageAlt.trim(),
        badge: badge.trim() || undefined,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        authorByline: authorByline.trim() || undefined,
        status,
        categoryId: categoryId || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
      };
      if (postId) {
        await updateBlogPost(postId, dto);
        showMessage('success', 'Статья обновлена');
      } else {
        await createBlogPost(dto);
        showMessage('success', 'Статья создана');
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
          ← К списку статей
        </Link>
        <h1 className={styles.title}>{postId ? 'Редактирование статьи' : 'Новая статья'}</h1>
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

        <p className={styles.readingTimeHint}>
          Время чтения (рассчитывается автоматически): <strong>{readingTimePreview} мин.</strong>
        </p>

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
            Изображение обложки
            <div className={styles.featuredImageRow}>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className={styles.input}
                placeholder="https://… или загрузите файл"
              />
              <input
                ref={featuredFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                className={styles.hiddenFileInput}
                onChange={handleFeaturedFileChange}
              />
              <button
                type="button"
                className={styles.imageUploadButton}
                disabled={uploadingFeatured}
                onClick={() => featuredFileInputRef.current?.click()}
              >
                {uploadingFeatured ? 'Загрузка…' : 'Загрузить файл'}
              </button>
            </div>
            {featuredImage.trim() ? (
              <div className={styles.featuredPreview}>
                <img src={featuredImage} alt="" />
              </div>
            ) : null}
            <span className={styles.fieldHint}>
              Ссылка на картинку или загрузка с компьютера (jpg, png, webp, gif, до 10 МБ). После
              загрузки alt подставится из заголовка, если поле ниже пустое.
            </span>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Alt-текст изображения{featuredImage.trim() ? ' *' : ''}
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              className={styles.input}
              placeholder="Кратко опишите изображение для SEO и скринридеров"
              required={!!featuredImage.trim()}
            />
          </label>
        </div>

        <div className={styles.rowGrid}>
          <div className={styles.label}>
            Плашка / метка
            <select
              value={badge.trim()}
              onChange={(e) => setBadge(e.target.value)}
              className={styles.select}
            >
              <option value="">— Без плашки —</option>
              {badgeSelectOptions.map((lbl) => (
                <option key={lbl} value={lbl}>
                  {lbl}
                </option>
              ))}
            </select>
            {badge.trim() && !presetLabels.includes(badge.trim()) && (
              <p className={styles.badgeOrphanHint}>
                Текущее значение не из списка; оно сохранится. Выберите его в списке выше или
                добавьте как новый вариант.
              </p>
            )}
            <div className={styles.badgeAddRow}>
              <input
                type="text"
                value={newBadgeLabel}
                onChange={(e) => setNewBadgeLabel(e.target.value)}
                className={styles.input}
                placeholder="Новая плашка для списка"
                maxLength={120}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddBadgePreset();
                  }
                }}
              />
              <button
                type="button"
                className={styles.badgeAddButton}
                disabled={addingBadge || !newBadgeLabel.trim()}
                onClick={() => void handleAddBadgePreset()}
              >
                {addingBadge ? 'Добавление…' : 'Добавить в список'}
              </button>
            </div>
            <span className={styles.fieldHint}>
              Список общий для всех редакторов. Новый вариант сразу можно выбрать для этой статьи.
            </span>
          </div>
          <label className={styles.label}>
            Автор (подпись)
            <input
              type="text"
              value={authorByline}
              onChange={(e) => setAuthorByline(e.target.value)}
              className={styles.input}
              placeholder="Необязательно; если пусто — на сайте автор не показывается"
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Порядок сортировки
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className={styles.input}
              step={1}
            />
            <span className={styles.fieldHint}>
              Меньше — выше в списке. При равенстве — по дате.
            </span>
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
