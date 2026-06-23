export enum AdminResourcePermissionLevel {
  VIEW = 'VIEW',
  /** Просмотр + комментарии, лайки, оценки, обратная связь, quiz, прогресс видео */
  PARTICIPATE = 'PARTICIPATE',
  EDIT = 'EDIT',
  /** Явный запрет доступа (перекрывает доступ по роли) */
  DENIED = 'DENIED',
}
