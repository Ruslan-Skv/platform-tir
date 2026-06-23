/**
 * Возвращает true, если мутацию можно выполнять (уровень «Редактирование»).
 */
export function canRunAdminMutation(canEdit: boolean): boolean {
  return canEdit;
}

/**
 * Обёртка для обработчиков сохранения/удаления в хуках админки.
 */
export function guardAdminMutation<T extends (...args: never[]) => unknown>(
  canEdit: boolean,
  fn: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>) => {
    if (!canEdit) return undefined;
    return fn(...args) as ReturnType<T>;
  };
}
