import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  buildPackageCustomerBlockFromCustomerRow,
  type CustomerRowForPackageSync,
  customerObjectAddressFromRow,
} from './customer-package-block.util';
import { parseLinkedCrmCustomerId } from '../../customers/customer-linked-packages.util';

/**
 * Синхронизация блока «Заказчик» в пакетах документов при изменении карточки CRM:
 * пакет хранит данные заказчика снимком в formData; без синхронизации после правки
 * карточки блок в пакете устаревает и его приходится переприкреплять вручную.
 *
 * Трогаем только пакеты в работе (IN_PROGRESS): «Договор подписан» и «Отказ»
 * блокируют правки (включая блок «Заказчик») в редакторе — как `signedDocsLocked`
 * на фронте, но на стороне сервера, потому что API обновления пакета статусы не проверяет.
 */
@Injectable()
export class ContractDocumentPackageCustomerSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncCustomerInPackages(customer: CustomerRowForPackageSync): Promise<number> {
    const customerId = customer.id.trim();
    if (!customerId) return 0;

    const packages = (await this.prisma.contractDocumentPackage.findMany({
      where: { deletedAt: null },
      select: { id: true, status: true, formData: true },
    })) as Array<{ id: string; status: string; formData: unknown }>;

    const nextBlock = buildPackageCustomerBlockFromCustomerRow(customer);
    const nextAddress = customerObjectAddressFromRow(customer);
    const nextBlockJson = JSON.stringify(nextBlock);

    let updatedCount = 0;
    for (const pkg of packages) {
      if (pkg.status !== 'IN_PROGRESS') continue;
      if (parseLinkedCrmCustomerId(pkg.formData) !== customerId) continue;
      const fd = pkg.formData as Record<string, unknown> | null;
      if (!fd || typeof fd !== 'object') continue;

      const blockChanged = JSON.stringify(fd.customer ?? null) !== nextBlockJson;
      const objectBlock =
        fd.object && typeof fd.object === 'object' ? (fd.object as Record<string, unknown>) : null;
      // Адрес объекта меняем, только если в карточке он есть: пустой список адресов
      // не должен затирать адрес, введённый в пакете вручную.
      const addressChanged =
        Boolean(nextAddress) && (objectBlock?.objectAddress ?? '') !== nextAddress;
      if (!blockChanged && !addressChanged) continue;

      const nextFormData: Record<string, unknown> = {
        ...fd,
        customer: nextBlock,
        object: {
          ...(objectBlock ?? {}),
          ...(addressChanged ? { objectAddress: nextAddress } : {}),
        },
      };
      await this.prisma.contractDocumentPackage.update({
        where: { id: pkg.id },
        data: { formData: nextFormData as never },
        select: { id: true },
      });
      updatedCount += 1;
    }
    return updatedCount;
  }
}
