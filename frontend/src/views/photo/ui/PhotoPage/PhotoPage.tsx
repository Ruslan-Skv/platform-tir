'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { PhotoCategory, PhotoProject } from '@/shared/api/photo';
import { getPhotoCategories, getPhotoProjects } from '@/shared/api/photo';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './PhotoPage.module.css';

interface PhotoPageProps {
  initialCategorySlug?: string;
}

export const PhotoPage: React.FC<PhotoPageProps> = ({ initialCategorySlug }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<PhotoProject[]>([]);
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    initialCategorySlug ? [initialCategorySlug] : []
  );
  /** Увеличенный просмотр: один лайтбокс для сетки, masonry и слайдера с листанием при нескольких фото */
  const [lightbox, setLightbox] = useState<{ project: PhotoProject; index: number } | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  useEffect(() => {
    setSelectedSlugs(initialCategorySlug ? [initialCategorySlug] : []);
    setCurrentPage(1);
  }, [initialCategorySlug]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
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
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    getPhotoCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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

  const renderProjectPhotos = (project: PhotoProject) => {
    const photos = project.photos ?? [];
    if (photos.length === 0) return null;

    const mode = project.displayMode ?? 'grid';

    if (mode === 'slider') {
      return (
        <div className={styles.sliderWrapper}>
          <div className={styles.slider}>
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                className={styles.sliderPhoto}
                onClick={() => setLightbox({ project, index: i })}
              >
                <img src={getImageUrl(photo.imageUrl)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className={styles.sliderDots}>
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.sliderDot} ${i === 0 ? styles.active : ''}`}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        </div>
      );
    }

    if (mode === 'masonry') {
      return (
        <div className={styles.masonry}>
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              className={styles.masonryItem}
              onClick={() => setLightbox({ project, index: i })}
            >
              <img src={getImageUrl(photo.imageUrl)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className={styles.grid}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className={styles.gridItem}
            onClick={() => setLightbox({ project, index: i })}
          >
            <img src={getImageUrl(photo.imageUrl)} alt="" loading="lazy" />
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
                {projects.map((project) => (
                  <article key={project.id} className={styles.projectCard}>
                    <h2 className={styles.projectTitle}>{project.title}</h2>
                    {renderProjectPhotos(project)}
                    {project.description && (
                      <p className={styles.projectDescription} lang="ru">
                        {project.description}
                      </p>
                    )}
                  </article>
                ))}
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

      {lightbox && lightbox.project.photos.length > 0 && (
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
        </div>
      )}
    </div>
  );
};
