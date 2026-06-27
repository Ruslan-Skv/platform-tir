'use client';

import { useEffect, useState } from 'react';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { SiteConsentField } from '@/features/site-consent';
import {
  type SitePlatformFeedbackType,
  createSitePlatformFeedback,
} from '@/shared/api/site-feedback';
import { Modal } from '@/shared/ui/Modal';
import { PlatformFeedbackSubmitIcon } from '@/shared/ui/icons';

import styles from './SitePlatformFeedbackButton.module.css';

const FEEDBACK_TYPES: Array<{ value: SitePlatformFeedbackType; label: string }> = [
  { value: 'SUGGESTION', label: 'Предложение по улучшению' },
  { value: 'BUG', label: 'Сообщение об ошибке' },
];

export function SitePlatformFeedbackButton() {
  const { user } = useUserAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SitePlatformFeedbackType>('SUGGESTION');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (user) {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      setSenderName(name);
      setSenderEmail(user.email ?? '');
    }
  }, [open, user]);

  const resetForm = () => {
    setType('SUGGESTION');
    setSenderName('');
    setSenderEmail('');
    setSenderPhone('');
    setText('');
    setConsent(false);
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
    const trimmedText = text.trim();
    const trimmedName = senderName.trim();
    if (!trimmedText || !trimmedName || !consent || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createSitePlatformFeedback({
        type,
        text: trimmedText,
        senderName: trimmedName,
        senderEmail: senderEmail.trim() || undefined,
        senderPhone: senderPhone.trim() || undefined,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        consentAccepted: true,
      });
      setSuccess(true);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(text.trim() && senderName.trim() && consent);

  return (
    <>
      <button
        type="button"
        className={styles.siteFeedbackFab}
        aria-label="Сообщить об ошибке или предложить улучшение"
        title="Сообщить об ошибке или предложить улучшение сайта"
        onClick={() => setOpen(true)}
      >
        <PlatformFeedbackSubmitIcon size={24} />
      </button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Обратная связь по сайту"
        size="md"
        showCloseButton
        compactOnMobile
      >
        {success ? (
          <>
            <p className={styles.success} role="status">
              Спасибо! Ваше сообщение отправлено. Мы учтём его при развитии сайта.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={handleClose}>
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <p className={styles.hint}>
              Расскажите, что можно улучшить на сайте, или опишите ошибку, с которой вы столкнулись.
            </p>

            <fieldset className={styles.typeFieldset}>
              <legend className={styles.typeLegend}>Тип сообщения</legend>
              {FEEDBACK_TYPES.map((option) => (
                <label key={option.value} className={styles.typeOption}>
                  <input
                    type="radio"
                    name="site-feedback-type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    disabled={submitting}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <div className={styles.senderGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="site-platform-feedback-name">Имя *</label>
                <input
                  id="site-platform-feedback-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  maxLength={200}
                  required
                  disabled={submitting}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="site-platform-feedback-email">Email</label>
                <input
                  id="site-platform-feedback-email"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="your@email.com"
                  maxLength={200}
                  disabled={submitting}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="site-platform-feedback-phone">Телефон</label>
                <input
                  id="site-platform-feedback-phone"
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+7 (900) 123-45-67"
                  maxLength={50}
                  disabled={submitting}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="site-platform-feedback-text">Сообщение *</label>
              <textarea
                id="site-platform-feedback-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Опишите предложение или ошибку как можно подробнее…"
                rows={6}
                maxLength={4000}
                required
                disabled={submitting}
              />
              <div className={styles.counter}>{text.length} / 4000</div>
            </div>

            <div className={styles.consentWrap}>
              <SiteConsentField checked={consent} onChange={setConsent} />
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleClose}
                disabled={submitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={submitting || !canSubmit}
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
