'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getKnowledgePlatformSettings,
  updateKnowledgePlatformSettings,
} from '@/shared/api/admin-knowledge';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import {
  ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  KnowledgePlatformSettingsIcon,
} from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { invalidateKnowledgeQuizPlatformSettingsCache } from '../quiz/knowledge-quiz-platform-settings';
import styles from './KnowledgePlatformSettingsButton.module.css';

type KnowledgePlatformSettingsButtonProps = {
  iconSize?: number;
  triggerClassName?: string;
};

type PlatformSettingsFormState = {
  materialQuizTimePerQuestionSeconds: string;
  categoryQuizTimePerQuestionSeconds: string;
  materialQuizMaxAttemptsPerDay: string;
  categoryQuizMaxAttemptsPerDay: string;
  materialQuizRetryCooldownMinutes: string;
  categoryQuizRetryCooldownMinutes: string;
};

type PlatformSettingsValues = {
  materialQuizTimePerQuestionSeconds: number;
  categoryQuizTimePerQuestionSeconds: number;
  materialQuizMaxAttemptsPerDay: number;
  categoryQuizMaxAttemptsPerDay: number;
  materialQuizRetryCooldownMinutes: number;
  categoryQuizRetryCooldownMinutes: number;
};

const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsValues = {
  materialQuizTimePerQuestionSeconds: 60,
  categoryQuizTimePerQuestionSeconds: 60,
  materialQuizMaxAttemptsPerDay: 3,
  categoryQuizMaxAttemptsPerDay: 3,
  materialQuizRetryCooldownMinutes: 30,
  categoryQuizRetryCooldownMinutes: 30,
};

const DEFAULT_PLATFORM_SETTINGS_FORM: PlatformSettingsFormState = {
  materialQuizTimePerQuestionSeconds: String(
    DEFAULT_PLATFORM_SETTINGS.materialQuizTimePerQuestionSeconds
  ),
  categoryQuizTimePerQuestionSeconds: String(
    DEFAULT_PLATFORM_SETTINGS.categoryQuizTimePerQuestionSeconds
  ),
  materialQuizMaxAttemptsPerDay: String(DEFAULT_PLATFORM_SETTINGS.materialQuizMaxAttemptsPerDay),
  categoryQuizMaxAttemptsPerDay: String(DEFAULT_PLATFORM_SETTINGS.categoryQuizMaxAttemptsPerDay),
  materialQuizRetryCooldownMinutes: String(
    DEFAULT_PLATFORM_SETTINGS.materialQuizRetryCooldownMinutes
  ),
  categoryQuizRetryCooldownMinutes: String(
    DEFAULT_PLATFORM_SETTINGS.categoryQuizRetryCooldownMinutes
  ),
};

function toFormState(values: PlatformSettingsValues): PlatformSettingsFormState {
  return {
    materialQuizTimePerQuestionSeconds: String(values.materialQuizTimePerQuestionSeconds),
    categoryQuizTimePerQuestionSeconds: String(values.categoryQuizTimePerQuestionSeconds),
    materialQuizMaxAttemptsPerDay: String(values.materialQuizMaxAttemptsPerDay),
    categoryQuizMaxAttemptsPerDay: String(values.categoryQuizMaxAttemptsPerDay),
    materialQuizRetryCooldownMinutes: String(values.materialQuizRetryCooldownMinutes),
    categoryQuizRetryCooldownMinutes: String(values.categoryQuizRetryCooldownMinutes),
  };
}

function parseFormField(value: string, clamp: (next: number) => number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed);
}

function parseFormValues(form: PlatformSettingsFormState): PlatformSettingsValues {
  return {
    materialQuizTimePerQuestionSeconds: parseFormField(
      form.materialQuizTimePerQuestionSeconds,
      clampQuizSeconds,
      DEFAULT_PLATFORM_SETTINGS.materialQuizTimePerQuestionSeconds
    ),
    categoryQuizTimePerQuestionSeconds: parseFormField(
      form.categoryQuizTimePerQuestionSeconds,
      clampQuizSeconds,
      DEFAULT_PLATFORM_SETTINGS.categoryQuizTimePerQuestionSeconds
    ),
    materialQuizMaxAttemptsPerDay: parseFormField(
      form.materialQuizMaxAttemptsPerDay,
      clampQuizAttempts,
      DEFAULT_PLATFORM_SETTINGS.materialQuizMaxAttemptsPerDay
    ),
    categoryQuizMaxAttemptsPerDay: parseFormField(
      form.categoryQuizMaxAttemptsPerDay,
      clampQuizAttempts,
      DEFAULT_PLATFORM_SETTINGS.categoryQuizMaxAttemptsPerDay
    ),
    materialQuizRetryCooldownMinutes: parseFormField(
      form.materialQuizRetryCooldownMinutes,
      clampQuizCooldownMinutes,
      DEFAULT_PLATFORM_SETTINGS.materialQuizRetryCooldownMinutes
    ),
    categoryQuizRetryCooldownMinutes: parseFormField(
      form.categoryQuizRetryCooldownMinutes,
      clampQuizCooldownMinutes,
      DEFAULT_PLATFORM_SETTINGS.categoryQuizRetryCooldownMinutes
    ),
  };
}

