/** Части ФИО физлица (порядок: фамилия, имя, отчество). */
export type CrmPersonNameParts = {
  lastName: string;
  firstName: string;
  patronymic: string;
};

export function parseFullNameString(full: string): CrmPersonNameParts {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: '', firstName: '', patronymic: '' };
  if (parts.length === 1) return { lastName: '', firstName: parts[0], patronymic: '' };
  if (parts.length === 2) return { lastName: parts[0], firstName: parts[1], patronymic: '' };
  return {
    lastName: parts[0],
    firstName: parts[1],
    patronymic: parts.slice(2).join(' '),
  };
}

export function joinPersonFullName(parts: CrmPersonNameParts): string {
  return [parts.lastName, parts.firstName, parts.patronymic]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
}

export function personNamePartsFilledCount(parts: CrmPersonNameParts): number {
  let n = 0;
  if (parts.lastName.trim()) n += 1;
  if (parts.firstName.trim()) n += 1;
  if (parts.patronymic.trim()) n += 1;
  return n;
}

export type PersonNameSources = {
  extLastName?: string | null;
  extFirstName?: string | null;
  extPatronymic?: string | null;
  extFullName?: string | null;
  rowFirstName?: string | null;
  rowLastName?: string | null;
};

/** Восстанавливает части ФИО из extendedProfile и колонок Customer. */
export function resolvePersonNameParts(sources: PersonNameSources): CrmPersonNameParts {
  const extLn = (sources.extLastName ?? '').trim();
  const extFn = (sources.extFirstName ?? '').trim();
  const extPat = (sources.extPatronymic ?? '').trim();
  if (extLn || extFn || extPat) {
    return { lastName: extLn, firstName: extFn, patronymic: extPat };
  }

  const extFull = (sources.extFullName ?? '').trim();
  if (extFull) return parseFullNameString(extFull);

  const rowLn = (sources.rowLastName ?? '').trim();
  const rowFn = (sources.rowFirstName ?? '').trim();

  if (rowFn && /\s/.test(rowFn) && !rowLn) {
    return parseFullNameString(rowFn);
  }

  if (rowLn || rowFn) {
    return { lastName: rowLn, firstName: rowFn, patronymic: '' };
  }

  return { lastName: '', firstName: '', patronymic: '' };
}

export function resolvePersonNamePartsFromDetail(data: {
  firstName?: string | null;
  lastName?: string | null;
  extendedProfile?: Record<string, unknown> | null;
}): CrmPersonNameParts {
  const ext = data.extendedProfile ?? {};
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return resolvePersonNameParts({
    extLastName: str(ext.lastName),
    extFirstName: str(ext.firstName),
    extPatronymic: str(ext.patronymic),
    extFullName: str(ext.fullName),
    rowFirstName: data.firstName,
    rowLastName: data.lastName,
  });
}

export type CrmPersonNameInitialSnapshot = CrmPersonNameParts;

/** Сохранение ФИО при редактировании: заполненные при открытии части не меняются, пустые — из формы. */
export function mergePersonNameForEdit(
  form: CrmPersonNameParts,
  original: CrmPersonNameParts,
  initial: CrmPersonNameInitialSnapshot
): CrmPersonNameParts {
  return {
    lastName: initial.lastName.trim() ? original.lastName : form.lastName.trim(),
    firstName: initial.firstName.trim() ? original.firstName : form.firstName.trim(),
    patronymic: initial.patronymic.trim() ? original.patronymic : form.patronymic.trim(),
  };
}

/** Поля extendedProfile для физлица + вычисленное fullName для договоров. */
export function buildPersonExtendedProfileFields(
  parts: CrmPersonNameParts
): Record<string, string> {
  const lastName = parts.lastName.trim();
  const firstName = parts.firstName.trim();
  const patronymic = parts.patronymic.trim();
  return {
    lastName,
    firstName,
    patronymic,
    fullName: joinPersonFullName(parts),
  };
}
