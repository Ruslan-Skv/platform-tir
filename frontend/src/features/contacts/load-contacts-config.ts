import type { PublicContactsData } from '@/shared/lib/contacts';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadPublicContacts(): Promise<PublicContactsData> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/contacts`, { cache: 'no-store' });
    if (!res.ok) {
      return { page: null, salons: [] };
    }
    return res.json();
  } catch {
    return { page: null, salons: [] };
  }
}
