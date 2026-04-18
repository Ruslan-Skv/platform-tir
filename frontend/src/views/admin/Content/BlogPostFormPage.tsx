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
import type { BlogContentAlign } from '@/shared/api/blog';
import { blockHasTextOrImages, isTrivialEmptyBlogHtml } from '@/shared/lib/blog-content';
import { computeBlogReadingTimeMinutes } from '@/shared/lib/blog-reading-time';
import { computeBlogSeoPreview } from '@/shared/lib/blog-seo';

import { BlogPostBlocksEditor, type LocalBlock } from './BlogPostBlocksEditor';
import { BlogPostEditor } from './BlogPostEditor';
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
  const [contentAlign, setContentAlign] = useState<BlogContentAlign>('JUSTIFY');
  const [useBlocks, setUseBlocks] = useState(false);
  const [blocks, setBlocks] = useState<LocalBlock[]>([]);
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

  const mergedArticleHtml = useMemo(() => {
    return useBlocks && blocks.length > 0 ? blocks.map((b) => b.bodyHtml).join('') : content;
  }, [useBlocks, blocks, content]);

  const readingTimePreview = useMemo(() => {
    return computeBlogReadingTimeMinutes(mergedArticleHtml);
  }, [mergedArticleHtml]);

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
      setContentAlign(post.contentAlign ?? 'JUSTIFY');
      if (post.blocks?.length) {
        setUseBlocks(true);
        setBlocks(
          post.blocks.map((b) => ({
            clientId: b.id,
            bodyHtml: b.bodyHtml,
            images: b.images.map((img) => ({ url: img.url, alt: img.alt ?? '' })),
          }))
        );
      } else {
        setUseBlocks(false);
        setBlocks([]);
      }
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

  const handleSeoAutofill = () => {
    const { seoTitle: st, seoDescription: sd } = computeBlogSeoPreview({
      title: title.trim(),
      contentHtml: mergedArticleHtml,
      excerpt: excerpt.trim() || undefined,
    });
    setSeoTitle(st);
    setSeoDescription(sd);
  };

  const handleUseBlocksChange = (next: boolean) => {
    if (next) {
      setUseBlocks(true);
      if (blocks.length === 0) {
        if (!isTrivialEmptyBlogHtml(content)) {
          setBlocks([
            {
              clientId:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `b-${Date.now()}`,
              bodyHtml: content,
              images: [],
            },
          ]);
        } else {
          setBlocks([
            {
              clientId:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `b-${Date.now()}`,
              bodyHtml: '<p></p>',
              images: [],
            },
          ]);
        }
      }
    } else {
      setUseBlocks(false);
      if (blocks.length > 0) {
        setContent(blocks.map((b) => b.bodyHtml).join(''));
      }
      setBlocks([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      showMessage('error', 'Заполните заголовок и slug');
      return;
    }
    if (useBlocks) {
      if (!blocks.length) {
        showMessage('error', 'Добавьте хотя бы один блок или отключите режим блоков');
        return;
      }
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!blockHasTextOrImages(b.bodyHtml, b.images)) {
          showMessage(
            'error',
            `Блок ${i + 1}: укажите текст или хотя бы одно изображение с адресом`
          );
          return;
        }
      }
    } else if (isTrivialEmptyBlogHtml(content)) {
      showMessage('error', 'Заполните контент статьи');
      return;
    }
    if (featuredImage.trim() && !featuredImageAlt.trim()) {
      showMessage('error', 'Укажите alt-текст для изображения (SEO и доступность)');
      return;
    }
    setSaving(true);
    try {
      const mergedFromBlocks = mergedArticleHtml.trim();

      const dto = {
        title: title.trim(),
        slug: slug.trim(),
        content: mergedFromBlocks,
        contentAlign,
        blocks: useBlocks
          ? blocks.map((b, i) => ({
              sortOrder: i,
              bodyHtml: b.bodyHtml,
              images: b.images
                .filter((img) => img.url.trim())
                .map((img, j) => ({
                  url: img.url.trim(),
                  alt: img.alt.trim(),
                  sortOrder: j,
                })),
            }))
          : [],
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
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
      };
      if (postId) {
        const saved = (await updateBlogPost(postId, dto)) as AdminBlogPost;
        setSeoTitle(saved.seoTitle ?? '');
        setSeoDescription(saved.seoDescription ?? '');
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
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={useBlocks}
              onChange={(e) => handleUseBlocksChange(e.target.checked)}
            />
            <span>Разбить статью на блоки с фотоматериалами (в каждом блоке — текст и фото)</span>
          </label>
        </div>

        {useBlocks ? (
          <div className={styles.row}>
            <label className={styles.label}>
              Блоки статьи *
              <BlogPostBlocksEditor
                blocks={blocks}
                onChange={setBlocks}
                onError={(msg) => showMessage('error', msg)}
              />
              <span className={styles.fieldHint}>
                Каждый блок — отдельный раздел: сначала текст, ниже галерея фото. Можно добавить URL
                или загрузить файл (до 10 МБ).
              </span>
            </label>
          </div>
        ) : (
          <div className={styles.row}>
            <label className={styles.label}>
              Контент *
              <BlogPostEditor key={postId ?? 'new'} value={content} onChange={setContent} />
              <span className={styles.fieldHint}>
                Панель инструментов: абзацы (Enter), подзаголовки H2–H6 и обычный текст (¶), красная
                строка (⇥) для отступа первой строки абзаца, маркированный и нумерованный списки,
                цитата, ссылка. Текст сохраняется как HTML.
              </span>
            </label>
          </div>
        )}

        <div className={styles.row}>
          <label className={styles.label}>
            Выравнивание текста на сайте
            <select
              value={contentAlign}
              onChange={(e) => setContentAlign(e.target.value as BlogContentAlign)}
              className={styles.select}
            >
              <option value="JUSTIFY">По ширине</option>
              <option value="LEFT">По левому краю</option>
              <option value="CENTER">По центру</option>
              <option value="RIGHT">По правому краю</option>
            </select>
            <span className={styles.fieldHint}>
              Применяется ко всему тексту статьи на публичной странице (списки и цитаты — по левому
              краю при выравнивании по ширине или по центру).
            </span>
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
          <div className={styles.seoBlock}>
            <div className={styles.seoBlockHeader}>
              <span className={styles.seoBlockTitle}>SEO (поисковики)</span>
              <button
                type="button"
                className={styles.seoAutofillButton}
                onClick={handleSeoAutofill}
              >
                Подставить из статьи
              </button>
            </div>
            <p className={styles.fieldHint}>
              Если оставить поля пустыми и сохранить, сервер подставит заголовок из названия статьи
              (до ~60 символов), а описание — из краткого описания или из текста статьи (~155
              символов).
            </p>
            <label className={styles.label}>
              SEO заголовок
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className={styles.input}
                placeholder="Пусто — как у заголовка статьи"
              />
            </label>
            <label className={styles.label}>
              SEO описание
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Пусто — из краткого описания или текста"
              />
            </label>
          </div>
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
