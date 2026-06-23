'use client';

import { SectionVisibilityCheckbox } from '../shared/SectionVisibilityCheckbox';
import styles from './ServicesSectionPage.module.css';
import type { ServicesSectionPageModel } from './hooks/useServicesSectionPage';
import { formatFeatures, parseFeatures } from './services-section-page.utils';

type ServicesSectionPageViewProps = {
  model: ServicesSectionPageModel;
};

export function ServicesSectionPageView({ model }: ServicesSectionPageViewProps) {
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
    uploadingImage,
    imageUploadTargetRef,
    imageFileInputRef,
    imageUrl,
    handleSaveBlock,
    handleBlockChange,
    handleUploadImage,
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
        <h1 className={styles.title}>Комплексные решения</h1>
        <p className={styles.subtitle}>
          Управление заголовком и услугами в секции «Комплексные решения» на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="servicesVisible" sectionLabel="Комплексные решения" />

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
            placeholder="Комплексные решения"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Полный цикл услуг для вашего комфорта"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Услуги</h2>
        <div className={styles.servicesList}>
          {data.items.map((item) => (
            <div key={item.id} className={styles.serviceCard}>
              {editingItem === item.id ? (
                <div className={styles.serviceCardEdit}>
                  <div className={styles.editGrid}>
                    <div className={styles.editImageColumn}>
                      {item.imageUrl ? (
                        <div className={styles.editImagePreview}>
                          <img src={imageUrl(item.imageUrl)} alt="" />
                        </div>
                      ) : (
                        <div className={styles.serviceImagePlaceholder}>🖼</div>
                      )}
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        onClick={() => {
                          imageUploadTargetRef.current = item.id;
                          imageFileInputRef.current?.click();
                        }}
                        disabled={uploadingImage === item.id}
                      >
                        {uploadingImage === item.id ? 'Загрузка...' : 'Загрузить фото'}
                      </button>
                    </div>
                    <div className={styles.editFields}>
                      <div className={styles.editField}>
                        <label>Название</label>
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
                          placeholder="Название услуги"
                        />
                      </div>
                      <div className={styles.editField}>
                        <label>Описание</label>
                        <textarea
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
                          placeholder="Описание услуги"
                          rows={3}
                        />
                      </div>
                      <div className={styles.editField}>
                        <label>Особенности (каждая с новой строки или через запятую)</label>
                        <textarea
                          value={formatFeatures(item.features)}
                          onChange={(e) =>
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    items: prev.items.map((x) =>
                                      x.id === item.id
                                        ? { ...x, features: parseFeatures(e.target.value) }
                                        : x
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder={'Дизайн-проект\nЧерновые работы\nЧистовая отделка'}
                          rows={4}
                        />
                      </div>
                      <div className={`${styles.editField} ${styles.editFieldPrice}`}>
                        <label>Цена</label>
                        <input
                          type="text"
                          value={item.price}
                          onChange={(e) =>
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    items: prev.items.map((x) =>
                                      x.id === item.id ? { ...x, price: e.target.value } : x
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="от 5 000 ₽/м²"
                        />
                      </div>
                    </div>
                  </div>
                  <div className={styles.editButtons}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() =>
                        handleUpdateItem(item.id, {
                          title: item.title,
                          description: item.description,
                          features: item.features,
                          price: item.price,
                          imageUrl: item.imageUrl,
                        })
                      }
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setEditingItem(null)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.serviceCardView}>
                  <div>
                    {item.imageUrl ? (
                      <div className={styles.serviceImage}>
                        <img src={imageUrl(item.imageUrl)} alt="" />
                      </div>
                    ) : (
                      <div className={styles.serviceImagePlaceholder}>🖼</div>
                    )}
                  </div>
                  <div className={styles.serviceContent}>
                    <h3 className={styles.serviceTitle}>{item.title}</h3>
                    <p className={styles.serviceDescription}>{item.description}</p>
                    {item.features.length > 0 && (
                      <div className={styles.serviceFeatures}>
                        {item.features.map((feature, idx) => (
                          <span key={idx} className={styles.serviceFeature}>
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className={styles.servicePrice}>{item.price}</p>
                  </div>
                  <div className={styles.serviceActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => setEditingItem(item.id)}
                    >
                      Редактировать
                    </button>
                    <button
                      data-admin-mutation
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.addForm}>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.fileInput}
            onChange={handleUploadImage}
          />
          <h3 className={styles.addFormTitle}>Добавить новую услугу</h3>
          <div className={styles.addFormGrid}>
            <div className={styles.editImageColumn}>
              {newItem.imageUrl ? (
                <div className={styles.editImagePreview}>
                  <img src={imageUrl(newItem.imageUrl)} alt="" />
                </div>
              ) : (
                <div className={styles.serviceImagePlaceholder}>🖼</div>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                onClick={() => {
                  imageUploadTargetRef.current = 'new';
                  imageFileInputRef.current?.click();
                }}
                disabled={uploadingImage === 'new'}
              >
                {uploadingImage === 'new' ? 'Загрузка...' : 'Загрузить фото'}
              </button>
            </div>
            <div className={styles.addFormFields}>
              <div className={styles.addFormField}>
                <label>Название</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Название услуги"
                />
              </div>
              <div className={styles.addFormField}>
                <label>Описание</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Описание услуги"
                  rows={3}
                />
              </div>
              <div className={styles.addFormField}>
                <label>Особенности (каждая с новой строки или через запятую)</label>
                <textarea
                  value={newItem.features}
                  onChange={(e) => setNewItem((p) => ({ ...p, features: e.target.value }))}
                  placeholder={'Дизайн-проект\nЧерновые работы\nЧистовая отделка'}
                  rows={4}
                />
              </div>
              <div className={`${styles.addFormField} ${styles.addFormFieldPrice}`}>
                <label>Цена</label>
                <input
                  type="text"
                  value={newItem.price}
                  onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                  placeholder="от 5 000 ₽/м²"
                />
              </div>
            </div>
          </div>
          <div className={styles.addFormButtons}>
            <button
              data-admin-mutation
              type="button"
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={handleAddItem}
              disabled={
                !newItem.title.trim() || !newItem.description.trim() || !newItem.price.trim()
              }
            >
              Добавить услугу
            </button>
          </div>
        </div>
      </section>

      <div className={styles.saveBlock}>
        <button
          data-admin-mutation
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleSaveBlock}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения заголовка'}
        </button>
      </div>
    </div>
  );
}
