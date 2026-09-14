'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AdminRoleItem, getAdminAccessRoles } from '@/shared/api/admin-access';
import {
  type AdminDashboardRoleAllowed,
  type AdminDashboardRoleBlock,
  type AdminDashboardRoleQuickLinkAccess,
  type AdminDashboardSettings,
  DEFAULT_ADMIN_DASHBOARD_SETTINGS,
  getAdminDashboardRoleBlocks,
  getAdminDashboardRoleQuickLinks,
  getAdminDashboardSettings,
  updateAdminDashboardRoleBlock,
  updateAdminDashboardRoleQuickLinks,
  updateAdminDashboardSettings,
} from '@/shared/api/admin-dashboard';
import { getRoleLabel } from '@/shared/config/admin-roles';
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
  id?: string;
  label: string;
  href: string;
  isEnabled: boolean;
};

type DashboardSettingsButtonProps = {
  onSettingsChange: (settings: AdminDashboardSettings) => void;
};

const MAX_QUICK_LINKS = 20;
const SAVE_SUCCESS_VISIBLE_MS = 3000;

const DEFAULT_ROLE_ALLOWED: AdminDashboardRoleAllowed = {
  trainingDynamics: true,
  catalogActivity: true,
  calendar: true,
  quickLinks: true,
  dateToolbar: true,
};

const ROLE_BLOCK_LABELS: Record<keyof AdminDashboardRoleAllowed, string> = {
  trainingDynamics: 'Динамика обучения сотрудников',
  catalogActivity: 'Добавление товаров в каталог',
  calendar: 'Календарь',
  quickLinks: 'Быстрые ссылки',
  dateToolbar: 'Блок выбора периода',
};

const ROLE_BLOCK_HINTS: Record<keyof AdminDashboardRoleAllowed, string> = {
  trainingDynamics: 'Снимите галочку, чтобы скрыть блок для выбранной роли',
  catalogActivity: 'Снимите галочку, чтобы скрыть блок для выбранной роли',
  calendar: 'Снимите галочку, чтобы скрыть блок для выбранной роли',
  quickLinks: 'Снимите галочку, чтобы скрыть блок для выбранной роли',
  dateToolbar: 'Блок с датами и пресетами периодов',
};

function roleAllowedEqual(
  left: AdminDashboardRoleAllowed,
  right: AdminDashboardRoleAllowed
): boolean {
  return (Object.keys(DEFAULT_ROLE_ALLOWED) as Array<keyof AdminDashboardRoleAllowed>).every(
    (key) => left[key] === right[key]
  );
}

type DashboardSettingsDraft = {
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: QuickLinkDraft[];
};

type SavedDashboardSettingsSnapshot = {
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: Array<{ label: string; href: string; isEnabled: boolean }>;
};

function settingsToDraft(settings: AdminDashboardSettings): DashboardSettingsDraft {
  return {
    sectionOrder: [...settings.sectionOrder],
    quickLinks: settings.quickLinks.map((link, index) => ({
      key: link.id || `link-${index}`,
      id: link.id,
      label: link.label,
      href: link.href,
      isEnabled: link.isEnabled,
    })),
  };
}

