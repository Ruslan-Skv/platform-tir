'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { getStretchCeilingsImageUrl } from '../form/stretch-ceilings-form.utils';
import styles from './StretchCeilingsPage.module.css';
import type { StretchCeilingsAdminPageModel } from './hooks/useStretchCeilingsPage';

type StretchCeilingsAdminPageViewProps = {
  model: StretchCeilingsAdminPageModel;
};

export function StretchCeilingsAdminPageView({ model }: StretchCeilingsAdminPageViewProps) {
  const {
    manufacturers,
    fabrics,
    settingsForm,
    updateSettingsField,
    handleSaveSettings,
    savingSettings,
    uploadingSettingsImage,
    handleSettingsFileSelect,
    uploadingCtaImage,
    handleCtaFileSelect,
    addStep,
    updateStep,
    removeStep,
    addFaqItem,
    updateFaqItem,
    removeFaqItem,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleToggleManufacturerActive,
    handleToggleFabricActive,
  } = model;

  const manufacturerNameById = new Map(manufacturers.map((m) => [m.id, m.name]));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Натяжные потолки</h1>
        <div className={styles.headerActions}>
          <Link
            data-admin-mutation
            href="/admin/content/stretch-ceilings/manufacturers/new"
            className={styles.createButton}
          >
            + Добавить производителя
          </Link>
          <Link
            data-admin-mutation
            href="/admin/content/stretch-ceilings/fabrics/new"
            className={styles.createButton}
          >
            + Добавить фактуру
          </Link>
          <Link
            href="/stretch-ceilings"
            target="_blank"
            rel="noreferrer"
            className={styles.viewLink}
          >
            Просмотр на сайте
          </Link>
        </div>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {loading || !settingsForm ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : (
        <>
          <section className={styles.settingsSection}>
            <h2 className={styles.sectionTitle}>Настройки страницы «Натяжные потолки»</h2>
            <div className={styles.form}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Заголовок страницы</label>
                  <input
                    type="text"
                    value={settingsForm.title}
                    onChange={(e) => updateSettingsField('title', e.target.value)}
                    placeholder="Натяжные потолки"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Подзаголовок</label>
                  <input
                    type="text"
                    value={settingsForm.subtitle}
                    onChange={(e) => updateSettingsField('subtitle', e.target.value)}
                    placeholder="Полотна MSD, Bauf, Pongs, Descor и Cerutti"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Описание под заголовком</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => updateSettingsField('description', e.target.value)}
                  placeholder="Описание раздела для главной страницы «Натяжные потолки»..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Изображение герой-блока</label>
                {settingsForm.heroImageUrl ? (
                  <div className={styles.imagePreview}>
                    {}
                    <img
                      src={getStretchCeilingsImageUrl(settingsForm.heroImageUrl)}
                      alt="Герой раздела"
                    />
                    <button
                      type="button"
                      className={styles.changeImageBtn}
                      onClick={() => updateSettingsField('heroImageUrl', '')}
                      disabled={uploadingSettingsImage}
                    >
                      Убрать
                    </button>
                  </div>
                ) : (
                  <label className={styles.uploadBtn}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSettingsFileSelect}
                      className={styles.fileInput}
                    />
                    {uploadingSettingsImage ? 'Загрузка...' : '+ Загрузить изображение'}
                  </label>
                )}
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>SEO title</label>
                  <input
                    type="text"
                    value={settingsForm.seoTitle}
                    onChange={(e) => updateSettingsField('seoTitle', e.target.value)}
                    placeholder="Натяжные потолки в Мурманске"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>SEO description</label>
                  <input
                    type="text"
                    value={settingsForm.seoDescription}
                    onChange={(e) => updateSettingsField('seoDescription', e.target.value)}
                    placeholder="Описание для поисковых систем"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.settingsActions}>
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Таблица сравнения фактур</h3>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settingsForm.comparisonShow}
                    onChange={(e) => updateSettingsField('comparisonShow', e.target.checked)}
                    className={styles.checkbox}
                  />
                  Показывать таблицу сравнения на странице
                </label>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Заголовок таблицы</label>
                  <input
                    type="text"
                    value={settingsForm.comparisonTitle}
                    onChange={(e) => updateSettingsField('comparisonTitle', e.target.value)}
                    placeholder="Сравнение фактур полотен"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Примечание под таблицей</label>
                  <input
                    type="text"
                    value={settingsForm.comparisonNote}
                    onChange={(e) => updateSettingsField('comparisonNote', e.target.value)}
                    placeholder="Цены указаны за квадратный метр «под ключ»…"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Колонки таблицы</span>
                <div className={styles.checkboxGrid}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowTexture}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowTexture', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Тип фактуры
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowWidth}
                      onChange={(e) => updateSettingsField('comparisonShowWidth', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Ширина полотна
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowPrice}
                      onChange={(e) => updateSettingsField('comparisonShowPrice', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Цена за м²
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowCountry}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowCountry', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Страна производителя
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Калькулятор стоимости</h3>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settingsForm.calcShow}
                    onChange={(e) => updateSettingsField('calcShow', e.target.checked)}
                    className={styles.checkbox}
                  />
                  Показывать калькулятор на странице
                </label>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Заголовок калькулятора</label>
                  <input
                    type="text"
                    value={settingsForm.calcTitle}
                    onChange={(e) => updateSettingsField('calcTitle', e.target.value)}
                    placeholder="Калькулятор стоимости потолка"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Примечание под калькулятором</label>
                  <input
                    type="text"
                    value={settingsForm.calcNote}
                    onChange={(e) => updateSettingsField('calcNote', e.target.value)}
                    placeholder="Расчёт предварительный: точную смету составит замерщик…"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Багет, ₽ за м.п.</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcPricePerMeterBaget}
                    onChange={(e) =>
                      updateSettingsField('calcPricePerMeterBaget', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Доп. угол (сверх 4), ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcPricePerCorner}
                    onChange={(e) =>
                      updateSettingsField('calcPricePerCorner', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Светильник, ₽ за точку</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcPricePerLight}
                    onChange={(e) =>
                      updateSettingsField('calcPricePerLight', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Обход трубы, ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcPricePerPipe}
                    onChange={(e) =>
                      updateSettingsField('calcPricePerPipe', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Опция «Монтаж люстры», ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcLightOptionPrice}
                    onChange={(e) =>
                      updateSettingsField('calcLightOptionPrice', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Опция «Закладная под карниз», ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcCorniceOptionPrice}
                    onChange={(e) =>
                      updateSettingsField('calcCorniceOptionPrice', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Минимальная сумма заказа, ₽</label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.calcMinOrder}
                  onChange={(e) => updateSettingsField('calcMinOrder', Number(e.target.value))}
                  className={styles.input}
                />
                <span className={styles.hint}>
                  Цена полотен для калькулятора берётся из поля «Цена от, ₽/м²» активных фактур.
                </span>
              </div>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Этапы работы</h3>
              {settingsForm.steps.map((step, index) => (
                <div key={index} className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Этап {index + 1} — название</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, 'title', e.target.value)}
                      placeholder="Бесплатный замер"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Описание</label>
                    <div className={styles.dynamicRow}>
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Замерщик приедет в удобное время с образцами полотен…"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.removeRowBtn}
                        onClick={() => removeStep(index)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={addStep}>
                + Добавить этап
              </button>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>FAQ (частые вопросы)</h3>
              {settingsForm.faq.map((item, index) => (
                <div key={index} className={styles.field}>
                  <label className={styles.label}>Вопрос {index + 1}</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                    placeholder="Сколько стоит натяжной потолок за квадратный метр?"
                    className={styles.input}
                  />
                  <div className={`${styles.dynamicRow} ${styles.dynamicRowSpacing}`}>
                    <input
                      type="text"
                      value={item.answer}
                      onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                      placeholder="Ответ на вопрос…"
                      className={styles.input}
                    />
                    <button
                      type="button"
                      className={styles.removeRowBtn}
                      onClick={() => removeFaqItem(index)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={addFaqItem}>
                + Добавить вопрос
              </button>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Блок «Поможем выбрать потолок»</h3>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Цвет фона блока (HEX)</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      value={settingsForm.ctaBackgroundColor || '#ffffff'}
                      onChange={(e) => updateSettingsField('ctaBackgroundColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settingsForm.ctaBackgroundColor}
                      onChange={(e) => updateSettingsField('ctaBackgroundColor', e.target.value)}
                      placeholder="пусто — прозрачный фон"
                      className={styles.input}
                    />
                    {settingsForm.ctaBackgroundColor && (
                      <button
                        type="button"
                        className={styles.changeImageBtn}
                        onClick={() => updateSettingsField('ctaBackgroundColor', '')}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <span className={styles.hint}>По умолчанию блок прозрачный.</span>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Цвет текста блока (HEX)</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      value={settingsForm.ctaTextColor || '#111827'}
                      onChange={(e) => updateSettingsField('ctaTextColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settingsForm.ctaTextColor}
                      onChange={(e) => updateSettingsField('ctaTextColor', e.target.value)}
                      placeholder="пусто — цвет по теме сайта"
                      className={styles.input}
                    />
                    {settingsForm.ctaTextColor && (
                      <button
                        type="button"
                        className={styles.changeImageBtn}
                        onClick={() => updateSettingsField('ctaTextColor', '')}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Размещение фоновой картинки</label>
                  <select
                    value={settingsForm.ctaBackgroundFit}
                    onChange={(e) => updateSettingsField('ctaBackgroundFit', e.target.value)}
                    className={styles.input}
                  >
                    <option value="contain">Вписать целиком (без обрезки)</option>
                    <option value="cover">Заполнить блок с обрезкой</option>
                    <option value="tile">Замостить плиткой в оригинальном размере</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Прозрачность фоновой картинки, %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settingsForm.ctaBackgroundImageOpacity}
                    onChange={(e) =>
                      updateSettingsField('ctaBackgroundImageOpacity', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                  <span className={styles.hint}>
                    0 — картинка невидима, 100 — полностью непрозрачна. Применяется к загруженной
                    картинке.
                  </span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Фоновая картинка блока</label>
                {settingsForm.ctaBackgroundImage ? (
                  <div className={styles.imagePreview}>
                    <img
                      src={getStretchCeilingsImageUrl(settingsForm.ctaBackgroundImage)}
                      alt="Фон блока «Поможем выбрать потолок»"
                    />
                    <div className={styles.imageActions}>
                      <button
                        type="button"
                        className={styles.changeImageBtn}
                        onClick={() => updateSettingsField('ctaBackgroundImage', '')}
                        disabled={uploadingCtaImage}
                      >
                        Убрать
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={styles.uploadBtn}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCtaFileSelect}
                      className={styles.fileInput}
                    />
                    {uploadingCtaImage ? 'Загрузка...' : '+ Загрузить фон'}
                  </label>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settingsForm.ctaShowButtons}
                    onChange={(e) => updateSettingsField('ctaShowButtons', e.target.checked)}
                    className={styles.checkbox}
                  />
                  Показывать кнопки «Вызвать замерщика» и «Получить расчёт»
                </label>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Производители полотен</h2>
            {manufacturers.length === 0 ? (
              <p className={styles.empty}>
                Производителей пока нет. Добавьте первого производителя (например, MSD).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Производитель</th>
                      <th>Slug</th>
                      <th>Страна</th>
                      <th>Фактур</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manufacturers.map((manufacturer) => (
                      <tr key={manufacturer.id}>
                        <td className={styles.cellName}>
                          {manufacturer.logoUrl && (
                            <img
                              src={getStretchCeilingsImageUrl(manufacturer.logoUrl)}
                              alt=""
                              className={styles.rowLogo}
                            />
                          )}
                          {manufacturer.name}
                        </td>
                        <td>/{manufacturer.slug}</td>
                        <td>{manufacturer.country ?? '—'}</td>
                        <td>{manufacturer._count?.fabrics ?? 0}</td>
                        <td>{manufacturer.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={
                              manufacturer.isActive ? styles.statusActive : styles.statusInactive
                            }
                            onClick={() => handleToggleManufacturerActive(manufacturer)}
                          >
                            {manufacturer.isActive ? 'Активен' : 'Скрыт'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/stretch-ceilings/manufacturers/${manufacturer.id}/edit`}
                              className={styles.editLink}
                            >
                              Изменить
                            </Link>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.deleteButton}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'manufacturer',
                                  id: manufacturer.id,
                                  name: manufacturer.name,
                                  note: `Вместе с производителем будут удалены все его фактуры (${
                                    manufacturer._count?.fabrics ?? 0
                                  } шт.).`,
                                })
                              }
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Фактуры полотен</h2>
            {fabrics.length === 0 ? (
              <p className={styles.empty}>
                Фактур пока нет. Добавьте первую фактуру (например, MSD Classic Mat).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Фактура</th>
                      <th>Производитель</th>
                      <th>Тип</th>
                      <th>Ширина</th>
                      <th>Цена от, ₽/м²</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabrics.map((fabric) => (
                      <tr key={fabric.id}>
                        <td className={styles.cellName}>
                          {fabric.name}
                          {fabric.badge && <span className={styles.badgeChip}>{fabric.badge}</span>}
                        </td>
                        <td>
                          {fabric.manufacturer?.name ??
                            manufacturerNameById.get(fabric.manufacturerId) ??
                            '—'}
                        </td>
                        <td>{fabric.textureType ?? '—'}</td>
                        <td>{fabric.width ?? '—'}</td>
                        <td>{fabric.priceFrom ?? '—'}</td>
                        <td>{fabric.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={
                              fabric.isActive ? styles.statusActive : styles.statusInactive
                            }
                            onClick={() => handleToggleFabricActive(fabric)}
                          >
                            {fabric.isActive ? 'Активна' : 'Скрыта'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/stretch-ceilings/fabrics/${fabric.id}/edit`}
                              className={styles.editLink}
                            >
                              Изменить
                            </Link>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.deleteButton}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'fabric',
                                  id: fabric.id,
                                  name: fabric.name,
                                })
                              }
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen
          title={
            deleteTarget.kind === 'manufacturer'
              ? 'Удалить производителя?'
              : 'Удалить фактуру полотна?'
          }
          message={`Вы уверены, что хотите удалить «${deleteTarget.name}»?${
            deleteTarget.kind === 'manufacturer' && deleteTarget.note ? ` ${deleteTarget.note}` : ''
          }`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      )}
    </div>
  );
}
