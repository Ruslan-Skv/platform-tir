import { headers } from 'next/headers';

import { fetchQuizConfig } from '@/shared/api/quiz';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadQuizConfigFromRequest() {
  const headersList = await headers();
  const host = headersList.get('x-quiz-host') || headersList.get('host') || undefined;
  try {
    return await fetchQuizConfig({
      host: host?.split(':')[0],
      apiBase: getServerApiBaseUrl(),
    });
  } catch {
    return null;
  }
}
