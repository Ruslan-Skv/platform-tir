import type { DropdownItem, DropdownMenus, NavigationItem } from '@/shared/types/navigation';

export const navigation: NavigationItem[] = [
  {
    name: 'Каталог',
    href: '/catalog/products',
    hasDropdown: true,
    category: 'products',
  },
  {
    name: 'Каталог услуг',
    href: '/catalog/services',
    hasDropdown: true,
    category: 'services',
  },
  {
    name: 'Акции',
    href: '/promotions',
    hasDropdown: true,
    category: 'promotions',
  },
  {
    name: 'Блог',
    href: '/blog',
    hasDropdown: true,
    category: 'blog',
  },
  {
    name: 'Фото',
    href: '/photo',
    hasDropdown: true,
    category: 'photo',
  },
];

export const dropdownMenus: DropdownMenus = {
  Каталог: {
    category: 'products',
    image: '../images/catalog-products.jpg',
    items: [
      {
        name: 'Двери входные',
        href: '/catalog/products/entrance-doors',
        productType: 'entrance_doors',
        icon: 'RectangleStack',
        hasSubmenu: true,
        submenu: [
          {
            name: 'Входные двери ТТ XL / XXL',
            href: '/catalog/products/entrance-doors/tt-xl-xxl',
            productType: 'entrance_doors_tt_xl_xxl',
          },
          {
            name: 'Входные двери М',
            href: '/catalog/products/entrance-doors/m',
            productType: 'entrance_doors_m',
          },
          {
            name: 'Входные двери Аргус',
            href: '/catalog/products/entrance-doors/argus',
            productType: 'entrance_doors_argus',
          },
        ],
      },
      {
        name: 'Двери межкомнатные',
        href: '/catalog/products/interior-doors',
        productType: 'interior_doors',
        icon: 'RectangleStack',
      },
      {
        name: 'Фурнитура для дверей',
        href: '/catalog/products/door-hardware',
        productType: 'door_hardware',
        icon: 'WrenchScrewdriver',
      },
      {
        name: 'Окна',
        href: '/catalog/products/windows',
        productType: 'windows',
        icon: 'Squares2X2',
      },
      {
        name: 'Жалюзи',
        href: '/catalog/products/blinds',
        productType: 'blinds',
        icon: 'ViewColumns',
      },
      {
        name: 'Потолки натяжные',
        href: '/catalog/products/stretch-ceilings',
        productType: 'stretch_ceilings',
        icon: 'Cube',
      },
      {
        name: 'Мягкая мебель',
        href: '/catalog/products/upholstered-furniture',
        productType: 'upholstered_furniture',
        icon: 'Home',
      },
      {
        name: 'Обеденные группы',
        href: '/catalog/products/dining-groups',
        productType: 'dining_groups',
        icon: 'TableCells',
      },
      {
        name: 'Товары для сна',
        href: '/catalog/products/sleep-products',
        productType: 'sleep_products',
        icon: 'Moon',
      },
      {
        name: 'Мебель по индивидуальным размерам',
        href: '/catalog/products/custom-furniture',
        productType: 'custom_furniture',
        icon: 'CubeTransparent',
      },
      {
        name: 'Освещение',
        href: '/catalog/products/lighting',
        productType: 'lighting',
        icon: 'LightBulb',
      },
    ],
  },
  'Каталог услуг': {
    category: 'services',
    image: '../images/catalog-services.jpg',
    items: [
      {
        name: 'Малярные работы',
        href: '/catalog/services/painting',
        productType: 'painting_services',
        icon: 'PaintBrush',
      },
      {
        name: 'Работы по электрике',
        href: '/catalog/services/electrical',
        productType: 'electrical_services',
        icon: 'Bolt',
      },
      {
        name: 'Работы по полам',
        href: '/catalog/services/floors',
        productType: 'floor_services',
        icon: 'Square3Stack3D',
      },
      {
        name: 'Работы по потолкам',
        href: '/catalog/services/ceilings',
        productType: 'ceiling_services',
        icon: 'Cube',
      },
      {
        name: 'Работы по сантехнике',
        href: '/catalog/services/plumbing',
        productType: 'plumbing_services',
        icon: 'WrenchScrewdriver',
      },
      {
        name: 'Работы с кафелем',
        href: '/catalog/services/tiling',
        productType: 'tiling_services',
        icon: 'Squares2X2',
      },
      {
        name: 'Монтаж дверей',
        href: '/catalog/services/door-installation',
        productType: 'door_installation',
        icon: 'RectangleStack',
      },
      {
        name: 'Монтаж окон',
        href: '/catalog/services/window-installation',
        productType: 'window_installation',
        icon: 'Squares2X2',
      },
      {
        name: 'Монтаж натяжных потолков',
        href: '/catalog/services/stretch-ceiling-installation',
        productType: 'stretch_ceiling_installation',
        icon: 'Cube',
      },
      {
        name: 'Монтаж жалюзей',
        href: '/catalog/services/blinds-installation',
        productType: 'blinds_installation',
        icon: 'ViewColumns',
      },
    ],
  },
  Акции: {
    category: 'promotions',
    image: '../images/promotions.jpg',
    items: [
      {
        name: 'Все акции',
        href: '/promotions',
        productType: 'all_promotions',
        icon: 'Tag',
      },
    ],
  },
  Блог: {
    category: 'blog',
    image: '../images/blog.jpg',
    items: [
      {
        name: 'Все записи',
        href: '/blog',
        productType: 'all_blog',
        icon: 'DocumentText',
      },
    ],
  },
  Фото: {
    category: 'photo',
    image: '../images/remont-kvartir.jpg',
    items: [
      {
        name: 'Ремонт санузла',
        href: '/photo/bathroom-renovation',
        productType: 'bathroom_renovation',
        icon: 'Home',
      },
      {
        name: 'Ремонт квартиры',
        href: '/photo/apartment-renovation',
        productType: 'apartment_renovation',
        icon: 'BuildingOffice',
      },
      {
        name: 'Кухни',
        href: '/photo/kitchens',
        productType: 'kitchens',
        icon: 'Home',
      },
      {
        name: 'Гардеробные',
        href: '/photo/wardrobes',
        productType: 'wardrobes',
        icon: 'CubeTransparent',
      },
      {
        name: 'Шкафы-купе',
        href: '/photo/sliding-wardrobes',
        productType: 'sliding_wardrobes',
        icon: 'CubeTransparent',
      },
      {
        name: 'Двери',
        href: '/photo/doors',
        productType: 'photo_doors',
        icon: 'RectangleStack',
      },
      {
        name: 'Окна',
        href: '/photo/windows',
        productType: 'photo_windows',
        icon: 'Squares2X2',
      },
      {
        name: 'Потолки натяжные',
        href: '/photo/stretch-ceilings',
        productType: 'photo_stretch_ceilings',
        icon: 'Cube',
      },
      {
        name: 'Жалюзи',
        href: '/photo/blinds',
        productType: 'photo_blinds',
        icon: 'ViewColumns',
      },
    ],
  },
};

