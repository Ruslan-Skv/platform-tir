'use client';

import { QuizConsentLabel } from '@/features/quiz/ui/QuizConsentLabel';

import styles from './SiteConsentField.module.css';
import { SITE_PRIVACY_POLICY_PATH } from './site-consent-path';
import { useSiteConsentConfig } from './useSiteConsentConfig';

type SiteConsentFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function SiteConsentField({ checked, onChange, className }: SiteConsentFieldProps) {
  const config = useSiteConsentConfig();
  if (config === null) return null;

  return (
    <label className={`${styles.consentLabel}${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
      />
      <span>
        <QuizConsentLabel
          config={config}
          privacyPolicyPath={SITE_PRIVACY_POLICY_PATH}
          linkClassName={styles.consentLink}
        />
      </span>
    </label>
  );
}
