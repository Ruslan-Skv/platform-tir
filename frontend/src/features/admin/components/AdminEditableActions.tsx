'use client';

import type { ReactNode } from 'react';

import { useAdminSectionCanEdit } from '../contexts/AdminSectionPermissionContext';

type AdminEditableActionsProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Рендерит дочерние элементы только при уровне доступа «Редактирование». */
export function AdminEditableActions({ children, fallback = null }: AdminEditableActionsProps) {
  const { canEdit, isLoading } = useAdminSectionCanEdit();
  if (isLoading || !canEdit) return fallback;
  return children;
}

type AdminMutationButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

/** Кнопка мутации — скрывается в режиме «только просмотр» (через CSS и canEdit). */
export function AdminMutationButton({
  children,
  className,
  disabled,
  ...rest
}: AdminMutationButtonProps) {
  const { canEdit } = useAdminSectionCanEdit();
  return (
    <button
      type="button"
      data-admin-mutation
      className={['admin-mutation-button', className].filter(Boolean).join(' ')}
      disabled={disabled || !canEdit}
      {...rest}
    >
      {children}
    </button>
  );
}
