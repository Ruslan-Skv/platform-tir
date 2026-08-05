'use client';

import { JointObjectsPageView } from './JointObjectsPageView';
import { useJointObjectsPage } from './hooks/useJointObjectsPage';

export function JointObjectsPage() {
  const model = useJointObjectsPage();
  return <JointObjectsPageView model={model} />;
}
