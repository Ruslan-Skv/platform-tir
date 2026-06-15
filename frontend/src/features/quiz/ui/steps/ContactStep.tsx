'use client';

import { useState } from 'react';

import type { QuizPublicConfig, QuizStepConfig } from '@/shared/api/quiz';
import {
  PHONE_PLACEHOLDER,
  digitsOnlyPhone,
  formatPhoneInput,
  getPhoneValidationMessage,
  isValidPhone,
} from '@/shared/lib/phone';

import { QuizConsentLabel } from '../QuizConsentLabel';
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
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValidationMessage = getPhoneValidationMessage(phone);
  const phoneError =
    phoneValidationMessage &&
    (phoneTouched || (digitsOnlyPhone(phone).length > 0 && !isValidPhone(phone)))
      ? phoneValidationMessage
      : null;

  return (
    <div className={styles.contactFields}>
      <label className={styles.fieldLabel}>
        Телефон *
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className={`${styles.textInput} ${phoneError ? styles.textInputInvalid : ''}`}
          value={phone}
          onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
          onBlur={() => setPhoneTouched(true)}
          placeholder={PHONE_PLACEHOLDER}
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={phoneError ? 'quiz-phone-error' : undefined}
          autoFocus
        />
        {phoneError ? (
          <span id="quiz-phone-error" className={styles.fieldError} role="alert">
            {phoneError}
          </span>
        ) : null}
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
          <QuizConsentLabel config={config} />
        </span>
      </label>
      {step.subtitle ? <p className={styles.stepHint}>{step.subtitle}</p> : null}
    </div>
  );
}
