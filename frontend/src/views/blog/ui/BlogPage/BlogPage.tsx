'use client';

import { BlogPageView } from './BlogPageView';
import { useBlogPage } from './hooks/useBlogPage';

export function BlogPage() {
  const model = useBlogPage();
  return <BlogPageView model={model} />;
}
