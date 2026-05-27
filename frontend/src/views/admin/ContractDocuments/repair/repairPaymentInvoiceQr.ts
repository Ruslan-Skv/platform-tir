import iconv from 'iconv-lite';
import QRCode from 'qrcode';

import {
  normalizeBankAccountDigits,
  normalizeBankBik,
  resolveExecutorBankFields,
} from './repairExecutorBankFields';
import type { RepairInvoiceConductDraft } from './repairInvoiceConduct';
import type { RepairPackageFormData } from './repairPackageForm';
import { sumPaymentInvoiceLineItems } from './repairPaymentInvoiceLineItems';

const PURPOSE_MAX_LEN = 160;

/** ГОСТ Р 56042-2014: Windows-1251 — основной формат для приложений банков. */
export const PAYMENT_QR_GOST_FORMAT_ID_WIN1251 = 'ST00011';

/** ГОСТ Р 56042-2014: UTF-8 — запасной вариант. */
export const PAYMENT_QR_GOST_FORMAT_ID_UTF8 = 'ST00012';

const QR_RENDER_OPTIONS = {
  errorCorrectionLevel: 'H' as const,
  margin: 2,
  width: 280,
};

function sanitizeQrFieldValue(raw: string): string {
  return raw
    .replace(/\|/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Имя получателя: без кавычек и лишних символов. */
function normalizePayeeNameForQr(raw: string): string {
  return sanitizeQrFieldValue(raw).replace(/["«»]/g, '').trim();
}

function normalizePurposeForQr(raw: string): string {
  return sanitizeQrFieldValue(raw)
    .replace(/№/g, 'N')
    .replace(/Ё/g, 'Е')
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .slice(0, PURPOSE_MAX_LEN);
}

/** Короткое назначение платежа. */
export function buildPaymentInvoiceQrPurpose(
  form: RepairPackageFormData,
  conduct: RepairInvoiceConductDraft
): string {
  const invoiceNo = conduct.invoiceNumber.trim();
  const dateRaw = conduct.invoiceDate.trim();
  const dateRu = dateRaw
    ? (() => {
        const d = new Date(`${dateRaw}T12:00:00`);
        return Number.isFinite(d.getTime()) ? d.toLocaleDateString('ru-RU') : dateRaw;
      })()
    : '';
  const contractNo = form.contract.number.trim();

  if (invoiceNo) {
    return normalizePurposeForQr(
      `Оплата по счету N ${invoiceNo}${dateRu ? ` от ${dateRu}` : ''}. Без НДС`
    );
  }
  if (contractNo) {
    return normalizePurposeForQr(`Оплата по договору N ${contractNo}. Без НДС`);
  }
  return 'Оплата по счету. Без НДС';
}

export type PaymentInvoiceQrBuildInput = {
  payeeName: string;
  inn: string;
  kpp: string;
  bankName: string;
  bik: string;
  corrAccount: string;
  settlementAccount: string;
  amountRub: number;
  purpose: string;
};

function amountToKopecks(amountRub: number): number {
  return Math.round(Math.round(amountRub * 100 * 1e4) / 1e4);
}

/** Полный набор для ST00011 (корр. счёт и ИНН обязательны для банков). */
export function hasFullBankQrRequisites(input: PaymentInvoiceQrBuildInput): boolean {
  const inn = input.inn.replace(/\D/g, '');
  return (
    Boolean(sanitizeQrFieldValue(input.bankName)) &&
    normalizeBankAccountDigits(input.corrAccount).length === 20 &&
    (inn.length === 10 || inn.length === 12)
  );
}

/** Сбор строки по ГОСТ (порядок полей как в рабочих примерах Сбера / htmlweb.ru). */
export function buildSt0001PaymentQrPayload(
  input: PaymentInvoiceQrBuildInput,
  formatId: string = PAYMENT_QR_GOST_FORMAT_ID_WIN1251
): string | null {
  const payeeName = normalizePayeeNameForQr(input.payeeName);
  const bankName = sanitizeQrFieldValue(input.bankName);
  const personalAcc = normalizeBankAccountDigits(input.settlementAccount);
  const bic = normalizeBankBik(input.bik);
  const corrAccount = normalizeBankAccountDigits(input.corrAccount);
  const inn = input.inn.replace(/\D/g, '');
  const kpp = input.kpp.replace(/\D/g, '');
  const purpose = normalizePurposeForQr(input.purpose);
  const kopecks = amountToKopecks(input.amountRub);
  const strictBank = formatId === PAYMENT_QR_GOST_FORMAT_ID_WIN1251;

  if (!payeeName || personalAcc.length !== 20 || bic.length !== 9 || kopecks <= 0) {
    return null;
  }

  if (strictBank) {
    if (!bankName || corrAccount.length !== 20 || (inn.length !== 10 && inn.length !== 12)) {
      return null;
    }
  }

  const parts: string[] = [formatId];
  parts.push(`Name=${payeeName}`);
  parts.push(`PersonalAcc=${personalAcc}`);
  parts.push(`BankName=${bankName || 'Банк'}`);
  parts.push(`BIC=${bic}`);
  if (corrAccount.length === 20) {
    parts.push(`CorrespAcc=${corrAccount}`);
  }
  parts.push(`Sum=${kopecks}`);
  if (purpose) {
    parts.push(`Purpose=${purpose}`);
  }
  if (/без\s*ндс/i.test(purpose)) {
    parts.push('TaxRate=none');
  }
  if (inn.length === 10 || inn.length === 12) {
    parts.push(`PayeeINN=${inn}`);
  }
  if (kpp.length === 9) {
    parts.push(`KPP=${kpp}`);
  }

  return parts.join('|');
}

export function paymentInvoiceQrInputFromForm(
  form: RepairPackageFormData,
  conduct: RepairInvoiceConductDraft
): PaymentInvoiceQrBuildInput | null {
  const bank = resolveExecutorBankFields(form.executor);
  const totalRub = sumPaymentInvoiceLineItems(conduct.lineItems);
  const amountRub =
    totalRub > 0
      ? totalRub
      : Number.parseFloat(conduct.amount.replace(/\s+/g, '').replace(',', '.'));
  if (!Number.isFinite(amountRub) || amountRub <= 0) return null;

  return {
    payeeName: form.executor.companyName.trim(),
    inn: form.executor.inn.trim(),
    kpp: form.executor.executorKind === 'ENTREPRENEUR' ? '' : form.executor.kpp.trim(),
    bankName: bank.bankName,
    bik: bank.bankBik,
    corrAccount: bank.bankCorrAccount,
    settlementAccount: bank.bankSettlementAccount,
    amountRub,
    purpose: buildPaymentInvoiceQrPurpose(form, conduct),
  };
}

function encodeWin1251Payload(payload: string): Uint8Array {
  const encoded = iconv.encode(payload, 'win1251');
  return encoded instanceof Uint8Array ? encoded : Uint8Array.from(encoded);
}

/** PNG data URL: при полных реквизитах — ST00011 (win1251), иначе ST00012 (UTF-8). */
export async function buildPaymentInvoiceQrDataUrl(
  input: PaymentInvoiceQrBuildInput,
  sizePx: number = QR_RENDER_OPTIONS.width
): Promise<string | null> {
  const qrOptions = { ...QR_RENDER_OPTIONS, width: sizePx };

  if (hasFullBankQrRequisites(input)) {
    const winPayload = buildSt0001PaymentQrPayload(input, PAYMENT_QR_GOST_FORMAT_ID_WIN1251);
    if (winPayload) {
      try {
        return await QRCode.toDataURL(encodeWin1251Payload(winPayload), qrOptions);
      } catch {
        /* UTF-8 fallback */
      }
    }
  }

  const utfPayload = buildSt0001PaymentQrPayload(input, PAYMENT_QR_GOST_FORMAT_ID_UTF8);
  if (!utfPayload) return null;

  try {
    return await QRCode.toDataURL(utfPayload, qrOptions);
  } catch {
    return null;
  }
}

/** HTML-блок с QR для шаблона счёта (`{{invoice.qrCodeHtml|html}}`). */
export async function buildRepairPaymentInvoiceQrHtml(
  form: RepairPackageFormData,
  conduct: RepairInvoiceConductDraft
): Promise<string> {
  const input = paymentInvoiceQrInputFromForm(form, conduct);
  if (!input) return '';

  try {
    const dataUrl = await buildPaymentInvoiceQrDataUrl(input);
    if (!dataUrl) return '';

    return `<div style="text-align:center;">
  <img src="${dataUrl}" width="128" height="128" alt="QR-код для оплаты" style="display:block; margin:0 auto;" />
  <p style="margin:4pt 0 0; font-size:8pt; line-height:1.2;">Сканируйте для оплаты<br />в приложении банка</p>
</div>`;
  } catch {
    return '';
  }
}
