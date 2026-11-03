import { BadRequestException } from '@nestjs/common';

/**
 * Правило «подписание только текущей датой»: в момент подписания договора
 * (переход статуса пакета в CONTRACT_CONCLUDED) и доп. соглашения (переход
 * слота из OPEN в SIGNED) дата документа должна быть равна сегодняшней
 * по Москве. Уже подписанные документы правилом не пересматриваются —
 * проверка выполняется только на переходе статуса.
 */

/** Сегодняшняя дата по Москве в виде дд.мм.гггг. */
export function moscowTodayDdMmYyyy(now: Date = new Date()): string {
  // Локаль sv-SE даёт yyyy-mm-dd (как в signing-stage-effects.service.ts).
  const iso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(now);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/**
 * Разбор даты документа: дд.мм.гггг, yyyy-mm-dd (префикс ISO), дд-мм-гггг —
 * порт фронтендового parseContractDate (core/contractDateFormat.ts).
 */
export function parseContractDateParts(
  raw: unknown,
): { year: number; month: number; day: number } | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/.exec(t);
  const dmyDot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
  const dmyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(t);
  const year = iso
    ? Number(iso[1])
    : dmyDot
      ? Number(dmyDot[3])
      : dmyDash
        ? Number(dmyDash[3])
        : NaN;
  const month = iso
    ? Number(iso[2])
    : dmyDot
      ? Number(dmyDot[2])
      : dmyDash
        ? Number(dmyDash[2])
        : NaN;
  const day = iso
    ? Number(iso[3])
    : dmyDot
      ? Number(dmyDot[1])
      : dmyDash
        ? Number(dmyDash[1])
        : NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function contractDateEqualsToday(raw: unknown, todayDdMmYyyy: string): boolean {
  const value = parseContractDateParts(raw);
  const today = parseContractDateParts(todayDdMmYyyy);
  if (!value || !today) return false;
  return value.year === today.year && value.month === today.month && value.day === today.day;
}

function formRecord(formData: unknown): Record<string, unknown> {
  return formData && typeof formData === 'object' && !Array.isArray(formData)
    ? (formData as Record<string, unknown>)
    : {};
}

function contractDateOf(formData: unknown): unknown {
  return formRecord(formRecord(formData).contract).date;
}

function addendumSlotStatus(formData: unknown, index: number): unknown {
  const slots = formRecord(formData).addendumSlots;
  if (!Array.isArray(slots)) return undefined;
  return formRecord(slots[index]).status;
}

function addendumDocumentDate(formData: unknown, index: number): unknown {
  const dates = formRecord(formData).addendumDocumentDates;
  if (!Array.isArray(dates)) return undefined;
  return dates[index];
}

/**
 * Проверяет даты подписания при сохранении пакета:
 * — договор: переход статуса в CONTRACT_CONCLUDED ⇒ contract.date == сегодня;
 * — Д/с: переход слота OPEN → SIGNED ⇒ addendumDocumentDates[i] == сегодня.
 * Нарушение — BadRequestException с понятным сообщением. Перехода нет —
 * проверки нет (ранее подписанные документы не затрагиваются).
 */
export function assertSigningDatesAreToday(params: {
  storedStatus: string;
  incomingStatus: string | undefined;
  storedFormData: unknown;
  incomingFormData: unknown;
  todayDdMmYyyy?: string;
}): void {
  const today = params.todayDdMmYyyy?.trim() || moscowTodayDdMmYyyy();

  if (
    params.incomingStatus === 'CONTRACT_CONCLUDED' &&
    params.storedStatus !== 'CONTRACT_CONCLUDED'
  ) {
    const contractDate =
      contractDateOf(params.incomingFormData) ?? contractDateOf(params.storedFormData);
    if (!contractDateEqualsToday(contractDate, today)) {
      throw new BadRequestException(
        `Договор нельзя подписать задней датой: дата заключения должна быть сегодняшней (${today}). ` +
          'Исправьте поле «Дата закл.» на вкладке «Данные» и подпишите заново.',
      );
    }
  }

  const slotCount = 5;
  for (let i = 0; i < slotCount; i++) {
    const incomingStatus = addendumSlotStatus(params.incomingFormData, i);
    if (incomingStatus !== 'SIGNED') continue;
    const storedStatus = addendumSlotStatus(params.storedFormData, i);
    // Новый переход в SIGNED — только из OPEN (открытое Д/с); PAID → SIGNED —
    // это отмена оплаты, SIGNED → SIGNED — правка уже подписанного.
    if (storedStatus !== undefined && storedStatus !== 'OPEN') continue;
    const documentDate =
      addendumDocumentDate(params.incomingFormData, i) ??
      addendumDocumentDate(params.storedFormData, i);
    if (!contractDateEqualsToday(documentDate, today)) {
      throw new BadRequestException(
        `Доп. соглашение №${i + 1} нельзя подписать задней датой: дата документа должна быть сегодняшней (${today}). ` +
          `Исправьте дату на вкладке «Д/с №${i + 1}» и подпишите заново.`,
      );
    }
  }
}
