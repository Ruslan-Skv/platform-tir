'use client';

import {
  HeartIcon,
  MoonIcon,
  ShoppingCartIcon,
  SunIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { useTheme } from '@/features/theme';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './PillUtilityIcons.module.css';

/** Отступ центра иконки от границы пилюли (px): иконки лежат внутри пилюли,
 * а не вплотную к её границе. */
const ARC_MARGIN_PX = 17;
/** Половина размаха дуги (°): иконки распределены от -80° до +80° — крайние
 * заходят на «макушки» скругления, повторяя его изгиб, но бейджи крайних
 * иконок не вылезают за верхнюю/нижнюю границу пилюли. */
const ARC_HALF_ANGLE_DEG = 80;
/** Минимальный радиус дуги (px), ниже которого иконки выстраиваются колонкой. */
const MIN_ARC_RADIUS_PX = 18;
/**
 * Дуга с запасом помещается справа от контента только на широких экранах —
 * от 1024px до этой ширины иконки стоят ровной колонкой у границы (см. резерв
 * padding-right у рядов пилюли в StickyHeader.module.css и
 * DesktopNavigation.module.css).
 */
const ARC_WIDTH_QUERY = '(min-width: 1360px)';

interface IconSpot {
  right: number;
  top: number;
}

interface IconsLayout {
  spots: IconSpot[];
  /** true — иконки расставлены по дуге (крупнее), false — колонкой (компактнее) */
  arc: boolean;
}

/**
 * Позиции центров иконок вдоль скругления пилюли: правый «полукруг» — это дуга
 * радиусом R = высота пилюли / 2 с центром на середине правой границы, центры
 * иконок лежат на концентрической дуге радиусом R − margin и распределены
 * по углу симметрично. Если дуге мало места (узкий десктоп) — ровная колонка
 * у правой границы.
 */
function computeLayout(
  width: number,
  height: number,
  arcAllowed: boolean,
  count: number
): IconsLayout {
  const radius = height / 2;
  const arcRadius = radius - ARC_MARGIN_PX;
  const arc = arcAllowed && arcRadius >= MIN_ARC_RADIUS_PX && width >= radius + 4;
  const halfAngle = (ARC_HALF_ANGLE_DEG * Math.PI) / 180;

  const spots = Array.from({ length: count }, (_, index) => {
    if (arc) {
      // t ∈ [-1; 1] — положение иконки по дуге
      const t = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
      const angle = t * halfAngle;
      return {
        right: radius - arcRadius * Math.cos(angle),
        top: radius + arcRadius * Math.sin(angle),
      };
    }

    // Запасной вариант: колонка с равными промежутками вдоль границы
    const step = height / (count + 1);
    return { right: ARC_MARGIN_PX, top: step * (index + 1) };
  });

  return { spots, arc };
}

/**
 * Считает раскладку иконок по фактической геометрии контейнера и следит за её
 * изменениями (смена контрольной точки ширины, ресайз окна). Пока позиции не
 * рассчитаны, кнопки лежат flex-колонкой из CSS.
 */
function useIconsLayout(rootRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [layout, setLayout] = useState<IconsLayout | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let arcQuery: MediaQueryList | null = null;

    const recompute = () => {
      const { width, height } = root.getBoundingClientRect();
      // display:none (узкий экран) — не трогаем прошлую раскладку
      if (width < 24 || height < 40) return;
      setLayout(computeLayout(width, height, arcQuery?.matches ?? false, count));
    };

    if (typeof window.matchMedia === 'function') {
      arcQuery = window.matchMedia(ARC_WIDTH_QUERY);
      arcQuery.addEventListener('change', recompute);
    }

    recompute();

    const observer = new ResizeObserver(recompute);
    observer.observe(root);

    return () => {
      observer.disconnect();
      arcQuery?.removeEventListener('change', recompute);
    };
  }, [rootRef, count]);

  return layout;
}

/**
 * Иконки-утилиты «пилюли» липкой шапки: Сравнение, Избранное, Корзина, аватар
 * (без имени) и переключатель темы — уменьшенные копии кнопок TopBar,
 * расставленные по дуге вдоль правой скруглённой границы пилюли.
 * Тот же набор хуков, что в TopBar, поэтому счётчики и тема всегда актуальны.
 */
