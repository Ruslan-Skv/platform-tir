'use client';

import type { QuizPublicConfig, QuizStepConfig } from '@/shared/api/quiz';

import styles from '../QuizWizard.module.css';

type ContactStepProps = {
  step: QuizStepConfig;
  config: QuizPublicConfig;
  name: string;
  phone: string;
  consent: boolean;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onConsentChange: (v: boolean) => void;
};

export function ContactStep({
  step,
  config,
  name,
  phone,
  consent,
  onNameChange,
  onPhoneChange,
  onConsentChange,
}: ContactStepProps) {
  return (
    <div className={styles.contactFields}>
      <label className={styles.fieldLabel}>
        Телефон *
        <input
          type="tel"
          className={styles.textInput}
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+7 (___) ___-__-__"
          autoFocus
        />
      </label>
      <label className={styles.fieldLabel}>
        Имя *
        <input
          type="text"
          className={styles.textInput}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Как к вам обращаться?"
        />
      </label>
      <label className={styles.consentLabel}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <span>
          Я согласен(-на) на обработку персональных данных
          {config.privacyPolicyUrl ? (
            <>
              {' '}
              (
              <a href={config.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
                политика
              </a>
              )
            </>
          ) : null}
        </span>
      </label>
      {step.subtitle ? <p className={styles.stepHint}>{step.subtitle}</p> : null}
    </div>
  );
}
