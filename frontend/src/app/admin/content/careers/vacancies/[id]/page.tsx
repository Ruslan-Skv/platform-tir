import { CareerVacancyEditPageView } from '@/views/admin/Content/Careers/CareerVacancyEditPageView';

type EditCareerVacancyAdminPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCareerVacancyAdminPage({
  params,
}: EditCareerVacancyAdminPageProps) {
  const { id } = await params;
  return <CareerVacancyEditPageView vacancyId={id} />;
}
