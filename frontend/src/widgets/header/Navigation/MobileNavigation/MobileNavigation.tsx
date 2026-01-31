'use client';

import {
  ChartBarIcon,
  ChevronLeftIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import React from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { dropdownMenus, navigation } from '@/shared/constants/navigation';
import { useDynamicCategories } from '@/shared/lib/hooks';
import { Logo } from '@/shared/ui/Logo';
import { ActionButtons } from '@/widgets/header/ActionButtons/ActionButtons';

import styles from './MobileNavigation.module.css';

export interface MobileNavigationProps {
  onNavigationClick?: (sectionName: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

type MenuState = 'main' | 'submenu';

// Интерфейс для кнопок меню с изображениями
interface MenuButton {
  name: string;
  hasDropdown: boolean;
  imageLight?: string;
  imageDark?: string;
  href?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onNavigationClick,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [currentMenu, setCurrentMenu] = React.useState<MenuState>('main');
  const [activeMenuItem, setActiveMenuItem] = React.useState<string | null>(null);
  const { isDarkTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);
  const router = useRouter();
  const { isAuthenticated } = useUserAuth();

  // Избегаем hydration mismatch, используя тему только после монтирования
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Предзагрузка изображений при монтировании компонента
  React.useEffect(() => {
    const preloadMenuImages = () => {
      const imagePaths = [
        '/images/menu/light/01.png',
        '/images/menu/light/02.png',
        '/images/menu/light/03.png',
        '/images/menu/light/04.png',
        '/images/menu/light/05.png',
        '/images/menu/light/06.png',
        '/images/menu/light/07.png',
        '/images/menu/dark/01.png',
        '/images/menu/dark/02.png',
        '/images/menu/dark/03.png',
        '/images/menu/dark/04.png',
        '/images/menu/dark/05.png',
        '/images/menu/dark/06.png',
        '/images/menu/dark/07.png',
      ];

      imagePaths.forEach((path) => {
        const img = new Image();
        img.src = path;
      });
    };

    preloadMenuImages();
  }, []);

  // Функция для получения картинки в зависимости от темы
  const getImageForMenuItem = (itemName: string): string => {
    const imageMap: Record<string, { light: string; dark: string }> = {
      'КАТАЛОГ ТОВАРОВ': {
        light: '/images/menu/light/02.png',
        dark: '/images/menu/dark/02.png',
      },
      'КАТАЛОГ УСЛУГ': {
        light: '/images/menu/light/01.png',
        dark: '/images/menu/dark/01.png',
      },
      АКЦИИ: {
        light: '/images/menu/light/07.png',
        dark: '/images/menu/dark/07.png',
      },
      БЛОГ: {
        light: '/images/menu/light/03.png',
        dark: '/images/menu/dark/03.png',
      },
      ФОТО: {
        light: '/images/menu/light/04.png',
        dark: '/images/menu/dark/04.png',
      },
    };

    const itemImages = imageMap[itemName];
    // На сервере и до монтирования используем светлую тему для избежания mismatch
    const theme = isMounted ? (isDarkTheme ? 'dark' : 'light') : 'light';

    if (itemImages) {
      return theme === 'dark' ? itemImages.dark : itemImages.light;
    }

    return theme === 'dark' ? '/images/menu/dark/default.jpg' : '/images/menu/light/default.jpg';
  };

  // Преобразуем навигацию в формат для кнопок с изображениями
  const menuButtons: MenuButton[] = navigation.map((item) => ({
    name: item.name,
    hasDropdown: !!item.hasDropdown,
    imageLight: getImageForMenuItem(item.name),
    imageDark: getImageForMenuItem(item.name),
    href: item.href,
  }));

  const handleCloseMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
      setTimeout(() => {
        setCurrentMenu('main');
        setActiveMenuItem(null);
      }, 300);
    }
  };

  const handleMenuItemClick = (itemName: string, hasDropdown: boolean) => {
    if (hasDropdown) {
      setActiveMenuItem(itemName);
      setCurrentMenu('submenu');
      if (onNavigationClick) {
        onNavigationClick(itemName);
      }
    } else {
      // Закрываем меню при переходе по ссылке
      handleCloseMenu();
    }
  };

  const handleBackToMainMenu = () => {
    setCurrentMenu('main');
    setActiveMenuItem(null);
  };

  const handleSubMenuItemClick = (itemName: string) => {
    if (onNavigationClick) {
      onNavigationClick(itemName);
    }
    handleCloseMenu();
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
    handleCloseMenu();
  };

  // Загружаем динамические категории из API
  const { navigationCategories } = useDynamicCategories();

  // Получаем данные для активного подменю
  const getActiveSubmenu = () => {
    if (!activeMenuItem) return null;

    // Для "КАТАЛОГ ТОВАРОВ" используем динамические категории
    if (activeMenuItem === 'КАТАЛОГ ТОВАРОВ' && navigationCategories.length > 0) {
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

    return dropdownMenus[activeMenuItem];
  };

  const activeSubmenu = getActiveSubmenu();

  return (
    <>
      {/* Мобильное меню */}
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
        {/* Верхняя часть с телефоном и иконками из TopBar в одну строку */}
        <div className={styles.topSection}>
          {/* Телефон */}
          <div className={styles.phoneSection}>
            <span className={styles.phone}>8-(8152)-60-12-70</span>
          </div>

          {/* Иконки из TopBar */}
          <div className={styles.topBarIcons}>
            <button className={styles.topBarIcon} aria-label="Поиск" type="button">
              <MagnifyingGlassIcon className={styles.icon} />
            </button>
            <button className={styles.topBarIcon} aria-label="Сравнение" type="button">
              <ChartBarIcon className={styles.icon} />
            </button>
            <button
              className={styles.topBarIcon}
              aria-label="Личный кабинет"
              type="button"
              onClick={handleProfileClick}
            >
              <UserIcon className={styles.icon} />
            </button>
            <button className={styles.topBarIcon} aria-label="Избранное" type="button">
              <HeartIcon className={styles.icon} />
            </button>
            <button className={styles.topBarIcon} aria-label="Корзина" type="button">
              <ShoppingCartIcon className={styles.icon} />
            </button>
          </div>
        </div>

        {/* Заголовок меню с логотипом и кнопкой закрытия */}
        <div className={styles.menuHeader}>
          <div className={styles.logoSection}>
            <Logo />
          </div>

          <button
            onClick={handleCloseMenu}
            className={styles.closeButton}
            aria-label="Закрыть меню"
            type="button"
          >
            <XMarkIcon className={styles.closeIcon} />
          </button>
        </div>

        {/* Контент меню */}
        <div className={styles.menuContent}>
          {currentMenu === 'main' ? (
            /* Главное меню в виде сетки кнопок */
            <div className={styles.menuGrid}>
              {menuButtons.map((button) => (
                <button
                  key={button.name}
                  type="button"
                  onClick={() => handleMenuItemClick(button.name, button.hasDropdown)}
                  className={styles.menuGridButton}
                  style={{
                    backgroundImage: `url(${getImageForMenuItem(button.name)})`,
                  }}
                  suppressHydrationWarning
                >
                  <span className={styles.buttonText}>{button.name}</span>
                  {/* {button.hasDropdown && <span className={styles.buttonArrow}>›</span>} */}
                </button>
              ))}
            </div>
          ) : (
            /* Подменю */
            <div className={styles.subMenu}>
              <button onClick={handleBackToMainMenu} className={styles.backButton} type="button">
                <ChevronLeftIcon className={styles.backIcon} />
                Назад
              </button>
              {activeSubmenu &&
                activeSubmenu.items.map((subItem) => (
                  <div key={subItem.name} className={styles.subMenuSection}>
                    <a
                      href={subItem.href}
                      onClick={() => handleSubMenuItemClick(subItem.name)}
                      className={styles.subMenuItem}
                    >
                      {subItem.image ? (
                        <img src={subItem.image} alt="" className={styles.subMenuItemImage} />
                      ) : subItem.icon ? (
                        <span className={styles.subMenuItemIcon}>{subItem.icon}</span>
                      ) : null}
                      <span>{subItem.name}</span>
                    </a>
                    {/* Показываем подкатегории если есть */}
                    {subItem.hasSubmenu && subItem.submenu && subItem.submenu.length > 0 && (
                      <div className={styles.subSubMenu}>
                        {subItem.submenu.map(
                          (subSubItem: {
                            name: string;
                            href: string;
                            icon?: string | null;
                            image?: string | null;
                          }) => (
                            <a
                              key={subSubItem.name}
                              href={subSubItem.href}
                              onClick={() => handleSubMenuItemClick(subSubItem.name)}
                              className={styles.subSubMenuItem}
                            >
                              {subSubItem.image ? (
                                <img
                                  src={subSubItem.image}
                                  alt=""
                                  className={styles.subSubMenuItemImage}
                                />
                              ) : subSubItem.icon ? (
                                <span className={styles.subSubMenuItemIcon}>{subSubItem.icon}</span>
                              ) : null}
                              <span>{subSubItem.name}</span>
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Футер меню с кнопками действий */}
        <div className={styles.menuFooter}>
          <ActionButtons mobile />
        </div>
      </div>

      {/* Overlay для закрытия меню */}
      {mobileMenuOpen && <div className={styles.overlay} onClick={handleCloseMenu} />}
    </>
  );
};
