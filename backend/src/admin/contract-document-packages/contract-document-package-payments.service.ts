import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentForm, PaymentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateContractDocumentPackagePaymentDto } from './dto/create-contract-document-package-payment.dto';
import { UpdateContractDocumentPackagePaymentDto } from './dto/update-contract-document-package-payment.dto';

const MAX_PAYMENTS_PER_PACKAGE = 120;

function assertAmendmentAddendumNumber(n: number | null | undefined): asserts n is number {
  if (n == null || !Number.isInteger(n) || n < 1 || n > 5) {
    throw new BadRequestException('Для оплаты по доп. соглашению укажите номер Д/с от 1 до 5');
  }
}

@Injectable()
export class ContractDocumentPackagePaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(
    p: Prisma.ContractDocumentPackagePaymentGetPayload<{
      include: {
        recordedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
      };
    }>,
  ) {
    return {
      id: p.id,
      packageId: p.packageId,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      amount: p.amount.toString(),
      paymentForm: p.paymentForm,
      paymentType: p.paymentType,
      addendumNumber: p.addendumNumber,
      basis: p.basis,
      notes: p.notes,
      recordedById: p.recordedById,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      recordedBy: p.recordedBy
        ? {
            id: p.recordedBy.id,
            email: p.recordedBy.email,
            firstName: p.recordedBy.firstName,
            lastName: p.recordedBy.lastName,
          }
        : null,
    };
  }

  private async assertPackageExists(packageId: string) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id: packageId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Пакет документов не найден');
    }
  }

  async list(packageId: string) {
    await this.assertPackageExists(packageId);
    const rows = await this.prisma.contractDocumentPackagePayment.findMany({
      where: { packageId },
      include: {
        recordedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    packageId: string,
    dto: CreateContractDocumentPackagePaymentDto,
    recordedById?: string,
  ) {
    await this.assertPackageExists(packageId);
    const count = await this.prisma.contractDocumentPackagePayment.count({ where: { packageId } });
    if (count >= MAX_PAYMENTS_PER_PACKAGE) {
      throw new BadRequestException(
        `По одному пакету допускается не более ${MAX_PAYMENTS_PER_PACKAGE} записей оплат`,
      );
    }
    const paymentType = dto.paymentType as unknown as PaymentType;
    let addendumNumber: number | null = dto.addendumNumber ?? null;
    if (paymentType === PaymentType.AMENDMENT) {
      assertAmendmentAddendumNumber(addendumNumber);
    } else {
      addendumNumber = null;
    }
    const created = await this.prisma.contractDocumentPackagePayment.create({
      data: {
        packageId,
        paymentDate: new Date(dto.paymentDate),
        amount: dto.amount,
        paymentForm: dto.paymentForm as PaymentForm,
        paymentType,
        addendumNumber,
        basis: dto.basis?.trim() ? dto.basis.trim() : null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        recordedById: recordedById ?? null,
      },
      include: {
        recordedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return this.serialize(created);
  }

  async update(packageId: string, paymentId: string, dto: UpdateContractDocumentPackagePaymentDto) {
    await this.assertPackageExists(packageId);
    const existing = await this.prisma.contractDocumentPackagePayment.findFirst({
      where: { id: paymentId, packageId },
    });
    if (!existing) {
      throw new NotFoundException('Запись оплаты не найдена');
    }
    const nextType = (dto.paymentType ?? existing.paymentType) as PaymentType;
    let nextAddendum =
      dto.addendumNumber === undefined ? existing.addendumNumber : dto.addendumNumber;
    if (nextType === PaymentType.AMENDMENT) {
      assertAmendmentAddendumNumber(nextAddendum ?? undefined);
    } else {
      nextAddendum = null;
    }
    const data: Prisma.ContractDocumentPackagePaymentUpdateInput = {};
    if (dto.paymentDate !== undefined) data.paymentDate = new Date(dto.paymentDate);
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.paymentForm !== undefined) data.paymentForm = dto.paymentForm as PaymentForm;
    if (dto.paymentType !== undefined) data.paymentType = dto.paymentType as PaymentType;
    data.addendumNumber = nextAddendum;
    if (dto.basis !== undefined) data.basis = dto.basis?.trim() ? dto.basis.trim() : null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() ? dto.notes.trim() : null;

    const updated = await this.prisma.contractDocumentPackagePayment.update({
      where: { id: paymentId },
      data,
      include: {
        recordedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return this.serialize(updated);
  }

  async remove(packageId: string, paymentId: string) {
    await this.assertPackageExists(packageId);
    const existing = await this.prisma.contractDocumentPackagePayment.findFirst({
      where: { id: paymentId, packageId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Запись оплаты не найдена');
    }
    await this.prisma.contractDocumentPackagePayment.delete({ where: { id: paymentId } });
    return { ok: true };
  }
}
