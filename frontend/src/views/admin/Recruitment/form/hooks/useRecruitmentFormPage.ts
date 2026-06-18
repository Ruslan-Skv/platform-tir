'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
  type RecruitmentFormState,
  type SalesCandidate,
  type SalesCandidateFormData,
  type WorkHistoryItem,
  candidateToFormData,
  createCandidate,
  emptyCandidateForm,
  fetchCandidate,
  linkTraineeByEmail,
  unlinkTraineeUser,
  updateCandidate,
  uploadAndParseResume,
} from '@/shared/api/admin-recruitment';

export type RecruitmentFormPageModel = ReturnType<typeof useRecruitmentFormPage>;

export function useRecruitmentFormPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const isEdit = Boolean(id && id !== 'new');

  const [form, setForm] = useState<RecruitmentFormState>(emptyCandidateForm());
  const [candidate, setCandidate] = useState<SalesCandidate | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [traineeEmailInput, setTraineeEmailInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!isEdit || !id) return;
    setLoading(true);
    setError('');
    try {
      const c = await fetchCandidate(id);
      setCandidate(c);
      setForm(candidateToFormData(c));
      setTraineeEmailInput(c.traineeUser?.email ?? c.email ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = <K extends keyof RecruitmentFormState>(
    key: K,
    value: RecruitmentFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleIndustry = (item: string) => {
    setForm((prev) => {
      const current = prev.industryExperience;
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, industryExperience: next };
    });
  };

  const addWorkHistory = () => {
    setForm((prev) => ({
      ...prev,
      workHistory: [...prev.workHistory, { company: '', position: '' }],
    }));
  };

  const updateWorkHistory = (index: number, field: keyof WorkHistoryItem, value: string) => {
    setForm((prev) => {
      const list = [...prev.workHistory];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, workHistory: list };
    });
  };

  const removeWorkHistory = (index: number) => {
    setForm((prev) => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, i) => i !== index),
    }));
  };

  const buildPayload = (): Partial<SalesCandidateFormData> => ({
    ...form,
    middleName: form.middleName || undefined,
    email: form.email || undefined,
    traineeUserId: form.traineeUserId || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.phone.trim()) {
      setError('Заполните обязательные поля: фамилия, имя, телефон');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = buildPayload();

      if (isEdit && id) {
        const updated = await updateCandidate(id, payload);
        setCandidate(updated);
        setMessage('Данные сохранены');
      } else {
        const created = await createCandidate(payload);
        router.replace(`/admin/recruitment/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!form.lastName?.trim() || !form.firstName?.trim() || !form.phone?.trim()) {
      setError('Для загрузки резюме заполните фамилию, имя и телефон');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    try {
      let candidateId = isEdit && id ? id : null;
      if (!candidateId) {
        const created = await createCandidate(buildPayload());
        candidateId = created.id;
        setCandidate(created);
        setForm(candidateToFormData(created));
        router.replace(`/admin/recruitment/${created.id}`);
      }

      const updated = await uploadAndParseResume(candidateId, file);
      setCandidate(updated);
      setForm(candidateToFormData(updated));
      setMessage('Резюме загружено и проанализировано');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки резюме');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkTrainee = async () => {
    if (!id || !traineeEmailInput.trim()) return;
    try {
      const updated = await linkTraineeByEmail(id, traineeEmailInput.trim());
      setCandidate(updated);
      setForm(candidateToFormData(updated));
      setTraineeEmailInput(updated.traineeUser?.email ?? traineeEmailInput.trim());
      setMessage('Пользователь привязан для синхронизации обучения');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка привязки');
    }
  };

  const handleUnlinkTrainee = async () => {
    if (!id) return;
    try {
      const updated = await unlinkTraineeUser(id);
      setCandidate(updated);
      setForm(candidateToFormData(updated));
      setTraineeEmailInput(updated.email ?? '');
      setMessage('Привязка к обучению снята');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  return {
    router,
    id,
    isEdit,
    form,
    candidate,
    loading,
    saving,
    uploading,
    error,
    message,
    traineeEmailInput,
    setTraineeEmailInput,
    fileInputRef,
    setField,
    toggleIndustry,
    addWorkHistory,
    updateWorkHistory,
    removeWorkHistory,
    handleSubmit,
    handleResumeUpload,
    handleLinkTrainee,
    handleUnlinkTrainee,
    score: candidate?.scoreBreakdown,
    training: candidate?.trainingProgress,
    parsed: candidate?.resumeParsedData,
  };
}
