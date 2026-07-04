'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type AdminDashboardSettings,
  DEFAULT_ADMIN_DASHBOARD_SETTINGS,
  getAdminDashboardSettings,
  updateAdminDashboardSettings,
} from '@/shared/api/admin-dashboard';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import {
  ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  KnowledgePlatformSettingsIcon,
} from '@/shared/ui/icons';

import styles from './DashboardSettingsButton.module.css';

type QuickLinkDraft = {
  key: string;
  label: string;
  href: string;
  isEnabled: boolean;
};

type DashboardSettingsButtonProps = {
  onSettingsChange: (settings: AdminDashboardSettings) => void;
};

const MAX_QUICK_LINKS = 20;
const SAVE_SUCCESS_VISIBLE_MS = 3000;

type DashboardSettingsDraft = {
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  quickLinks: QuickLinkDraft[];
};

type SavedDashboardSettingsSnapshot = {
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  quickLinks: Array<{ label: string; href: string; isEnabled: boolean }>;
};

function settingsToDraft(settings: AdminDashboardSettings): DashboardSettingsDraft {
  return {
    catalogActivityVisible: settings.catalogActivityVisible,
    trainingDynamicsVisible: settings.trainingDynamicsVisible,
    quickLinks: settings.quickLinks.map((link, index) => ({
      key: link.id || `link-${index}`,
      label: link.label,
      href: link.href,
      isEnabled: link.isEnabled,
    })),
  };
}

function toSavedSnapshot(draft: DashboardSettingsDraft): SavedDashboardSettingsSnapshot {
  return {
    catalogActivityVisible: draft.catalogActivityVisible,
    trainingDynamicsVisible: draft.trainingDynamicsVisible,
    quickLinks: draft.quickLinks.map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
      isEnabled: link.isEnabled,
    })),
  };
}

function snapshotsEqual(
  left: SavedDashboardSettingsSnapshot,
  right: SavedDashboardSettingsSnapshot
): boolean {
  if (left.catalogActivityVisible !== right.catalogActivityVisible) return false;
  if (left.trainingDynamicsVisible !== right.trainingDynamicsVisible) return false;
  if (left.quickLinks.length !== right.quickLinks.length) return false;

  return left.quickLinks.every((link, index) => {
    const other = right.quickLinks[index];
    return (
      link.label === other.label && link.href === other.href && link.isEnabled === other.isEnabled
    );
  });
}

function validateQuickLinks(quickLinks: QuickLinkDraft[]): string | null {
  for (const link of quickLinks) {
    const label = link.label.trim();
    const href = link.href.trim();
    if (!label) return 'У каждой быстрой ссылки должно быть название';
    if (!href) return 'У каждой быстрой ссылки должен быть адрес';
    if (!href.startsWith('/') || href.startsWith('//')) {
      return 'Адрес ссылки должен начинаться с / (внутри приложения)';
    }
  }
  return null;
}

