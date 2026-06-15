export const DEFAULT_QUIZ_CONSENT = {
  consentText: 'Я согласен(-на) на обработку персональных данных',
  consentLinkText: 'персональных данных',
  privacyPolicyTitle: 'Политика конфиденциальности персональных данных',
} as const;

const LEGACY_LINK_PLACEHOLDER = '{link}';

export type QuizConsentConfig = {
  consentText?: string | null;
  consentLinkText?: string | null;
  privacyPolicyUrl?: string | null;
  privacyPolicyTitle?: string | null;
  privacyPolicyContent?: string | null;
};

export function resolveQuizConsent(config: Partial<QuizConsentConfig>): {
  consentText: string;
  consentLinkText: string;
  privacyPolicyUrl: string | null;
  privacyPolicyTitle: string;
  privacyPolicyContent: string | null;
} {
  const consentLinkText = config.consentLinkText?.trim() || DEFAULT_QUIZ_CONSENT.consentLinkText;
  let consentText = config.consentText?.trim() || DEFAULT_QUIZ_CONSENT.consentText;
  if (consentText.includes(LEGACY_LINK_PLACEHOLDER)) {
    consentText = consentText.replaceAll(LEGACY_LINK_PLACEHOLDER, consentLinkText);
  }

  return {
    consentText,
    consentLinkText,
    privacyPolicyUrl: config.privacyPolicyUrl?.trim() || null,
    privacyPolicyTitle:
      config.privacyPolicyTitle?.trim() || DEFAULT_QUIZ_CONSENT.privacyPolicyTitle,
    privacyPolicyContent: config.privacyPolicyContent?.trim() || null,
  };
}

export function splitConsentByLinkText(
  text: string,
  linkText: string
): { before: string; after: string } | null {
  const index = text.indexOf(linkText);
  if (index === -1) return null;
  return {
    before: text.slice(0, index),
    after: text.slice(index + linkText.length),
  };
}

/** @deprecated Используйте splitConsentByLinkText */
export function splitConsentText(
  text: string,
  linkText?: string
): { before: string; after: string } | null {
  const link = linkText?.trim() || DEFAULT_QUIZ_CONSENT.consentLinkText;
  const normalized = text.includes(LEGACY_LINK_PLACEHOLDER)
    ? text.replaceAll(LEGACY_LINK_PLACEHOLDER, link)
    : text;
  return splitConsentByLinkText(normalized, link);
}

export function hasPrivacyPolicyView(consent: ReturnType<typeof resolveQuizConsent>): boolean {
  return Boolean(consent.privacyPolicyContent || consent.privacyPolicyUrl);
}

/** Текст политики для модалки: переносы из админки не сохраняются, текст течёт по ширине окна. */
export function formatPrivacyPolicyForDisplay(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}
