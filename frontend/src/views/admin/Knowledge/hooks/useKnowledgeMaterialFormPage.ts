'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type AdminKnowledgeCategory,
  type KnowledgeAttachmentInput,
  type KnowledgeMaterialType,
  createKnowledgeMaterial,
  getKnowledgeCategories,
  getKnowledgeMaterial,
  updateKnowledgeMaterial,
  uploadKnowledgeThumbnail,
} from '@/shared/api/admin-knowledge';

import type {
  KnowledgeMaterialFormPageMessage,
  KnowledgeMaterialFormStatus,
} from '../knowledge-material-form-page.types';
import { slugify } from '../knowledge-utils';

export type UseKnowledgeMaterialFormPageOptions = {
  materialId?: string;
};

export function useKnowledgeMaterialFormPage({ materialId }: UseKnowledgeMaterialFormPageOptions) {
  const router = useRouter();
  const isEdit = Boolean(materialId);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [message, setMessage] = useState<KnowledgeMaterialFormPageMessage | null>(null);
  const [categories, setCategories] = useState<AdminKnowledgeCategory[]>([]);

  const [type, setType] = useState<KnowledgeMaterialType>('VIDEO');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [attachments, setAttachments] = useState<KnowledgeAttachmentInput[]>([]);
  const [status, setStatus] = useState<KnowledgeMaterialFormStatus>('DRAFT');

  const showMessage = useCallback((msgType: 'success' | 'error', text: string) => {
    setMessage({ type: msgType, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getKnowledgeCategories();
      setCategories(data);
      if (!categoryId && data.length > 0) {
        setCategoryId(data[0].id);
      }
    } catch {
      showMessage('error', 'Ошибка загрузки категорий');
    }
  }, [categoryId, showMessage]);

  const loadMaterial = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const m = await getKnowledgeMaterial(materialId);
      setType(m.type);
      setTitle(m.title);
      setSlug(m.slug);
      setSlugManual(true);
      setCategoryId(m.categoryId);
      setExcerpt(m.excerpt || '');
      setContent(m.content || '');
      setVideoUrl(m.videoUrl || '');
      setExternalUrl(m.externalUrl || '');
      setThumbnailUrl(m.thumbnailUrl || '');
      setSortOrder(m.sortOrder);
      setIsPinned(m.isPinned);
      setAttachments(
        (m.attachments ?? []).map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize ?? undefined,
          mimeType: a.mimeType ?? undefined,
          sortOrder: a.sortOrder,
        }))
      );
      setStatus(m.status);
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Материал не найден');
    } finally {
      setLoading(false);
    }
  }, [materialId, showMessage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isEdit) void loadMaterial();
  }, [isEdit, loadMaterial]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const { imageUrl } = await uploadKnowledgeThumbnail(file);
      setThumbnailUrl(imageUrl);
      showMessage('success', 'Обложка загружена');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleSubmit = async (publishNow = false) => {
    if (!title.trim() || !slug.trim() || !categoryId) {
      showMessage('error', 'Заполните название, slug и категорию');
      return;
    }
    if (type === 'VIDEO' && !videoUrl.trim()) {
      showMessage('error', 'Укажите ссылку на видео');
      return;
    }
    if (type === 'ARTICLE' && !content.trim()) {
      showMessage('error', 'Добавьте текст статьи');
      return;
    }
    if (type === 'LINK' && !externalUrl.trim()) {
      showMessage('error', 'Укажите внешнюю ссылку');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId,
        type,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        content: content.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        sortOrder,
        isPinned,
        attachments,
        status: publishNow ? ('PUBLISHED' as const) : status,
      };

      if (isEdit && materialId) {
        await updateKnowledgeMaterial(materialId, payload);
        showMessage('success', 'Материал сохранён');
        router.push(`/admin/knowledge/materials/${materialId}`);
      } else {
        const created = await createKnowledgeMaterial(payload);
        showMessage('success', 'Материал создан');
        router.push(`/admin/knowledge/materials/${created.id}`);
      }
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return {
    isEdit,
    loading,
    saving,
    uploadingThumbnail,
    message,
    categories,
    type,
    setType,
    title,
    slug,
    setSlug,
    setSlugManual,
    categoryId,
    setCategoryId,
    excerpt,
    setExcerpt,
    content,
    setContent,
    videoUrl,
    setVideoUrl,
    externalUrl,
    setExternalUrl,
    thumbnailUrl,
    setThumbnailUrl,
    sortOrder,
    setSortOrder,
    isPinned,
    setIsPinned,
    attachments,
    setAttachments,
    status,
    setStatus,
    thumbnailInputRef,
    handleTitleChange,
    handleThumbnailUpload,
    handleSubmit,
  };
}

export type KnowledgeMaterialFormPageModel = ReturnType<typeof useKnowledgeMaterialFormPage>;
