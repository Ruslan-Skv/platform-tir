import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractAdvanceDto } from './dto/create-contract-advance.dto';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { UpdateContractAmendmentDto } from './dto/update-contract-amendment.dto';
import { MAX_AMENDMENTS_PER_CONTRACT } from './contracts-shared';
import { ContractsCrudService } from './contracts-crud.service';

@Injectable()
export class ContractsAmendmentsService {
  constructor(
    private prisma: PrismaService,
    private crud: ContractsCrudService,
  ) {}

  async addAdvance(contractId: string, dto: CreateContractAdvanceDto) {
    const contract = await this.crud.findOne(contractId);
    const advance = await this.prisma.contractAdvance.create({
      data: {
        contractId,
        amount: new Prisma.Decimal(dto.amount),
        paidAt: new Date(dto.paidAt),
        notes: dto.notes ?? null,
      },
    });
    const totalAdvance = contract.advances.reduce((sum, a) => sum + Number(a.amount), 0);
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { advanceAmount: new Prisma.Decimal(totalAdvance + dto.amount) },
    });
    return advance;
  }

  async addAmendment(contractId: string, dto: CreateContractAmendmentDto) {
    const contract = await this.crud.findOne(contractId);
    const count = contract.amendments.length;
    if (count >= MAX_AMENDMENTS_PER_CONTRACT) {
      throw new BadRequestException(
        `К одному договору можно привязать не более ${MAX_AMENDMENTS_PER_CONTRACT} доп. соглашений (д/с).`,
      );
    }
    const amendmentsWithNumber = contract.amendments as Array<{ number?: number | null }>;
    const maxNumber =
      amendmentsWithNumber.length > 0
        ? Math.max(...amendmentsWithNumber.map((a) => a.number ?? 0), 0)
        : 0;
    return this.prisma.contractAmendment.create({
      data: {
        contractId,
        number: maxNumber + 1,
        amount: new Prisma.Decimal(dto.amount),
        discount: new Prisma.Decimal(dto.discount ?? 0),
        date: new Date(dto.date),
        extendsValidityTo: dto.extendsValidityTo ? new Date(dto.extendsValidityTo) : null,
        durationAdditionDays: dto.durationAdditionDays ?? null,
        durationAdditionType: dto.durationAdditionType ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async removeAdvance(contractId: string, advanceId: string) {
    const advance = await this.prisma.contractAdvance.findFirst({
      where: { id: advanceId, contractId },
    });
    if (!advance) throw new NotFoundException('Advance not found');
    const contract = await this.crud.findOne(contractId);
    await this.prisma.contractAdvance.delete({ where: { id: advanceId } });
    const remaining = contract.advances
      .filter((a) => a.id !== advanceId)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { advanceAmount: new Prisma.Decimal(remaining) },
    });
    return { success: true };
  }

  async removeAmendment(contractId: string, amendmentId: string) {
    const amendment = await this.prisma.contractAmendment.findFirst({
      where: { id: amendmentId, contractId },
    });
    if (!amendment) throw new NotFoundException('Amendment not found');
    await this.prisma.contractAmendment.delete({
      where: { id: amendmentId },
    });
    return { success: true };
  }

  async updateAmendment(contractId: string, amendmentId: string, dto: UpdateContractAmendmentDto) {
    const amendment = await this.prisma.contractAmendment.findFirst({
      where: { id: amendmentId, contractId },
    });
    if (!amendment) throw new NotFoundException('Amendment not found');
    const data: Parameters<typeof this.prisma.contractAmendment.update>[0]['data'] = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.discount !== undefined) data.discount = new Prisma.Decimal(dto.discount);
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.durationAdditionDays !== undefined)
      data.durationAdditionDays = dto.durationAdditionDays > 0 ? dto.durationAdditionDays : null;
    if (dto.durationAdditionType !== undefined)
      data.durationAdditionType = dto.durationAdditionType ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    return this.prisma.contractAmendment.update({
      where: { id: amendmentId },
      data,
    });
  }
}
