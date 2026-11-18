'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { getWindowsImageUrl } from '../form/windows-form.utils';
import styles from './WindowsPage.module.css';
import type { WindowsAdminPageModel } from './hooks/useWindowsPage';

type WindowsAdminPageViewProps = {
  model: WindowsAdminPageModel;
};

export function WindowsAdminPageView({ model }: WindowsAdminPageViewProps) {
  const {
    brands,
    systems,
    settingsForm,
    updateSettingsField,
    handleSaveSettings,
    savingSettings,
    uploadingSettingsImage,
    handleSettingsFileSelect,
    uploadingCtaImage,
    handleCtaFileSelect,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleToggleBrandActive,
    handleToggleSystemActive,
  } = model;

  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Окна</h1>
        <div className={styles.headerActions}>
          <Link
            data-admin-mutation
            href="/admin/content/windows/brands/new"
            className={styles.createButton}
          >
            + Добавить бренд
          </Link>
          <Link
            data-admin-mutation
            href="/admin/content/windows/systems/new"
            className={styles.createButton}
          >
            + Добавить профильную систему
          </Link>
          <Link href="/windows" target="_blank" rel="noreferrer" className={styles.viewLink}>
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
            <h2 className={styles.sectionTitle}>Настройки страницы «Окна»</h2>
            <div className={styles.form}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Заголовок страницы</label>
                  <input
                    type="text"
                    value={settingsForm.title}
                    onChange={(e) => updateSettingsField('title', e.target.value)}
                    placeholder="Пластиковые окна"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Подзаголовок</label>
                  <input
                    type="text"
                    value={settingsForm.subtitle}
                    onChange={(e) => updateSettingsField('subtitle', e.target.value)}
                    placeholder="Профильные системы REHAU, VEKA и WHS"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Описание под заголовком</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => updateSettingsField('description', e.target.value)}
                  placeholder="Описание раздела для главной страницы «Окна»..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Изображение герой-блока</label>
                {settingsForm.heroImageUrl ? (
                  <div className={styles.imagePreview}>
                    {}
                    <img src={getWindowsImageUrl(settingsForm.heroImageUrl)} alt="Герой раздела" />
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
                    placeholder="Пластиковые окна в Мурманске"
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
              <h3 className={styles.subformTitle}>Таблица сравнения</h3>
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
                    placeholder="Сравнение профильных систем"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Примечание под таблицей</label>
                  <input
                    type="text"
                    value={settingsForm.comparisonNote}
                    onChange={(e) => updateSettingsField('comparisonNote', e.target.value)}
                    placeholder="Характеристики приведены по данным производителей…"
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
                      checked={settingsForm.comparisonShowChambers}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowChambers', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Камеры
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowDepth}
                      onChange={(e) => updateSettingsField('comparisonShowDepth', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Глубина
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowGlass}
                      onChange={(e) => updateSettingsField('comparisonShowGlass', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Стеклопакет
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowThermal}
                      onChange={(e) =>
                        updateSettingsField('comparisonShowThermal', e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    Теплозащита Rопр
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={settingsForm.comparisonShowSound}
                      onChange={(e) => updateSettingsField('comparisonShowSound', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Звукоизоляция
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.subformDivider} />

            <div className={styles.form}>
              <h3 className={styles.subformTitle}>Блок «Поможем выбрать профиль»</h3>
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
                      src={getWindowsImageUrl(settingsForm.ctaBackgroundImage)}
                      alt="Фон блока «Поможем выбрать профиль»"
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
            <h2 className={styles.sectionTitle}>Бренды профилей</h2>
            {brands.length === 0 ? (
              <p className={styles.empty}>
                Брендов пока нет. Добавьте первый бренд (например, REHAU).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Бренд</th>
                      <th>Slug</th>
                      <th>Страна</th>
                      <th>Систем</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((brand) => (
                      <tr key={brand.id}>
                        <td className={styles.cellName}>
                          {brand.logoUrl && (
                            <img
                              src={getWindowsImageUrl(brand.logoUrl)}
                              alt=""
                              className={styles.rowLogo}
                            />
                          )}
                          {brand.name}
                        </td>
                        <td>/{brand.slug}</td>
                        <td>{brand.country ?? '—'}</td>
                        <td>{brand._count?.systems ?? 0}</td>
                        <td>{brand.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={brand.isActive ? styles.statusActive : styles.statusInactive}
                            onClick={() => handleToggleBrandActive(brand)}
                          >
                            {brand.isActive ? 'Активен' : 'Скрыт'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/windows/brands/${brand.id}/edit`}
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
                                  kind: 'brand',
                                  id: brand.id,
                                  name: brand.name,
                                  note: `Вместе с брендом будут удалены все его профильные системы (${
                                    brand._count?.systems ?? 0
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
            <h2 className={styles.sectionTitle}>Профильные системы</h2>
            {systems.length === 0 ? (
              <p className={styles.empty}>
                Систем пока нет. Добавьте первую систему (например, Blitz New для REHAU).
              </p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Система</th>
                      <th>Бренд</th>
                      <th>Камеры</th>
                      <th>Глубина</th>
                      <th>Rопр</th>
                      <th>Порядок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systems.map((system) => (
                      <tr key={system.id}>
                        <td className={styles.cellName}>
                          {system.name}
                          {system.badge && <span className={styles.badgeChip}>{system.badge}</span>}
                        </td>
                        <td>{system.brand?.name ?? brandNameById.get(system.brandId) ?? '—'}</td>
                        <td>{system.chambers ?? '—'}</td>
                        <td>{system.mountingDepth != null ? `${system.mountingDepth} мм` : '—'}</td>
                        <td>{system.thermalResistance ?? '—'}</td>
                        <td>{system.sortOrder}</td>
                        <td>
                          <button
                            data-admin-mutation
                            type="button"
                            className={
                              system.isActive ? styles.statusActive : styles.statusInactive
                            }
                            onClick={() => handleToggleSystemActive(system)}
                          >
                            {system.isActive ? 'Активна' : 'Скрыта'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <Link
                              href={`/admin/content/windows/systems/${system.id}/edit`}
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
                                  kind: 'system',
                                  id: system.id,
                                  name: system.name,
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
          title={deleteTarget.kind === 'brand' ? 'Удалить бренд?' : 'Удалить профильную систему?'}
          message={`Вы уверены, что хотите удалить «${deleteTarget.name}»?${
            deleteTarget.kind === 'brand' && deleteTarget.note ? ` ${deleteTarget.note}` : ''
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
