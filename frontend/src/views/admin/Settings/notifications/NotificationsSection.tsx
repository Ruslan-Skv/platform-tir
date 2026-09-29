'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import type {
  AdminNotificationUser,
  AdminNotificationsSettings,
  CustomerNotificationSettings,
  MyNotifyEventKey,
  NotificationSound,
} from '@/shared/api/admin-notifications';
import {
  deleteAdminNotificationSound,
  getAdminCustomerNotificationSettings,
  getAdminNotificationCustomers,
  getAdminNotificationSounds,
  getAdminNotificationUsers,
  getAdminNotificationsSettingsByRole,
  getAdminNotificationsSettingsByUser,
  updateAdminCustomerNotificationSettings,
  updateAdminNotificationsSettings,
  updateAdminNotificationsSettingsByUser,
  updateAllAdminCustomerNotificationSettings,
  uploadAdminNotificationSound,
} from '@/shared/api/admin-notifications';
import { ADMIN_NOTIFICATION_BELL_ROLES } from '@/shared/config/admin-roles';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';

import styles from '../my-notifications/MyNotificationsPage.module.css';
import { ROLES_CONFIG } from '../shared/rolesConfig';

/** Роли, для которых SUPER_ADMIN настраивает события колокольчика (без стажёра). */
const ADMIN_ROLES = ADMIN_NOTIFICATION_BELL_ROLES;

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'default', label: 'По умолчанию (для всех ролей)' },
  ...ADMIN_ROLES.map((r) => ({
    value: r,
    label: ROLES_CONFIG.find((c) => c.id === r)?.label ?? r,
  })),
];

const SOUND_OPTIONS: { value: NotificationSoundType; label: string }[] = [
  { value: 'beep', label: 'Beep (короткий)' },
  { value: 'ding', label: 'Ding (звонок)' },
  { value: 'chime', label: 'Chime (перелив)' },
  { value: 'bell', label: 'Bell (колокольчик)' },
  { value: 'custom', label: 'Свой звук (загруженный)' },
];

const INTERVAL_OPTIONS = [30, 60, 120, 180, 300];

function intervalLabel(sec: number) {
  if (sec < 60) return `${sec} секунд`;
  if (sec === 60) return '1 минута';
  return `${sec / 60} минуты`;
}

type EditMode = 'role' | 'user' | 'customer';
type CustomerScope = 'single' | 'all';

type EventToggle = {
  key: MyNotifyEventKey;
  label: string;
  superAdminOnly?: boolean;
};

const EVENT_TOGGLES: EventToggle[] = [
  { key: 'notifyOnReviews', label: 'Новые отзывы на товары' },
  { key: 'notifyOnOrders', label: 'Новые заказы' },
  { key: 'notifyOnSupportChat', label: 'Сообщения в чате поддержки' },
  { key: 'notifyOnMeasurementForm', label: 'Запись на замер' },
  { key: 'notifyOnCallbackForm', label: 'Заказ обратного звонка' },
  { key: 'notifyOnDirectorForm', label: 'Письмо директору' },
  { key: 'notifyOnQuoteForm', label: 'Рассчитать стоимость' },
  { key: 'notifyOnQuizMebel', label: 'Квиз — Мебель на заказ (mebel-na-zakaz-51.ru)' },
  { key: 'notifyOnQuizRemont', label: 'Квиз — Ремонт и отделка (remont-kvartir-51.ru)' },
  {
    key: 'notifyOnKnowledgeTraining',
    label: 'Динамика изучения материалов на обучающей платформе',
  },
  {
    key: 'notifyOnWorkDays',
    label: 'Учёт рабочего времени (опоздания, ранний уход, автозакрытие)',
  },
  {
    key: 'notifyOnWorkDayRequestReviews',
    label: 'Ответы на запросы рабочего времени (выходной, уйти пораньше, прийти попозже)',
  },
  {
    key: 'notifyOnWaybills',
    label: 'Путевой лист (новые задания, правки, выполнение / невыполнение)',
  },
  {
    key: 'notifyOnInstallationSchedules',
    label: 'График монтажей (новые записи, правки, выполнение / невыполнение)',
  },
  {
    key: 'notifyOnRepairSchedules',
    label: 'График ремонтов (проекты, записи и изменение статусов)',
  },
  { key: 'notifyOnFurnitureSchedules', label: 'План-график мебели' },
  { key: 'notifyOnMeasurementCreated', label: 'Новый замер (создание замера)' },
  { key: 'notifyOnMeasurements', label: 'Замеры (выполнен, отказ, договор)' },
  {
    key: 'notifyOnContractSigning',
    label: 'Электронное подписание договоров (подписан / отклонён / открыт клиентом)',
  },
  { key: 'notifyOnContractConcludedRepair', label: 'Договор подписан — Ремонт' },
  { key: 'notifyOnContractConcludedWindows', label: 'Договор подписан — Окна' },
  { key: 'notifyOnContractConcludedDoors', label: 'Договор подписан — Двери' },
  { key: 'notifyOnContractConcludedCeilings', label: 'Договор подписан — Потолки' },
  { key: 'notifyOnContractConcludedBlinds', label: 'Договор подписан — Жалюзи' },
  { key: 'notifyOnContractConcludedFurniture', label: 'Договор подписан — Мебель' },
  { key: 'notifyOnIncassations', label: 'Инкассации наличных (журнал ДП)' },
  {
    key: 'notifyOnKnowledgeFeedback',
    label: 'Ошибки и предложения по обучающей платформе',
    superAdminOnly: true,
  },
  {
    key: 'notifyOnSiteFeedback',
    label: 'Ошибки и предложения по публичному сайту',
    superAdminOnly: true,
  },
];

