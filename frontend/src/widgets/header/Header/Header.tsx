'use client';

import React from 'react';

import { Logo } from '@/shared/ui/Logo';

import { ActionButtons } from '../ActionButtons';
import { Navigation } from '../Navigation';
import { TopBar } from '../TopBar';
import styles from './Header.module.css';

export interface HeaderProps {
  onNavigationClick?: (sectionName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigationClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className={styles.header}>
      <TopBar />

      <div className={styles.mainHeader}>
        <div className={styles.container}>
          <div className={styles.logoSection}>
            <Logo />
            <ActionButtons onMobileMenuOpen={() => setMobileMenuOpen(!mobileMenuOpen)} />
          </div>
        </div>
      </div>

      <Navigation
        onNavigationClick={onNavigationClick}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
    </header>
  );
};
