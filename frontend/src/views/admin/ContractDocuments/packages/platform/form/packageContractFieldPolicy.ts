/** После подписания договора с вкладки «Оплаты» можно править только эти поля `contract.*`. */
export const PACKAGE_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED = new Set<string>([
  'prepaymentAmount',
  'prepaymentAmountWords',
  'paymentBasis',
  'prepaymentDate',
  'paymentFormLabel',
  'totalAmountWords',
]);
