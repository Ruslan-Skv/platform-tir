'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useBlogCategories, useBlogPosts, useBlogTagStats } from '@/shared/lib/hooks/useBlogList';

function buildListUrl(
  pathname: string,
  opts: { search?: string; tag?: string | null; page?: number }
): string {
  const p = new URLSearchParams();
  if (opts.search?.trim()) p.set('search', opts.search.trim());
  if (opts.tag?.trim()) p.set('tag', opts.tag.trim());
  if (opts.page && opts.page > 1) p.set('page', String(opts.page));
  const q = p.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function useBlogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tagFilter = searchParams.get('tag');
  const searchFromUrl = searchParams.get('search') ?? '';
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  const postsParams = useMemo(
    () => ({
      category: selectedCategory || undefined,
      search: searchFromUrl.trim() || undefined,
      tag: tagFilter || undefined,
      page: pageFromUrl,
      limit: 12,
    }),
    [selectedCategory, searchFromUrl, tagFilter, pageFromUrl]
  );

  const { data: postsResponse, isLoading: postsLoading } = useBlogPosts(postsParams);
  const { data: categories = [] } = useBlogCategories();
  const { data: tagStats = [] } = useBlogTagStats();

  const posts = postsResponse?.data ?? [];
  const totalPages = postsResponse?.totalPages ?? 1;
  const showPostsLoading = postsLoading && posts.length === 0;

  const handlePageChange = (page: number) => {
    const url = buildListUrl(pathname, {
      search: search.trim() || undefined,
      tag: tagFilter,
      page: page > 1 ? page : undefined,
    });
    router.push(url, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = buildListUrl(pathname, {
      search: search.trim() || undefined,
      tag: tagFilter,
    });
    router.push(url);
  };

  const handleCategoryClick = (slug: string | null) => {
    setSelectedCategory(slug);
    const url = buildListUrl(pathname, {
      search: search.trim() || undefined,
      tag: tagFilter,
    });
    router.push(url);
  };

  const clearTagFilter = () => {
    const url = buildListUrl(pathname, {
      search: search.trim() || undefined,
      tag: null,
    });
    router.push(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const emptyMessage =
    tagFilter || search.trim()
      ? 'Ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.'
      : 'Записей пока нет.';

  return {
    pathname,
    tagFilter,
    pageFromUrl,
    selectedCategory,
    search,
    setSearch,
    categories,
    tagStats,
    posts,
    totalPages,
    showPostsLoading,
    emptyMessage,
    handlePageChange,
    handleSearchSubmit,
    handleCategoryClick,
    clearTagFilter,
    formatDate,
    buildListUrl,
  };
}

export type BlogPageModel = ReturnType<typeof useBlogPage>;
