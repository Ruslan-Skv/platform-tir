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
  privacyPolicyPath?: string;
  linkClassName?: string;
};

export function QuizConsentLabel({
  config,
  privacyPolicyPath = QUIZ_PRIVACY_POLICY_PATH,
  linkClassName,
}: QuizConsentLabelProps) {
  const consent = resolveQuizConsent(config);
  const parts = splitConsentByLinkText(consent.consentText, consent.consentLinkText);
  const canOpenPolicy = hasPrivacyPolicyView(consent);

  const openPolicy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canOpenPolicy) return;
    window.open(privacyPolicyPath, '_blank', 'noopener,noreferrer');
  };

  if (!parts) {
    return <>{consent.consentText}</>;
  }

  const linkNode = canOpenPolicy ? (
    <button type="button" className={linkClassName ?? styles.consentLink} onClick={openPolicy}>
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
