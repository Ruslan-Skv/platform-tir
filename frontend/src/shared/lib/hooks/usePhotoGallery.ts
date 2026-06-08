'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type ProjectsResponse, getPhotoCategories, getPhotoProjects } from '@/shared/api/photo';

export type PhotoProjectsQueryParams = {
  categories?: string[];
  page: number;
  limit: number;
};

export const photoProjectsQueryKey = (params: PhotoProjectsQueryParams) =>
  ['photo', 'projects', params] as const;

export const PHOTO_CATEGORIES_QUERY_KEY = ['photo', 'categories'] as const;

const PHOTO_STALE_TIME = 60_000;
const PHOTO_GC_TIME = 5 * 60_000;

export function usePhotoProjects(
  params: PhotoProjectsQueryParams,
  options?: { initialData?: ProjectsResponse }
) {
  return useQuery<ProjectsResponse>({
    queryKey: photoProjectsQueryKey(params),
    queryFn: () =>
      getPhotoProjects({
        categories: params.categories,
        page: params.page,
        limit: params.limit,
      }),
    initialData: options?.initialData,
    staleTime: PHOTO_STALE_TIME,
    gcTime: PHOTO_GC_TIME,
    placeholderData: keepPreviousData,
  });
}

export function usePhotoCategories(options?: {
  initialData?: Awaited<ReturnType<typeof getPhotoCategories>>;
}) {
  return useQuery({
    queryKey: PHOTO_CATEGORIES_QUERY_KEY,
    queryFn: getPhotoCategories,
    initialData: options?.initialData,
    staleTime: PHOTO_STALE_TIME,
    gcTime: PHOTO_GC_TIME,
  });
}
