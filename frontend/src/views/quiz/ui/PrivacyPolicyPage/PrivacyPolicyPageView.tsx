import type { QuizConsentConfig } from '@/features/quiz/lib/quiz-consent';
import {
  formatPrivacyPolicyForDisplay,
  resolveQuizConsent,
} from '@/features/quiz/lib/quiz-consent';
import {
  isPrivacyPolicyPdfUrl,
  resolvePrivacyPolicyEmbedUrl,
} from '@/features/quiz/lib/quiz-upload-url';

import styles from './PrivacyPolicyPageView.module.css';

type PrivacyPolicyPageViewProps = {
  config: Partial<QuizConsentConfig>;
};

export function PrivacyPolicyPageView({ config }: PrivacyPolicyPageViewProps) {
  const consent = resolveQuizConsent(config);
  const pdfUrl = isPrivacyPolicyPdfUrl(consent.privacyPolicyUrl)
    ? resolvePrivacyPolicyEmbedUrl(consent.privacyPolicyUrl)
    : null;
  const text = consent.privacyPolicyContent
    ? formatPrivacyPolicyForDisplay(consent.privacyPolicyContent)
    : null;

  if (pdfUrl) {
    return (
      <div className={styles.pdfPage}>
        <iframe className={styles.pdfFrame} src={pdfUrl} title={consent.privacyPolicyTitle} />
      </div>
    );
  }

  if (text) {
    return (
      <article className={styles.textPage}>
        <h1 className={styles.title}>{consent.privacyPolicyTitle}</h1>
        <div className={styles.textBody}>{text}</div>
      </article>
    );
  }

  return (
    <div className={styles.empty}>
      <p>Политика конфиденциальности не настроена.</p>
    </div>
  );
}
