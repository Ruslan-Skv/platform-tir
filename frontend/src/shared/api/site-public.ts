const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface SitePublicConfig {
  rolesShowAdminLink: string[];
}

/** Публичная конфигурация сайта (без авторизации). */
export async function getSitePublicConfig(): Promise<SitePublicConfig> {
  const res = await fetch(`${API_URL}/site-public/config`);
  if (!res.ok) throw new Error('Не удалось загрузить конфигурацию');
  return res.json();
}
