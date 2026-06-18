'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import {
  CANDIDATE_STATUS_LABELS,
  EDUCATION_LEVELS,
  INDUSTRY_OPTIONS,
  type RecruitmentFormState,
  type SalesCandidate,
  type SalesCandidateFormData,
  type SalesCandidateStatus,
  type WorkHistoryItem,
  candidateToFormData,
  createCandidate,
  emptyCandidateForm,
  fetchCandidate,
  getFullName,
  linkTraineeByEmail,
  unlinkTraineeUser,
  updateCandidate,
  uploadAndParseResume,
} from '@/shared/api/admin-recruitment';

import { SKILL_FIELDS } from '../shared/recruitment.constants';
import styles from './RecruitmentFormPage.module.css';

export function RecruitmentFormPage() {
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

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  const score = candidate?.scoreBreakdown;
  const training = candidate?.trainingProgress;
  const parsed = candidate?.resumeParsedData;

  return (
    <div className={styles.formPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEdit && candidate ? getFullName(candidate) : 'Новый кандидат — менеджер по продажам'}
        </h1>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push('/admin/recruitment')}
        >
          ← К списку
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      {score ? (
        <div className={styles.scorePanel}>
          <strong>Оценка кандидата: {score.overallScore ?? '—'} / 100</strong>
          <p>{score.recommendation}</p>
          <div className={styles.scoreGrid}>
            <div className={styles.scoreItem}>
              <div className={styles.scoreValue}>{score.softSkillsScore ?? '—'}</div>
              <div className={styles.scoreLabel}>Soft skills</div>
            </div>
            <div className={styles.scoreItem}>
              <div className={styles.scoreValue}>{score.experienceScore ?? '—'}</div>
              <div className={styles.scoreLabel}>Опыт</div>
            </div>
            <div className={styles.scoreItem}>
              <div className={styles.scoreValue}>{score.interviewScore ?? '—'}</div>
              <div className={styles.scoreLabel}>Собеседование</div>
            </div>
            <div className={styles.scoreItem}>
              <div className={styles.scoreValue}>{score.trainingScore ?? '—'}</div>
              <div className={styles.scoreLabel}>Обучение</div>
            </div>
            <div className={styles.scoreItem}>
              <div className={styles.scoreValue}>{score.resumeScore ?? '—'}</div>
              <div className={styles.scoreLabel}>Резюме</div>
            </div>
          </div>
          {score.strengths.length > 0 ? (
            <p style={{ marginTop: 12, fontSize: '0.9em' }}>
              <strong>Сильные стороны:</strong> {score.strengths.join('; ')}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Личные данные</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Фамилия <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.lastName ?? ''}
                onChange={(e) => setField('lastName', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Имя <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.firstName ?? ''}
                onChange={(e) => setField('firstName', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Отчество</label>
              <input
                className={styles.input}
                value={form.middleName ?? ''}
                onChange={(e) => setField('middleName', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Дата рождения</label>
              <input
                type="date"
                className={styles.input}
                value={form.birthDate ?? ''}
                onChange={(e) => setField('birthDate', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Телефон <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.phone ?? ''}
                onChange={(e) => setField('phone', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={form.email ?? ''}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Город</label>
              <input
                className={styles.input}
                value={form.city ?? ''}
                onChange={(e) => setField('city', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Адрес</label>
              <input
                className={styles.input}
                value={form.address ?? ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Резюме</h2>
          <div className={styles.resumeBlock}>
            <p className={styles.resumeHint}>
              Загрузите файл резюме (PDF, DOCX или TXT) — система извлечёт навыки, опыт и контакты
              для анализа кандидата.
              {!isEdit ? ' Кандидат будет сохранён автоматически при загрузке.' : null}
            </p>
            {candidate?.resumeFileUrl ? (
              <p className={styles.resumeFileLink}>
                Текущий файл:{' '}
                <a href={candidate.resumeFileUrl} target="_blank" rel="noopener noreferrer">
                  {candidate.resumeFileName ?? 'Резюме'}
                </a>
              </p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className={styles.fileInput}
              onChange={handleResumeUpload}
            />
            <button
              type="button"
              className={styles.resumeUploadZone}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
            >
              <span className={styles.resumeUploadIcon}>📄</span>
              <span className={styles.resumeUploadTitle}>
                {uploading ? 'Анализ резюме...' : 'Нажмите, чтобы выбрать файл резюме'}
              </span>
              <span className={styles.resumeUploadFormats}>PDF · DOCX · TXT · до 10 МБ</span>
            </button>
            {parsed ? (
              <div className={styles.parsedPreview}>
                <strong>Результаты анализа:</strong>
                {parsed.skills.length > 0 ? <p>Навыки: {parsed.skills.join(', ')}</p> : null}
                {parsed.experienceYears != null ? (
                  <p>Опыт (из резюме): {parsed.experienceYears} лет</p>
                ) : null}
                {parsed.emails.length > 0 ? <p>Email: {parsed.emails.join(', ')}</p> : null}
                {parsed.phones.length > 0 ? <p>Телефоны: {parsed.phones.join(', ')}</p> : null}
                {parsed.jobTitles.length > 0 ? (
                  <p>Должности: {parsed.jobTitles.join(', ')}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Образование</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Уровень образования</label>
              <select
                className={styles.select}
                value={form.educationLevel ?? ''}
                onChange={(e) => setField('educationLevel', e.target.value)}
              >
                <option value="">—</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Год окончания</label>
              <input
                type="number"
                className={styles.input}
                value={form.educationYear ?? ''}
                onChange={(e) =>
                  setField(
                    'educationYear',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Учебное заведение</label>
              <input
                className={styles.input}
                value={form.educationInstitution ?? ''}
                onChange={(e) => setField('educationInstitution', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Специальность</label>
              <input
                className={styles.input}
                value={form.educationSpecialty ?? ''}
                onChange={(e) => setField('educationSpecialty', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Дополнительное образование</label>
              <textarea
                className={styles.textarea}
                value={form.additionalEducation ?? ''}
                onChange={(e) => setField('additionalEducation', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Опыт работы</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Общий стаж (лет)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className={styles.input}
                value={form.totalExperienceYears ?? ''}
                onChange={(e) =>
                  setField(
                    'totalExperienceYears',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Опыт в продажах (лет)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className={styles.input}
                value={form.salesExperienceYears ?? ''}
                onChange={(e) =>
                  setField(
                    'salesExperienceYears',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Отраслевой опыт</label>
              <div className={styles.checkboxGroup}>
                {INDUSTRY_OPTIONS.map((item) => (
                  <label key={item} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={(form.industryExperience ?? []).includes(item)}
                      onChange={() => toggleIndustry(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Ключевые достижения в продажах</label>
              <textarea
                className={styles.textarea}
                value={form.salesAchievements ?? ''}
                onChange={(e) => setField('salesAchievements', e.target.value)}
              />
            </div>
          </div>

          {(form.workHistory ?? []).map((wh, index) => (
            <div key={index} className={styles.workHistoryItem}>
              <div className={styles.workHistoryHeader}>
                <span>Место работы {index + 1}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeWorkHistory(index)}
                >
                  Удалить
                </button>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Компания</label>
                  <input
                    className={styles.input}
                    value={wh.company}
                    onChange={(e) => updateWorkHistory(index, 'company', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Должность</label>
                  <input
                    className={styles.input}
                    value={wh.position}
                    onChange={(e) => updateWorkHistory(index, 'position', e.target.value)}
                  />
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Период</label>
                  <input
                    className={styles.input}
                    value={wh.period ?? ''}
                    onChange={(e) => updateWorkHistory(index, 'period', e.target.value)}
                    placeholder="2020 — 2023"
                  />
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Обязанности</label>
                  <textarea
                    className={styles.textarea}
                    value={wh.duties ?? ''}
                    onChange={(e) => updateWorkHistory(index, 'duties', e.target.value)}
                  />
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Достижения</label>
                  <textarea
                    className={styles.textarea}
                    value={wh.achievements ?? ''}
                    onChange={(e) => updateWorkHistory(index, 'achievements', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={addWorkHistory}>
            + Добавить место работы
          </button>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Навыки (1–10)</h2>
          {SKILL_FIELDS.map(({ key, label }) => {
            const val = form[key] ?? 5;
            return (
              <div key={key} className={styles.skillRow}>
                <label>{label}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={val}
                  onChange={(e) => setField(key, parseInt(e.target.value, 10))}
                />
                <span className={styles.skillValue}>{val}</span>
              </div>
            );
          })}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Мотивация и условия</h2>
          <div className={styles.grid2}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Почему наша компания?</label>
              <textarea
                className={styles.textarea}
                value={form.motivationReason ?? ''}
                onChange={(e) => setField('motivationReason', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ожидания по з/п</label>
              <input
                className={styles.input}
                value={form.salaryExpectation ?? ''}
                onChange={(e) => setField('salaryExpectation', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Готов приступить с</label>
              <input
                type="date"
                className={styles.input}
                value={form.availableFrom ?? ''}
                onChange={(e) => setField('availableFrom', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.hasDriversLicense ?? false}
                  onChange={(e) => setField('hasDriversLicense', e.target.checked)}
                />
                Водительские права
              </label>
            </div>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.hasPersonalCar ?? false}
                  onChange={(e) => setField('hasPersonalCar', e.target.checked)}
                />
                Личный автомобиль
              </label>
            </div>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.readyForTravel ?? false}
                  onChange={(e) => setField('readyForTravel', e.target.checked)}
                />
                Готов к командировкам
              </label>
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Знание продукции</label>
              <textarea
                className={styles.textarea}
                value={form.productKnowledge ?? ''}
                onChange={(e) => setField('productKnowledge', e.target.value)}
              />
            </div>
          </div>
        </section>

        {isEdit ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>7. Обучение (Территория знаний)</h2>
              <p style={{ fontSize: '0.9em', color: '#666', marginBottom: 12 }}>
                Укажите email аккаунта на платформе (роль TRAINEE или другая с доступом к обучению)
                для синхронизации прогресса с{' '}
                <Link href="/admin/knowledge">Территорией знаний</Link>.
              </p>
              {candidate?.traineeUser ? (
                <p>
                  Привязан: {candidate.traineeUser.lastName} {candidate.traineeUser.firstName} (
                  {candidate.traineeUser.email})
                </p>
              ) : null}
              <div className={styles.traineeLink}>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label className={styles.label}>Email пользователя на платформе</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={traineeEmailInput}
                    onChange={(e) => setTraineeEmailInput(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <button type="button" className={styles.uploadBtn} onClick={handleLinkTrainee}>
                  Привязать
                </button>
                {candidate?.traineeUserId ? (
                  <button type="button" className={styles.removeBtn} onClick={handleUnlinkTrainee}>
                    Отвязать
                  </button>
                ) : null}
              </div>
              {training ? (
                <div className={styles.trainingBlock}>
                  <p>
                    Прогресс: {training.completedCount} / {training.trackableCount} (
                    {training.completionPercent}%)
                  </p>
                  <div className={styles.trainingProgress}>
                    <div
                      className={styles.trainingProgressBar}
                      style={{ width: `${training.completionPercent}%` }}
                    />
                  </div>
                  <p style={{ fontSize: '0.85em' }}>
                    Видео: {training.videosCompleted}, тесты: {training.quizzesPassed}
                  </p>
                </div>
              ) : null}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>8. Собеседование и статус</h2>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Дата собеседования</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.interviewDate ?? ''}
                    onChange={(e) => setField('interviewDate', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Оценка (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className={styles.input}
                    value={form.interviewScore ?? ''}
                    onChange={(e) =>
                      setField(
                        'interviewScore',
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                  />
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Заметки с собеседования</label>
                  <textarea
                    className={styles.textarea}
                    value={form.interviewNotes ?? ''}
                    onChange={(e) => setField('interviewNotes', e.target.value)}
                  />
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Заметки администратора</label>
                  <textarea
                    className={styles.textarea}
                    value={form.adminNotes ?? ''}
                    onChange={(e) => setField('adminNotes', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Статус</label>
                  <select
                    className={styles.select}
                    value={form.status ?? 'NEW'}
                    onChange={(e) => setField('status', e.target.value as SalesCandidateStatus)}
                  >
                    {(Object.keys(CANDIDATE_STATUS_LABELS) as SalesCandidateStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {CANDIDATE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </>
        ) : null}

        <div className={styles.actions}>
          <Link href="/admin/recruitment/blank" className={styles.uploadBtn} target="_blank">
            Бланк для печати
          </Link>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать кандидата'}
          </button>
        </div>
      </form>
    </div>
  );
}
