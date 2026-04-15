'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { PhotoCategory, PhotoProject } from '@/shared/api/photo';
import { getPhotoCategories, getPhotoProjects } from '@/shared/api/photo';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './PhotoPage.module.css';

interface PhotoPageProps {
  initialCategorySlug?: string;
}

export const PhotoPage: React.FC<PhotoPageProps> = ({ initialCategorySlug }) => {
  const [projects, setProjects] = useState<PhotoProject[]>([]);
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategorySlug ?? null
  );
  /** Увеличенный просмотр: один лайтбокс для сетки, masonry и слайдера с листанием при нескольких фото */
  const [lightbox, setLightbox] = useState<{ project: PhotoProject; index: number } | null>(null);

  useEffect(() => {
    setSelectedCategory(initialCategorySlug ?? null);
    setCurrentPage(1);
  }, [initialCategorySlug]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPhotoProjects({
        category: selectedCategory || undefined,
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
  }, [currentPage, selectedCategory]);

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
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Категории</h3>
            <ul className={styles.categoryList}>
              <li>
                <Link
                  href="/photo"
                  className={`${styles.categoryItem} ${!selectedCategory ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setCurrentPage(1);
                  }}
                >
                  Все объекты
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/photo/${cat.slug}`}
                    className={`${styles.categoryItem} ${
                      selectedCategory === cat.slug ? styles.active : ''
                    }`}
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setCurrentPage(1);
                    }}
                  >
                    {cat.name}
                    {cat._count?.projects != null && (
                      <span className={styles.categoryCount}>({cat._count.projects})</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
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
                      <p className={styles.projectDescription}>{project.description}</p>
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
