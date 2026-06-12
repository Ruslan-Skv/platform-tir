'use client';

import styles from '../Hero/HeroSectionPage.module.css';
import { SectionVisibilityCheckbox } from '../shared/SectionVisibilityCheckbox';
import type { AdvantagesSectionPageModel } from './hooks/useAdvantagesSectionPage';

type AdvantagesSectionPageViewProps = {
  model: AdvantagesSectionPageModel;
};

export function AdvantagesSectionPageView({ model }: AdvantagesSectionPageViewProps) {
  const {
    data,
    setData,
    loading,
    saving,
    message,
    editingItem,
    setEditingItem,
    newItem,
    setNewItem,
    uploadingIcon,
    iconUploadTargetRef,
    iconFileInputRef,
    imageUrl,
    isIconImageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadIcon,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
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
        <h1 className={styles.title}>Почему выбирают нас</h1>
        <p className={styles.subtitle}>
          Управление заголовком и преимуществами в секции «Почему выбирают нас» на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox
        sectionKey="advantagesVisible"
        sectionLabel="Почему выбирают нас"
      />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Заголовок секции</h2>
        <div className={styles.formGroup}>
          <label>Заголовок</label>
          <input
            type="text"
            value={data.block.title}
            onChange={(e) => handleBlockChange('title', e.target.value)}
            className={styles.input}
            placeholder="Почему выбирают нас"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Мы делаем качество доступным"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Преимущества</h2>
        <div className={styles.featuresList}>
          {data.items.map((item) => (
            <div key={item.id} className={styles.featureRow}>
              {editingItem === item.id ? (
                <>
                  <div className={styles.iconCell}>
                    {isIconImageUrl(item.icon) ? (
                      <div className={styles.iconPreview}>
                        <img src={imageUrl(item.icon)} alt="" />
                      </div>
                    ) : (
                      <span className={styles.iconPreview}>{item.icon || '📷'}</span>
                    )}
                    <button
                      type="button"
                      className={styles.iconUploadBtn}
                      onClick={() => {
                        iconUploadTargetRef.current = item.id;
                        iconFileInputRef.current?.click();
                      }}
                      disabled={uploadingIcon === item.id}
                    >
                      {uploadingIcon === item.id ? '...' : 'Загрузить'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.icon}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, icon: e.target.value } : x
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
                    value={item.title}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, title: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Заголовок"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, description: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Описание"
                  />
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() =>
                      handleUpdateItem(item.id, item.icon, item.title, item.description)
                    }
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => setEditingItem(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  {isIconImageUrl(item.icon) ? (
                    <img src={imageUrl(item.icon)} alt="" className={styles.featureIconImg} />
                  ) : (
                    <span className={styles.featureIcon}>{item.icon}</span>
                  )}
                  <div style={{ flex: 1 }}>
                    <span className={styles.featureTitle}>{item.title}</span>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.875rem',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => setEditingItem(item.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => handleDeleteItem(item.id)}
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
            onChange={handleUploadIcon}
          />
          <div className={styles.iconCell}>
            {isIconImageUrl(newItem.icon) ? (
              <div className={styles.iconPreview}>
                <img src={imageUrl(newItem.icon)} alt="" />
              </div>
            ) : (
              <span className={styles.iconPreview}>{newItem.icon || '📷'}</span>
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
            value={newItem.icon}
            onChange={(e) => setNewItem((p) => ({ ...p, icon: e.target.value }))}
            className={styles.iconInput}
            placeholder="Emoji или URL"
          />
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
            className={styles.featureInput}
            placeholder="Заголовок"
          />
          <input
            type="text"
            value={newItem.description}
            onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
            className={styles.featureInput}
            placeholder="Описание"
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddItem}
            disabled={!newItem.icon.trim() || !newItem.title.trim() || !newItem.description.trim()}
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
    </div>
  );
}
