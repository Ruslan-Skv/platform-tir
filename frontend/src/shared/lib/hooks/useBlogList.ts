'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  type BlogPostsResponse,
  getBlogCategories,
  getBlogPosts,
  getBlogTagStats,
} from '@/shared/api/blog';

export type BlogPostsQueryParams = {
  category?: string;
  search?: string;
  tag?: string;
  page: number;
  limit: number;
};

export const blogPostsQueryKey = (params: BlogPostsQueryParams) =>
  ['blog', 'posts', params] as const;

export const BLOG_CATEGORIES_QUERY_KEY = ['blog', 'categories'] as const;
export const BLOG_TAG_STATS_QUERY_KEY = ['blog', 'tagStats'] as const;

const BLOG_STALE_TIME = 60_000;
const BLOG_GC_TIME = 5 * 60_000;

export function useBlogPosts(params: BlogPostsQueryParams) {
  return useQuery<BlogPostsResponse>({
    queryKey: blogPostsQueryKey(params),
    queryFn: () => getBlogPosts(params),
    staleTime: BLOG_STALE_TIME,
    gcTime: BLOG_GC_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: BLOG_CATEGORIES_QUERY_KEY,
    queryFn: getBlogCategories,
    staleTime: BLOG_STALE_TIME,
    gcTime: BLOG_GC_TIME,
  });
}

export function useBlogTagStats() {
  return useQuery({
    queryKey: BLOG_TAG_STATS_QUERY_KEY,
    queryFn: getBlogTagStats,
    staleTime: BLOG_STALE_TIME,
    gcTime: BLOG_GC_TIME,
  });
}
