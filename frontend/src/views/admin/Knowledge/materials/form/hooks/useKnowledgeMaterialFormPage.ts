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
  publishKnowledgeMaterial,
  updateKnowledgeMaterial,
  uploadKnowledgeThumbnail,
} from '@/shared/api/admin-knowledge';
import { useAdminStickySaveButton } from '@/views/admin/ui/AdminStickySaveButton';

import type { KnowledgeQuizEditorHandle } from '../../../shared/knowledge-quiz-editor.types';
import { computeReadingTimeMinutes, slugify } from '../../../shared/knowledge-utils';
import type {
  KnowledgeMaterialFormPageMessage,
  KnowledgeMaterialFormStatus,
  KnowledgeMaterialSubmitAction,
} from '../knowledge-material-form-page.types';

export type UseKnowledgeMaterialFormPageOptions = {
  materialId?: string;
};

type MaterialPayloadSnapshot = {
  categoryId: string;
  moduleId: string | null;
  type: KnowledgeMaterialType;
  title: string;
  slug: string;
  excerpt?: string;
  targetAudienceIds: string[];
  readingTimeMinutes: number | null;
  tutorRecommendation?: string;
  managerPracticalAssignment?: string;
  content?: string;
  videoUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  sortOrder: number;
  isPinned: boolean;
  attachments: KnowledgeAttachmentInput[];
  status: KnowledgeMaterialFormStatus;
};

function serializeMaterialPayload(payload: MaterialPayloadSnapshot) {
  return JSON.stringify({
    ...payload,
    targetAudienceIds: [...payload.targetAudienceIds].sort(),
  });
}

