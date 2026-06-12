'use client';

import Link from 'next/link';

import type { BlogContentAlign } from '@/shared/api/blog';

import { BlogPostBlocksEditor } from '../shared/BlogPostBlocksEditor';
import { BlogPostEditor } from '../shared/BlogPostEditor';
import styles from './BlogPostFormPage.module.css';
import type { BlogPostFormPageModel } from './hooks/useBlogPostFormPage';

type BlogPostFormPageViewProps = {
  model: BlogPostFormPageModel;
};

export function BlogPostFormPageView({ model }: BlogPostFormPageViewProps) {
  const {
    postId,
    loading,
    saving,
    message,
    categories,
    newBadgeLabel,
    setNewBadgeLabel,
    addingBadge,
    uploadingFeatured,
    featuredFileInputRef,
    title,
    slug,
    setSlug,
    content,
    setContent,
    contentAlign,
    setContentAlign,
    useBlocks,
    blocks,
    setBlocks,
    excerpt,
    setExcerpt,
    featuredImage,
    setFeaturedImage,
    status,
    setStatus,
    categoryId,
    setCategoryId,
    tags,
    setTags,
    seoTitle,
    setSeoTitle,
    seoDescription,
    setSeoDescription,
    featuredImageAlt,
    setFeaturedImageAlt,
    badge,
    setBadge,
    sortOrder,
    setSortOrder,
    authorByline,
    setAuthorByline,
    readingTimePreview,
    presetLabels,
    badgeSelectOptions,
    showMessage,
    handleAddBadgePreset,
    handleFeaturedFileChange,
    handleTitleChange,
    handleSeoAutofill,
    handleUseBlocksChange,
    handleSubmit,
  } = model;

  if (loading) {
    return (
      <div className={styles.blogPostFormPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.blogPostFormPage}>
      <div className={styles.header}>
        <Link href="/admin/content/blog" className={styles.backLink}>
          ← К списку статей
        </Link>
        <h1 className={styles.title}>{postId ? 'Редактирование статьи' : 'Новая статья'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <label className={styles.label}>
            Заголовок *
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={styles.input}
              required
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Slug *
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={styles.input}
              required
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={useBlocks}
              onChange={(e) => handleUseBlocksChange(e.target.checked)}
            />
            <span>Разбить статью на блоки с фотоматериалами (в каждом блоке — текст и фото)</span>
          </label>
        </div>

        {useBlocks ? (
          <div className={styles.row}>
            <label className={styles.label}>
              Блоки статьи *
              <BlogPostBlocksEditor
                blocks={blocks}
                onChange={setBlocks}
                onError={(msg) => showMessage('error', msg)}
              />
              <span className={styles.fieldHint}>
                Каждый блок — отдельный раздел: сначала текст, ниже галерея фото. Можно добавить URL
                или загрузить файл (до 10 МБ).
              </span>
            </label>
          </div>
        ) : (
          <div className={styles.row}>
            <label className={styles.label}>
              Контент *
              <BlogPostEditor key={postId ?? 'new'} value={content} onChange={setContent} />
              <span className={styles.fieldHint}>
                Панель инструментов: абзацы (Enter), подзаголовки H2–H6 и обычный текст (¶), красная
                строка (⇥) для отступа первой строки абзаца, маркированный и нумерованный списки,
                цитата, ссылка. Текст сохраняется как HTML.
              </span>
            </label>
          </div>
        )}

        <div className={styles.row}>
          <label className={styles.label}>
            Выравнивание текста на сайте
            <select
              value={contentAlign}
              onChange={(e) => setContentAlign(e.target.value as BlogContentAlign)}
              className={styles.select}
            >
              <option value="JUSTIFY">По ширине</option>
              <option value="LEFT">По левому краю</option>
              <option value="CENTER">По центру</option>
              <option value="RIGHT">По правому краю</option>
            </select>
            <span className={styles.fieldHint}>
              Применяется ко всему тексту статьи на публичной странице (списки и цитаты — по левому
              краю при выравнивании по ширине или по центру).
            </span>
          </label>
        </div>

        <p className={styles.readingTimeHint}>
          Время чтения (рассчитывается автоматически): <strong>{readingTimePreview} мин.</strong>
        </p>

        <div className={styles.row}>
          <label className={styles.label}>
            Краткое описание
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={styles.textarea}
              rows={3}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Изображение обложки
            <div className={styles.featuredImageRow}>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className={styles.input}
                placeholder="https://… или загрузите файл"
              />
              <input
                ref={featuredFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                className={styles.hiddenFileInput}
                onChange={handleFeaturedFileChange}
              />
              <button
                type="button"
                className={styles.imageUploadButton}
                disabled={uploadingFeatured}
                onClick={() => featuredFileInputRef.current?.click()}
              >
                {uploadingFeatured ? 'Загрузка…' : 'Загрузить файл'}
              </button>
            </div>
            {featuredImage.trim() ? (
              <div className={styles.featuredPreview}>
                <img src={featuredImage} alt="" />
              </div>
            ) : null}
            <span className={styles.fieldHint}>
              Ссылка на картинку или загрузка с компьютера (jpg, png, webp, gif, до 10 МБ). После
              загрузки alt подставится из заголовка, если поле ниже пустое.
            </span>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Alt-текст изображения{featuredImage.trim() ? ' *' : ''}
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              className={styles.input}
              placeholder="Кратко опишите изображение для SEO и скринридеров"
              required={!!featuredImage.trim()}
            />
          </label>
        </div>

        <div className={styles.rowGrid}>
          <div className={styles.label}>
            Плашка / метка
            <select
              value={badge.trim()}
              onChange={(e) => setBadge(e.target.value)}
              className={styles.select}
            >
              <option value="">— Без плашки —</option>
              {badgeSelectOptions.map((lbl) => (
                <option key={lbl} value={lbl}>
                  {lbl}
                </option>
              ))}
            </select>
            {badge.trim() && !presetLabels.includes(badge.trim()) && (
              <p className={styles.badgeOrphanHint}>
                Текущее значение не из списка; оно сохранится. Выберите его в списке выше или
                добавьте как новый вариант.
              </p>
            )}
            <div className={styles.badgeAddRow}>
              <input
                type="text"
                value={newBadgeLabel}
                onChange={(e) => setNewBadgeLabel(e.target.value)}
                className={styles.input}
                placeholder="Новая плашка для списка"
                maxLength={120}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddBadgePreset();
                  }
                }}
              />
              <button
                type="button"
                className={styles.badgeAddButton}
                disabled={addingBadge || !newBadgeLabel.trim()}
                onClick={() => void handleAddBadgePreset()}
              >
                {addingBadge ? 'Добавление…' : 'Добавить в список'}
              </button>
            </div>
            <span className={styles.fieldHint}>
              Список общий для всех редакторов. Новый вариант сразу можно выбрать для этой статьи.
            </span>
          </div>
          <label className={styles.label}>
            Автор (подпись)
            <input
              type="text"
              value={authorByline}
              onChange={(e) => setAuthorByline(e.target.value)}
              className={styles.input}
              placeholder="Необязательно; если пусто — на сайте автор не показывается"
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Порядок сортировки
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className={styles.input}
              step={1}
            />
            <span className={styles.fieldHint}>
              Меньше — выше в списке. При равенстве — по дате.
            </span>
          </label>
        </div>

        <div className={styles.rowGrid}>
          <label className={styles.label}>
            Статус
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
              className={styles.select}
            >
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликован</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </label>

          <label className={styles.label}>
            Категория
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>
            Теги (через запятую)
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={styles.input}
              placeholder="ремонт, двери, мебель"
            />
          </label>
        </div>

        <div className={styles.row}>
          <div className={styles.seoBlock}>
            <div className={styles.seoBlockHeader}>
              <span className={styles.seoBlockTitle}>SEO (поисковики)</span>
              <button
                type="button"
                className={styles.seoAutofillButton}
                onClick={handleSeoAutofill}
              >
                Подставить из статьи
              </button>
            </div>
            <p className={styles.fieldHint}>
              Если оставить поля пустыми и сохранить, сервер подставит заголовок из названия статьи
              (до ~60 символов), а описание — из краткого описания или из текста статьи (~155
              символов).
            </p>
            <label className={styles.label}>
              SEO заголовок
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className={styles.input}
                placeholder="Пусто — как у заголовка статьи"
              />
            </label>
            <label className={styles.label}>
              SEO описание
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Пусто — из краткого описания или текста"
              />
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : postId ? 'Сохранить' : 'Создать'}
          </button>
          <Link href="/admin/content/blog" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
