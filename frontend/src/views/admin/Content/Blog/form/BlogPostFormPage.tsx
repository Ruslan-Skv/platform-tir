'use client';

import { BlogPostFormPageView } from './BlogPostFormPageView';
import type { BlogPostFormPageProps } from './blog-post-form-page.types';
import { useBlogPostFormPage } from './hooks/useBlogPostFormPage';

export type { BlogPostFormPageProps } from './blog-post-form-page.types';

export function BlogPostFormPage(props: BlogPostFormPageProps) {
  const model = useBlogPostFormPage(props);
  return <BlogPostFormPageView model={model} />;
}
