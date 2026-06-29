import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import type { SellerLegalInfo } from '@/shared/lib/legal/seller-legal';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadSellerLegalConfig(): Promise<SellerLegalInfo | null> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/seller-legal`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
