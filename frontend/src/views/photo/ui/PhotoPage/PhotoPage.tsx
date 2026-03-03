'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { Photo, PhotoCategory, PhotoProject } from '@/shared/api/photo';
import { getPhotoCategories, getPhotoProjects } from '@/shared/api/photo';

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
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [sliderProject, setSliderProject] = useState<PhotoProject | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

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
                onClick={() => {
                  setSliderProject(project);
                  setSliderIndex(i);
                }}
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
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </div>
      );
    }

    if (mode === 'masonry') {
      return (
        <div className={styles.masonry}>
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={styles.masonryItem}
              onClick={() => setLightboxPhoto(photo)}
            >
              <img src={getImageUrl(photo.imageUrl)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className={styles.grid}>
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className={styles.gridItem}
            onClick={() => setLightboxPhoto(photo)}
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
            <span className={styles.current}>Фото</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Фото наших работ</h1>
        <p className={styles.subtitle}>
          Примеры выполненных проектов: ремонт, мебель, двери, окна и многое другое
        </p>
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
                    {project.description && (
                      <p className={styles.projectDescription}>{project.description}</p>
                    )}
                    {renderProjectPhotos(project)}
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

      {lightboxPhoto && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightboxPhoto(null)}
            aria-label="Закрыть"
          >
            ×
          </button>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={getImageUrl(lightboxPhoto.imageUrl)} alt="Фото" />
          </div>
        </div>
      )}

      {sliderProject && sliderProject.photos.length > 0 && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Слайдер фото"
          onClick={() => setSliderProject(null)}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setSliderProject(null)}
            aria-label="Закрыть"
          >
            ×
          </button>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={getImageUrl(sliderProject.photos[sliderIndex].imageUrl)}
              alt={sliderProject.title}
            />
            {sliderProject.photos.length > 1 && (
              <div className={styles.lightboxNav}>
                <button
                  type="button"
                  className={styles.lightboxNavBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSliderIndex((i) => (i === 0 ? sliderProject.photos.length - 1 : i - 1));
                  }}
                >
                  ←
                </button>
                <span className={styles.lightboxNavInfo}>
                  {sliderIndex + 1} / {sliderProject.photos.length}
                </span>
                <button
                  type="button"
                  className={styles.lightboxNavBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSliderIndex((i) => (i === sliderProject.photos.length - 1 ? 0 : i + 1));
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
