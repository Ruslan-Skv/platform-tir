'use client';

import { BlogPostPageView } from './BlogPostPageView';
import { useBlogPostPage } from './hooks/useBlogPostPage';

interface BlogPostPageProps {
  slug: string;
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const model = useBlogPostPage({ slug });
  return <BlogPostPageView model={model} />;
}
