import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { leadStatusToOrderFilter, orderStatusToLeadStatus } from '../lead-order-status.util';
import {
  LEAD_SOURCE_LABELS,
  type LeadStatus,
  type UnifiedLeadItem,
  buildLeadId,
} from '../lead.types';

@Injectable()
export class AdminLeadsOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchLeads(opts: {
    status?: LeadStatus;
    search?: string;
    take: number;
  }): Promise<UnifiedLeadItem[]> {
    const rows = await this.prisma.order.findMany({
      where: this.orderWhere(opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      select: this.orderSelect,
    });
    return rows.map((row) => this.mapOrder(row));
  }

  async countLeads(opts: { status?: LeadStatus; search?: string }): Promise<number> {
    return this.prisma.order.count({ where: this.orderWhere(opts) });
  }

  async fetchById(entityId: string): Promise<UnifiedLeadItem | null> {
    const row = await this.prisma.order.findUnique({
      where: { id: entityId },
      select: this.orderSelect,
    });
    return row ? this.mapOrder(row) : null;
  }

  async updateLead(entityId: string, dto: UpdateLeadDto): Promise<UnifiedLeadItem> {
    if (dto.status !== undefined) {
      throw new BadRequestException('Статус заказа меняется на странице заказа');
    }
    const existing = await this.prisma.order.findUnique({ where: { id: entityId } });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const row = await this.prisma.order.update({
      where: { id: entityId },
      data: {
        ...(dto.managerNote !== undefined && { adminNotes: dto.managerNote?.trim() || null }),
      },
      select: this.orderSelect,
    });
    return this.mapOrder(row);
  }

  private readonly orderSelect = {
    id: true,
    orderNumber: true,
    status: true,
    total: true,
    customerFirstName: true,
    customerLastName: true,
    customerPhone: true,
    customerEmail: true,
    adminNotes: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { firstName: true, lastName: true, email: true, phone: true } },
  } as const;

  private orderWhere(opts: { status?: LeadStatus; search?: string }): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (opts.status) {
      const statuses = leadStatusToOrderFilter(opts.status);
      if (statuses.length > 0) where.status = { in: statuses };
      else where.status = OrderStatus.PENDING;
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerFirstName: { contains: q, mode: 'insensitive' } },
        { customerLastName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private mapOrder(row: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: Prisma.Decimal;
    customerFirstName: string | null;
    customerLastName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
    };
  }): UnifiedLeadItem {
    const name =
      [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ').trim() ||
      [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim() ||
      'Покупатель';

    return {
      id: buildLeadId('order', row.id),
      source: 'order',
      sourceLabel: LEAD_SOURCE_LABELS.order,
      status: orderStatusToLeadStatus(row.status),
      statusEditable: false,
      name,
      phone: row.customerPhone || row.user.phone,
      email: row.customerEmail || row.user.email,
      preview: `Заказ ${row.orderNumber} · ${row.total.toString()} ₽`,
      managerNote: row.adminNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      detailUrl: `/admin/orders/${row.id}`,
      payload: {
        orderNumber: row.orderNumber,
        orderStatus: row.status,
        total: row.total.toString(),
      },
    };
  }
}