export const PillUtilityIcons: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useUserAuth();
  const { isDarkTheme, toggleTheme } = useTheme();
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const { count: cartCount } = useCart();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar]);

  const layout = useIconsLayout(rootRef, 5);

  const spotStyle = (index: number): React.CSSProperties | undefined => {
    const spot = layout?.spots[index];
    if (!spot) return undefined;
    // right/top задают точку на дуге — сдвигаем кнопку на половину её размера
    return {
      position: 'absolute',
      right: spot.right,
      top: spot.top,
      transform: 'translate(50%, -50%)',
    };
  };

  const themeTooltip = isDarkTheme ? 'Светлая тема' : 'Тёмная тема';

  return (
    <div
      ref={rootRef}
      className={layout?.arc ? `${styles.icons} ${styles.iconsArc}` : styles.icons}
    >
      {/* Сравнение товаров */}
      <button
        type="button"
        className={styles.iconButton}
        style={{ ...spotStyle(0), '--index': 0 } as React.CSSProperties}
        onClick={() => router.push('/compare')}
        aria-label="Сравнение"
        data-tooltip="Сравнение"
      >
        <span className={styles.iconWrap}>
          <span className={`${styles.icon} ${styles.iconCompare}`} aria-hidden>
            ⚖
          </span>
          {compareCount > 0 && (
            <span className={styles.badge}>{compareCount > 99 ? '99+' : compareCount}</span>
          )}
        </span>
      </button>

      {/* Избранное */}
      <button
        type="button"
        className={styles.iconButton}
        style={{ ...spotStyle(1), '--index': 1 } as React.CSSProperties}
        onClick={() => router.push('/favorites')}
        aria-label="Избранное"
        data-tooltip="Избранное"
      >
        <span className={styles.iconWrap}>
          <HeartIcon className={styles.icon} aria-hidden />
          {wishlistCount > 0 && (
            <span className={styles.badge}>{wishlistCount > 99 ? '99+' : wishlistCount}</span>
          )}
        </span>
      </button>

      {/* Корзина */}
      <button
        type="button"
        className={styles.iconButton}
        style={{ ...spotStyle(2), '--index': 2 } as React.CSSProperties}
        onClick={() => router.push('/cart')}
        aria-label="Корзина"
        data-tooltip="Корзина"
      >
        <span className={styles.iconWrap}>
          <ShoppingCartIcon className={styles.icon} aria-hidden />
          {cartCount > 0 && (
            <span className={styles.badge}>{cartCount > 99 ? '99+' : cartCount}</span>
          )}
        </span>
      </button>

      {/* Личный кабинет — только аватар, без имени */}
      <button
        type="button"
        className={styles.iconButton}
        style={{ ...spotStyle(3), '--index': 3 } as React.CSSProperties}
        onClick={() => router.push(isAuthenticated ? '/profile' : '/login')}
        aria-label={isAuthenticated ? 'Профиль' : 'Войти'}
        data-tooltip={isAuthenticated ? 'Профиль' : 'Войти'}
      >
        {isAuthenticated && user ? (
          user.avatar && !avatarLoadError ? (
            <img
              src={getAvatarUrl(user.avatar) ?? ''}
              alt=""
              className={styles.avatar}
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <span className={styles.initials}>
              {getInitials(user.firstName, user.lastName, user.email)}
            </span>
          )
        ) : (
          <UserIcon className={styles.icon} aria-hidden />
        )}
      </button>

      {/* Переключение темы */}
      <button
        type="button"
        className={styles.iconButton}
        style={{ ...spotStyle(4), '--index': 4 } as React.CSSProperties}
        onClick={toggleTheme}
        aria-label={themeTooltip}
        data-tooltip={themeTooltip}
      >
        {isDarkTheme ? (
          <SunIcon className={styles.icon} aria-hidden />
        ) : (
          <MoonIcon className={styles.icon} aria-hidden />
        )}
      </button>
    </div>
  );
};
