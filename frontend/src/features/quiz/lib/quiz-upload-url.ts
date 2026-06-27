const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Абсолютный URL для файлов из /uploads/ (каталог, политика и т.д.). */
export function resolveQuizUploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/quiz/') || url.startsWith('/images/')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    const base = API_URL.replace(/\/api\/v1\/?$/, '');
    return `${base}${url}`;
  }
  return url;
}

export function isPrivacyPolicyPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.split('?')[0]?.toLowerCase() ?? '';
  return (
    normalized.endsWith('.pdf') ||
    normalized.includes('/uploads/quiz/policy/') ||
    normalized.includes('/uploads/auth/policy/')
  );
}

/**
 * URL для встраивания PDF политики в iframe на текущем домене.
 * Абсолютные ссылки на /uploads/… с основного сайта ломаются на доменах квизов
 * из‑за CSP frame-src 'self'.
 */
export function resolvePrivacyPolicyEmbedUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const { pathname } = new URL(trimmed);
      if (pathname.startsWith('/uploads/')) return pathname;
    } catch {
      /* ignore invalid URL */
    }
    return trimmed;
  }
  return trimmed;
}

export const QUIZ_PRIVACY_POLICY_PATH = '/quiz/privacy-policy';
export const REGISTRATION_PRIVACY_POLICY_PATH = '/auth/privacy-policy';
