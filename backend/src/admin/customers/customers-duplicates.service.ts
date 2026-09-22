import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import {
  CustomerDuplicateInput,
  findDuplicateReasons,
  toDuplicateDto,
} from './customer-duplicates.util';
import { resolveCustomerEntityType, resolvePersonDisplayName } from './customer-display.util';

/** Проверка дублей карточек клиентов и счётчики связанных сущностей (для корзины). */
@Injectable()
export class CustomersDuplicatesService {
  constructor(private prisma: PrismaService) {}

  /** Живые (не в корзине) карточки, совпадающие по телефону/email/ФИО+телефону. */
  async findPotentialDuplicates(input: CustomerDuplicateInput, excludeId?: string) {
    const rows = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        entityType: true,
        email: true,
        phone: true,
        phones: true,
        extendedProfile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const duplicates = rows
      .filter((row) => row.id !== excludeId)
      .map((row) => {
        const candidate = {
          ...row,
          extendedProfile: row.extendedProfile as unknown,
          deletedAt: null,
        };
        const reasons = findDuplicateReasons(input, candidate);
        if (reasons.length === 0) return null;
        const displayName =
          resolveCustomerEntityType(candidate) === 'PERSON'
            ? resolvePersonDisplayName(candidate)
            : (candidate.company ?? '').trim();
        return toDuplicateDto({ candidate, reasons }, displayName || candidate.id);
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return { duplicates };
  }

  /** Блокирует создание/изменение, если найден дубль и осознанный обход не разрешён. */
  async assertNoDuplicates(
    input: CustomerDuplicateInput & { allowDuplicate?: boolean },
    excludeId?: string,
  ): Promise<void> {
    if (input.allowDuplicate) return;
    const { duplicates } = await this.findPotentialDuplicates(input, excludeId);
    if (duplicates.length > 0) {
      throw new ConflictException({
        message: 'Найден существующий клиент с совпадающими данными',
        duplicates,
      });
    }
  }

  /** Количества связанных сущностей — для предупреждения перед удалением в корзину. */
  async getLinksCount(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    const [deals, measurements, interactions, tasks, documentPackages] = await Promise.all([
      this.prisma.deal.count({ where: { customerId: id } }),
      this.prisma.measurement.count({ where: { customerId: id } }),
      this.prisma.interaction.count({ where: { customerId: id } }),
      this.prisma.task.count({ where: { customerId: id } }),
      this.prisma.contractDocumentPackage.count({
        where: { deletedAt: null, formData: { path: ['_linkedCrmCustomerId'], equals: id } },
      }),
    ]);
    return {
      deals,
      measurements,
      documentPackages,
      interactions,
      tasks,
      total: deals + measurements + documentPackages + interactions + tasks,
    };
  }
}
