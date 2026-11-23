'use client';

import Link from 'next/link';

import styles from './StretchCeilingsFormPage.module.css';
import type { CeilingFabricFormPageModel } from './hooks/useCeilingFabricFormPage';
import { getStretchCeilingsImageUrl } from './stretch-ceilings-form.utils';

const TEXTURE_TYPES = ['Матовая', 'Глянцевая', 'Сатиновая', 'Тканевая', 'Металлик', 'Прозрачная'];

type CeilingFabricFormPageViewProps = {
  model: CeilingFabricFormPageModel;
};

export function CeilingFabricFormPageView({ model }: CeilingFabricFormPageViewProps) {
  const {
    fabricId,
    manufacturers,
    fileInputRef,
    manufacturerId,
    setManufacturerId,
    name,
    setName,
    slug,
    setSlug,
    textureType,
    setTextureType,
    tagline,
    setTagline,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    width,
    setWidth,
    priceFrom,
    setPriceFrom,
    badge,
    setBadge,
    advantages,
    addAdvantage,
    updateAdvantage,
    removeAdvantage,
    characteristics,
    addCharacteristic,
    updateCharacteristic,
    removeCharacteristic,
    sortOrder,
    setSortOrder,
    isActive,
    setIsActive,
    loading,
    saving,
    uploading,
    message,
    handleSave,
    handleFileSelect,
  } = model;

  if (loading) {
    return <div className={styles.page}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/content/stretch-ceilings" className={styles.backLink}>
          ← К разделу «Натяжные потолки»
        </Link>
        <h1 className={styles.title}>
          {fabricId ? 'Редактировать фактуру полотна' : 'Новая фактура полотна'}
        </h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Производитель *</label>
            <select
              value={manufacturerId}
              onChange={(e) => setManufacturerId(e.target.value)}
              className={styles.input}
            >
              <option value="" disabled>
                Выберите производителя
              </option>
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </select>
            {manufacturers.length === 0 && (
              <span className={styles.hint}>
                Сначала создайте производителя —{' '}
                <Link
                  href="/admin/content/stretch-ceilings/manufacturers/new"
                  className={styles.inlineLink}
                >
                  добавить
                </Link>
              </span>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Название фактуры *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MSD Classic Mat"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="msd-classic-mat"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Тип фактуры</label>
            <select
              value={textureType}
              onChange={(e) => setTextureType(e.target.value)}
              className={styles.input}
            >
              <option value="">— не выбран —</option>
              {TEXTURE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Подзаголовок карточки</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Классика для любой комнаты"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ширина полотна</label>
            <input
              type="text"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="до 3,2 м / до 5,1 м бесшовное"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание фактуры полотна для карточки..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение фактуры</label>
          <div className={styles.imageBlock}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
            {imageUrl ? (
              <div className={styles.imagePreview}>
                {}
                <img src={getStretchCeilingsImageUrl(imageUrl)} alt={name || 'Фактура'} />
                <div className={styles.imageActions}>
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : 'Заменить'}
                  </button>
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => setImageUrl('')}
                    disabled={uploading}
                  >
                    Убрать
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : '+ Загрузить изображение'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Видео о фактуре</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Ссылка на Rutube / YouTube / VK или прямой файл (mp4)"
            className={styles.input}
          />
          <span className={styles.hint}>
            Например, ссылку на ролик из карточки поставщика (rutube.ru/video/…). Вставляется на
            страницу «Натяжные потолки» под преимуществами фактуры.
          </span>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Характеристики</legend>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Цена «от», ₽/м²</label>
              <input
                type="number"
                min={0}
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="290"
                className={styles.input}
              />
              <span className={styles.hint}>
                Используется в карточке, таблице сравнения и калькуляторе стоимости.
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Метка карточки (бейдж)</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Хит / Бесшовное"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Дополнительные характеристики</label>
            {characteristics.map((row) => (
              <div key={row.uid} className={styles.dynamicRow}>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateCharacteristic(row.uid, 'label', e.target.value)}
                  placeholder="Класс пожарной безопасности"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateCharacteristic(row.uid, 'value', e.target.value)}
                  placeholder="КМ2"
                  className={styles.input}
                />
                <button
                  type="button"
                  className={styles.removeRowBtn}
                  onClick={() => removeCharacteristic(row.uid)}
                >
                  Удалить
                </button>
              </div>
            ))}
            <button type="button" className={styles.addRowBtn} onClick={addCharacteristic}>
              + Добавить характеристику
            </button>
          </div>
        </fieldset>

        <div className={styles.field}>
          <label className={styles.label}>Преимущества (список в карточке)</label>
          {advantages.map((advantage, index) => (
            <div key={index} className={styles.dynamicRow}>
              <input
                type="text"
                value={advantage}
                onChange={(e) => updateAdvantage(index, e.target.value)}
                placeholder="Идеально ровная поверхность без блеска"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.removeRowBtn}
                onClick={() => removeAdvantage(index)}
              >
                Удалить
              </button>
            </div>
          ))}
          <button type="button" className={styles.addRowBtn} onClick={addAdvantage}>
            + Добавить преимущество
          </button>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Порядок вывода</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className={styles.checkbox}
            />
            Фактура активна (видна на сайте)
          </label>
        </div>

        <div className={styles.actions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/admin/content/stretch-ceilings" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
