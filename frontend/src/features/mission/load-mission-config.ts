import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import type { MissionPageInfo } from '@/shared/lib/mission';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadPublicMission(): Promise<MissionPageInfo | null> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/mission`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}
