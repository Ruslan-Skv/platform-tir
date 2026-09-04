import { BadRequestException } from '@nestjs/common';

/** Нормализация номера для сравнения уникальности. */
export function normalizeContractNumberKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Все номера договоров из formData пакета (основной + ноги мебели).
 */
export function extractContractNumbersFromFormData(formData: unknown): string[] {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return [];
  const fd = formData as Record<string, unknown>;
  const out: string[] = [];
  const push = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const n = normalizeContractNumberKey(raw);
    if (n) out.push(n);
  };

  const contract =
    fd.contract && typeof fd.contract === 'object' && !Array.isArray(fd.contract)
      ? (fd.contract as Record<string, unknown>)
      : null;
  if (contract) push(contract.number);

  const furniture =
    fd.furniture && typeof fd.furniture === 'object' && !Array.isArray(fd.furniture)
      ? (fd.furniture as Record<string, unknown>)
      : null;
  if (furniture) {
    for (const key of ['manufacture', 'montage', 'appliances'] as const) {
      const leg = furniture[key];
      if (!leg || typeof leg !== 'object' || Array.isArray(leg)) continue;
      const enabled =
        key === 'manufacture' ? true : (leg as { enabled?: unknown }).enabled === true;
      if (!enabled) continue;
      const legContract = (leg as { contract?: unknown }).contract;
      if (!legContract || typeof legContract !== 'object' || Array.isArray(legContract)) continue;
      push((legContract as { number?: unknown }).number);
    }
  }

  return [...new Set(out)];
}

export function assertNoDuplicateNumbersInForm(numbers: string[]): void {
  const seen = new Set<string>();
  for (const n of numbers) {
    const key = normalizeContractNumberKey(n).toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException(
        `В пакете повторяется номер договора «${n}». Номера внутри пакета тоже должны быть уникальными.`,
      );
    }
    seen.add(key);
  }
}
