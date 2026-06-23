'use client';

import Link from 'next/link';

import styles from './SupplierEditPage.module.css';
import type { SupplierEditPageModel } from './hooks/useSupplierEditPage';

type SupplierEditPageViewProps = {
  model: SupplierEditPageModel;
};

export function SupplierEditPageView({ model }: SupplierEditPageViewProps) {
  const {
    supplierId,
    isEditMode,
    loading,
    saving,
    error,
    message,
    formData,
    setFormData,
    goBack,
    handleChange,
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
          <p>Загрузка данных поставщика...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditMode ? 'Редактирование поставщика' : 'Создание поставщика'}
        </h1>
        <div className={styles.headerActions}>
          {isEditMode && supplierId && (
            <Link
              href={`/admin/crm/supplier-settlements/${supplierId}`}
              className={styles.settlementsLink}
            >
              Расчёты с поставщиком →
            </Link>
          )}
          <button type="button" className={styles.backButton} onClick={goBack}>
            ← Назад к списку
          </button>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {message && (
        <div className={`${styles.messageBox} ${styles[message.type]}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="legalName">
                Наименование юридическое <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="ООО «Пример»"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="commercialName">Наименование коммерческое</label>
              <input
                type="text"
                id="commercialName"
                name="commercialName"
                value={formData.commercialName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Пример Торг"
              />
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
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Юридическая информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="legalAddress">Юридический адрес</label>
              <textarea
                id="legalAddress"
                name="legalAddress"
                value={formData.legalAddress}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="г. Москва, ул. Примерная, д. 1"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="inn">ИНН</label>
              <input
                type="text"
                id="inn"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                className={styles.input}
                placeholder="1234567890"
              />
              <p className={styles.hint}>
                Уникальный идентификатор (ИНН должен быть уникальным для каждого поставщика)
              </p>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Банковские реквизиты</h2>

            <div className={styles.formGroup}>
              <label htmlFor="bankName">Банк</label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                className={styles.input}
                placeholder="ПАО «Сбербанк»"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankAccount">Расчетный счет (р/сч)</label>
              <input
                type="text"
                id="bankAccount"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                className={styles.input}
                placeholder="40702810100000000000"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankBik">БИК</label>
              <input
                type="text"
                id="bankBik"
                name="bankBik"
                value={formData.bankBik}
                onChange={handleChange}
                className={styles.input}
                placeholder="044525225"
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
            {saving ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать поставщика'}
          </button>
        </div>
      </form>
    </div>
  );
}