export function DashboardSettingsButton({ onSettingsChange }: DashboardSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [catalogActivityVisible, setCatalogActivityVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.catalogActivityVisible
  );
  const [trainingDynamicsVisible, setTrainingDynamicsVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.trainingDynamicsVisible
  );
  const [quickLinks, setQuickLinks] = useState<QuickLinkDraft[]>([]);
  const [savedSettings, setSavedSettings] = useState<SavedDashboardSettingsSnapshot>(() =>
    toSavedSnapshot(settingsToDraft(DEFAULT_ADMIN_DASHBOARD_SETTINGS))
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
      saveSuccessTimeoutRef.current = null;
    }
    setSaveSuccessVisible(false);
  }, []);

  const showSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
    }
    setSaveSuccessVisible(true);
    saveSuccessTimeoutRef.current = setTimeout(() => {
      setSaveSuccessVisible(false);
      saveSuccessTimeoutRef.current = null;
    }, SAVE_SUCCESS_VISIBLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }
    };
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    clearSaveSuccess();
    try {
      const data = await getAdminDashboardSettings();
      const draft = settingsToDraft(data);
      setCatalogActivityVisible(draft.catalogActivityVisible);
      setTrainingDynamicsVisible(draft.trainingDynamicsVisible);
      setQuickLinks(draft.quickLinks);
      setSavedSettings(toSavedSnapshot(draft));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [clearSaveSuccess]);

  useEffect(() => {
    if (!open) return;
    void loadSettings();
  }, [open, loadSettings]);

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setError(null);
    clearSaveSuccess();
  };

  const handleAddQuickLink = () => {
    if (quickLinks.length >= MAX_QUICK_LINKS) return;
    setQuickLinks((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, label: '', href: '/admin/', isEnabled: true },
    ]);
  };

  const handleRemoveQuickLink = (key: string) => {
    setQuickLinks((prev) => prev.filter((link) => link.key !== key));
  };

  const handleQuickLinkChange = (
    key: string,
    field: 'label' | 'href' | 'isEnabled',
    value: string | boolean
  ) => {
    setQuickLinks((prev) =>
      prev.map((link) => (link.key === key ? { ...link, [field]: value } : link))
    );
  };

  const hasChanges = useMemo(() => {
    const current = toSavedSnapshot({
      catalogActivityVisible,
      trainingDynamicsVisible,
      quickLinks,
    });
    return !snapshotsEqual(current, savedSettings);
  }, [catalogActivityVisible, trainingDynamicsVisible, quickLinks, savedSettings]);

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading || !hasChanges) return;

    const validationError = validateQuickLinks(quickLinks);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    clearSaveSuccess();
    try {
      const saved = await updateAdminDashboardSettings({
        catalogActivityVisible,
        trainingDynamicsVisible,
        quickLinks: quickLinks.map((link) => ({
          label: link.label.trim(),
          href: link.href.trim(),
          isEnabled: link.isEnabled,
        })),
      });
      const draft = settingsToDraft(saved);
      setCatalogActivityVisible(draft.catalogActivityVisible);
      setTrainingDynamicsVisible(draft.trainingDynamicsVisible);
      setQuickLinks(draft.quickLinks);
      setSavedSettings(toSavedSnapshot(draft));
      onSettingsChange(saved);
      showSaveSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        title="Настройки дашборда"
        aria-label="Настройки дашборда"
      >
        <KnowledgePlatformSettingsIcon size={ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE} />
      </button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Настройки дашборда"
        titleAside={<AdminSaveNotice visible={saveSuccessVisible} />}
        size="lg"
        className={styles.modalPanel}
        contentClassName={styles.modalContent}
      >
        <div className={styles.modalBody}>
          {loading ? (
            <p className={styles.hint}>Загрузка…</p>
          ) : (
            <form
              data-modal-form
              data-modal-density="compact"
              className={styles.form}
              onSubmit={(event) => void handleSubmit(event)}
            >
              <p className={styles.hint}>
                Настройте блоки и быстрые ссылки на главной странице админ-панели. Изменения видны
                всем пользователям.
              </p>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Блоки дашборда</h3>
                <ul className={styles.list}>
                  <li className={styles.item}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={trainingDynamicsVisible}
                        onChange={(e) => setTrainingDynamicsVisible(e.target.checked)}
                      />
                      <span>
                        <strong>Динамика обучения сотрудников</strong>
                        <span className={styles.itemHint}>
                          Общий график прогресса по «Территории знаний» (без стажёров)
                        </span>
                      </span>
                    </label>
                  </li>
                  <li className={styles.item}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={catalogActivityVisible}
                        onChange={(e) => setCatalogActivityVisible(e.target.checked)}
                      />
                      <span>
                        <strong>Добавление товаров в каталог</strong>
                        <span className={styles.itemHint}>
                          Статистика создания товаров администраторами за период
                        </span>
                      </span>
                    </label>
                  </li>
                </ul>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Быстрые ссылки</h3>
                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={handleAddQuickLink}
                    disabled={quickLinks.length >= MAX_QUICK_LINKS}
                  >
                    + Добавить
                  </button>
                </div>
                <p className={styles.sectionHint}>
                  Ссылки отображаются внизу дашборда. Снимите галочку, чтобы временно скрыть ссылку
                  без удаления. Адрес должен начинаться с{' '}
                  <code className={styles.code}>/admin/...</code>
                </p>
                {quickLinks.length === 0 ? (
                  <p className={styles.emptyLinks}>Быстрых ссылок нет — блок на дашборде скрыт.</p>
                ) : (
                  <ul className={styles.quickLinksList}>
                    {quickLinks.map((link) => (
                      <li
                        key={link.key}
                        className={`${styles.quickLinkRow} ${!link.isEnabled ? styles.quickLinkRowDisabled : ''}`}
                      >
                        <label className={styles.enableRow}>
                          <input
                            type="checkbox"
                            checked={link.isEnabled}
                            onChange={(e) =>
                              handleQuickLinkChange(link.key, 'isEnabled', e.target.checked)
                            }
                            aria-label={`Показывать на дашборде: ${link.label || link.href}`}
                          />
                          <span className={styles.enableLabel}>
                            {link.isEnabled ? 'На дашборде' : 'Скрыта'}
                          </span>
                        </label>
                        <label className={styles.quickLinkField}>
                          <span className={styles.quickLinkLabel}>Название</span>
                          <input
                            type="text"
                            className={styles.quickLinkInput}
                            value={link.label}
                            onChange={(e) =>
                              handleQuickLinkChange(link.key, 'label', e.target.value)
                            }
                            placeholder="Например: Заказы"
                            maxLength={100}
                          />
                        </label>
                        <label className={styles.quickLinkField}>
                          <span className={styles.quickLinkLabel}>Адрес</span>
                          <input
                            type="text"
                            className={styles.quickLinkInput}
                            value={link.href}
                            onChange={(e) =>
                              handleQuickLinkChange(link.key, 'href', e.target.value)
                            }
                            placeholder="/admin/orders"
                            maxLength={500}
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemoveQuickLink(link.key)}
                          title="Удалить ссылку"
                          aria-label={`Удалить ссылку ${link.label || link.href}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {error ? <p data-modal-form-error>{error}</p> : null}

              <div data-modal-form-actions>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  {hasChanges ? 'Отмена' : 'Закрыть'}
                </button>
                <button
                  data-admin-mutation
                  type="submit"
                  data-modal-btn="primary"
                  disabled={saving || !hasChanges}
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
