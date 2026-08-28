'use client';

import { useState } from 'react';

import {
  type AdminSidebarDesktopLayout,
  type AdminSidebarMobileLayout,
  useAdminSidebarUiPrefs,
} from '@/shared/lib/admin';
import pageStyles from '@/views/admin/Settings/shared/SettingsPage.module.css';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './AppearanceSettingsPage.module.css';

export function AppearanceSettingsPageView() {
  const { prefs, updatePrefs } = useAdminSidebarUiPrefs();
  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false);

  const flashSaved = () => {
    setSaveNoticeVisible(true);
    window.setTimeout(() => setSaveNoticeVisible(false), 2000);
  };

  const setHideIcons = (hideIcons: boolean) => {
    updatePrefs({ hideIcons });
    flashSaved();
  };

  const setMobileLayout = (mobileLayout: AdminSidebarMobileLayout) => {
    updatePrefs({ mobileLayout });
    flashSaved();
  };

  const setDesktopLayout = (desktopLayout: AdminSidebarDesktopLayout) => {
    updatePrefs({ desktopLayout });
    flashSaved();
  };

  return (
    <SettingsSubPageView
      title="Внешний вид админки"
      subtitle="Настройки сохраняются в вашем аккаунте и применяются на всех устройствах."
      saveNoticeVisible={saveNoticeVisible}
      backLink={{ href: '/admin/settings', label: '← К списку настроек' }}
    >
      <section className={pageStyles.section}>
        <h2 className={pageStyles.sectionTitle}>Сайдбар</h2>
        <p className={pageStyles.sectionDescription}>
          Управление отображением бокового меню. На узкой десктопной рейке (свёрнутый сайдбар)
          иконки пунктов остаются видимыми, чтобы меню оставалось узнаваемым.
        </p>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={prefs.hideIcons}
            onChange={(e) => setHideIcons(e.target.checked)}
          />
          <span>
            <strong className={styles.optionTitle}>Скрыть иконки пунктов меню</strong>
            <span className={styles.optionHint}>
              Убирает эмодзи перед названиями в развёрнутом сайдбаре и в мобильном меню.
            </span>
          </span>
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Десктопное меню</legend>
          <p className={styles.fieldsetHint}>
            Как показывать пункты верхнего уровня в развёрнутом сайдбаре на экранах шире
            1024&nbsp;px. В свёрнутой рейке всегда остаются иконки.
          </p>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="desktop-sidebar-layout"
              checked={prefs.desktopLayout === 'list'}
              onChange={() => setDesktopLayout('list')}
            />
            <span>
              <strong className={styles.optionTitle}>Список</strong>
              <span className={styles.optionHint}>
                Классический вертикальный список с раскрывающимися подменю.
              </span>
            </span>
          </label>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="desktop-sidebar-layout"
              checked={prefs.desktopLayout === 'grid2'}
              onChange={() => setDesktopLayout('grid2')}
            />
            <span>
              <strong className={styles.optionTitle}>Сетка 2×</strong>
              <span className={styles.optionHint}>
                Плитки по 2 в ряд. Раздел с подменю открывается отдельным экраном со списком и
                кнопкой «Назад».
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Мобильное меню</legend>
          <p className={styles.fieldsetHint}>
            Как показывать пункты верхнего уровня на экранах до 1024&nbsp;px.
          </p>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="mobile-sidebar-layout"
              checked={prefs.mobileLayout === 'list'}
              onChange={() => setMobileLayout('list')}
            />
            <span>
              <strong className={styles.optionTitle}>Список</strong>
              <span className={styles.optionHint}>
                Текущий вид: вертикальный список карточек с подменю.
              </span>
            </span>
          </label>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="mobile-sidebar-layout"
              checked={prefs.mobileLayout === 'grid3'}
              onChange={() => setMobileLayout('grid3')}
            />
            <span>
              <strong className={styles.optionTitle}>Сетка 3×</strong>
              <span className={styles.optionHint}>
                Квадратные плитки по 3 в ряд. Раздел с подменю открывается отдельным экраном со
                списком и кнопкой «Назад» — сетка не ломается.
              </span>
            </span>
          </label>
        </fieldset>

        <p className={styles.liveHint}>
          Изменения сохраняются в аккаунте и сразу применяются. На узком экране откройте меню (☰),
          на десктопе — разверните сайдбар, чтобы увидеть выбранный вид.
        </p>
      </section>
    </SettingsSubPageView>
  );
}
