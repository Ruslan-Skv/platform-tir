import {
  PAYMENT_QR_GOST_FORMAT_ID_UTF8,
  PAYMENT_QR_GOST_FORMAT_ID_WIN1251,
  buildSt0001PaymentQrPayload,
  hasFullBankQrRequisites,
} from './repairPaymentInvoiceQr';

describe('buildSt0001PaymentQrPayload', () => {
  const base = {
    payeeName: 'ИП Сквиря Руслан Васильевич',
    inn: '511005087470',
    kpp: '',
    bankName: 'МУРМАНСКОЕ ОТДЕЛЕНИЕ N8627 ПАО СБЕРБАНК',
    bik: '044705615',
    corrAccount: '30101810300000000615',
    settlementAccount: '40802810341000004571',
    amountRub: 522.5,
    purpose: 'Оплата по счету N 1 от 27.05.2026. Без НДС',
  };

  it('detects full bank requisites for IP', () => {
    expect(hasFullBankQrRequisites(base)).toBe(true);
  });

  it('uses ST00011 with bank field order and TaxRate=none', () => {
    const payload = buildSt0001PaymentQrPayload(base, PAYMENT_QR_GOST_FORMAT_ID_WIN1251);
    expect(payload).toMatch(/^ST00011\|/);
    expect(payload).toContain('Name=ИП Сквиря Руслан Васильевич');
    expect(payload).toContain('CorrespAcc=30101810300000000615');
    expect(payload).toContain('PersonalAcc=40802810341000004571');
    expect(payload).toContain('Sum=52250');
    expect(payload).toContain('TaxRate=none');
    expect(payload).toContain('PayeeINN=511005087470');

    const sumIdx = payload!.indexOf('Sum=');
    const purposeIdx = payload!.indexOf('Purpose=');
    const taxIdx = payload!.indexOf('TaxRate=none');
    const innIdx = payload!.indexOf('PayeeINN=');
    expect(purposeIdx).toBeGreaterThan(sumIdx);
    expect(taxIdx).toBeGreaterThan(purposeIdx);
    expect(innIdx).toBeGreaterThan(taxIdx);
  });

  it('falls back to ST00012 when correspondent account is missing', () => {
    const payload = buildSt0001PaymentQrPayload(
      { ...base, corrAccount: '' },
      PAYMENT_QR_GOST_FORMAT_ID_UTF8
    );
    expect(payload).toMatch(/^ST00012\|/);
    expect(payload).not.toContain('CorrespAcc=');
  });

  it('returns null for ST00011 without INN', () => {
    expect(
      buildSt0001PaymentQrPayload({ ...base, inn: '' }, PAYMENT_QR_GOST_FORMAT_ID_WIN1251)
    ).toBeNull();
  });
});
