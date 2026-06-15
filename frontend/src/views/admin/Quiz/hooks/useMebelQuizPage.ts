'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { mergeQuizTheme } from '@/features/quiz/lib/quiz-theme';
import {
  type AdminQuizLanding,
  type AdminQuizStep,
  MEBEL_QUIZ_SLUG,
  type QuizSubmissionItem,
  getAdminQuiz,
  getAdminQuizSubmissions,
  replaceAdminQuizSteps,
  updateAdminQuiz,
  updateQuizSubmission,
  uploadQuizCatalog,
  uploadQuizOptionImage,
} from '@/shared/api/admin-quiz';
import type { QuizTheme } from '@/shared/api/quiz-theme';
import { DEFAULT_QUIZ_THEME } from '@/shared/api/quiz-theme';

export type MebelQuizTab = 'settings' | 'theme' | 'steps' | 'submissions';

export function useMebelQuizPage() {
  const { getAuthHeaders } = useAuth();
  const [tab, setTab] = useState<MebelQuizTab>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<AdminQuizLanding | null>(null);
  const [themeDraft, setThemeDraft] = useState<QuizTheme>(DEFAULT_QUIZ_THEME);
  const [stepsDraft, setStepsDraft] = useState<AdminQuizStep[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmissionItem[]>([]);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsTotalPages, setSubmissionsTotalPages] = useState(1);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionStats, setSubmissionStats] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [furnitureFilter, setFurnitureFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const applyQuizData = useCallback((data: AdminQuizLanding) => {
    setQuiz(data);
    setStepsDraft(data.steps);
    setThemeDraft(mergeQuizTheme(data.theme, data.primaryColor));
  }, []);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminQuiz(MEBEL_QUIZ_SLUG, getAuthHeaders);
      applyQuizData(data);
    } catch {
      showMessage('error', 'Не удалось загрузить квиз. Запустите seed или миграцию.');
    } finally {
      setLoading(false);
    }
  }, [applyQuizData, getAuthHeaders, showMessage]);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await getAdminQuizSubmissions(
        MEBEL_QUIZ_SLUG,
        {
          page: submissionsPage,
          status: statusFilter || undefined,
          furnitureType: furnitureFilter || undefined,
          search: searchFilter || undefined,
        },
        getAuthHeaders
      );
      setSubmissions(res.data);
      setSubmissionsTotalPages(res.totalPages);
      setSubmissionsTotal(res.total);
      setSubmissionStats(res.stats);
    } catch {
      showMessage('error', 'Не удалось загрузить заявки');
    }
  }, [furnitureFilter, getAuthHeaders, searchFilter, showMessage, statusFilter, submissionsPage]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  useEffect(() => {
    if (tab === 'submissions') {
      loadSubmissions();
    }
  }, [tab, loadSubmissions]);

  const setQuizField = <K extends keyof AdminQuizLanding>(key: K, value: AdminQuizLanding[K]) => {
    setQuiz((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setThemeField = <K extends keyof QuizTheme>(key: K, value: QuizTheme[K]) => {
    setThemeDraft((prev) => ({ ...prev, [key]: value }));
    if (key === 'accentColor') {
      setQuiz((prev) => (prev ? { ...prev, primaryColor: value as string } : prev));
    }
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadQuizOptionImage(MEBEL_QUIZ_SLUG, file, getAuthHeaders);
      setThemeField('backgroundImageUrl', url);
      showMessage('success', 'Фоновое изображение загружено');
    } catch {
      showMessage('error', 'Ошибка загрузки');
    }
    e.target.value = '';
  };

  const handleSaveSettings = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const updated = await updateAdminQuiz(
        MEBEL_QUIZ_SLUG,
        {
          domain: quiz.domain,
          isActive: quiz.isActive,
          headline: quiz.headline,
          subheadline: quiz.subheadline,
          promoText: quiz.promoText,
          logoUrl: quiz.logoUrl,
          displayPhone: quiz.displayPhone,
          city: quiz.city,
          successTitle: quiz.successTitle,
          successText: quiz.successText,
          catalogFileUrl: quiz.catalogFileUrl,
          notifyEmails: quiz.notifyEmails ?? [],
          notifyTelegramIds: quiz.notifyTelegramIds ?? [],
          notifyPhones: quiz.notifyPhones ?? [],
        },
        getAuthHeaders
      );
      applyQuizData(updated);
      showMessage('success', 'Настройки сохранены');
    } catch {
      showMessage('error', 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const updated = await updateAdminQuiz(
        MEBEL_QUIZ_SLUG,
        {
          primaryColor: themeDraft.accentColor,
          theme: themeDraft,
        },
        getAuthHeaders
      );
      applyQuizData(updated);
      showMessage('success', 'Оформление сохранено');
    } catch {
      showMessage('error', 'Ошибка сохранения оформления');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSteps = async () => {
    setSaving(true);
    try {
      const payload = stepsDraft.map((s, i) => ({
        key: s.key,
        sortOrder: i,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        placeholder: s.placeholder,
        required: s.required,
        options: s.options ?? undefined,
        showWhen: s.showWhen ?? undefined,
      }));
      const updated = await replaceAdminQuizSteps(MEBEL_QUIZ_SLUG, payload, getAuthHeaders);
      applyQuizData(updated);
      showMessage('success', 'Шаги сохранены');
    } catch {
      showMessage('error', 'Ошибка сохранения шагов');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCatalog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadQuizCatalog(MEBEL_QUIZ_SLUG, file, getAuthHeaders);
      setQuizField('catalogFileUrl', url);
      showMessage('success', 'Каталог загружен');
    } catch {
      showMessage('error', 'Ошибка загрузки');
    }
    e.target.value = '';
  };

  const handleUploadOptionImage = async (
    stepIdx: number,
    optionIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadQuizOptionImage(MEBEL_QUIZ_SLUG, file, getAuthHeaders);
      const next = [...stepsDraft];
      const step = next[stepIdx];
      const options = [...(step.options ?? [])];
      options[optionIdx] = { ...options[optionIdx], imageUrl: url };
      next[stepIdx] = { ...step, options };
      setStepsDraft(next);
      showMessage('success', 'Изображение загружено');
    } catch {
      showMessage('error', 'Ошибка загрузки изображения');
    }
    e.target.value = '';
  };

  const handleUpdateSubmission = async (
    id: string,
    data: { status?: string; managerNote?: string | null }
  ) => {
    try {
      await updateQuizSubmission(MEBEL_QUIZ_SLUG, id, data, getAuthHeaders);
      await loadSubmissions();
      showMessage('success', 'Заявка обновлена');
    } catch {
      showMessage('error', 'Ошибка обновления заявки');
    }
  };

  const previewUrl = useMemo(() => {
    if (quiz?.domain) return `https://${quiz.domain}`;
    return '/quiz';
  }, [quiz?.domain]);

  const answerLabels = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const step of stepsDraft) {
      if (!step.options) continue;
      const optMap = new Map<string, string>();
      for (const o of step.options) optMap.set(o.value, o.label);
      map.set(step.key, optMap);
    }
    return map;
  }, [stepsDraft]);

  return {
    tab,
    setTab,
    loading,
    saving,
    quiz,
    themeDraft,
    stepsDraft,
    submissions,
    submissionsPage,
    submissionsTotalPages,
    submissionsTotal,
    submissionStats,
    statusFilter,
    setStatusFilter,
    furnitureFilter,
    setFurnitureFilter,
    searchFilter,
    setSearchFilter,
    message,
    setQuizField,
    setThemeField,
    setStepsDraft,
    handleSaveSettings,
    handleSaveTheme,
    handleSaveSteps,
    handleUploadCatalog,
    handleUploadBackground,
    handleUploadOptionImage,
    handleUpdateSubmission,
    loadSubmissions,
    setSubmissionsPage,
    previewUrl,
    answerLabels,
  };
}
