'use client';

import { useState } from 'react';

import {
  type AdminSidebarMobileLayout,
  useAdminSidebarUiPrefs,
} from '@/shared/lib/admin-sidebar-ui-prefs';
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

  return (
    <SettingsSubPageView
      title="Внешний вид админки"
      subtitle="Настройки интерфейса сохраняются в этом браузере и применяются сразу."
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
          Изменения применяются сразу. На узком экране откройте меню (☰), чтобы увидеть выбранный
          вид.
        </p>
      </section>
    </SettingsSubPageView>
  );
}
