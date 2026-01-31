'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import type {
  AdminNotificationsSettings,
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
import type {
  AdminNotificationUser,
  CustomerNotificationSettings,
} from '@/shared/api/admin-notifications';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';

import styles from './NotificationsSection.module.css';
import { ROLES_CONFIG } from './rolesConfig';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
] as const;

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

type EditMode = 'role' | 'user' | 'customer';
type CustomerScope = 'single' | 'all';

export function NotificationsSection() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [editMode, setEditMode] = useState<EditMode>('role');
  const [settings, setSettings] = useState<AdminNotificationsSettings | null>(null);
  const [customerSettings, setCustomerSettings] = useState<CustomerNotificationSettings | null>(
    null
  );
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
    if (user?.role && ADMIN_ROLES.includes(user.role) && !hasInitializedRole.current) {
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
    try {
      if (editMode === 'customer' && customerScope === 'single' && selectedCustomerId) {
        const data = await getAdminCustomerNotificationSettings(selectedCustomerId);
        setCustomerSettings(data);
        setSettings(null);
      } else if (editMode === 'customer' && customerScope === 'all') {
        setSettings(null);
        setCustomerSettings(null);
      } else if (editMode === 'user' && selectedUserId) {
        const data = await getAdminNotificationsSettingsByUser(selectedUserId);
        setSettings(data);
        setCustomerSettings(null);
      } else if (editMode === 'role') {
        const role = selectedRole === 'default' ? null : selectedRole;
        const data = await getAdminNotificationsSettingsByRole(role);
        setSettings(data);
        setCustomerSettings(null);
      } else {
        setSettings(null);
        setCustomerSettings(null);
      }
    } catch (err) {
      console.error(err);
      setSettings(null);
      setCustomerSettings(null);
    } finally {
      setLoading(false);
    }
  }, [editMode, customerScope, selectedRole, selectedUserId, selectedCustomerId]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      if (editMode === 'customer' && customerScope === 'all') {
        const result = await updateAllAdminCustomerNotificationSettings({
          notifyOnSupportChatReply: bulkNotifyOnSupportChatReply,
        });
        showToast(`Настройки применены к ${result.updated} покупателям`, 'success');
        return;
      }
      if (editMode === 'customer' && selectedCustomerId) {
        await updateAdminCustomerNotificationSettings(selectedCustomerId, {
          notifyOnSupportChatReply: customerSettings?.notifyOnSupportChatReply ?? true,
        });
      } else if (editMode === 'user' && selectedUserId && formSettings) {
        await updateAdminNotificationsSettingsByUser(selectedUserId, formSettings);
      } else if (editMode === 'role' && formSettings) {
        const payload = {
          ...formSettings,
          role: selectedRole === 'default' ? null : selectedRole,
        };
        await updateAdminNotificationsSettings(payload);
      }
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const playTestSound = () => {
    if (!formSettings?.soundEnabled) return;
    try {
      playNotificationSound(
        formSettings.soundVolume ?? 70,
        (formSettings.soundType as NotificationSoundType) ?? 'beep',
        formSettings.customSoundUrl
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
      showToast('Звук загружен. Выберите его в списке и сохраните настройки.', 'success');
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
        formSettings?.customSoundUrl &&
        customSounds.find((s) => s.id === id)?.fileUrl === formSettings.customSoundUrl
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
      } else if (permission === 'denied') {
        showToast('Уведомления заблокированы. Разрешите в настройках браузера.', 'error');
      } else {
        showToast('Разрешение не предоставлено', 'error');
      }
    } catch (err) {
      showToast('Не удалось запросить разрешение', 'error');
    }
  };

  const showUserSelectPrompt = editMode === 'user' && !selectedUserId;
  const defaultSettingsForForm: AdminNotificationsSettings = {
    id: 'default',
    role: null,
    soundEnabled: true,
    soundVolume: 70,
    soundType: 'beep',
    customSoundUrl: null,
    desktopNotifications: false,
    checkIntervalSeconds: 60,
    notifyOnReviews: true,
    notifyOnOrders: true,
    notifyOnSupportChat: true,
    notifyOnMeasurementForm: true,
    notifyOnCallbackForm: true,
  };
  const formSettings = settings ?? defaultSettingsForForm;

  if (loading && !showUserSelectPrompt) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  const showCustomerSelectPrompt =
    editMode === 'customer' &&
    customerScope === 'single' &&
    (customers.length === 0 || !selectedCustomerId);

  if (showUserSelectPrompt) {
    return (
      <div className={styles.page}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Уведомления в админке</h2>
          <p className={styles.sectionDescription}>
            Настройте уведомления. Супер-администратор может редактировать настройки для конкретного
            пользователя.
          </p>
          <form className={styles.form}>
            {isSuperAdmin && (
              <div className={styles.formRow}>
                <label className={styles.label}>Режим редактирования</label>
                <div className={styles.radioRow}>
                  <label>
                    <input
                      type="radio"
                      name="editMode"
                      checked={editMode === 'role'}
                      onChange={() => setEditMode('role')}
                    />
                    По роли
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="editMode"
                      checked={editMode === 'user'}
                      onChange={() => setEditMode('user')}
                    />
                    Для пользователя
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="editMode"
                      checked={editMode === 'customer'}
                      onChange={() => setEditMode('customer')}
                    />
                    Покупатели
                  </label>
                </div>
              </div>
            )}
            <div className={styles.formRow}>
              <label htmlFor="userSelector" className={styles.label}>
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
            <p className={styles.loading}>Выберите пользователя из списка выше.</p>
          </form>
        </section>
      </div>
    );
  }

  if (showCustomerSelectPrompt) {
    return (
      <div className={styles.page}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Уведомления в админке</h2>
          <p className={styles.sectionDescription}>
            Настройте уведомления для покупателей. Супер-администратор может включать или отключать
            уведомления при ответе в чате поддержки.
          </p>
          <form className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>Режим редактирования</label>
              <div className={styles.radioRow}>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'role'}
                    onChange={() => setEditMode('role')}
                  />
                  По роли
                </label>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'user'}
                    onChange={() => setEditMode('user')}
                  />
                  Для пользователя
                </label>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'customer'}
                    onChange={() => setEditMode('customer')}
                  />
                  Покупатели
                </label>
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Область применения</label>
              <div className={styles.radioRow}>
                <label>
                  <input
                    type="radio"
                    name="customerScope"
                    checked={customerScope === 'single'}
                    onChange={() => setCustomerScope('single')}
                  />
                  Конкретный покупатель
                </label>
                <label>
                  <input
                    type="radio"
                    name="customerScope"
                    checked={customerScope === 'all'}
                    onChange={() => setCustomerScope('all')}
                  />
                  Все покупатели
                </label>
              </div>
            </div>
            {customerScope === 'single' && (
              <>
                <div className={styles.formRow}>
                  <label htmlFor="customerSelector" className={styles.label}>
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
                {customers.length === 0 ? (
                  <p className={styles.hint}>Нет зарегистрированных покупателей.</p>
                ) : (
                  <p className={styles.loading}>Выберите покупателя из списка выше.</p>
                )}
              </>
            )}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Уведомления в админке</h2>
        <p className={styles.sectionDescription}>
          Настройте звуковые и браузерные уведомления при появлении новых отзывов, заказов и
          сообщений в чате поддержки. Можно задать разные настройки для каждой роли.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          {isSuperAdmin && (
            <div className={styles.formRow}>
              <label className={styles.label}>Режим редактирования</label>
              <div className={styles.radioRow}>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'role'}
                    onChange={() => setEditMode('role')}
                  />
                  По роли
                </label>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'user'}
                    onChange={() => setEditMode('user')}
                  />
                  Для пользователя
                </label>
                <label>
                  <input
                    type="radio"
                    name="editMode"
                    checked={editMode === 'customer'}
                    onChange={() => setEditMode('customer')}
                  />
                  Покупатели
                </label>
              </div>
            </div>
          )}
          {editMode === 'role' ? (
            <div className={styles.formRow}>
              <label htmlFor="roleSelector" className={styles.label}>
                Настройки для роли
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
          ) : editMode === 'user' ? (
            <div className={styles.formRow}>
              <label htmlFor="userSelector" className={styles.label}>
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
          ) : (
            <>
              <div className={styles.formRow}>
                <label className={styles.label}>Область применения</label>
                <div className={styles.radioRow}>
                  <label>
                    <input
                      type="radio"
                      name="customerScope"
                      checked={customerScope === 'single'}
                      onChange={() => setCustomerScope('single')}
                    />
                    Конкретный покупатель
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="customerScope"
                      checked={customerScope === 'all'}
                      onChange={() => setCustomerScope('all')}
                    />
                    Все покупатели
                  </label>
                </div>
              </div>
              {customerScope === 'single' && (
                <div className={styles.formRow}>
                  <label htmlFor="customerSelector" className={styles.label}>
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
              )}
            </>
          )}
          <p className={styles.hint}>
            {editMode === 'role' ? (
              <>
                Выберите роль, для которой редактируете настройки. «По умолчанию» применяется ко
                всем ролям без собственного профиля.
                {user?.role && (
                  <>
                    {' '}
                    Вы вошли как{' '}
                    <strong>
                      {ROLES_CONFIG.find((c) => c.id === user.role)?.label ?? user.role}
                    </strong>
                    — настройки для вашей роли применяются к вам.
                  </>
                )}
              </>
            ) : editMode === 'user' ? (
              <>
                Выберите пользователя админки. Персональные настройки переопределяют настройки по
                роли.
              </>
            ) : customerScope === 'all' ? (
              <>Настройки будут применены ко всем пользователям с ролью «Покупатель».</>
            ) : (
              <>
                Выберите покупателя. Настройки применяются к уведомлениям в чате поддержки на сайте.
              </>
            )}
          </p>

          {editMode === 'customer' ? (
            <>
              <h3 className={styles.subsectionTitle}>
                {customerScope === 'all'
                  ? 'Уведомления для всех покупателей'
                  : 'Уведомления для покупателя'}
              </h3>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnSupportChatReply"
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
                <label htmlFor="notifyOnSupportChatReply">
                  Уведомлять при ответе в чате поддержки
                </label>
              </div>
              <p className={styles.hint}>
                {customerScope === 'all'
                  ? 'Если включено, все покупатели будут получать браузерные уведомления при новом ответе сотрудника в чате поддержки.'
                  : 'Если включено, покупатель будет получать браузерные уведомления при новом ответе сотрудника в чате поддержки.'}
              </p>
            </>
          ) : (
            <>
              <h3 className={styles.subsectionTitle}>События для уведомлений</h3>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnReviews"
                  checked={formSettings.notifyOnReviews}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, notifyOnReviews: e.target.checked } : s))
                  }
                />
                <label htmlFor="notifyOnReviews">Новые отзывы на товары</label>
              </div>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnOrders"
                  checked={formSettings.notifyOnOrders}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, notifyOnOrders: e.target.checked } : s))
                  }
                />
                <label htmlFor="notifyOnOrders">Новые заказы</label>
              </div>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnSupportChat"
                  checked={formSettings.notifyOnSupportChat}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, notifyOnSupportChat: e.target.checked } : s))
                  }
                />
                <label htmlFor="notifyOnSupportChat">Сообщения в чате поддержки</label>
              </div>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnMeasurementForm"
                  checked={formSettings.notifyOnMeasurementForm}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, notifyOnMeasurementForm: e.target.checked } : s
                    )
                  }
                />
                <label htmlFor="notifyOnMeasurementForm">Запись на замер</label>
              </div>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="notifyOnCallbackForm"
                  checked={formSettings.notifyOnCallbackForm}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, notifyOnCallbackForm: e.target.checked } : s))
                  }
                />
                <label htmlFor="notifyOnCallbackForm">Заказ обратного звонка</label>
              </div>

              <h3 className={styles.subsectionTitle}>Звук</h3>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="soundEnabled"
                  checked={formSettings.soundEnabled}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, soundEnabled: e.target.checked } : s))
                  }
                />
                <label htmlFor="soundEnabled">Звук при новом событии</label>
              </div>

              {formSettings.soundEnabled && (
                <>
                  <div className={styles.formRow}>
                    <label htmlFor="soundType" className={styles.label}>
                      Тип звука
                    </label>
                    <select
                      id="soundType"
                      value={formSettings.soundType}
                      onChange={(e) => {
                        const val = e.target.value as NotificationSoundType;
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                soundType: val,
                                customSoundUrl: val !== 'custom' ? null : s.customSoundUrl,
                              }
                            : s
                        );
                      }}
                      className={styles.select}
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formSettings.soundType === 'custom' && (
                    <div className={styles.formRow}>
                      <label className={styles.label}>Выберите загруженный звук</label>
                      <select
                        value={formSettings.customSoundUrl || ''}
                        onChange={(e) =>
                          setSettings((s) =>
                            s ? { ...s, customSoundUrl: e.target.value || null } : s
                          )
                        }
                        className={styles.select}
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
                  <div className={styles.uploadSection}>
                    <label className={styles.label}>Загрузить новый звук</label>
                    <p className={styles.hint}>Форматы: mp3, wav, ogg, m4a, aac. Макс. 2 МБ.</p>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a,.aac"
                      onChange={handleUploadSound}
                      disabled={uploading}
                      className={styles.fileInput}
                    />
                    {uploading && <span className={styles.uploading}>Загрузка...</span>}
                  </div>
                  {customSounds.length > 0 && (
                    <div className={styles.customSoundsList}>
                      <label className={styles.label}>Загруженные звуки</label>
                      <ul className={styles.soundsList}>
                        {customSounds.map((s) => (
                          <li key={s.id} className={styles.soundItem}>
                            <span>{s.name}</span>
                            <button
                              type="button"
                              className={styles.deleteSoundBtn}
                              onClick={() => handleDeleteSound(s.id)}
                              title="Удалить"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className={styles.formRow}>
                    <label htmlFor="soundVolume" className={styles.label}>
                      Громкость: {formSettings.soundVolume}%
                    </label>
                    <input
                      type="range"
                      id="soundVolume"
                      min={0}
                      max={100}
                      value={formSettings.soundVolume}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, soundVolume: parseInt(e.target.value, 10) } : s
                        )
                      }
                      className={styles.range}
                    />
                  </div>
                  <button type="button" className={styles.testButton} onClick={playTestSound}>
                    Проверить звук
                  </button>
                </>
              )}

              <h3 className={styles.subsectionTitle}>Браузерные уведомления</h3>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="desktopNotifications"
                  checked={formSettings.desktopNotifications}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, desktopNotifications: e.target.checked } : s))
                  }
                />
                <label htmlFor="desktopNotifications">
                  Уведомления на рабочем столе (вне вкладки)
                </label>
              </div>
              <p className={styles.hint}>
                Показывать уведомление вне вкладки браузера при новом событии (требуется разрешение
                браузера).
              </p>
              <div className={styles.permissionRow}>
                {permissionStatus === 'granted' ? (
                  <span className={styles.permissionOk}>✓ Разрешение на уведомления получено</span>
                ) : (
                  <button
                    type="button"
                    className={styles.permissionButton}
                    onClick={requestNotificationPermission}
                  >
                    {permissionStatus === 'denied'
                      ? 'Разрешение заблокировано — откройте настройки браузера'
                      : 'Разрешить уведомления'}
                  </button>
                )}
              </div>

              <div className={styles.formRow}>
                <label htmlFor="checkIntervalSeconds" className={styles.label}>
                  Интервал проверки: {formSettings.checkIntervalSeconds} сек
                </label>
                <select
                  id="checkIntervalSeconds"
                  value={formSettings.checkIntervalSeconds}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, checkIntervalSeconds: parseInt(e.target.value, 10) } : s
                    )
                  }
                  className={styles.select}
                >
                  <option value={30}>30 секунд</option>
                  <option value={60}>1 минута</option>
                  <option value={120}>2 минуты</option>
                  <option value={180}>3 минуты</option>
                  <option value={300}>5 минут</option>
                </select>
              </div>
              <p className={styles.hint}>
                Как часто проверять наличие новых событий (отзывы, заказы, чат).
              </p>
            </>
          )}

          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </section>

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
