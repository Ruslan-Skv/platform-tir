'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type KnowledgePlatformFeedbackType,
  createKnowledgePlatformFeedback,
} from '@/shared/api/admin-knowledge';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { ADMIN_TRAINING_STATISTICS_ICON_SIZE, PlatformFeedbackSubmitIcon } from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformFeedbackButton.module.css';

const FEEDBACK_TYPES: Array<{ value: KnowledgePlatformFeedbackType; label: string }> = [
  { value: 'SUGGESTION', label: 'Предложение по улучшению' },
  { value: 'BUG', label: 'Сообщение об ошибке' },
];

const SUBMIT_SUCCESS_MESSAGE = 'Отправлено';
const SUBMIT_SUCCESS_VISIBLE_MS = 3000;

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
  const [submitSuccessVisible, setSubmitSuccessVisible] = useState(false);
  const submitSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSubmitSuccess = useCallback(() => {
    if (submitSuccessTimeoutRef.current) {
      clearTimeout(submitSuccessTimeoutRef.current);
      submitSuccessTimeoutRef.current = null;
    }
    setSubmitSuccessVisible(false);
  }, []);

  const showSubmitSuccess = useCallback(() => {
    if (submitSuccessTimeoutRef.current) {
      clearTimeout(submitSuccessTimeoutRef.current);
    }
    setSubmitSuccessVisible(true);
    submitSuccessTimeoutRef.current = setTimeout(() => {
      setSubmitSuccessVisible(false);
      submitSuccessTimeoutRef.current = null;
    }, SUBMIT_SUCCESS_VISIBLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (submitSuccessTimeoutRef.current) {
        clearTimeout(submitSuccessTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setType('SUGGESTION');
    setText('');
    setError(null);
    clearSubmitSuccess();
    setSubmitting(false);
  }, [clearSubmitSuccess]);

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
    clearSubmitSuccess();
    try {
      await createKnowledgePlatformFeedback({ type, text: trimmed });
      setText('');
      showSubmitSuccess();
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
        titleAside={
          <AdminSaveNotice visible={submitSuccessVisible}>{SUBMIT_SUCCESS_MESSAGE}</AdminSaveNotice>
        }
        size="md"
        showCloseButton
        className={styles.modalPanel}
      >
        <form data-modal-form data-admin-participate onSubmit={(event) => void handleSubmit(event)}>
          <p data-modal-form-hint>
            {submitSuccessVisible
              ? 'Спасибо! Ваше сообщение отправлено. Мы учтём его при развитии обучающей платформы.'
              : 'Расскажите, что можно улучшить, или опишите ошибку, с которой вы столкнулись.'}
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
                  onChange={() => {
                    clearSubmitSuccess();
                    setType(option.value);
                  }}
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
              onChange={(event) => {
                if (submitSuccessVisible) {
                  clearSubmitSuccess();
                }
                setText(event.target.value);
              }}
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
      </Modal>
    </>
  );
}
