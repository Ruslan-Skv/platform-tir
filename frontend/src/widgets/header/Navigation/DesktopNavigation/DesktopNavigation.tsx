'use client';

import React, { useRef } from 'react';

import { useDropdown, useDynamicCategories, useNavigationItems } from '@/shared/lib/hooks';

import { NavigationItem } from '../NavigationItem';
import styles from './DesktopNavigation.module.css';

export interface DesktopNavigationProps {
  onNavigationClick?: (sectionName: string) => void;
}

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({ onNavigationClick }) => {
  const {
    activeDropdown,
    openDropdown,
    closeDropdown,
    handleDropdownMouseEnter,
    handleDropdownMouseLeave,
  } = useDropdown();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigationItems = useNavigationItems();
  const { navigationCategories } = useDynamicCategories();

  return (
    <div className={styles.desktopNavigation} ref={dropdownRef}>
      <div className={styles.container}>
        <div className={styles.navContainer}>
          {navigationItems.map((item, index) => (
            <React.Fragment key={item.name}>
              {index > 0 && <div className={styles.separator} aria-hidden />}
              <NavigationItem
                item={item}
                isActive={activeDropdown === item.name}
                onMouseEnter={() => item.hasDropdown && openDropdown(item.name)}
                onMouseLeave={closeDropdown}
                onDropdownMouseEnter={handleDropdownMouseEnter}
                onDropdownMouseLeave={handleDropdownMouseLeave}
                onClick={onNavigationClick}
                dynamicCategories={navigationCategories}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
