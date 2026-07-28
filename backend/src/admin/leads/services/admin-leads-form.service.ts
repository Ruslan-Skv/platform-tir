import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { FORM_SUBJECT_LABELS } from '../admin-leads.constants';
import {
  FORM_TYPE_TO_SOURCE,
  LEAD_SOURCE_LABELS,
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  buildLeadId,
  isLeadStatus,
} from '../lead.types';

@Injectable()
export class AdminLeadsFormService {
  constructor(private readonly prisma: PrismaService) {}

  formTypeFromSource(source: LeadSource): string {
    const entry = Object.entries(FORM_TYPE_TO_SOURCE).find(([, s]) => s === source);
    return entry?.[0] ?? '';
  }

  formWhere(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string },
  ): Prisma.FormSubmissionWhereInput {
    const where: Prisma.FormSubmissionWhereInput = {
      type: this.formTypeFromSource(source),
    };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { comment: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async fetchLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    const rows = await this.prisma.formSubmission.findMany({
      where: this.formWhere(source, opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
    });
    return rows.map((row) => this.mapFormSubmission(row, source));
  }

  async countLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string },
  ): Promise<number> {
    return this.prisma.formSubmission.count({ where: this.formWhere(source, opts) });
  }

  async fetchById(source: LeadSource, entityId: string): Promise<UnifiedLeadItem | null> {
    const row = await this.prisma.formSubmission.findFirst({
      where: { id: entityId, type: this.formTypeFromSource(source) },
    });
    return row ? this.mapFormSubmission(row, source) : null;
  }

  async updateLead(
    source: LeadSource,
    entityId: string,
    dto: UpdateLeadDto,
  ): Promise<UnifiedLeadItem> {
    const existing = await this.prisma.formSubmission.findFirst({
      where: { id: entityId, type: this.formTypeFromSource(source) },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const row = await this.prisma.formSubmission.update({
      where: { id: entityId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
      },
    });
    return this.mapFormSubmission(row, source);
  }

  async deleteLead(source: LeadSource, entityId: string): Promise<{ id: string }> {
    const existing = await this.prisma.formSubmission.findFirst({
      where: { id: entityId, type: this.formTypeFromSource(source) },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');
    await this.prisma.formSubmission.delete({ where: { id: entityId } });
    return { id: buildLeadId(source, entityId) };
  }

  private mapFormSubmission(
    row: {
      id: string;
      type: string;
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      preferredDate: string | null;
      preferredTime: string;
      productType: string | null;
      subject: string | null;
      comment: string | null;
      status: string;
      managerNote: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    source: LeadSource,
  ): UnifiedLeadItem {
    const previewParts: string[] = [];
    if (row.type === 'director' && row.subject) {
      previewParts.push(FORM_SUBJECT_LABELS[row.subject] ?? row.subject);
    }
    if (row.address) previewParts.push(`Адрес: ${row.address}`);
    if (row.preferredDate) previewParts.push(`Дата: ${row.preferredDate}`);
    if (row.preferredTime) previewParts.push(`Время: ${row.preferredTime}`);
    if (row.productType) previewParts.push(`Тип: ${row.productType}`);
    if (row.comment) previewParts.push(row.comment);

    return {
      id: buildLeadId(source, row.id),
      source,
      sourceLabel: LEAD_SOURCE_LABELS[source],
      status: isLeadStatus(row.status) ? row.status : 'new',
      statusEditable: true,
      name: row.name,
      phone: row.phone || null,
      email: row.email,
      preview: previewParts.join(' · ') || '—',
      managerNote: row.managerNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      detailUrl: null,
      payload: {
        type: row.type,
        address: row.address,
        preferredDate: row.preferredDate,
        preferredTime: row.preferredTime,
        productType: row.productType,
        subject: row.subject,
        comment: row.comment,
      },
    };
  }
}
