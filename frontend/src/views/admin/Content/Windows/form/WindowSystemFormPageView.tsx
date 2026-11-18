'use client';

import Link from 'next/link';

import styles from './WindowsFormPage.module.css';
import type { WindowSystemFormPageModel } from './hooks/useWindowSystemFormPage';
import { getWindowsImageUrl } from './windows-form.utils';

type WindowSystemFormPageViewProps = {
  model: WindowSystemFormPageModel;
};

export function WindowSystemFormPageView({ model }: WindowSystemFormPageViewProps) {
  const {
    systemId,
    brands,
    fileInputRef,
    brandId,
    setBrandId,
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
    chambers,
    setChambers,
    mountingDepth,
    setMountingDepth,
    glassUnitWidth,
    setGlassUnitWidth,
    thermalResistance,
    setThermalResistance,
    soundInsulation,
    setSoundInsulation,
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
        <Link href="/admin/content/windows" className={styles.backLink}>
          ← К разделу «Окна»
        </Link>
        <h1 className={styles.title}>
          {systemId ? 'Редактировать профильную систему' : 'Новая профильная система'}
        </h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Бренд *</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={styles.input}
            >
              <option value="" disabled>
                Выберите бренд
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {brands.length === 0 && (
              <span className={styles.hint}>
                Сначала создайте бренд —{' '}
                <Link href="/admin/content/windows/brands/new" className={styles.inlineLink}>
                  добавить
                </Link>
              </span>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Название системы *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blitz New"
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
              placeholder="rehau-blitz"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Подзаголовок карточки</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Базовая система линейки REHAU"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание профильной системы для карточки..."
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Изображение профиля</label>
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
                <img src={getWindowsImageUrl(imageUrl)} alt={name || 'Профиль'} />
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

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Характеристики</legend>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Камеры профиля</label>
              <input
                type="number"
                min={0}
                value={chambers}
                onChange={(e) => setChambers(e.target.value)}
                placeholder="5"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Монтажная глубина, мм</label>
              <input
                type="number"
                min={0}
                value={mountingDepth}
                onChange={(e) => setMountingDepth(e.target.value)}
                placeholder="70"
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Стеклопакет</label>
              <input
                type="text"
                value={glassUnitWidth}
                onChange={(e) => setGlassUnitWidth(e.target.value)}
                placeholder="10–41 мм"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Теплозащита Rопр</label>
              <input
                type="text"
                value={thermalResistance}
                onChange={(e) => setThermalResistance(e.target.value)}
                placeholder="0,85 м²·°С/Вт"
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Звукоизоляция</label>
              <input
                type="text"
                value={soundInsulation}
                onChange={(e) => setSoundInsulation(e.target.value)}
                placeholder="до 40 дБ(А)"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Цена «от», ₽</label>
              <input
                type="number"
                min={0}
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="15000"
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
                  placeholder="Высота фальца"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateCharacteristic(row.uid, 'value', e.target.value)}
                  placeholder="25 мм"
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
                placeholder="Существенная экономия тепловой энергии"
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
            <label className={styles.label}>Метка карточки (бейдж)</label>
            <input
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Для северного климата"
              className={styles.input}
            />
          </div>
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
            Система активна (видна на сайте)
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
          <Link href="/admin/content/windows" className={styles.cancelLink}>
            К списку
          </Link>
        </div>
      </div>
    </div>
  );
}
