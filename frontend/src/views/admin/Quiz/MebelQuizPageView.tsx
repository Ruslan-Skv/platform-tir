'use client';

import Link from 'next/link';

import { resolveAdminUploadUrl } from '@/shared/api/admin-quiz';
import { QUIZ_SUBMISSION_STATUS_LABELS } from '@/shared/api/quiz-theme';
import {
  AdminStickyPageRoot,
  AdminStickySaveButtonSlot,
} from '@/views/admin/ui/AdminStickySaveButton';

import styles from './MebelQuizPage.module.css';
import type { useQuizAdminPage } from './hooks/useQuizAdminPage';
import { slugifyQuizOptionValue } from './quiz-admin.config';
import { MebelQuizThemePreview } from './ui/MebelQuizThemePreview';
import { QuizAdminFileUpload } from './ui/QuizAdminFileUpload';

type Model = ReturnType<typeof useQuizAdminPage>;

const TABS: { id: Model['tab']; label: string }[] = [
  { id: 'settings', label: 'Настройки' },
  { id: 'theme', label: 'Оформление' },
  { id: 'steps', label: 'Шаги' },
  { id: 'submissions', label: 'Заявки' },
];

const FONT_OPTIONS = [
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Oswald", system-ui, sans-serif',
  '"Play", system-ui, sans-serif',
];

const FONT_WEIGHT_OPTIONS = [
  { value: 400, label: 'Обычный' },
  { value: 500, label: 'Средний' },
  { value: 600, label: 'Полужирный' },
  { value: 700, label: 'Жирный' },
] as const;

