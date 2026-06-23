export enum AdminResourcePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  /** Явный запрет доступа (перекрывает доступ по роли) */
  DENIED = 'DENIED',
}
