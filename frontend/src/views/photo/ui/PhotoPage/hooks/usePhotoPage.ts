'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import type { PhotoGalleryInitialData, PhotoProject, ProjectsResponse } from '@/shared/api/photo';
import { usePhotoMobileLayout } from '@/shared/lib/hooks';
import { usePhotoCategories, usePhotoProjects } from '@/shared/lib/hooks/usePhotoGallery';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

function slugsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((slug, index) => slug === sortedB[index]);
}

function toInitialProjectsResponse(initialData: PhotoGalleryInitialData): ProjectsResponse {
  return {
    data: initialData.projects,
    total: initialData.projects.length,
    totalPages: initialData.totalPages,
    page: initialData.page,
    limit: 12,
  };
}

export interface PhotoPageProps {
  initialCategorySlug?: string;
  /** Данные с сервера (RSC): сразу в разметке URL фото, без ожидания клиентского fetch. */
  initialData?: PhotoGalleryInitialData | null;
}

export function usePhotoPage({ initialCategorySlug, initialData }: PhotoPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState(() => initialData?.page ?? 1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    initialCategorySlug ? [initialCategorySlug] : []
  );
  /** Увеличенный просмотр: один лайтбокс для сетки, masonry и слайдера с листанием при нескольких фото */
  const [lightbox, setLightbox] = useState<{ project: PhotoProject; index: number } | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const isMobileLayout = usePhotoMobileLayout();

  useEffect(() => {
    setSelectedSlugs(initialCategorySlug ? [initialCategorySlug] : []);
    setCurrentPage(1);
  }, [initialCategorySlug]);

  const projectsParams = useMemo(
    () => ({
      categories: selectedSlugs.length > 0 ? selectedSlugs : undefined,
      page: currentPage,
      limit: 12,
    }),
    [selectedSlugs, currentPage]
  );

  const ssrSlugs = useMemo(
    () => (initialCategorySlug ? [initialCategorySlug] : []),
    [initialCategorySlug]
  );

  const initialProjectsData = useMemo(() => {
    if (!initialData) return undefined;
    if (!slugsEqual(selectedSlugs, ssrSlugs)) return undefined;
    if (currentPage !== (initialData.page ?? 1)) return undefined;
    return toInitialProjectsResponse(initialData);
  }, [initialData, selectedSlugs, ssrSlugs, currentPage]);

  const { data: projectsResponse, isLoading: projectsLoading } = usePhotoProjects(projectsParams, {
    initialData: initialProjectsData,
  });
  const { data: categories = [] } = usePhotoCategories({
    initialData: initialData?.categories,
  });

  const projects = projectsResponse?.data ?? [];
  const totalPages = projectsResponse?.totalPages ?? 1;
  const showProjectsLoading = projectsLoading && projects.length === 0;

  const toggleCategorySlug = useCallback((slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      return [...prev, slug];
    });
    setCurrentPage(1);
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setSelectedSlugs([]);
    setCurrentPage(1);
    if (pathname !== '/photo') {
      router.push('/photo');
    }
  }, [pathname, router]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const lightboxGoPrev = useCallback(() => {
    setLightbox((lb) => {
      if (!lb || lb.project.photos.length < 2) return lb;
      const n = lb.project.photos.length;
      return { ...lb, index: (lb.index - 1 + n) % n };
    });
  }, []);

  const lightboxGoNext = useCallback(() => {
    setLightbox((lb) => {
      if (!lb || lb.project.photos.length < 2) return lb;
      const n = lb.project.photos.length;
      return { ...lb, index: (lb.index + 1) % n };
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (lightbox.project.photos.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        lightboxGoPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        lightboxGoNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, closeLightbox, lightboxGoPrev, lightboxGoNext]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getImageUrl = (url: string) => publicUploadUrl(url);

  return {
    currentPage,
    selectedSlugs,
    lightbox,
    setLightbox,
    categoriesExpanded,
    setCategoriesExpanded,
    isMobileLayout,
    projects,
    totalPages,
    showProjectsLoading,
    categories,
    toggleCategorySlug,
    clearCategoryFilters,
    closeLightbox,
    lightboxGoPrev,
    lightboxGoNext,
    handlePageChange,
    getImageUrl,
  };
}

export type PhotoPageModel = ReturnType<typeof usePhotoPage>;
