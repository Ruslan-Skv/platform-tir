'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { blockHasTextOrImages, isTrivialEmptyBlogHtml } from '@/shared/lib/blog/blog-content';
import { computeBlogReadingTimeMinutes } from '@/shared/lib/blog/blog-reading-time';
import { computeBlogSeoPreview } from '@/shared/lib/blog/blog-seo';

import type { LocalBlock } from '../../shared/BlogPostBlocksEditor';
import { MAX_FEATURED_BYTES } from '../blog-post-form-page.constants';
import type { BlogPostFormPageProps } from '../blog-post-form-page.types';
import { slugify } from '../blog-post-form-page.utils';

export function useBlogPostFormPage({ postId }: BlogPostFormPageProps) {
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

  return {
    postId,
    loading,
    saving,
    message,
    categories,
    newBadgeLabel,
    setNewBadgeLabel,
    addingBadge,
    uploadingFeatured,
    featuredFileInputRef,
    title,
    slug,
    setSlug,
    content,
    setContent,
    contentAlign,
    setContentAlign,
    useBlocks,
    blocks,
    setBlocks,
    excerpt,
    setExcerpt,
    featuredImage,
    setFeaturedImage,
    status,
    setStatus,
    categoryId,
    setCategoryId,
    tags,
    setTags,
    seoTitle,
    setSeoTitle,
    seoDescription,
    setSeoDescription,
    featuredImageAlt,
    setFeaturedImageAlt,
    badge,
    setBadge,
    sortOrder,
    setSortOrder,
    authorByline,
    setAuthorByline,
    readingTimePreview,
    presetLabels,
    badgeSelectOptions,
    showMessage,
    handleAddBadgePreset,
    handleFeaturedFileChange,
    handleTitleChange,
    handleSeoAutofill,
    handleUseBlocksChange,
    handleSubmit,
  };
}

export type BlogPostFormPageModel = ReturnType<typeof useBlogPostFormPage>;
