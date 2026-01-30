import Link from 'next/link';

const sections = [
  {
    title: 'Первый блок',
    description: 'Слайдер, заголовки и преимущества в шапке главной страницы',
    href: '/admin/content/hero',
  },
  {
    title: 'Наши направления',
    description: 'Направления деятельности с изображениями',
    href: '/admin/content/directions',
  },
  {
    title: 'Почему выбирают нас',
    description: 'Блок с преимуществами компании',
    href: '/admin/content/advantages',
  },
  {
    title: 'Комплексные решения',
    description: 'Услуги и тарифы',
    href: '/admin/content/services',
  },
  {
    title: 'Популярные товары',
    description: 'Заголовок, подзаголовок и количество товаров',
    href: '/admin/content/featured-products',
  },
];

export default function AdminContentHomePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Главная страница</h1>
        <p className="text-gray-600 mt-1">Управление секциями главной страницы сайта</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block p-5 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
