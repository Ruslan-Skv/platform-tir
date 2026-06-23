'use client';

import { useState } from 'react';

import {
  type KnowledgePlatformFeedbackType,
  createKnowledgePlatformFeedback,
} from '@/shared/api/admin-knowledge';
import { Modal } from '@/shared/ui/Modal';
import { ADMIN_TRAINING_STATISTICS_ICON_SIZE, PlatformFeedbackSubmitIcon } from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformFeedbackButton.module.css';

const FEEDBACK_TYPES: Array<{ value: KnowledgePlatformFeedbackType; label: string }> = [
  { value: 'SUGGESTION', label: 'Предложение по улучшению' },
  { value: 'BUG', label: 'Сообщение об ошибке' },
];

type KnowledgePlatformFeedbackButtonProps = {
  iconSize?: number;
  triggerClassName?: string;
  canParticipate?: boolean;
};

export function KnowledgePlatformFeedbackButton({
  iconSize = ADMIN_TRAINING_STATISTICS_ICON_SIZE,
  triggerClassName,
  canParticipate = true,
}: KnowledgePlatformFeedbackButtonProps = {}) {
  const buttonClassName = triggerClassName
    ? triggerClassName
    : `${cdTemplates.formatBtn} ${styles.trigger}`;

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<KnowledgePlatformFeedbackType>('SUGGESTION');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setType('SUGGESTION');
    setText('');
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createKnowledgePlatformFeedback({ type, text: trimmed });
      setSuccess(true);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canParticipate) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Предложения и сообщения об ошибках"
        title="Предложения по улучшению платформы и сообщения об ошибках"
        onClick={() => setOpen(true)}
      >
        <PlatformFeedbackSubmitIcon size={iconSize} />
      </button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Обратная связь по платформе"
        size="md"
        showCloseButton
      >
        {success ? (
          <>
            <div data-modal-footer-info data-modal-tone="success" role="status">
              <span data-modal-footer-info-icon aria-hidden="true" />
              <span data-modal-footer-info-text>
                Спасибо! Ваше сообщение отправлено. Мы учтём его при развитии обучающей платформы.
              </span>
            </div>
            <div data-modal-actions>
              <button type="button" data-modal-btn="primary" onClick={handleClose}>
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <form
            data-modal-form
            data-admin-participate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <p data-modal-form-hint>
              Расскажите, что можно улучшить, или опишите ошибку, с которой вы столкнулись.
            </p>

            <fieldset className={styles.typeFieldset}>
              <legend className={styles.typeLegend}>Тип сообщения</legend>
              {FEEDBACK_TYPES.map((option) => (
                <label key={option.value} className={styles.typeOption}>
                  <input
                    type="radio"
                    name="knowledge-feedback-type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    disabled={submitting}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <div data-modal-form-group>
              <label htmlFor="knowledge-platform-feedback-text">Сообщение</label>
              <textarea
                id="knowledge-platform-feedback-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Опишите предложение или ошибку как можно подробнее…"
                rows={6}
                maxLength={4000}
                disabled={submitting}
              />
              <div className={styles.counter}>{text.length} / 4000</div>
            </div>

            {error ? <p data-modal-form-error>{error}</p> : null}

            <div data-modal-form-actions>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={handleClose}
                disabled={submitting}
              >
                Отмена
              </button>
              <button
                data-admin-mutation
                type="submit"
                data-modal-btn="primary"
                disabled={submitting || !text.trim()}
              >
                {submitting ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
