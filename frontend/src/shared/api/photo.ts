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

export interface PhotoProject {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  displayMode: 'grid' | 'masonry' | 'slider';
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

export async function getPhotoCategories(): Promise<PhotoCategory[]> {
  const res = await fetch(`${API_URL}/photo/categories`);
  if (!res.ok) throw new Error('Не удалось загрузить категории');
  return res.json();
}

export async function getPhotoProjects(params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<ProjectsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/photo?${searchParams}`);
  if (!res.ok) throw new Error('Не удалось загрузить объекты');
  return res.json();
}
