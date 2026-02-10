'use client';

import styles from './SettingsPage.module.css';
import type { RoleConfig } from './rolesConfig';
import { ROLES_CONFIG } from './rolesConfig';

export function RolesSection() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Роли пользователей</h2>
      <p className={styles.sectionDescription}>
        В системе используются роли с иерархией доступа. Доступ к разделам админки задаётся на
        бэкенде через декоратор <code>@Roles()</code> в контроллерах. Супер-администратор имеет
        полный доступ ко всем маршрутам.
      </p>
      <div className={styles.rolesGrid}>
        {ROLES_CONFIG.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>
    </section>
  );
}

function RoleCard({ role }: { role: RoleConfig }) {
  const isAdminRole = role.id !== 'USER' && role.id !== 'GUEST';
  return (
    <article className={`${styles.roleCard} ${isAdminRole ? styles.roleCardAdmin : ''}`}>
      <div className={styles.roleCardHeader}>
        <span className={styles.roleId}>{role.id}</span>
        <h3 className={styles.roleLabel}>{role.label}</h3>
      </div>
      <p className={styles.roleDescription}>{role.description}</p>
      <div className={styles.permissions}>
        <span className={styles.permissionsTitle}>Доступ:</span>
        <ul className={styles.permissionsList}>
          {role.permissions.map((perm, idx) => (
            <li key={idx}>{perm}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
