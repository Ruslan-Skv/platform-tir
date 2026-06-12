'use client';

import { CommentsSectionPageView } from './CommentsSectionPageView';
import { useCommentsSectionPage } from './hooks/useCommentsSectionPage';

export function CommentsSectionPage() {
  const model = useCommentsSectionPage();
  return <CommentsSectionPageView model={model} />;
}
