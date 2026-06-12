'use client';

import { FormSubmissionsPageView } from './FormSubmissionsPageView';
import { useFormSubmissionsPage } from './hooks/useFormSubmissionsPage';

export function FormSubmissionsPage() {
  const model = useFormSubmissionsPage();
  return <FormSubmissionsPageView model={model} />;
}
