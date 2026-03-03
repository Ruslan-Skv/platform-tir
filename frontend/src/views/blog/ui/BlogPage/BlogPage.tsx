'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type BlogCategory,
  type BlogPost,
  getBlogCategories,
  getBlogPosts,
} from '@/shared/api/blog';

import styles from './BlogPage.module.css';

export const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBlogPosts({
        category: selectedCategory || undefined,
        search: search || undefined,
        page: currentPage,
        limit: 12,
      });
      setPosts(res.data);
      setTotalPages(res.totalPages);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    getBlogCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getAuthorName = (post: BlogPost) => {
    const { firstName, lastName } = post.author;
    return [firstName, lastName].filter(Boolean).join(' ') || 'Автор';
  };

  return (
    <div className={styles.blogPage}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>Блог</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Блог</h1>
        <p className={styles.subtitle}>
          Полезные статьи, советы и новости от Территории интерьерных решений
        </p>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Категории</h3>
            <ul className={styles.categoryList}>
              <li>
                <button
                  type="button"
                  className={`${styles.categoryItem} ${!selectedCategory ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setCurrentPage(1);
                  }}
                >
                  Все записи
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`${styles.categoryItem} ${selectedCategory === cat.slug ? styles.active : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setCurrentPage(1);
                    }}
                  >
                    {cat.name}
                    {cat._count?.posts != null && (
                      <span className={styles.categoryCount}>({cat._count.posts})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Поиск</h3>
            <form
              className={styles.searchForm}
              onSubmit={(e) => {
                e.preventDefault();
                setCurrentPage(1);
                loadPosts();
              }}
            >
              <input
                type="search"
                placeholder="Поиск по блогу..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Найти
              </button>
            </form>
          </div>
        </aside>

        <main className={styles.main}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <p>Записей пока нет.</p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {posts.map((post) => (
                  <article key={post.id} className={styles.card}>
                    <Link href={`/blog/${post.slug}`} className={styles.cardLink}>
                      {post.featuredImage ? (
                        <div className={styles.cardImage}>
                          <img src={post.featuredImage} alt="" />
                        </div>
                      ) : (
                        <div className={styles.cardImagePlaceholder} />
                      )}
                      <div className={styles.cardContent}>
                        {post.category && (
                          <span className={styles.cardCategory}>{post.category.name}</span>
                        )}
                        <h2 className={styles.cardTitle}>{post.title}</h2>
                        {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                        <div className={styles.cardMeta}>
                          <span>{getAuthorName(post)}</span>
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          {post.likeCount != null && post.likeCount > 0 && (
                            <span>❤️ {post.likeCount}</span>
                          )}
                        </div>
                      </div>
                    </Link>
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
    </div>
  );
};
