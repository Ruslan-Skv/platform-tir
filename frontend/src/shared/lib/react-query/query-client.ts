import { QueryClient } from '@tanstack/react-query';

import { isNetworkUnavailableError } from '@/shared/lib/browser-network';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        networkMode: 'online',
        retry: (failureCount, error) => {
          if (isNetworkUnavailableError(error)) return false;
          return failureCount < 3;
        },
      },
      mutations: {
        networkMode: 'online',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
