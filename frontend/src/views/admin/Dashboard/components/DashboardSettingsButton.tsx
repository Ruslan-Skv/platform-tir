'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type AdminDashboardSettings,
  DEFAULT_ADMIN_DASHBOARD_SETTINGS,
  getAdminDashboardSettings,
  updateAdminDashboardSettings,
} from '@/shared/api/admin-dashboard';
import {
  ADMIN_DASHBOARD_SECTION_LABELS,
  type AdminDashboardSectionId,
  moveItemInArray,
} from '@/shared/lib/admin/admin-dashboard-sections';
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
  calendarVisible: boolean;
  dateToolbarVisible: boolean;
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: QuickLinkDraft[];
};

type SavedDashboardSettingsSnapshot = {
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  calendarVisible: boolean;
  dateToolbarVisible: boolean;
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: Array<{ label: string; href: string; isEnabled: boolean }>;
};

function settingsToDraft(settings: AdminDashboardSettings): DashboardSettingsDraft {
  return {
    catalogActivityVisible: settings.catalogActivityVisible,
    trainingDynamicsVisible: settings.trainingDynamicsVisible,
    calendarVisible: settings.calendarVisible,
    dateToolbarVisible: settings.dateToolbarVisible,
    sectionOrder: [...settings.sectionOrder],
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
    calendarVisible: draft.calendarVisible,
    dateToolbarVisible: draft.dateToolbarVisible,
    sectionOrder: [...draft.sectionOrder],
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
  if (left.calendarVisible !== right.calendarVisible) return false;
  if (left.dateToolbarVisible !== right.dateToolbarVisible) return false;
  if (left.sectionOrder.length !== right.sectionOrder.length) return false;
  if (left.quickLinks.length !== right.quickLinks.length) return false;

  if (!left.sectionOrder.every((id, index) => id === right.sectionOrder[index])) {
    return false;
  }

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

function isSectionVisible(
  sectionId: AdminDashboardSectionId,
  draft: Pick<
    DashboardSettingsDraft,
    'catalogActivityVisible' | 'trainingDynamicsVisible' | 'calendarVisible'
  >
): boolean {
  switch (sectionId) {
    case 'trainingDynamics':
      return draft.trainingDynamicsVisible;
    case 'catalogActivity':
      return draft.catalogActivityVisible;
    case 'calendar':
      return draft.calendarVisible;
    case 'quickLinks':
      return true;
    default:
      return false;
  }
}

function setSectionVisible(
  sectionId: AdminDashboardSectionId,
  visible: boolean,
  draft: DashboardSettingsDraft
): DashboardSettingsDraft {
  switch (sectionId) {
    case 'trainingDynamics':
      return { ...draft, trainingDynamicsVisible: visible };
    case 'catalogActivity':
      return { ...draft, catalogActivityVisible: visible };
    case 'calendar':
      return { ...draft, calendarVisible: visible };
    default:
      return draft;
  }
}

function sectionHint(sectionId: AdminDashboardSectionId): string {
  switch (sectionId) {
    case 'trainingDynamics':
      return 'Общий график прогресса по «Территории знаний» (без стажёров)';
    case 'catalogActivity':
      return 'Статистика создания товаров администраторами за период';
    case 'calendar':
      return 'Месячный календарь событий CRM и пользовательских записей';
    case 'quickLinks':
      return 'Блок ссылок; порядок ссылок настраивается отдельно ниже';
    default:
      return '';
  }
}

export function DashboardSettingsButton({ onSettingsChange }: DashboardSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [catalogActivityVisible, setCatalogActivityVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.catalogActivityVisible
  );
  const [trainingDynamicsVisible, setTrainingDynamicsVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.trainingDynamicsVisible
  );
  const [calendarVisible, setCalendarVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.calendarVisible
  );
  const [dateToolbarVisible, setDateToolbarVisible] = useState(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.dateToolbarVisible
  );
  const [sectionOrder, setSectionOrder] = useState<AdminDashboardSectionId[]>(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS.sectionOrder
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

  const draft = useMemo(
    (): DashboardSettingsDraft => ({
      catalogActivityVisible,
      trainingDynamicsVisible,
      calendarVisible,
      dateToolbarVisible,
      sectionOrder,
      quickLinks,
    }),
    [
      catalogActivityVisible,
      trainingDynamicsVisible,
      calendarVisible,
      dateToolbarVisible,
      sectionOrder,
      quickLinks,
    ]
  );

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
      const nextDraft = settingsToDraft(data);
      setCatalogActivityVisible(nextDraft.catalogActivityVisible);
      setTrainingDynamicsVisible(nextDraft.trainingDynamicsVisible);
      setCalendarVisible(nextDraft.calendarVisible);
      setDateToolbarVisible(nextDraft.dateToolbarVisible);
      setSectionOrder(nextDraft.sectionOrder);
      setQuickLinks(nextDraft.quickLinks);
      setSavedSettings(toSavedSnapshot(nextDraft));
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

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setSectionOrder((prev) => moveItemInArray(prev, index, targetIndex));
  };

  const moveQuickLink = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setQuickLinks((prev) => moveItemInArray(prev, index, targetIndex));
  };

  const handleSectionVisibilityChange = (sectionId: AdminDashboardSectionId, visible: boolean) => {
    const next = setSectionVisible(sectionId, visible, draft);
    setCatalogActivityVisible(next.catalogActivityVisible);
    setTrainingDynamicsVisible(next.trainingDynamicsVisible);
    setCalendarVisible(next.calendarVisible);
  };

  const hasChanges = useMemo(() => {
    const current = toSavedSnapshot(draft);
    return !snapshotsEqual(current, savedSettings);
  }, [draft, savedSettings]);

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
        calendarVisible,
        dateToolbarVisible,
        sectionOrder,
        quickLinks: quickLinks.map((link) => ({
          label: link.label.trim(),
          href: link.href.trim(),
          isEnabled: link.isEnabled,
        })),
      });
      const nextDraft = settingsToDraft(saved);
      setCatalogActivityVisible(nextDraft.catalogActivityVisible);
      setTrainingDynamicsVisible(nextDraft.trainingDynamicsVisible);
      setCalendarVisible(nextDraft.calendarVisible);
      setDateToolbarVisible(nextDraft.dateToolbarVisible);
      setSectionOrder(nextDraft.sectionOrder);
      setQuickLinks(nextDraft.quickLinks);
      setSavedSettings(toSavedSnapshot(nextDraft));
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
                Настройте блоки, их порядок и быстрые ссылки на главной странице админ-панели.
                Изменения видны всем пользователям.
              </p>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Выбор периода</h3>
                <p className={styles.sectionHint}>
                  Блок с датами «С» / «По», кнопкой «Показать» и быстрыми пресетами. Имеет смысл,
                  если включены виджеты «Товары» или «Динамика обучения».
                </p>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={dateToolbarVisible}
                    onChange={(e) => setDateToolbarVisible(e.target.checked)}
                  />
                  <span>
                    <strong>Показывать блок выбора дат</strong>
                    <span className={styles.itemHint}>
                      Если скрыть, виджеты с периодом загружаются по умолчанию (с начала текущего
                      месяца).
                    </span>
                  </span>
                </label>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Блоки и порядок на дашборде</h3>
                <p className={styles.sectionHint}>
                  Отметьте, что показывать, и измените порядок секций кнопками «↑» и «↓».
                </p>
                <ul className={styles.orderList}>
                  {sectionOrder.map((sectionId, index) => {
                    const canMoveUp = index > 0;
                    const canMoveDown = index < sectionOrder.length - 1;
                    const hasVisibilityToggle = sectionId !== 'quickLinks';
                    return (
                      <li key={sectionId} className={styles.orderRow}>
                        <div className={styles.orderControls}>
                          <button
                            type="button"
                            className={styles.orderBtn}
                            disabled={!canMoveUp}
                            onClick={() => moveSection(index, 'up')}
                            title="Выше"
                            aria-label={`${ADMIN_DASHBOARD_SECTION_LABELS[sectionId]} — выше`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={styles.orderBtn}
                            disabled={!canMoveDown}
                            onClick={() => moveSection(index, 'down')}
                            title="Ниже"
                            aria-label={`${ADMIN_DASHBOARD_SECTION_LABELS[sectionId]} — ниже`}
                          >
                            ↓
                          </button>
                        </div>
                        <div className={styles.orderBody}>
                          {hasVisibilityToggle ? (
                            <label className={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={isSectionVisible(sectionId, draft)}
                                onChange={(e) =>
                                  handleSectionVisibilityChange(sectionId, e.target.checked)
                                }
                              />
                              <span>
                                <strong>{ADMIN_DASHBOARD_SECTION_LABELS[sectionId]}</strong>
                                <span className={styles.itemHint}>{sectionHint(sectionId)}</span>
                              </span>
                            </label>
                          ) : (
                            <div className={styles.staticSectionRow}>
                              <strong>{ADMIN_DASHBOARD_SECTION_LABELS[sectionId]}</strong>
                              <span className={styles.itemHint}>{sectionHint(sectionId)}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
                  Снимите галочку, чтобы временно скрыть ссылку без удаления. Адрес должен
                  начинаться с <code className={styles.code}>/admin/...</code>
                </p>
                {quickLinks.length === 0 ? (
                  <p className={styles.emptyLinks}>Быстрых ссылок нет — блок на дашборде скрыт.</p>
                ) : (
                  <ul className={styles.quickLinksList}>
                    {quickLinks.map((link, index) => {
                      const canMoveUp = index > 0;
                      const canMoveDown = index < quickLinks.length - 1;
                      return (
                        <li
                          key={link.key}
                          className={`${styles.quickLinkRow} ${!link.isEnabled ? styles.quickLinkRowDisabled : ''}`}
                        >
                          <div className={styles.orderControls}>
                            <button
                              type="button"
                              className={styles.orderBtn}
                              disabled={!canMoveUp}
                              onClick={() => moveQuickLink(index, 'up')}
                              title="Выше"
                              aria-label={`Ссылка «${link.label || link.href}» — выше`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={styles.orderBtn}
                              disabled={!canMoveDown}
                              onClick={() => moveQuickLink(index, 'down')}
                              title="Ниже"
                              aria-label={`Ссылка «${link.label || link.href}» — ниже`}
                            >
                              ↓
                            </button>
                          </div>
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
                      );
                    })}
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
