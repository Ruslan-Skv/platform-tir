'use client';

import React from 'react';

import { DesktopNavigation } from './DesktopNavigation';
import { MobileNavigation } from './MobileNavigation';
import styles from './Navigation.module.css';

export interface NavigationProps {
  onNavigationClick?: (sectionName: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  /** Растворять «пилюлю» навигации — для липкой шапки в состоянии прокрутки. */
  glassNav?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  onNavigationClick,
  mobileMenuOpen,
  setMobileMenuOpen,
  glassNav,
}) => {
  return (
    <div className={styles.navigation}>
      <DesktopNavigation onNavigationClick={onNavigationClick} glassNav={glassNav} />
      <MobileNavigation
        onNavigationClick={onNavigationClick}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
    </div>
  );
};
