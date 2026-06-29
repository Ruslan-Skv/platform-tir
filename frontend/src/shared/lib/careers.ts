export interface CareersPageInfo {
  pageTitle: string;
  introText: string | null;
  isPublished: boolean;
}

export interface CareerVacancyInfo {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  conditions: string | null;
  contactEmail: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface PublicCareersData {
  page: CareersPageInfo | null;
  vacancies: CareerVacancyInfo[];
}

export function formatCareerText(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
}
