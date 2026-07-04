import { notFound } from 'next/navigation';

import { loadPublicMission } from '@/features/mission/load-mission-config';
import { MissionPageView } from '@/views/site/mission/MissionPageView';

export default async function MissionPage() {
  const page = await loadPublicMission();
  if (!page) {
    notFound();
  }

  return <MissionPageView page={page} />;
}

export async function generateMetadata() {
  const page = await loadPublicMission();
  const title = page?.pageTitle ?? 'Миссия компании';

  return {
    title: `${title} | Территория интерьерных решений`,
    description:
      page?.introText?.slice(0, 160) ??
      page?.content?.slice(0, 160) ??
      'Миссия компании «Территория интерьерных решений» в Мурманске.',
  };
}