function normalizeFormField(
  value: string,
  clamp: (next: number) => number,
  fallback: number
): string {
  return String(parseFormField(value, clamp, fallback));
}

const SAVE_SUCCESS_VISIBLE_MS = 3000;

function clampQuizSeconds(value: number): number {
  return Math.min(3600, Math.max(1, value));
}

function clampQuizAttempts(value: number): number {
  return Math.min(20, Math.max(1, value));
}

function clampQuizCooldownMinutes(value: number): number {
  return Math.min(1440, Math.max(1, value));
}

export function KnowledgePlatformSettingsButton({
  iconSize = ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  triggerClassName,
}: KnowledgePlatformSettingsButtonProps = {}) {
  const buttonClassName = triggerClassName
    ? triggerClassName
    : `${cdTemplates.formatBtn} ${styles.trigger}`;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformSettingsFormState>(DEFAULT_PLATFORM_SETTINGS_FORM);
  const [savedForm, setSavedForm] = useState<PlatformSettingsValues>(DEFAULT_PLATFORM_SETTINGS);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
      saveSuccessTimeoutRef.current = null;
    }
    setSaveSuccessVisible(false);
  }, []);

  const showSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
    }
    setSaveSuccessVisible(true);
    saveSuccessTimeoutRef.current = setTimeout(() => {
      setSaveSuccessVisible(false);
      saveSuccessTimeoutRef.current = null;
    }, SAVE_SUCCESS_VISIBLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }
    };
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    clearSaveSuccess();
    try {
      const data = await getKnowledgePlatformSettings();
      const nextValues = {
        materialQuizTimePerQuestionSeconds: data.materialQuizTimePerQuestionSeconds,
        categoryQuizTimePerQuestionSeconds: data.categoryQuizTimePerQuestionSeconds,
        materialQuizMaxAttemptsPerDay: data.materialQuizMaxAttemptsPerDay,
        categoryQuizMaxAttemptsPerDay: data.categoryQuizMaxAttemptsPerDay,
        materialQuizRetryCooldownMinutes: data.materialQuizRetryCooldownMinutes,
        categoryQuizRetryCooldownMinutes: data.categoryQuizRetryCooldownMinutes,
      };
      setForm(toFormState(nextValues));
      setSavedForm(nextValues);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [clearSaveSuccess]);

  useEffect(() => {
    if (!open) return;
    void loadSettings();
  }, [loadSettings, open]);

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setError(null);
    clearSaveSuccess();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;

    const payload = parseFormValues(form);

    setSaving(true);
    setError(null);
    clearSaveSuccess();
    try {
      const data = await updateKnowledgePlatformSettings(payload);
      const nextValues = {
        materialQuizTimePerQuestionSeconds: data.materialQuizTimePerQuestionSeconds,
        categoryQuizTimePerQuestionSeconds: data.categoryQuizTimePerQuestionSeconds,
        materialQuizMaxAttemptsPerDay: data.materialQuizMaxAttemptsPerDay,
        categoryQuizMaxAttemptsPerDay: data.categoryQuizMaxAttemptsPerDay,
        materialQuizRetryCooldownMinutes: data.materialQuizRetryCooldownMinutes,
        categoryQuizRetryCooldownMinutes: data.categoryQuizRetryCooldownMinutes,
      };
      setForm(toFormState(nextValues));
      setSavedForm(nextValues);
      invalidateKnowledgeQuizPlatformSettingsCache();
      showSaveSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const formValues = parseFormValues(form);
  const hasChanges =
    formValues.materialQuizTimePerQuestionSeconds !==
      savedForm.materialQuizTimePerQuestionSeconds ||
    formValues.categoryQuizTimePerQuestionSeconds !==
      savedForm.categoryQuizTimePerQuestionSeconds ||
    formValues.materialQuizMaxAttemptsPerDay !== savedForm.materialQuizMaxAttemptsPerDay ||
    formValues.categoryQuizMaxAttemptsPerDay !== savedForm.categoryQuizMaxAttemptsPerDay ||
    formValues.materialQuizRetryCooldownMinutes !== savedForm.materialQuizRetryCooldownMinutes ||
    formValues.categoryQuizRetryCooldownMinutes !== savedForm.categoryQuizRetryCooldownMinutes;

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Настройки обучающей платформы"
        title="Настройки обучающей платформы"
        onClick={() => setOpen(true)}
      >
        <KnowledgePlatformSettingsIcon size={iconSize} />
      </button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Настройки обучающей платформы"
        titleAside={<AdminSaveNotice visible={saveSuccessVisible} />}
        size="lg"
        showCloseButton
        className={styles.modalPanel}
        contentClassName={styles.modalContent}
      >
        {loading ? (
          <p className={styles.hint}>Загрузка…</p>
        ) : (
          <form
            data-modal-form
            data-modal-density="compact"
            className={styles.form}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <p className={styles.hint}>
              Параметры задаются отдельно для тестов в материалах и итоговых тестов по категориям.
            </p>

            <div className={styles.columns}>
              <section className={styles.column} aria-labelledby="knowledge-settings-material">
                <h3 id="knowledge-settings-material" className={styles.columnTitle}>
                  Тесты в материалах
                </h3>
                <div className={styles.columnFields}>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-material-quiz-time">Секунд на вопрос</label>
                    <input
                      id="knowledge-platform-material-quiz-time"
                      type="number"
                      min={1}
                      max={3600}
                      value={form.materialQuizTimePerQuestionSeconds}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          materialQuizTimePerQuestionSeconds: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          materialQuizTimePerQuestionSeconds: normalizeFormField(
                            current.materialQuizTimePerQuestionSeconds,
                            clampQuizSeconds,
                            DEFAULT_PLATFORM_SETTINGS.materialQuizTimePerQuestionSeconds
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-material-quiz-max-attempts">
                      Попыток в сутки
                    </label>
                    <input
                      id="knowledge-platform-material-quiz-max-attempts"
                      type="number"
                      min={1}
                      max={20}
                      value={form.materialQuizMaxAttemptsPerDay}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          materialQuizMaxAttemptsPerDay: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          materialQuizMaxAttemptsPerDay: normalizeFormField(
                            current.materialQuizMaxAttemptsPerDay,
                            clampQuizAttempts,
                            DEFAULT_PLATFORM_SETTINGS.materialQuizMaxAttemptsPerDay
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-material-quiz-cooldown">
                      Минут между попытками
                    </label>
                    <input
                      id="knowledge-platform-material-quiz-cooldown"
                      type="number"
                      min={1}
                      max={1440}
                      value={form.materialQuizRetryCooldownMinutes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          materialQuizRetryCooldownMinutes: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          materialQuizRetryCooldownMinutes: normalizeFormField(
                            current.materialQuizRetryCooldownMinutes,
                            clampQuizCooldownMinutes,
                            DEFAULT_PLATFORM_SETTINGS.materialQuizRetryCooldownMinutes
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.column} aria-labelledby="knowledge-settings-category">
                <h3 id="knowledge-settings-category" className={styles.columnTitle}>
                  Итоговые тесты
                </h3>
                <div className={styles.columnFields}>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-category-quiz-time">Секунд на вопрос</label>
                    <input
                      id="knowledge-platform-category-quiz-time"
                      type="number"
                      min={1}
                      max={3600}
                      value={form.categoryQuizTimePerQuestionSeconds}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizTimePerQuestionSeconds: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizTimePerQuestionSeconds: normalizeFormField(
                            current.categoryQuizTimePerQuestionSeconds,
                            clampQuizSeconds,
                            DEFAULT_PLATFORM_SETTINGS.categoryQuizTimePerQuestionSeconds
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-category-quiz-max-attempts">
                      Попыток в сутки
                    </label>
                    <input
                      id="knowledge-platform-category-quiz-max-attempts"
                      type="number"
                      min={1}
                      max={20}
                      value={form.categoryQuizMaxAttemptsPerDay}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizMaxAttemptsPerDay: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizMaxAttemptsPerDay: normalizeFormField(
                            current.categoryQuizMaxAttemptsPerDay,
                            clampQuizAttempts,
                            DEFAULT_PLATFORM_SETTINGS.categoryQuizMaxAttemptsPerDay
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                  <div data-modal-form-group>
                    <label htmlFor="knowledge-platform-category-quiz-cooldown">
                      Минут между попытками
                    </label>
                    <input
                      id="knowledge-platform-category-quiz-cooldown"
                      type="number"
                      min={1}
                      max={1440}
                      value={form.categoryQuizRetryCooldownMinutes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizRetryCooldownMinutes: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setForm((current) => ({
                          ...current,
                          categoryQuizRetryCooldownMinutes: normalizeFormField(
                            current.categoryQuizRetryCooldownMinutes,
                            clampQuizCooldownMinutes,
                            DEFAULT_PLATFORM_SETTINGS.categoryQuizRetryCooldownMinutes
                          ),
                        }))
                      }
                      disabled={saving}
                      className={styles.numberInput}
                    />
                  </div>
                </div>
              </section>
            </div>

            {error ? <p data-modal-form-error>{error}</p> : null}

            <div data-modal-form-actions>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={handleClose}
                disabled={saving}
              >
                {hasChanges ? 'Отмена' : 'Закрыть'}
              </button>
              <button
                data-admin-mutation
                type="submit"
                data-modal-btn="primary"
                disabled={saving || !hasChanges}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
