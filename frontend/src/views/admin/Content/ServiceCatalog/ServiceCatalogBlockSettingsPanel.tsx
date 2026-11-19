'use client';

import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';

import styles from './ServiceCatalogBlockSettingsPanel.module.css';
import type { ServiceCatalogBlockSettingsModel } from './hooks/useServiceCatalogBlockSettings';

type ServiceCatalogBlockSettingsPanelProps = {
  model: ServiceCatalogBlockSettingsModel;
};

const ICON_OPTIONS = Object.keys(serviceCatalogIconMap).sort((a, b) => a.localeCompare(b, 'ru'));

/** Панель настроек страницы «Ремонт квартир» (/catalog/services). */
export function ServiceCatalogBlockSettingsPanel({ model }: ServiceCatalogBlockSettingsPanelProps) {
  const {
    form,
    loading,
    saving,
    message,
    updateField,
    updateHeroNote,
    addHeroNote,
    removeHeroNote,
    updateStep,
    addStep,
    removeStep,
    handleFileSelect,
    handleStepFileSelect,
    removeStepBackground,
    handleSave,
    maxHeroNotes,
    maxSteps,
  } = model;

  if (loading || !form) {
    return (
      <section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Настройки страницы «Ремонт квартир»</h2>
        <p className={styles.loading}>Загрузка...</p>
      </section>
    );
  }

  return (
    <section className={styles.settingsSection}>
      <h2 className={styles.sectionTitle}>Настройки страницы «Ремонт квартир»</h2>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Заголовок страницы</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ремонт квартир"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Подзаголовок</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="Виды работ с ценами: от демонтажа до чистовой отделки"
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Описание под заголовком</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Описание раздела на странице «Ремонт квартир»..."
            className={styles.textarea}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Изображение герой-блока</label>
          {form.heroImageUrl ? (
            <div className={styles.imagePreview}>
              <img src={form.heroImageUrl} alt="Герой раздела" />
              <button
                type="button"
                className={styles.changeImageBtn}
                onClick={() => updateField('heroImageUrl', '')}
              >
                Убрать
              </button>
            </div>
          ) : (
            <label className={styles.uploadBtn}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect('heroImageUrl')}
                className={styles.fileInput}
              />
              + Загрузить изображение
            </label>
          )}
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>SEO title</label>
            <input
              type="text"
              value={form.seoTitle}
              onChange={(e) => updateField('seoTitle', e.target.value)}
              placeholder="Ремонт квартир в Мурманске"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>SEO description</label>
            <input
              type="text"
              value={form.seoDescription}
              onChange={(e) => updateField('seoDescription', e.target.value)}
              placeholder="Описание для поисковых систем"
              className={styles.input}
            />
          </div>
        </div>
      </div>

      <div className={styles.subformDivider} />

      <div className={styles.form}>
        <h3 className={styles.subformTitle}>Преимущества в шапке страницы</h3>
        <span className={styles.hint}>
          До {maxHeroNotes} пунктов с иконками под описанием. Пустой список — стандартные
          преимущества (смета, фиксированные цены, гарантия).
        </span>
        {form.heroNotes.map((note, index) => (
          <div key={index} className={styles.listRow}>
            <select
              value={note.icon ?? ''}
              onChange={(e) => updateHeroNote(index, { icon: e.target.value || null })}
              className={styles.iconSelect}
              aria-label="Иконка преимущества"
            >
              <option value="">Без иконки</option>
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={note.text}
              onChange={(e) => updateHeroNote(index, { text: e.target.value })}
              placeholder="Например: Смета до начала работ"
              className={styles.input}
            />
            <button
              type="button"
              className={styles.removeRowBtn}
              onClick={() => removeHeroNote(index)}
              aria-label="Удалить преимущество"
            >
              ✕
            </button>
          </div>
        ))}
        {form.heroNotes.length < maxHeroNotes ? (
          <button type="button" className={styles.addRowBtn} onClick={addHeroNote}>
            + Добавить преимущество
          </button>
        ) : null}
      </div>

      <div className={styles.subformDivider} />

      <div className={styles.form}>
        <h3 className={styles.subformTitle}>Этапы работы</h3>
        <span className={styles.hint}>
          До {maxSteps} шагов (заявка, замер и смета, договор, выполнение). Пустой список —
          стандартные этапы.
        </span>
        {form.steps.map((step, index) => (
          <div key={index} className={styles.stepRow}>
            <div className={styles.stepRowHead}>
              <span className={styles.stepIndex}>{index + 1}</span>
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(index, { title: e.target.value })}
                placeholder="Название этапа"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.removeRowBtn}
                onClick={() => removeStep(index)}
                aria-label="Удалить этап"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={step.description ?? ''}
              onChange={(e) => updateStep(index, { description: e.target.value })}
              placeholder="Короткое описание этапа"
              className={styles.input}
            />
            <div className={styles.stepBgRow}>
              {step.backgroundImage ? (
                <>
                  <img src={step.backgroundImage} alt="" className={styles.stepBgPreview} />
                  <button
                    type="button"
                    className={styles.changeImageBtn}
                    onClick={() => removeStepBackground(index)}
                  >
                    Убрать фон
                  </button>
                </>
              ) : (
                <label className={styles.uploadBtn}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStepFileSelect(index)}
                    className={styles.fileInput}
                  />
                  + Фоновая картинка
                </label>
              )}
            </div>
          </div>
        ))}
        {form.steps.length < maxSteps ? (
          <button type="button" className={styles.addRowBtn} onClick={addStep}>
            + Добавить этап
          </button>
        ) : null}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.stepsCardTransparent}
              onChange={(e) => updateField('stepsCardTransparent', e.target.checked)}
              className={styles.checkbox}
            />
            Прозрачный фон карточек этапов
          </label>
        </div>
      </div>

      <div className={styles.subformDivider} />

      <div className={styles.form}>
        <h3 className={styles.subformTitle}>SEO-текст внизу страницы</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Заголовок блока</label>
            <input
              type="text"
              value={form.seoTextTitle}
              onChange={(e) => updateField('seoTextTitle', e.target.value)}
              placeholder="О ремонте квартир"
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Текст</label>
          <textarea
            value={form.seoText}
            onChange={(e) => updateField('seoText', e.target.value)}
            placeholder="Текстовый блок под каталогом категорий — показывается, только если заполнен."
            className={styles.textarea}
            rows={4}
          />
        </div>
      </div>

      <div className={styles.subformDivider} />

      <div className={styles.form}>
        <h3 className={styles.subformTitle}>Блок «Поможем подобрать услугу»</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Заголовок блока</label>
            <input
              type="text"
              value={form.ctaTitle}
              onChange={(e) => updateField('ctaTitle', e.target.value)}
              placeholder="Поможем подобрать услугу"
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Текст блока</label>
          <textarea
            value={form.ctaText}
            onChange={(e) => updateField('ctaText', e.target.value)}
            placeholder="Расскажите про помещение и задачу — подскажем состав работ..."
            className={styles.textarea}
            rows={2}
          />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Цвет фона блока (HEX)</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                value={form.ctaBackgroundColor || '#ffffff'}
                onChange={(e) => updateField('ctaBackgroundColor', e.target.value)}
                className={styles.colorInput}
              />
              <input
                type="text"
                value={form.ctaBackgroundColor}
                onChange={(e) => updateField('ctaBackgroundColor', e.target.value)}
                placeholder="пусто — прозрачный фон"
                className={styles.input}
              />
              {form.ctaBackgroundColor ? (
                <button
                  type="button"
                  className={styles.changeImageBtn}
                  onClick={() => updateField('ctaBackgroundColor', '')}
                >
                  Сбросить
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Цвет текста блока (HEX)</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                value={form.ctaTextColor || '#111827'}
                onChange={(e) => updateField('ctaTextColor', e.target.value)}
                className={styles.colorInput}
              />
              <input
                type="text"
                value={form.ctaTextColor}
                onChange={(e) => updateField('ctaTextColor', e.target.value)}
                placeholder="пусто — цвет по теме сайта"
                className={styles.input}
              />
              {form.ctaTextColor ? (
                <button
                  type="button"
                  className={styles.changeImageBtn}
                  onClick={() => updateField('ctaTextColor', '')}
                >
                  Сбросить
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Фоновая картинка блока</label>
          {form.ctaBackgroundImage ? (
            <div className={styles.imagePreview}>
              <img src={form.ctaBackgroundImage} alt="Фон CTA-блока" />
              <button
                type="button"
                className={styles.changeImageBtn}
                onClick={() => updateField('ctaBackgroundImage', '')}
              >
                Убрать
              </button>
            </div>
          ) : (
            <label className={styles.uploadBtn}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect('ctaBackgroundImage')}
                className={styles.fileInput}
              />
              + Загрузить картинку
            </label>
          )}
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Размещение фоновой картинки</label>
            <select
              value={form.ctaBackgroundFit}
              onChange={(e) => updateField('ctaBackgroundFit', e.target.value)}
              className={styles.input}
            >
              <option value="contain">Вписать целиком (без обрезки)</option>
              <option value="cover">Заполнить блок (с обрезкой)</option>
              <option value="tile">Замостить повтором</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Прозрачность картинки, %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.ctaBackgroundImageOpacity}
              onChange={(e) =>
                updateField('ctaBackgroundImageOpacity', Number(e.target.value) || 0)
              }
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.ctaShowButtons}
              onChange={(e) => updateField('ctaShowButtons', e.target.checked)}
              className={styles.checkbox}
            />
            Показывать кнопки «Заказать звонок» и «Рассчитать стоимость»
          </label>
        </div>
      </div>

      <div className={styles.settingsActions}>
        <button
          data-admin-mutation
          type="button"
          className={styles.saveButton}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </section>
  );
}
