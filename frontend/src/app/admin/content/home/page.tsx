import { HomeSectionsSection } from '@/pages/admin/Content/HomeSectionsSection';

export default function AdminContentHomePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          Главная страница
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
          Управление секциями главной страницы сайта
        </p>
      </header>

      <HomeSectionsSection />
    </div>
  );
}