export function useKnowledgeMaterialFormPage({ materialId }: UseKnowledgeMaterialFormPageOptions) {
  const router = useRouter();
  const isEdit = Boolean(materialId);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const quizEditorRef = useRef<KnowledgeQuizEditorHandle | null>(null);
  const pageHeaderRef = useRef<HTMLDivElement>(null);
  const lastSavedMaterialSnapshotRef = useRef('');
  const handleSubmitRef = useRef<(action?: KnowledgeMaterialSubmitAction) => Promise<void>>(
    async () => {}
  );
  const handlePublishRef = useRef<() => Promise<void>>(async () => {});

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
  const [managerPracticalAssignment, setManagerPracticalAssignment] = useState('');
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

  const buildMaterialPayload = useCallback((): MaterialPayloadSnapshot => {
    return {
      categoryId,
      moduleId: moduleId || null,
      type,
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || undefined,
      targetAudienceIds,
      readingTimeMinutes: readingTimeMinutes === '' ? null : Number(readingTimeMinutes),
      tutorRecommendation: tutorRecommendation.trim() || undefined,
      managerPracticalAssignment: managerPracticalAssignment.trim() || undefined,
      content: content.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      externalUrl: externalUrl.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      sortOrder,
      isPinned,
      attachments,
      status,
    };
  }, [
    attachments,
    categoryId,
    content,
    excerpt,
    externalUrl,
    isPinned,
    managerPracticalAssignment,
    moduleId,
    readingTimeMinutes,
    slug,
    sortOrder,
    status,
    targetAudienceIds,
    thumbnailUrl,
    title,
    tutorRecommendation,
    type,
    videoUrl,
  ]);

  const syncSavedMaterialSnapshot = useCallback(
    (statusOverride?: KnowledgeMaterialFormStatus) => {
      const payload = buildMaterialPayload();
      if (statusOverride) {
        payload.status = statusOverride;
      }
      lastSavedMaterialSnapshotRef.current = serializeMaterialPayload(payload);
    },
    [buildMaterialPayload]
  );

  const hasUnsavedChanges = useCallback(() => {
    if (!isEdit) return true;
    if (serializeMaterialPayload(buildMaterialPayload()) !== lastSavedMaterialSnapshotRef.current) {
      return true;
    }
    if (type === 'ARTICLE' && quizEditorRef.current?.isDirty()) {
      return true;
    }
    return false;
  }, [buildMaterialPayload, isEdit, type]);

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
      setManagerPracticalAssignment(m.managerPracticalAssignment || '');
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
      lastSavedMaterialSnapshotRef.current = serializeMaterialPayload({
        categoryId: m.categoryId,
        moduleId: m.moduleId || null,
        type: m.type,
        title: m.title,
        slug: m.slug,
        excerpt: m.excerpt || undefined,
        targetAudienceIds: (m.targetAudiences ?? []).map((a) => a.id),
        readingTimeMinutes: m.readingTimeMinutes ?? null,
        tutorRecommendation: m.tutorRecommendation || undefined,
        managerPracticalAssignment: m.managerPracticalAssignment || undefined,
        content: m.content || undefined,
        videoUrl: m.videoUrl || undefined,
        externalUrl: m.externalUrl || undefined,
        thumbnailUrl: m.thumbnailUrl || undefined,
        sortOrder: m.sortOrder,
        isPinned: m.isPinned,
        attachments: (m.attachments ?? []).map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize ?? undefined,
          mimeType: a.mimeType ?? undefined,
          sortOrder: a.sortOrder,
        })),
        status: m.status,
      });
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

  const handleSubmit = async (action: KnowledgeMaterialSubmitAction = 'save') => {
    if (!title.trim() || !slug.trim() || !categoryId) {
      showMessage('error', 'Заполните название, slug и категорию');
      return;
    }
    if (type === 'VIDEO' && !videoUrl.trim()) {
      showMessage('error', 'Укажите ссылку на видео');
      return;
    }

    const nextStatus: KnowledgeMaterialFormStatus = action === 'unpublish' ? 'DRAFT' : status;

    if (type === 'ARTICLE' && !content.trim() && nextStatus === 'PUBLISHED') {
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
        ...buildMaterialPayload(),
        status: nextStatus,
      };

      const successMessage = action === 'unpublish' ? 'Материал снят с публикации' : 'Сохранено';

      if (isEdit && materialId) {
        await updateKnowledgeMaterial(materialId, payload);
        if (type === 'ARTICLE' && quizEditorRef.current) {
          try {
            await quizEditorRef.current.save();
          } catch (quizError) {
            showMessage(
              'error',
              quizError instanceof Error
                ? `Материал сохранён, но тест не удалось сохранить: ${quizError.message}`
                : 'Материал сохранён, но тест не удалось сохранить'
            );
            return;
          }
        }
        setStatus(nextStatus);
        syncSavedMaterialSnapshot(nextStatus);
        showMessage('success', successMessage);
      } else {
        const created = await createKnowledgeMaterial(payload);
        showMessage('success', 'Материал создан');
        router.push(`/admin/knowledge/materials/${created.id}/edit`);
      }
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (status === 'PUBLISHED') {
      return;
    }
    if (type === 'ARTICLE' && !content.trim()) {
      showMessage('error', 'Добавьте текст статьи');
      return;
    }
    if (type === 'VIDEO' && !videoUrl.trim()) {
      showMessage('error', 'Укажите ссылку на видео');
      return;
    }
    if (type === 'LINK' && !externalUrl.trim()) {
      showMessage('error', 'Укажите внешнюю ссылку');
      return;
    }

    if (!materialId) return;

    setSaving(true);
    try {
      await publishKnowledgeMaterial(materialId);
      setStatus('PUBLISHED');
      syncSavedMaterialSnapshot('PUBLISHED');
      showMessage('success', 'Опубликован');
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Не удалось опубликовать материал');
    } finally {
      setSaving(false);
    }
  };

  handleSubmitRef.current = handleSubmit;
  handlePublishRef.current = handlePublish;

  const secondaryButtonLabel = status === 'PUBLISHED' ? 'Снять с публикации' : 'Опубликовать';

  const saveButtonState = useAdminStickySaveButton({
    enabled: !loading,
    loading,
    saving,
    pageHeaderRef,
    onSave: () => void handleSubmitRef.current('save'),
  });

  const { handleSaveClick } = saveButtonState;

  const handlePublishClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void handlePublishRef.current();
  }, []);

  const handleUnpublishClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void handleSubmitRef.current('unpublish');
  }, []);

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
    managerPracticalAssignment,
    setManagerPracticalAssignment,
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
    quizEditorRef,
    pageHeaderRef,
    saveButtonState,
    saveButtonPinnedTopPx: saveButtonState.saveButtonPinnedTopPx,
    secondaryButtonLabel,
    isSecondaryUnpublish: status === 'PUBLISHED',
    isPublishDisabled: saving || !isEdit || status === 'PUBLISHED' || hasUnsavedChanges(),
    handleHeaderSaveClick: handleSaveClick,
    handlePublishClick,
    handleUnpublishClick,
    handleTitleChange,
    handleThumbnailUpload,
  };
}

export type KnowledgeMaterialFormPageModel = ReturnType<typeof useKnowledgeMaterialFormPage>;
