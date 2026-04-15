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

/** Имена иконок из админки / констант → компоненты Heroicons */
const navigationIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
