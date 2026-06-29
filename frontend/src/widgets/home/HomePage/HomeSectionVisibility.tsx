'use client';

import React from 'react';

import {
  type HomeSectionDesktopKey,
  type HomeSectionMobileKey,
  type HomeSectionsVisibility,
  getHomeSectionVisibilityMode,
  isHomeSectionRendered,
} from '@/shared/lib/home-sections-visibility';

import styles from './HomeSectionVisibility.module.css';

interface HomeSectionVisibilityProps {
  visibility: HomeSectionsVisibility;
  desktopKey: HomeSectionDesktopKey;
  mobileKey: HomeSectionMobileKey;
  children: React.ReactNode;
}

export function HomeSectionVisibility({
  visibility,
  desktopKey,
  mobileKey,
  children,
}: HomeSectionVisibilityProps) {
  if (!isHomeSectionRendered(visibility, desktopKey, mobileKey)) {
    return null;
  }

  const mode = getHomeSectionVisibilityMode(visibility, desktopKey, mobileKey);
  const className =
    mode === 'hiddenDesktop'
      ? styles.hiddenDesktop
      : mode === 'hiddenMobile'
        ? styles.hiddenMobile
        : undefined;

  if (!className) {
    return <>{children}</>;
  }

  return <div className={className}>{children}</div>;
}
