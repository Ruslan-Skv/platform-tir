'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getSitePublicConfig } from '@/shared/api/site-public';

export interface SitePublicConfigState {
  rolesShowAdminLinkDesktop: string[];
  rolesShowAdminLinkMobile: string[];
  isLoading: boolean;
  error: Error | null;
}

const defaultValue: SitePublicConfigState = {
  rolesShowAdminLinkDesktop: [],
  rolesShowAdminLinkMobile: [],
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
          const desktop = data.rolesShowAdminLinkDesktop ?? data.rolesShowAdminLink ?? [];
          const mobile = data.rolesShowAdminLinkMobile ?? data.rolesShowAdminLink ?? desktop;
          setState({
            rolesShowAdminLinkDesktop: desktop,
            rolesShowAdminLinkMobile: mobile,
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            rolesShowAdminLinkDesktop: [],
            rolesShowAdminLinkMobile: [],
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

export type AdminLinkViewport = 'desktop' | 'mobile';

export function useAdminLinkVisible(
  viewport: AdminLinkViewport = 'desktop'
): (userRole: string | undefined) => boolean {
  const { rolesShowAdminLinkDesktop, rolesShowAdminLinkMobile } = useSitePublicConfig();
  const roles = viewport === 'desktop' ? rolesShowAdminLinkDesktop : rolesShowAdminLinkMobile;
  return useCallback(
    (userRole: string | undefined) => {
      if (!userRole) return false;
      if (roles.length === 0) return false;
      return roles.includes(userRole);
    },
    [roles]
  );
}
