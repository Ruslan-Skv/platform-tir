import {
  BoltIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CubeTransparentIcon,
  DocumentTextIcon,
  HomeIcon,
  LightBulbIcon,
  MoonIcon,
  PaintBrushIcon,
  RectangleStackIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  ViewColumnsIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import React from 'react';

import { usePathname } from 'next/navigation';

import { dropdownMenus } from '@/shared/constants/navigation';
import type { NavigationCategory } from '@/shared/lib/hooks';
import type { NavigationItem as NavigationItemType } from '@/shared/types/navigation';
import { Button } from '@/shared/ui/Button';

import styles from './NavigationItem.module.css';

// Маппинг имен иконок на компоненты
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  RectangleStack: RectangleStackIcon,
  WrenchScrewdriver: WrenchScrewdriverIcon,
  Squares2X2: Squares2X2Icon,
  ViewColumns: ViewColumnsIcon,
  Cube: CubeIcon,
  Home: HomeIcon,
  TableCells: TableCellsIcon,
  Moon: MoonIcon,
  CubeTransparent: CubeTransparentIcon,
  LightBulb: LightBulbIcon,
  PaintBrush: PaintBrushIcon,
  Bolt: BoltIcon,
  Square3Stack3D: Square3Stack3DIcon,
  Tag: TagIcon,
  DocumentText: DocumentTextIcon,
  BuildingOffice: BuildingOfficeIcon,
};

