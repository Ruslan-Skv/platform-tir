'use client';

import { type ReactNode, useEffect, useState } from 'react';

import {
  type AdminUserItem,
  type ResourcePermissionsResponse,
  type RoleAccessOverviewItem,
  getAdminAccessUsers,
  getResourcePermissions,
  revokeResourcePermission,
  revokeRolePermission,
  setResourcePermission,
  setRolePermission,
} from '@/shared/api/admin-access';
import {
  KNOWLEDGE_CATEGORY_RESOURCE_PREFIX,
  KNOWLEDGE_RESOURCE_ID,
} from '@/shared/config/admin-knowledge-resources';
import { getAdminResourceLabel } from '@/shared/config/admin-resources';
import { ROLES_CONFIG } from '@/shared/config/admin-roles';
import { Modal } from '@/shared/ui/Modal';
import { AdminAccessIcon } from '@/shared/ui/icons/AdminAccessIcon';

import styles from './AccessModal.module.css';
import {
  ACCESS_SOURCE_LABELS,
  EFFECTIVE_ACCESS_LABELS,
  effectiveAccessBadgeClass,
} from './accessModalDisplay';

interface AccessModalProps {
  resourceId: string;
  resourceLabel?: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES_CONFIG.filter((r) => r.id !== 'USER' && r.id !== 'GUEST').map((r) => [r.id, r.label])
);

const SKELETON_ROLE_ROWS = ROLES_CONFIG.filter((r) => r.id !== 'USER' && r.id !== 'GUEST').length;

function formatUserLabel(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  if (user.firstName || user.lastName) {
    return `${[user.firstName, user.lastName].filter(Boolean).join(' ')} (${user.email})`;
  }
  return user.email;
}

function RoleOverviewActions({
  row,
  saving,
  onSet,
  onRevoke,
  onDeny,
}: {
  row: RoleAccessOverviewItem;
  saving: boolean;
  onSet: (role: string, permission: 'VIEW' | 'EDIT') => void;
  onRevoke: (role: string) => void;
  onDeny: (role: string) => void;
}) {
  if (row.source === 'super_admin') {
    return <span className={styles.noActions}>—</span>;
  }

  if (row.source === 'inherited_denied') {
    return <span className={styles.inheritedHint}>Закрыто выше по дереву</span>;
  }

  const actions: ReactNode[] = [];

  if (row.hasExplicitOverride) {
    actions.push(
      <button
        key="reset"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onRevoke(row.role)}
        disabled={saving}
        title="Вернуть доступ по умолчанию для роли"
      >
        Сбросить
      </button>
    );
  }

  if (row.effective === 'EDIT') {
    actions.push(
      <button
        key="view-only"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onSet(row.role, 'VIEW')}
        disabled={saving}
        title="Раздел виден, но без создания и изменения материалов"
      >
        Только просмотр
      </button>
    );
  } else if (row.effective === 'NONE') {
    actions.push(
      <button
        key="view"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onSet(row.role, 'VIEW')}
        disabled={saving}
      >
        Просмотр
      </button>
    );
  }

  if (row.effective === 'VIEW') {
    actions.push(
      <button
        key="edit"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onSet(row.role, 'EDIT')}
        disabled={saving}
      >
        Редактирование
      </button>
    );
  }

  if (row.effective !== 'DENIED') {
    actions.push(
      <button
        key="deny"
        type="button"
        data-modal-btn="danger"
        onClick={() => onDeny(row.role)}
        disabled={saving}
      >
        Закрыть
      </button>
    );
  }

  return <div className={styles.itemActions}>{actions}</div>;
}

