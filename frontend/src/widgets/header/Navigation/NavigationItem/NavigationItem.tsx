import { RectangleStackIcon } from '@heroicons/react/24/outline';

import React from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { dropdownMenus } from '@/shared/constants/navigation';
import type { NavigationCategory } from '@/shared/lib/hooks';
import { renderNavigationIcon } from '@/shared/lib/navigationIcon';
import { getSafeHref, isInternalAppHref } from '@/shared/lib/sanitize';
import type { NavigationItem as NavigationItemType } from '@/shared/types/navigation';
import { Button } from '@/shared/ui/Button';

import styles from './NavigationItem.module.css';

function DropdownLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const safe = getSafeHref(href);
  if (isInternalAppHref(safe)) {
    return (
      <Link href={safe} className={className} onClick={onClick} prefetch={false}>
        {children}
      </Link>
    );
  }
  return (
    <a href={safe} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export interface NavigationItemProps {
  item: NavigationItemType;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDropdownMouseEnter: () => void;
  onDropdownMouseLeave: () => void;
  onClick?: (sectionName: string) => void;
  dynamicCategories?: NavigationCategory[];
  dynamicServiceCategories?: {
    id: string;
    name: string;
    slug: string;
    href: string;
    icon?: string | null;
    image?: string | null;
  }[];
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
  dynamicServiceCategories,
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

  // Для "Ремонт квартир" (/catalog/services) всегда используем категории из админки каталога услуг (игнорируем dropdownItems из меню навигации)
  const useDynamicServiceMenu =
    (item.name === 'Ремонт квартир' || item.href === '/catalog/services') &&
    dynamicServiceCategories &&
    dynamicServiceCategories.length > 0;
  const pathname = usePathname();
  const router = useRouter();
  const navItemRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [alignment, setAlignment] = React.useState<'left' | 'right' | 'center'>('left');

  // Текущая страница: подчёркивание снизу (по URL), не путать с isActive = открыто выпадающее меню
  const isCurrentPage =
    pathname === item.href || (item.href && item.href !== '/' && pathname.startsWith(item.href));

  // Определяем тип выравнивания для выпадающего меню
  React.useEffect(() => {
    if (isActive) {
      // Для "Блог" и "Наши работы" — всегда выравнивание по правому краю
      if (item.name === 'Блог' || item.name === 'Наши работы') {
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
    if (item.href) {
      const safe = getSafeHref(item.href);
      if (isInternalAppHref(safe)) {
        router.push(safe);
      } else if (safe !== '#') {
        window.location.href = safe;
      }
    }
    if (onClick) {
      onClick(item.name);
    }
  };

  const handleDropdownItemClick = (itemName: string) => {
    // Вызываем колбэк для дополнительной логики (например, закрытие меню)
    if (onClick) {
      onClick(itemName);
    }
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

      {hasDropdown &&
        isActive &&
        (apiDropdownItems || useDynamicMenu || useDynamicServiceMenu || menuData) && (
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
                {/* Данные из API (полное управление в админке), для "Ремонт квартир" используем категории из каталога услуг */}
                {apiDropdownItems &&
                  !useDynamicServiceMenu &&
                  apiDropdownItems.map((dropdownItem) => (
                    <div key={dropdownItem.id} className={styles.dropdownSection}>
                      <div className={styles.dropdownSectionInner}>
                        <DropdownLink
                          href={dropdownItem.href}
                          onClick={() => handleDropdownItemClick(dropdownItem.name)}
                          className={styles.dropdownItem}
                        >
                          {dropdownItem.icon && (
                            <span className={styles.dropdownItemIconWrapper}>
                              {renderNavigationIcon(dropdownItem.icon, styles.dropdownItemIcon)}
                            </span>
                          )}
                          <span
                            className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}
                          >
                            {dropdownItem.name}
                          </span>
                        </DropdownLink>
                        {dropdownItem.submenu && dropdownItem.submenu.length > 0 && (
                          <div className={styles.submenu}>
                            {dropdownItem.submenu.map((subItem) => (
                              <DropdownLink
                                key={subItem.id}
                                href={subItem.href}
                                onClick={() => handleDropdownItemClick(subItem.name)}
                                className={styles.submenuItem}
                              >
                                {subItem.name}
                              </DropdownLink>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Динамические категории для "Ремонт квартир" (из админки) */}
                {useDynamicServiceMenu &&
                  dynamicServiceCategories!.map((cat) => (
                    <div key={cat.id} className={styles.dropdownSection}>
                      <div className={styles.dropdownSectionInner}>
                        <DropdownLink
                          href={cat.href}
                          onClick={() => handleDropdownItemClick(cat.name)}
                          className={styles.dropdownItem}
                        >
                          <span className={styles.dropdownItemIconWrapper}>
                            {cat.image ? (
                              <img src={cat.image} alt="" className={styles.categoryImage} />
                            ) : cat.icon ? (
                              renderNavigationIcon(cat.icon, styles.dropdownItemIcon)
                            ) : null}
                          </span>
                          <span
                            className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}
                          >
                            {cat.name}
                          </span>
                        </DropdownLink>
                      </div>
                    </div>
                  ))}

                {/* Динамические категории для "Каталог" (если нет данных из API) */}
                {useDynamicMenu &&
                  dynamicCategories!.map((category) => (
                    <div key={category.slug} className={styles.dropdownSection}>
                      <div className={styles.dropdownSectionInner}>
                        <DropdownLink
                          href={category.href}
                          onClick={() => handleDropdownItemClick(category.name)}
                          className={styles.dropdownItem}
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
                          <span
                            className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}
                          >
                            {category.name}
                          </span>
                        </DropdownLink>
                        {category.hasSubmenu && category.submenu.length > 0 && (
                          <div className={styles.submenu}>
                            {category.submenu.map((subItem) => (
                              <DropdownLink
                                key={subItem.slug}
                                href={subItem.href}
                                onClick={() => handleDropdownItemClick(subItem.name)}
                                className={styles.submenuItem}
                              >
                                {subItem.image ? (
                                  <img
                                    src={subItem.image}
                                    alt=""
                                    className={styles.submenuItemImage}
                                  />
                                ) : subItem.icon ? (
                                  <span className={styles.submenuItemIcon}>{subItem.icon}</span>
                                ) : null}
                                <span>{subItem.name}</span>
                              </DropdownLink>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Статические меню для других разделов */}
                {!useDynamicMenu &&
                  !useDynamicServiceMenu &&
                  menuData &&
                  menuData.items.map((dropdownItem) => (
                    <div key={dropdownItem.href} className={styles.dropdownSection}>
                      <div className={styles.dropdownSectionInner}>
                        <DropdownLink
                          href={dropdownItem.href}
                          onClick={() => handleDropdownItemClick(dropdownItem.name)}
                          className={styles.dropdownItem}
                        >
                          {dropdownItem.icon && (
                            <span className={styles.dropdownItemIconWrapper}>
                              {renderNavigationIcon(dropdownItem.icon, styles.dropdownItemIcon)}
                            </span>
                          )}
                          <span
                            className={`${styles.dropdownItemText} ${styles.dropdownItemTextBold}`}
                          >
                            {dropdownItem.name}
                          </span>
                        </DropdownLink>
                        {dropdownItem.hasSubmenu && dropdownItem.submenu && (
                          <div className={styles.submenu}>
                            {dropdownItem.submenu.map((subItem) => (
                              <DropdownLink
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => handleDropdownItemClick(subItem.name)}
                                className={styles.submenuItem}
                              >
                                {subItem.name}
                              </DropdownLink>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
