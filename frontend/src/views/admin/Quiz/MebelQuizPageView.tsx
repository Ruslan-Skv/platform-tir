'use client';

import { resolveAdminUploadUrl } from '@/shared/api/admin-quiz';
import { FURNITURE_TYPE_LABELS, QUIZ_SUBMISSION_STATUS_LABELS } from '@/shared/api/quiz-theme';

import styles from './MebelQuizPage.module.css';
import type { useMebelQuizPage } from './hooks/useMebelQuizPage';
import { MebelQuizThemePreview } from './ui/MebelQuizThemePreview';

type Model = ReturnType<typeof useMebelQuizPage>;

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

export function MebelQuizPageView({ model }: { model: Model }) {
  const {
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
    furnitureFilter,
    setFurnitureFilter,
    searchFilter,
    setSearchFilter,
    message,
    setQuizField,
    setThemeField,
    setStepsDraft,
    handleSaveSettings,
    handleSaveTheme,
    handleSaveSteps,
    handleUploadCatalog,
    handleUploadBackground,
    handleUploadOptionImage,
    handleUpdateSubmission,
    loadSubmissions,
    setSubmissionsPage,
    previewUrl,
    answerLabels,
  } = model;

  if (loading || !quiz) {
    return (
      <div className={styles.page}>
        <p>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Квиз — Мебель на заказ</h1>
          <p className={styles.subtitle}>
            Лендинг {quiz.domain ? `на домене ${quiz.domain}` : '(домен не задан)'} ·{' '}
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              Открыть квиз
            </a>
          </p>
        </div>
        <label className={styles.activeToggle}>
          <input
            type="checkbox"
            checked={quiz.isActive}
            onChange={(e) => setQuizField('isActive', e.target.checked)}
          />
          Квиз активен
        </label>
      </header>

      {message ? (
        <div className={message.type === 'success' ? styles.toastSuccess : styles.toastError}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.tabsBar}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'submissions' && submissionStats.total ? ` (${submissionStats.total})` : ''}
            </button>
          ))}
        </div>
        {tab === 'settings' ? (
          <button
            type="submit"
            form="quiz-settings-form"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        ) : null}
        {tab === 'theme' ? (
          <button
            type="submit"
            form="quiz-theme-form"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        ) : null}
        {tab === 'steps' ? (
          <button
            type="button"
            className={styles.saveButton}
            disabled={saving}
            onClick={handleSaveSteps}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        ) : null}
      </div>

      {tab === 'settings' ? (
        <form
          id="quiz-settings-form"
          className={styles.section}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSettings();
          }}
        >
          <h2>Основное</h2>
          <div className={styles.grid}>
            <label>
              Домен
              <input
                value={quiz.domain ?? ''}
                onChange={(e) => setQuizField('domain', e.target.value)}
                placeholder="mebel-na-zakaz-51.ru"
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
              Город
              <input
                value={quiz.city ?? ''}
                onChange={(e) => setQuizField('city', e.target.value)}
              />
            </label>
          </div>
          <label>
            Заголовок
            <input
              value={quiz.headline ?? ''}
              onChange={(e) => setQuizField('headline', e.target.value)}
            />
          </label>
          <label>
            Подзаголовок
            <textarea
              value={quiz.subheadline ?? ''}
              onChange={(e) => setQuizField('subheadline', e.target.value)}
              rows={2}
            />
          </label>
          <label>
            Промо-текст
            <input
              value={quiz.promoText ?? ''}
              onChange={(e) => setQuizField('promoText', e.target.value)}
            />
          </label>

          <h2>Экран «Спасибо»</h2>
          <label>
            Заголовок
            <input
              value={quiz.successTitle ?? ''}
              onChange={(e) => setQuizField('successTitle', e.target.value)}
            />
          </label>
          <label>
            Текст
            <textarea
              value={quiz.successText ?? ''}
              onChange={(e) => setQuizField('successText', e.target.value)}
              rows={3}
            />
          </label>
          <label>
            Файл каталога
            <div className={styles.fileRow}>
              <input
                value={quiz.catalogFileUrl ?? ''}
                onChange={(e) => setQuizField('catalogFileUrl', e.target.value)}
              />
              <input type="file" accept=".pdf,image/*" onChange={handleUploadCatalog} />
            </div>
          </label>

          <h2>Уведомления о заявках</h2>
          <p className={styles.hint}>
            Email и Telegram. Номера менеджеров включаются в текст уведомления.
          </p>
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
              rows={3}
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
        </form>
      ) : null}

      {tab === 'theme' ? (
        <form
          id="quiz-theme-form"
          className={styles.section}
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
          <MebelQuizThemePreview
            theme={themeDraft}
            headline={quiz.headline}
            subheadline={quiz.subheadline}
            city={quiz.city}
            displayPhone={quiz.displayPhone}
          />

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
          </div>
          <label>
            Цвет подложки (виден при прозрачности или без картинки)
            <input
              value={themeDraft.background}
              onChange={(e) => setThemeField('background', e.target.value)}
            />
          </label>

          <h2>Цвета и шрифты</h2>
          <div className={styles.grid}>
            <label>
              Акцентный цвет
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
                value={themeDraft.textColor}
                onChange={(e) => setThemeField('textColor', e.target.value)}
              />
            </label>
            <label>
              Цвет заголовков
              <input
                type="color"
                value={themeDraft.headingColor}
                onChange={(e) => setThemeField('headingColor', e.target.value)}
              />
            </label>
            <label>
              Фон карточки шага
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
            <label>
              Цвет текста кнопки
              <input
                type="color"
                value={themeDraft.buttonTextColor}
                onChange={(e) => setThemeField('buttonTextColor', e.target.value)}
              />
            </label>
            <label>
              Приглушённый текст
              <input
                value={themeDraft.mutedTextColor}
                onChange={(e) => setThemeField('mutedTextColor', e.target.value)}
              />
            </label>
          </div>
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

          <h2>Бейджи в шапке</h2>
          <p className={styles.hint}>
            Общее оформление бейджей города и телефона в шапке квиза. Название города и номер
            задаются во вкладке «Настройки».
          </p>
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
        </form>
      ) : null}

      {tab === 'steps' ? (
        <div className={styles.section}>
          <p className={styles.hint}>
            Для рекламы на кухни: <code>?type=kitchen</code> — пропускает шаг выбора типа мебели.
          </p>
          {stepsDraft.map((step, idx) => (
            <div key={step.key} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <strong>
                  {idx + 1}. {step.key}
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
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'submissions' ? (
        <div className={styles.section}>
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
            <select value={furnitureFilter} onChange={(e) => setFurnitureFilter(e.target.value)}>
              <option value="">Все типы мебели</option>
              {Object.entries(FURNITURE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
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
                    <div>
                      <strong>{s.name}</strong> — {s.phone}
                      {s.furnitureType ? (
                        <span className={styles.furnitureBadge}>
                          {FURNITURE_TYPE_LABELS[s.furnitureType] ?? s.furnitureType}
                        </span>
                      ) : null}
                    </div>
                    <span>{new Date(s.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <div className={styles.submissionMeta}>
                    <label>
                      Статус
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
    </div>
  );
}
