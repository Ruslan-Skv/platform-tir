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

export const QUIZ_PRIVACY_POLICY_PATH = '/quiz/privacy-policy';
export const REGISTRATION_PRIVACY_POLICY_PATH = '/auth/privacy-policy';
