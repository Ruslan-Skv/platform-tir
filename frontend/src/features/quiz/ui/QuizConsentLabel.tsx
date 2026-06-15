'use client';

import {
  type QuizConsentConfig,
  hasPrivacyPolicyView,
  resolveQuizConsent,
  splitConsentByLinkText,
} from '@/features/quiz/lib/quiz-consent';
import { QUIZ_PRIVACY_POLICY_PATH } from '@/features/quiz/lib/quiz-upload-url';

import styles from './QuizWizard.module.css';

type QuizConsentLabelProps = {
  config: Partial<QuizConsentConfig>;
};

export function QuizConsentLabel({ config }: QuizConsentLabelProps) {
  const consent = resolveQuizConsent(config);
  const parts = splitConsentByLinkText(consent.consentText, consent.consentLinkText);
  const canOpenPolicy = hasPrivacyPolicyView(consent);

  const openPolicy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canOpenPolicy) return;
    window.open(QUIZ_PRIVACY_POLICY_PATH, '_blank', 'noopener,noreferrer');
  };

  if (!parts) {
    return <>{consent.consentText}</>;
  }

  const linkNode = canOpenPolicy ? (
    <button type="button" className={styles.consentLink} onClick={openPolicy}>
      {consent.consentLinkText}
    </button>
  ) : (
    consent.consentLinkText
  );

  return (
    <>
      {parts.before}
      {linkNode}
      {parts.after}
    </>
  );
}
