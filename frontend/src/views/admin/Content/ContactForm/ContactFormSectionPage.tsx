'use client';

import { ContactFormSectionPageView } from './ContactFormSectionPageView';
import { useContactFormSectionPage } from './hooks/useContactFormSectionPage';

export function ContactFormSectionPage() {
  const model = useContactFormSectionPage();
  return <ContactFormSectionPageView model={model} />;
}
