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

  const bikMatch = text.match(/БИК[:\s]*(\d{9})/i);
  const corrMatch = text.match(/\b(?:к\/\s*с|кор\.?\s*сч)\.?\s*№?\s*[:.]?\s*([\d\s]+)/i);
  const settlementMatch = text.match(/\bр\/\s*с\.?\s*№?\s*[:.]?\s*([\d\s]+)/i);

  const bik = bikMatch?.[1] ?? '';
  let corrAccount = corrMatch ? formatInvoiceBankAccount(corrMatch[1]) : '';
  let settlementAccount = settlementMatch ? formatInvoiceBankAccount(settlementMatch[1]) : '';

  if (!corrAccount || !settlementAccount) {
    const schetAccounts = [...text.matchAll(/Сч[её]т\s*№\s*([\d\s]+)/gi)]
      .map((m) => normalizeBankAccountDigits(m[1] ?? ''))
      .filter((digits) => digits.length === 20);

    for (const digits of schetAccounts) {
      if (!corrAccount && digits.startsWith('301')) {
        corrAccount = formatInvoiceBankAccount(digits);
      } else if (!settlementAccount && (digits.startsWith('408') || digits.startsWith('407'))) {
        settlementAccount = formatInvoiceBankAccount(digits);
      }
    }

    if (schetAccounts.length >= 2) {
      if (!corrAccount) corrAccount = formatInvoiceBankAccount(schetAccounts[0]);
      if (!settlementAccount) settlementAccount = formatInvoiceBankAccount(schetAccounts[1]);
    } else if (schetAccounts.length === 1) {
      const only = schetAccounts[0];
      if (!corrAccount && only.startsWith('301')) corrAccount = formatInvoiceBankAccount(only);
      if (!settlementAccount && !only.startsWith('301')) {
        settlementAccount = formatInvoiceBankAccount(only);
      }
    }
  }

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
        ?.replace(/^Банк\s+получателя\s*/i, '')
        .trim()
        .replace(/[,\s]+$/, '') ?? '';
  }

  if (bankName) {
    bankName = bankName.replace(/\s+/g, ' ').trim();
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
    const legacy =
      (source.bankDetails ?? '').trim() &&
      (!structured.bankName.trim() ||
        normalizeBankAccountDigits(structured.bankCorrAccount).length !== 20 ||
        normalizeBankAccountDigits(structured.bankSettlementAccount).length !== 20)
        ? parseExecutorBankDetails(source.bankDetails ?? '')
        : null;

    const merged: ExecutorBankFields = {
      bankName: structured.bankName.trim() || legacy?.bankName || '',
      bankBik: structured.bankBik || normalizeBankBik(legacy?.bik ?? ''),
      bankCorrAccount:
        normalizeBankAccountDigits(structured.bankCorrAccount) ||
        normalizeBankAccountDigits(legacy?.corrAccount ?? ''),
      bankSettlementAccount:
        normalizeBankAccountDigits(structured.bankSettlementAccount) ||
        normalizeBankAccountDigits(legacy?.settlementAccount ?? ''),
    };

    return {
      ...merged,
      bankCorrAccountDisplay: formatBankAccountForDisplay(merged.bankCorrAccount),
      bankSettlementAccountDisplay: formatBankAccountForDisplay(merged.bankSettlementAccount),
      bankDetailsComposed: composeExecutorBankDetails(merged),
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