function UserExceptionActions({
  userId,
  permission,
  saving,
  onSet,
  onRevoke,
}: {
  userId: string;
  permission: 'VIEW' | 'EDIT' | 'DENIED';
  saving: boolean;
  onSet: (userId: string, permission: 'VIEW' | 'EDIT' | 'DENIED') => void;
  onRevoke: (userId: string) => void;
}) {
  const actions: ReactNode[] = [];

  if (permission === 'EDIT') {
    actions.push(
      <button
        key="view-only"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onSet(userId, 'VIEW')}
        disabled={saving}
      >
        Только просмотр
      </button>
    );
  } else if (permission === 'VIEW') {
    actions.push(
      <button
        key="edit"
        type="button"
        data-modal-btn="secondary"
        onClick={() => onSet(userId, 'EDIT')}
        disabled={saving}
      >
        Редактирование
      </button>
    );
  }

  if (permission !== 'DENIED') {
    actions.push(
      <button
        key="deny"
        type="button"
        data-modal-btn="danger"
        onClick={() => onSet(userId, 'DENIED')}
        disabled={saving}
      >
        Закрыть
      </button>
    );
  }

  actions.push(
    <button
      key="reset"
      type="button"
      data-modal-btn="secondary"
      onClick={() => onRevoke(userId)}
      disabled={saving}
      title={
        permission === 'DENIED'
          ? 'Восстановить доступ по роли'
          : 'Удалить — вернётся доступ по роли'
      }
    >
      {permission === 'DENIED' ? 'Восстановить' : 'Сбросить'}
    </button>
  );

  return <div className={styles.itemActions}>{actions}</div>;
}

