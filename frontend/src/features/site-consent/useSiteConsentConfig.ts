'use client';

import { useEffect, useState } from 'react';

import { type UserCabinetSettings, getUserCabinetSettings } from '@/shared/api/user-cabinet';

let cachedConfig: Partial<UserCabinetSettings> | undefined;
let loadPromise: Promise<Partial<UserCabinetSettings>> | null = null;

function loadSiteConsentConfig(): Promise<Partial<UserCabinetSettings>> {
  if (cachedConfig !== undefined) {
    return Promise.resolve(cachedConfig);
  }
  if (!loadPromise) {
    loadPromise = getUserCabinetSettings()
      .then((data) => {
        cachedConfig = data;
        return data;
      })
      .catch(() => {
        cachedConfig = {};
        return {};
      });
  }
  return loadPromise;
}

export function useSiteConsentConfig(): Partial<UserCabinetSettings> | null {
  const [config, setConfig] = useState<Partial<UserCabinetSettings> | null>(cachedConfig ?? null);

  useEffect(() => {
    let cancelled = false;
    loadSiteConsentConfig().then((data) => {
      if (!cancelled) setConfig(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
