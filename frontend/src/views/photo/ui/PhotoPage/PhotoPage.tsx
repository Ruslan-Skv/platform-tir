'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { PhotoCategory, PhotoGalleryInitialData, PhotoProject } from '@/shared/api/photo';
import { getPhotoCategories, getPhotoProjects } from '@/shared/api/photo';
import { usePhotoMobileLayout } from '@/shared/lib/hooks';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './PhotoPage.module.css';
import { PhotoProjectSlider } from './PhotoProjectSlider';

/** Сколько первых превью на странице грузить сразу (остальные — lazy). */
const EAGER_IMAGE_COUNT = 18;

const photoProjectPublishedFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatPhotoProjectPublishedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : photoProjectPublishedFormatter.format(d);
}

interface PhotoPageProps {
  initialCategorySlug?: string;
  /** Данные с сервера (RSC): сразу в разметке URL фото, без ожидания клиентского fetch. */
  initialData?: PhotoGalleryInitialData | null;
}

export const PhotoPage: React.FC<PhotoPageProps> = ({ initialCategorySlug, initialData }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<PhotoProject[]>(() => initialData?.projects ?? []);
  const [categories, setCategories] = useState<PhotoCategory[]>(
    () => initialData?.categories ?? []
  );
  const [loading, setLoading] = useState(() => initialData == null);
  const [totalPages, setTotalPages] = useState(() => initialData?.totalPages ?? 1);
  const [currentPage, setCurrentPage] = useState(() => initialData?.page ?? 1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    initialCategorySlug ? [initialCategorySlug] : []
  );
  /** Увеличенный просмотр: один лайтбокс для сетки, masonry и слайдера с листанием при нескольких фото */
  const [lightbox, setLightbox] = useState<{ project: PhotoProject; index: number } | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  /** Пропустить первый клиентский fetch, если начальные данные уже пришли с SSR. */
  const skipInitialClientFetchRef = useRef(initialData != null);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const isMobileLayout = usePhotoMobileLayout();

  useEffect(() => {
    setSelectedSlugs(initialCategorySlug ? [initialCategorySlug] : []);
    setCurrentPage(1);
  }, [initialCategorySlug]);

  const loadProjects = useCallback(async () => {
    const blocking = projectsRef.current.length === 0;
    if (blocking) setLoading(true);
    try {
      const res = await getPhotoProjects({
        categories: selectedSlugs.length > 0 ? selectedSlugs : undefined,
        page: currentPage,
        limit: 12,
      });
      setProjects(res.data);
      setTotalPages(res.totalPages);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedSlugs]);

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

  useEffect(() => {
    if (skipInitialClientFetchRef.current) {
      skipInitialClientFetchRef.current = false;
      return;
    }
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (initialData != null) return;
    getPhotoCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [initialData]);

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

  const renderProjectPhotos = (project: PhotoProject, globalPhotoOffset: number) => {
    const photos = project.photos ?? [];
    if (photos.length === 0) return null;

    const desktopMode = project.displayMode ?? 'grid';
    const mobileMode = project.displayModeMobile ?? desktopMode;
    const mode = isMobileLayout ? mobileMode : desktopMode;
    const layoutKey = `${project.id}-${isMobileLayout ? 'm' : 'd'}-${mode}`;

    const imgAttrs = (localIndex: number) => {
      const g = globalPhotoOffset + localIndex;
      const eager = g < EAGER_IMAGE_COUNT;
      return {
        loading: eager ? ('eager' as const) : ('lazy' as const),
        fetchPriority: g < 4 ? ('high' as const) : undefined,
      };
    };

    if (mode === 'slider') {
      return (
        <PhotoProjectSlider
          key={layoutKey}
          project={project}
          photos={photos}
          layoutKey={layoutKey}
          globalPhotoOffset={globalPhotoOffset}
          getImageUrl={getImageUrl}
          imgAttrs={imgAttrs}
          onOpenLightbox={(index) => setLightbox({ project, index })}
        />
      );
    }

    if (mode === 'masonry') {
      return (
        <div key={layoutKey} className={styles.masonry}>
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              className={styles.masonryItem}
              onClick={() => setLightbox({ project, index: i })}
            >
              <img src={getImageUrl(photo.imageUrl)} alt="" {...imgAttrs(i)} decoding="async" />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div key={layoutKey} className={styles.grid}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className={styles.gridItem}
            onClick={() => setLightbox({ project, index: i })}
          >
            <img src={getImageUrl(photo.imageUrl)} alt="" {...imgAttrs(i)} decoding="async" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.photoPage}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>Наши работы</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Фото наших работ</h1>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <div
            className={`${styles.sidebarSection} ${!categoriesExpanded ? styles.sidebarSectionCollapsed : ''}`}
          >
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle} id="photo-categories-heading">
                Категории
              </h3>
              <button
                type="button"
                className={styles.sidebarToggle}
                onClick={() => setCategoriesExpanded((v) => !v)}
                aria-expanded={categoriesExpanded}
                aria-controls="photo-categories-list"
                aria-label={
                  categoriesExpanded ? 'Свернуть список категорий' : 'Развернуть список категорий'
                }
              >
                <ChevronDownIcon
                  className={`${styles.sidebarToggleIcon} ${
                    categoriesExpanded ? styles.sidebarToggleIconExpanded : ''
                  }`}
                  aria-hidden
                />
              </button>
            </div>
            <div className={styles.categoryListWrap} data-expanded={categoriesExpanded}>
              <ul
                id="photo-categories-list"
                className={styles.categoryList}
                aria-labelledby="photo-categories-heading"
              >
                <li>
                  <button
                    type="button"
                    className={`${styles.categoryItem} ${selectedSlugs.length === 0 ? styles.active : ''}`}
                    onClick={clearCategoryFilters}
                  >
                    Все объекты
                  </button>
                </li>
                {categories.map((cat) => {
                  const checked = selectedSlugs.includes(cat.slug);
                  return (
                    <li key={cat.id}>
                      <label className={styles.categoryOption}>
                        <input
                          id={`photo-category-${cat.id}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategorySlug(cat.slug)}
                        />
                        <span className={styles.categoryOptionText}>
                          {cat.name}
                          {cat._count?.projects != null && (
                            <span className={styles.categoryCount}>({cat._count.projects})</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : projects.length === 0 ? (
            <div className={styles.empty}>
              <p>Объектов пока нет.</p>
            </div>
          ) : (
            <>
              <div className={styles.projectsList}>
                {projects.map((project, projectIdx) => {
                  const offset = projects
                    .slice(0, projectIdx)
                    .reduce((n, p) => n + (p.photos?.length ?? 0), 0);
                  return (
                    <article key={project.id} className={styles.projectCard}>
                      <h2 className={styles.projectTitle}>{project.title}</h2>
                      {(project.publishedAt ?? project.createdAt) ? (
                        <p className={styles.projectPublishedAt} lang="ru">
                          <time dateTime={project.publishedAt ?? project.createdAt}>
                            {formatPhotoProjectPublishedAt(
                              project.publishedAt ?? project.createdAt
                            )}
                          </time>
                        </p>
                      ) : null}
                      {renderProjectPhotos(project, offset)}
                      {project.description && (
                        <p className={styles.projectDescription} lang="ru">
                          {project.description}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Пагинация">
                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    ← Назад
                  </button>
                  <span className={styles.paginationInfo}>
                    Страница {currentPage} из {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Вперёд →
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      {lightbox &&
        lightbox.project.photos.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.lightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
            onClick={closeLightbox}
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.lightboxFigure}>
                <img
                  src={getImageUrl(lightbox.project.photos[lightbox.index].imageUrl)}
                  alt={lightbox.project.title}
                />
                {lightbox.project.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.lightboxArrow}
                      data-side="prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        lightboxGoPrev();
                      }}
                      aria-label="Предыдущее фото"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className={styles.lightboxArrow}
                      data-side="next"
                      onClick={(e) => {
                        e.stopPropagation();
                        lightboxGoNext();
                      }}
                      aria-label="Следующее фото"
                    >
                      ›
                    </button>
                    <span className={styles.lightboxCounter}>
                      {lightbox.index + 1} / {lightbox.project.photos.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