export function QuizAdminPageView({ model }: { model: Model }) {
  const {
    config,
    tab,
    setTab,
    loading,
    saving,
    quiz,
    themeDraft,
    stepsDraft,
    submissions,
    submissionsPage,
    submissionsTotalPages,
    submissionsTotal,
    submissionStats,
    statusFilter,
    setStatusFilter,
    primaryFilter,
    setPrimaryFilter,
    searchFilter,
    setSearchFilter,
    message,
    setQuizField,
    setThemeField,
    setStepsDraft,
    handleSaveSettings,
    handleSaveTheme,
    handleUploadCatalog,
    uploadingCatalog,
    handleUploadBackground,
    handleUploadOptionImage,
    handleUpdateSubmission,
    loadSubmissions,
    setSubmissionsPage,
    previewUrl,
    answerLabels,
    pageHeaderRef,
    showSaveButton,
    saveButtonPinnedTopPx,
    primaryFilterOptions,
    handleSaveClick,
    saveButtonState,
  } = model;

  const editableOptionStepKeys = new Set(config.editableOptionsStepKeys ?? []);

  if (loading || !quiz) {
    return (
      <div className={styles.page}>
        <p>Загрузка…</p>
      </div>
    );
  }

  return (
    <AdminStickyPageRoot stickyTopPx={saveButtonPinnedTopPx} className={styles.page}>
      <header ref={pageHeaderRef} className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>{config.pageTitle}</h1>
            <p className={styles.subtitle}>
              {quiz.domain ? (
                <>
                  <span className={styles.subtitleMuted}>Домен:</span> {quiz.domain}
                  <span className={styles.subtitleSep}>·</span>
                </>
              ) : (
                <>
                  <span className={styles.subtitleMuted}>Домен не задан</span>
                  <span className={styles.subtitleSep}>·</span>
                </>
              )}
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                Открыть квиз
              </a>
            </p>
          </div>
          <div className={styles.tabBar} role="tablist" aria-label="Разделы квиза">
            {TABS.map((t) => {
              const count = t.id === 'submissions' ? submissionStats.total : 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {count ? <span className={styles.tabCount}>{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.activeToggle}>
            <input
              type="checkbox"
              checked={quiz.isActive}
              onChange={(e) => setQuizField('isActive', e.target.checked)}
            />
            Квиз активен
          </label>
          {showSaveButton ? (
            <AdminStickySaveButtonSlot
              state={saveButtonState}
              saving={saving}
              label="Сохранить изменения"
              onClick={handleSaveClick}
            />
          ) : null}
        </div>
      </header>

      {message ? (
        <div className={message.type === 'success' ? styles.toastSuccess : styles.toastError}>
          {message.text}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <form
          id="quiz-settings-form"
          className={`${styles.section} ${styles.settingsForm}`}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSettings();
          }}
        >
          <h2>Основное</h2>
          <p className={styles.hint}>
            Согласие на обработку данных и политика конфиденциальности — единые для всего сайта и
            квизов. Настраиваются в{' '}
            <Link href="/admin/settings/user-cabinet">Личный кабинет → Согласие</Link>.
          </p>
          <div className={styles.settingsBasicGrid}>
            <label>
              Домен
              <input
                value={quiz.domain ?? ''}
                onChange={(e) => setQuizField('domain', e.target.value)}
                placeholder={config.domainPlaceholder}
              />
            </label>
            <label>
              Телефон на лендинге
              <input
                value={quiz.displayPhone ?? ''}
                onChange={(e) => setQuizField('displayPhone', e.target.value)}
              />
            </label>
            <label>
              Адрес
              <input
                value={quiz.city ?? ''}
                onChange={(e) => setQuizField('city', e.target.value)}
                placeholder="Мурманск, ул. Самойловой, 21"
              />
            </label>
          </div>
          <div className={styles.settingsContentGrid}>
            <label>
              Заголовок
              <input
                value={quiz.headline ?? ''}
                onChange={(e) => setQuizField('headline', e.target.value)}
              />
            </label>
            <label>
              Промо-текст
              <input
                value={quiz.promoText ?? ''}
                onChange={(e) => setQuizField('promoText', e.target.value)}
              />
            </label>
            <label className={styles.settingsFullWidth}>
              Подзаголовок
              <textarea
                value={quiz.subheadline ?? ''}
                onChange={(e) => setQuizField('subheadline', e.target.value)}
                rows={2}
              />
            </label>
          </div>

          <h2>Экран «Спасибо»</h2>
          <div className={styles.settingsContentGrid}>
            <label>
              Заголовок
              <input
                value={quiz.successTitle ?? ''}
                onChange={(e) => setQuizField('successTitle', e.target.value)}
              />
            </label>
            <label>
              Файл каталога
              <QuizAdminFileUpload
                url={quiz.catalogFileUrl}
                onUrlChange={(v) => setQuizField('catalogFileUrl', v)}
                onFileSelect={handleUploadCatalog}
                uploading={uploadingCatalog}
                accept=".pdf,image/*"
                uploadLabel="Загрузить файл"
              />
            </label>
            <label className={styles.settingsFullWidth}>
              Текст
              <textarea
                value={quiz.successText ?? ''}
                onChange={(e) => setQuizField('successText', e.target.value)}
                rows={2}
              />
            </label>
          </div>

          <h2>Уведомления о заявках</h2>
          <p className={styles.hint}>
            Email, Telegram и MAX. Номера менеджеров включаются в текст уведомления.
          </p>
          <div className={styles.settingsNotifyGrid}>
            <label>
              Email (каждый с новой строки)
              <textarea
                value={(quiz.notifyEmails ?? []).join('\n')}
                onChange={(e) =>
                  setQuizField(
                    'notifyEmails',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
              />
            </label>
            <label>
              Telegram chat ID
              <textarea
                value={(quiz.notifyTelegramIds ?? []).join('\n')}
                onChange={(e) =>
                  setQuizField(
                    'notifyTelegramIds',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
              />
            </label>
            <label>
              MAX chat ID
              <textarea
                value={(quiz.notifyMaxIds ?? []).join('\n')}
                onChange={(e) =>
                  setQuizField(
                    'notifyMaxIds',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
              />
            </label>
            <label>
              Телефоны менеджеров
              <textarea
                value={(quiz.notifyPhones ?? []).join('\n')}
                onChange={(e) =>
                  setQuizField(
                    'notifyPhones',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
              />
            </label>
          </div>
        </form>
      ) : null}

      {tab === 'theme' ? (
        <form
          id="quiz-theme-form"
          className={`${styles.section} ${styles.themeForm}`}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTheme();
          }}
        >
          <p className={styles.hint}>
            Настройте цвета, шрифты и фон. По умолчанию — фон как на{' '}
            <a href="https://territory-interior.ru/" target="_blank" rel="noopener noreferrer">
              territory-interior.ru
            </a>{' '}
            (<code>/images/light-fon.png</code>).
          </p>
          <div className={styles.themePreviewBar}>
            <MebelQuizThemePreview
              theme={themeDraft}
              headline={quiz.headline}
              subheadline={quiz.subheadline}
              promoText={quiz.promoText}
              city={quiz.city}
              displayPhone={quiz.displayPhone}
            />
          </div>

          <h2>Фон страницы</h2>
          <label>
            Картинка фона (URL или загрузка)
            <div className={styles.fileRow}>
              <input
                value={themeDraft.backgroundImageUrl ?? ''}
                onChange={(e) => setThemeField('backgroundImageUrl', e.target.value.trim() || null)}
                placeholder="/images/light-fon.png"
              />
              <label className={styles.uploadBtn}>
                Загрузить
                <input type="file" accept="image/*" hidden onChange={handleUploadBackground} />
              </label>
              <button
                type="button"
                className={styles.clearBgBtn}
                onClick={() => setThemeField('backgroundImageUrl', null)}
              >
                Убрать
              </button>
            </div>
          </label>
          <div className={styles.grid}>
            <label>
              Прозрачность картинки: {themeDraft.backgroundImageOpacity}%
              <input
                type="range"
                min={0}
                max={100}
                value={themeDraft.backgroundImageOpacity}
                onChange={(e) => setThemeField('backgroundImageOpacity', Number(e.target.value))}
              />
            </label>
            <label>
              Яркость картинки: {themeDraft.backgroundImageBrightness}%
              <input
                type="range"
                min={0}
                max={200}
                value={themeDraft.backgroundImageBrightness}
                onChange={(e) => setThemeField('backgroundImageBrightness', Number(e.target.value))}
              />
            </label>
            <label>
              Цвет подложки
              <input
                value={themeDraft.background}
                onChange={(e) => setThemeField('background', e.target.value)}
              />
            </label>
          </div>

          <h2>Основное</h2>
          <p className={styles.hint}>
            Цвет, размер и начертание текста в шапке и вводной части лендинга.
          </p>

          <h3 className={styles.themeSubheading}>Адрес / телефон</h3>
          <div className={styles.grid}>
            <label>
              Фон бейджа
              <input
                type="color"
                value={themeDraft.cityBadgeBackground}
                onChange={(e) => setThemeField('cityBadgeBackground', e.target.value)}
              />
            </label>
            <label>
              Прозрачность фона: {themeDraft.cityBadgeBackgroundOpacity}%
              <input
                type="range"
                min={0}
                max={100}
                value={themeDraft.cityBadgeBackgroundOpacity}
                onChange={(e) =>
                  setThemeField('cityBadgeBackgroundOpacity', Number(e.target.value))
                }
              />
            </label>
            <label>
              Цвет текста
              <input
                type="color"
                value={themeDraft.cityBadgeTextColor}
                onChange={(e) => setThemeField('cityBadgeTextColor', e.target.value)}
              />
            </label>
            <label>
              Цвет иконки
              <input
                type="color"
                value={themeDraft.cityBadgeIconColor}
                onChange={(e) => setThemeField('cityBadgeIconColor', e.target.value)}
              />
            </label>
            <label>
              Цвет рамки
              <input
                type="color"
                value={themeDraft.cityBadgeBorderColor}
                onChange={(e) => setThemeField('cityBadgeBorderColor', e.target.value)}
              />
            </label>
            <label>
              Размер текста: {themeDraft.cityBadgeFontSize}px
              <input
                type="range"
                min={10}
                max={28}
                value={themeDraft.cityBadgeFontSize}
                onChange={(e) => setThemeField('cityBadgeFontSize', Number(e.target.value))}
              />
            </label>
            <label>
              Размер иконки: {themeDraft.cityBadgeIconSize}px
              <input
                type="range"
                min={10}
                max={28}
                value={themeDraft.cityBadgeIconSize}
                onChange={(e) => setThemeField('cityBadgeIconSize', Number(e.target.value))}
              />
            </label>
            <label>
              Начертание
              <select
                value={themeDraft.cityBadgeFontWeight}
                onChange={(e) => setThemeField('cityBadgeFontWeight', Number(e.target.value))}
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Отступ по горизонтали: {themeDraft.cityBadgePaddingX}px
              <input
                type="range"
                min={4}
                max={40}
                value={themeDraft.cityBadgePaddingX}
                onChange={(e) => setThemeField('cityBadgePaddingX', Number(e.target.value))}
              />
            </label>
            <label>
              Отступ по вертикали: {themeDraft.cityBadgePaddingY}px
              <input
                type="range"
                min={2}
                max={24}
                value={themeDraft.cityBadgePaddingY}
                onChange={(e) => setThemeField('cityBadgePaddingY', Number(e.target.value))}
              />
            </label>
            <label>
              Скругление: {themeDraft.cityBadgeBorderRadius}px
              <input
                type="range"
                min={0}
                max={50}
                value={themeDraft.cityBadgeBorderRadius}
                onChange={(e) => setThemeField('cityBadgeBorderRadius', Number(e.target.value))}
              />
            </label>
            <label>
              Толщина рамки: {themeDraft.cityBadgeBorderWidth}px
              <input
                type="range"
                min={0}
                max={4}
                value={themeDraft.cityBadgeBorderWidth}
                onChange={(e) => setThemeField('cityBadgeBorderWidth', Number(e.target.value))}
              />
            </label>
            <label>
              Тень: {themeDraft.cityBadgeShadowOpacity}%
              <input
                type="range"
                min={0}
                max={100}
                value={themeDraft.cityBadgeShadowOpacity}
                onChange={(e) => setThemeField('cityBadgeShadowOpacity', Number(e.target.value))}
              />
            </label>
          </div>

          <h3 className={styles.themeSubheading}>Заголовок</h3>
          <div className={styles.grid}>
            <label>
              Цвет
              <input
                type="color"
                value={themeDraft.headingColor}
                onChange={(e) => setThemeField('headingColor', e.target.value)}
              />
            </label>
            <label>
              Размер: {themeDraft.headlineFontSize}px
              <input
                type="range"
                min={18}
                max={48}
                step={1}
                value={themeDraft.headlineFontSize}
                onChange={(e) => setThemeField('headlineFontSize', Number(e.target.value))}
              />
            </label>
            <label>
              Начертание
              <select
                value={themeDraft.headlineFontWeight}
                onChange={(e) => setThemeField('headlineFontWeight', Number(e.target.value))}
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3 className={styles.themeSubheading}>Подзаголовок</h3>
          <div className={styles.grid}>
            <label>
              Цвет
              <input
                type="color"
                value={themeDraft.mutedTextColor}
                onChange={(e) => setThemeField('mutedTextColor', e.target.value)}
              />
            </label>
            <label>
              Размер: {themeDraft.subheadlineFontSize}px
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={themeDraft.subheadlineFontSize}
                onChange={(e) => setThemeField('subheadlineFontSize', Number(e.target.value))}
              />
            </label>
            <label>
              Начертание
              <select
                value={themeDraft.subheadlineFontWeight}
                onChange={(e) => setThemeField('subheadlineFontWeight', Number(e.target.value))}
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3 className={styles.themeSubheading}>Промо-текст</h3>
          <div className={styles.grid}>
            <label>
              Цвет
              <input
                type="color"
                value={themeDraft.promoTextColor}
                onChange={(e) => setThemeField('promoTextColor', e.target.value)}
              />
            </label>
            <label>
              Размер: {themeDraft.promoFontSize}px
              <input
                type="range"
                min={11}
                max={24}
                step={1}
                value={themeDraft.promoFontSize}
                onChange={(e) => setThemeField('promoFontSize', Number(e.target.value))}
              />
            </label>
            <label>
              Начертание
              <select
                value={themeDraft.promoFontWeight}
                onChange={(e) => setThemeField('promoFontWeight', Number(e.target.value))}
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2>Блок вопросов</h2>
          <div className={styles.grid}>
            <label>
              Цвет текста
              <input
                type="color"
                value={themeDraft.stepBlockTextColor}
                onChange={(e) => setThemeField('stepBlockTextColor', e.target.value)}
              />
            </label>
            <label>
              Фон карточки
              <input
                value={themeDraft.cardBackground}
                onChange={(e) => setThemeField('cardBackground', e.target.value)}
              />
            </label>
            <label>
              Рамка карточки
              <input
                value={themeDraft.cardBorder}
                onChange={(e) => setThemeField('cardBorder', e.target.value)}
              />
            </label>
          </div>

          <h2>Экран «Спасибо»</h2>
          <div className={styles.grid}>
            <label>
              Заголовок
              <input
                type="color"
                value={themeDraft.successTitleColor}
                onChange={(e) => setThemeField('successTitleColor', e.target.value)}
              />
            </label>
            <label>
              Текст
              <input
                type="color"
                value={themeDraft.successTextColor}
                onChange={(e) => setThemeField('successTextColor', e.target.value)}
              />
            </label>
          </div>

          <h2>Акцент и кнопки</h2>
          <p className={styles.hint}>
            «Далее» / «Отправить» — основная кнопка. «Назад» — вторичная кнопка в блоке вопросов.
          </p>

          <h3 className={styles.themeSubheading}>Кнопка «Далее» / «Отправить»</h3>
          <div className={styles.grid}>
            <label>
              Цвет фона (акцент)
              <input
                type="color"
                value={themeDraft.accentColor}
                onChange={(e) => setThemeField('accentColor', e.target.value)}
              />
            </label>
            <label>
              Цвет текста
              <input
                type="color"
                value={themeDraft.buttonTextColor}
                onChange={(e) => setThemeField('buttonTextColor', e.target.value)}
              />
            </label>
          </div>

          <h3 className={styles.themeSubheading}>Кнопка «Назад»</h3>
          <div className={styles.grid}>
            <label>
              Цвет текста
              <input
                type="color"
                value={themeDraft.backButtonTextColor}
                onChange={(e) => setThemeField('backButtonTextColor', e.target.value)}
              />
            </label>
            <label>
              Цвет рамки
              <input
                value={themeDraft.backButtonBorderColor}
                onChange={(e) => setThemeField('backButtonBorderColor', e.target.value)}
                placeholder="rgba(0, 0, 0, 0.2)"
              />
            </label>
            <label>
              Фон кнопки
              <input
                value={themeDraft.backButtonBackground}
                onChange={(e) => setThemeField('backButtonBackground', e.target.value)}
                placeholder="rgba(255, 255, 255, 0.85) или transparent"
              />
            </label>
          </div>

          <h2>Шрифты</h2>
          <div className={styles.grid}>
            <label>
              Шрифт основного текста
              <select
                value={themeDraft.fontFamily}
                onChange={(e) => setThemeField('fontFamily', e.target.value)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f.split(',')[0].replace(/"/g, '')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Шрифт заголовков
              <select
                value={themeDraft.headingFontFamily}
                onChange={(e) => setThemeField('headingFontFamily', e.target.value)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f.split(',')[0].replace(/"/g, '')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2>Блок шагов</h2>
          <p className={styles.hint}>
            Размер карточки с вопросами и раскладка вариантов ответов на лендинге.
          </p>
          <div className={styles.grid}>
            <label>
              Карточек в строке: {themeDraft.stepChoiceColumns}
              <input
                type="range"
                min={3}
                max={6}
                step={1}
                value={themeDraft.stepChoiceColumns}
                onChange={(e) => setThemeField('stepChoiceColumns', Number(e.target.value))}
              />
            </label>
            <label>
              Ширина блока: {themeDraft.stepBlockMaxWidth}px
              <input
                type="range"
                min={400}
                max={1100}
                step={10}
                value={themeDraft.stepBlockMaxWidth}
                onChange={(e) => setThemeField('stepBlockMaxWidth', Number(e.target.value))}
              />
            </label>
            <label>
              Внутренние отступы: {themeDraft.stepBlockPadding}px
              <input
                type="range"
                min={8}
                max={48}
                step={2}
                value={themeDraft.stepBlockPadding}
                onChange={(e) => setThemeField('stepBlockPadding', Number(e.target.value))}
              />
            </label>
            <label>
              Скругление углов: {themeDraft.stepBlockBorderRadius}px
              <input
                type="range"
                min={0}
                max={32}
                step={2}
                value={themeDraft.stepBlockBorderRadius}
                onChange={(e) => setThemeField('stepBlockBorderRadius', Number(e.target.value))}
              />
            </label>
          </div>

          <h3 className={styles.themeSubheading}>Карточки вариантов ответа</h3>
          <p className={styles.hint}>
            Внешний вид кнопок с картинкой и подписью на шагах с выбором (кухня, шкаф и т.д.).
          </p>
          <div className={styles.grid}>
            <label>
              Фон карточки
              <input
                value={themeDraft.choiceCardBackground}
                onChange={(e) => setThemeField('choiceCardBackground', e.target.value)}
                placeholder="rgba(255, 255, 255, 0.95)"
              />
            </label>
            <label>
              Цвет рамки
              <input
                value={themeDraft.choiceCardBorderColor}
                onChange={(e) => setThemeField('choiceCardBorderColor', e.target.value)}
                placeholder="rgba(0, 0, 0, 0.12)"
              />
            </label>
            <label>
              Толщина рамки: {themeDraft.choiceCardBorderWidth}px
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={themeDraft.choiceCardBorderWidth}
                onChange={(e) => setThemeField('choiceCardBorderWidth', Number(e.target.value))}
              />
            </label>
            <label>
              Скругление карточки: {themeDraft.choiceCardBorderRadius}px
              <input
                type="range"
                min={0}
                max={24}
                step={2}
                value={themeDraft.choiceCardBorderRadius}
                onChange={(e) => setThemeField('choiceCardBorderRadius', Number(e.target.value))}
              />
            </label>
            <label>
              Отступ слева/справа: {themeDraft.choiceCardPaddingX}px
              <input
                type="range"
                min={0}
                max={24}
                step={2}
                value={themeDraft.choiceCardPaddingX}
                onChange={(e) => setThemeField('choiceCardPaddingX', Number(e.target.value))}
              />
            </label>
            <label>
              Отступ сверху/снизу: {themeDraft.choiceCardPaddingY}px
              <input
                type="range"
                min={0}
                max={24}
                step={2}
                value={themeDraft.choiceCardPaddingY}
                onChange={(e) => setThemeField('choiceCardPaddingY', Number(e.target.value))}
              />
            </label>
            <label>
              Отступ до подписи: {themeDraft.choiceCardGap}px
              <input
                type="range"
                min={0}
                max={20}
                step={2}
                value={themeDraft.choiceCardGap}
                onChange={(e) => setThemeField('choiceCardGap', Number(e.target.value))}
              />
            </label>
            <label>
              Высота картинки: {themeDraft.choiceCardImageHeight}px
              <input
                type="range"
                min={40}
                max={120}
                step={4}
                value={themeDraft.choiceCardImageHeight}
                onChange={(e) => setThemeField('choiceCardImageHeight', Number(e.target.value))}
              />
            </label>
            <label>
              Скругление картинки: {themeDraft.choiceCardImageRadius}px
              <input
                type="range"
                min={0}
                max={16}
                step={2}
                value={themeDraft.choiceCardImageRadius}
                onChange={(e) => setThemeField('choiceCardImageRadius', Number(e.target.value))}
              />
            </label>
            <label>
              Фон выбранной карточки
              <input
                value={themeDraft.choiceCardSelectedBackground}
                onChange={(e) => setThemeField('choiceCardSelectedBackground', e.target.value)}
              />
            </label>
            <label>
              Рамка выбранной карточки
              <input
                type="color"
                value={themeDraft.choiceCardSelectedBorderColor}
                onChange={(e) => setThemeField('choiceCardSelectedBorderColor', e.target.value)}
              />
            </label>
          </div>
        </form>
      ) : null}

      {tab === 'steps' ? (
        <div className={`${styles.section} ${styles.compactTab} ${styles.stepsTab}`}>
          <p className={styles.hint}>{config.prefillHint}</p>
          {stepsDraft.map((step, idx) => (
            <div key={step.key} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <strong>
                  {idx + 1}. {step.key}
                  {editableOptionStepKeys.has(step.key) ? (
                    <span className={styles.stepType}> — направления</span>
                  ) : null}
                </strong>
                <span className={styles.stepType}>{step.type}</span>
              </div>
              <label>
                Заголовок
                <input
                  value={step.title}
                  onChange={(e) => {
                    const next = [...stepsDraft];
                    next[idx] = { ...step, title: e.target.value };
                    setStepsDraft(next);
                  }}
                />
              </label>
              {step.type === 'choice' && step.options ? (
                <div className={styles.optionsList}>
                  {step.options.map((opt, oi) => (
                    <div key={opt.value} className={styles.optionRow}>
                      {opt.imageUrl ? (
                        <img
                          src={resolveAdminUploadUrl(opt.imageUrl)}
                          alt=""
                          className={styles.optionThumb}
                        />
                      ) : (
                        <span className={styles.optionThumbEmpty}>нет фото</span>
                      )}
                      <input
                        className={styles.optionLabelInput}
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...stepsDraft];
                          const options = [...(step.options ?? [])];
                          options[oi] = { ...opt, label: e.target.value };
                          next[idx] = { ...step, options };
                          setStepsDraft(next);
                        }}
                      />
                      <input
                        className={styles.optionUrlInput}
                        value={opt.imageUrl ?? ''}
                        placeholder="URL картинки"
                        onChange={(e) => {
                          const next = [...stepsDraft];
                          const options = [...(step.options ?? [])];
                          options[oi] = { ...opt, imageUrl: e.target.value || undefined };
                          next[idx] = { ...step, options };
                          setStepsDraft(next);
                        }}
                      />
                      <label className={styles.uploadBtn}>
                        Загрузить
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleUploadOptionImage(idx, oi, e)}
                        />
                      </label>
                      <span className={styles.optionValue}>{opt.value}</span>
                      {editableOptionStepKeys.has(step.key) ? (
                        <button
                          type="button"
                          className={styles.removeOptionBtn}
                          onClick={() => {
                            const next = [...stepsDraft];
                            const options = (step.options ?? []).filter((_, i) => i !== oi);
                            next[idx] = { ...step, options };
                            setStepsDraft(next);
                          }}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {editableOptionStepKeys.has(step.key) ? (
                    <button
                      type="button"
                      className={styles.addOptionBtn}
                      onClick={() => {
                        const label = 'Новое направление';
                        const value = slugifyQuizOptionValue(label);
                        const next = [...stepsDraft];
                        const options = [
                          ...(step.options ?? []),
                          { value, label, imageUrl: `/quiz/defaults/other.svg` },
                        ];
                        next[idx] = { ...step, options };
                        setStepsDraft(next);
                      }}
                    >
                      + Добавить направление
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'submissions' ? (
        <div className={`${styles.section} ${styles.compactTab} ${styles.submissionsTab}`}>
          <p className={styles.hint}>
            Учёт обращений с квиза. Статусы помогают отслеживать работу менеджеров. Интеграция с CRM
            (автосоздание заказчика) — отдельный этап.
          </p>
          <div className={styles.statsRow}>
            {Object.entries(QUIZ_SUBMISSION_STATUS_LABELS).map(([key, label]) => (
              <span key={key} className={styles.statChip}>
                {label}: {submissionStats[key] ?? 0}
              </span>
            ))}
            <span className={styles.statChip}>
              Всего: {submissionStats.total ?? submissionsTotal}
            </span>
          </div>
          <div className={styles.filters}>
            <input
              placeholder="Поиск: имя или телефон"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Все статусы</option>
              {Object.entries(QUIZ_SUBMISSION_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select value={primaryFilter} onChange={(e) => setPrimaryFilter(e.target.value)}>
              <option value="">{config.primaryFilterLabel}</option>
              {primaryFilterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSubmissionsPage(1);
                loadSubmissions();
              }}
            >
              Применить
            </button>
            <button type="button" onClick={loadSubmissions}>
              Обновить
            </button>
          </div>
          {submissions.length === 0 ? (
            <p>Заявок не найдено</p>
          ) : (
            <div className={styles.submissionsList}>
              {submissions.map((s) => (
                <div key={s.id} className={styles.submissionCard}>
                  <div className={styles.submissionHeader}>
                    <div className={styles.submissionHeaderMain}>
                      <strong>{s.name}</strong> — {s.phone}
                      {s.furnitureType ? (
                        <span className={styles.furnitureBadge}>
                          {answerLabels.get(config.primaryStepKey)?.get(s.furnitureType) ??
                            s.furnitureType}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.submissionHeaderAside}>
                      <label className={styles.submissionStatusLabel}>
                        <span>Статус</span>
                        <select
                          value={s.status}
                          onChange={(e) => handleUpdateSubmission(s.id, { status: e.target.value })}
                        >
                          {Object.entries(QUIZ_SUBMISSION_STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className={styles.submissionDate}>
                        {new Date(s.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <ul className={styles.answersList}>
                    {Object.entries(s.answers as Record<string, string>).map(([k, v]) => {
                      const step = stepsDraft.find((st) => st.key === k);
                      const label = answerLabels.get(k)?.get(v) ?? v;
                      return (
                        <li key={k}>
                          <strong>{step?.title ?? k}:</strong> {label}
                        </li>
                      );
                    })}
                  </ul>
                  <label className={styles.noteLabel}>
                    Заметка менеджера
                    <textarea
                      defaultValue={s.managerNote ?? ''}
                      rows={2}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== (s.managerNote ?? '')) {
                          handleUpdateSubmission(s.id, { managerNote: val || null });
                        }
                      }}
                    />
                  </label>
                  {s.utmCampaign ? <p className={styles.utmLine}>UTM: {s.utmCampaign}</p> : null}
                </div>
              ))}
            </div>
          )}
          {submissionsTotalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                disabled={submissionsPage <= 1}
                onClick={() => setSubmissionsPage(submissionsPage - 1)}
              >
                Назад
              </button>
              <span>
                {submissionsPage} / {submissionsTotalPages} ({submissionsTotal} заявок)
              </span>
              <button
                type="button"
                disabled={submissionsPage >= submissionsTotalPages}
                onClick={() => setSubmissionsPage(submissionsPage + 1)}
              >
                Вперёд
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminStickyPageRoot>
  );
}
