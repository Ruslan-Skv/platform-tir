/**
 * Наполнение раздела «Окна»: настройки страницы, бренды (REHAU, VEKA, WHS)
 * и их профильные системы с характеристиками с сайтов поставщиков:
 *   - REHAU: https://oknaaries.ru/produkciya/ (Blitz, Grazio, INTELIO 80)
 *   - VEKA:  https://www.veka.ru/production/special/profilnye-sistemy-veka (Softline 82, Softline, Euroline)
 *   - WHS:   http://whshalo.ru/ (WHS 60, WHS 72)
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-windows-section
 *
 * Идемпотентно: бренды и системы апсертятся по slug (перезаписывают контент —
 * правки админки в текстах/характеристиках при повторном запуске заменяются).
 * Настройки страницы создаёт один раз (правки админки не затираются).
 * Добавляет пункт меню «Окна» → /windows (если отсутствует) перед «Акции».
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан (см. backend/.env)');
}

const prisma = new PrismaClient();

interface SeedSystem {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  chambers: number | null;
  mountingDepth: number | null;
  glassUnitWidth: string | null;
  thermalResistance: string | null;
  soundInsulation: string | null;
  advantages: string[];
  characteristics: { label: string; value: string }[];
  badge: string | null;
  sortOrder: number;
}

interface SeedBrand {
  slug: string;
  name: string;
  country: string | null;
  description: string;
  sortOrder: number;
  systems: SeedSystem[];
}

const BRANDS: SeedBrand[] = [
  {
    slug: 'rehau',
    name: 'REHAU',
    country: 'Германия',
    description:
      'Немецкий бренд с мировым именем и один из лидеров рынка оконных решений. Широкая линейка профильных систем — от базовой Blitz до энергоэффективной INTELIO 80, идеально гладкие поверхности, не требующие сложного ухода, и долговечность, подтверждённая испытаниями.',
    sortOrder: 0,
    systems: [
      {
        slug: 'rehau-blitz',
        name: 'Blitz New',
        tagline: 'Базовая система линейки REHAU для дома и объекта',
        description:
          'Blitz — базовая система в продуктовой линейке REHAU, разработанная в соответствии с наиболее актуальными запросами российских потребителей. Надёжные окна, которые эффективно сохраняют тепло, защищают от уличного шума и легко интегрируются в любой интерьер.',
        chambers: 3,
        mountingDepth: 60,
        glassUnitWidth: null,
        thermalResistance: '0,70 м²·°С/Вт',
        soundInsulation: null,
        advantages: [
          'Эффективное сохранение тепла с обычным двухкамерным стеклопакетом',
          'Защита от уличного шума',
          'Гладкая высококачественная поверхность — лёгкий уход',
          'Два контура уплотнения с нахлёстом 6/8 мм: без сквозняков, пыли и воды',
          'Оптимальная себестоимость — подходит для объектного строительства',
          'Белые окна и ламинация, включая имитацию структуры дерева',
        ],
        characteristics: [
          {
            label: 'Взломобезопасность',
            value: 'возможна установка усиленных приборов запирания (смещение оси паза на 13 мм)',
          },
          {
            label: 'Применение',
            value: 'окна и балконные двери; новое строительство и реконструкция жилых и общественных зданий',
          },
        ],
        badge: null,
        sortOrder: 0,
      },
      {
        slug: 'rehau-grazio',
        name: 'Grazio',
        tagline: 'Пятикамерная система с усиленной теплозащитой для северного климата',
        description:
          'Пятикамерная оконная система GRAZIO — уникальное изобретение REHAU, сочетающее изящество формы и исключительные теплозащитные свойства. Прочная функциональная система выдерживает экстремально низкие температуры и повышенную влажность — свойства подтверждены экспериментально.',
        chambers: 5,
        mountingDepth: 70,
        glassUnitWidth: '10–41 мм',
        thermalResistance: '0,85 м²·°С/Вт',
        soundInsulation: '39–45 дБ',
        advantages: [
          'Выдерживает экстремально низкие температуры и повышенную влажность',
          'Существенная экономия тепловой энергии',
          'Звукоизоляция Rw до 45 дБ (испытания «АПРОК»)',
          'Разнообразие форм окон: от прямоугольных до изогнутых и круглых',
          'Элегантный дизайн: радиусы и ступенчатый наклон лицевых поверхностей',
          'Привлекательное ценовое позиционирование относительно аналогов',
        ],
        characteristics: [
          { label: 'Уплотнение', value: 'два контура с нахлёстом 6/8 мм внутри' },
          {
            label: 'Взломобезопасность',
            value: 'возможна установка усиленных приборов запирания (смещение оси паза на 13 мм)',
          },
          {
            label: 'Применение',
            value: 'индивидуальное и объектное строительство, в т.ч. северные регионы РФ',
          },
        ],
        badge: 'Для северного климата',
        sortOrder: 1,
      },
      {
        slug: 'rehau-intelio-80',
        name: 'INTELIO 80',
        tagline: 'Система умного комфорта: максимум тепла и тишины',
        description:
          'INTELIO 80 — система умного комфорта: создаёт в доме оптимальный микроклимат и максимально повышает уровень шумоизоляции. Идеально гладкая HDF-поверхность не накапливает пыль и упрощает уход. Испытания в НИИ строительной физики подтвердили стойкость к 60 условным годам эксплуатации.',
        chambers: 6,
        mountingDepth: 80,
        glassUnitWidth: 'до 53 мм',
        thermalResistance: '0,98 м²·°С/Вт',
        soundInsulation: 'до 40 дБ(А)',
        advantages: [
          '60 условных лет эксплуатации (испытания НИИ строительной физики)',
          'Рабочий диапазон от −60 °С до +50 °С — для суровых зим и жаркого лета',
          'Глянцевая HDF-поверхность: не въедается грязь, устойчива к микроповреждениям',
          'Усиленное армирование и вклейка стеклопакета: створки до 110×240 см без провисания',
          'Идеальна для панорамного остекления',
          'Ламинация в десятки оттенков и фактур',
        ],
        characteristics: [
          { label: 'Видимая ширина (рама + створка)', value: 'от 107 мм' },
          { label: 'Створка с двухкамерным стеклопакетом', value: 'до 110×240 см (или 140×150 см)' },
          {
            label: 'Ветровая нагрузка / водопроницаемость',
            value: 'до класса А по ГОСТ 23166-99',
          },
          { label: 'Климатический тип', value: 'I (универсальный) по ГОСТ 30673-2013' },
        ],
        badge: 'Премиум',
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'veka',
    name: 'VEKA',
    country: 'Германия',
    description:
      'Мировой производитель оконных систем. Все профили VEKA изготавливаются по немецкому стандарту DIN EN 12608 класс А — высший класс качества, который гарантирует надёжную работу окон и дверей на десятилетия.',
    sortOrder: 1,
    systems: [
      {
        slug: 'veka-softline-82',
        name: 'Softline 82',
        tagline: 'Инновационная энергоэффективная система класса A++',
        description:
          'Softline 82 — энергоэффективная система, соответствующая высоким требованиям будущего. Стабильная многокамерная конструкция с отличными изолирующими характеристиками и высоким сопротивлением теплопередаче.',
        chambers: 7,
        mountingDepth: 82,
        glassUnitWidth: null,
        thermalResistance: '1,12 м²·°С/Вт',
        soundInsulation: null,
        advantages: [
          'Один из самых тёплых профилей VEKA — Rопр до 1,12 м²·°С/Вт (с армированием)',
          'Высокая шумоизоляция для тишины и спокойствия в доме',
          'Уплотнения ТРЕ/АРТК в трёх цветах: карамель, чёрный, серый',
          'Специальные армирующие усилители — высокая стабильность конструкции',
          'Качественный пластик с ровной гладкой поверхностью в любом цвете',
        ],
        characteristics: [
          { label: 'Класс энергоэффективности', value: 'A++' },
          { label: 'Камеры (рама/створка)', value: '7 / 6' },
          { label: 'Высота фальца', value: '25 мм' },
          { label: 'Качество профиля', value: 'класс А по DIN EN 12608' },
        ],
        badge: 'Энергоэффективность A++',
        sortOrder: 0,
      },
      {
        slug: 'veka-softline',
        name: 'Softline',
        tagline: 'Система для профессиональных решений в оконном бизнесе',
        description:
          'Softline — проверенная система VEKA для профессиональных решений: сбалансированные характеристики тепла и тишины, классический дизайн и надёжная конструкция по доступной цене.',
        chambers: 5,
        mountingDepth: 70,
        glassUnitWidth: null,
        thermalResistance: '0,94 м²·°С/Вт',
        soundInsulation: null,
        advantages: [
          'Хорошая теплоизоляция при доступной цене',
          'Высокая шумоизоляция',
          'Уплотнения АРТК/силикон в трёх цветах: карамель, чёрный, серый',
          'Армирующие усилители — стабильность конструкции',
          'Класс А по DIN EN 12608',
        ],
        characteristics: [
          { label: 'Класс энергоэффективности', value: 'A+' },
          { label: 'Высота фальца', value: '21 мм' },
          { label: 'Качество профиля', value: 'класс А по DIN EN 12608' },
        ],
        badge: null,
        sortOrder: 1,
      },
      {
        slug: 'veka-euroline',
        name: 'Euroline',
        tagline: 'Классическая система оконных и дверных профилей',
        description:
          'Euroline — классическая система VEKA для тёплых и хорошо отапливаемых домов: экономичное решение с достойными характеристиками и немецким качеством.',
        chambers: 3,
        mountingDepth: 58,
        glassUnitWidth: null,
        thermalResistance: '0,77 м²·°С/Вт',
        soundInsulation: null,
        advantages: [
          'Доступная цена базового решения',
          'Компактная монтажная ширина 58 мм',
          'Уплотнения АРТК/силикон в трёх цветах',
          'Проверенное немецкое качество VEKA',
        ],
        characteristics: [
          { label: 'Класс энергоэффективности', value: 'A' },
          { label: 'Высота фальца', value: '18 мм' },
          { label: 'Стеклопакет', value: 'подходит однокамерный' },
        ],
        badge: null,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'whs',
    name: 'WHS',
    country: null,
    description:
      'WHS by VEKA — линейка, которая даёт возможность оптимизировать затраты на окна и получить неизменно качественный продукт от мирового производителя оконных систем. Более 40 вариантов ламинации: от имитации дерева до металлик-эффектов.',
    sortOrder: 2,
    systems: [
      {
        slug: 'whs-60',
        name: 'WHS 60',
        tagline: 'Доступная система WHS by VEKA для дома и дачи',
        description:
          'WHS 60 — доступная оконная система линейки WHS by VEKA. Оптимизирует затраты на окна и сохраняет неизменно качественный продукт мирового производителя: два контура уплотнения и утеплённый стеклопакет до 32 мм.',
        chambers: 4,
        mountingDepth: 60,
        glassUnitWidth: '24–32 мм',
        thermalResistance: null,
        soundInsulation: null,
        advantages: [
          'Одно из самых доступных предложений VEKA',
          'Два контура уплотнения — без сквозняков и щелей',
          'Стеклопакет до 32 мм — приемлемое сопротивление теплопередаче',
          'Более 40 вариантов ламинации',
          'Доступность запчастей и официальная поддержка',
        ],
        characteristics: [{ label: 'Линейка', value: 'WHS by VEKA' }],
        badge: 'Выгодная цена',
        sortOrder: 0,
      },
      {
        slug: 'whs-72',
        name: 'WHS 72',
        tagline: 'Пятикамерная система WHS by VEKA с широким стеклопакетом',
        description:
          'WHS 72 — пятикамерная система WHS by VEKA с широким тёплым стеклопакетом: больше тепла и тишины при разумном бюджете. В линейке есть и дверная система WHS 72 для балконных и дверных блоков.',
        chambers: 5,
        mountingDepth: 72,
        glassUnitWidth: '24–44 мм',
        thermalResistance: null,
        soundInsulation: null,
        advantages: [
          'Стеклопакет до 44 мм — повышенная теплоизоляция',
          'Пять камер профиля',
          'Дверная система WHS 72 для балконных дверей',
          'Более 40 вариантов ламинации: от дерева до металлик-эффектов',
          'Официальная поддержка и гарантия производителя',
        ],
        characteristics: [
          { label: 'Линейка', value: 'WHS by VEKA' },
          { label: 'Дверная система', value: 'WHS 72: 5 камер, стеклопакет 24–44 мм' },
        ],
        badge: null,
        sortOrder: 1,
      },
    ],
  },
];

async function seedPageSettings() {
  const existing = await prisma.windowsPageBlock.findUnique({ where: { id: 'main' } });
  if (existing) {
    console.log('✅ Окна: настройки страницы уже существуют — не трогаем');
    return;
  }
  await prisma.windowsPageBlock.create({
    data: {
      id: 'main',
      title: 'Пластиковые окна',
      subtitle: 'Профильные системы REHAU, VEKA и WHS — от базовых до энергоэффективных',
      description:
        'Производим и устанавливаем пластиковые окна в Мурманске и области. Подберём профильную систему под ваш климат и бюджет: REHAU (Blitz New, Grazio, INTELIO 80), VEKA (Softline 82, Softline, Euroline) и WHS (WHS 60, WHS 72). Бесплатный замер, аккуратный монтаж и гарантия.',
      seoTitle: 'Пластиковые окна REHAU, VEKA и WHS в Мурманске — Территория интерьерных решений',
      seoDescription:
        'Окна ПВХ профильных систем REHAU, VEKA и WHS: характеристики, сравнение профилей, бесплатный замер и монтаж в Мурманске. Подберём профиль под климат и бюджет.',
    },
  });
  console.log('✅ Окна: созданы настройки страницы');
}

async function seedBrandsWithSystems() {
  for (const brand of BRANDS) {
    const existingBrand = await prisma.windowBrand.findUnique({ where: { slug: brand.slug } });
    const brandId =
      existingBrand?.id ??
      (
        await prisma.windowBrand.create({
          data: {
            name: brand.name,
            slug: brand.slug,
            country: brand.country,
            description: brand.description,
            sortOrder: brand.sortOrder,
          },
        })
      ).id;

    if (existingBrand) {
      await prisma.windowBrand.update({
        where: { id: brandId },
        data: {
          name: brand.name,
          country: brand.country,
          description: brand.description,
          sortOrder: brand.sortOrder,
        },
      });
    }

    for (const system of brand.systems) {
      const data = {
        brandId,
        slug: system.slug,
        name: system.name,
        tagline: system.tagline,
        description: system.description,
        chambers: system.chambers,
        mountingDepth: system.mountingDepth,
        glassUnitWidth: system.glassUnitWidth,
        thermalResistance: system.thermalResistance,
        soundInsulation: system.soundInsulation,
        characteristics: system.characteristics,
        advantages: system.advantages,
        badge: system.badge,
        sortOrder: system.sortOrder,
      };
      await prisma.windowProfileSystem.upsert({
        where: { slug: system.slug },
        create: data,
        update: data,
      });
    }
    console.log(`✅ Окна: бренд ${brand.name} — систем: ${brand.systems.length}`);
  }
}

/** Пункт меню «Окна» → /windows верхнего уровня (перед «Акции»). */
async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({ where: { name: 'Окна' } });
  if (existing) {
    if (existing.href !== '/windows') {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: { href: '/windows', hasDropdown: false },
      });
      console.log('✅ Окна: пункт меню обновлён на /windows');
    }
    return;
  }

  const all = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
  const anchor = all.find((n) => n.name === 'Акции') ?? all.find((n) => n.name === 'Блог');
  let sortOrder = all.length;
  if (anchor) {
    // Освобождаем место перед якорем, чтобы «Окна» встало туда же
    await prisma.navigationItem.updateMany({
      where: { sortOrder: { gte: anchor.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    });
    sortOrder = anchor.sortOrder;
  }
  await prisma.navigationItem.create({
    data: { name: 'Окна', href: '/windows', hasDropdown: false, sortOrder },
  });
  console.log('✅ Окна: добавлен пункт меню «Окна» → /windows');
}

async function main() {
  await seedPageSettings();
  await seedBrandsWithSystems();
  await seedNavigationItem();
  const [brands, systems] = await Promise.all([
    prisma.windowBrand.count(),
    prisma.windowProfileSystem.count(),
  ]);
  console.log(`✅ Окна: итого брендов ${brands}, профильных систем ${systems}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
