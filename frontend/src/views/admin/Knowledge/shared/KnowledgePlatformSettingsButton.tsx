'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getKnowledgePlatformSettings,
  updateKnowledgePlatformSettings,
} from '@/shared/api/admin-knowledge';
import { Modal } from '@/shared/ui/Modal';
import {
  ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  KnowledgePlatformSettingsIcon,
} from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformSettingsButton.module.css';
import { invalidateKnowledgeQuizPlatformSettingsCache } from './knowledge-quiz-platform-settings';

type KnowledgePlatformSettingsButtonProps = {
  iconSize?: number;
  triggerClassName?: string;
};

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
  const [quizTimePerQuestionSeconds, setQuizTimePerQuestionSeconds] = useState(60);
  const [savedSeconds, setSavedSeconds] = useState(60);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgePlatformSettings();
      setQuizTimePerQuestionSeconds(data.quizTimePerQuestionSeconds);
      setSavedSeconds(data.quizTimePerQuestionSeconds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadSettings();
  }, [loadSettings, open]);

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;

    const seconds = Math.min(3600, Math.max(1, quizTimePerQuestionSeconds));
    setSaving(true);
    setError(null);
    try {
      const data = await updateKnowledgePlatformSettings({
        quizTimePerQuestionSeconds: seconds,
      });
      setQuizTimePerQuestionSeconds(data.quizTimePerQuestionSeconds);
      setSavedSeconds(data.quizTimePerQuestionSeconds);
      invalidateKnowledgeQuizPlatformSettingsCache();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = quizTimePerQuestionSeconds !== savedSeconds;

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
        size="md"
        showCloseButton
      >
        {loading ? (
          <p className={styles.hint}>Загрузка…</p>
        ) : (
          <form data-modal-form onSubmit={(event) => void handleSubmit(event)}>
            <p className={styles.hint}>
              Время на ответ (в секундах) применяется ко всем тестам: в материалах и в итоговых
              тестах по категориям.
            </p>

            <div data-modal-form-group>
              <label htmlFor="knowledge-platform-quiz-time-per-question">Секунд на вопрос</label>
              <input
                id="knowledge-platform-quiz-time-per-question"
                type="number"
                min={1}
                max={3600}
                value={quizTimePerQuestionSeconds}
                onChange={(event) =>
                  setQuizTimePerQuestionSeconds(parseInt(event.target.value, 10) || 1)
                }
                disabled={saving}
                className={styles.numberInput}
              />
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