function toSavedSnapshot(draft: DashboardSettingsDraft): SavedDashboardSettingsSnapshot {
  return {
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

  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleBlocksList, setRoleBlocksList] = useState<AdminDashboardRoleBlock[]>([]);
  const [savedRoleAllowed, setSavedRoleAllowed] = useState<AdminDashboardRoleAllowed>({
    ...DEFAULT_ROLE_ALLOWED,
  });
  const [roleAllowedDraft, setRoleAllowedDraft] = useState<AdminDashboardRoleAllowed>({
    ...DEFAULT_ROLE_ALLOWED,
  });
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [roleLinkAccess, setRoleLinkAccess] = useState<AdminDashboardRoleQuickLinkAccess[]>([]);
  const [roleLinkDraft, setRoleLinkDraft] = useState<Record<string, boolean>>({});
  const [roleLinkSaving, setRoleLinkSaving] = useState(false);
  const [roleLinkError, setRoleLinkError] = useState<string | null>(null);

  const draft = useMemo(
    (): DashboardSettingsDraft => ({
      sectionOrder,
      quickLinks,
    }),
    [sectionOrder, quickLinks]
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

  // При смене выбранной роли подставляем её сохранённые ограничения.
  useEffect(() => {
    if (!selectedRole) return;
    const block = roleBlocksList.find((item) => item.role === selectedRole);
    const allowed = block ? { ...block } : { ...DEFAULT_ROLE_ALLOWED };
    setSavedRoleAllowed(allowed);
    setRoleAllowedDraft({ ...allowed });
    setRoleLinkDraft(
      Object.fromEntries(
        roleLinkAccess
          .filter((item) => item.role === selectedRole)
          .map((item) => [item.linkId, item.allowed])
      )
    );
  }, [selectedRole, roleBlocksList, roleLinkAccess]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    clearSaveSuccess();
    setRoleError(null);
    try {
      const data = await getAdminDashboardSettings();
      const nextDraft = settingsToDraft(data);
      setSectionOrder(nextDraft.sectionOrder);
      setQuickLinks(nextDraft.quickLinks);
      setSavedSettings(toSavedSnapshot(nextDraft));

      const [roleList, roleBlocks, roleLinks] = await Promise.all([
        getAdminAccessRoles().catch(() => [] as AdminRoleItem[]),
        getAdminDashboardRoleBlocks().catch(() => [] as AdminDashboardRoleBlock[]),
        getAdminDashboardRoleQuickLinks().catch(() => [] as AdminDashboardRoleQuickLinkAccess[]),
      ]);
      const adminRoles = roleList.filter((item) => item.id !== 'SUPER_ADMIN');
      setRoles(adminRoles);
      setRoleBlocksList(roleBlocks);
      setRoleLinkAccess(roleLinks);
      setSelectedRole((prev) =>
        prev && adminRoles.some((item) => item.id === prev) ? prev : (adminRoles[0]?.id ?? '')
      );
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
    if (saving || roleSaving || roleLinkSaving) return;
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

  const hasChanges = useMemo(() => {
    const current = toSavedSnapshot(draft);
    return !snapshotsEqual(current, savedSettings);
  }, [draft, savedSettings]);

  const roleAllowedHasChanges = !roleAllowedEqual(roleAllowedDraft, savedRoleAllowed);

  const handleRoleBlockChange = (key: keyof AdminDashboardRoleAllowed, value: boolean) => {
    setRoleAllowedDraft((prev) => ({ ...prev, [key]: value }));
  };

  /** Сохранённые ссылки с id — для них можно настраивать доступ по ролям. */
  const savedQuickLinks = useMemo(
    () => quickLinks.filter((link): link is QuickLinkDraft & { id: string } => !!link.id),
    [quickLinks]
  );

  const roleLinkHasChanges = savedQuickLinks.some(
    (link) =>
      (roleLinkDraft[link.id] ?? true) !==
      (roleLinkAccess.find((item) => item.role === selectedRole && item.linkId === link.id)
        ?.allowed ?? true)
  );

  const handleRoleLinkChange = (linkId: string, value: boolean) => {
    setRoleLinkDraft((prev) => ({ ...prev, [linkId]: value }));
  };

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  const hasAnyChanges = hasChanges || roleAllowedHasChanges || roleLinkHasChanges;
  const anySaving = saving || roleSaving || roleLinkSaving;

  /** Единая кнопка «Сохранить»: сохраняет порядок/ссылки и доступы выбранной роли. */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (anySaving || loading || !hasAnyChanges) return;

    const validationError = validateQuickLinks(quickLinks);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setRoleError(null);
    setRoleLinkError(null);
    clearSaveSuccess();
    try {
      if (hasChanges) {
        setSaving(true);
        const saved = await updateAdminDashboardSettings({
          sectionOrder,
          quickLinks: quickLinks.map((link) => ({
            id: link.id,
            label: link.label.trim(),
            href: link.href.trim(),
            isEnabled: link.isEnabled,
          })),
        });
        const nextDraft = settingsToDraft(saved);
        setSectionOrder(nextDraft.sectionOrder);
        setQuickLinks(nextDraft.quickLinks);
        setSavedSettings(toSavedSnapshot(nextDraft));
        onSettingsChange(saved);
        setSaving(false);
      }

      if (selectedRole && roleAllowedHasChanges) {
        setRoleSaving(true);
        const savedBlock = await updateAdminDashboardRoleBlock({
          role: selectedRole,
          ...roleAllowedDraft,
        });
        setRoleBlocksList((prev) => {
          const rest = prev.filter((item) => item.role !== savedBlock.role);
          return [...rest, savedBlock].sort((a, b) => a.role.localeCompare(b.role));
        });
        setRoleSaving(false);
      }

      if (selectedRole && savedQuickLinks.length > 0 && roleLinkHasChanges) {
        setRoleLinkSaving(true);
        const savedLinks = await updateAdminDashboardRoleQuickLinks({
          role: selectedRole,
          items: savedQuickLinks.map((link) => ({
            linkId: link.id,
            allowed: roleLinkDraft[link.id] ?? true,
          })),
        });
        setRoleLinkAccess((prev) => [
          ...prev.filter((item) => item.role !== selectedRole),
          ...savedLinks,
        ]);
        setRoleLinkSaving(false);
      }

      showSaveSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка сохранения';
      setError(message);
      setRoleError(message);
      setRoleLinkError(message);
    } finally {
      setSaving(false);
      setRoleSaving(false);
      setRoleLinkSaving(false);
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
                Настройте порядок блоков и быстрые ссылки на главной странице админ-панели. Какие
                блоки и ссылки видеть каждой роли — задаётся ниже в разделе «Доступ блоков по
                ролям».
              </p>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Блоки и порядок на дашборде</h3>
                <p className={styles.sectionHint}>
                  Измените порядок секций кнопками «↑» и «↓». Видимость блоков для ролей
                  настраивается в следующем разделе.
                </p>
                <ul className={styles.orderList}>
                  {sectionOrder.map((sectionId, index) => {
                    const canMoveUp = index > 0;
                    const canMoveDown = index < sectionOrder.length - 1;
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
                          <div className={styles.staticSectionRow}>
                            <strong>{ADMIN_DASHBOARD_SECTION_LABELS[sectionId]}</strong>
                            <span className={styles.itemHint}>{sectionHint(sectionId)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Доступ блоков по ролям</h3>
                <p className={styles.sectionHint}>
                  Единственное место, где определяется видимость блоков: выберите роль и отметьте,
                  какие блоки дашборда ей доступны. Снятая галочка полностью скрывает блок для всей
                  роли. SUPER_ADMIN всегда видит все блоки.
                </p>
                {roles.length === 0 ? (
                  <p className={styles.hint}>Список ролей недоступен.</p>
                ) : (
                  <>
                    <div className={styles.roleBar}>
                      <select
                        className={styles.roleSelect}
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        aria-label="Роль"
                      >
                        {roles.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getRoleLabel(item.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ul className={styles.roleBlocksList}>
                      {(
                        Object.keys(DEFAULT_ROLE_ALLOWED) as Array<keyof AdminDashboardRoleAllowed>
                      ).map((key) => (
                        <li key={key} className={styles.orderRow}>
                          <div className={styles.orderBody}>
                            <label className={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={roleAllowedDraft[key]}
                                onChange={(e) => handleRoleBlockChange(key, e.target.checked)}
                              />
                              <span>
                                <strong>{ROLE_BLOCK_LABELS[key]}</strong>
                                <span className={styles.itemHint}>{ROLE_BLOCK_HINTS[key]}</span>
                              </span>
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {roleError ? <p className={styles.roleError}>{roleError}</p> : null}

                    <div className={styles.sectionHead}>
                      <h4 className={styles.sectionTitle}>Быстрые ссылки для роли</h4>
                    </div>
                    {savedQuickLinks.length === 0 ? (
                      <p className={styles.hint}>
                        Сначала сохраните быстрые ссылки в разделе ниже — затем их можно будет
                        разрешать или скрывать для роли.
                      </p>
                    ) : (
                      <ul className={styles.roleBlocksList}>
                        {savedQuickLinks.map((link) => (
                          <li key={link.id} className={styles.orderRow}>
                            <div className={styles.orderBody}>
                              <label className={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={roleLinkDraft[link.id] ?? true}
                                  onChange={(e) => handleRoleLinkChange(link.id, e.target.checked)}
                                />
                                <span>
                                  <strong>{link.label || link.href}</strong>
                                  <span className={styles.itemHint}>{link.href}</span>
                                </span>
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {roleLinkError ? <p className={styles.roleError}>{roleLinkError}</p> : null}
                  </>
                )}
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

              <div data-modal-form-actions className={styles.formActions}>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  onClick={handleClose}
                  disabled={anySaving}
                >
                  {hasAnyChanges ? 'Отмена' : 'Закрыть'}
                </button>
                <button
                  data-admin-mutation
                  type="submit"
                  data-modal-btn="primary"
                  disabled={anySaving || loading || !hasAnyChanges}
                  title={hasAnyChanges ? undefined : 'Сначала внесите изменения'}
                >
                  {anySaving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
