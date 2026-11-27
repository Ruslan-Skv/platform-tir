'use client';

import React from 'react';

import { useActiveSiteDecorations } from '@/shared/lib/contexts/SitePublicConfigContext';

import { Snowfall } from '../Snowfall/Snowfall';

/** Рендерит активные украшения публичного сайта (управляются из админки, «Настройки → Украшения сайта»). */
export function SiteDecorations() {
  const activeDecorations = useActiveSiteDecorations();

  return <>{activeDecorations.includes('new-year-snow') && <Snowfall />}</>;
}
