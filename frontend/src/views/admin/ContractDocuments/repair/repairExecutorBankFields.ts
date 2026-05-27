import type {
  ExecutorRequisiteKind,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

export interface ExecutorBankFields {
  bankName: string;
  bankBik: string;
  bankCorrAccount: string;
  bankSettlementAccount: string;
}

export type ExecutorBankSource = ExecutorBankFields & {
  bankDetails?: string;
};

/** Счёт для печати: группы по 5 цифр, как в банковской форме. */
export function formatInvoiceBankAccount(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/(\d{5})(?=\d)/g, '$1 ').trim();
}

export interface ParsedExecutorBankDetails {
  bankName: string;
  bik: string;
  corrAccount: string;
  settlementAccount: string;
}

/** Разбор legacy-строки «Банковские реквизиты». */
export function parseExecutorBankDetails(raw: string): ParsedExecutorBankDetails {
  const text = raw.trim();
  if (!text) {
    return { bankName: '', bik: '', corrAccount: '', settlementAccount: '' };
  }

  const bikMatch = text.match(/\bБИК[:\s]*(\d{9})\b/i);
  const corrMatch = text.match(/\bк\/\s*с\.?\s*[:.]?\s*([\d\s]+)/i);
  const settlementMatch = text.match(/\bр\/\s*с\.?\s*[:.]?\s*([\d\s]+)/i);

  const bik = bikMatch?.[1] ?? '';
  const corrAccount = corrMatch ? formatInvoiceBankAccount(corrMatch[1]) : '';
  const settlementAccount = settlementMatch ? formatInvoiceBankAccount(settlementMatch[1]) : '';

  let bankName =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !/\bБИК\b/i.test(line) &&
          !/\bк\/\s*с/i.test(line) &&
          !/\bр\/\s*с/i.test(line) &&
          !/^\d[\d\s]+$/.test(line)
      ) ?? '';

  if (bik && /\bБИК\b/i.test(bankName)) {
    bankName =
      bankName
        .split(/\bБИК\b/i)[0]
        ?.trim()
        .replace(/[,\s]+$/, '') ?? '';
  }
  if (!bankName && bik) {
    bankName =
      text
        .split(/\bБИК\b/i)[0]
        ?.trim()
        .replace(/[,\s]+$/, '') ?? '';
  }

  return { bankName, bik, corrAccount, settlementAccount };
}

/** Цифры счёта (20 знаков) без пробелов. */
export function normalizeBankAccountDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 20);
}

/** БИК — 9 цифр. */
export function normalizeBankBik(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 9);
}

function formatBankAccountForDisplay(digits: string): string {
  return formatInvoiceBankAccount(digits);
}

export function composeExecutorBankDetails(fields: ExecutorBankFields): string {
  const lines: string[] = [];
  const bankName = fields.bankName.trim();
  const bik = normalizeBankBik(fields.bankBik);
  const corr = normalizeBankAccountDigits(fields.bankCorrAccount);
  const settlement = normalizeBankAccountDigits(fields.bankSettlementAccount);

  if (bankName) lines.push(bankName);
  if (bik) lines.push(`БИК ${bik}`);
  if (corr) lines.push(`к/с ${corr}`);
  if (settlement) lines.push(`р/с ${settlement}`);

  return lines.join('\n');
}

function hasStructuredBankFields(fields: ExecutorBankFields): boolean {
  return Boolean(
    fields.bankName.trim() ||
    normalizeBankBik(fields.bankBik) ||
    normalizeBankAccountDigits(fields.bankCorrAccount) ||
    normalizeBankAccountDigits(fields.bankSettlementAccount)
  );
}

