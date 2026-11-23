'use client';

import Link from 'next/link';

import styles from './BlindsFormPage.module.css';
import { getBlindsImageUrl } from './blinds-form.utils';
import type { BlindsProductFormPageModel } from './hooks/useBlindsProductFormPage';

const MOUNT_TYPES = [
  'На створку',
  'На створку или на проём',
  'На проём / на стену',
  'На стену / на потолок',
  'Между рамами',
];
const MATERIALS = [
  'Ткань, 200+ цветов',
  'Ткань blackout',
  'Ткань зебра, 80+ расцветок',
  'Алюминий 16 мм',
  'Алюминий 25 мм, 100+ цветов',
  'Дерево / бамбук 50 мм',
  'Ткань плиссе, 100+ цветов',
  'Сотовая ткань гофре',
  'Комбинация тканей и вставок',
  'Нити с декоративными вставками',
  'Ткань с пропиткой, 150+ цветов',
  'Ткань с УФ-печатью',
];
const CONTROL_TYPES = [
  'Цепочное',
  'Цепочное или пружинное',
  'Цепочное или электропривод',
  'Пружинное',
  'Ручное по струнам',
  'Ручное или электропривод',
  'Трость + поводок',
  'Трость + шнур',
  'Верёвка + трость',
  'Магнитное / выносное',
  'Электропривод',
];

type BlindsProductFormPageViewProps = {
  model: BlindsProductFormPageModel;
};

export function BlindsProductFormPageView({ model }: BlindsProductFormPageViewProps) {
  const {
    productId,
    categories,
    fileInputRef,
    categoryId,
    setCategoryId,
    name,
    setName,
    slug,
    setSlug,
    tagline,
    setTagline,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    mountType,
    setMountType,
    material,
    setMaterial,
    controlType,
    setControlType,
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
        <Link href="/admin/content/blinds" className={styles.backLink}>
          ← К разделу «Жалюзи»
        </Link>
        <h1 className={styles.title}>{productId ? 'Редактировать изделие' : 'Новое изделие'}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Категория *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.input}
            >
              <option value="" disabled>
                Выберите категорию
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <span className={styles.hint}>
                Сначала создайте категорию —{' '}
                <Link href="/admin/content/blinds/categories/new" className={styles.inlineLink}>
                  добавить
                </Link>
              </span>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Название изделия *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Кассетные UNI-2"
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
              placeholder="rulonnye-uni-2"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Подзаголовок карточки</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Кассета с направляющими на створку"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Способ установки</label>
            <select
              value={mountType}
              onChange={(e) => setMountType(e.target.value)}
              className={styles.input}
            >
              <option value="">— не выбран —</option>
              {MOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Управление</label>
            <select
              value={controlType}
              onChange={(e) => setControlType(e.target.value)}
              className={styles.input}
            >
              <option value="">— не выбран —</option>
              {CONTROL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Материал</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className={styles.input}
            >
              <option value="">— не выбран —</option>
              {MATERIALS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание изделия для карточки..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение изделия</label>
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
                <img src={getBlindsImageUrl(imageUrl)} alt={name || 'Изделие'} />
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
          <label className={styles.label}>Видео об изделии</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Ссылка на Rutube / YouTube / VK или прямой файл (mp4)"
            className={styles.input}
          />
          <span className={styles.hint}>
            Например, ссылку на ролик из карточки поставщика (rutube.ru/video/…). Вставляется на
            страницу «Жалюзи» под преимуществами изделия.
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
                placeholder="790"
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
                placeholder="Хит / Blackout / Для кухни"
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
                  placeholder="Кассета"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateCharacteristic(row.uid, 'value', e.target.value)}
                  placeholder="алюминий, 37–53 мм"
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
                placeholder="Короб и направляющие в цвет оконной рамы"
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
            Изделие активно (видно на сайте)
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
          <Link href="/admin/content/blinds" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
