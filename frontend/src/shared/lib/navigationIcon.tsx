import {
  CubeTransparentIcon,
  MoonIcon,
  TableCellsIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

import React from 'react';

import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';

/** Иконки навигации: каталог услуг + доп. ключи только для меню */
export const navigationIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ...serviceCatalogIconMap,
  TableCells: TableCellsIcon,
  Moon: MoonIcon,
  CubeTransparent: CubeTransparentIcon,
  Tag: TagIcon,
};

/**
 * Рендер иконки навигации: URL картинки, путь, либо ключ из {@link navigationIconMap}.
 */
export function renderNavigationIcon(
  iconName: string | null | undefined,
  className: string
): React.ReactNode {
  if (!iconName) {
    return null;
  }

  if (iconName.startsWith('/') || iconName.startsWith('http')) {
    return (
      <img
        src={iconName}
        alt=""
        className={className}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  }

  const IconComponent = navigationIconMap[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  return null;
}
