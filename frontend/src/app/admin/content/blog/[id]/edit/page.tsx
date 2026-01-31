import { BlogPostFormPage } from '@/pages/admin/Content/BlogPostFormPage';

interface AdminBlogEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBlogEditPage({ params }: AdminBlogEditPageProps) {
  const { id } = await params;

  return <BlogPostFormPage postId={id} />;
}
