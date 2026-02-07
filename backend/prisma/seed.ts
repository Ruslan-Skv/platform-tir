import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Test123!';

// Супер-администратора не создаём — его создаёте вы сами.
const TEST_USERS = [
  { email: 'admin@example.com', firstName: 'Админ', lastName: 'Системы', role: 'ADMIN' as const },
  { email: 'content_manager@example.com', firstName: 'Контент', lastName: 'Менеджер', role: 'CONTENT_MANAGER' as const },
  { email: 'moderator@example.com', firstName: 'Модератор', lastName: 'Сайта', role: 'MODERATOR' as const },
  { email: 'support@example.com', firstName: 'Поддержка', lastName: 'Клиентов', role: 'SUPPORT' as const },
  { email: 'partner@example.com', firstName: 'Партнёр', lastName: 'Компании', role: 'PARTNER' as const },
  { email: 'user@example.com', firstName: 'Тестовый', lastName: 'Пользователь', role: 'USER' as const },
  { email: 'guest@example.com', firstName: 'Гость', lastName: 'Сайта', role: 'GUEST' as const },
];

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const u of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
      },
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
      },
    });
    console.log(`✅ ${u.role}: ${user.email}`);
  }

  // AdminNotificationsBlock — настройки уведомлений админки (по умолчанию для всех ролей)
  const defaultNotifications = await prisma.adminNotificationsBlock.findFirst({
    where: { role: null },
  });
  if (!defaultNotifications) {
    await prisma.adminNotificationsBlock.create({
      data: {
        role: null,
        soundEnabled: true,
        soundVolume: 70,
        soundType: 'beep',
        desktopNotifications: false,
        checkIntervalSeconds: 60,
        notifyOnReviews: true,
        notifyOnOrders: true,
        notifyOnSupportChat: true,
        notifyOnMeasurementForm: true,
        notifyOnCallbackForm: true,
      },
    });
  }
  console.log('✅ AdminNotificationsBlock: настройки уведомлений');

  // ReviewsBlock — настройки отзывов и оценок
  await prisma.reviewsBlock.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      enabled: true,
      showOnCards: true,
      requirePurchase: false,
      allowGuestReviews: true,
      requireModeration: true,
    },
  });
  console.log('✅ ReviewsBlock: настройки отзывов');

  console.log(`\n📋 Пароль для всех тестовых пользователей: ${TEST_PASSWORD}`);
  console.log('   Вход в админку: admin@example.com, content_manager@example.com, moderator@example.com, support@example.com, partner@example.com');
  console.log('   Обычный пользователь: user@example.com. Гость: guest@example.com');
  console.log('   Супер-администратора в seed нет — создаёте сами.\n');

  // ============================================
  // КАТЕГОРИИ
  // ============================================

  // Родительская категория: Двери входные
  const entranceDoorsCategory = await prisma.category.upsert({
    where: { slug: 'entrance-doors' },
    update: {},
    create: {
      name: 'Двери входные',
      slug: 'entrance-doors',
      description: 'Входные двери различных типов и размеров',
      order: 1,
    },
  });

  // Подкатегория: Входные двери ТТ XL / XXL
  const ttXlXxlCategory = await prisma.category.upsert({
    where: { slug: 'entrance-doors-tt-xl-xxl' },
    update: {
      parentId: entranceDoorsCategory.id,
    },
    create: {
      name: 'Входные двери ТТ XL / XXL',
      slug: 'entrance-doors-tt-xl-xxl',
      description: 'Входные двери увеличенного размера серии ТТ XL и XXL',
      parentId: entranceDoorsCategory.id,
      order: 1,
    },
  });

  // Другие категории
  const interiorDoorsCategory = await prisma.category.upsert({
    where: { slug: 'interior-doors' },
    update: {},
    create: {
      name: 'Двери межкомнатные',
      slug: 'interior-doors',
      description: 'Межкомнатные двери',
      order: 2,
    },
  });

  const windowsCategory = await prisma.category.upsert({
    where: { slug: 'windows' },
    update: {},
    create: {
      name: 'Окна',
      slug: 'windows',
      description: 'Пластиковые и алюминиевые окна',
      order: 3,
    },
  });

  const furnitureCategory = await prisma.category.upsert({
    where: { slug: 'upholstered-furniture' },
    update: {},
    create: {
      name: 'Мягкая мебель',
      slug: 'upholstered-furniture',
      description: 'Мягкая мебель и мебель на заказ',
      order: 4,
    },
  });

  console.log('✅ Created categories');

  // ============================================
  // ТОВАРЫ: Входные двери ТТ XL / XXL
  // ============================================

  const entranceDoorProducts = [
    {
      name: 'Входная дверь ТТ XL "Премиум"',
      slug: 'tt-xl-premium',
      description:
        'Входная дверь увеличенного размера ТТ XL серии Премиум. Толщина полотна 100 мм, три контура уплотнения, терморазрыв.',
      sku: 'TT-XL-001',
      price: 45900,
      comparePrice: 52000,
      stock: 5,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '100 мм',
        steel_thickness: '2.0 мм',
        insulation: 'Минеральная вата',
        lock: 'Двухсистемный',
        color_outside: 'Антик медь',
        color_inside: 'Беленый дуб',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Люкс"',
      slug: 'tt-xxl-lux',
      description:
        'Входная дверь максимального размера ТТ XXL серии Люкс. Усиленная конструкция, противосъемные ригели, биометрический замок.',
      sku: 'TT-XXL-001',
      price: 68500,
      comparePrice: 75000,
      stock: 3,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '1050 мм',
        height: '2200 мм',
        thickness: '110 мм',
        steel_thickness: '2.5 мм',
        insulation: 'Пенополиуретан',
        lock: 'Биометрический + ключевой',
        color_outside: 'Графит',
        color_inside: 'Венге',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XL "Стандарт"',
      slug: 'tt-xl-standard',
      description:
        'Надежная входная дверь ТТ XL серии Стандарт. Оптимальное соотношение цены и качества.',
      sku: 'TT-XL-002',
      price: 32400,
      comparePrice: 38000,
      stock: 8,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '85 мм',
        steel_thickness: '1.8 мм',
        insulation: 'Минеральная вата',
        lock: 'Сувальдный',
        color_outside: 'Антик серебро',
        color_inside: 'Сосна прованс',
        thermal_break: false,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Терморазрыв"',
      slug: 'tt-xxl-thermobreak',
      description:
        'Входная дверь ТТ XXL с усиленным терморазрывом для холодного климата. Идеальна для частного дома.',
      sku: 'TT-XXL-002',
      price: 78900,
      comparePrice: 89000,
      stock: 4,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '1050 мм',
        height: '2200 мм',
        thickness: '120 мм',
        steel_thickness: '2.5 мм',
        insulation: 'Пенополиуретан + минвата',
        lock: 'Трехсистемный',
        color_outside: 'Черный муар',
        color_inside: 'Белый софт',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XL "Классика"',
      slug: 'tt-xl-classic',
      description:
        'Классическая входная дверь ТТ XL с элегантным дизайном. Декоративные молдинги, патина.',
      sku: 'TT-XL-003',
      price: 54700,
      comparePrice: 62000,
      stock: 2,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '100 мм',
        steel_thickness: '2.0 мм',
        insulation: 'Минеральная вата',
        lock: 'Двухсистемный Mottura',
        color_outside: 'Слоновая кость с патиной',
        color_inside: 'Слоновая кость',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Модерн"',
      slug: 'tt-xxl-modern',
      description:
        'Современная входная дверь ТТ XXL в стиле модерн. Минималистичный дизайн, скрытые петли.',
      sku: 'TT-XXL-003',
      price: 92000,
      comparePrice: 105000,
      stock: 1,
      images: ['/images/products/door-classic.jpg'],
      attributes: {
        width: '1100 мм',
        height: '2300 мм',
        thickness: '115 мм',
        steel_thickness: '3.0 мм',
        insulation: 'Пенополиуретан',
        lock: 'Электронный кодовый',
        color_outside: 'Антрацит матовый',
        color_inside: 'Бетон светлый',
        thermal_break: true,
      },
    },
  ];

  for (const productData of entranceDoorProducts) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        ...productData,
        categoryId: ttXlXxlCategory.id,
      },
      create: {
        ...productData,
        categoryId: ttXlXxlCategory.id,
        isActive: true,
        isFeatured: true,
      },
    });
  }

  console.log('✅ Created entrance door products (ТТ XL / XXL)');

  // ============================================
  // ДРУГИЕ ТОВАРЫ (для других категорий)
  // ============================================

  const product2 = await prisma.product.upsert({
    where: { slug: 'window-plastic-veka' },
    update: {},
    create: {
      name: 'Окно пластиковое Veka',
      slug: 'window-plastic-veka',
      description: 'Качественное пластиковое окно от производителя Veka',
      sku: 'WIN-001',
      price: 12000,
      comparePrice: 15000,
      stock: 5,
      categoryId: windowsCategory.id,
      isActive: true,
      isFeatured: true,
      images: ['/images/okna.jpg'],
    },
  });

  const product3 = await prisma.product.upsert({
    where: { slug: 'sofa-modern' },
    update: {},
    create: {
      name: 'Диван современный',
      slug: 'sofa-modern',
      description: 'Удобный диван в современном стиле',
      sku: 'FURN-001',
      price: 35000,
      comparePrice: 45000,
      stock: 3,
      categoryId: furnitureCategory.id,
      isActive: true,
      isFeatured: true,
      images: ['/images/products/div.jpg'],
    },
  });

  console.log('✅ Created other products');

  // ============================================
  // ФУТЕР
  // ============================================
  await prisma.footerBlock.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      workingHoursWeekdays: 'пн-пт: 11-19',
      workingHoursSaturday: 'сб: 12-16',
      workingHoursSunday: 'вс: выходной',
      phone: '8 (8152) 60-12-70',
      email: 'skvirya@mail.ru',
      developer: 'ИП Сквиря Р.В.',
      copyrightCompanyName: 'Территория интерьерных решений',
      vkHref: 'https://vk.com/pskpobeda',
      vkIcon: '/images/icons-vk.png',
    },
  });

  let aboutSection = await prisma.footerSection.findFirst({
    where: { title: 'О нас' },
  });
  if (!aboutSection) {
    aboutSection = await prisma.footerSection.create({
      data: { title: 'О нас', sortOrder: 0 },
    });
  }

  let catalogSection = await prisma.footerSection.findFirst({
    where: { title: 'Каталог' },
  });
  if (!catalogSection) {
    catalogSection = await prisma.footerSection.create({
      data: { title: 'Каталог', sortOrder: 1 },
    });
  }

  const aboutLinks = [
    { name: 'Контакты', href: '/contacts' },
    { name: 'Фото', href: '/photo' },
    { name: 'Вакансии', href: '/careers' },
  ];
  const catalogLinks = [
    { name: 'Ремонт квартир', href: '/repair' },
    { name: 'Двери', href: '/doors' },
    { name: 'Окна', href: '/windows' },
    { name: 'Потолки', href: '/ceilings' },
    { name: 'Жалюзи', href: '/blinds' },
    { name: 'Мебель', href: '/furniture' },
    { name: 'Акции', href: '/promotions' },
  ];

  for (let i = 0; i < aboutLinks.length; i++) {
    const existing = await prisma.footerSectionLink.findFirst({
      where: { sectionId: aboutSection.id, name: aboutLinks[i].name },
    });
    if (!existing) {
      await prisma.footerSectionLink.create({
        data: {
          sectionId: aboutSection.id,
          ...aboutLinks[i],
          sortOrder: i,
        },
      });
    }
  }
  for (let i = 0; i < catalogLinks.length; i++) {
    const existing = await prisma.footerSectionLink.findFirst({
      where: { sectionId: catalogSection.id, name: catalogLinks[i].name },
    });
    if (!existing) {
      await prisma.footerSectionLink.create({
        data: {
          sectionId: catalogSection.id,
          ...catalogLinks[i],
          sortOrder: i,
        },
      });
    }
  }

  console.log('✅ Footer seeded');

  // ============================================
  // МЕНЮ НАВИГАЦИИ (кнопки в шапке сайта)
  // Добавляем отсутствующие пункты по имени; у существующих обновляем ссылку и hasDropdown.
  // Вложенное меню настраивается в админке для каждого пункта.
  // ============================================
  const defaultNavItems = [
    { name: 'Каталог', href: '/catalog/products', hasDropdown: true },
    { name: 'Каталог услуг', href: '/catalog/services', hasDropdown: true },
    { name: 'Акции', href: '/promotions', hasDropdown: true },
    { name: 'Блог', href: '/blog', hasDropdown: true },
    { name: 'Фото', href: '/photo', hasDropdown: true },
  ];
  const existingNav = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
  const byName = new Map(existingNav.map((n) => [n.name, n]));
  let added = 0;
  for (let i = 0; i < defaultNavItems.length; i++) {
    const item = defaultNavItems[i];
    const existing = byName.get(item.name);
    if (existing) {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: { href: item.href, hasDropdown: item.hasDropdown },
      });
      continue;
    }
    const nextOrder = existingNav.length + added;
    await prisma.navigationItem.create({
      data: {
        name: item.name,
        href: item.href,
        hasDropdown: item.hasDropdown,
        sortOrder: nextOrder,
      },
    });
    added++;
  }
  if (added > 0) {
    console.log(`✅ Navigation: добавлено пунктов меню: ${added}`);
  }
  const totalNav = await prisma.navigationItem.count();
  if (totalNav > 0) {
    console.log(`✅ Navigation: всего пунктов в меню: ${totalNav}`);
  }

  // Пункты выпадающего меню по умолчанию (для «Каталог услуг», «Акции», «Блог», «Фото»).
  // «Каталог» заполняется из категорий каталога, здесь не трогаем.
  const defaultDropdownByNavName: Record<
    string,
    { name: string; href: string; icon?: string; submenu?: { name: string; href: string }[] }[]
  > = {
    'Каталог услуг': [
      { name: 'Малярные работы', href: '/catalog/services/painting', icon: 'PaintBrush' },
      { name: 'Работы по электрике', href: '/catalog/services/electrical', icon: 'Bolt' },
      { name: 'Работы по полам', href: '/catalog/services/floors', icon: 'Square3Stack3D' },
      { name: 'Работы по потолкам', href: '/catalog/services/ceilings', icon: 'Cube' },
      { name: 'Работы по сантехнике', href: '/catalog/services/plumbing', icon: 'WrenchScrewdriver' },
      { name: 'Работы с кафелем', href: '/catalog/services/tiling', icon: 'Squares2X2' },
      { name: 'Монтаж дверей', href: '/catalog/services/door-installation', icon: 'RectangleStack' },
      { name: 'Монтаж окон', href: '/catalog/services/window-installation', icon: 'Squares2X2' },
      {
        name: 'Монтаж натяжных потолков',
        href: '/catalog/services/stretch-ceiling-installation',
        icon: 'Cube',
      },
      { name: 'Монтаж жалюзей', href: '/catalog/services/blinds-installation', icon: 'ViewColumns' },
    ],
    Акции: [{ name: 'Все акции', href: '/promotions', icon: 'Tag' }],
    Блог: [{ name: 'Все записи', href: '/blog', icon: 'DocumentText' }],
    Фото: [
      { name: 'Ремонт санузла', href: '/photo/bathroom-renovation', icon: 'Home' },
      { name: 'Ремонт квартиры', href: '/photo/apartment-renovation', icon: 'BuildingOffice' },
      { name: 'Кухни', href: '/photo/kitchens', icon: 'Home' },
      { name: 'Гардеробные', href: '/photo/wardrobes', icon: 'CubeTransparent' },
      { name: 'Шкафы-купе', href: '/photo/sliding-wardrobes', icon: 'CubeTransparent' },
      { name: 'Двери', href: '/photo/doors', icon: 'RectangleStack' },
      { name: 'Окна', href: '/photo/windows', icon: 'Squares2X2' },
      { name: 'Потолки натяжные', href: '/photo/stretch-ceilings', icon: 'Cube' },
      { name: 'Жалюзи', href: '/photo/blinds', icon: 'ViewColumns' },
    ],
  };

  const navItemsWithDropdown = await prisma.navigationItem.findMany({
    where: { hasDropdown: true, name: { not: 'Каталог' } },
    include: { _count: { select: { dropdownItems: true } } },
  });
  let seededDropdowns = 0;
  for (const navItem of navItemsWithDropdown) {
    const defaults = defaultDropdownByNavName[navItem.name];
    if (!defaults || navItem._count.dropdownItems > 0) continue;
    for (let i = 0; i < defaults.length; i++) {
      const d = defaults[i];
      const created = await prisma.navigationDropdownItem.create({
        data: {
          navItemId: navItem.id,
          name: d.name,
          href: d.href,
          icon: d.icon ?? null,
          sortOrder: i,
        },
      });
      if (d.submenu?.length) {
        for (let j = 0; j < d.submenu.length; j++) {
          await prisma.navigationDropdownSubItem.create({
            data: {
              dropdownId: created.id,
              name: d.submenu[j].name,
              href: d.submenu[j].href,
              sortOrder: j,
            },
          });
        }
      }
      seededDropdowns++;
    }
  }
  if (seededDropdowns > 0) {
    console.log(`✅ Navigation: создано пунктов выпадающего меню: ${seededDropdowns}`);
  }

  // ============================================
  // БЛОГ: категория и тестовая статья
  // ============================================

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (adminUser) {
    const blogCategory = await prisma.blogCategory.upsert({
      where: { slug: 'sovety' },
      update: {},
      create: {
        name: 'Советы по ремонту',
        slug: 'sovety',
        description: 'Полезные советы по ремонту и обустройству дома',
        order: 0,
      },
    });

    const testPostContent = `
<p>Добро пожаловать в наш блог! Здесь мы делимся полезными советами по ремонту, выбору дверей, мебели и созданию уютного интерьера.</p>

<h2>Как выбрать входную дверь</h2>
<p>Входная дверь — это визитная карточка вашего дома. При выборе обратите внимание на материал, толщину полотна, качество фурнитуры и теплоизоляцию.</p>

<figure>
  <img src="/images/dveri.jpg" alt="Входные двери" style="max-width: 100%; height: auto; border-radius: 8px;" />
  <figcaption>Качественные входные двери — надёжность и стиль</figcaption>
</figure>

<h2>Мягкая мебель для гостиной</h2>
<p>Диван или кресло должны быть не только красивыми, но и удобными. Учитывайте размеры комнаты, стиль интерьера и практичность обивки.</p>

<figure>
  <img src="/images/mebel.jpg" alt="Мягкая мебель" style="max-width: 100%; height: auto; border-radius: 8px;" />
  <figcaption>Мягкая мебель создаёт уют в доме</figcaption>
</figure>

<h2>Натяжные потолки</h2>
<p>Натяжные потолки — современное решение для любого помещения. Они скрывают коммуникации, позволяют установить встроенное освещение и служат десятилетиями.</p>

<figure>
  <img src="/images/potolki.jpg" alt="Натяжные потолки" style="max-width: 100%; height: auto; border-radius: 8px;" />
  <figcaption>Натяжные потолки — эстетика и практичность</figcaption>
</figure>

<p>Обращайтесь в «Территорию интерьерных решений» — мы поможем подобрать идеальные решения для вашего дома!</p>
`.trim();

    await prisma.blogPost.upsert({
      where: { slug: 'kak-vybrat-dveri-i-mebel' },
      update: {
        content: testPostContent,
        excerpt: 'Полезные советы по выбору входных дверей, мягкой мебели и натяжных потолков. Создайте уют в вашем доме с помощью профессионалов.',
      },
      create: {
        title: 'Как выбрать входные двери и мебель для дома',
        slug: 'kak-vybrat-dveri-i-mebel',
        content: testPostContent,
        excerpt:
          'Полезные советы по выбору входных дверей, мягкой мебели и натяжных потолков. Создайте уют в вашем доме с помощью профессионалов.',
        featuredImage: '/images/dveri.jpg',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: adminUser.id,
        categoryId: blogCategory.id,
        tags: ['двери', 'мебель', 'ремонт', 'советы'],
        allowComments: true,
      },
    });
    console.log('✅ Blog: тестовая статья создана');
  }

  // Photo categories (для раздела «Фото»)
  const photoCategories = [
    { name: 'Ремонт санузла', slug: 'bathroom-renovation', order: 0 },
    { name: 'Ремонт квартиры', slug: 'apartment-renovation', order: 1 },
    { name: 'Кухни', slug: 'kitchens', order: 2 },
    { name: 'Гардеробные', slug: 'wardrobes', order: 3 },
    { name: 'Шкафы-купе', slug: 'sliding-wardrobes', order: 4 },
    { name: 'Двери', slug: 'doors', order: 5 },
    { name: 'Окна', slug: 'windows', order: 6 },
    { name: 'Потолки натяжные', slug: 'stretch-ceilings', order: 7 },
    { name: 'Жалюзи', slug: 'blinds', order: 8 },
  ];
  for (const cat of photoCategories) {
    await prisma.photoCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, order: cat.order },
      create: cat,
    });
  }
  console.log('✅ Photo: категории созданы');

  // Promotions (раздел «Акции»)
  const promotions = [
    {
      title: 'Скидка 15% на входные двери',
      slug: 'discount-entrance-doors',
      imageUrl: '/images/akcii.jpg',
      description:
        'Специальное предложение на входные двери до конца месяца. Скидка 15% при заказе от 2 дверей.',
      sortOrder: 0,
    },
    {
      title: 'Бесплатный замер натяжных потолков',
      slug: 'free-ceiling-measurement',
      imageUrl: '/images/akcii1.jpg',
      description:
        'Закажите натяжные потолки и получите бесплатный замер. Акция действует при заказе от 20 м².',
      sortOrder: 1,
    },
  ];
  for (const p of promotions) {
    await prisma.promotion.upsert({
      where: { slug: p.slug },
      update: { title: p.title, imageUrl: p.imageUrl, description: p.description, sortOrder: p.sortOrder },
      create: { ...p, isActive: true },
    });
  }
  console.log('✅ Promotions: акции созданы');

  // UserCabinetBlock — настройки личного кабинета пользователя
  await prisma.userCabinetBlock.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      showProfileSection: true,
      showOrdersSection: true,
      showNotificationsSection: true,
      showPasswordSection: true,
      showQuickLinks: true,
    },
  });
  console.log('✅ UserCabinetBlock: настройки личного кабинета');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