export interface NavigationItemProps {
  item: NavigationItemType;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDropdownMouseEnter: () => void;
  onDropdownMouseLeave: () => void;
  onClick?: (sectionName: string) => void;
  dynamicCategories?: NavigationCategory[];
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  isActive,
  onMouseEnter,
  onMouseLeave,
  onDropdownMouseEnter,
  onDropdownMouseLeave,
  onClick,
  dynamicCategories,
}) => {
  const hasDropdown = item.hasDropdown;
  // Приоритет: данные из API (dropdownItems), затем для "Каталог" — динамические категории, иначе константы
  const apiDropdownItems =
    item.dropdownItems && item.dropdownItems.length > 0 ? item.dropdownItems : null;
  const menuData = hasDropdown && !apiDropdownItems ? dropdownMenus[item.name] : null;

  // Для "Каталог" используем динамические категории если нет данных из API
  const useDynamicMenu =
    !apiDropdownItems &&
    item.name === 'Каталог' &&
    dynamicCategories &&
    dynamicCategories.length > 0;
  const pathname = usePathname();
  const navItemRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [alignment, setAlignment] = React.useState<'left' | 'right' | 'center'>('left');

  // Текущая страница: подчёркивание снизу (по URL), не путать с isActive = открыто выпадающее меню
  const isCurrentPage =
    pathname === item.href || (item.href && item.href !== '/' && pathname.startsWith(item.href));

  // Определяем тип выравнивания для выпадающего меню
  React.useEffect(() => {
    if (isActive) {
      // Для "Блог" и "Фото" - всегда выравнивание по правому краю
      if (item.name === 'Блог' || item.name === 'Фото') {
        setAlignment('right');
      }
      // Для "Акции" - выравнивание по центру (с проверкой границ)
      else if (item.name === 'Акции') {
        if (navItemRef.current && dropdownRef.current) {
          const updatePosition = () => {
            if (!navItemRef.current || !dropdownRef.current) return;

            const navItemRect = navItemRef.current.getBoundingClientRect();
            const dropdownWidth = dropdownRef.current.offsetWidth;
            const viewportWidth = window.innerWidth;
            const navItemCenter = navItemRect.left + navItemRect.width / 2;
            const dropdownHalfWidth = dropdownWidth / 2;

            // Проверяем, не выйдет ли центрированное меню за границы
            const leftBound = navItemCenter - dropdownHalfWidth;
            const rightBound = navItemCenter + dropdownHalfWidth;
            const minMargin = 16; // 1rem = 16px

            if (leftBound >= minMargin && rightBound <= viewportWidth - minMargin) {
              setAlignment('center');
            } else {
              // Если центрирование выходит за границы, используем динамическое определение
              const spaceOnRight = viewportWidth - navItemRect.left;
              if (spaceOnRight < dropdownWidth) {
                setAlignment('right');
              } else {
                setAlignment('left');
              }
            }
          };

          const timeoutId = setTimeout(updatePosition, 0);
          window.addEventListener('resize', updatePosition);
          return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updatePosition);
          };
        } else {
          setAlignment('center');
        }
      }
      // Для остальных - динамическое определение или по левому краю
      else if (navItemRef.current && dropdownRef.current) {
        const updatePosition = () => {
          if (!navItemRef.current || !dropdownRef.current) return;

          const navItemRect = navItemRef.current.getBoundingClientRect();
          const dropdownWidth = dropdownRef.current.offsetWidth;
          const viewportWidth = window.innerWidth;
          const spaceOnRight = viewportWidth - navItemRect.left;

          // Если справа недостаточно места, выравниваем по правому краю
          if (spaceOnRight < dropdownWidth) {
            const rightAlignedLeft = navItemRect.right - dropdownWidth;
            const minMargin = 16; // 1rem = 16px
            if (rightAlignedLeft >= minMargin) {
              setAlignment('right');
            } else {
              setAlignment('right');
            }
          } else {
            setAlignment('left');
          }
        };

        // Небольшая задержка для корректного расчета размеров после рендера
        const timeoutId = setTimeout(updatePosition, 0);
        window.addEventListener('resize', updatePosition);
        return () => {
          clearTimeout(timeoutId);
          window.removeEventListener('resize', updatePosition);
        };
      } else {
        setAlignment('left');
      }
    } else {
      setAlignment('left');
    }
  }, [isActive, item.name]);

  const handleClick = () => {
    // Всегда переходим по ссылке, если она есть
    if (item.href) {
      window.location.href = item.href;
    }
    // Дополнительно вызываем колбэк
    if (onClick) {
      onClick(item.name);
    }
  };

  const handleDropdownItemClick = (itemName: string) => {
    // Вызываем колбэк для дополнительной логики (например, закрытие меню)
    if (onClick) {
      onClick(itemName);
    }
    // Переход выполняется стандартным поведением ссылки <a href="...">
  };

  // Функция для получения иконки по имени
  const getIcon = (iconName?: string) => {
    if (!iconName) {
      return null;
    }

    // Если это путь к изображению
    if (iconName.startsWith('/') || iconName.startsWith('http')) {
      return (
        <img
          src={iconName}
          alt=""
          className={styles.dropdownItemIcon}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    // Если это имя иконки из маппинга
    const IconComponent = iconMap[iconName];
    if (IconComponent) {
      return <IconComponent className={styles.dropdownItemIcon} />;
    }

    return null;
  };

  return (
    <div
      ref={navItemRef}
      className={styles.navItem}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.navButtonWrap}>
        {isCurrentPage && <span className={styles.navButtonCurrentLine} aria-hidden />}
        <Button variant="link" size="sm" onClick={handleClick} className={styles.navButton}>
          <span className={styles.navText}>{item.name}</span>
        </Button>
      </div>

      {hasDropdown && isActive && (apiDropdownItems || useDynamicMenu || menuData) && (
        <div
          ref={dropdownRef}
          className={`${styles.dropdown} ${
            alignment === 'right'
              ? styles.dropdownRight
              : alignment === 'center'
                ? styles.dropdownCenter
                : ''
          }`}
          onMouseEnter={onDropdownMouseEnter}
          onMouseLeave={onDropdownMouseLeave}
        >
          <div className={styles.dropdownContent}>
            <div className={styles.dropdownGrid}>
              {/* Данные из API (полное управление в админке) */}
              {apiDropdownItems &&
                apiDropdownItems.map((dropdownItem) => (
                  <div key={dropdownItem.id} className={styles.dropdownSection}>
                    <a
                      href={dropdownItem.href}
                      onClick={() => handleDropdownItemClick(dropdownItem.name)}
                      className={styles.dropdownItem}
                      title={dropdownItem.name}
                    >
                      {dropdownItem.icon && (
                        <span className={styles.dropdownItemIconWrapper}>
                          {getIcon(dropdownItem.icon)}
                        </span>
                      )}
                      <span className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}>
                        {dropdownItem.name}
                      </span>
                    </a>
                    {dropdownItem.submenu && dropdownItem.submenu.length > 0 && (
                      <div className={styles.submenu}>
                        {dropdownItem.submenu.map((subItem) => (
                          <a
                            key={subItem.id}
                            href={subItem.href}
                            onClick={() => handleDropdownItemClick(subItem.name)}
                            className={styles.submenuItem}
                            title={subItem.name}
                          >
                            {subItem.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* Динамические категории для "Каталог" (если нет данных из API) */}
              {useDynamicMenu &&
                dynamicCategories!.map((category) => (
                  <div key={category.slug} className={styles.dropdownSection}>
                    <a
                      href={category.href}
                      onClick={() => handleDropdownItemClick(category.name)}
                      className={styles.dropdownItem}
                      title={category.name}
                    >
                      <span className={styles.dropdownItemIconWrapper}>
                        {category.image ? (
                          <img src={category.image} alt="" className={styles.categoryImage} />
                        ) : category.icon ? (
                          <span className={styles.categoryIcon}>{category.icon}</span>
                        ) : (
                          <RectangleStackIcon className={styles.dropdownItemIcon} />
                        )}
                      </span>
                      <span className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}>
                        {category.name}
                      </span>
                    </a>
                    {category.hasSubmenu && category.submenu.length > 0 && (
                      <div className={styles.submenu}>
                        {category.submenu.map((subItem) => (
                          <a
                            key={subItem.slug}
                            href={subItem.href}
                            onClick={() => handleDropdownItemClick(subItem.name)}
                            className={styles.submenuItem}
                            title={subItem.name}
                          >
                            {subItem.image ? (
                              <img src={subItem.image} alt="" className={styles.submenuItemImage} />
                            ) : subItem.icon ? (
                              <span className={styles.submenuItemIcon}>{subItem.icon}</span>
                            ) : null}
                            <span>{subItem.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* Статические меню для других разделов */}
              {!useDynamicMenu &&
                menuData &&
                menuData.items.map((dropdownItem) => (
                  <div key={dropdownItem.name} className={styles.dropdownSection}>
                    {/* Название раздела (жирным) */}
                    <a
                      href={dropdownItem.href}
                      onClick={() => handleDropdownItemClick(dropdownItem.name)}
                      className={styles.dropdownItem}
                      title={dropdownItem.name}
                    >
                      {dropdownItem.icon && (
                        <span className={styles.dropdownItemIconWrapper}>
                          {getIcon(dropdownItem.icon)}
                        </span>
                      )}
                      <span className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}>
                        {dropdownItem.name}
                      </span>
                    </a>
                    {/* Подразделы (серии) */}
                    {dropdownItem.hasSubmenu && dropdownItem.submenu && (
                      <div className={styles.submenu}>
                        {dropdownItem.submenu.map((subItem) => (
                          <a
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => handleDropdownItemClick(subItem.name)}
                            className={styles.submenuItem}
                            title={subItem.name}
                          >
                            {subItem.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
