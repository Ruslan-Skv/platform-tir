'use client';

import styles from './PartnerEditPage.module.css';
import type { PartnerEditPageModel } from './hooks/usePartnerEditPage';

type PartnerEditPageViewProps = {
  model: PartnerEditPageModel;
};

export function PartnerEditPageView({ model }: PartnerEditPageViewProps) {
  const {
    isEditMode,
    loading,
    saving,
    uploadingLogo,
    error,
    message,
    formData,
    setFormData,
    logoFileInputRef,
    logoPreviewUrl,
    goBack,
    handleChange,
    handleLogoUpload,
    updatePhone,
    removePhone,
    addPhone,
    handleSubmit,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка данных партнёра...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditMode ? 'Редактирование партнёра' : 'Создание партнёра'}
        </h1>
        <button type="button" className={styles.backButton} onClick={goBack}>
          ← Назад к списку
        </button>
      </div>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {message ? (
        <div className={`${styles.messageBox} ${styles[message.type]}`}>{message.text}</div>
      ) : null}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="name">
                Название <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Название партнёра"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Логотип</label>
              <div className={styles.logoRow}>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                  onChange={handleLogoUpload}
                  className={styles.fileInput}
                  disabled={uploadingLogo}
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className={styles.uploadButton}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Загрузка...' : 'Загрузить изображение'}
                </button>
                <span className={styles.logoOr}>или</span>
                <input
                  type="url"
                  id="logoUrl"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              {formData.logoUrl ? (
                <div className={styles.logoPreview}>
                  <img
                    src={logoPreviewUrl(formData.logoUrl)}
                    alt="Логотип"
                    className={styles.logoPreviewImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <p className={styles.hint}>
                Логотип отображается на карточках товаров партнёра (если включено ниже). До 2 МБ,
                форматы: jpg, png, webp, gif, svg
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.showLogoOnCards}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, showLogoOnCards: e.target.checked }))
                  }
                  className={styles.checkbox}
                />
                <span>Показывать логотип на карточках товаров</span>
              </label>
              <p className={styles.hint}>
                Включите, чтобы логотип этого партнёра отображался на карточках его товаров
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.showTooltip}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, showTooltip: e.target.checked }))
                  }
                  className={styles.checkbox}
                />
                <span>Показывать всплывающую подсказку при наведении на логотип</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tooltipText">Текст подсказки</label>
              <input
                type="text"
                id="tooltipText"
                name="tooltipText"
                value={formData.tooltipText}
                onChange={handleChange}
                className={styles.input}
                placeholder={`Товар Партнёра : ${formData.name || 'название партнёра'}`}
              />
              <p className={styles.hint}>
                Если пусто — будет использоваться «Товар Партнёра : {formData.name || 'название'}»
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="website">Адрес сайта</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Краткое описание партнёра"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Контактная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="info@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Телефоны</label>
              {formData.phones.map((phone, index) => (
                <div key={index} className={styles.phoneRow}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => updatePhone(index, e.target.value)}
                    className={styles.input}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <button
                    data-admin-mutation
                    type="button"
                    onClick={() => removePhone(index)}
                    className={styles.removeButton}
                    title="Удалить телефон"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                data-admin-mutation
                type="button"
                onClick={addPhone}
                className={styles.addPhoneButton}
              >
                + Добавить телефон
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className={styles.checkbox}
                />
                <span>Активен</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.cancelButton} onClick={goBack} disabled={saving}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            className={styles.submitButton}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать партнёра'}
          </button>
        </div>
      </form>
    </div>
  );
}
