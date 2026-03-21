/**
 * Fallback-конфигурация Hero при недоступности API.
 * Основные данные (block, slides) загружаются с сервера — редактируйте через админку.
 *
 * Преимущества (features) — только на фронтенде. Редактируйте здесь.
 */

export type HeroSlideShowMode = 'auto' | 'manual' | 'static';

export interface HeroConfig {
  block: {
    titleMain: string;
    titleAccent: string;
    subtitle: string;
    slideShowMode: HeroSlideShowMode;
    slideGap: number;
  };
  slides: { id: string; imageUrl: string; sortOrder: number }[];
  features: { id: string; icon: string; title: string; sortOrder: number }[];
}

export const HERO_CONFIG: HeroConfig = {
  block: {
    titleMain: 'Создаем интерьеры мечты',
    titleAccent: 'в Мурманске',
    subtitle:
      'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....',
    slideShowMode: 'auto',
    slideGap: 16,
  },
  slides: [
    { id: '1', imageUrl: '/images/dark-fon.jpg', sortOrder: 0 },
    { id: '2', imageUrl: '/images/dark-fon1.jpg', sortOrder: 1 },
    { id: '3', imageUrl: '/images/light-fon.png', sortOrder: 2 },
  ],
  features: [
    { id: '1', icon: '🏭', title: 'Собственное производство', sortOrder: 0 },
    { id: '2', icon: '📐', title: 'Бесплатный замер', sortOrder: 1 },
    { id: '3', icon: '🛡️', title: 'Гарантия 3 года', sortOrder: 2 },
    { id: '4', icon: '⚡', title: 'Сроки от 1 дня', sortOrder: 3 },
  ],
};
