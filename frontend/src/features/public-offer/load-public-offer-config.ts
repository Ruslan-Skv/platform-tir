import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import type { PublicOfferInfo, PublicOfferListItem } from '@/shared/lib/legal/public-offer';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadPublicOffersList(): Promise<PublicOfferListItem[]> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/public-offers`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function loadPublicOfferBySlug(slug: string): Promise<PublicOfferInfo | null> {
  try {
    const res = await serverFetch(
      `${getServerApiBaseUrl()}/public-offers/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