function RoleOverviewSkeleton() {
  return (
    <div className={styles.overviewWrap} aria-hidden>
      <table className={styles.overviewTable}>
        <thead>
          <tr>
            <th>Роль</th>
            <th>Итоговый доступ</th>
            <th>Как задано</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROLE_ROWS }, (_, i) => (
            <tr key={i}>
              <td colSpan={4}>
                <span className={styles.skeletonBar} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CHILD_RESOURCE_IDS: Record<string, string[]> = {
  'admin.crm.contract-payments': ['admin.crm.contract-payments.incassation'],
};

const KNOWLEDGE_CATEGORY_PREFIX = KNOWLEDGE_CATEGORY_RESOURCE_PREFIX;

export function AccessModal({
  resourceId: initialResourceId,
  resourceLabel: resourceLabelOverride,
  onClose,
}: AccessModalProps) {
  const [resourceId, setResourceId] = useState(initialResourceId);
  const [permissions, setPermissions] = useState<ResourcePermissionsResponse | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState('');
  const [addUserPermission, setAddUserPermission] = useState<'VIEW' | 'EDIT' | 'DENIED'>('VIEW');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setResourceId(initialResourceId);
  }, [initialResourceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [perms, userList] = await Promise.all([
          getResourcePermissions(resourceId),
          getAdminAccessUsers(),
        ]);
        if (cancelled) return;
        setPermissions(perms);
        setUsers(userList);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const runMutation = async (action: () => Promise<ResourcePermissionsResponse>) => {
    setSaving(true);
    setError(null);
    try {
      const next = await action();
      setPermissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!addUserId) return;
    await runMutation(() => setResourcePermission(resourceId, addUserId, addUserPermission));
    setAddUserId('');
  };

  const userExceptions = permissions?.users ?? [];
  const roleOverview = permissions?.roleOverview ?? [];
  const assignedUserIds = new Set(userExceptions.map((p) => p.id));
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));

  const rolesWithAccess = roleOverview.filter(
    (r) => r.effective === 'VIEW' || r.effective === 'EDIT'
  );
  const rolesDenied = roleOverview.filter((r) => r.effective === 'DENIED');
  const rolesWithOverrides = roleOverview.filter((r) => r.hasExplicitOverride);

  const relatedResourceIds = CHILD_RESOURCE_IDS[initialResourceId] ?? [];
  const parentResourceId = initialResourceId.startsWith(KNOWLEDGE_CATEGORY_PREFIX)
    ? KNOWLEDGE_RESOURCE_ID
    : null;
  const resourceLabel = resourceLabelOverride ?? getAdminResourceLabel(resourceId);
  const isKnowledgeCategory = resourceId.startsWith(KNOWLEDGE_CATEGORY_PREFIX);
  const contentReady = permissions !== null;
  const showSkeleton = loading && !contentReady;

  const modalTitle = (
    <span className={styles.titleWithEdit}>
      <AdminAccessIcon size={20} />
      <span>Доступ:</span>
      <span className={styles.titleResource}>{resourceLabel}</span>
    </span>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={modalTitle}
      size="lg"
      alignTop
      className={`${styles.modalPanel} ${styles.accessPanel}`}
      contentClassName={styles.accessContent}
      showCloseButton
    >
      <div
        data-modal-form
        data-modal-density="compact"
        className={styles.shell}
        aria-busy={loading || saving}
      >
        <p data-modal-form-hint className={styles.introHint}>
          {isKnowledgeCategory ? (
            <>
              <strong>Просмотр</strong> — категория и её материалы доступны для изучения.{' '}
              <strong>Редактирование</strong> — можно управлять материалами категории.{' '}
              <strong>Закрыто</strong> — категория скрыта. Если для категории нет отдельных прав,
              действует доступ к разделу «Территория знаний».
            </>
          ) : (
            <>
              <strong>Просмотр</strong> — раздел виден в меню, данные только для чтения (без
              создания и изменений). <strong>Редактирование</strong> — полный доступ к разделу.{' '}
              <strong>Закрыто</strong> — раздел скрыт. Персональные исключения пользователя
              перекрывают права роли.
            </>
          )}
        </p>
        <p data-modal-form-hint className={styles.resourceIdHint}>
          Ресурс: <code>{resourceId}</code>
        </p>
        {relatedResourceIds.length > 0 || parentResourceId ? (
          <div className={styles.relatedResources}>
            {parentResourceId ? (
              <>
                <span className={styles.relatedLabel}>Связанные настройки:</span>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={styles.relatedBtn}
                  onClick={() => setResourceId(parentResourceId)}
                  disabled={saving || loading || resourceId === parentResourceId}
                >
                  {getAdminResourceLabel(parentResourceId)}
                </button>
              </>
            ) : null}
            {relatedResourceIds.length > 0 ? (
              <>
                {!parentResourceId ? (
                  <span className={styles.relatedLabel}>Связанные настройки:</span>
                ) : null}
                {relatedResourceIds.map((childId) => (
                  <button
                    key={childId}
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.relatedBtn}
                    onClick={() => setResourceId(childId)}
                    disabled={saving || loading || resourceId === childId}
                  >
                    {getAdminResourceLabel(childId)}
                  </button>
                ))}
              </>
            ) : null}
            {resourceId !== initialResourceId &&
            (parentResourceId
              ? resourceId === parentResourceId
              : !initialResourceId.startsWith(KNOWLEDGE_CATEGORY_PREFIX)) ? (
              <button
                type="button"
                data-modal-btn="secondary"
                className={styles.relatedBtn}
                onClick={() => setResourceId(initialResourceId)}
                disabled={saving || loading}
              >
                ← {resourceLabelOverride ?? getAdminResourceLabel(initialResourceId)}
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div className={styles.body}>
          {loading && contentReady ? (
            <div className={styles.loadingOverlay} aria-live="polite">
              Обновление…
            </div>
          ) : null}

          <section
            data-modal-readonly-panel
            data-modal-density="compact"
            className={`${styles.section} ${loading && contentReady ? styles.sectionDimmed : ''}`}
          >
            <h3 className={styles.sectionTitle}>Доступ по ролям</h3>
            <p className={styles.sectionHint}>
              {showSkeleton
                ? 'Загрузка прав по ролям…'
                : `${rolesWithAccess.length} ролей с доступом · ${rolesDenied.length} закрыто · ${rolesWithOverrides.length} с ручными назначениями`}
            </p>
            {showSkeleton ? (
              <RoleOverviewSkeleton />
            ) : (
              <div className={styles.overviewWrap}>
                <table className={styles.overviewTable}>
                  <thead>
                    <tr>
                      <th>Роль</th>
                      <th>Итоговый доступ</th>
                      <th>Как задано</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleOverview.map((row) => (
                      <tr key={row.role}>
                        <td className={styles.roleCell}>{ROLE_LABELS[row.role] || row.role}</td>
                        <td>
                          <span
                            className={effectiveAccessBadgeClass(row.effective, {
                              badge: styles.badge,
                              badgeDenied: styles.badgeDenied,
                              badgeMuted: styles.badgeMuted,
                              badgeEdit: styles.badgeEdit,
                            })}
                          >
                            {EFFECTIVE_ACCESS_LABELS[row.effective]}
                          </span>
                        </td>
                        <td className={styles.sourceCell}>{ACCESS_SOURCE_LABELS[row.source]}</td>
                        <td>
                          <RoleOverviewActions
                            row={row}
                            saving={saving}
                            onSet={(role, permission) =>
                              void runMutation(() =>
                                setRolePermission(resourceId, role, permission)
                              )
                            }
                            onRevoke={(role) =>
                              void runMutation(() => revokeRolePermission(resourceId, role))
                            }
                            onDeny={(role) =>
                              void runMutation(() => setRolePermission(resourceId, role, 'DENIED'))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            data-modal-readonly-panel
            data-modal-density="compact"
            className={`${styles.section} ${loading && contentReady ? styles.sectionDimmed : ''}`}
          >
            <h3 className={styles.sectionTitle}>Индивидуальные исключения (пользователи)</h3>
            <p className={styles.sectionHint}>
              {showSkeleton
                ? 'Загрузка персональных исключений…'
                : userExceptions.length === 0
                  ? 'Нет персональных назначений — все пользователи следуют правам своей роли.'
                  : `${userExceptions.length} пользователей с персональным уровнем доступа`}
            </p>
            {showSkeleton ? (
              <p className={styles.empty}>Загрузка…</p>
            ) : userExceptions.length === 0 ? (
              <p className={styles.empty}>Персональных исключений нет.</p>
            ) : (
              <ul className={styles.list}>
                {userExceptions.map((p) => (
                  <li key={`u-${p.id}`} className={styles.listItem}>
                    <span className={styles.userName}>{formatUserLabel(p)}</span>
                    <span className={styles.userRoleCell}>
                      {ROLE_LABELS[p.role ?? ''] || p.role}
                    </span>
                    <span
                      className={
                        p.permission === 'DENIED'
                          ? styles.badgeDenied
                          : p.permission === 'EDIT'
                            ? styles.badgeEdit
                            : styles.badge
                      }
                    >
                      {p.permission === 'DENIED'
                        ? 'Доступ закрыт'
                        : p.permission === 'EDIT'
                          ? 'Редактирование'
                          : 'Просмотр'}
                    </span>
                    <div className={styles.itemActions}>
                      <UserExceptionActions
                        userId={p.id}
                        permission={p.permission}
                        saving={saving}
                        onSet={(id, permission) =>
                          void runMutation(() => setResourcePermission(resourceId, id, permission))
                        }
                        onRevoke={(id) =>
                          void runMutation(() => revokeResourcePermission(resourceId, id))
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div
              data-modal-form-grid
              className={`${styles.addGrid} ${showSkeleton ? styles.addGridPending : ''}`}
            >
              <div data-modal-form-group>
                <label htmlFor="access-add-user">Добавить исключение</label>
                <select
                  id="access-add-user"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  disabled={saving || loading}
                >
                  <option value="">Выберите пользователя</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {formatUserLabel(u)} — {ROLE_LABELS[u.role] || u.role}
                    </option>
                  ))}
                </select>
              </div>
              <div data-modal-form-group>
                <label htmlFor="access-add-user-permission">Уровень доступа</label>
                <select
                  id="access-add-user-permission"
                  value={addUserPermission}
                  onChange={(e) =>
                    setAddUserPermission(e.target.value as 'VIEW' | 'EDIT' | 'DENIED')
                  }
                  disabled={saving || loading}
                >
                  <option value="VIEW">Просмотр</option>
                  <option value="EDIT">Редактирование</option>
                  <option value="DENIED">Закрыть доступ</option>
                </select>
              </div>
              <div data-modal-form-group className={styles.addBtnWrap}>
                <button
                  type="button"
                  data-modal-btn="primary"
                  onClick={() => void handleAddUser()}
                  disabled={!addUserId || saving || loading}
                >
                  {addUserPermission === 'DENIED' ? 'Запретить' : 'Добавить'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
