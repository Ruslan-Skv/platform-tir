import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface PhotoCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  _count?: { projects: number };
}

export interface Photo {
  id: string;
  projectId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type PhotoDisplayMode = 'grid' | 'masonry' | 'slider';

export interface PhotoProject {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  /** Дата и время показа карточки на сайте («Наши работы»); до миграции может отсутствовать */
  publishedAt?: string;
  /** Широкий экран (десктоп / планшет) */
  displayMode: PhotoDisplayMode;
  /** Узкий экран (телефон), до 768px; при отсутствии в ответе API — как `displayMode`. */
  displayModeMobile?: PhotoDisplayMode;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
  photos: Photo[];
}

export interface ProjectsResponse {
  data: PhotoProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Начальные данные для страницы «Наши работы» (SSR в App Router). */
export interface PhotoGalleryInitialData {
  projects: PhotoProject[];
  categories: PhotoCategory[];
  totalPages: number;
  page: number;
}

/**
 * Параллельная загрузка списка объектов и категорий для SSR.
 * На сервере передавайте базу из `getServerApiBaseUrl()`.
 */
export async function fetchPhotoGalleryInitialData(
  apiBaseUrl: string,
  options: { categorySlugs?: string[]; page?: number; limit?: number } = {}
): Promise<PhotoGalleryInitialData | null> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;
  const slugs = options.categorySlugs?.filter(Boolean) ?? [];
  const searchParams = new URLSearchParams();
  if (slugs.length > 0) searchParams.set('categories', slugs.join(','));
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));

  const cache = { next: { revalidate: 30 } } as const;

  try {
    const [projectsRes, categoriesRes] = await Promise.all([
      apiFetch(`${apiBaseUrl}/photo?${searchParams}`, cache),
      apiFetch(`${apiBaseUrl}/photo/categories`, { next: { revalidate: 120 } }),
    ]);
    if (!projectsRes.ok) return null;
    const projectsJson: ProjectsResponse = await projectsRes.json();
    const categoriesJson: PhotoCategory[] = categoriesRes.ok ? await categoriesRes.json() : [];
    return {
      projects: projectsJson.data,
      categories: categoriesJson,
      totalPages: projectsJson.totalPages,
      page: projectsJson.page,
    };
  } catch {
    return null;
  }
}

export async function getPhotoCategories(): Promise<PhotoCategory[]> {
  const res = await apiFetch(`${API_URL}/photo/categories`);
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json();
}

export async function getPhotoProjects(params?: {
  category?: string;
  categories?: string[];
  page?: number;
  limit?: number;
}): Promise<ProjectsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.categories && params.categories.length > 0) {
    searchParams.set('categories', params.categories.join(','));
  } else if (params?.category) {
    searchParams.set('category', params.category);
  }
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await apiFetch(`${API_URL}/photo?${searchParams}`);
  if (!res.ok) throw new Error('Не удалось загрузить объекты');
  return res.json();
}
