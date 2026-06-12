'use client';

import { BlogSectionPageView } from './BlogSectionPageView';
import { useBlogSectionPage } from './hooks/useBlogSectionPage';

export function BlogSectionPage() {
  const model = useBlogSectionPage();
  return <BlogSectionPageView model={model} />;
}
