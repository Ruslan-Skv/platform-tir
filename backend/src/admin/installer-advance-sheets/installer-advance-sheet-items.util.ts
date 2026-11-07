import { BadRequestException } from '@nestjs/common';

import { CreateInstallerAdvanceSheetItemDto } from './dto/installer-advance-sheet-items.dto';

/**
 * Строка ведомости после нормализации: договор (packageId) либо ручное
 * назначение выдачи (purpose) — строго что-то одно. Строка без договора
 * в журнал авансов и «Расчёт мастеров» не попадает.
 */
export type NormalizedInstallerAdvanceSheetItem = {
  packageId: string | null;
  purpose: string | null;
  amount: number;
};

/** Нормализация строк ведомости: трим + проверка «договор XOR назначение выдачи». */
export function normalizeInstallerAdvanceSheetItems(
  items: CreateInstallerAdvanceSheetItemDto[],
): NormalizedInstallerAdvanceSheetItem[] {
  if (items.length === 0) {
    throw new BadRequestException('Добавьте хотя бы одну строку ведомости');
  }
  return items.map((item, index) => {
    const packageId = typeof item.packageId === 'string' ? item.packageId.trim() : '';
    const purpose = typeof item.purpose === 'string' ? item.purpose.trim() : '';
    if (packageId && purpose) {
      throw new BadRequestException(
        `Строка №${index + 1}: укажите либо договор, либо назначение выдачи — не оба сразу`,
      );
    }
    if (!packageId && !purpose) {
      throw new BadRequestException(`Строка №${index + 1}: укажите договор или назначение выдачи`);
    }
    return { packageId: packageId || null, purpose: purpose || null, amount: item.amount };
  });
}
