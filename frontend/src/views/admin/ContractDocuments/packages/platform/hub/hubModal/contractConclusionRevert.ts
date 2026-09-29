import type { PackageFormData } from '../../form/packageForm';

/**
 * Отмена подписания договора сбрасывает и подписания всех д/с: подписанное или
 * оплаченное д/с не может существовать при неподписанном договоре.
 */
export function revertContractConclusionForm(previous: PackageFormData): PackageFormData {
  const addendumSlots = previous.addendumSlots.map((slot) =>
    slot.status === 'OPEN' ? slot : { ...slot, status: 'OPEN' as const, signedAt: '', paidAt: '' }
  ) as PackageFormData['addendumSlots'];
  return {
    ...previous,
    contractConcludedAt: '',
    contractPaidAt: '',
    addendumSlots,
  };
}
