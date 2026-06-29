import type { PublicCareersData } from '@/shared/lib/careers';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadPublicCareers(): Promise<PublicCareersData> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/careers`, { cache: 'no-store' });
    if (!res.ok) {
      return { page: null, vacancies: [] };
    }
    return res.json();
  } catch {
    return { page: null, vacancies: [] };
  }
}
