import type { HeroSlideShowMode } from './hero-section-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export const HERO_SLIDE_SHOW_MODES: { value: HeroSlideShowMode; label: string }[] = [
  { value: 'auto', label: 'Автоматическая смена по таймеру' },
  { value: 'manual', label: 'Только вручную (точки под слайдами)' },
  { value: 'static', label: 'Один слайд без переключения' },
];

export const EMPTY_NEW_FEATURE = { icon: '', title: '' };
