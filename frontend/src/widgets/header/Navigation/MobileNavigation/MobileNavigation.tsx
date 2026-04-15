'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ActionButton } from '@/features/forms';
import { useFormContext } from '@/features/forms';
import { dropdownMenus } from '@/shared/constants/navigation';
import {
  useDynamicCategories,
  useDynamicServiceCategories,
  useNavigationItems,
} from '@/shared/lib/hooks';
import { renderNavigationIcon } from '@/shared/lib/navigationIcon';
import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './MobileNavigation.module.css';

export interface MobileNavigationProps {
  onNavigationClick?: (sectionName: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

type MenuState = 'main' | 'submenu';

interface MenuButton {
  name: string;
  hasDropdown: boolean;
  href?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onNavigationClick,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [currentMenu, setCurrentMenu] = React.useState<MenuState>('main');
  const [activeMenuItem, setActiveMenuItem] = React.useState<string | null>(null);
  const router = useRouter();
  const navigationItems = useNavigationItems();
  const { navigationCategories } = useDynamicCategories();
  const { serviceCategories } = useDynamicServiceCategories();
  const { measurementModal, callbackModal } = useFormContext();

  const menuButtons: MenuButton[] = navigationItems.map((item) => ({
    name: item.name,
    hasDropdown: !!item.hasDropdown,
    href: item.href,
  }));

  const handleCloseMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
      setTimeout(() => {
        setCurrentMenu('main');
        setActiveMenuItem(null);
      }, 200);
    }
  };

  const handleMenuItemClick = (itemName: string, hasDropdown: boolean, href?: string) => {
    if (hasDropdown) {
      setActiveMenuItem(itemName);
      setCurrentMenu('submenu');
      if (onNavigationClick) onNavigationClick(itemName);
    } else if (href) {
      router.push(href);
      handleCloseMenu();
    }
  };

  const handleBackToMainMenu = () => {
    setCurrentMenu('main');
    setActiveMenuItem(null);
  };

  const handleSubMenuItemClick = (itemName: string) => {
    if (onNavigationClick) onNavigationClick(itemName);
    handleCloseMenu();
  };

  const getActiveSubmenu = () => {
    if (!activeMenuItem) return null;

    if (activeMenuItem === 'Каталог' && navigationCategories.length > 0) {
      return {
        category: 'products',
        items: navigationCategories.map((cat) => ({
          name: cat.name,
          href: cat.href,
          productType: cat.slug,
          icon: cat.icon,
          image: cat.image,
          hasSubmenu: cat.hasSubmenu,
          submenu: cat.submenu.map((sub) => ({
            name: sub.name,
            href: sub.href,
            productType: sub.slug,
            icon: sub.icon,
            image: sub.image,
          })),
        })),
      };
    }

    // Ремонт квартир (каталог услуг) — по имени или href для обратной совместимости
    const isServicesMenu =
      activeMenuItem === 'Ремонт квартир' ||
      menuButtons.find((b) => b.name === activeMenuItem)?.href === '/catalog/services';
    if (isServicesMenu) {
      return {
        category: 'services',
        items: serviceCategories.map((cat) => ({
          name: cat.name,
          href: cat.href,
          productType: cat.slug,
          icon: cat.icon,
          image: cat.image,
        })),
      };
    }

    return dropdownMenus[activeMenuItem];
  };

  const activeSubmenu = getActiveSubmenu();

  return (
    <>
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.menuContent}>
          {currentMenu === 'main' ? (
            <div className={styles.menuItemsList}>
              {menuButtons.map((button) =>
                button.hasDropdown ? (
                  <button
                    key={button.name}
                    type="button"
                    onClick={() =>
                      handleMenuItemClick(button.name, button.hasDropdown, button.href)
                    }
                    className={styles.menuItemField}
                  >
                    <span>{button.name}</span>
                    <span className={styles.menuItemFieldArrow} aria-hidden>
                      ›
                    </span>
                  </button>
                ) : (
                  <Link
                    key={button.name}
                    href={getSafeHref(button.href, '#')}
                    className={styles.menuItemField}
                    onClick={handleCloseMenu}
                  >
                    <span>{button.name}</span>
                  </Link>
                )
              )}
            </div>
          ) : (
            <div className={styles.subMenu}>
              <button onClick={handleBackToMainMenu} className={styles.backButton} type="button">
                <ChevronLeftIcon className={styles.backIcon} />
                Назад
              </button>
              {activeSubmenu &&
                activeSubmenu.items.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={getSafeHref(subItem.href)}
                    onClick={() => handleSubMenuItemClick(subItem.name)}
                    className={styles.subMenuItem}
                  >
                    {subItem.image ? (
                      <img src={subItem.image} alt="" className={styles.subMenuItemImage} />
                    ) : (
                      renderNavigationIcon(subItem.icon, styles.subMenuItemIcon)
                    )}
                    <span>{subItem.name}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>

        <div className={styles.menuFooter}>
          <div className={styles.menuFooterButtons}>
            <ActionButton variant="measurement" onClick={measurementModal.open} />
            <ActionButton variant="callback" onClick={callbackModal.open} />
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className={styles.overlay}
          onClick={handleCloseMenu}
          onKeyDown={(e) => e.key === 'Escape' && handleCloseMenu()}
          role="button"
          tabIndex={-1}
          aria-label="Закрыть меню"
        />
      )}
    </>
  );
};
