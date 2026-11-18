import { fetchWindowsSection } from '@/shared/api/windows';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { WindowsPage } from '@/views/windows/ui/WindowsPage/WindowsPage';

export const revalidate = 60;

export default async function WindowsRoutePage() {
  const initialData = await fetchWindowsSection(getServerApiBaseUrl());
  return <WindowsPage initialData={initialData} />;
}

export async function generateMetadata() {
  const data = await fetchWindowsSection(getServerApiBaseUrl());
  const settings = data?.settings;
  return {
    title: settings?.seoTitle || settings?.title || 'Пластиковые окна',
    description:
      settings?.seoDescription ||
      settings?.description ||
      'Пластиковые окна профильных систем REHAU, VEKA и WHS: характеристики, сравнение профилей, бесплатный замер и монтаж.',
  };
}
