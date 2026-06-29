import { loadPublicCareers } from '@/features/careers/load-careers-config';
import { CareersPageView } from '@/views/site/careers/CareersPageView';

export default async function CareersPage() {
  const data = await loadPublicCareers();
  return <CareersPageView data={data} />;
}

export function generateMetadata() {
  return {
    title: 'Вакансии | Территория интерьерных решений',
    description:
      'Актуальные вакансии в компании «Территория интерьерных решений» в Мурманске. Присоединяйтесь к нашей команде.',
  };
}