export function getPathForProductType(productType: string): string {
  for (const menu of Object.values(dropdownMenus)) {
    const item = menu.items.find((item) => item.productType === productType);
    if (item) {
      return item.href;
    }
    for (const mainItem of menu.items) {
      if (mainItem.submenu) {
        const subItem = mainItem.submenu.find((subItem) => subItem.productType === productType);
        if (subItem) {
          return subItem.href;
        }
      }
    }
  }
  return '/catalog';
}

export function getProductTypesForCategory(category: string): string[] {
  const menu = Object.values(dropdownMenus).find((m) => m.category === category);
  if (!menu) return [];

  const productTypes: string[] = [];

  menu.items.forEach((item) => {
    if (item.productType) {
      productTypes.push(item.productType);
    }
    if (item.submenu) {
      item.submenu.forEach((subItem) => {
        if (subItem.productType) {
          productTypes.push(subItem.productType);
        }
      });
    }
  });

  return productTypes;
}

export function getMenuItemByProductType(productType: string): DropdownItem | null {
  for (const menu of Object.values(dropdownMenus)) {
    for (const item of menu.items) {
      if (item.productType === productType) {
        return item;
      }
      if (item.submenu) {
        const subItem = item.submenu.find((subItem) => subItem.productType === productType);
        if (subItem) {
          return subItem;
        }
      }
    }
  }
  return null;
}

export const mainCategories = navigation.map((item) => ({
  name: item.name,
  href: item.href,
}));
