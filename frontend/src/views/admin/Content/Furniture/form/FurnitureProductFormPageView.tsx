'use client';

import Link from 'next/link';

import styles from './FurnitureFormPage.module.css';
import { getFurnitureImageUrl } from './furniture-form.utils';
import type { FurnitureProductFormPageModel } from './hooks/useFurnitureProductFormPage';

/** Подсказки для поля «Конфигурация» — можно ввести и своё значение. */
const CONFIGURATIONS = [
  'Прямая',
  'Прямая компактная',
  'Угловая',
  'П-образная',
  'С островом',
  'Встроенная',
  'Корпусная',
  'Модульная',
  'С дверями-купе',
  'Радиусная',
  'Навесная',
  'Двухъярусная конструкция',
];

/** Подсказки для поля «Материал фасадов» — можно ввести и своё значение. */
const FACADE_MATERIALS = [
  'ЛДСП',
  'ЛДСП Egger / Lamarty',
  'ЛДСП / МДФ в плёнке ПВХ',
  'МДФ в плёнке ПВХ',
  'МДФ в пластике HPL и акриле',
  'МДФ в эмали',
  'Шпон и массив',
  'ЛДСП влагостойкая',
  'ЛДСП / зеркало / стекло',
  'Зеркало с плёнкой',
  'Фотопечать',
  'Гнутое стекло',
];

/** Подсказки для поля «Фурнитура» — можно ввести и своё значение. */
const HARDWARE = [
  'Boyard / GTV',
  'Boyard / GTV с доводчиками',
  'Blum / Hettich',
  'Раздвижная система Boyard / GTV / Aristo',
  'Петли с доводчиками',
  'Ящики на шариковых направляющих',
  'Тандембоксы Blum Legrabox',
  'Подъёмники Aventos',
];

/** Единицы цены изделия. */
const PRICE_UNITS = [
  { value: '', label: 'за изделие (по умолчанию)' },
  { value: 'пог. м', label: 'пог. м (кухни)' },
  { value: 'м²', label: 'м²' },
];

type FurnitureProductFormPageViewProps = {
  model: FurnitureProductFormPageModel;
};

export function FurnitureProductFormPageView({ model }: FurnitureProductFormPageViewProps) {
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
    configuration,
    setConfiguration,
    facadeMaterial,
    setFacadeMaterial,
    hardware,
    setHardware,
    priceFrom,
    setPriceFrom,
    priceUnit,
    setPriceUnit,
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
        <Link href="/admin/content/furniture" className={styles.backLink}>
          ← К разделу «Мебель»
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
                <Link href="/admin/content/furniture/categories/new" className={styles.inlineLink}>
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
              placeholder="Прямые кухни"
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
              placeholder="pryamye-kuhni"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Подзаголовок карточки</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Линейная кухня вдоль одной стены"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Конфигурация</label>
            <input
              type="text"
              list="furniture-configuration-options"
              value={configuration}
              onChange={(e) => setConfiguration(e.target.value)}
              placeholder="Прямая"
              className={styles.input}
            />
            <datalist id="furniture-configuration-options">
              {CONFIGURATIONS.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Материал фасадов</label>
            <input
              type="text"
              list="furniture-facade-options"
              value={facadeMaterial}
              onChange={(e) => setFacadeMaterial(e.target.value)}
              placeholder="ЛДСП / МДФ в плёнке ПВХ"
              className={styles.input}
            />
            <datalist id="furniture-facade-options">
              {FACADE_MATERIALS.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Фурнитура</label>
            <input
              type="text"
              list="furniture-hardware-options"
              value={hardware}
              onChange={(e) => setHardware(e.target.value)}
              placeholder="Boyard / GTV с доводчиками"
              className={styles.input}
            />
            <datalist id="furniture-hardware-options">
              {HARDWARE.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
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
                <img src={getFurnitureImageUrl(imageUrl)} alt={name || 'Изделие'} />
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
            Например, обзор производства или обзор готового проекта (rutube.ru/video/…). Вставляется
            на страницу «Мебель» под преимуществами изделия.
          </span>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Характеристики</legend>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Цена «от», ₽</label>
              <input
                type="number"
                min={0}
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="14900"
                className={styles.input}
              />
              <span className={styles.hint}>
                Используется в карточке, таблице сравнения и калькуляторе стоимости.
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Единица цены</label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className={styles.input}
              >
                {PRICE_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>
                «пог. м» — калькулятор умножает цену на длину; «за изделие» — цена фиксированная.
              </span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Метка карточки (бейдж)</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Хит / Премиум / Для кухни"
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
                  placeholder="Длина"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateCharacteristic(row.uid, 'value', e.target.value)}
                  placeholder="от 1,2 до 6 м, шаг 5 мм"
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
                placeholder="Подходит для кухни любой площади"
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
          <Link href="/admin/content/furniture" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
