import React from 'react';
import {
  ChevronDownIcon,
  RectangleStackIcon,
  WrenchScrewdriverIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  CubeIcon,
  HomeIcon,
  TableCellsIcon,
  MoonIcon,
  CubeTransparentIcon,
  LightBulbIcon,
  PaintBrushIcon,
  BoltIcon,
  Square3Stack3DIcon,
  TagIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/shared/ui/Button';
import type { NavigationItem as NavigationItemType } from '@/shared/types/navigation';
import { dropdownMenus } from '@/shared/constants/navigation';
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
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  isActive,
  onMouseEnter,
  onMouseLeave,
  onDropdownMouseEnter,
  onDropdownMouseLeave,
  onClick,
}) => {
  const hasDropdown = item.hasDropdown;
  const menuData = hasDropdown ? dropdownMenus[item.name] : null;
  const navItemRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [alignment, setAlignment] = React.useState<'left' | 'right' | 'center'>('left');

  // Определяем тип выравнивания для выпадающего меню
  React.useEffect(() => {
    if (isActive) {
      // Для "ПОЛЕЗНЫЕ СТАТЬИ" и "НАШИ РАБОТЫ" - всегда выравнивание по правому краю
      if (item.name === 'ПОЛЕЗНЫЕ СТАТЬИ' || item.name === 'НАШИ РАБОТЫ') {
        setAlignment('right');
      }
      // Для "АКЦИИ" - выравнивание по центру (с проверкой границ)
      else if (item.name === 'АКЦИИ') {
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
    if (hasDropdown) {
      if (onClick) {
        onClick(item.name);
      }
    } else {
      if (item.href) {
        window.location.href = item.href;
      }
    }
  };

  const handleDropdownItemClick = (itemName: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(itemName);
    }
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
          onError={e => {
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
      <Button variant="link" size="sm" onClick={handleClick} className={styles.navButton}>
        <span className={styles.navText}>{item.name}</span>
        {hasDropdown && (
          <ChevronDownIcon
            className={`${styles.chevron} ${isActive ? styles.chevronActive : ''}`}
          />
        )}
      </Button>

      {hasDropdown && isActive && menuData && (
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
              {menuData.items.map(dropdownItem => (
                <a
                  key={dropdownItem.name}
                  href={dropdownItem.href}
                  onClick={e => handleDropdownItemClick(dropdownItem.name, e)}
                  className={styles.dropdownItem}
                  title={dropdownItem.name}
                >
                  {dropdownItem.icon && (
                    <span className={styles.dropdownItemIconWrapper}>
                      {getIcon(dropdownItem.icon)}
                    </span>
                  )}
                  <span className={styles.dropdownItemText}>{dropdownItem.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
