'use client';

import { useState } from 'react';

import Link from 'next/link';

import { type AdminLogoVariant, useAdminSidebarUiPrefs } from '@/shared/lib/admin';
import { Logo } from '@/shared/ui/Logo';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './LogoSettingsPage.module.css';

const LOGO_VARIANTS: {
  value: AdminLogoVariant;
  label: string;
  hint: string;
  previewTitleClassName: string;
}[] = [
  {
    value: 'classic',
    label: 'Классический',
    hint: 'Прямые буквы шрифтом Play, прописными — так подпись выглядит сейчас.',
    previewTitleClassName: styles.previewTitleClassic,
  },
  {
    value: 'mission',
    label: '«Миссия» — Great Vibes',
    hint: 'Рукописный шрифт текста миссии компании (territory-interior.ru/mission).',
    previewTitleClassName: styles.previewTitleMission,
  },
];

export function LogoSettingsPageView() {
  const { prefs, updatePrefs } = useAdminSidebarUiPrefs();
  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false);

  const selectVariant = (logoVariant: AdminLogoVariant) => {
    if (prefs.logoVariant === logoVariant) return;
    updatePrefs({ logoVariant });
    setSaveNoticeVisible(true);
    window.setTimeout(() => setSaveNoticeVisible(false), 2000);
  };

  const currentLabel =
    LOGO_VARIANTS.find((variant) => variant.value === prefs.logoVariant)?.label ??
    prefs.logoVariant;

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
                <h1 className={cdHub.title}>Настройка логотипа админки</h1>
              </div>
              <span className={cdHub.contractsListCount} title={`Вариант: ${currentLabel}`}>
                <span className={cdHub.contractsListCountDesktop}>{currentLabel}</span>
                <span className={cdHub.contractsListCountMobile}>Логотип</span>
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
          Выберите, каким шрифтом набирать подпись «Виртуальный офис» рядом со знаком. Настройка
          сохраняется в вашем аккаунте и применяется на всех устройствах — логотип сразу меняется в
          сайдбаре, мобильной шапке и на странице входа.
        </p>
      </div>

      <div className={styles.variantGrid} role="radiogroup" aria-label="Вариант логотипа админки">
        {LOGO_VARIANTS.map((variant) => {
          const active = prefs.logoVariant === variant.value;
          return (
            <button
              key={variant.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.variantCard}${active ? ` ${styles.variantCardActive}` : ''}`}
              onClick={() => selectVariant(variant.value)}
            >
              <span className={styles.variantName}>{variant.label}</span>
              <span className={styles.variantHint}>{variant.hint}</span>
              <span className={styles.previewRow}>
                <Logo markOnly unlinked className={styles.previewMark} />
                <span className={variant.previewTitleClassName}>Виртуальный офис</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className={styles.liveHint}>
        Выбранный вариант применяется мгновенно и сохраняется автоматически — кнопка «Сохранить» не
        нужна.
      </p>
    </div>
  );
}
