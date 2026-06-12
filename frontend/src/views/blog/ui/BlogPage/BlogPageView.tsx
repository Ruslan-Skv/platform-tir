'use client';

import Link from 'next/link';

import styles from './BlogPage.module.css';
import type { BlogPageModel } from './hooks/useBlogPage';

type BlogPageViewProps = {
  model: BlogPageModel;
};

export function BlogPageView({ model }: BlogPageViewProps) {
  const {
    pathname,
    tagFilter,
    pageFromUrl,
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
    selectedCategory,
  } = model;

  return (
    <div className={styles.blogPage}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>Полезные статьи</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Полезные статьи</h1>
        <p className={styles.subtitle}>Советы и материалы от Территории интерьерных решений</p>
      </header>

      {tagFilter ? (
        <div className={styles.activeFilters} role="status">
          <span className={styles.activeFilterLabel}>
            Фильтр по тегу: <strong>{tagFilter}</strong>
          </span>
          <button type="button" className={styles.filterReset} onClick={clearTagFilter}>
            Сбросить тег
          </button>
        </div>
      ) : null}

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Категории</h3>
            <ul className={styles.categoryList}>
              <li>
                <button
                  type="button"
                  className={`${styles.categoryItem} ${!selectedCategory ? styles.active : ''}`}
                  onClick={() => handleCategoryClick(null)}
                >
                  Все записи
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`${styles.categoryItem} ${selectedCategory === cat.slug ? styles.active : ''}`}
                    onClick={() => handleCategoryClick(cat.slug)}
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
            <h3 className={styles.sidebarTitle}>Теги</h3>
            {tagStats.length === 0 ? (
              <p className={styles.tagSidebarEmpty}>
                Теги появятся после публикации статей с метками.
              </p>
            ) : (
              <ul className={styles.tagList}>
                {tagStats.map(({ tag, count }) => (
                  <li key={tag}>
                    <Link
                      href={buildListUrl(pathname, { tag, search: search.trim() || undefined })}
                      className={`${styles.tagItem} ${tagFilter === tag ? styles.tagItemActive : ''}`}
                    >
                      <span className={styles.tagItemLabel}>{tag}</span>
                      <span className={styles.tagItemCount}>{count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Поиск</h3>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder="Поиск по статьям и тегам…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Найти
              </button>
            </form>
            <p className={styles.searchHint}>
              Ищет по заголовку, тексту, краткому описанию и по вхождению в теги.
            </p>
          </div>
        </aside>

        <main className={styles.main}>
          {showPostsLoading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <p>{emptyMessage}</p>
              {(tagFilter || search.trim()) && (
                <Link href={pathname} className={styles.emptyResetLink}>
                  Показать все записи
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {posts.map((post) => (
                  <article key={post.id} className={styles.card}>
                    <Link href={`/blog/${post.slug}`} className={styles.cardLink}>
                      {post.featuredImage ? (
                        <div className={styles.cardImage}>
                          <img
                            src={post.featuredImage}
                            alt={post.featuredImageAlt?.trim() || post.title}
                          />
                        </div>
                      ) : (
                        <div className={styles.cardImagePlaceholder} />
                      )}
                      <div className={styles.cardContent}>
                        {post.category && (
                          <span className={styles.cardCategory}>{post.category.name}</span>
                        )}
                        <h2 className={styles.cardTitle}>
                          {post.badge?.trim() && (
                            <span className={styles.cardBadge}>{post.badge.trim()}</span>
                          )}
                          {post.title}
                        </h2>
                        {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                        <div className={styles.cardMeta}>
                          {post.authorByline?.trim() ? (
                            <span>{post.authorByline.trim()}</span>
                          ) : null}
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
                            <span>{post.readingTimeMinutes} мин чтения</span>
                          )}
                          {post.likeCount != null && post.likeCount > 0 && (
                            <span>❤️ {post.likeCount}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    {post.tags && post.tags.length > 0 ? (
                      <div className={styles.cardTags} onClick={(e) => e.stopPropagation()}>
                        {post.tags.slice(0, 6).map((t) => (
                          <Link
                            key={t}
                            href={buildListUrl(pathname, {
                              tag: t,
                              search: search.trim() || undefined,
                            })}
                            className={styles.cardTag}
                          >
                            {t}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Пагинация">
                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={pageFromUrl <= 1}
                    onClick={() => handlePageChange(pageFromUrl - 1)}
                  >
                    ← Назад
                  </button>
                  <span className={styles.paginationInfo}>
                    Страница {pageFromUrl} из {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={pageFromUrl >= totalPages}
                    onClick={() => handlePageChange(pageFromUrl + 1)}
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
}