/** Полная нормализация карточки исполнителя (тип, банк, сводные реквизиты). */
export function normalizeExecutorRequisiteProfile(
  raw: ExecutorRequisiteProfile
): ExecutorRequisiteProfile {
  const kind: ExecutorRequisiteKind = raw.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  return normalizeExecutorProfileBankFields({
    title: raw.title ?? '',
    kind,
    companyName: raw.companyName ?? '',
    inn: raw.inn ?? '',
    kpp: kind === 'ENTREPRENEUR' ? '' : (raw.kpp ?? ''),
    ogrn: kind === 'ENTREPRENEUR' ? '' : (raw.ogrn ?? ''),
    ogrnip: kind === 'ENTREPRENEUR' ? (raw.ogrnip ?? '') : '',
    legalAddress: raw.legalAddress ?? '',
    actualAddress: raw.actualAddress ?? '',
    bankDetails: raw.bankDetails ?? '',
    bankName: raw.bankName ?? '',
    bankBik: raw.bankBik ?? '',
    bankCorrAccount: raw.bankCorrAccount ?? '',
    bankSettlementAccount: raw.bankSettlementAccount ?? '',
    email: raw.email ?? '',
  });
}

/** Нормализует поля банка в профиле; при необходимости разбирает legacy `bankDetails`. */
export function normalizeExecutorProfileBankFields(
  raw: ExecutorRequisiteProfile
): ExecutorRequisiteProfile {
  const structured: ExecutorBankFields = {
    bankName: (raw.bankName ?? '').trim(),
    bankBik: normalizeBankBik(raw.bankBik ?? ''),
    bankCorrAccount: normalizeBankAccountDigits(raw.bankCorrAccount ?? ''),
    bankSettlementAccount: normalizeBankAccountDigits(raw.bankSettlementAccount ?? ''),
  };

  if (!hasStructuredBankFields(structured) && (raw.bankDetails ?? '').trim()) {
    const parsed = parseExecutorBankDetails(raw.bankDetails ?? '');
    structured.bankName = parsed.bankName;
    structured.bankBik = normalizeBankBik(parsed.bik);
    structured.bankCorrAccount = normalizeBankAccountDigits(parsed.corrAccount);
    structured.bankSettlementAccount = normalizeBankAccountDigits(parsed.settlementAccount);
  }

  const bankDetails = hasStructuredBankFields(structured)
    ? composeExecutorBankDetails(structured)
    : (raw.bankDetails ?? '').trim();

  return {
    ...raw,
    bankName: structured.bankName,
    bankBik: structured.bankBik,
    bankCorrAccount: structured.bankCorrAccount,
    bankSettlementAccount: structured.bankSettlementAccount,
    bankDetails,
  };
}

/** Реквизиты для шаблонов: приоритет у отдельных полей, иначе разбор `bankDetails`. */
export function resolveExecutorBankFields(source: ExecutorBankSource): ExecutorBankFields & {
  bankDetailsComposed: string;
  bankCorrAccountDisplay: string;
  bankSettlementAccountDisplay: string;
} {
  const structured: ExecutorBankFields = {
    bankName: (source.bankName ?? '').trim(),
    bankBik: normalizeBankBik(source.bankBik ?? ''),
    bankCorrAccount: normalizeBankAccountDigits(source.bankCorrAccount ?? ''),
    bankSettlementAccount: normalizeBankAccountDigits(source.bankSettlementAccount ?? ''),
  };

  if (hasStructuredBankFields(structured)) {
    return {
      ...structured,
      bankCorrAccountDisplay: formatBankAccountForDisplay(structured.bankCorrAccount),
      bankSettlementAccountDisplay: formatBankAccountForDisplay(structured.bankSettlementAccount),
      bankDetailsComposed: composeExecutorBankDetails(structured),
    };
  }

  const parsed = parseExecutorBankDetails(source.bankDetails ?? '');
  const fromLegacy: ExecutorBankFields = {
    bankName: parsed.bankName,
    bankBik: normalizeBankBik(parsed.bik),
    bankCorrAccount: normalizeBankAccountDigits(parsed.corrAccount),
    bankSettlementAccount: normalizeBankAccountDigits(parsed.settlementAccount),
  };

  return {
    ...fromLegacy,
    bankCorrAccountDisplay: formatBankAccountForDisplay(fromLegacy.bankCorrAccount),
    bankSettlementAccountDisplay: formatBankAccountForDisplay(fromLegacy.bankSettlementAccount),
    bankDetailsComposed:
      (source.bankDetails ?? '').trim() || composeExecutorBankDetails(fromLegacy),
  };
}
