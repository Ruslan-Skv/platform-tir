export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
  isSale?: boolean;
}

export interface Advantage {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface Service {
  id: number;
  title: string;
  description: string;
  features: string[];
  price: string;
  image: string;
}

/**
 * Картинки по умолчанию для раздела «Наши направления» (первая загрузка без бэкенда).
 * Файлы лежат в public/images/; при работе бэкенда подменяются из API (админка).
 * Используются при недоступности бэкенда, чтобы не запрашивать URL с localhost:3001.
 */
// export const DEFAULT_DIRECTION_IMAGES: Record<string, string> = {
//   furniture: '/images/mebel.jpg',
//   repair: '/images/remont-kvartir.jpg',
//   doors: '/images/dveri.jpg',
//   windows: '/images/okna.jpg',
//   ceilings: '/images/potolki.jpg',
//   blinds: '/images/zhalyuzi.jpg',
//   sales: '/images/akcii.jpg',
// };

export const DEFAULT_DIRECTION_IMAGES: Record<string, string> = {
  furniture: '/images/mebel.png',
  repair: '/images/remont-kvartir.png',
  doors: '/images/dveri.png',
  windows: '/images/okna.png',
  ceilings: '/images/potolki.png',
  blinds: '/images/zhalyuzi.png',
  // sales: '/images/akcii.png',
};

export const categories: Category[] = [
  {
    id: 1,
    slug: 'furniture',
    name: 'Мебель на заказ',
    description: 'Кухни, шкафы, гостиные по индивидуальным размерам',
    image: DEFAULT_DIRECTION_IMAGES.furniture ?? '',
    productCount: 156,
    href: '/catalog?category=мебель',
  },
  {
    id: 2,
    slug: 'repair',
    name: 'Ремонт квартир',
    description: 'Ремонт под ключ и отделочные работы',
    image: DEFAULT_DIRECTION_IMAGES.repair ?? '',
    productCount: 42,
    href: '/catalog?category=ремонт',
  },
  {
    id: 3,
    slug: 'doors',
    name: 'Двери',
    description: 'Межкомнатные и входные двери',
    image: DEFAULT_DIRECTION_IMAGES.doors ?? '',
    productCount: 89,
    href: '/catalog?category=двери',
  },
  {
    id: 4,
    slug: 'windows',
    name: 'Окна',
    description: 'Пластиковые и алюминиевые окна',
    image: DEFAULT_DIRECTION_IMAGES.windows ?? '',
    productCount: 67,
    href: '/catalog?category=окна',
  },
  {
    id: 5,
    slug: 'ceilings',
    name: 'Потолки',
    description: 'Натяжные и гипсокартонные потолки',
    image: DEFAULT_DIRECTION_IMAGES.ceilings ?? '',
    productCount: 54,
    href: '/catalog?category=потолки',
  },
  {
    id: 6,
    slug: 'blinds',
    name: 'Жалюзи',
    description: 'Горизонтальные, вертикальные, рулонные',
    image: DEFAULT_DIRECTION_IMAGES.blinds ?? '',
    productCount: 73,
    href: '/catalog?category=жалюзи',
  },
  // {
  //   id: 7,
  //   slug: 'sales',
  //   name: 'Акции',
  //   description: 'Специальные предложения и скидки',
  //   image: DEFAULT_DIRECTION_IMAGES.sales ?? '',
  //   productCount: 28,
  //   href: '/catalog?category=акции',
  //   isSale: true,
  // },
];

export const advantages: Advantage[] = [
  {
    id: 1,
    title: 'Собственное производство',
    description: 'Изготавливаем мебель и конструкции на собственном производстве в Мурманске',
    icon: '🏭',
  },
  {
    id: 2,
    title: 'Бесплатный замер',
    description: 'Выезд специалиста для точных замеров и консультации',
    icon: '📐',
  },
  {
    id: 3,
    title: 'Опыт 15+ лет',
    description: 'Более 15 лет создаем интерьеры в Мурманске и области',
    icon: '🏆',
  },
  {
    id: 4,
    title: 'Сроки от 1 дня',
    description: 'Быстрое изготовление и монтаж без задержек',
    icon: '⚡',
  },
  {
    id: 5,
    title: 'Гарантия 1 год',
    description: 'Предоставляем гарантию на все работы и материалы',
    icon: '🛡️',
  },
  {
    id: 6,
    title: 'Дизайн-проект',
    description: 'Разработка индивидуального дизайн-проекта',
    icon: '🎨',
  },
];

export const services: Service[] = [
  {
    id: 1,
    title: 'Ремонт под ключ',
    description: 'Полный цикл от дизайна до чистовой отделки',
    features: [
      'Дизайн-проект',
      'Черновые работы',
      'Чистовая отделка',
      'Мебель на заказ',
      'Авторский надзор',
    ],
    price: 'от 5 000 ₽/м²',
    image: '',
  },
  {
    id: 2,
    title: 'Мебель на заказ',
    description: 'Изготовление мебели по индивидуальным размерам',
    features: [
      'Кухни любой сложности',
      'Шкафы-купе и гардеробные',
      'Гостиные и стенки',
      'Спальни и детские',
    ],
    price: 'от 15 000 ₽',
    image: '',
  },
  {
    id: 3,
    title: 'Дизайн интерьера',
    description: 'Создание индивидуального дизайн-проекта',
    features: ['3D-визуализация', 'Подбор материалов', 'Смета и планировка', 'Авторский надзор'],
    price: 'от 1 500 ₽/м²',
    image: '',
  },
];
