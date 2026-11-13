'use client';

import React, { useRef } from 'react';

import {
  useDropdown,
  useDynamicCategories,
  useDynamicServiceCategories,
  useNavigationItems,
} from '@/shared/lib/hooks';

import { NavigationItem } from '../NavigationItem';
import styles from './DesktopNavigation.module.css';

export interface DesktopNavigationProps {
  onNavigationClick?: (sectionName: string) => void;
  /** Растворять «пилюлю» навигации — для липкой шапки в состоянии прокрутки. */
  glassNav?: boolean;
}

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  onNavigationClick,
  glassNav,
}) => {
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
  const { serviceCategories } = useDynamicServiceCategories();

  return (
    <div
      className={styles.desktopNavigation}
      ref={dropdownRef}
      data-glass-nav={glassNav ? 'true' : undefined}
    >
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
                dynamicServiceCategories={serviceCategories}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
