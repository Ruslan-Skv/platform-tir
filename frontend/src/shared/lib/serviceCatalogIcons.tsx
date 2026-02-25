import {
  BoltIcon,
  CubeIcon,
  PaintBrushIcon,
  RectangleStackIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import type { ComponentType } from 'react';

/** Маппинг имён heroicons (как в БД) на React-компоненты */
export const serviceCatalogIconMap: Record<string, ComponentType<{ className?: string }>> = {
  PaintBrush: PaintBrushIcon,
  Bolt: BoltIcon,
  Square3Stack3D: Square3Stack3DIcon,
  Cube: CubeIcon,
  WrenchScrewdriver: WrenchScrewdriverIcon,
  Squares2X2: Squares2X2Icon,
  RectangleStack: RectangleStackIcon,
  ViewColumns: ViewColumnsIcon,
  Home: CubeIcon,
  LightBulb: BoltIcon,
};