/** Радио-строки выбора режима редактирования (общие для всех экранов страницы). */
function EditModeRadios({
  value,
  onChange,
}: {
  value: EditMode;
  onChange: (mode: EditMode) => void;
}) {
  return (
    <div className={styles.rows}>
      {(
        [
          ['role', 'По роли'],
          ['user', 'Для пользователя'],
          ['customer', 'Покупатели'],
        ] as const
      ).map(([mode, label]) => (
        <label key={mode} className={styles.row}>
          <input
            type="radio"
            name="editMode"
            className={styles.rowInput}
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          <span className={styles.rowLabel}>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function NotificationsSection() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [editMode, setEditMode] = useState<EditMode>('role');
  const [settings, setSettings] = useState<AdminNotificationsSettings | null>(null);
  const [customerSettings, setCustomerSettings] = useState<CustomerNotificationSettings | null>(
    null
  );
  /** Снимок последних загруженных/сохранённых значений — для отслеживания несохранённых правок. */
  const [baselineSnapshot, setBaselineSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [customSounds, setCustomSounds] = useState<NotificationSound[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('default');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [adminUsers, setAdminUsers] = useState<AdminNotificationUser[]>([]);
  const [customers, setCustomers] = useState<AdminNotificationUser[]>([]);
  const [customerScope, setCustomerScope] = useState<CustomerScope>('single');
  const [bulkNotifyOnSupportChatReply, setBulkNotifyOnSupportChatReply] = useState(true);
  const hasInitializedRole = React.useRef(false);

  useEffect(() => {
    if (
      user?.role &&
      (ADMIN_ROLES as readonly string[]).includes(user.role) &&
      !hasInitializedRole.current
    ) {
      hasInitializedRole.current = true;
      setSelectedRole(user.role);
      if (user.id) setSelectedUserId(user.id);
    }
  }, [user?.role, user?.id]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadAdminUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const users = await getAdminNotificationUsers();
      setAdminUsers(users);
      if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(user?.id ?? users[0].id);
      }
    } catch {
      setAdminUsers([]);
    }
  }, [isSuperAdmin, selectedUserId, user?.id]);

  const loadCustomers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const list = await getAdminNotificationCustomers();
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(list[0].id);
      }
    } catch {
      setCustomers([]);
    }
  }, [isSuperAdmin, selectedCustomerId]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    let snapshot = '';
    try {
      if (editMode === 'customer' && customerScope === 'single' && selectedCustomerId) {
        const data = await getAdminCustomerNotificationSettings(selectedCustomerId);
        setCustomerSettings(data);
        setSettings(null);
        snapshot = JSON.stringify({ s: null, c: data, b: true });
      } else if (editMode === 'customer' && customerScope === 'all') {
        setSettings(null);
        setCustomerSettings(null);
        snapshot = JSON.stringify({ s: null, c: null, b: bulkNotifyOnSupportChatReply });
      } else if (editMode === 'user' && selectedUserId) {
        const data = await getAdminNotificationsSettingsByUser(selectedUserId);
        setSettings(data);
        setCustomerSettings(null);
        snapshot = JSON.stringify({ s: data, c: null, b: true });
      } else if (editMode === 'role') {
        const role = selectedRole === 'default' ? null : selectedRole;
        const data = await getAdminNotificationsSettingsByRole(role);
        setSettings(data);
        setCustomerSettings(null);
        snapshot = JSON.stringify({ s: data, c: null, b: true });
      } else {
        setSettings(null);
        setCustomerSettings(null);
      }
      setBaselineSnapshot(snapshot);
    } catch (err) {
      console.error(err);
      setSettings(null);
      setCustomerSettings(null);
      setBaselineSnapshot('');
    } finally {
      setLoading(false);
    }
  }, [
    editMode,
    customerScope,
    selectedRole,
    selectedUserId,
    selectedCustomerId,
    bulkNotifyOnSupportChatReply,
  ]);

  const loadCustomSounds = useCallback(async () => {
    try {
      const sounds = await getAdminNotificationSounds();
      setCustomSounds(sounds);
    } catch {
      setCustomSounds([]);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadCustomSounds();
  }, [loadCustomSounds]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdminUsers();
      loadCustomers();
    }
  }, [isSuperAdmin, loadAdminUsers, loadCustomers]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const currentSnapshot = JSON.stringify({
    s: settings,
    c: customerSettings,
    b: bulkNotifyOnSupportChatReply,
  });
  const hasUnsavedChanges = currentSnapshot !== baselineSnapshot;

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      if (editMode === 'customer' && customerScope === 'all') {
        const result = await updateAllAdminCustomerNotificationSettings({
          notifyOnSupportChatReply: bulkNotifyOnSupportChatReply,
        });
        showToast(`Настройки применены к ${result.updated} покупателям`, 'success');
      } else if (editMode === 'customer' && selectedCustomerId) {
        await updateAdminCustomerNotificationSettings(selectedCustomerId, {
          notifyOnSupportChatReply: customerSettings?.notifyOnSupportChatReply ?? true,
        });
        showToast('Настройки сохранены', 'success');
      } else if (editMode === 'user' && selectedUserId && settings) {
        await updateAdminNotificationsSettingsByUser(selectedUserId, settings);
        showToast('Настройки сохранены', 'success');
        if (settings.desktopNotifications) {
          window.dispatchEvent(new Event('admin-push-sync'));
        }
      } else if (editMode === 'role' && settings) {
        await updateAdminNotificationsSettings({
          ...settings,
          role: isSuperAdmin
            ? selectedRole === 'default'
              ? null
              : selectedRole
            : (user?.role ?? null),
        });
        showToast('Настройки сохранены', 'success');
        if (settings.desktopNotifications) {
          window.dispatchEvent(new Event('admin-push-sync'));
        }
      }
      setBaselineSnapshot(currentSnapshot);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const patchSettings = (patch: Partial<AdminNotificationsSettings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  };

  const playTestSound = () => {
    if (!settings?.soundEnabled) return;
    try {
      playNotificationSound(
        settings.soundVolume ?? 70,
        (settings.soundType as NotificationSoundType) ?? 'beep',
        settings.customSoundUrl
      );
    } catch {
      showToast('Не удалось воспроизвести звук', 'error');
    }
  };

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const sound = await uploadAdminNotificationSound(file);
      setCustomSounds((prev) => [sound, ...prev]);
      setSettings((s) =>
        s
          ? {
              ...s,
              soundType: 'custom',
              customSoundUrl: sound.fileUrl,
            }
          : s
      );
      showToast('Звук загружен. Сохраните настройки.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSound = async (id: string) => {
    try {
      await deleteAdminNotificationSound(id);
      setCustomSounds((prev) => prev.filter((s) => s.id !== id));
      if (
        settings?.customSoundUrl &&
        customSounds.find((s) => s.id === id)?.fileUrl === settings.customSoundUrl
      ) {
        setSettings((s) => (s ? { ...s, soundType: 'beep', customSoundUrl: null } : s));
      }
      showToast('Звук удалён', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Браузер не поддерживает уведомления', 'error');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        showToast('Разрешение на уведомления получено', 'success');
        window.dispatchEvent(new Event('admin-push-sync'));
      } else if (permission === 'denied') {
        showToast('Уведомления заблокированы. Разрешите в настройках браузера.', 'error');
      } else {
        showToast('Разрешение не предоставлено', 'error');
      }
    } catch {
      showToast('Не удалось запросить разрешение', 'error');
    }
  };

  const showUserSelectPrompt = editMode === 'user' && !selectedUserId;
  const showCustomerSelectPrompt =
    editMode === 'customer' &&
    customerScope === 'single' &&
    (customers.length === 0 || !selectedCustomerId);
  const showLoading = loading && !showUserSelectPrompt && !showCustomerSelectPrompt;

  const selectedUser = adminUsers.find((u) => u.id === selectedUserId);
  const selectedCustomer = customers.find((u) => u.id === selectedCustomerId);
  const scopeBadgeText =
    editMode === 'user'
      ? `Пользователь · ${
          selectedUser
            ? [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') ||
              selectedUser.email
            : 'не выбран'
        }`
      : editMode === 'customer'
        ? customerScope === 'all'
          ? 'Покупатели · все'
          : `Покупатель · ${
              selectedCustomer
                ? [selectedCustomer.firstName, selectedCustomer.lastName]
                    .filter(Boolean)
                    .join(' ') || selectedCustomer.email
                : 'не выбран'
            }`
        : isSuperAdmin
          ? `По роли · ${ROLE_OPTIONS.find((o) => o.value === selectedRole)?.label ?? selectedRole}`
          : `Роль · ${ROLES_CONFIG.find((c) => c.id === user?.role)?.label ?? user?.role ?? ''}`;

  const saveDisabled =
    saving || showLoading || showUserSelectPrompt || showCustomerSelectPrompt || !hasUnsavedChanges;

  const visibleEvents = EVENT_TOGGLES.filter((t) => !t.superAdminOnly || isSuperAdmin);

  return (
    <div>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <span
                  className={`${styles.sourceBadge}${
                    editMode === 'user' ? ` ${styles.sourceBadgePersonal}` : ''
                  }`}
                  title="Какие настройки открыты для редактирования"
                >
                  {scopeBadgeText}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${styles.headerActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={saveDisabled}
            title={
              !saving && !showLoading && !hasUnsavedChanges
                ? 'Сначала внесите изменения в настройки'
                : undefined
            }
            onClick={() => void handleSave()}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {showLoading ? (
        <p className={styles.loading}>Загрузка настроек…</p>
      ) : showUserSelectPrompt ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Режим редактирования</h2>
          <EditModeRadios value={editMode} onChange={setEditMode} />
          <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
            <div className={styles.inlineField}>
              <label className={styles.inlineFieldLabel} htmlFor="userSelector">
                Настройки для пользователя
              </label>
              <select
                id="userSelector"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={styles.select}
              >
                <option value="">— Выберите пользователя —</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} ({u.email}) —{' '}
                    {ROLES_CONFIG.find((c) => c.id === u.role)?.label ?? u.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={styles.hint}>Выберите пользователя из списка выше.</p>
        </section>
      ) : showCustomerSelectPrompt ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Режим редактирования</h2>
          <EditModeRadios value={editMode} onChange={setEditMode} />
          <div className={styles.rows}>
            {(
              [
                ['single', 'Конкретный покупатель'],
                ['all', 'Все покупатели'],
              ] as const
            ).map(([scope, label]) => (
              <label key={scope} className={styles.row}>
                <input
                  type="radio"
                  name="customerScope"
                  className={styles.rowInput}
                  checked={customerScope === scope}
                  onChange={() => setCustomerScope(scope)}
                />
                <span className={styles.rowLabel}>{label}</span>
              </label>
            ))}
          </div>
          <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
            <div className={styles.inlineField}>
              <label className={styles.inlineFieldLabel} htmlFor="customerSelector">
                Настройки для покупателя
              </label>
              <select
                id="customerSelector"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className={styles.select}
              >
                <option value="">— Выберите покупателя —</option>
                {customers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={styles.hint}>
            {customers.length === 0
              ? 'Нет зарегистрированных покупателей.'
              : 'Выберите покупателя из списка выше.'}
          </p>
        </section>
      ) : (
        <>
          {isSuperAdmin ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Режим редактирования</h2>
              <EditModeRadios value={editMode} onChange={setEditMode} />
              {editMode === 'role' ? (
                <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
                  <div className={styles.inlineField}>
                    <label className={styles.inlineFieldLabel} htmlFor="roleSelector">
                      Роль
                    </label>
                    <select
                      id="roleSelector"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className={styles.select}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : editMode === 'user' ? (
                <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
                  <div className={styles.inlineField}>
                    <label className={styles.inlineFieldLabel} htmlFor="userSelector">
                      Пользователь
                    </label>
                    <select
                      id="userSelector"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">— Выберите пользователя —</option>
                      {adminUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} (
                          {u.email}) — {ROLES_CONFIG.find((c) => c.id === u.role)?.label ?? u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.rows}>
                    {(
                      [
                        ['single', 'Конкретный покупатель'],
                        ['all', 'Все покупатели'],
                      ] as const
                    ).map(([scope, label]) => (
                      <label key={scope} className={styles.row}>
                        <input
                          type="radio"
                          name="customerScope"
                          className={styles.rowInput}
                          checked={customerScope === scope}
                          onChange={() => setCustomerScope(scope)}
                        />
                        <span className={styles.rowLabel}>{label}</span>
                      </label>
                    ))}
                  </div>
                  {customerScope === 'single' && (
                    <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
                      <div className={styles.inlineField}>
                        <label className={styles.inlineFieldLabel} htmlFor="customerSelector">
                          Покупатель
                        </label>
                        <select
                          id="customerSelector"
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          className={styles.select}
                        >
                          <option value="">— Выберите покупателя —</option>
                          {customers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} (
                              {u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
              <p className={styles.hint}>
                {editMode === 'role'
                  ? 'Выберите роль и отметьте, какие события показывать в колокольчике и push для этой роли. «По умолчанию» применяется ко всем ролям без собственного профиля. Стажёры колокольчик не получают.'
                  : editMode === 'user'
                    ? 'Персональные настройки переопределяют настройки по роли.'
                    : customerScope === 'all'
                      ? 'Настройки будут применены ко всем пользователям с ролью «Покупатель».'
                      : 'Настройки применяются к уведомлениям в чате поддержки на сайте.'}
              </p>
            </section>
          ) : (
            <p className={styles.hint}>
              Редактируются настройки вашей роли
              {user?.role
                ? `: ${ROLES_CONFIG.find((c) => c.id === user.role)?.label ?? user.role}`
                : ''}
              . Настройка событий по ролям доступна супер-администратору.
            </p>
          )}

          {editMode === 'customer' ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                {customerScope === 'all'
                  ? 'Уведомления для всех покупателей'
                  : 'Уведомления для покупателя'}
              </h2>
              <div className={styles.rows}>
                <label className={styles.row} htmlFor="notifyOnSupportChatReply">
                  <input
                    type="checkbox"
                    id="notifyOnSupportChatReply"
                    className={styles.rowInput}
                    checked={
                      customerScope === 'all'
                        ? bulkNotifyOnSupportChatReply
                        : (customerSettings?.notifyOnSupportChatReply ?? true)
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (customerScope === 'all') {
                        setBulkNotifyOnSupportChatReply(checked);
                      } else {
                        setCustomerSettings((s) => ({
                          id: s?.id ?? null,
                          userId: selectedCustomerId,
                          notifyOnSupportChatReply: checked,
                          createdAt: s?.createdAt ?? null,
                          updatedAt: s?.updatedAt ?? null,
                        }));
                      }
                    }}
                  />
                  <span className={styles.rowLabel}>Уведомлять при ответе в чате поддержки</span>
                </label>
              </div>
              <p className={styles.hint}>
                {customerScope === 'all'
                  ? 'Если включено, все покупатели будут получать браузерные уведомления при новом ответе сотрудника в чате поддержки.'
                  : 'Если включено, покупатель будет получать браузерные уведомления при новом ответе сотрудника в чате поддержки.'}
              </p>
            </section>
          ) : (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>События для уведомлений</h2>
              <div className={styles.rows}>
                {visibleEvents.map((toggle) => (
                  <label className={styles.row} key={toggle.key} htmlFor={toggle.key}>
                    <input
                      type="checkbox"
                      id={toggle.key}
                      className={styles.rowInput}
                      checked={settings?.[toggle.key] ?? true}
                      onChange={(e) => patchSettings({ [toggle.key]: e.target.checked })}
                    />
                    <span className={styles.rowLabel}>{toggle.label}</span>
                  </label>
                ))}
              </div>
              <p className={styles.hint}>
                Отметьте события, по которым сотрудникам приходят колокольчик, звук и браузерные
                push-уведомления.
              </p>
            </section>
          )}

          {editMode !== 'customer' && settings && (
            <>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Звук</h2>
                <div className={styles.inlineRow}>
                  <label className={styles.row} htmlFor="soundEnabled">
                    <input
                      type="checkbox"
                      id="soundEnabled"
                      className={styles.rowInput}
                      checked={settings.soundEnabled}
                      onChange={(e) => patchSettings({ soundEnabled: e.target.checked })}
                    />
                    <span className={styles.rowLabel}>Звук при новом событии</span>
                  </label>
                  {settings.soundEnabled && (
                    <>
                      <div className={styles.inlineField}>
                        <label className={styles.inlineFieldLabel} htmlFor="soundType">
                          Тип
                        </label>
                        <select
                          id="soundType"
                          className={styles.select}
                          value={settings.soundType}
                          onChange={(e) => {
                            const val = e.target.value as NotificationSoundType;
                            patchSettings({
                              soundType: val,
                              customSoundUrl: val !== 'custom' ? null : settings.customSoundUrl,
                            });
                          }}
                        >
                          {SOUND_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {settings.soundType === 'custom' && (
                        <div className={styles.inlineField}>
                          <label className={styles.inlineFieldLabel} htmlFor="customSoundUrl">
                            Файл
                          </label>
                          <select
                            id="customSoundUrl"
                            className={styles.select}
                            value={settings.customSoundUrl || ''}
                            onChange={(e) =>
                              patchSettings({ customSoundUrl: e.target.value || null })
                            }
                          >
                            <option value="">— Выберите —</option>
                            {customSounds.map((s) => (
                              <option key={s.id} value={s.fileUrl}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={`${styles.inlineField} ${styles.rangeField}`}>
                        <label className={styles.inlineFieldLabel} htmlFor="soundVolume">
                          Громкость: {settings.soundVolume}%
                        </label>
                        <input
                          type="range"
                          id="soundVolume"
                          className={styles.range}
                          min={0}
                          max={100}
                          value={settings.soundVolume}
                          onChange={(e) =>
                            patchSettings({ soundVolume: parseInt(e.target.value, 10) })
                          }
                        />
                      </div>
                      <button type="button" className={styles.testButton} onClick={playTestSound}>
                        Проверить звук
                      </button>
                    </>
                  )}
                </div>
                {settings.soundEnabled && (
                  <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
                    <div className={styles.inlineField}>
                      <label className={styles.inlineFieldLabel} htmlFor="soundFile">
                        Загрузить новый звук
                      </label>
                      <input
                        type="file"
                        id="soundFile"
                        className={styles.fileInput}
                        accept=".mp3,.wav,.ogg,.m4a,.aac"
                        onChange={handleUploadSound}
                        disabled={uploading}
                      />
                      {uploading && <span className={styles.uploading}>Загрузка…</span>}
                    </div>
                    {customSounds.length > 0 && (
                      <ul className={styles.soundsList}>
                        {customSounds.map((s) => (
                          <li key={s.id} className={styles.soundItem}>
                            <span>{s.name}</span>
                            <button
                              data-admin-mutation
                              type="button"
                              className={styles.deleteSoundBtn}
                              onClick={() => void handleDeleteSound(s.id)}
                              title="Удалить"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {settings.soundEnabled && (
                  <p className={styles.hint}>Форматы: mp3, wav, ogg, m4a, aac. Макс. 2 МБ.</p>
                )}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Браузерные уведомления</h2>
                <div className={styles.inlineRow}>
                  <label className={styles.row} htmlFor="desktopNotifications">
                    <input
                      type="checkbox"
                      id="desktopNotifications"
                      className={styles.rowInput}
                      checked={settings.desktopNotifications}
                      onChange={(e) => patchSettings({ desktopNotifications: e.target.checked })}
                    />
                    <span className={styles.rowLabel}>На рабочем столе и в приложении (PWA)</span>
                  </label>
                  {permissionStatus === 'granted' ? (
                    <span className={styles.permissionOk}>✓ Разрешение получено</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.permissionButton}
                      onClick={() => void requestNotificationPermission()}
                    >
                      {permissionStatus === 'denied' ? 'Разрешение заблокировано' : 'Разрешить'}
                    </button>
                  )}
                  <div className={styles.inlineField}>
                    <label className={styles.inlineFieldLabel} htmlFor="checkIntervalSeconds">
                      Интервал проверки
                    </label>
                    <select
                      id="checkIntervalSeconds"
                      className={styles.select}
                      value={settings.checkIntervalSeconds}
                      onChange={(e) =>
                        patchSettings({ checkIntervalSeconds: parseInt(e.target.value, 10) })
                      }
                    >
                      {INTERVAL_OPTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          {intervalLabel(sec)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className={styles.hint}>
                  Показывать уведомление вне вкладки браузера и на телефоне (если сайт установлен
                  как приложение) при новом событии. Требуется разрешение браузера. Как часто
                  проверять наличие новых событий (отзывы, заказы, чат).
                </p>
              </section>
            </>
          )}
        </>
      )}

      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="alert"
        >
          <span className={styles.toastIcon}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
