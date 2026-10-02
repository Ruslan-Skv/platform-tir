export enum PaymentFormDto {
  CASH = 'CASH',
  TERMINAL = 'TERMINAL',
  QR = 'QR',
  INVOICE = 'INVOICE',
  LC_TRANSFER = 'LC_TRANSFER',
  BANK_APP = 'BANK_APP',
}

export enum PaymentTypeDto {
  PREPAYMENT = 'PREPAYMENT',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
  AMENDMENT = 'AMENDMENT',
  REFUND = 'REFUND',
}
