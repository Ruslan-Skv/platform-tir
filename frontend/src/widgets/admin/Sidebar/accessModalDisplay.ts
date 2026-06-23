import type {
  AdminAccessGrantLevel,
  EffectiveAccess,
  RoleAccessSource,
} from '@/shared/api/admin-access';

export const EFFECTIVE_ACCESS_LABELS: Record<EffectiveAccess, string> = {
  EDIT: 'Редактирование',
  PARTICIPATE: 'Участие',
  VIEW: 'Просмотр',
  NONE: 'Нет доступа',
  DENIED: 'Закрыто',
};

export const GRANT_LEVEL_LABELS: Record<AdminAccessGrantLevel, string> = {
  EDIT: 'Редактирование',
  PARTICIPATE: 'Участие',
  VIEW: 'Просмотр',
  DENIED: 'Закрыто',
};

export const ACCESS_SOURCE_LABELS: Record<RoleAccessSource, string> = {
  super_admin: 'Система (супер-админ)',
  default: 'Редактирование по умолчанию для роли',
  role_override: 'Назначено вручную',
  role_denied: 'Закрыто вручную',
  inherited_denied: 'Закрыто родительским разделом',
  none: 'Не входит в роль',
};

export function effectiveAccessBadgeClass(
  effective: EffectiveAccess,
  styles: {
    badge: string;
    badgeDenied: string;
    badgeMuted: string;
    badgeEdit: string;
    badgeParticipate: string;
  }
): string {
  if (effective === 'DENIED') return styles.badgeDenied;
  if (effective === 'NONE') return styles.badgeMuted;
  if (effective === 'EDIT') return styles.badgeEdit;
  if (effective === 'PARTICIPATE') return styles.badgeParticipate;
  return styles.badge;
}

export function grantLevelBadgeClass(
  permission: AdminAccessGrantLevel,
  styles: {
    badge: string;
    badgeDenied: string;
    badgeEdit: string;
    badgeParticipate: string;
  }
): string {
  if (permission === 'DENIED') return styles.badgeDenied;
  if (permission === 'EDIT') return styles.badgeEdit;
  if (permission === 'PARTICIPATE') return styles.badgeParticipate;
  return styles.badge;
}
