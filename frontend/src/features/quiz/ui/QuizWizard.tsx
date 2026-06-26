'use client';

import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { buildAddressMapSearchUrl } from '@/features/quiz/lib/address-map-url';
import { getQuizPrefillFromParam, getVisibleSteps } from '@/features/quiz/lib/quiz-flow';
import {
  mergeQuizTheme,
  quizThemeToCssVars,
  resolveQuizImageUrl,
} from '@/features/quiz/lib/quiz-theme';
import type { QuizPublicConfig } from '@/shared/api/quiz';
import { submitQuiz } from '@/shared/api/quiz';
import { isValidPhone, normalizePhoneForStorage } from '@/shared/lib/phone';
import { Logo } from '@/shared/ui/Logo/Logo';

import { QuizProgress } from './QuizProgress';
import styles from './QuizWizard.module.css';
import { SuccessScreen } from './SuccessScreen';
import { ChoiceStep } from './steps/ChoiceStep';
import { ContactStep } from './steps/ContactStep';
import { TextStep } from './steps/TextStep';

type QuizWizardProps = {
  config: QuizPublicConfig;
};

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://territory-interior.ru';

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.91 15.91 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.56 1 1 0 0 1-.25 1.01l-2.2 2.22z" />
    </svg>
  );
}

function HeaderBadge({
  icon,
  children,
  href,
  external,
  ariaLabel,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  ariaLabel?: string;
}) {
  const badge = (
    <span className={styles.headerBadge}>
      <span className={styles.headerBadgeIcon}>{icon}</span>
      {children}
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        className={styles.headerBadgeLink}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {badge}
      </a>
    );
  }

  return badge;
}

function QuizHeaderLogo({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={resolveQuizImageUrl(logoUrl)} alt="" className={styles.logo} />;
  }

  return (
    <Logo
      href={MAIN_SITE_URL}
      className={styles.siteLogo}
      linkClassName={styles.siteLogoLink}
      ariaLabel="Территория интерьерных решений"
    />
  );
}

export function QuizWizard({ config }: QuizWizardProps) {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');

  const { skipKeys, initialAnswers } = useMemo(
    () => getQuizPrefillFromParam(config.steps, typeParam),
    [config.steps, typeParam]
  );

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const visibleSteps = useMemo(
    () => getVisibleSteps(config.steps, answers, skipKeys),
    [config.steps, answers, skipKeys]
  );

  const currentStep = visibleSteps[stepIndex];
  const theme = useMemo(
    () => mergeQuizTheme(config.theme, config.primaryColor),
    [config.theme, config.primaryColor]
  );
  const primaryColor = theme.accentColor;
  const themeStyle = quizThemeToCssVars(theme);

  const setAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const canProceed = useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.type === 'contact') {
      return name.trim().length > 0 && isValidPhone(phone) && consent;
    }
    if (!currentStep.required) return true;
    const value = answers[currentStep.key];
    return !!value?.trim();
  }, [currentStep, answers, name, phone, consent]);

  const handleNext = async () => {
    if (!currentStep || !canProceed) return;

    if (currentStep.type === 'contact') {
      setSubmitting(true);
      setError(null);
      try {
        const finalAnswers = { ...answers };
        const params = new URLSearchParams(window.location.search);
        await submitQuiz(config.slug, {
          name: name.trim(),
          phone: normalizePhoneForStorage(phone),
          answers: finalAnswers,
          utmSource: params.get('utm_source') ?? undefined,
          utmMedium: params.get('utm_medium') ?? undefined,
          utmCampaign: params.get('utm_campaign') ?? undefined,
          referrer: document.referrer || undefined,
          landingUrl: window.location.href,
        });
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка отправки');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepIndex < visibleSteps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      setError(null);
    }
  };

  const handleChoice = (value: string) => {
    if (!currentStep) return;
    const nextAnswers = { ...answers, [currentStep.key]: value };
    setAnswers(nextAnswers);
    const nextVisible = getVisibleSteps(config.steps, nextAnswers, skipKeys);
    const currentIdx = nextVisible.findIndex((s) => s.key === currentStep.key);
    if (currentIdx >= 0 && currentIdx < nextVisible.length - 1) {
      setStepIndex(currentIdx + 1);
    }
  };

  const bgImageStyle = theme.backgroundImageUrl
    ? { backgroundImage: `url(${resolveQuizImageUrl(theme.backgroundImageUrl)})` }
    : undefined;

  const shell = (content: React.ReactNode) => (
    <div className={styles.wizard} style={themeStyle}>
      {bgImageStyle ? <div className={styles.bgImage} style={bgImageStyle} aria-hidden /> : null}
      <div className={styles.wizardInner}>{content}</div>
    </div>
  );

  if (done) {
    return shell(<SuccessScreen config={config} primaryColor={primaryColor} />);
  }

  return shell(
    <>
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <QuizHeaderLogo logoUrl={config.logoUrl} />
        </div>
        {config.city ? (
          <div className={styles.headerCity}>
            <HeaderBadge
              icon={<LocationIcon />}
              href={buildAddressMapSearchUrl(config.city)}
              external
              ariaLabel={`Открыть адрес «${config.city}» на карте`}
            >
              {config.city}
            </HeaderBadge>
          </div>
        ) : null}
        <div className={styles.headerEnd}>
          {config.displayPhone ? (
            <HeaderBadge
              icon={<PhoneIcon />}
              href={`tel:${config.displayPhone.replace(/\D/g, '')}`}
            >
              {config.displayPhone}
            </HeaderBadge>
          ) : null}
        </div>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.headline}>{config.headline}</h1>
        {config.subheadline ? <p className={styles.subheadline}>{config.subheadline}</p> : null}
        {config.promoText ? <p className={styles.promo}>{config.promoText}</p> : null}
      </section>

      {currentStep ? (
        <section className={styles.card}>
          <QuizProgress
            current={stepIndex + 1}
            total={visibleSteps.length}
            primaryColor={primaryColor}
          />
          <h2 className={styles.stepTitle}>{currentStep.title}</h2>
          {currentStep.subtitle && currentStep.type !== 'contact' ? (
            <p className={styles.stepSubtitle}>{currentStep.subtitle}</p>
          ) : null}

          {currentStep.type === 'choice' ? (
            <ChoiceStep
              step={currentStep}
              value={answers[currentStep.key] ?? ''}
              onChange={handleChoice}
            />
          ) : null}

          {currentStep.type === 'text' ? (
            <TextStep
              step={currentStep}
              value={answers[currentStep.key] ?? ''}
              onChange={(v) => setAnswer(currentStep.key, v)}
            />
          ) : null}

          {currentStep.type === 'contact' ? (
            <ContactStep
              step={currentStep}
              config={config}
              name={name}
              phone={phone}
              consent={consent}
              onNameChange={setName}
              onPhoneChange={setPhone}
              onConsentChange={setConsent}
            />
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            {stepIndex > 0 ? (
              <button type="button" className={styles.backButton} onClick={handleBack}>
                Назад
              </button>
            ) : (
              <span />
            )}
            {currentStep.type !== 'choice' ? (
              <button
                type="button"
                className={styles.nextButton}
                disabled={!canProceed || submitting}
                onClick={handleNext}
              >
                {currentStep.type === 'contact'
                  ? submitting
                    ? 'Отправка…'
                    : 'Отправить'
                  : 'Далее'}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
