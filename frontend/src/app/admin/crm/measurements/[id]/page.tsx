import { redirect } from 'next/navigation';

export default async function AdminCrmMeasurementsIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/measurements/${id}`);
}
