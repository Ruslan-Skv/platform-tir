'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  type AdminSidebarDesktopLayout,
  type AdminSidebarMobileLayout,
  useAdminSidebarUiPrefs,
} from '@/shared/lib/admin';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './AppearanceSettingsPage.module.css';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

const DESKTOP_OPTIONS: { value: AdminSidebarDesktopLayout; label: string; hint: string }[] = [
  {
    value: 'list',
    label: 'Список',
    hint: 'Классический вертикальный список с раскрывающимися подменю.',
  },
  {
    value: 'grid2',
    label: 'Сетка 2×',
    hint: 'Плитки по 2 в ряд. Раздел с подменю открывается отдельным экраном.',
  },
];

const MOBILE_OPTIONS: { value: AdminSidebarMobileLayout; label: string; hint: string }[] = [
  {
    value: 'list',
    label: 'Список',
    hint: 'Вертикальный список карточек с подменю.',
  },
  {
    value: 'grid3',
    label: 'Сетка 3×',
    hint: 'Квадратные плитки по 3 в ряд с отдельным экраном подменю.',
  },
];

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

  const desktopLabel =
    DESKTOP_OPTIONS.find((o) => o.value === prefs.desktopLayout)?.label ?? prefs.desktopLayout;
  const mobileLabel =
    MOBILE_OPTIONS.find((o) => o.value === prefs.mobileLayout)?.label ?? prefs.mobileLayout;
  const countTitle = `Десктоп: ${desktopLabel} · Мобильный: ${mobileLabel}`;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link className={cdChrome.backLink} href="/admin/settings">
        ← Настройки
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Внешний вид админки</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>Сайдбар</span>
              </span>
              <AdminSaveNotice visible={saveNoticeVisible} className={styles.headerSuccessNotice}>
                Сохранено
              </AdminSaveNotice>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cdHub.contractsListFiltersPanel} ${styles.helpPanel}`}>
        <p className={styles.helpText}>
          Настройки сохраняются в вашем аккаунте и применяются на всех устройствах. Изменения сразу
          видны в сайдбаре.
        </p>
      </div>

      <div className={styles.stack}>
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Иконки меню</h2>
          <p className={styles.sectionHint}>
            На узкой десктопной рейке (свёрнутый сайдбар) иконки пунктов остаются видимыми, чтобы
            меню оставалось узнаваемым.
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
        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Десктопное меню</h2>
          <p className={styles.sectionHint}>
            Как показывать пункты верхнего уровня в развёрнутом сайдбаре на экранах шире
            1024&nbsp;px. В свёрнутой рейке всегда остаются иконки.
          </p>
          <div className={styles.chipRow} role="group" aria-label="Макет десктопного меню">
            {DESKTOP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={chipClass(prefs.desktopLayout === opt.value)}
                onClick={() => setDesktopLayout(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className={styles.optionHint}>
            {DESKTOP_OPTIONS.find((o) => o.value === prefs.desktopLayout)?.hint}
          </p>
        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Мобильное меню</h2>
          <p className={styles.sectionHint}>
            Как показывать пункты верхнего уровня на экранах до 1024&nbsp;px.
          </p>
          <div className={styles.chipRow} role="group" aria-label="Макет мобильного меню">
            {MOBILE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={chipClass(prefs.mobileLayout === opt.value)}
                onClick={() => setMobileLayout(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className={styles.optionHint}>
            {MOBILE_OPTIONS.find((o) => o.value === prefs.mobileLayout)?.hint}
          </p>
        </section>

        <p className={styles.liveHint}>
          На узком экране откройте меню (☰), на десктопе — разверните сайдбар, чтобы увидеть
          выбранный вид.
          {prefs.hideIcons ? (
            <>
              {' '}
              <span className={styles.summaryBadge}>Иконки скрыты</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
