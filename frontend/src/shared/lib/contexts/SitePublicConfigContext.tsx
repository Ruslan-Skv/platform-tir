'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSitePublicConfig } from '@/shared/api/site-public';
import type { SitePublicDecoration } from '@/shared/api/site-public';

export type PublicHeaderVariant = 'classic' | 'sticky';

export interface SitePublicConfigState {
  rolesShowAdminLinkDesktop: string[];
  rolesShowAdminLinkMobile: string[];
  headerVariant: PublicHeaderVariant;
  /** Активные украшения публичного сайта (снег и т.п.). */
  decorations: SitePublicDecoration[];
  isLoading: boolean;
  error: Error | null;
}

const defaultValue: SitePublicConfigState = {
  rolesShowAdminLinkDesktop: [],
  rolesShowAdminLinkMobile: [],
  headerVariant: 'classic',
  decorations: [],
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
            headerVariant: data.headerVariant === 'sticky' ? 'sticky' : 'classic',
            decorations: data.decorations ?? [],
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
            headerVariant: 'classic',
            decorations: [],
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

/** Попадает ли текущий момент в период показа украшения (границы необязательны). */
export function isSiteDecorationWithinPeriod(
  decoration: SitePublicDecoration,
  now: number = Date.now()
): boolean {
  if (decoration.startsAt && new Date(decoration.startsAt).getTime() > now) return false;
  if (decoration.endsAt && new Date(decoration.endsAt).getTime() < now) return false;
  return true;
}

/** Коды украшений, которые сейчас нужно показывать (включены и в пределах периода). */
export function useActiveSiteDecorations(): string[] {
  const { decorations } = useSitePublicConfig();
  return useMemo(() => {
    const now = Date.now();
    return decorations
      .filter((decoration) => isSiteDecorationWithinPeriod(decoration, now))
      .map((decoration) => decoration.code);
  }, [decorations]);
}

/** Активное украшение по коду (с вариантом) либо null — если выключено или вне периода. */
export function useActiveSiteDecoration(code: string): SitePublicDecoration | null {
  const { decorations } = useSitePublicConfig();
  return useMemo(() => {
    const now = Date.now();
    return (
      decorations.find(
        (decoration) => decoration.code === code && isSiteDecorationWithinPeriod(decoration, now)
      ) ?? null
    );
  }, [decorations, code]);
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
