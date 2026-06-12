'use client';

import { SectionVisibilityCheckbox } from '../SectionVisibilityCheckbox';
import styles from './HeroSectionPage.module.css';
import { HERO_SLIDE_SHOW_MODES } from './hero-section-page.constants';
import type { HeroSlideShowMode } from './hero-section-page.types';
import type { HeroSectionPageModel } from './hooks/useHeroSectionPage';

type HeroSectionPageViewProps = {
  model: HeroSectionPageModel;
};

export function HeroSectionPageView({ model }: HeroSectionPageViewProps) {
  const {
    data,
    setData,
    loading,
    saving,
    uploading,
    message,
    editingFeature,
    setEditingFeature,
    newFeature,
    setNewFeature,
    slideToDelete,
    setSlideToDelete,
    deletingSlide,
    uploadingIcon,
    iconUploadTargetRef,
    fileInputRef,
    iconFileInputRef,
    imageUrl,
    isIconImageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadSlide,
    handleDeleteSlide,
    handleAddFeature,
    handleUpdateFeature,
    handleUploadFeatureIcon,
    handleDeleteFeature,
  } = model;

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Первый блок главной страницы</h1>
        <p className={styles.subtitle}>
          Управление текстом, слайд-шоу и преимуществами в блоке Hero на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="heroVisible" sectionLabel="Первый блок" />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      {/* Текст */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Текст блока</h2>
        <div className={styles.formGroup}>
          <label>Заголовок (основная часть)</label>
          <input
            type="text"
            value={data.block.titleMain}
            onChange={(e) => handleBlockChange('titleMain', e.target.value)}
            className={styles.input}
            placeholder="Создаем интерьер мечты"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Заголовок (акцент)</label>
          <input
            type="text"
            value={data.block.titleAccent}
            onChange={(e) => handleBlockChange('titleAccent', e.target.value)}
            className={styles.input}
            placeholder="в Мурманске"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок (описание услуг)</label>
          <textarea
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Мебель на заказ, ремонт под ключ..."
          />
        </div>
      </section>

      {/* Слайд-шоу */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Слайд-шоу (фото готовых работ)</h2>
        <div className={styles.formGroup}>
          <label>Режим слайд-шоу</label>
          <select
            value={data.block.slideShowMode ?? 'auto'}
            onChange={(e) =>
              handleBlockChange('slideShowMode', e.target.value as HeroSlideShowMode)
            }
            className={styles.input}
          >
            {HERO_SLIDE_SHOW_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className={styles.hint}>
            <strong>Авто</strong> — слайды меняются по таймеру. <strong>Вручную</strong> —
            переключение только по клику на точки. <strong>Один слайд</strong> — показывается только
            первый слайд без карусели.
          </p>
        </div>
        <div className={styles.formGroup}>
          <label>Зазор между фотографиями (px)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={data.block.slideGap ?? 16}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              handleBlockChange('slideGap', Number.isNaN(v) ? 16 : Math.max(0, Math.min(100, v)));
            }}
            className={styles.input}
            style={{ maxWidth: 100 }}
          />
          <p className={styles.hint}>От 0 до 100 пикселей. По умолчанию 16.</p>
        </div>
        <p className={styles.hint}>
          Загружайте фотографии готовых работ. Они будут отображаться в режиме слайд-шоу вместо
          заглушки.
        </p>
        <div className={styles.slidesGrid}>
          {data.slides.map((slide) => (
            <div key={slide.id} className={styles.slideCard}>
              <img src={imageUrl(slide.imageUrl)} alt="Слайд" className={styles.slidePreview} />
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setSlideToDelete(slide.id)}
              >
                Удалить
              </button>
            </div>
          ))}
          <div className={styles.uploadCard}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.fileInput}
              onChange={handleUploadSlide}
            />
            <button
              type="button"
              className={styles.uploadBtn}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Загрузка...' : '+ Добавить фото'}
            </button>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Преимущества (иконки и текст)</h2>
        <div className={styles.featuresList}>
          {data.features.map((f) => (
            <div key={f.id} className={styles.featureRow}>
              {editingFeature === f.id ? (
                <>
                  <div className={styles.iconCell}>
                    {isIconImageUrl(f.icon) ? (
                      <div className={styles.iconPreview}>
                        <img src={imageUrl(f.icon)} alt="" />
                      </div>
                    ) : (
                      <span className={styles.iconPreview}>{f.icon || '📷'}</span>
                    )}
                    <button
                      type="button"
                      className={styles.iconUploadBtn}
                      onClick={() => {
                        iconUploadTargetRef.current = f.id;
                        iconFileInputRef.current?.click();
                      }}
                      disabled={uploadingIcon === f.id}
                    >
                      {uploadingIcon === f.id ? '...' : 'Загрузить'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={f.icon}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              features: prev.features.map((x) =>
                                x.id === f.id ? { ...x, icon: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.iconInput}
                    placeholder="Emoji или URL"
                  />
                  <input
                    type="text"
                    value={f.title}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              features: prev.features.map((x) =>
                                x.id === f.id ? { ...x, title: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Текст"
                  />
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => handleUpdateFeature(f.id, f.icon, f.title)}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => setEditingFeature(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  {isIconImageUrl(f.icon) ? (
                    <img src={imageUrl(f.icon)} alt="" className={styles.featureIconImg} />
                  ) : (
                    <span className={styles.featureIcon}>{f.icon}</span>
                  )}
                  <span className={styles.featureTitle}>{f.title}</span>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => setEditingFeature(f.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => handleDeleteFeature(f.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addFeature}>
          <input
            ref={iconFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className={styles.fileInput}
            onChange={handleUploadFeatureIcon}
          />
          <div className={styles.iconCell}>
            {isIconImageUrl(newFeature.icon) ? (
              <div className={styles.iconPreview}>
                <img src={imageUrl(newFeature.icon)} alt="" />
              </div>
            ) : (
              <span className={styles.iconPreview}>{newFeature.icon || '📷'}</span>
            )}
            <button
              type="button"
              className={styles.iconUploadBtn}
              onClick={() => {
                iconUploadTargetRef.current = 'new';
                iconFileInputRef.current?.click();
              }}
              disabled={uploadingIcon === 'new'}
            >
              {uploadingIcon === 'new' ? '...' : 'Загрузить'}
            </button>
          </div>
          <input
            type="text"
            value={newFeature.icon}
            onChange={(e) => setNewFeature((p) => ({ ...p, icon: e.target.value }))}
            className={styles.iconInput}
            placeholder="Emoji или URL"
          />
          <input
            type="text"
            value={newFeature.title}
            onChange={(e) => setNewFeature((p) => ({ ...p, title: e.target.value }))}
            className={styles.featureInput}
            placeholder="Текст преимущества"
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddFeature}
            disabled={!newFeature.icon.trim() || !newFeature.title.trim()}
          >
            Добавить
          </button>
        </div>
      </section>

      <div className={styles.saveBlock}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSaveBlock}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Модалка подтверждения удаления слайда */}
      {slideToDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deletingSlide && setSlideToDelete(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Удалить фото?</h3>
            <p className={styles.modalText}>
              Это фото будет удалено из слайд-шоу первого блока. Действие нельзя отменить.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setSlideToDelete(null)}
                disabled={deletingSlide}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => handleDeleteSlide(slideToDelete)}
                disabled={deletingSlide}
              >
                {deletingSlide ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
