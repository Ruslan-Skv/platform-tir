'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getSitePublicConfig } from '@/shared/api/site-public';

export interface SitePublicConfigState {
  rolesShowAdminLink: string[];
  isLoading: boolean;
  error: Error | null;
}

const defaultValue: SitePublicConfigState = {
  rolesShowAdminLink: [],
  isLoading: true,
  error: null,
};

const SitePublicConfigContext = createContext<SitePublicConfigState>(defaultValue);

export function SitePublicConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SitePublicConfigState>(defaultValue);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    getSitePublicConfig()
      .then((data) => {
        if (!cancelled) {
          setState({
            rolesShowAdminLink: data.rolesShowAdminLink ?? [],
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            rolesShowAdminLink: [],
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SitePublicConfigContext.Provider value={state}>{children}</SitePublicConfigContext.Provider>
  );
}

export function useSitePublicConfig(): SitePublicConfigState {
  return useContext(SitePublicConfigContext);
}

export function useAdminLinkVisible(): (userRole: string | undefined) => boolean {
  const { rolesShowAdminLink } = useSitePublicConfig();
  return useCallback(
    (userRole: string | undefined) => {
      if (!userRole) return false;
      if (rolesShowAdminLink.length === 0) return false;
      return rolesShowAdminLink.includes(userRole);
    },
    [rolesShowAdminLink]
  );
}
