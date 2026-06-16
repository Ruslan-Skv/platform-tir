'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type AdminKnowledgeCategory,
  type AdminKnowledgeModule,
  type KnowledgeAttachmentInput,
  type KnowledgeMaterialType,
  type KnowledgeTargetAudience,
  createKnowledgeMaterial,
  getKnowledgeCategories,
  getKnowledgeMaterial,
  getKnowledgeModules,
  getKnowledgeTargetAudiences,
  updateKnowledgeMaterial,
  uploadKnowledgeThumbnail,
} from '@/shared/api/admin-knowledge';

import { computeReadingTimeMinutes, slugify } from '../../../shared/knowledge-utils';
import type {
  KnowledgeMaterialFormPageMessage,
  KnowledgeMaterialFormStatus,
} from '../knowledge-material-form-page.types';

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
  const [modules, setModules] = useState<AdminKnowledgeModule[]>([]);

  const [type, setType] = useState<KnowledgeMaterialType>('VIDEO');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [targetAudienceOptions, setTargetAudienceOptions] = useState<KnowledgeTargetAudience[]>([]);
  const [targetAudienceIds, setTargetAudienceIds] = useState<string[]>([]);
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number | ''>('');
  const [tutorRecommendation, setTutorRecommendation] = useState('');
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

  const loadModules = useCallback(async (catId: string, preserveModuleId?: string) => {
    if (!catId) {
      setModules([]);
      setModuleId('');
      return;
    }
    try {
      const data = await getKnowledgeModules(catId);
      setModules(data);
      if (preserveModuleId && data.some((m) => m.id === preserveModuleId)) {
        setModuleId(preserveModuleId);
      } else {
        setModuleId('');
      }
    } catch {
      setModules([]);
      setModuleId('');
    }
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

  const loadTargetAudienceOptions = useCallback(async () => {
    try {
      const data = await getKnowledgeTargetAudiences();
      setTargetAudienceOptions(data);
    } catch {
      showMessage('error', 'Ошибка загрузки целевых аудиторий');
    }
  }, [showMessage]);

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
      setModuleId(m.moduleId || '');
      setExcerpt(m.excerpt || '');
      setTargetAudienceIds((m.targetAudiences ?? []).map((a) => a.id));
      setTargetAudienceOptions((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        for (const item of m.targetAudiences ?? []) {
          byId.set(item.id, item);
        }
        return [...byId.values()].sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.label.localeCompare(b.label, 'ru');
        });
      });
      setReadingTimeMinutes(m.readingTimeMinutes ?? '');
      setTutorRecommendation(m.tutorRecommendation || '');
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
      await loadModules(m.categoryId, m.moduleId || undefined);
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Материал не найден');
    } finally {
      setLoading(false);
    }
  }, [materialId, showMessage, loadModules]);

  useEffect(() => {
    void loadCategories();
    void loadTargetAudienceOptions();
  }, [loadCategories, loadTargetAudienceOptions]);

  useEffect(() => {
    if (!isEdit && categoryId) {
      void loadModules(categoryId);
    }
  }, [categoryId, isEdit, loadModules]);

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
    if (type === 'ARTICLE' && !content.trim() && (publishNow || status === 'PUBLISHED')) {
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
        moduleId: moduleId || null,
        type,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        targetAudienceIds,
        readingTimeMinutes: readingTimeMinutes === '' ? null : Number(readingTimeMinutes),
        tutorRecommendation: tutorRecommendation.trim() || undefined,
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
    materialId,
    isEdit,
    loading,
    saving,
    uploadingThumbnail,
    message,
    categories,
    modules,
    type,
    setType,
    title,
    slug,
    setSlug,
    setSlugManual,
    categoryId,
    setCategoryId,
    moduleId,
    setModuleId,
    excerpt,
    setExcerpt,
    targetAudienceOptions,
    setTargetAudienceOptions,
    targetAudienceIds,
    setTargetAudienceIds,
    readingTimeMinutes,
    setReadingTimeMinutes,
    tutorRecommendation,
    setTutorRecommendation,
    estimatedReadingTime: computeReadingTimeMinutes(content),
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
