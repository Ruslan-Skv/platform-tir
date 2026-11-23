'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { getFurnitureImageUrl } from '../form/furniture-form.utils';
import styles from './FurniturePage.module.css';
import type { FurnitureAdminPageModel } from './hooks/useFurniturePage';

type FurnitureAdminPageViewProps = {
  model: FurnitureAdminPageModel;
};

export function FurnitureAdminPageView({ model }: FurnitureAdminPageViewProps) {
  const {
    categories,
    products,
    settingsForm,
    updateSettingsField,
    handleSaveSettings,
    savingSettings,
    uploadingSettingsImage,
    handleSettingsFileSelect,
    uploadingCtaImage,
    handleCtaFileSelect,
    addMaterial,
    updateMaterial,
    removeMaterial,
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
    handleToggleCategoryActive,
    handleToggleProductActive,
  } = model;

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мебель</h1>
        <div className={styles.headerActions}>
          <Link
            data-admin-mutation
            href="/admin/content/furniture/categories/new"
            className={styles.createButton}
          >
            + Добавить категорию
          </Link>
          <Link
            data-admin-mutation
            href="/admin/content/furniture/products/new"
            className={styles.createButton}
          >
            + Добавить изделие
          </Link>
          <Link href="/furniture" target="_blank" rel="noreferrer" className={styles.viewLink}>
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
            <h2 className={styles.sectionTitle}>Настройки страницы «Мебель»</h2>
            <div className={styles.form}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Заголовок страницы</label>
                  <input
                    type="text"
                    value={settingsForm.title}
                    onChange={(e) => updateSettingsField('title', e.target.value)}
                    placeholder="Мебель"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Подзаголовок</label>
                  <input
                    type="text"
                    value={settingsForm.subtitle}
                    onChange={(e) => updateSettingsField('subtitle', e.target.value)}
                    placeholder="Кухни, шкафы-купе, гардеробные и прихожие по вашим размерам"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Описание под заголовком</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => updateSettingsField('description', e.target.value)}
                  placeholder="Описание раздела для главной страницы «Мебель»..."
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
                      src={getFurnitureImageUrl(settingsForm.heroImageUrl)}
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
                    placeholder="Мебель на заказ в Мурманске"
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
              <h3 className={styles.subformTitle}>Таблица сравнения изделий</h3>
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
                    placeholder="Сравнение видов мебели"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Примечание под таблицей</label>
                  <input
                    type="text"
                    value={settingsForm.comparisonNote}
                    onChange={(e) => updateSettingsField('comparisonNote', e.target.value)}
                    placeholder="Цены кухонь указаны за погонный метр…"
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
                      checked={settingsForm.comparisonShowConfiguration}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowConfiguration', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Конфигурация
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowFacade}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowFacade', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Фасады
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowHardware}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowHardware', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Фурнитура
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowPrice}
                      onChange={(e) => updateSettingsField('comparisonShowPrice', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Цена
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Материалы и фурнитура</h3>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={settingsForm.materialsShow}
                    onChange={(e) => updateSettingsField('materialsShow', e.target.checked)}
                    className={styles.checkbox}
                  />
                  Показывать блок «Материалы и фурнитура» на странице
                </label>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Заголовок блока</label>
                <input
                  type="text"
                  value={settingsForm.materialsTitle}
                  onChange={(e) => updateSettingsField('materialsTitle', e.target.value)}
                  placeholder="Материалы и фурнитура"
                  className={styles.input}
                />
              </div>
              {settingsForm.materials.map((material, index) => (
                <div key={index} className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Материал {index + 1} — название</label>
                    <input
                      type="text"
                      value={material.name}
                      onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                      placeholder="МДФ в эмали"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Описание</label>
                    <div className={styles.dynamicRow}>
                      <input
                        type="text"
                        value={material.description}
                        onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                        placeholder="Премиальные фасады в любой цвет по RAL…"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.removeRowBtn}
                        onClick={() => removeMaterial(index)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className={styles.addRowBtn} onClick={addMaterial}>
                + Добавить материал
              </button>
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
                    placeholder="Калькулятор стоимости мебели"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Примечание под калькулятором</label>
                  <input
                    type="text"
                    value={settingsForm.calcNote}
                    onChange={(e) => updateSettingsField('calcNote', e.target.value)}
                    placeholder="Расчёт предварительный: точную смету составит дизайнер…"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Сборка и установка, ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcAssemblyPrice}
                    onChange={(e) =>
                      updateSettingsField('calcAssemblyPrice', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Опция «Доставка», ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcDeliveryPrice}
                    onChange={(e) =>
                      updateSettingsField('calcDeliveryPrice', Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Опция «Премиум-фурнитура», ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.calcPremiumHardwarePrice}
                    onChange={(e) =>
                      updateSettingsField('calcPremiumHardwarePrice', Number(e.target.value))
                    }
                    className={styles.input}
                  />
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
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.hint}>
                  Цена изделий для калькулятора берётся из поля «Цена от» активных изделий: кухни —
                  за погонный метр, остальная мебель — за изделие.
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
                      placeholder="Бесплатный замер и 3D-проект"
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
                        placeholder="Дизайнер приедет с образцами декоров и подготовит 3D-проект…"
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
                    placeholder="Сколько стоит мебель на заказ?"
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
              <h3 className={styles.subformTitle}>Блок «Поможем спроектировать мебель»</h3>
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
                      src={getFurnitureImageUrl(settingsForm.ctaBackgroundImage)}
                      alt="Фон блока «Поможем спроектировать мебель»"
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
            <h2 className={styles.sectionTitle}>Категории изделий</h2>
            {categories.length === 0 ? (
              <p className={styles.empty}>
                Категорий пока нет. Добавьте первую категорию (например, «Кухни»).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Категория</th>
                      <th>Slug</th>
                      <th>Изделий</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className={styles.cellName}>{category.name}</td>
                        <td>/{category.slug}</td>
                        <td>{category._count?.products ?? 0}</td>
                        <td>{category.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={
                              category.isActive ? styles.statusActive : styles.statusInactive
                            }
                            onClick={() => handleToggleCategoryActive(category)}
                          >
                            {category.isActive ? 'Активна' : 'Скрыта'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/furniture/categories/${category.id}/edit`}
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
                                  kind: 'category',
                                  id: category.id,
                                  name: category.name,
                                  note: `Вместе с категорией будут удалены все её изделия (${
                                    category._count?.products ?? 0
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
            <h2 className={styles.sectionTitle}>Изделия</h2>
            {products.length === 0 ? (
              <p className={styles.empty}>
                Изделий пока нет. Добавьте первое изделие (например, «Прямые кухни»).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Изделие</th>
                      <th>Категория</th>
                      <th>Конфигурация</th>
                      <th>Фасады</th>
                      <th>Цена от</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className={styles.cellName}>
                          {product.name}
                          {product.badge && (
                            <span className={styles.badgeChip}>{product.badge}</span>
                          )}
                        </td>
                        <td>
                          {product.category?.name ??
                            categoryNameById.get(product.categoryId) ??
                            '—'}
                        </td>
                        <td>{product.configuration ?? '—'}</td>
                        <td>{product.facadeMaterial ?? '—'}</td>
                        <td>
                          {product.priceFrom != null
                            ? `${product.priceFrom} ₽${product.priceUnit ? `/${product.priceUnit}` : ''}`
                            : '—'}
                        </td>
                        <td>{product.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={
                              product.isActive ? styles.statusActive : styles.statusInactive
                            }
                            onClick={() => handleToggleProductActive(product)}
                          >
                            {product.isActive ? 'Активно' : 'Скрыто'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/furniture/products/${product.id}/edit`}
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
                                  kind: 'product',
                                  id: product.id,
                                  name: product.name,
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
          title={deleteTarget.kind === 'category' ? 'Удалить категорию?' : 'Удалить изделие?'}
          message={`Вы уверены, что хотите удалить «${deleteTarget.name}»?${
            deleteTarget.kind === 'category' && deleteTarget.note ? ` ${deleteTarget.note}` : ''
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
